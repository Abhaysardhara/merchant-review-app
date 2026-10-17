import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
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

export function QRCodeCard({ qrUrl, label, address, size = 220 }: QRCodeCardProps) {
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
    const shareUrl = qrUrl.replace('QrOrigin=true', 'LinkOrigin=true');
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
      {/* QR frame */}
      <View style={styles.qrFrame}>
        <View style={styles.qrInner}>
          <QRCode
            value={qrUrl}
            size={size}
            color="#1E1B4B"
            backgroundColor="#FFFFFF"
            quietZone={12}
            getRef={(ref) => { qrRef.current = ref as any; }}
          />
        </View>
        {/* Corner accents */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      {/* Business label */}
      {label && (
        <View style={styles.labelRow}>
          <View style={styles.labelIconWrap}>
            <Ionicons name="storefront" size={14} color="#4F46E5" />
          </View>
          <Text style={styles.labelText} numberOfLines={1}>{label}</Text>
        </View>
      )}

      {address ? (
        <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
      ) : null}

      {/* Instruction */}
      <View style={styles.instructionBox}>
        <Ionicons name="phone-portrait-outline" size={16} color="#4F46E5" />
        <Text style={styles.instructionText}>
          Customer scans → review page opens → one tap copies & opens Google Maps
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="qr-code-outline" size={17} color="#fff" />
          <Text style={styles.btnPrimaryText}>Share QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnOutline} onPress={handleShareLink} activeOpacity={0.8}>
          <Ionicons name="link-outline" size={17} color="#4F46E5" />
          <Text style={styles.btnOutlineText}>Share Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CORNER_SIZE = 18;
const CORNER_THICKNESS = 3;
const CORNER_RADIUS = 6;
const ACCENT = '#4F46E5';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    gap: 14,
  },

  // ── QR frame ──
  qrFrame: {
    position: 'relative',
    padding: 16,
    backgroundColor: '#FAFBFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8F8',
  },
  qrInner: {
    borderRadius: 6,
    overflow: 'hidden',
  },

  // Corner accent lines
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: ACCENT,
  },
  cornerTL: {
    top: -1, left: -1,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: CORNER_RADIUS,
  },
  cornerTR: {
    top: -1, right: -1,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: CORNER_RADIUS,
  },
  cornerBL: {
    bottom: -1, left: -1,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  cornerBR: {
    bottom: -1, right: -1,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: CORNER_RADIUS,
  },

  // ── Label ──
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 260,
    marginTop: -4,
  },

  // ── Instruction ──
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 11,
    alignSelf: 'stretch',
  },
  instructionText: {
    fontSize: 11.5,
    color: '#4338CA',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },

  // ── Buttons ──
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  btnOutlineText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },
});
