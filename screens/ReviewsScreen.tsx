import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';
import { listReviews, parseStarRating, type GBPReview } from '../services/gbp';
import { useI18n } from '../i18n';

type Props = NativeStackScreenProps<MerchantStackParamList, 'Reviews'>;

type Filter = 'all' | 'needs_reply' | 'replied';

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={13}
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

function ReviewCard({ review, onPress }: { review: GBPReview; onPress: () => void }) {
  const { t } = useI18n();
  const rating = parseStarRating(review.starRating);
  const hasReply = Boolean(review.reviewReply);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={s.cardTop}>
        <View style={s.cardAuthor}>
          <View style={s.avatar}>
            <Ionicons name="person" size={16} color="#64748B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.authorName} numberOfLines={1}>
              {review.reviewer.displayName || t('reviews_anonymous')}
            </Text>
            <Text style={s.reviewDate}>{formatDate(review.createTime)}</Text>
          </View>
          <StarRow rating={rating} />
        </View>
      </View>

      {review.comment ? (
        <Text style={s.reviewText} numberOfLines={3}>{review.comment}</Text>
      ) : (
        <Text style={s.noComment}>{t('reviews_noComment')}</Text>
      )}

      <View style={s.cardFooter}>
        {hasReply ? (
          <View style={s.repliedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={s.repliedText}>{t('reviews_replied')}</Text>
          </View>
        ) : (
          <View style={s.needsReplyBadge}>
            <Ionicons name="chatbubble-outline" size={14} color="#F59E0B" />
            <Text style={s.needsReplyText}>{t('reviews_needsReply')}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );
}

export function ReviewsScreen({ route, navigation }: Props) {
  const { branchName, locationName } = route.params;
  const { gbpAccessToken } = useMerchant();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [reviews, setReviews] = useState<GBPReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [totalCount, setTotalCount] = useState<number | undefined>();

  const load = useCallback(async () => {
    if (!gbpAccessToken) return;
    try {
      const result = await listReviews(gbpAccessToken, locationName);
      setReviews(result.reviews);
      setTotalCount(result.totalReviewCount);
    } catch {
      // silently fail — screen shows empty state
    }
  }, [gbpAccessToken, locationName]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Refresh reviews when returning from reply screen
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (!loading) load();
    });
    return unsub;
  }, [navigation, load, loading]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = reviews.filter((r) => {
    if (filter === 'needs_reply') return !r.reviewReply;
    if (filter === 'replied') return Boolean(r.reviewReply);
    return true;
  });

  const needsReplyCount = reviews.filter((r) => !r.reviewReply).length;

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{t('reviews_title')}</Text>
          <Text style={s.headerSub} numberOfLines={1}>{branchName}</Text>
        </View>
        {totalCount != null && (
          <View style={s.countBadge}>
            <Text style={s.countText}>{totalCount}</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {([
          { key: 'all', label: t('reviews_all') },
          { key: 'needs_reply', label: `${t('reviews_needsReply')} (${needsReplyCount})` },
          { key: 'replied', label: t('reviews_replied') },
        ] as const).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterTab, filter === f.key && s.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : !gbpAccessToken ? (
        <View style={s.centered}>
          <Ionicons name="link-outline" size={40} color="#94A3B8" />
          <Text style={s.emptyTitle}>{t('reviews_gbpNotConnected')}</Text>
          <Text style={s.emptySub}>{t('reviews_connectGBP')}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="chatbubbles-outline" size={40} color="#94A3B8" />
          <Text style={s.emptyTitle}>
            {filter === 'all' ? t('reviews_noReviews') : filter === 'needs_reply' ? t('reviews_allCaughtUp') : t('reviews_noReplies')}
          </Text>
          <Text style={s.emptySub}>
            {filter === 'needs_reply'
              ? t('reviews_repliedAll')
              : t('reviews_willAppear')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              onPress={() => {
                const branch = route.params;
                navigation.navigate('ReviewReply', {
                  branchName: branch.branchName,
                  businessTone: '', // will be filled from branch
                  review: {
                    name: item.name,
                    reviewerName: item.reviewer.displayName || 'Customer',
                    rating: parseStarRating(item.starRating),
                    comment: item.comment ?? '',
                    createTime: item.createTime,
                    existingReply: item.reviewReply?.comment,
                  },
                });
              }}
            />
          )}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
          }
        />
      )}
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
  countBadge: {
    minWidth: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  countText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: { backgroundColor: '#4F46E5' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: '#fff' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 21 },

  list: { padding: 16, gap: 10 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 10,
  },
  cardTop: {},
  cardAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  authorName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  reviewDate: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  starRow: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 13, color: '#475569', lineHeight: 20 },
  noComment: { fontSize: 13, color: '#CBD5E1', fontStyle: 'italic' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC',
  },
  repliedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  repliedText: { fontSize: 12, fontWeight: '600', color: '#059669' },
  needsReplyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  needsReplyText: { fontSize: 12, fontWeight: '600', color: '#F59E0B' },
});
