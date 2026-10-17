import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Share, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.reviewreach.app';

type Props = NativeStackScreenProps<MerchantStackParamList, 'About'>;

export function AboutScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        {/* Logo / branding */}
        <View style={s.brand}>
          <View style={s.logoWrap}>
            <Ionicons name="star" size={32} color="#4F46E5" />
          </View>
          <Text style={s.appName}>ReviewReach</Text>
          <Text style={s.version}>Version {version}</Text>
        </View>

        <Text style={s.desc}>
          ReviewReach helps local businesses grow by making it easy for happy customers to leave
          Google reviews. Powered by AI, every review draft is personalised to your business.
        </Text>

        {/* Info rows */}
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Developer</Text>
            <Text style={s.rowValue}>ReviewReach Team</Text>
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <Text style={s.rowLabel}>Platform</Text>
            <Text style={s.rowValue}>React Native + Expo</Text>
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <Text style={s.rowLabel}>Backend</Text>
            <Text style={s.rowValue}>Firebase</Text>
          </View>
        </View>

        {/* Growth actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => Linking.openURL(PLAY_STORE_URL)}
            activeOpacity={0.8}
          >
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={s.actionBtnText}>Rate Us on Play Store</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
            onPress={() => Share.share({
              message: Platform.select({
                android: `Check out ReviewReach — the easiest way to get more Google reviews for your business!\n\n${PLAY_STORE_URL}`,
                default: 'Check out ReviewReach — the easiest way to get more Google reviews for your business!',
              }),
            })}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social" size={18} color="#4F46E5" />
            <Text style={[s.actionBtnText, { color: '#4F46E5' }]}>Share with a Friend</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>
          Made with care for local businesses everywhere.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
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
  content: { padding: 20 },
  brand: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  logoWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  version: { fontSize: 13, color: '#94A3B8' },
  desc: {
    fontSize: 14, color: '#64748B', lineHeight: 22, textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  rowValue: { fontSize: 14, color: '#64748B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 16 },
  actions: { marginTop: 24, gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#92400E' },
  footer: {
    fontSize: 13, color: '#CBD5E1', textAlign: 'center', marginTop: 32,
  },
});
