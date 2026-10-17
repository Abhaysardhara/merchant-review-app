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
import { FeedbackInboxScreen }     from '../screens/FeedbackInboxScreen';
import { SettingsScreen }          from '../screens/SettingsScreen';
import { PrivacyPolicyScreen }     from '../screens/PrivacyPolicyScreen';
import { TermsOfServiceScreen }    from '../screens/TermsOfServiceScreen';
import { ContactUsScreen }         from '../screens/ContactUsScreen';
import { FAQScreen }               from '../screens/FAQScreen';
import { AboutScreen }             from '../screens/AboutScreen';
import { DeleteAccountScreen }     from '../screens/DeleteAccountScreen';
import { ReviewsScreen }           from '../screens/ReviewsScreen';
import { ReviewReplyScreen }       from '../screens/ReviewReplyScreen';
import { LanguageScreen }          from '../screens/LanguageScreen';

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
            <MerchantStack.Screen name="FeedbackInbox"     component={FeedbackInboxScreen} />
            <MerchantStack.Screen name="Settings"          component={SettingsScreen} />
            <MerchantStack.Screen name="PrivacyPolicy"     component={PrivacyPolicyScreen} />
            <MerchantStack.Screen name="TermsOfService"    component={TermsOfServiceScreen} />
            <MerchantStack.Screen name="ContactUs"         component={ContactUsScreen} />
            <MerchantStack.Screen name="FAQ"               component={FAQScreen} />
            <MerchantStack.Screen name="About"             component={AboutScreen} />
            <MerchantStack.Screen name="DeleteAccount"     component={DeleteAccountScreen} />
            <MerchantStack.Screen name="Reviews"           component={ReviewsScreen} />
            <MerchantStack.Screen name="ReviewReply"       component={ReviewReplyScreen} />
            <MerchantStack.Screen name="Language"          component={LanguageScreen} />
          </>
        ) : (
          <MerchantStack.Screen name="SignIn" component={SignInScreen} />
        )}
      </MerchantStack.Navigator>
    </NavigationContainer>
  );
}
