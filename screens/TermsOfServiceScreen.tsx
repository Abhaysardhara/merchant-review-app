import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';

type Props = NativeStackScreenProps<MerchantStackParamList, 'TermsOfService'>;

export function TermsOfServiceScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms of Service</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={s.updated}>Last updated: October 2026</Text>

        <Text style={s.heading}>1. Acceptance of Terms</Text>
        <Text style={s.body}>
          By accessing or using ReviewReach, you agree to be bound by these Terms of Service. If you
          do not agree to these terms, please do not use the app.
        </Text>

        <Text style={s.heading}>2. Description of Service</Text>
        <Text style={s.body}>
          ReviewReach is a tool that helps merchants collect customer reviews by generating
          AI-assisted review drafts. Merchants create branch profiles, generate QR codes, and
          customers scan them to receive personalized review suggestions they can post on Google.
        </Text>

        <Text style={s.heading}>3. User Accounts</Text>
        <Text style={s.body}>
          You must sign in with a Google account to use ReviewReach. You are responsible for
          maintaining the security of your account and for all activities that occur under it.
        </Text>

        <Text style={s.heading}>4. Acceptable Use</Text>
        <Text style={s.body}>
          You agree not to:{'\n'}
          • Use the service to generate fake, misleading, or fraudulent reviews{'\n'}
          • Impersonate another business or individual{'\n'}
          • Use the service for any unlawful purpose{'\n'}
          • Attempt to gain unauthorized access to our systems{'\n'}
          • Interfere with or disrupt the service
        </Text>

        <Text style={s.heading}>5. AI-Generated Content</Text>
        <Text style={s.body}>
          ReviewReach uses AI to generate review drafts. These drafts are suggestions only —
          customers are free to edit, modify, or discard them before posting. You acknowledge that
          AI-generated content may not always be accurate and that final review content is the
          responsibility of the person posting it.
        </Text>

        <Text style={s.heading}>6. Intellectual Property</Text>
        <Text style={s.body}>
          The ReviewReach app, its design, and its code are the property of ReviewReach. You retain
          ownership of any content you create, including branch profiles and business information.
        </Text>

        <Text style={s.heading}>7. Limitation of Liability</Text>
        <Text style={s.body}>
          ReviewReach is provided "as is" without warranties of any kind. We are not liable for any
          indirect, incidental, or consequential damages arising from your use of the service,
          including but not limited to reviews posted by customers.
        </Text>

        <Text style={s.heading}>8. Termination</Text>
        <Text style={s.body}>
          We reserve the right to suspend or terminate your account if you violate these terms. You
          may delete your account at any time through Settings → Delete Account.
        </Text>

        <Text style={s.heading}>9. Changes to Terms</Text>
        <Text style={s.body}>
          We may modify these terms at any time. Continued use of the app after changes constitutes
          acceptance of the new terms.
        </Text>

        <Text style={s.heading}>10. Contact</Text>
        <Text style={s.body}>
          For questions about these Terms of Service, contact us at support@reviewreach.app.
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
