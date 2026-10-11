/**
 * MerchantContext.tsx
 *
 * Global state for merchant data.  Branches are persisted via AsyncStorage
 * through the analytics service.  The context also manages the in-session
 * merchant authentication flag so the passcode modal only shows once per
 * app session.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Branch, BranchCategory, QRPayload } from '../types';
import {
  loadBranches,
  saveBranches,
  emptyAnalytics,
  verifyPasscode,
  savePasscode,
} from '../services/analytics';
import { resolvePlaceFromUrl } from '../services/mapsResolver';
import { REVIEW_WEB_URL } from '../config';

// ─────────────────────────────────────────────
//  Context shape
// ─────────────────────────────────────────────

interface MerchantContextValue {
  branches: Branch[];
  isMerchantAuthenticated: boolean;
  isLoading: boolean;

  /** Returns true if correct, false if wrong */
  authenticate: (pin: string) => Promise<boolean>;
  logout: () => void;
  changePasscode: (newPin: string) => Promise<void>;

  addBranch: (params: AddBranchParams) => Promise<Branch | null>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  getBranch: (id: string) => Branch | undefined;
  refreshBranches: () => Promise<void>;

  buildQRPayload: (branch: Branch) => QRPayload;
  /** Returns the URL encoded in the QR code — opens the customer web review page */
  buildQRUrl: (branch: Branch) => string;
}

export interface AddBranchParams {
  name: string;
  businessName: string;
  address: string;
  category: BranchCategory;
  googleMapsUrl: string;
  keywords: string;
  tone: string;
  /** Optional override for the resolved Place ID */
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isMerchantAuthenticated, setIsMerchantAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Counter used to generate unique branch IDs
  const counterRef = useRef(0);

  // ── Load persisted data on mount ──
  useEffect(() => {
    (async () => {
      const stored = await loadBranches();
      setBranches(stored);
      if (stored.length > 0) {
        counterRef.current = stored.length;
      }
      setIsLoading(false);
    })();
  }, []);

  // ── Auth ──
  const authenticate = useCallback(async (pin: string): Promise<boolean> => {
    const ok = await verifyPasscode(pin);
    if (ok) setIsMerchantAuthenticated(true);
    return ok;
  }, []);

  const logout = useCallback(() => setIsMerchantAuthenticated(false), []);

  const changePasscode = useCallback(async (newPin: string) => {
    await savePasscode(newPin);
  }, []);

  // ── Branch CRUD ──
  const refreshBranches = useCallback(async () => {
    const stored = await loadBranches();
    setBranches(stored);
  }, []);

  const addBranch = useCallback(
    async (params: AddBranchParams): Promise<Branch | null> => {
      const resolved = resolvePlaceFromUrl(params.googleMapsUrl);

      // If the URL can't be parsed, still allow adding if caller provides placeId override
      const placeId = params.placeIdOverride ?? resolved?.placeId ?? '';

      if (!placeId) return null;

      counterRef.current += 1;
      const id = `BRANCH_${Date.now()}_${counterRef.current}`;

      const branch: Branch = {
        id,
        name: params.name,
        businessName: params.businessName,
        address: params.address,
        category: params.category,
        placeId,
        googleMapsUrl: params.googleMapsUrl,
        keywords: params.keywords,
        tone: params.tone,
        analytics: emptyAnalytics(),
        createdAt: new Date().toISOString(),
      };

      const updated = [...branches, branch];
      setBranches(updated);
      await saveBranches(updated);
      return branch;
    },
    [branches],
  );

  const updateBranch = useCallback(
    async (id: string, updates: Partial<Branch>) => {
      const updated = branches.map((b) => (b.id === id ? { ...b, ...updates } : b));
      setBranches(updated);
      await saveBranches(updated);
    },
    [branches],
  );

  const deleteBranch = useCallback(
    async (id: string) => {
      const updated = branches.filter((b) => b.id !== id);
      setBranches(updated);
      await saveBranches(updated);
    },
    [branches],
  );

  const getBranch = useCallback(
    (id: string) => branches.find((b) => b.id === id),
    [branches],
  );

  // ── QR Payload builder ──
  const buildQRPayload = useCallback((branch: Branch): QRPayload => {
    return {
      branchId: branch.id,
      placeId: branch.placeId,
      branchName: branch.name,
      businessName: branch.businessName,
      category: branch.category,
      tone: branch.tone,
      keywords: branch.keywords,
      v: 1,
    };
  }, []);

  // ── QR URL builder — encodes everything the web review page needs ──
  const buildQRUrl = useCallback((branch: Branch): string => {
    // Extract area: last 2 meaningful parts of the address
    const area = (() => {
      if (!branch.address) return '';
      const parts = branch.address
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && !/^\d{6}$/.test(s) && !/^india$/i.test(s));
      return parts.slice(-2).join(', ');
    })();

    const params = new URLSearchParams({
      pid: branch.placeId,
      n: branch.businessName || branch.name,
      c: branch.category,
      t: branch.tone,
      k: branch.keywords,
      a: area,
    });
    return `${REVIEW_WEB_URL}?${params.toString()}`;
  }, []);

  const value = useMemo<MerchantContextValue>(
    () => ({
      branches,
      isMerchantAuthenticated,
      isLoading,
      authenticate,
      logout,
      changePasscode,
      addBranch,
      updateBranch,
      deleteBranch,
      getBranch,
      refreshBranches,
      buildQRPayload,
      buildQRUrl,
    }),
    [
      branches,
      isMerchantAuthenticated,
      isLoading,
      authenticate,
      logout,
      changePasscode,
      addBranch,
      updateBranch,
      deleteBranch,
      getBranch,
      refreshBranches,
      buildQRPayload,
      buildQRUrl,
    ],
  );

  return <MerchantContext.Provider value={value}>{children}</MerchantContext.Provider>;
}
