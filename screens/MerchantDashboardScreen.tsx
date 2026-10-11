import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList, Branch, BranchCategory } from '../types';
import { useMerchant, type AddBranchParams } from '../store/MerchantContext';
import { conversionRate, formatLastScan } from '../services/analytics';

type Props = NativeStackScreenProps<MerchantStackParamList, 'MerchantDashboard'>;

const CATEGORIES: BranchCategory[] = [
  'Restaurant', 'Cafe', 'Bar', 'Bakery', 'Fast Food', 'Sweet Shop',
  'Hospital', 'Clinic', 'Pharmacy', 'Dentist', 'Veterinary',
  'Salon', 'Spa', 'Gym', 'Yoga', 'Fitness',
  'Hotel', 'Resort', 'Hostel',
  'Retail', 'Clothing', 'Jewelry', 'Electronics', 'Furniture',
  'Grocery', 'Supermarket', 'Hardware', 'Books', 'Sports', 'Pet Shop',
  'Automotive', 'Real Estate', 'Bank', 'School', 'Travel',
  'Photography', 'Events', 'Laundry', 'Other',
];

const TONES = [
  'Friendly', 'Professional', 'Luxury', 'Casual',
  'Enthusiastic', 'Concise', 'Heartfelt', 'Formal', 'Detailed', 'Grateful',
];

// ─────────────────────────────────────────────
//  Branch Details Modal
//  Opens pre-filled after the user picks a store from the map
// ─────────────────────────────────────────────

interface PrefilledStore {
  name: string;
  placeId: string;
  address: string;
}

interface BranchDetailsModalProps {
  visible: boolean;
  store: PrefilledStore;
  onClose: () => void;
  onAdd: (params: AddBranchParams) => Promise<void>;
}

function BranchDetailsModal({ visible, store, onClose, onAdd }: BranchDetailsModalProps) {
  const [branchName, setBranchName] = useState(store.name);
  const [category, setCategory] = useState<BranchCategory>('Restaurant');
  const [keywords, setKeywords] = useState('');
  const [tones, setTones] = useState<string[]>(['Friendly']);
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync fields when a new store is passed in
  React.useEffect(() => {
    if (visible) {
      setBranchName(store.name);
      setCategory('Restaurant');
      setKeywords('');
      setTones(['Friendly']);
    }
  }, [visible, store.name]);

  const toggleTone = (t: string) => {
    setTones((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (!branchName.trim()) {
      Alert.alert('Missing field', 'Please enter a branch name.');
      return;
    }
    if (tones.length === 0) {
      Alert.alert('Select tone', 'Please select at least one AI tone.');
      return;
    }
    setIsSaving(true);
    await onAdd({
      name: branchName.trim(),
      businessName: store.name,
      address: store.address,
      category,
      googleMapsUrl: '',
      keywords: keywords.trim(),
      tone: tones.join(', '),
      placeIdOverride: store.placeId || undefined,
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={modalStyles.container}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Branch Details</Text>
            <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modalStyles.body} showsVerticalScrollIndicator={false}>
            {/* Store pill */}
            <View style={modalStyles.storePill}>
              <View style={modalStyles.storePillIcon}>
                <Ionicons name="location" size={16} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.storePillName} numberOfLines={1}>{store.name}</Text>
                {store.address ? (
                  <Text style={modalStyles.storePillAddr} numberOfLines={1}>{store.address}</Text>
                ) : null}
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            </View>

            <Text style={modalStyles.label}>Branch Name *</Text>
            <TextInput
              style={modalStyles.textInput}
              value={branchName}
              onChangeText={setBranchName}
              placeholder="e.g. Downtown Branch"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />

            <Text style={modalStyles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={modalStyles.chipRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[modalStyles.chip, category === cat && modalStyles.chipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[modalStyles.chipText, category === cat && modalStyles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={modalStyles.label}>AI Tone <Text style={modalStyles.labelHint}>(pick one or more)</Text></Text>
            <View style={modalStyles.chipWrap}>
              {TONES.map((t) => {
                const active = tones.includes(t);
                return (
                  <TouchableOpacity
                    key={t}
                    style={[modalStyles.chip, active && modalStyles.chipActive]}
                    onPress={() => toggleTone(t)}
                  >
                    {active && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    <Text style={[modalStyles.chipText, active && modalStyles.chipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={modalStyles.label}>Custom Keywords</Text>
            <TextInput
              style={[modalStyles.textInput, { minHeight: 70 }]}
              value={keywords}
              onChangeText={setKeywords}
              placeholder="e.g. quick service, clean rooms, friendly staff"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />
            <Text style={modalStyles.hint}>
              Comma-separated keywords highlighted in the AI-generated review draft.
            </Text>

            <TouchableOpacity
              style={[modalStyles.saveBtn, isSaving && modalStyles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                  <Text style={modalStyles.saveBtnText}>Add Branch</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────
//  Branch Card
// ─────────────────────────────────────────────

function BranchCard({
  branch,
  onPress,
  onDelete,
}: {
  branch: Branch;
  onPress: () => void;
  onDelete: () => void;
}) {
  const handleDelete = () => {
    Alert.alert(
      'Remove Branch',
      `Remove "${branch.name}" from your dashboard? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={cardStyles.topRow}>
        <View style={cardStyles.icon}>
          <Ionicons name="storefront-outline" size={20} color="#4F46E5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cardStyles.name} numberOfLines={1}>{branch.name}</Text>
          <Text style={cardStyles.biz} numberOfLines={1}>{branch.address || branch.businessName}</Text>
        </View>
        <View style={cardStyles.categoryBadge}>
          <Text style={cardStyles.categoryText}>{branch.category}</Text>
        </View>
        <TouchableOpacity
          style={cardStyles.deleteBtn}
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={17} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={cardStyles.statsRow}>
        <StatItem icon="scan-outline" value={branch.analytics.totalScans} label="Scans" />
        <StatItem icon="star-outline" value={branch.analytics.fiveStarRedirects} label="5-Star" />
        <StatItem icon="chatbubble-outline" value={branch.analytics.privateFeedbacks} label="Private" />
        <StatItem icon="trending-up-outline" value={conversionRate(branch.analytics)} label="CVR" isString />
      </View>

      <View style={cardStyles.footer}>
        <Ionicons name="time-outline" size={12} color="#9CA3AF" />
        <Text style={cardStyles.footerText}>
          Last scan: {formatLastScan(branch.analytics.lastScanAt)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );
}

function StatItem({
  icon, value, label, isString,
}: {
  icon: string; value: number | string; label: string; isString?: boolean;
}) {
  return (
    <View style={cardStyles.stat}>
      <Ionicons name={icon as never} size={16} color="#6366F1" />
      <Text style={cardStyles.statValue}>{isString ? value : String(value)}</Text>
      <Text style={cardStyles.statLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Main Screen
// ─────────────────────────────────────────────

// Placeholder store shown when modal is open but store data hasn't arrived yet
const EMPTY_STORE: PrefilledStore = { name: '', placeId: '', address: '' };

export function MerchantDashboardScreen({ navigation, route }: Props) {
  const { branches, logout, addBranch, deleteBranch, refreshBranches } = useMerchant();
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingStore, setPendingStore] = useState<PrefilledStore>(EMPTY_STORE);
  const [refreshing, setRefreshing] = useState(false);

  // Returning from StoreSelector with a picked store → open details modal
  React.useEffect(() => {
    const fromMapStore = route.params?.fromMapStore;
    if (fromMapStore) {
      setPendingStore(fromMapStore);
      setModalVisible(true);
      navigation.setParams({ fromMapStore: undefined });
    }
  }, [route.params?.fromMapStore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshBranches();
    setRefreshing(false);
  }, [refreshBranches]);

  const totalScans = branches.reduce((s, b) => s + b.analytics.totalScans, 0);
  const totalFiveStar = branches.reduce((s, b) => s + b.analytics.fiveStarRedirects, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merchant Dashboard</Text>
          <Text style={styles.subGreeting}>{branches.length} branch{branches.length !== 1 ? 'es' : ''} configured</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      {branches.length > 0 && (
        <View style={styles.summaryBar}>
          <SummaryItem icon="scan-outline" value={totalScans} label="Total Scans" />
          <View style={styles.summaryDivider} />
          <SummaryItem icon="star" value={totalFiveStar} label="5-Star Redirects" color="#F59E0B" />
          <View style={styles.summaryDivider} />
          <SummaryItem
            icon="trending-up"
            value={totalScans > 0 ? `${((totalFiveStar / totalScans) * 100).toFixed(1)}%` : '—'}
            label="Conversion"
            color="#22C55E"
            isString
          />
        </View>
      )}

      {/* Branch list */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />}
      >
        {branches.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={60} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No branches yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap + to open the map, search or tap your business, then set it up.
            </Text>
          </View>
        ) : (
          branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onPress={() => navigation.navigate('BranchDetail', { branchId: branch.id })}
              onDelete={() => deleteBranch(branch.id)}
            />
          ))
        )}
      </ScrollView>

      {/* FAB — goes straight to the map picker */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('StoreSelector')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Branch details modal (only opens after map pick) */}
      {modalVisible && (
        <BranchDetailsModal
          visible={modalVisible}
          store={pendingStore}
          onClose={() => { setModalVisible(false); setPendingStore(EMPTY_STORE); }}
          onAdd={addBranch}
        />
      )}
    </SafeAreaView>
  );
}

function SummaryItem({
  icon, value, label, color = '#4F46E5', isString,
}: {
  icon: string; value: number | string; label: string; color?: string; isString?: boolean;
}) {
  return (
    <View style={styles.summaryItem}>
      <Ionicons name={icon as never} size={18} color={color} />
      <Text style={[styles.summaryValue, { color }]}>{isString ? value : String(value)}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#1E1B4B', letterSpacing: -0.5 },
  subGreeting: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  list: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  biz: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 4 },
  deleteBtn: { padding: 4, marginLeft: 2 },
  categoryText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#9CA3AF' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, color: '#9CA3AF' },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1E1B4B' },
  closeBtn: { padding: 4 },
  body: { padding: 20, gap: 12 },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  storePillIcon: {
    width: 34, height: 34,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storePillName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  storePillAddr: { fontSize: 12, color: '#6366F1', marginTop: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: -4 },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 46,
  },
  hint: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, marginTop: -4 },
  labelHint: { fontSize: 11, color: '#9CA3AF', fontWeight: '400' },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#FFFFFF' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
