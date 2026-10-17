import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';
import { loadBranchFeedback, type FeedbackItem } from '../services/firebase';

type Props = NativeStackScreenProps<MerchantStackParamList, 'FeedbackInbox'>;

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color={i <= rating ? '#F59E0B' : '#E2E8F0'}
        />
      ))}
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const hasContact = Boolean(item.phone || item.email);

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <StarRow rating={item.rating} />
        <Text style={s.cardDate}>{formatDate(item.createdAt)}</Text>
      </View>

      <Text style={s.cardComment}>{item.comment}</Text>

      {hasContact && (
        <View style={s.contactRow}>
          {item.phone ? (
            <TouchableOpacity
              style={s.contactChip}
              onPress={() => Linking.openURL(`tel:${item.phone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={13} color="#059669" />
              <Text style={s.contactText}>{item.phone}</Text>
            </TouchableOpacity>
          ) : null}
          {item.email ? (
            <TouchableOpacity
              style={s.contactChip}
              onPress={() => Linking.openURL(`mailto:${item.email}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={13} color="#4F46E5" />
              <Text style={s.contactText}>{item.email}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

export function FeedbackInboxScreen({ route, navigation }: Props) {
  const { branchId, branchName } = route.params;
  const { currentUser } = useMerchant();
  const insets = useSafeAreaInsets();

  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser) return;
    const items = await loadBranchFeedback(currentUser.uid, branchId);
    setFeedback(items);
  }, [currentUser, branchId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>Feedback</Text>
          <Text style={s.headerSub} numberOfLines={1}>{branchName}</Text>
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText}>{feedback.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : feedback.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={40} color="#94A3B8" />
          </View>
          <Text style={s.emptyTitle}>No feedback yet</Text>
          <Text style={s.emptySub}>
            When customers with 1-3 star ratings submit private feedback, it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={feedback}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedbackCard item={item} />}
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
    backgroundColor: '#1E1B4B',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  badge: {
    minWidth: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 21 },

  list: { padding: 16, gap: 10 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 10,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  starRow: { flexDirection: 'row', gap: 2 },
  cardDate: { fontSize: 11, color: '#94A3B8' },
  cardComment: { fontSize: 14, color: '#1E293B', lineHeight: 21 },

  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contactChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  contactText: { fontSize: 12, color: '#475569' },
});
