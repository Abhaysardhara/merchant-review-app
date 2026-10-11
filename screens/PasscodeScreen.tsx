import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MerchantStackParamList } from '../types';
import { useMerchant } from '../store/MerchantContext';

type Props = NativeStackScreenProps<MerchantStackParamList, 'Passcode'>;

const PAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export function PasscodeScreen({ navigation }: Props) {
  const { authenticate } = useMerchant();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    setError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => {
      setPin('');
      setError(false);
    });
  };

  const handleKey = async (key: string) => {
    if (key === 'del') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '') return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === 4) {
      const ok = await authenticate(newPin);
      if (ok) {
        navigation.replace('MerchantDashboard');
      } else {
        shake();
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.iconBg}>
          <Ionicons name="shield-checkmark" size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Merchant Dashboard</Text>
        <Text style={styles.subtitle}>Enter your 4-digit PIN to continue</Text>
        <Text style={styles.hint}>Default PIN: 1234</Text>
      </View>

      <Animated.View
        style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </Animated.View>

      {error && <Text style={styles.errorText}>Incorrect PIN. Please try again.</Text>}

      <View style={styles.pad}>
        {PAD_KEYS.map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map((key, ki) => {
              if (key === '') {
                return <View key={ki} style={styles.padKeyEmpty} />;
              }
              return (
                <TouchableOpacity
                  key={ki}
                  style={[styles.padKey, key === 'del' && styles.padKeyDel]}
                  onPress={() => handleKey(key)}
                  activeOpacity={0.7}
                >
                  {key === 'del' ? (
                    <Ionicons name="backspace-outline" size={24} color="#4F46E5" />
                  ) : (
                    <Text style={styles.padKeyText}>{key}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => Alert.alert('Reset PIN', 'To reset your PIN, please contact support or reinstall the app.')}
        style={styles.forgotBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.forgotText}>Forgot PIN?</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1B4B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#A5B4FC',
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#6366F1',
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6366F1',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#A5B4FC',
    borderColor: '#A5B4FC',
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '500',
    marginTop: -16,
  },
  pad: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
  },
  padRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  padKey: {
    flex: 1,
    height: 64,
    backgroundColor: '#312E81',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  padKeyDel: {
    backgroundColor: '#1E1B4B',
    borderColor: '#4338CA',
  },
  padKeyEmpty: {
    flex: 1,
    height: 64,
  },
  padKeyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E0E7FF',
  },
  forgotBtn: {
    paddingVertical: 8,
  },
  forgotText: {
    color: '#818CF8',
    fontSize: 14,
    fontWeight: '500',
  },
});
