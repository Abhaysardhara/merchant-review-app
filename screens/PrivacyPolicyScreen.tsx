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
          When you sign in with Google, we collect your name, email address, and profile photo to
          identify your account. We also collect information about the branches you create, including
          business name, address, and Google Place ID.
        </Text>

        <Text style={s.heading}>2. How We Use Your Information</Text>
        <Text style={s.body}>
          We use your information to:{'\n'}
          • Provide and maintain the ReviewReach service{'\n'}
          • Generate AI-assisted review drafts for your customers{'\n'}
          • Track anonymous analytics (QR scans, link visits, reviews copied){'\n'}
          • Communicate with you about service updates
        </Text>

        <Text style={s.heading}>3. Data Storage</Text>
        <Text style={s.body}>
          Your data is stored securely on Google Firebase servers. Branch configuration and analytics
          are stored in Cloud Firestore. We do not sell, rent, or share your personal data with third
          parties for marketing purposes.
        </Text>

        <Text style={s.heading}>4. Analytics Data</Text>
        <Text style={s.body}>
          We collect anonymous usage analytics when customers interact with your QR codes and review
          pages. This includes scan counts, link visits, and review copy events. No personally
          identifiable information about your customers is collected.
        </Text>

        <Text style={s.heading}>5. Third-Party Services</Text>
        <Text style={s.body}>
          ReviewReach uses the following third-party services:{'\n'}
          • Google Firebase (authentication and data storage){'\n'}
          • Google Maps Platform (place identification){'\n'}
          • Google Gemini AI (review generation){'\n'}
          Each service has its own privacy policy governing data it processes.
        </Text>

        <Text style={s.heading}>6. Data Retention & Deletion</Text>
        <Text style={s.body}>
          You can delete individual branches at any time from the dashboard. To delete your entire
          account and all associated data, go to Settings → Delete Account. This permanently removes
          your authentication record and all stored branch data.
        </Text>

        <Text style={s.heading}>7. Children's Privacy</Text>
        <Text style={s.body}>
          ReviewReach is not intended for use by children under 13. We do not knowingly collect
          personal information from children.
        </Text>

        <Text style={s.heading}>8. Changes to This Policy</Text>
        <Text style={s.body}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by
          posting the new policy within the app.
        </Text>

        <Text style={s.heading}>9. Contact Us</Text>
        <Text style={s.body}>
          If you have any questions about this Privacy Policy, please contact us at
          support@reviewreach.app.
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
  body: { fontSize: 14, color: '#475569', lineHeight: 22 },
});
