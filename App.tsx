import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MerchantProvider } from './store/MerchantContext';
import { AppNavigator } from './navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <MerchantProvider>
        <AppNavigator />
      </MerchantProvider>
    </SafeAreaProvider>
  );
}
