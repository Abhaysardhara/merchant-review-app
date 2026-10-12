import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
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

  const handleShareLink = async () => {
    // Strip QrOrigin param so shared links don't inflate scan counts
    const shareUrl = qrUrl.replace(/[&?]QrOrigin=true/g, '');
    const name = label || 'Business';
    const message = `Leave a Google review for ${name}!\n\nOpen this link on your phone and it generates a review for you — just copy and post:\n${shareUrl}`;
    try {
      await Share.share({ message, title: `Review ${name}` });
    } catch {
      Alert.alert('Share failed', 'Could not share the link.');
    }
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

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="qr-code-outline" size={16} color="#4F46E5" />
          <Text style={styles.shareBtnText}>Share QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShareLink} activeOpacity={0.8}>
          <Ionicons name="link-outline" size={16} color="#4F46E5" />
          <Text style={styles.shareBtnText}>Share Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  qrWrapper: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
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
    color: '#94A3B8',
    flex: 1,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    maxWidth: 280,
  },
  instructionText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  shareBtnText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '700',
  },
});
