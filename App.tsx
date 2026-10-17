import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MerchantProvider } from './store/MerchantContext';
import { I18nProvider } from './i18n';
import { AppNavigator } from './navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <I18nProvider>
        <MerchantProvider>
          <AppNavigator />
        </MerchantProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
