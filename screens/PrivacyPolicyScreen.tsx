import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';

type Props = NativeStackScreenProps<MerchantStackParamList, 'PrivacyPolicy'>;

export function PrivacyPolicyScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={s.updated}>Last updated: October 2026</Text>

        <Text style={s.heading}>1. Information We Collect</Text>
        <Text style={s.body}>
          <Text style={s.subhead}>Merchant Account Data:</Text> When you sign in with Google, we
          collect your name, email address, and profile photo to identify your account.{'\n\n'}
          <Text style={s.subhead}>Branch Data:</Text> Information about the business locations you
          add, including branch name, business name, address, Google Place ID, Google Maps URL,
          AI tone preferences, and keywords.{'\n\n'}
          <Text style={s.subhead}>Analytics Data:</Text> Anonymous usage counts when customers
          interact with your QR codes and review pages — QR scan counts, shared link visit counts,
          and review copy events.{'\n\n'}
          <Text style={s.subhead}>Customer Feedback Data:</Text> When a customer leaves private
          feedback (ratings of 1–3 stars), they may optionally provide their phone number and email
          address. This information is stored securely and shared only with the merchant whose branch
          received the feedback, for the purpose of addressing customer concerns.{'\n\n'}
          <Text style={s.subhead}>Local Device Data:</Text> We store cached branch data and app
          preferences locally on your device using AsyncStorage. This data does not leave your device.
        </Text>

        <Text style={s.heading}>2. How We Use Your Information</Text>
        <Text style={s.body}>
          We use your information to:{'\n'}
          • Provide and maintain the ReviewReach service{'\n'}
          • Generate AI-assisted review drafts for your customers{'\n'}
          • Track anonymous analytics (QR scans, link visits, reviews copied){'\n'}
          • Enable merchants to view and respond to private customer feedback{'\n'}
          • Deliver over-the-air app updates
        </Text>

        <Text style={s.heading}>3. Data Storage</Text>
        <Text style={s.body}>
          Your data is stored securely on Google Firebase servers (Cloud Firestore). We do not sell,
          rent, or share your personal data with third parties for marketing purposes. Customer
          feedback data (including optional phone/email) is accessible only to the merchant whose
          branch received it.
        </Text>

        <Text style={s.heading}>4. Third-Party Services</Text>
        <Text style={s.body}>
          ReviewReach uses the following third-party services:{'\n'}
          • Google Firebase — authentication and data storage{'\n'}
          • Google Maps Platform — place identification and map display{'\n'}
          • Google Gemini AI — review draft generation on the customer web page{'\n'}
          • Expo Application Services — app builds and over-the-air updates{'\n\n'}
          Each service has its own privacy policy governing data it processes. We encourage you to
          review their respective privacy policies.
        </Text>

        <Text style={s.heading}>5. Your Rights</Text>
        <Text style={s.body}>
          You have the right to:{'\n'}
          • <Text style={s.subhead}>Access</Text> your data — all your branch data and analytics
          are visible in the app{'\n'}
          • <Text style={s.subhead}>Correct</Text> your data — edit branch details at any time from
          the branch detail screen{'\n'}
          • <Text style={s.subhead}>Delete</Text> your data — remove individual branches from the
          dashboard, or delete your entire account via Settings → Delete Account{'\n'}
          • <Text style={s.subhead}>Restrict processing</Text> — contact us to request restricted
          processing of your data{'\n\n'}
          To exercise any of these rights, use the in-app features or contact us at
          support@reviewreach.app.
        </Text>

        <Text style={s.heading}>6. Data Retention & Deletion</Text>
        <Text style={s.body}>
          We retain your data for as long as your account is active. You can delete individual
          branches at any time from the dashboard. To delete your entire account and all associated
          data (including branch configurations, analytics, customer feedback, and local device data),
          go to Settings → Delete Account. This permanently removes your authentication record and all
          stored data. Deleted data cannot be recovered.{'\n\n'}
          If your account remains inactive for more than 12 months, we may delete your data after
          sending a notification to your registered email address.
        </Text>

        <Text style={s.heading}>7. Children's Privacy</Text>
        <Text style={s.body}>
          ReviewReach is not intended for use by children under 13. We do not knowingly collect
          personal information from children.
        </Text>

        <Text style={s.heading}>8. Changes to This Policy</Text>
        <Text style={s.body}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by
          posting the new policy within the app. Continued use of the app after changes constitutes
          acceptance of the revised policy.
        </Text>

        <Text style={s.heading}>9. Contact Us</Text>
        <Text style={s.body}>
          If you have any questions about this Privacy Policy or wish to exercise your data rights,
          please contact us at support@reviewreach.app.
        </Text>
      </ScrollView>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  content: { padding: 20 },
  updated: { fontSize: 12, color: '#94A3B8', marginBottom: 16 },
  heading: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 20, marginBottom: 8 },
  subhead: { fontWeight: '700', color: '#0F172A' },
  body: { fontSize: 14, color: '#475569', lineHeight: 22 },
});
