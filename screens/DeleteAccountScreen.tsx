import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';

type Props = NativeStackScreenProps<MerchantStackParamList, 'DeleteAccount'>;

export function DeleteAccountScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { deleteAccount } = useMerchant();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all branch data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
            } catch {
              setDeleting(false);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Delete Account</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={s.iconWrap}>
          <Ionicons name="warning" size={40} color="#EF4444" />
        </View>

        <Text style={s.title}>Are you sure?</Text>
        <Text style={s.subtitle}>
          Deleting your account is permanent and cannot be reversed.
        </Text>

        <View style={s.card}>
          <Text style={s.cardTitle}>What will be deleted:</Text>
          <View style={s.bulletRow}>
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={s.bulletText}>Your account and sign-in credentials</Text>
          </View>
          <View style={s.bulletRow}>
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={s.bulletText}>All branch profiles and configurations</Text>
          </View>
          <View style={s.bulletRow}>
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={s.bulletText}>All analytics data (scans, links, reviews)</Text>
          </View>
          <View style={s.bulletRow}>
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={s.bulletText}>All QR codes will stop working</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.deleteBtn, deleting && { opacity: 0.5 }]}
          onPress={handleDelete}
          disabled={deleting}
          activeOpacity={0.8}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="trash" size={18} color="#fff" />
              <Text style={s.deleteBtnText}>Delete My Account</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={s.cancelBtnText}>Cancel, keep my account</Text>
        </TouchableOpacity>
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
  content: { padding: 20, alignItems: 'center' },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: '#FECACA', width: '100%', gap: 12, marginBottom: 28,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletText: { fontSize: 13, color: '#64748B', flex: 1 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EF4444', borderRadius: 14, width: '100%',
    paddingVertical: 16,
  },
  deleteBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 16 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
});
