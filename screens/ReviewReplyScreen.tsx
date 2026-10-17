import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';
import { replyToReview, deleteReply } from '../services/gbp';
import { generateReplyDraft } from '../services/gemini';
import { useI18n } from '../i18n';

type Props = NativeStackScreenProps<MerchantStackParamList, 'ReviewReply'>;

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? '#F59E0B' : '#E2E8F0'}
        />
      ))}
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ReviewReplyScreen({ route, navigation }: Props) {
  const { branchName, businessTone, review } = route.params;
  const { gbpAccessToken } = useMerchant();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [replyText, setReplyText] = useState(review.existingReply ?? '');
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasExistingReply = Boolean(review.existingReply);

  // Auto-generate AI draft on mount if no existing reply
  useEffect(() => {
    if (!review.existingReply && review.comment) {
      handleGenerate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const draft = await generateReplyDraft({
        businessName: branchName,
        tone: businessTone || 'Friendly',
        reviewerName: review.reviewerName,
        rating: review.rating,
        reviewText: review.comment || 'No comment provided',
      });
      setReplyText(draft);
    } catch {
      Alert.alert(t('common_error'), t('reply_generateError'));
    } finally {
      setGenerating(false);
    }
  }, [branchName, businessTone, review]);

  const handlePost = useCallback(async () => {
    if (!replyText.trim()) {
      Alert.alert(t('common_error'), t('reply_emptyError'));
      return;
    }
    if (!gbpAccessToken) {
      Alert.alert(t('common_error'), t('reply_notConnected'));
      return;
    }
    setPosting(true);
    try {
      await replyToReview(gbpAccessToken, review.name, replyText.trim());
      Alert.alert(t('reply_posted'), t('reply_postedSub'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to post reply. Please try again.');
    } finally {
      setPosting(false);
    }
  }, [replyText, gbpAccessToken, review.name, navigation]);

  const handleDelete = useCallback(async () => {
    if (!gbpAccessToken) return;
    Alert.alert(t('reply_deleteReply'), t('reply_deleteConfirm'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteReply(gbpAccessToken, review.name);
            Alert.alert(t('reply_deleted'), t('reply_deletedSub'), [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete reply.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [gbpAccessToken, review.name, navigation]);

  const isBusy = generating || posting || deleting;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>
            {hasExistingReply ? t('reply_editTitle') : t('reply_title')}
          </Text>
          <Text style={s.headerSub} numberOfLines={1}>{branchName}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Review card */}
          <View style={s.reviewCard}>
            <View style={s.reviewHeader}>
              <View style={s.avatar}>
                <Ionicons name="person" size={18} color="#64748B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.reviewerName}>{review.reviewerName}</Text>
                <Text style={s.reviewDate}>{formatDate(review.createTime)}</Text>
              </View>
              <StarRow rating={review.rating} />
            </View>

            {review.comment ? (
              <Text style={s.reviewText}>{review.comment}</Text>
            ) : (
              <Text style={s.noComment}>{t('reviews_noComment')}</Text>
            )}
          </View>

          {/* Reply section */}
          <View style={s.replySection}>
            <View style={s.replySectionHeader}>
              <View style={s.replySectionIcon}>
                <Ionicons name="chatbubble-ellipses" size={16} color="#4F46E5" />
              </View>
              <Text style={s.replySectionTitle}>{t('reply_yourReply')}</Text>
              <TouchableOpacity
                style={[s.aiBtn, generating && s.aiBtnDisabled]}
                onPress={handleGenerate}
                disabled={isBusy}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={14} color="#4F46E5" />
                    <Text style={s.aiBtnText}>
                      {replyText ? t('reply_regenerate') : t('reply_aiDraft')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              placeholder={t('reply_placeholder')}
              placeholderTextColor="#CBD5E1"
              editable={!isBusy}
            />

            {generating && (
              <View style={s.generatingBanner}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={s.generatingText}>{t('reply_generating')}</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <TouchableOpacity
            style={[s.postBtn, isBusy && s.postBtnDisabled]}
            onPress={handlePost}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={s.postBtnText}>
                  {hasExistingReply ? t('reply_update') : t('reply_post')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {hasExistingReply && (
            <TouchableOpacity
              style={[s.deleteReplyBtn, isBusy && { opacity: 0.5 }]}
              onPress={handleDelete}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={s.deleteReplyText}>{t('reply_deleteReply')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#1E1B4B', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },

  content: { padding: 16, gap: 14 },

  // Review card
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 10,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewerName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  reviewDate: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  starRow: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  noComment: { fontSize: 13, color: '#CBD5E1', fontStyle: 'italic' },

  // Reply section
  replySection: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 12,
  },
  replySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replySectionIcon: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  replySectionTitle: {
    flex: 1, fontSize: 13, fontWeight: '800', color: '#0F172A',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
  },
  aiBtnDisabled: { opacity: 0.5 },
  aiBtnText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },

  replyInput: {
    fontSize: 14, color: '#0F172A', lineHeight: 22,
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 120, textAlignVertical: 'top',
    backgroundColor: '#FAFBFF',
  },

  generatingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: '#EEF2FF',
  },
  generatingText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },

  // Post button
  postBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  postBtnDisabled: { opacity: 0.55 },
  postBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Delete reply
  deleteReplyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FFF5F5',
  },
  deleteReplyText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
