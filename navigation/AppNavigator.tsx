import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';

// ── Screens ──────────────────────────────────
import { PasscodeScreen } from '../screens/PasscodeScreen';
import { MerchantDashboardScreen } from '../screens/MerchantDashboardScreen';
import { BranchDetailScreen } from '../screens/BranchDetailScreen';
import { StoreSelectorScreen } from '../screens/StoreSelectorScreen';

// ─────────────────────────────────────────────
//  Stack navigator
// ─────────────────────────────────────────────

const MerchantStack = createNativeStackNavigator<MerchantStackParamList>();

export function AppNavigator() {
  const { isMerchantAuthenticated } = useMerchant();

  return (
    <NavigationContainer>
      <MerchantStack.Navigator screenOptions={{ headerShown: false }}>
        {isMerchantAuthenticated ? (
          <>
            <MerchantStack.Screen name="MerchantDashboard" component={MerchantDashboardScreen} />
            <MerchantStack.Screen name="BranchDetail" component={BranchDetailScreen} />
            <MerchantStack.Screen name="StoreSelector" component={StoreSelectorScreen} />
          </>
        ) : (
          <MerchantStack.Screen name="Passcode" component={PasscodeScreen} />
        )}
      </MerchantStack.Navigator>
    </NavigationContainer>
  );
}
