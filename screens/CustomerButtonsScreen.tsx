/**
 * CustomerButtonsScreen.tsx — "What customers see"
 *
 * Shows the buttons customers tap on the review page, like a phone preview.
 * Built for shop owners who aren't technical: tap a button to remove or
 * rename it (with Undo instead of "Are you sure?"), and add more by
 * speaking into the keyboard's microphone. "Could be better" buttons are
 * managed automatically and not shown for editing.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList, ReviewButton } from '../types';
import { useMerchant } from '../store/MerchantContext';
import { addButtonsFromSpeech } from '../services/buttonsApi';
import { useExtraText } from '../i18n/extra';

type Props = NativeStackScreenProps<MerchantStackParamList, 'CustomerButtons'>;

const UNDO_MS = 5000;

export function CustomerButtonsScreen({ route, navigation }: Props) {
  const { branchId } = route.params;
  const { getBranch, currentUser, setBranchButtons, applyServerButtons, makingButtons, makeButtons } = useMerchant();
  const { t, buttonLang } = useExtraText();
  const insets = useSafeAreaInsets();

  const branch = getBranch(branchId);
  const buttons = branch?.buttons ?? [];
  const isMaking = makingButtons.includes(branchId);

  const [selected, setSelected] = useState<ReviewButton | null>(null);
  const [renaming, setRenaming] = useState<ReviewButton | null>(null);
  const [newName, setNewName] = useState('');
  const [sells, setSells] = useState('');
  const [adding, setAdding] = useState(false);
  const [undo, setUndo] = useState<{ removed: ReviewButton; before: ReviewButton[] } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const label = useCallback((b: ReviewButton) => b.labels[buttonLang] || b.labels.en, [buttonLang]);

  const showError = useCallback(() => Alert.alert('', t('cs_error')), [t]);

  // ── Remove (with Undo) ──
  const remove = useCallback(async (b: ReviewButton) => {
    setSelected(null);
    const before = buttons;
    try {
      await setBranchButtons(branchId, buttons.filter((x) => x.id !== b.id));
      setUndo({ removed: b, before });
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
    } catch {
      showError();
    }
  }, [branchId, buttons, setBranchButtons, showError]);

  const doUndo = useCallback(async () => {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const restore = undo.before;
    setUndo(null);
    try { await setBranchButtons(branchId, restore); } catch { showError(); }
  }, [branchId, undo, setBranchButtons, showError]);

  // ── Rename ──
  const startRename = useCallback((b: ReviewButton) => {
    setSelected(null);
    setNewName(label(b));
    setRenaming(b);
  }, [label]);

  const saveRename = useCallback(async () => {
    const text = newName.trim().slice(0, 40);
    const b = renaming;
    setRenaming(null);
    if (!b || !text || text === label(b)) return;
    // The merchant's words are shown to customers in every language
    const updated = buttons.map((x) =>
      x.id === b.id ? { ...x, labels: { en: text, hi: text, gu: text }, source: 'merchant' as const } : x,
    );
    try { await setBranchButtons(branchId, updated); } catch { showError(); }
  }, [branchId, buttons, label, newName, renaming, setBranchButtons, showError]);

  // ── Add by speaking ──
  const add = useCallback(async () => {
    if (!currentUser || !sells.trim()) return;
    setAdding(true);
    try {
      const res = await addButtonsFromSpeech(currentUser.uid, branchId, sells);
      applyServerButtons(branchId, res.buttons);
      setSells('');
    } catch {
      showError();
    } finally {
      setAdding(false);
    }
  }, [applyServerButtons, branchId, currentUser, sells, showError]);

  const make = useCallback(async () => {
    try { await makeButtons(branchId, branch?.servicesSpoken); } catch { showError(); }
  }, [branch?.servicesSpoken, branchId, makeButtons, showError]);

  // Shops added before buttons existed: make them automatically, once
  const triedAuto = useRef(false);
  useEffect(() => {
    if (branch && !isMaking && buttons.length === 0 && !triedAuto.current) {
      triedAuto.current = true;
      make();
    }
  }, [branch, buttons.length, isMaking, make]);

  if (!branch) return null;

  const visible = buttons.filter((b) => b.enabled && b.kind !== 'improve');
  const groups: { kind: ReviewButton['kind']; title: string }[] = [
    { kind: 'bought', title: t('cs_bought') },
    { kind: 'good', title: t('cs_good') },
  ];

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{t('cs_title')}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
          {/* Phone-style preview */}
          <View style={s.phone}>
            <Text style={s.phoneShop} numberOfLines={1}>{branch.name}</Text>

            {isMaking ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color="#B45309" />
                <Text style={s.making}>{t('cs_making')}</Text>
              </View>
            ) : visible.length === 0 ? (
              <View style={s.center}>
                <Text style={s.empty}>{t('cs_empty')}</Text>
                <TouchableOpacity style={s.bigBtn} onPress={make} accessibilityRole="button">
                  <Ionicons name="sparkles" size={20} color="#FFF" />
                  <Text style={s.bigBtnText}>{t('cs_make')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={s.tapHint}>{t('cs_tapHint')}</Text>
                {groups.map((g) => {
                  const list = visible.filter((b) => b.kind === g.kind);
                  if (!list.length) return null;
                  return (
                    <View key={g.kind} style={s.group}>
                      <Text style={s.groupTitle}>{g.title}</Text>
                      <View style={s.chips}>
                        {list.map((b) => (
                          <Pressable
                            key={b.id}
                            onPress={() => setSelected(b)}
                            style={({ pressed }) => [s.chip, pressed && { transform: [{ scale: 0.96 }] }]}
                            accessibilityRole="button"
                          >
                            <Text style={s.chipText}>{b.emoji} {label(b)}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>

          {/* Add by speaking */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('cs_addLabel')}</Text>
            <View style={s.micHint}>
              <Ionicons name="mic" size={20} color="#4F46E5" />
              <Text style={s.micHintText}>{t('sell_hint')}</Text>
            </View>
            <TextInput
              style={s.input}
              value={sells}
              onChangeText={setSells}
              multiline
              maxLength={500}
              accessibilityLabel={t('sell_label')}
            />
            <TouchableOpacity
              style={[s.bigBtn, (!sells.trim() || adding) && s.bigBtnOff]}
              onPress={add}
              disabled={!sells.trim() || adding}
              accessibilityRole="button"
            >
              {adding ? <ActivityIndicator color="#FFF" /> : <Ionicons name="add" size={22} color="#FFF" />}
              <Text style={s.bigBtnText}>{adding ? t('cs_adding') : t('cs_addBtn')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.note}>{t('cs_complaintsNote')}</Text>

          {visible.length > 0 && !isMaking && (
            <TouchableOpacity style={s.linkBtn} onPress={make} accessibilityRole="button">
              <Ionicons name="refresh" size={16} color="#64748B" />
              <Text style={s.linkBtnText}>{t('cs_remake')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Undo bar */}
      {undo && (
        <View style={[s.undoBar, { bottom: insets.bottom + 16 }]}>
          <Text style={s.undoText} numberOfLines={1}>{t('cs_removed')}: {undo.removed.emoji} {label(undo.removed)}</Text>
          <TouchableOpacity onPress={doUndo} style={s.undoBtn} accessibilityRole="button">
            <Text style={s.undoBtnText}>{t('cs_undo')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions for a tapped button */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={s.sheetBg} onPress={() => setSelected(null)}>
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
            {selected && <Text style={s.sheetTitle}>{selected.emoji} {label(selected)}</Text>}
            <TouchableOpacity style={[s.sheetBtn, s.sheetBtnDanger]} onPress={() => selected && remove(selected)} accessibilityRole="button">
              <Ionicons name="trash" size={22} color="#B91C1C" />
              <Text style={[s.sheetBtnText, { color: '#B91C1C' }]}>{t('cs_remove')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetBtn} onPress={() => selected && startRename(selected)} accessibilityRole="button">
              <Ionicons name="create" size={22} color="#1E293B" />
              <Text style={s.sheetBtnText}>{t('cs_rename')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetCancel} onPress={() => setSelected(null)} accessibilityRole="button">
              <Text style={s.sheetCancelText}>{t('cs_cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rename */}
      <Modal visible={!!renaming} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={s.sheetBg} onPress={() => setRenaming(null)}>
            <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
              <Text style={s.sheetTitle}>{t('cs_newName')}</Text>
              <TextInput
                style={[s.input, { minHeight: 56 }]}
                value={newName}
                onChangeText={setNewName}
                maxLength={40}
                autoFocus
                accessibilityLabel={t('cs_newName')}
              />
              <TouchableOpacity style={s.bigBtn} onPress={saveRename} accessibilityRole="button">
                <Text style={s.bigBtnText}>{t('cs_save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sheetCancel} onPress={() => setRenaming(null)} accessibilityRole="button">
                <Text style={s.sheetCancelText}>{t('cs_cancel')}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: '#0F172A' },
  body: { padding: 16, gap: 16 },

  phone: {
    backgroundColor: '#FBF7F0', borderRadius: 28, borderWidth: 6, borderColor: '#1E293B',
    padding: 18, minHeight: 220,
  },
  phoneShop: { fontSize: 16, fontWeight: '700', color: '#1B1A17', marginBottom: 6 },
  tapHint: { fontSize: 14, color: '#5E584E', marginBottom: 4 },
  group: { marginTop: 12 },
  groupTitle: { fontSize: 14, fontWeight: '600', color: '#5E584E', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 48, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1.5, borderColor: '#A89878',
    backgroundColor: '#FFF', justifyContent: 'center',
  },
  chipText: { fontSize: 16, fontWeight: '600', color: '#1B1A17' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 28 },
  making: { fontSize: 16, color: '#5E584E' },
  empty: { fontSize: 16, color: '#5E584E' },

  card: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  micHint: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12 },
  micHintText: { flex: 1, fontSize: 15, color: '#3730A3', lineHeight: 21 },
  input: {
    minHeight: 72, borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 17, color: '#0F172A', textAlignVertical: 'top', backgroundColor: '#FFF',
  },
  bigBtn: {
    minHeight: 56, borderRadius: 16, backgroundColor: '#1F6E50', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20,
  },
  bigBtnOff: { backgroundColor: '#94A3B8' },
  bigBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  note: { fontSize: 14, color: '#64748B', lineHeight: 20, paddingHorizontal: 4 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48 },
  linkBtnText: { fontSize: 15, color: '#64748B', fontWeight: '600' },

  undoBar: {
    position: 'absolute', left: 16, right: 16, minHeight: 56, borderRadius: 16, backgroundColor: '#1E293B',
    flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, gap: 8,
  },
  undoText: { flex: 1, fontSize: 15, color: '#F8FAFC' },
  undoBtn: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center' },
  undoBtnText: { fontSize: 16, fontWeight: '800', color: '#FCD34D' },

  sheetBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  sheetBtn: {
    minHeight: 60, borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0',
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18,
  },
  sheetBtnDanger: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  sheetBtnText: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  sheetCancel: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  sheetCancelText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
});
