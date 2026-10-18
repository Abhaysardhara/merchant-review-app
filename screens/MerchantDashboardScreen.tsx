import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Animated,
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList, Branch } from '../types';
import { useMerchant, type AddBranchParams } from '../store/MerchantContext';
import { conversionRate, formatLastScan } from '../services/analytics';
import { useI18n } from '../i18n';

type Props = NativeStackScreenProps<MerchantStackParamList, 'MerchantDashboard'>;

const TONES = [
  'Friendly', 'Professional', 'Luxury', 'Casual',
  'Enthusiastic', 'Concise', 'Heartfelt', 'Formal', 'Detailed', 'Grateful',
];

// ─────────────────────────────────────────────
//  Add Branch Modal
// ─────────────────────────────────────────────

interface PrefilledStore { name: string; placeId: string; address: string; }

interface BranchDetailsModalProps {
  visible: boolean;
  store: PrefilledStore;
  onClose: () => void;
  onAdd: (params: AddBranchParams) => Promise<Branch | null>;
}

function BranchDetailsModal({ visible, store, onClose, onAdd }: BranchDetailsModalProps) {
  const { t } = useI18n();
  const [branchName, setBranchName] = useState(store.name);
  const [keywords, setKeywords]     = useState('');
  const [tones, setTones]           = useState<string[]>(['Friendly']);
  const [isSaving, setIsSaving]     = useState(false);

  React.useEffect(() => {
    if (visible) { setBranchName(store.name); setKeywords(''); setTones(['Friendly']); }
  }, [visible, store.name]);

  const toggleTone = (t: string) =>
    setTones((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const handleSave = async () => {
    if (!branchName.trim()) { Alert.alert('Missing field', 'Please enter a branch name.'); return; }
    if (tones.length === 0) { Alert.alert('Select tone', 'Please select at least one AI tone.'); return; }
    setIsSaving(true);
    try {
      await onAdd({
        name: branchName.trim(), businessName: store.name, address: store.address,
        googleMapsUrl: '', keywords: keywords.trim(), tone: tones.join(', '),
        placeIdOverride: store.placeId || undefined,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add branch. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={ms.container}>
          <View style={ms.header}>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={ms.title}>{t('addBranch_title')}</Text>
            <TouchableOpacity
              style={[ms.saveHeaderBtn, isSaving && { opacity: 0.5 }]}
              onPress={handleSave} disabled={isSaving}
            >
              {isSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={ms.saveHeaderBtnText}>{t('addBranch_submit')}</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={ms.body} showsVerticalScrollIndicator={false}>
            {/* Store banner */}
            <View style={ms.storeBanner}>
              <View style={ms.storeBannerIcon}>
                <Ionicons name="location" size={18} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ms.storeBannerName} numberOfLines={1}>{store.name}</Text>
                {store.address ? <Text style={ms.storeBannerAddr} numberOfLines={1}>{store.address}</Text> : null}
              </View>
              <Ionicons name="checkmark-circle" size={22} color="#059669" />
            </View>

            <View style={ms.section}>
              <Text style={ms.label}>{t('addBranch_nameLabel')} <Text style={ms.required}>*</Text></Text>
              <TextInput
                style={ms.input} value={branchName} onChangeText={setBranchName}
                placeholder={t('addBranch_namePlaceholder')} placeholderTextColor="#9CA3AF" autoFocus
              />
            </View>

            <View style={ms.section}>
              <Text style={ms.label}>{t('addBranch_toneLabel')} <Text style={ms.labelHint}>(pick one or more)</Text></Text>
              <View style={ms.chipWrap}>
                {TONES.map((t) => {
                  const active = tones.includes(t);
                  return (
                    <TouchableOpacity
                      key={t} onPress={() => toggleTone(t)}
                      style={[ms.chip, active && ms.chipActive]}
                    >
                      {active && <Ionicons name="checkmark" size={11} color="#fff" />}
                      <Text style={[ms.chipText, active && ms.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={ms.section}>
              <Text style={ms.label}>{t('addBranch_keywordsLabel')} <Text style={ms.labelHint}>(optional)</Text></Text>
              <TextInput
                style={[ms.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
                value={keywords} onChangeText={setKeywords} multiline
                placeholder={t('addBranch_keywordsPlaceholder')}
                placeholderTextColor="#9CA3AF"
              />
              <Text style={ms.hint}>Comma-separated — woven into the AI-generated review.</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────
//  Branch Card
// ─────────────────────────────────────────────

function BranchCard({ branch, onPress, onDelete }: { branch: Branch; onPress: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  const handleDelete = () =>
    Alert.alert('Remove Branch', `Remove "${branch.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onDelete },
    ]);

  const cvr = conversionRate(branch.analytics);

  return (
    <TouchableOpacity style={cs.card} onPress={onPress} activeOpacity={0.88}>
      {/* Top row */}
      <View style={cs.topRow}>
        <View style={cs.iconWrap}>
          <Ionicons name="storefront" size={22} color="#4F46E5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cs.name} numberOfLines={1}>{branch.name}</Text>
          <Text style={cs.address} numberOfLines={1}>{branch.address || branch.businessName}</Text>
        </View>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={cs.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={cs.statsRow}>
        <StatPill icon="qr-code-outline"    value={branch.analytics.totalScans}    label={t('branch_scans')}  color="#4F46E5" bg="#EEF2FF" />
        <StatPill icon="link-outline"       value={branch.analytics.linkVisits}    label={t('branch_visits')} color="#7C3AED" bg="#F5F3FF" />
        <StatPill icon="copy-outline"       value={branch.analytics.reviewsCopied} label={t('branch_copied')} color="#0891B2" bg="#E0F2FE" />
        <StatPill icon="trending-up-outline" value={cvr}                           label={t('branch_cvr')}    color="#059669" bg="#D1FAE5" isString />
      </View>

      {/* Footer */}
      <View style={cs.footer}>
        <Ionicons name="time-outline" size={11} color="#94A3B8" />
        <Text style={cs.footerText}>Last scan: {formatLastScan(branch.analytics.lastScanAt)}</Text>
        <Ionicons name="chevron-forward" size={15} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );
}

function StatPill({ icon, value, label, color, bg, isString }: {
  icon: string; value: number | string; label: string; color: string; bg: string; isString?: boolean;
}) {
  return (
    <View style={[cs.pill, { backgroundColor: bg }]}>
      <Ionicons name={icon as never} size={13} color={color} />
      <Text style={[cs.pillValue, { color }]}>{isString ? value : String(value)}</Text>
      <Text style={[cs.pillLabel, { color: color + 'BB' }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Main Screen
// ─────────────────────────────────────────────

const EMPTY_STORE: PrefilledStore = { name: '', placeId: '', address: '' };
const AUTO_REFRESH_MS = 2 * 60 * 1000;

export function MerchantDashboardScreen({ navigation, route }: Props) {
  const { branches, currentUser, logout, addBranch, deleteBranch, refreshBranches } = useMerchant();
  const { t } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingStore, setPendingStore] = useState<PrefilledStore>(EMPTY_STORE);
  const [refreshing, setRefreshing]     = useState(false);
  const spinAnim    = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets      = useSafeAreaInsets();

  useEffect(() => {
    const fromMapStore = route.params?.fromMapStore;
    if (fromMapStore) {
      setPendingStore(fromMapStore);
      setModalVisible(true);
      navigation.setParams({ fromMapStore: undefined });
    }
  }, [route.params?.fromMapStore]);

  const handleRefresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    Animated.timing(spinAnim, { toValue: 1, duration: 600, useNativeDriver: true })
      .start(() => spinAnim.setValue(0));
    await refreshBranches();
    if (!silent) setRefreshing(false);
  }, [refreshBranches, spinAnim]);

  useEffect(() => {
    const start = () => { stop(); intervalRef.current = setInterval(() => handleRefresh(true), AUTO_REFRESH_MS); };
    const stop  = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
    start();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') start(); else stop(); });
    return () => { stop(); sub.remove(); };
  }, [handleRefresh]);

  const totalScans  = branches.reduce((s, b) => s + b.analytics.totalScans,    0);
  const totalLinks  = branches.reduce((s, b) => s + b.analytics.linkVisits,    0);
  const totalCopied = branches.reduce((s, b) => s + b.analytics.reviewsCopied, 0);
  const totalCvr    = (totalScans + totalLinks) > 0
    ? `${((totalCopied / (totalScans + totalLinks)) * 100).toFixed(1)}%` : '—';

  const firstName = currentUser?.displayName?.split(' ')[0] ?? currentUser?.email?.split('@')[0] ?? 'Merchant';

  return (
    <View style={s.root}>
      {/* ── Dark header ── */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <View style={s.headerBlob} pointerEvents="none" />
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>Hello, {firstName} 👋</Text>
            <Text style={s.sub}>{branches.length} branch{branches.length !== 1 ? 'es' : ''} configured</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.iconBtn} onPress={() => handleRefresh(false)} disabled={refreshing}>
              <Animated.View style={{ transform: [{ rotate: spinAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] }) }] }}>
                <Ionicons name="refresh-outline" size={19} color="rgba(255,255,255,0.7)" />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={19} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary pills */}
        {branches.length > 0 && (
          <View style={s.summaryRow}>
            <SummaryTile value={totalScans}  label={t('dash_totalScans')}  icon="qr-code-outline"    accent="#818CF8" />
            <SummaryTile value={totalLinks}  label={t('dash_totalVisits')} icon="link-outline"        accent="#A78BFA" />
            <SummaryTile value={totalCopied} label={t('dash_totalCopied')} icon="copy-outline"        accent="#34D399" />
            <SummaryTile value={totalCvr}    label="CVR"      icon="trending-up-outline" accent="#FCD34D" isString />
          </View>
        )}
      </View>

      {/* ── Branch list ── */}
      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => handleRefresh(false)} tintColor="#4F46E5" />}
      >
        {branches.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="storefront-outline" size={40} color="#4F46E5" />
            </View>
            <Text style={s.emptyTitle}>{t('dash_noBranches')}</Text>
            <Text style={s.emptySub}>{t('dash_noBranchesSub')}</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('StoreSelector')}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.emptyBtnText}>{t('dash_addBranch')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>{t('dash_title').toUpperCase()}</Text>
            {branches.map((branch) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                onPress={() => navigation.navigate('BranchDetail', { branchId: branch.id })}
                onDelete={() => deleteBranch(branch.id)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      {branches.length > 0 && (
        <TouchableOpacity
          style={[s.fab, { bottom: insets.bottom + 24 }]}
          onPress={() => navigation.navigate('StoreSelector')}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={26} color="#fff" />
          <Text style={s.fabText}>{t('dash_addBranch')}</Text>
        </TouchableOpacity>
      )}

      {modalVisible && (
        <BranchDetailsModal
          visible={modalVisible}
          store={pendingStore}
          onClose={() => { setModalVisible(false); setPendingStore(EMPTY_STORE); }}
          onAdd={addBranch}
        />
      )}
    </View>
  );
}

function SummaryTile({ value, label, icon, accent, isString }: {
  value: number | string; label: string; icon: string; accent: string; isString?: boolean;
}) {
  return (
    <View style={s.tile}>
      <Ionicons name={icon as never} size={15} color={accent} />
      <Text style={[s.tileValue, { color: accent }]}>{isString ? value : String(value)}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },

  // header
  header: {
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute', top: -30, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(99,102,241,0.20)',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  sub:      { fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  // summary
  summaryRow: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 10, alignItems: 'center', gap: 3,
  },
  tileValue: { fontSize: 17, fontWeight: '800' },
  tileLabel: { fontSize: 9, color: 'rgba(255,255,255,0.40)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  // list
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 2, marginLeft: 2 },

  // empty
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#C7D2FE', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  emptySub:   { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 21, maxWidth: 280 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#4F46E5', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 8, elevation: 4,
    marginTop: 4,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // fab
  fab: {
    position: 'absolute', right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#4F46E5', borderRadius: 28,
    paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const cs = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  topRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:  { width: 44, height: 44, borderRadius: 13, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  name:      { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  address:   { fontSize: 12, color: '#64748B', marginTop: 2 },
  deleteBtn: { padding: 6 },
  statsRow:  { flexDirection: 'row', gap: 6 },
  pill: {
    flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 8, gap: 2,
  },
  pillValue: { fontSize: 15, fontWeight: '800' },
  pillLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  footer:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  footerText:{ fontSize: 11, color: '#94A3B8' },
});

const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff',
  },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  saveHeaderBtn: {
    backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 7,
    minWidth: 52, alignItems: 'center',
  },
  saveHeaderBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  body:     { padding: 20, gap: 4, paddingBottom: 40 },
  section:  { gap: 8, marginBottom: 16 },
  storeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0', padding: 14, marginBottom: 8,
  },
  storeBannerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  storeBannerName: { fontSize: 14, fontWeight: '700', color: '#14532D' },
  storeBannerAddr: { fontSize: 12, color: '#166534', marginTop: 1 },
  label:    { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  required: { color: '#EF4444' },
  labelHint:{ fontSize: 11, color: '#94A3B8', fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', minHeight: 48,
  },
  hint:     { fontSize: 12, color: '#94A3B8', lineHeight: 17 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  chipActive:     { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#fff' },
});
