import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useAnimatedValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CustomerStackParamList, Language } from '../types';
import { StarRating } from '../components/StarRating';

type Props = NativeStackScreenProps<CustomerStackParamList, 'FeedbackGate'>;

const DEFAULT_LANGUAGE: Language = 'en';

const RATING_MESSAGES: Record<number, { emoji: string; text: string; color: string }> = {
  1: { emoji: '😞', text: "We're sorry to hear that.", color: '#EF4444' },
  2: { emoji: '😕', text: "We can do better, we know it.", color: '#F97316' },
  3: { emoji: '😐', text: 'Thanks for your honest feedback.', color: '#EAB308' },
  4: { emoji: '😊', text: "Great! We're glad you enjoyed it.", color: '#84CC16' },
  5: { emoji: '🤩', text: 'Amazing! We love hearing that!', color: '#22C55E' },
};

export function FeedbackGateScreen({ route, navigation }: Props) {
  const { payload } = route.params;
  const [rating, setRating] = useState(0);
  const fadeAnim = useAnimatedValue(0);

  const handleRatingChange = (r: number) => {
    setRating(r);
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  };

  const handleContinue = () => {
    if (rating === 0) return;

    if (rating >= 4) {
      navigation.navigate('ReviewEditor', {
        payload,
        rating,
        language: DEFAULT_LANGUAGE,
      });
    } else {
      navigation.navigate('PrivateFeedback', { payload, rating });
    }
  };

  const ratingInfo = rating > 0 ? RATING_MESSAGES[rating] : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color="#374151" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Business identity */}
        <View style={styles.identity}>
          <View style={styles.businessIcon}>
            <Ionicons name="storefront" size={28} color="#4F46E5" />
          </View>
          <Text style={styles.businessName}>{payload.businessName}</Text>
          <Text style={styles.branchName}>{payload.branchName}</Text>
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.question}>How was your experience?</Text>
          <Text style={styles.questionSub}>
            Your feedback helps us serve you better.
          </Text>

          <View style={styles.starContainer}>
            <StarRating value={rating} onChange={handleRatingChange} size={44} showLabel={false} />
          </View>

          {ratingInfo && (
            <Animated.View
              style={[styles.ratingFeedback, { opacity: fadeAnim, borderColor: ratingInfo.color + '40' }]}
            >
              <Text style={styles.ratingEmoji}>{ratingInfo.emoji}</Text>
              <Text style={[styles.ratingText, { color: ratingInfo.color }]}>
                {ratingInfo.text}
              </Text>
            </Animated.View>
          )}

          {/* Routing hint */}
          {rating >= 4 && (
            <Animated.View style={[styles.routeHint, { opacity: fadeAnim }]}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.routeHintText}>
                You'll be able to share your experience on Google Maps!
              </Text>
            </Animated.View>
          )}
          {rating > 0 && rating <= 3 && (
            <Animated.View style={[styles.routeHint, styles.routeHintPrivate, { opacity: fadeAnim }]}>
              <Ionicons name="lock-closed" size={14} color="#8B5CF6" />
              <Text style={[styles.routeHintText, { color: '#7C3AED' }]}>
                Your feedback will go directly to the manager — privately.
              </Text>
            </Animated.View>
          )}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.continueBtn, rating === 0 && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={rating === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>
            {rating >= 4 ? 'Write a Review' : rating > 0 ? 'Send Private Feedback' : 'Select a rating first'}
          </Text>
          {rating > 0 && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
        </TouchableOpacity>

        <Text style={styles.footer}>No login or account required</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  backBtn: {
    margin: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 20,
  },
  identity: { alignItems: 'center', gap: 8, paddingTop: 8 },
  businessIcon: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  businessName: { fontSize: 22, fontWeight: '800', color: '#1E1B4B', letterSpacing: -0.4 },
  branchName: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  questionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  question: { fontSize: 20, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  questionSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: -8 },
  starContainer: { paddingVertical: 8 },
  ratingFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#FAFAFA',
  },
  ratingEmoji: { fontSize: 22 },
  ratingText: { fontSize: 14, fontWeight: '600' },
  routeHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    width: '100%',
  },
  routeHintPrivate: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  routeHintText: { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 },
  continueBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  continueBtnDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footer: { fontSize: 12, color: '#D1D5DB', paddingBottom: 8 },
});
