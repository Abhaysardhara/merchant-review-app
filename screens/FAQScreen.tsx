import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';

type Props = NativeStackScreenProps<MerchantStackParamList, 'FAQ'>;

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is ReviewReach?',
    a: 'ReviewReach helps merchants collect more Google reviews by generating AI-assisted review drafts for customers. You create branch profiles, generate QR codes, and customers scan them to get personalized review suggestions.',
  },
  {
    q: 'How do QR codes work?',
    a: 'Each branch gets a unique QR code. When a customer scans it, they are taken to a web page that generates a personalised review draft based on your branch settings (tone, keywords). They can edit and copy the review to paste on Google.',
  },
  {
    q: 'Is the service free?',
    a: 'ReviewReach is currently free to use. We may introduce premium features in the future, but core functionality will remain accessible.',
  },
  {
    q: 'How do I add a new branch?',
    a: 'Tap the "Add Branch" button on your dashboard, search for your business on the map, select it, and fill in the branch details including AI tone and keywords.',
  },
  {
    q: 'What do the analytics numbers mean?',
    a: 'QR Scans: how many times your QR code was scanned. Link Visits: visits via shared links. Reviews Copied: how many AI-generated reviews customers copied. CVR (Conversion Rate): the percentage of visitors who copied a review.',
  },
  {
    q: 'Can I customise the AI-generated reviews?',
    a: 'Yes! You can set the tone (e.g. Friendly, Professional, Luxury) and add keywords (e.g. "great food, fast service") that the AI weaves into review drafts.',
  },
  {
    q: 'Are the reviews fake?',
    a: 'No. ReviewReach generates drafts as a starting point. Customers are encouraged to edit and personalise the text before posting. The final review is always written and posted by the customer themselves.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Settings → Delete Account. This permanently removes your authentication record and all stored branch data from our servers.',
  },
  {
    q: 'Can customers see my personal information?',
    a: 'No. The QR code and review page only contain your branch configuration (business name, tone, keywords). Your email and personal details are never shared with customers.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={s.faqCard} onPress={() => setOpen(!open)} activeOpacity={0.7}>
      <View style={s.faqRow}>
        <Text style={s.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#94A3B8" />
      </View>
      {open && <Text style={s.faqA}>{a}</Text>}
    </TouchableOpacity>
  );
}

export function FAQScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>FAQ</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        {FAQS.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} />
        ))}
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
  content: { padding: 16, gap: 10 },
  faqCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQ: { fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1 },
  faqA: { fontSize: 13, color: '#64748B', lineHeight: 20, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
});
