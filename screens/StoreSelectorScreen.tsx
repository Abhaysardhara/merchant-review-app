import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { StoreSelector } from '../components/StoreSelector';
import type { SelectedStore } from '../components/StoreSelector';

type Props = NativeStackScreenProps<MerchantStackParamList, 'StoreSelector'>;

export function StoreSelectorScreen({ navigation }: Props) {
  const handleStoreSelect = (store: SelectedStore) => {
    // Navigate back to Dashboard, passing the selected store as a param
    // MerchantDashboardScreen listens for this and opens the add-branch modal pre-filled
    navigation.navigate('MerchantDashboard', { fromMapStore: store });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navBack} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Find Your Store</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Full-screen store selector */}
      <StoreSelector onStoreSelect={handleStoreSelect} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    zIndex: 20,
  },
  navBack: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
});
