import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Share, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';

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

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { currentUser, logout } = useMerchant();

  const email = currentUser?.email ?? (currentUser?.isAnonymous ? 'Anonymous (Dev)' : '');
  const name  = currentUser?.displayName ?? '';

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
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

        {/* Legal */}
        <Text style={s.sectionTitle}>LEGAL</Text>
        <View style={s.card}>
          <SettingsRow
            icon="shield-checkmark-outline" iconColor="#059669" iconBg="#D1FAE5"
            label="Privacy Policy" sub="How we handle your data"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <View style={s.divider} />
          <SettingsRow
            icon="document-text-outline" iconColor="#0891B2" iconBg="#E0F2FE"
            label="Terms of Service" sub="Usage agreement"
            onPress={() => navigation.navigate('TermsOfService')}
          />
        </View>

        {/* Support */}
        <Text style={s.sectionTitle}>SUPPORT</Text>
        <View style={s.card}>
          <SettingsRow
            icon="help-circle-outline" iconColor="#7C3AED" iconBg="#F5F3FF"
            label="FAQ" sub="Frequently asked questions"
            onPress={() => navigation.navigate('FAQ')}
          />
          <View style={s.divider} />
          <SettingsRow
            icon="mail-outline" iconColor="#4F46E5" iconBg="#EEF2FF"
            label="Contact Us" sub="Get help or share feedback"
            onPress={() => navigation.navigate('ContactUs')}
          />
        </View>

        {/* App */}
        <Text style={s.sectionTitle}>APP</Text>
        <View style={s.card}>
          <SettingsRow
            icon="star-outline" iconColor="#F59E0B" iconBg="#FFFBEB"
            label="Rate Us" sub="Love ReviewReach? Leave a review!"
            onPress={() => Linking.openURL(PLAY_STORE_URL)}
          />
          <View style={s.divider} />
          <SettingsRow
            icon="share-social-outline" iconColor="#059669" iconBg="#D1FAE5"
            label="Share App" sub="Tell a fellow business owner"
            onPress={() => Share.share({
              message: Platform.select({
                android: `Check out ReviewReach — the easiest way to get more Google reviews for your business!\n\n${PLAY_STORE_URL}`,
                default: 'Check out ReviewReach — the easiest way to get more Google reviews for your business!',
              }),
            })}
          />
          <View style={s.divider} />
          <SettingsRow
            icon="information-circle-outline" iconColor="#0F172A" iconBg="#F1F5F9"
            label="About" sub="Version & credits"
            onPress={() => navigation.navigate('About')}
          />
        </View>

        {/* Account */}
        <Text style={s.sectionTitle}>ACCOUNT</Text>
        <View style={s.card}>
          <SettingsRow
            icon="log-out-outline" iconColor="#64748B" iconBg="#F1F5F9"
            label="Sign Out"
            onPress={async () => { await logout(); }}
          />
          <View style={s.divider} />
          <SettingsRow
            icon="trash-outline" iconColor="#EF4444" iconBg="#FEF2F2"
            label="Delete Account" sub="Permanently remove all data" danger
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
