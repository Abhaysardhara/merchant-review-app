import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { GOOGLE_ANDROID_CLIENT_ID } from '../config';
import { useMerchant } from '../store/MerchantContext';

WebBrowser.maybeCompleteAuthSession();

// ─────────────────────────────────────────────
//  Google Sign-In (production Android builds only)
// ─────────────────────────────────────────────
function GoogleSignInButton() {
  const { signInWithGoogle } = useMerchant();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    usePKCE:         true,
    scopes:          ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      handleSuccess(response as typeof response & { type: 'success' });
    } else if (response.type === 'error') {
      setLoading(false);
      Alert.alert('Sign-in failed', (response.error as any)?.message ?? 'An error occurred.');
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  const handleSuccess = async (res: typeof response & { type: 'success' }) => {
    try {
      // Try id_token directly (some flows return it in params)
      const idToken = res.params?.id_token;
      if (idToken) {
        await signInWithGoogle(idToken);
        return;
      }
      // Otherwise exchange the authorization code
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId:    GOOGLE_ANDROID_CLIENT_ID,
          code:        res.params.code,
          redirectUri: request?.redirectUri ?? '',
          extraParams: request?.codeVerifier
            ? { code_verifier: request.codeVerifier }
            : {},
        },
        { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
      );
      if (!tokenResponse.idToken) throw new Error('No ID token returned from Google.');
      await signInWithGoogle(tokenResponse.idToken);
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Sign-in failed', e?.message ?? 'Could not sign in. Please try again.');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.googleBtn, (loading || !request) && styles.googleBtnDisabled]}
      onPress={() => { setLoading(true); promptAsync(); }}
      disabled={loading || !request}
      activeOpacity={0.88}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <View style={styles.googleLogoWrap}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
//  Dev bypass button (only compiled in __DEV__)
// ─────────────────────────────────────────────
function DevSkipButton() {
  const { devSkipSignIn } = useMerchant();
  return (
    <TouchableOpacity style={styles.devBtn} onPress={devSkipSignIn} activeOpacity={0.8}>
      <Ionicons name="code-slash-outline" size={16} color="#6366F1" />
      <Text style={styles.devBtnText}>Dev — Skip Sign In</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
//  Main screen
// ─────────────────────────────────────────────
export function SignInScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* ── Dark hero panel ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 36 }]}>
        <View style={styles.blob1} pointerEvents="none" />
        <View style={styles.blob2} pointerEvents="none" />

        <View style={styles.logoRing}>
          <Ionicons name="storefront" size={38} color="#fff" />
        </View>
        <Text style={styles.appName}>Review Reach</Text>
        <Text style={styles.tagline}>Turn every customer into{'\n'}a 5-star Google review</Text>

        <View style={styles.chips}>
          {[
            { icon: 'qr-code',    label: 'QR Codes' },
            { icon: 'bar-chart',  label: 'Analytics' },
            { icon: 'git-branch', label: 'Multi-branch' },
          ].map((c) => (
            <View key={c.label} style={styles.chip}>
              <Ionicons name={c.icon as never} size={13} color="#A5B4FC" />
              <Text style={styles.chipText}>{c.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── White card panel ── */}
      <View style={[styles.card, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.features}>
          {[
            { icon: 'qr-code-outline' as const,  title: 'Instant QR codes',     sub: 'One per branch — customers scan & review',      color: '#4F46E5', bg: '#EEF2FF' },
            { icon: 'analytics-outline' as const, title: 'Live analytics',       sub: 'Scans, link visits & review copies tracked',    color: '#0891B2', bg: '#E0F2FE' },
            { icon: 'people-outline' as const,    title: 'Multi-branch support', sub: 'All locations under one account',               color: '#059669', bg: '#D1FAE5' },
          ].map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={20} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Always show Google sign-in; also show dev skip in __DEV__ */}
        <GoogleSignInButton />
        {__DEV__ && <DevSkipButton />}

        <Text style={styles.disclaimer}>
          By signing in you agree to our Terms of Service.{'\n'}
          Your data is stored securely in Firebase.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1E1B4B' },

  hero: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
    gap: 10,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', top: -40, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(99,102,241,0.25)',
  },
  blob2: {
    position: 'absolute', bottom: 0, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(139,92,246,0.18)',
  },
  logoRing: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  appName: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.8 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.58)', textAlign: 'center', lineHeight: 22 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontSize: 12, color: '#A5B4FC', fontWeight: '600' },

  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 16,
    elevation: 12,
  },
  features: { gap: 18, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  featureSub:   { fontSize: 12, color: '#64748B', lineHeight: 17 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 24 },

  // ── Google button (production) ──
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 16,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    marginBottom: 16,
  },
  googleBtnDisabled: { opacity: 0.55 },
  googleLogoWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  googleG: { fontSize: 13, fontWeight: '900', color: '#4285F4', lineHeight: 16 },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // ── Dev skip button ──
  devBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15,
    borderWidth: 1.5, borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    marginBottom: 16,
  },
  devBtnText: { fontSize: 15, fontWeight: '700', color: '#4F46E5' },

  disclaimer: { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 16, marginTop: 4 },
});
