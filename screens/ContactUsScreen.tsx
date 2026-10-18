import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';

type Props = NativeStackScreenProps<MerchantStackParamList, 'ContactUs'>;

function ContactCard({ icon, iconColor, iconBg, title, subtitle, onPress }: {
  icon: string; iconColor: string; iconBg: string; title: string; subtitle: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.cardIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as never} size={22} color={iconColor} />
      </View>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.cardSub}>{subtitle}</Text>
      <View style={s.cardArrow}>
        <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

export function ContactUsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Contact Us</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={s.intro}>
          Have a question, feedback, or need help? We'd love to hear from you.
        </Text>

        <ContactCard
          icon="mail-outline" iconColor="#4F46E5" iconBg="#EEF2FF"
          title="Email Support"
          subtitle="support@reviewreach.app"
          onPress={() => Linking.openURL('mailto:support@reviewreach.app')}
        />

        <View style={s.note}>
          <Ionicons name="time-outline" size={16} color="#94A3B8" />
          <Text style={s.noteText}>
            We typically respond within 24 hours during business days.
          </Text>
        </View>
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
  content: { padding: 20, gap: 14 },
  intro: { fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 6 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', gap: 8,
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardSub: { fontSize: 13, color: '#64748B' },
  cardArrow: {
    marginTop: 4, width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  note: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, marginTop: 6,
  },
  noteText: { fontSize: 13, color: '#94A3B8', flex: 1, lineHeight: 19 },
});
