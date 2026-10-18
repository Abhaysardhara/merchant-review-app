import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CustomerStackParamList } from '../types';
import { StarRating } from '../components/StarRating';
import { logPrivateFeedback } from '../services/analytics';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PrivateFeedback'>;

export function PrivateFeedbackScreen({ route, navigation }: Props) {
  const { payload, rating } = route.params;

  const [comment, setComment] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Please share your feedback', 'A comment is required so we can address your concern.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save feedback to Firestore under users/{uid}/branches/{placeId}/feedback
      await logPrivateFeedback(payload.uid, payload.placeId, {
        rating,
        comment: comment.trim(),
        phone:   phone.trim()  || undefined,
        email:   email.trim()  || undefined,
      });
      setIsSubmitted(true);
    } catch {
      Alert.alert('Error', 'Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          </View>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successMessage}>
            Your feedback has been sent directly to the store manager to resolve your issue.
          </Text>
          <Text style={styles.successSub}>
            We take every concern seriously and will work to improve your experience.
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navBack} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Private Feedback</Text>
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
          {/* Privacy badge */}
          <View style={styles.privacyBadge}>
            <Ionicons name="lock-closed" size={16} color="#7C3AED" />
            <Text style={styles.privacyText}>
              This feedback is completely private and goes directly to the manager — it will never appear on Google.
            </Text>
          </View>

          {/* Business info */}
          <View style={styles.businessCard}>
            <View style={styles.businessIcon}>
              <Ionicons name="storefront" size={24} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.businessName}>{payload.businessName}</Text>
              <Text style={styles.branchName}>{payload.branchName}</Text>
            </View>
            <StarRating value={rating} readonly size={18} showLabel={false} />
          </View>

          {/* Comment */}
          <View style={styles.section}>
            <Text style={styles.label}>What went wrong? *</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={5}
              placeholder="Please describe your experience so we can resolve the issue…"
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
            />
            <Text style={styles.fieldHint}>{comment.length}/500 characters</Text>
          </View>

          {/* Optional contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact (Optional)</Text>
            <Text style={styles.sectionSubtitle}>
              Leave your details if you'd like us to follow up with you directly.
            </Text>

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <Text style={styles.submitBtnText}>Sending…</Text>
            ) : (
              <>
                <Ionicons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Send to Manager</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            By submitting, you agree that your feedback may be used internally to improve service quality.
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
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  privacyText: { fontSize: 13, color: '#5B21B6', flex: 1, lineHeight: 20 },
  businessCard: {
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
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  sectionSubtitle: { fontSize: 13, color: '#6B7280', marginTop: -4, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  commentInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    lineHeight: 22,
    minHeight: 120,
  },
  fieldHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: -4 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disclaimer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },

  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  successIcon: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  successMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  successSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  doneBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
