import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface QRCodeCardProps {
  /** The URL encoded in the QR code */
  qrUrl: string;
  /** Business / branch name shown below the QR */
  label?: string;
  /** Formatted address shown in the meta row */
  address?: string;
  size?: number;
}

export function QRCodeCard({ qrUrl, label, address, size = 200 }: QRCodeCardProps) {
  const qrRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);

  const handleShare = async () => {
    if (!qrRef.current) {
      Alert.alert('Not ready', 'QR code is still rendering, please try again.');
      return;
    }
    qrRef.current.toDataURL(async (base64: string) => {
      try {
        const fileName = label
          ? `qr-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
          : 'qr-review.png';
        const fileUri = FileSystem.cacheDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          Alert.alert('Sharing unavailable', 'Your device does not support file sharing.');
          return;
        }
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: label ? `Share QR — ${label}` : 'Share QR Code',
          UTI: 'public.png',
        });
      } catch {
        Alert.alert('Share failed', 'Could not share the QR code image.');
      }
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.qrWrapper}>
        <QRCode
          value={qrUrl}
          size={size}
          color="#1E1B4B"
          backgroundColor="#FFFFFF"
          quietZone={10}
          getRef={(ref) => { qrRef.current = ref as any; }}
        />
      </View>

      {label && (
        <View style={styles.labelRow}>
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text style={styles.labelText} numberOfLines={1}>{label}</Text>
        </View>
      )}

      {address ? (
        <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
      ) : null}

      <View style={styles.urlRow}>
        <Ionicons name="globe-outline" size={11} color="#9CA3AF" />
        <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="middle">{qrUrl}</Text>
      </View>

      <View style={styles.instructionBox}>
        <Ionicons name="information-circle-outline" size={14} color="#4F46E5" />
        <Text style={styles.instructionText}>
          Customer scans with phone camera → review page opens in Chrome → one tap copies & opens Google Maps
        </Text>
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
        <Ionicons name="share-outline" size={16} color="#4F46E5" />
        <Text style={styles.shareBtnText}>Share QR Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  addressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 260,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 260,
  },
  urlText: {
    fontSize: 10,
    color: '#9CA3AF',
    flex: 1,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 10,
    maxWidth: 280,
  },
  instructionText: {
    fontSize: 11,
    color: '#4338CA',
    lineHeight: 16,
    flex: 1,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  shareBtnText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
});
