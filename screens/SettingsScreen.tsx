import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Share, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';
import { GOOGLE_WEB_CLIENT_ID } from '../config';
import { useI18n, LANGUAGES } from '../i18n';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.reviewreach.app';

type Props = NativeStackScreenProps<MerchantStackParamList, 'Settings'>;

interface RowProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
}

function SettingsRow({ icon, iconColor, iconBg, label, sub, onPress, danger }: RowProps) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as never} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

const GBP_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { currentUser, logout, gbpConnected, connectGBP, disconnectGBP } = useMerchant();
  const { locale, t } = useI18n();
  const currentLang = LANGUAGES.find((l) => l.code === locale);

  const handleConnectGBP = async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'com.reviewreach.app' });
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_WEB_CLIENT_ID,
        scopes: ['https://www.googleapis.com/auth/business.manage'],
        redirectUri,
        usePKCE: true,
        responseType: AuthSession.ResponseType.Code,
        extraParams: { access_type: 'offline', prompt: 'consent' },
      });
      const result = await request.promptAsync(GBP_DISCOVERY);
      if (result.type === 'success' && result.params.code) {
        // Exchange authorization code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: [
            'grant_type=authorization_code',
            `code=${encodeURIComponent(result.params.code)}`,
            `client_id=${encodeURIComponent(GOOGLE_WEB_CLIENT_ID)}`,
            `redirect_uri=${encodeURIComponent(redirectUri)}`,
            `code_verifier=${encodeURIComponent(request.codeVerifier ?? '')}`,
          ].join('&'),
        });
        if (!tokenRes.ok) throw new Error('Token exchange failed');
        const data = await tokenRes.json();
        await connectGBP({
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? '',
          expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
        });
        Alert.alert(t('common_success'), t('settings_gbpSuccess'));
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to connect Google Business Profile.');
    }
  };

  const handleDisconnectGBP = () => {
    Alert.alert(t('settings_gbpDisconnectTitle'), t('settings_gbpDisconnectMsg'), [
      { text: t('common_cancel'), style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => disconnectGBP() },
    ]);
  };

  const email = currentUser?.email ?? (currentUser?.isAnonymous ? 'Anonymous (Dev)' : '');
  const name  = currentUser?.displayName ?? '';

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('settings_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Ionicons name="person" size={28} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            {name ? <Text style={s.profileName}>{name}</Text> : null}
            <Text style={s.profileEmail}>{email || 'Not signed in'}</Text>
          </View>
        </View>

        {/* Preferences */}
        <Text style={s.sectionTitle}>{t('settings_preferences')}</Text>
        <View style={s.card}>
          <SettingsRow
            icon="language-outline" iconColor="#4F46E5" iconBg="#EEF2FF"
            label={currentLang?.label ?? 'English'}
            sub={currentLang ? `${currentLang.flag} ${currentLang.nativeLabel}` : 'Change app language'}
            onPress={() => navigation.navigate('Language')}
          />
        </View>

        {/* Google Business Profile */}
        <Text style={s.sectionTitle}>{t('settings_integrations')}</Text>
        <View style={s.card}>
          {gbpConnected ? (
            <>
              <SettingsRow
                icon="checkmark-circle" iconColor="#059669" iconBg="#D1FAE5"
                label={t('settings_gbpConnected')} sub={t('settings_gbpConnectedSub')}
                onPress={handleDisconnectGBP}
              />
            </>
          ) : (
            <SettingsRow
              icon="business-outline" iconColor="#4285F4" iconBg="#E8F0FE"
              label={t('settings_gbpConnect')} sub={t('settings_gbpConnectSub')}
              onPress={handleConnectGBP}
            />
          )}
        </View>

        {/* Legal */}
        <Text style={s.sectionTitle}>{t('settings_legal')}</Text>
        <View style={s.card}>
          <SettingsRow
            icon="shield-checkmark-outline" iconColor="#059669" iconBg="#D1FAE5"
            label={t('settings_privacy')} sub={t('settings_privacySub')}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <View style={s.divider} />
          <SettingsRow
            icon="document-text-outline" iconColor="#0891B2" iconBg="#E0F2FE"
            label={t('settings_terms')} sub={t('settings_termsSub')}
            onPress={() => navigation.navigate('TermsOfService')}
          />
        </View>

        {/* Support */}
        <Text style={s.sectionTitle}>{t('settings_support')}</Text>
        <View style={s.card}>
          <SettingsRow
            icon="help-circle-outline" iconColor="#7C3AED" iconBg="#F5F3FF"
            label={t('settings_faq')} sub={t('settings_faqSub')}
            onPress={() => navigation.navigate('FAQ')}
          />
          <View style={s.divider} />
          <SettingsRow
            icon="mail-outline" iconColor="#4F46E5" iconBg="#EEF2FF"
            label={t('settings_contact')} sub={t('settings_contactSub')}
            onPress={() => navigation.navigate('ContactUs')}
          />
        </View>

        {/* App */}
        <Text style={s.sectionTitle}>{t('settings_app')}</Text>
        <View style={s.card}>
          <SettingsRow
            icon="star-outline" iconColor="#F59E0B" iconBg="#FFFBEB"
            label={t('settings_rateUs')} sub={t('settings_rateUsSub')}
            onPress={() => Linking.openURL(PLAY_STORE_URL)}
          />
          <View style={s.divider} />
          <SettingsRow
            icon="share-social-outline" iconColor="#059669" iconBg="#D1FAE5"
            label={t('settings_share')} sub={t('settings_shareSub')}
            onPress={() => Share.share({
              message: Platform.select({
                android: `${t('settings_shareMsg')}\n\n${PLAY_STORE_URL}`,
                default: t('settings_shareMsg'),
              }),
            })}
          />
          <View style={s.divider} />
          <SettingsRow
            icon="information-circle-outline" iconColor="#0F172A" iconBg="#F1F5F9"
            label={t('settings_about')} sub={t('settings_aboutSub')}
            onPress={() => navigation.navigate('About')}
          />
        </View>

        {/* Account */}
        <Text style={s.sectionTitle}>{t('settings_account')}</Text>
        <View style={s.card}>
          <SettingsRow
            icon="log-out-outline" iconColor="#64748B" iconBg="#F1F5F9"
            label={t('settings_signOut')}
            onPress={async () => { await logout(); }}
          />
          <View style={s.divider} />
          <SettingsRow
            icon="trash-outline" iconColor="#EF4444" iconBg="#FEF2F2"
            label={t('settings_deleteAccount')} sub={t('settings_deleteAccountSub')} danger
            onPress={() => navigation.navigate('DeleteAccount')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    backgroundColor: '#1E1B4B',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  content: { padding: 16, gap: 6 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  profileName:  { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  profileEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 0.8, marginTop: 14, marginBottom: 4, marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  rowSub:   { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  divider:  { height: 1, backgroundColor: '#F1F5F9', marginLeft: 64 },
});
