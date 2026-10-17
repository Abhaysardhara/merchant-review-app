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
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';
import { QRCodeCard } from '../components/QRCodeCard';
import { conversionRate, formatLastScan } from '../services/analytics';
import { useI18n } from '../i18n';

type Props = NativeStackScreenProps<MerchantStackParamList, 'BranchDetail'>;

const TONES = [
  'Friendly', 'Professional', 'Luxury', 'Casual',
  'Enthusiastic', 'Concise', 'Heartfelt', 'Formal', 'Detailed', 'Grateful',
];

export function BranchDetailScreen({ route, navigation }: Props) {
  const { branchId } = route.params;
  const { getBranch, updateBranch, deleteBranch, buildQRUrl, gbpConnected, getLocationName } = useMerchant();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const branch = getBranch(branchId);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(branch?.name ?? '');
  const [keywords, setKeywords] = useState(branch?.keywords ?? '');
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
      t('branch_delete'),
      t('branch_deleteConfirm'),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_delete'),
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
      <View style={[styles.notFoundRoot, { paddingTop: insets.top }]}>
        <View style={styles.notFoundContent}>
          <View style={styles.notFoundIconWrap}>
            <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
          </View>
          <Text style={styles.notFoundTitle}>{t('branch_notFound')}</Text>
          <Text style={styles.notFoundSub}>{t('branch_notFoundSub')}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.notFoundBtn}>
            <Text style={styles.notFoundBtnText}>{t('common_back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const qrUrl = buildQRUrl(branch);
  const a = branch.analytics;

  return (
    <View style={styles.root}>
      {/* ── Dark indigo header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* Blob decoration */}
        <View style={styles.headerBlob} pointerEvents="none" />

        {/* Nav row */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navIconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.navTitle} numberOfLines={1}>{branch.name}</Text>

          <TouchableOpacity
            onPress={isEditing ? handleSave : () => setIsEditing(true)}
            style={[styles.navTextBtn, isEditing && styles.navTextBtnActive]}
            disabled={isSaving}
          >
            <Text style={[styles.navAction, isEditing && styles.navActionSave]}>
              {isEditing ? (isSaving ? t('branch_saving') : t('common_save')) : t('common_edit')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Analytics stat tiles */}
        <View style={styles.statRow}>
          <StatTile icon="scan-outline"        value={a.totalScans}            label={t('branch_scans')}   color="#818CF8" />
          <StatTile icon="link-outline"        value={a.linkVisits}            label={t('branch_visits')}  color="#A78BFA" />
          <StatTile icon="copy-outline"        value={a.reviewsCopied}         label={t('branch_copied')}  color="#34D399" />
          <StatTile icon="trending-up-outline" value={conversionRate(a)}       label={t('branch_cvr')}     color="#FCD34D" isString />
        </View>

        {a.lastScanAt && (
          <View style={styles.lastScanRow}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.45)" />
            <Text style={styles.lastScanText}>Last scan {formatLastScan(a.lastScanAt)}</Text>
          </View>
        )}
      </View>

      {/* ── Scrollable content ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* QR Code */}
          <QRCodeCard qrUrl={qrUrl} label={branch.name} address={branch.address} size={210} />

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickBtn}
              activeOpacity={0.8}
              onPress={() => {
                const msg = `Hi! Thank you for visiting ${branch.businessName}. We'd love your feedback — it only takes 30 seconds:\n\n${qrUrl.replace('QrOrigin=true', 'LinkOrigin=true')}`;
                const encoded = encodeURIComponent(msg);
                Linking.openURL(`https://wa.me/?text=${encoded}`);
              }}
            >
              <View style={[styles.quickBtnIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#059669" />
              </View>
              <Text style={styles.quickBtnLabel}>{t('branch_whatsapp')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('FeedbackInbox', { branchId: branch.id, branchName: branch.name })}
            >
              <View style={[styles.quickBtnIcon, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="chatbubbles" size={20} color="#EF4444" />
              </View>
              <Text style={styles.quickBtnLabel}>{t('branch_feedback')}</Text>
            </TouchableOpacity>

            {gbpConnected && getLocationName(branch.placeId) && (
              <TouchableOpacity
                style={styles.quickBtn}
                activeOpacity={0.8}
                onPress={() => {
                  const locationName = getLocationName(branch.placeId);
                  if (locationName) {
                    navigation.navigate('Reviews', {
                      branchId: branch.id,
                      branchName: branch.name,
                      locationName,
                    });
                  }
                }}
              >
                <View style={[styles.quickBtnIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="star" size={20} color="#4F46E5" />
                </View>
                <Text style={styles.quickBtnLabel}>{t('branch_reviews')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Branch Details */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="information-circle" size={16} color="#4F46E5" />
              </View>
              <Text style={styles.sectionTitle}>{t('branch_details')}</Text>
              {!isEditing && (
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editPill}>
                  <Ionicons name="pencil-outline" size={12} color="#4F46E5" />
                  <Text style={styles.editPillText}>{t('common_edit')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <FieldRow label={t('branch_name')}>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Downtown Location"
                  placeholderTextColor="#CBD5E1"
                />
              ) : (
                <Text style={styles.fieldValue}>{branch.name}</Text>
              )}
            </FieldRow>

            <FieldRow label={t('branch_business')}>
              <Text style={styles.fieldValue}>{branch.businessName || '—'}</Text>
            </FieldRow>

            <FieldRow label={t('branch_address')}>
              <Text style={styles.fieldValue} numberOfLines={2}>{branch.address || '—'}</Text>
            </FieldRow>

            <FieldRow label={t('branch_placeId')}>
              <Text style={styles.fieldValueMono} numberOfLines={1} ellipsizeMode="middle">
                {branch.placeId}
              </Text>
            </FieldRow>

            <FieldRow label={t('branch_aiTone')} last={!isEditing}>
              {isEditing ? (
                <View style={styles.chipWrap}>
                  {TONES.map((t) => {
                    const active = tones.includes(t);
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.toneChip, active && styles.toneChipActive]}
                        onPress={() => toggleTone(t)}
                      >
                        {active && <Ionicons name="checkmark" size={11} color="#FFF" />}
                        <Text style={[styles.toneChipText, active && styles.toneChipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.fieldValue}>{branch.tone}</Text>
              )}
            </FieldRow>

            <FieldRow label={t('branch_keywords')} last={!isEditing}>
              {isEditing ? (
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputMulti]}
                  value={keywords}
                  onChangeText={setKeywords}
                  multiline
                  placeholder="e.g. coffee, cozy, quick service"
                  placeholderTextColor="#CBD5E1"
                />
              ) : (
                <Text style={styles.fieldValue}>{branch.keywords || '—'}</Text>
              )}
            </FieldRow>

            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setIsEditing(false);
                    setName(branch.name);
                    setKeywords(branch.keywords ?? '');
                    setTones(branch.tone ? branch.tone.split(', ').filter(Boolean) : ['Friendly']);
                  }}
                >
                  <Text style={styles.cancelBtnText}>{t('common_cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.saveBtnText}>{isSaving ? t('branch_saving') : t('branch_saveChanges')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <FieldRow label={t('branch_addedOn')} last>
              <Text style={styles.fieldValue}>
                {new Date(branch.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </Text>
            </FieldRow>
          </View>

          {/* Danger zone */}
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={17} color="#DC2626" />
            <Text style={styles.deleteBtnText}>{t('branch_delete')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────

function StatTile({
  icon, value, label, color, isString,
}: {
  icon: string; value: number | string; label: string; color: string; isString?: boolean;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color }]}>{isString ? value : String(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FieldRow({
  label, children, last,
}: {
  label: string; children: React.ReactNode; last?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, last && styles.fieldRowLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldContent}>{children}</View>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  // ── Not found ──
  notFoundRoot: { flex: 1, backgroundColor: '#1E1B4B' },
  notFoundContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  notFoundIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  notFoundTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  notFoundSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  notFoundBtn: {
    marginTop: 8, paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: 12, backgroundColor: '#4F46E5',
  },
  notFoundBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Header ──
  header: {
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 20,
    paddingBottom: 22,
    overflow: 'hidden',
    gap: 16,
  },
  headerBlob: {
    position: 'absolute', top: -40, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(99,102,241,0.22)',
  },

  // Nav row
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    marginLeft: 4,
  },
  navTextBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  navTextBtnActive: { backgroundColor: '#4F46E5' },
  navAction: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700' },
  navActionSave: { color: '#fff' },

  // Stat tiles
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },

  lastScanRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -8,
  },
  lastScanText: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },

  // ── Content ──
  content: { padding: 16, gap: 14 },

  // ── Quick actions ──
  quickActions: {
    flexDirection: 'row', gap: 10,
  },
  quickBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  quickBtnIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  quickBtnLabel: {
    fontSize: 11, fontWeight: '700', color: '#475569',
    textAlign: 'center', lineHeight: 15,
  },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editPillText: { fontSize: 12, color: '#4F46E5', fontWeight: '700' },

  // Field rows
  fieldRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 11,
    gap: 3,
  },
  fieldRowLast: { borderBottomWidth: 0 },
  fieldLabel: {
    fontSize: 10, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  fieldContent: { paddingTop: 2 },
  fieldValue: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  fieldValueMono: { fontSize: 12, color: '#64748B', fontFamily: 'monospace' },
  fieldInput: {
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FAFBFF',
  },
  fieldInputMulti: { minHeight: 70, textAlignVertical: 'top' },

  // Tone chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  toneChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  toneChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  toneChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  toneChipTextActive: { color: '#fff' },

  // Edit actions
  editActions: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  saveBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── Delete ──
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FFF5F5',
  },
  deleteBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});
