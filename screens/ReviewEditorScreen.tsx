import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CustomerStackParamList, Language } from '../types';
import { generateReviewDraft } from '../services/aiService';
import { logFiveStarRedirect } from '../services/analytics';
import { LanguageSelector } from '../components/LanguageSelector';
import { StarRating } from '../components/StarRating';

type Props = NativeStackScreenProps<CustomerStackParamList, 'ReviewEditor'>;

export function ReviewEditorScreen({ route, navigation }: Props) {
  const { payload, rating, language: initialLanguage } = route.params;

  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [draftText, setDraftText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [hasLoggedRedirect, setHasLoggedRedirect] = useState(false);

  const generateDraft = useCallback(
    async (lang: Language) => {
      setIsGenerating(true);
      // Small delay simulates a realistic generation moment
      await new Promise((r) => setTimeout(r, 500));
      const draft = generateReviewDraft({
        branchName: payload.branchName,
        businessName: payload.businessName,
        category: payload.category,
        tone: payload.tone,
        keywords: payload.keywords,
        rating,
        language: lang,
      });
      setDraftText(draft.text);
      setIsGenerating(false);
    },
    [payload, rating],
  );

  // Generate on mount and when language changes
  useEffect(() => {
    generateDraft(language);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegenerate = () => {
    generateDraft(language);
  };

  const handleCopyAndOpen = useCallback(async () => {
    if (!draftText.trim()) {
      Alert.alert('Empty review', 'Please write something before copying.');
      return;
    }

    try {
      await Clipboard.setStringAsync(draftText.trim());
    } catch {
      Alert.alert('Clipboard error', 'Could not copy the text. Please copy it manually.');
      return;
    }

    setIsCopied(true);

    // Log this as a 5-star redirect
    if (!hasLoggedRedirect) {
      setHasLoggedRedirect(true);
      await logFiveStarRedirect(payload.branchId);
    }

    const mapsUrl = `https://search.google.com/local/writereview?placeid=${payload.placeId}`;

    const canOpen = await Linking.canOpenURL(mapsUrl);
    if (!canOpen) {
      Alert.alert(
        'Review copied!',
        'Your review has been copied to the clipboard. Open Google Maps manually and paste it to share your experience.',
        [{ text: 'OK' }],
      );
      return;
    }

    Alert.alert(
      '✅ Review Copied!',
      'Long-press to paste your review into Google Maps when prompted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Google Maps',
          onPress: () => Linking.openURL(mapsUrl),
        },
      ],
    );
  }, [draftText, payload, hasLoggedRedirect]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navBack} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Write a Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Business header */}
          <View style={styles.businessHeader}>
            <View style={styles.businessIcon}>
              <Ionicons name="storefront" size={24} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.businessName}>{payload.businessName}</Text>
              <Text style={styles.branchName}>{payload.branchName}</Text>
            </View>
            <View style={{ marginLeft: 'auto' }}>
              <StarRating value={rating} readonly size={18} showLabel={false} />
            </View>
          </View>

          {/* Language selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Review Language</Text>
            <LanguageSelector selected={language} onSelect={setLanguage} />
          </View>

          {/* Review editor */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Your Review</Text>
              <TouchableOpacity
                style={styles.regenBtn}
                onPress={handleRegenerate}
                disabled={isGenerating}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="refresh"
                  size={14}
                  color={isGenerating ? '#9CA3AF' : '#4F46E5'}
                />
                <Text style={[styles.regenBtnText, isGenerating && styles.regenBtnDisabled]}>
                  Regenerate
                </Text>
              </TouchableOpacity>
            </View>

            {isGenerating ? (
              <View style={styles.generatingBox}>
                <ActivityIndicator color="#4F46E5" />
                <Text style={styles.generatingText}>Crafting your review…</Text>
              </View>
            ) : (
              <View style={styles.editorWrapper}>
                <TextInput
                  style={styles.editor}
                  value={draftText}
                  onChangeText={setDraftText}
                  multiline
                  textAlignVertical="top"
                  placeholder="Your review will appear here…"
                  placeholderTextColor="#9CA3AF"
                  scrollEnabled={false}
                />
                <View style={styles.charCount}>
                  <Text style={styles.charCountText}>{draftText.length} chars</Text>
                </View>
              </View>
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>How to post your review</Text>
            {[
              { icon: 'copy-outline', text: 'Tap the button below to copy your review.' },
              { icon: 'logo-google', text: 'Google Maps will open to the review page.' },
              { icon: 'clipboard-outline', text: 'Long-press in the text box and select Paste.' },
              { icon: 'send', text: 'Submit to share your experience!' },
            ].map((step, i) => (
              <View key={i} style={styles.instructionStep}>
                <View style={styles.instructionNum}>
                  <Text style={styles.instructionNumText}>{i + 1}</Text>
                </View>
                <Ionicons name={step.icon as never} size={16} color="#6B7280" />
                <Text style={styles.instructionText}>{step.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaBtn, (isGenerating || !draftText) && styles.ctaBtnDisabled]}
            onPress={handleCopyAndOpen}
            disabled={isGenerating || !draftText}
            activeOpacity={0.85}
          >
            {isCopied ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.ctaBtnText}>Copied — Open Google Maps Again</Text>
              </>
            ) : (
              <>
                <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
                <Text style={styles.ctaBtnText}>Copy Review & Open Google Maps</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Your review will be posted under your Google account on Google Maps.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  navBack: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  navTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1E1B4B', textAlign: 'center' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  businessIcon: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  businessName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  branchName: { fontSize: 12, color: '#6B7280' },
  section: { gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  regenBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  regenBtnText: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },
  regenBtnDisabled: { color: '#9CA3AF' },
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  generatingText: { color: '#6B7280', fontSize: 14 },
  editorWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  editor: {
    padding: 14,
    fontSize: 15,
    color: '#111827',
    lineHeight: 24,
    minHeight: 160,
  },
  charCount: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    alignItems: 'flex-end',
  },
  charCountText: { fontSize: 11, color: '#9CA3AF' },
  instructionCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  instructionTitle: { fontSize: 13, fontWeight: '700', color: '#0369A1' },
  instructionStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  instructionNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#0EA5E9',
    alignItems: 'center', justifyContent: 'center',
  },
  instructionNumText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  instructionText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 18 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaBtnDisabled: { backgroundColor: '#E5E7EB', shadowOpacity: 0, elevation: 0 },
  ctaBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});
