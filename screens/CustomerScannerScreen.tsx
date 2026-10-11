import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CustomerStackParamList, QRPayload } from '../types';
import { logScan } from '../services/analytics';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerScanner'>;

function isValidQRPayload(data: unknown): data is QRPayload {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.branchId === 'string' &&
    typeof d.placeId === 'string' &&
    typeof d.branchName === 'string' &&
    typeof d.businessName === 'string' &&
    typeof d.v === 'number'
  );
}

export function CustomerScannerScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // Animate the scan line
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    animRef.current = loop;
    loop.start();
    return () => loop.stop();
  }, [scanLineAnim]);

  // Reset scanned state when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setScanned(false);
      setScanError(null);
    });
    return unsubscribe;
  }, [navigation]);

  const handleBarCodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);
      setScanError(null);

      try {
        const parsed: unknown = JSON.parse(data);
        if (!isValidQRPayload(parsed)) {
          setScanError('This QR code is not a ReviewReach code. Please scan a valid branch QR.');
          Vibration.vibrate(200);
          setTimeout(() => setScanned(false), 2500);
          return;
        }

        Vibration.vibrate([0, 60, 40, 80]);

        // Log anonymous scan event
        await logScan(parsed.branchId);

        navigation.navigate('FeedbackGate', { payload: parsed });
      } catch {
        setScanError('Could not read this QR code. Please try again.');
        Vibration.vibrate(200);
        setTimeout(() => setScanned(false), 2000);
      }
    },
    [scanned, navigation],
  );

  // ── Permission: not yet requested ──
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={60} color="#E5E7EB" />
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSubtitle}>Checking camera permission…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Permission: denied ──
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <View style={styles.permIconBg}>
            <Ionicons name="camera-outline" size={40} color="#EF4444" />
          </View>
          <Text style={styles.permTitle}>Camera Permission Denied</Text>
          <Text style={styles.permSubtitle}>
            ReviewReach needs camera access to scan branch QR codes.{'\n'}
            Please enable it in your device settings.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.8}>
            <Ionicons name="camera" size={18} color="#FFF" />
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permSecondaryBtn}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.7}
          >
            <Text style={styles.permSecondaryBtnText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Dark overlay with cut-out */}
      <View style={styles.overlay}>
        {/* Top */}
        <View style={styles.overlayTop}>
          <SafeAreaView>
            <View style={styles.topBar}>
              <View style={styles.topBarLogo}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.topBarTitle}>ReviewReach</Text>
              </View>
              <Text style={styles.topBarHint}>Scan a branch QR code</Text>
            </View>
          </SafeAreaView>
        </View>

        {/* Scan frame row */}
        <View style={styles.scanRow}>
          <View style={styles.overlaySide} />
          <View style={styles.scanFrame}>
            {/* Corner marks */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {/* Animated scan line */}
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}
            />
          </View>
          <View style={styles.overlaySide} />
        </View>

        {/* Bottom */}
        <View style={styles.overlayBottom}>
          {scanError ? (
            <View style={styles.errorPill}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{scanError}</Text>
            </View>
          ) : scanned ? (
            <View style={styles.scanningPill}>
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              <Text style={styles.scanningText}>QR code recognised…</Text>
            </View>
          ) : (
            <Text style={styles.hintText}>
              Position the QR code inside the frame
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const FRAME_SIZE = 240;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  cameraContainer: { flex: 1 },

  // Permission screen
  permIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  permTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  permSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  permBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  permSecondaryBtn: { paddingVertical: 10 },
  permSecondaryBtnText: { color: '#4F46E5', fontSize: 14, fontWeight: '600' },

  // Camera overlay
  overlay: { flex: 1, flexDirection: 'column' },
  overlayTop: { backgroundColor: 'rgba(0,0,0,0.55)', paddingBottom: 16 },
  topBar: { alignItems: 'center', gap: 4, paddingHorizontal: 24, paddingTop: 8 },
  topBarLogo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topBarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  topBarHint: { color: '#D1D5DB', fontSize: 13 },
  scanRow: { flexDirection: 'row', height: FRAME_SIZE + 20 },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    marginVertical: 10,
    overflow: 'hidden',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 24,
    gap: 12,
  },
  hintText: { color: '#D1D5DB', fontSize: 14, fontWeight: '500' },

  // Corners
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#4F46E5',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },

  // Scan line
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#4F46E5',
    borderRadius: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  // Status pills
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: 300,
  },
  errorText: { color: '#FCA5A5', fontSize: 13, fontWeight: '500', flexShrink: 1 },
  scanningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scanningText: { color: '#86EFAC', fontSize: 13, fontWeight: '500' },
});
