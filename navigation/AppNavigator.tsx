import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';

import { SignInScreen }            from '../screens/SignInScreen';
import { MerchantDashboardScreen } from '../screens/MerchantDashboardScreen';
import { BranchDetailScreen }      from '../screens/BranchDetailScreen';
import { StoreSelectorScreen }     from '../screens/StoreSelectorScreen';

const MerchantStack = createNativeStackNavigator<MerchantStackParamList>();

export function AppNavigator() {
  const { currentUser, isLoading } = useMerchant();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <MerchantStack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser ? (
          <>
            <MerchantStack.Screen name="MerchantDashboard" component={MerchantDashboardScreen} />
            <MerchantStack.Screen name="BranchDetail"      component={BranchDetailScreen} />
            <MerchantStack.Screen name="StoreSelector"     component={StoreSelectorScreen} />
          </>
        ) : (
          <MerchantStack.Screen name="SignIn" component={SignInScreen} />
        )}
      </MerchantStack.Navigator>
    </NavigationContainer>
  );
}
