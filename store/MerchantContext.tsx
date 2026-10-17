/**
 * MerchantContext.tsx
 *
 * Global state for merchant auth + branch data.
 * Auth:     Firebase Google Sign-In
 * Branches: stored in Firestore under users/{uid}/branches/{branchId}
 * Analytics: stored in same doc (top-level fields), written by the web review page
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Branch, QRPayload } from '../types';
import { emptyAnalytics } from '../services/analytics';
import { resolvePlaceFromUrl } from '../services/mapsResolver';
import {
  onAuthStateChanged,
  signOut,
  signInWithGoogleCredential,
  signInAnonymously,
  saveUserBranch,
  deleteUserBranch,
  loadUserBranches,
  deleteUserAccount,
  type User,
} from '../services/firebase';
import { REVIEW_WEB_URL, GOOGLE_WEB_CLIENT_ID } from '../config';
import {
  loadGBPTokens,
  saveGBPTokens,
  clearGBPTokens,
  getValidToken,
  discoverLocations,
  loadGBPCache,
  type GBPTokens,
  type GBPCache,
} from '../services/gbp';

// ─────────────────────────────────────────────
//  Context shape
// ─────────────────────────────────────────────

interface MerchantContextValue {
  currentUser: User | null;
  branches: Branch[];
  isLoading: boolean;

  signInWithGoogle: (idToken: string) => Promise<void>;
  devSkipSignIn: () => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;

  addBranch: (params: AddBranchParams) => Promise<Branch | null>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  getBranch: (id: string) => Branch | undefined;
  refreshBranches: () => Promise<void>;

  buildQRPayload: (branch: Branch) => QRPayload;
  buildQRUrl: (branch: Branch) => string;

  // GBP integration
  gbpAccessToken: string | null;
  gbpConnected: boolean;
  gbpCache: GBPCache | null;
  connectGBP: (tokens: GBPTokens) => Promise<void>;
  disconnectGBP: () => Promise<void>;
  getLocationName: (placeId: string) => string | null;
}

export interface AddBranchParams {
  name: string;
  businessName: string;
  address: string;
  googleMapsUrl: string;
  keywords: string;
  tone: string;
  placeIdOverride?: string;
}

// ─────────────────────────────────────────────
//  Context & hook
// ─────────────────────────────────────────────

const MerchantContext = createContext<MerchantContextValue | null>(null);

export function useMerchant(): MerchantContextValue {
  const ctx = useContext(MerchantContext);
  if (!ctx) throw new Error('useMerchant must be used within <MerchantProvider>');
  return ctx;
}

// ─────────────────────────────────────────────
//  Provider
// ─────────────────────────────────────────────

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [branches, setBranches]       = useState<Branch[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  // GBP state
  const [gbpAccessToken, setGbpAccessToken] = useState<string | null>(null);
  const [gbpCache, setGbpCache]             = useState<GBPCache | null>(null);

  // ── Load branches for the signed-in user (config + analytics in one read) ──
  const loadBranches = useCallback(async (uid: string) => {
    const list = await loadUserBranches(uid);
    setBranches(list);
  }, []);

  // ── Listen to Firebase Auth state ──
  useEffect(() => {
    const unsub = onAuthStateChanged(async (user) => {
      try {
        setCurrentUser(user);
        if (user) {
          await loadBranches(user.uid);
          // Restore GBP tokens if previously connected
          try {
            const token = await getValidToken(GOOGLE_WEB_CLIENT_ID);
            if (token) {
              setGbpAccessToken(token);
              const cache = await loadGBPCache();
              if (cache) setGbpCache(cache);
            }
          } catch {
            // GBP restore failed — continue without it
          }
        } else {
          setBranches([]);
          setGbpAccessToken(null);
          setGbpCache(null);
        }
      } catch {
        // Auth init failed — still allow app to render
      } finally {
        setIsLoading(false);
      }
    });
    return unsub;
  }, [loadBranches]);

  // ── Auth ──
  const signInWithGoogle = useCallback(async (idToken: string) => {
    await signInWithGoogleCredential(idToken);
    // onAuthStateChanged will handle loading branches
  }, []);

  // Dev-only: sign in anonymously so Firestore rules are satisfied.
  // Firebase persists the anonymous session via AsyncStorage, so the same
  // UID is reused across reloads on the same device.
  const devSkipSignIn = useCallback(async () => {
    await signInAnonymously();
    // onAuthStateChanged fires and handles setCurrentUser + loadBranches
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setBranches([]);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!currentUser) return;
    await deleteUserAccount(currentUser.uid);
    setBranches([]);
    // deleteUser signs out automatically — onAuthStateChanged handles setCurrentUser(null)
  }, [currentUser]);

  // ── Branch CRUD ──
  const refreshBranches = useCallback(async () => {
    if (!currentUser) return;
    await loadBranches(currentUser.uid);
  }, [currentUser, loadBranches]);

  const addBranch = useCallback(
    async (params: AddBranchParams): Promise<Branch | null> => {
      if (!currentUser) return null;

      const resolved = resolvePlaceFromUrl(params.googleMapsUrl);
      const placeId = params.placeIdOverride ?? resolved?.placeId ?? '';
      if (!placeId) return null;

      // Use placeId as the document ID so the web page can look up
      // users/{uid}/branches/{placeId} directly — no bid needed in the QR URL.
      const branch: Branch = {
        id: placeId,
        name:         params.name,
        businessName: params.businessName,
        address:      params.address,
        placeId,
        googleMapsUrl:params.googleMapsUrl,
        keywords:     params.keywords,
        tone:         params.tone,
        analytics:    emptyAnalytics(),
        createdAt:    new Date().toISOString(),
      };

      const updated = [...branches, branch];
      setBranches(updated);

      // Persist to Firestore — config lives in users/{uid}/branches/{id},
      // read directly by the web page via uid+bid in the QR URL.
      await saveUserBranch(currentUser.uid, branch);

      return branch;
    },
    [currentUser, branches],
  );

  const updateBranch = useCallback(
    async (id: string, updates: Partial<Branch>) => {
      if (!currentUser) return;
      const updated = branches.map((b) => (b.id === id ? { ...b, ...updates } : b));
      setBranches(updated);

      const branch = branches.find((b) => b.id === id);
      if (!branch) return;

      await saveUserBranch(currentUser.uid, { ...branch, ...updates });
    },
    [currentUser, branches],
  );

  const deleteBranch = useCallback(
    async (id: string) => {
      if (!currentUser) return;
      const branch = branches.find((b) => b.id === id);
      const updated = branches.filter((b) => b.id !== id);
      setBranches(updated);

      if (branch) {
        await deleteUserBranch(currentUser.uid, id);
      }
    },
    [currentUser, branches],
  );

  const getBranch = useCallback(
    (id: string) => branches.find((b) => b.id === id),
    [branches],
  );

  // ── GBP integration ──
  const gbpConnected = gbpAccessToken !== null;

  const connectGBP = useCallback(async (tokens: GBPTokens) => {
    await saveGBPTokens(tokens);
    setGbpAccessToken(tokens.accessToken);
    // Discover locations and build cache
    try {
      const cache = await discoverLocations(tokens.accessToken);
      setGbpCache(cache);
    } catch {
      // Cache will be built on next use
    }
  }, []);

  const disconnectGBP = useCallback(async () => {
    await clearGBPTokens();
    setGbpAccessToken(null);
    setGbpCache(null);
  }, []);

  const getLocationName = useCallback(
    (placeId: string): string | null => {
      return gbpCache?.locationMap[placeId] ?? null;
    },
    [gbpCache],
  );

  // ── QR helpers ──
  const buildQRPayload = useCallback((branch: Branch): QRPayload => ({
    branchId:     branch.id,
    placeId:      branch.placeId,
    uid:          currentUser?.uid ?? '',
    branchName:   branch.name,
    businessName: branch.businessName,
    tone:         branch.tone,
    keywords:     branch.keywords,
    v:            1,
  }), [currentUser]);

  const buildQRUrl = useCallback((branch: Branch): string => {
    const uid = currentUser?.uid ?? '';
    return `${REVIEW_WEB_URL}?pid=${encodeURIComponent(branch.placeId)}&uid=${encodeURIComponent(uid)}&QrOrigin=true`;
  }, [currentUser]);

  const value = useMemo<MerchantContextValue>(
    () => ({
      currentUser,
      branches,
      isLoading,
      signInWithGoogle,
      devSkipSignIn,
      logout,
      deleteAccount,
      addBranch,
      updateBranch,
      deleteBranch,
      getBranch,
      refreshBranches,
      buildQRPayload,
      buildQRUrl,
      gbpAccessToken,
      gbpConnected,
      gbpCache,
      connectGBP,
      disconnectGBP,
      getLocationName,
    }),
    [
      currentUser,
      branches,
      isLoading,
      signInWithGoogle,
      devSkipSignIn,
      logout,
      deleteAccount,
      addBranch,
      updateBranch,
      deleteBranch,
      getBranch,
      refreshBranches,
      buildQRPayload,
      buildQRUrl,
      gbpAccessToken,
      gbpConnected,
      gbpCache,
      connectGBP,
      disconnectGBP,
      getLocationName,
    ],
  );

  return <MerchantContext.Provider value={value}>{children}</MerchantContext.Provider>;
}
