import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';
import { QRCodeCard } from '../components/QRCodeCard';
import { conversionRate, formatLastScan } from '../services/analytics';

type Props = NativeStackScreenProps<MerchantStackParamList, 'BranchDetail'>;

const TONES = [
  'Friendly', 'Professional', 'Luxury', 'Casual',
  'Enthusiastic', 'Concise', 'Heartfelt', 'Formal', 'Detailed', 'Grateful',
];

export function BranchDetailScreen({ route, navigation }: Props) {
  const { branchId } = route.params;
  const { getBranch, updateBranch, deleteBranch, buildQRUrl } = useMerchant();

  const branch = getBranch(branchId);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(branch?.name ?? '');
  const [keywords, setKeywords] = useState(branch?.keywords ?? '');
  // tone stored as comma-separated string; split for multi-select UI
  const [tones, setTones] = useState<string[]>(
    branch?.tone ? branch.tone.split(', ').filter(Boolean) : ['Friendly'],
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleTone = useCallback((t: string) => {
    setTones((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Branch name cannot be empty.');
      return;
    }
    if (tones.length === 0) {
      Alert.alert('Select tone', 'Please select at least one AI tone.');
      return;
    }
    setIsSaving(true);
    await updateBranch(branchId, {
      name: name.trim(),
      keywords: keywords.trim(),
      tone: tones.join(', '),
    });
    setIsSaving(false);
    setIsEditing(false);
  }, [branchId, name, keywords, tones, updateBranch]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Branch',
      `Are you sure you want to delete "${branch?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBranch(branchId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (!branch) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.notFoundText}>Branch not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const qrUrl = buildQRUrl(branch);

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{branch.name}</Text>
        <TouchableOpacity
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
          style={styles.navBtn}
          disabled={isSaving}
        >
          <Text style={styles.navAction}>{isEditing ? (isSaving ? 'Saving…' : 'Save') : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* QR Code */}
          <QRCodeCard qrUrl={qrUrl} label={branch.name} address={branch.address} size={200} />

          {/* Analytics */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Analytics</Text>
            <View style={styles.analyticsGrid}>
              <AnalyticBox icon="scan-outline" value={branch.analytics.totalScans} label="Total Scans" color="#4F46E5" />
              <AnalyticBox icon="copy-outline" value={branch.analytics.reviewsCopied} label="Reviews Copied" color="#F59E0B" />
              <AnalyticBox icon="trending-up-outline" value={conversionRate(branch.analytics)} label="Conversion Rate" color="#059669" isString />
            </View>
            <View style={styles.lastScanRow}>
              <Ionicons name="time-outline" size={13} color="#9CA3AF" />
              <Text style={styles.lastScanText}>Last scan: {formatLastScan(branch.analytics.lastScanAt)}</Text>
            </View>
          </View>

          {/* Branch Details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Branch Details</Text>

            <FieldRow label="Branch Name">
              {isEditing ? (
                <TextInput style={styles.fieldInput} value={name} onChangeText={setName} />
              ) : (
                <Text style={styles.fieldValue}>{branch.name}</Text>
              )}
            </FieldRow>

            <FieldRow label="Address">
              <Text style={styles.fieldValue} numberOfLines={2}>{branch.address || '—'}</Text>
            </FieldRow>

            <FieldRow label="Place ID">
              <Text style={styles.fieldValueMono} numberOfLines={1} ellipsizeMode="middle">
                {branch.placeId}
              </Text>
            </FieldRow>

            <FieldRow label="AI Tone">
              {isEditing ? (
                <View style={styles.chipWrap}>
                  {TONES.map((t) => {
                    const active = tones.includes(t);
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => toggleTone(t)}
                      >
                        {active && <Ionicons name="checkmark" size={11} color="#FFF" />}
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.fieldValue}>{branch.tone}</Text>
              )}
            </FieldRow>

            <FieldRow label="Keywords">
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, { minHeight: 60 }]}
                  value={keywords}
                  onChangeText={setKeywords}
                  multiline
                />
              ) : (
                <Text style={styles.fieldValue}>{branch.keywords || '—'}</Text>
              )}
            </FieldRow>

            <FieldRow label="Created">
              <Text style={styles.fieldValue}>
                {new Date(branch.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </Text>
            </FieldRow>
          </View>

          {/* Danger zone */}
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete Branch</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────

function AnalyticBox({
  icon, value, label, color, isString,
}: {
  icon: string; value: number | string; label: string; color: string; isString?: boolean;
}) {
  return (
    <View style={[styles.analyticBox, { borderColor: color + '20' }]}>
      <Ionicons name={icon as never} size={18} color={color} />
      <Text style={[styles.analyticValue, { color }]}>{isString ? value : String(value)}</Text>
      <Text style={styles.analyticLabel}>{label}</Text>
    </View>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldContent}>{children}</View>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 18, fontWeight: '700', color: '#374151' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#4F46E5' },
  backBtnText: { color: '#FFF', fontWeight: '700' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  navBtn: { minWidth: 60, paddingHorizontal: 4 },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  navAction: { color: '#4F46E5', fontSize: 15, fontWeight: '700', textAlign: 'right' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  analyticBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#FAFAFA',
  },
  analyticValue: { fontSize: 20, fontWeight: '800' },
  analyticLabel: { fontSize: 10, color: '#94A3B8', textAlign: 'center', fontWeight: '500' },
  lastScanRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4 },
  lastScanText: { fontSize: 12, color: '#94A3B8' },
  fieldRow: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, gap: 4 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldContent: { paddingTop: 2 },
  fieldValue: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  fieldValueMono: { fontSize: 12, color: '#64748B', fontFamily: 'monospace' },
  fieldInput: {
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  chipRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#FFF' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  deleteBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});
