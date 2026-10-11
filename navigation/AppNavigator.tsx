import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type {
  TabParamList,
  CustomerStackParamList,
  MerchantStackParamList,
} from '../types';

import { useMerchant } from '../store/MerchantContext';

// ── Screens ──────────────────────────────────
import { CustomerScannerScreen } from '../screens/CustomerScannerScreen';
import { FeedbackGateScreen } from '../screens/FeedbackGateScreen';
import { ReviewEditorScreen } from '../screens/ReviewEditorScreen';
import { PrivateFeedbackScreen } from '../screens/PrivateFeedbackScreen';
import { PasscodeScreen } from '../screens/PasscodeScreen';
import { MerchantDashboardScreen } from '../screens/MerchantDashboardScreen';
import { BranchDetailScreen } from '../screens/BranchDetailScreen';
import { StoreSelectorScreen } from '../screens/StoreSelectorScreen';

// ─────────────────────────────────────────────
//  Stack navigators
// ─────────────────────────────────────────────

const CustomerStack = createNativeStackNavigator<CustomerStackParamList>();
const MerchantStack = createNativeStackNavigator<MerchantStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function CustomerStackNavigator() {
  return (
    <CustomerStack.Navigator screenOptions={{ headerShown: false }}>
      <CustomerStack.Screen name="CustomerScanner" component={CustomerScannerScreen} />
      <CustomerStack.Screen name="FeedbackGate" component={FeedbackGateScreen} />
      <CustomerStack.Screen name="ReviewEditor" component={ReviewEditorScreen} />
      <CustomerStack.Screen name="PrivateFeedback" component={PrivateFeedbackScreen} />
    </CustomerStack.Navigator>
  );
}

function MerchantStackNavigator() {
  const { isMerchantAuthenticated } = useMerchant();

  return (
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
  );
}

// ─────────────────────────────────────────────
//  Custom tab bar icon helper
// ─────────────────────────────────────────────

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  outlineName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  size: number;
  badge?: number;
}

function TabIcon({ name, outlineName, focused, color, size, badge }: TabIconProps) {
  return (
    <View>
      <Ionicons name={focused ? name : outlineName} size={size} color={color} />
      {badge !== undefined && badge > 0 && (
        <View style={tabStyles.badge}>
          <Text style={tabStyles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
});

// ─────────────────────────────────────────────
//  Root Tab Navigator
// ─────────────────────────────────────────────

export function AppNavigator() {
  const { branches } = useMerchant();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#4F46E5',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
            backgroundColor: '#FFFFFF',
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="ScannerStack"
          component={CustomerStackNavigator}
          options={{
            tabBarLabel: 'Scan & Review',
            tabBarIcon: ({ focused, color, size }) => (
              <TabIcon
                name="qr-code"
                outlineName="qr-code-outline"
                focused={focused}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tab.Screen
          name="DashboardStack"
          component={MerchantStackNavigator}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ focused, color, size }) => (
              <TabIcon
                name="grid"
                outlineName="grid-outline"
                focused={focused}
                color={color}
                size={size}
                badge={branches.length}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
