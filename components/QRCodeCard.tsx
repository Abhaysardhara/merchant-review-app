import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useExtraText } from '../i18n/extra';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** A4 counter poster: shop name, big QR, one line of instructions. */
function posterHtml(opts: { qrBase64: string; shop: string; scan: string; scanEn: string; time: string }): string {
  const showEnglish = opts.scan !== opts.scanEn;
  return `<!doctype html><html><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  body { margin: 0; font-family: -apple-system, Roboto, "Noto Sans", "Noto Sans Devanagari", "Noto Sans Gujarati", sans-serif; color: #1B1A17; background: #FBF7F0; }
  .page { box-sizing: border-box; width: 210mm; height: 297mm; padding: 22mm 18mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .shop { font-size: 34pt; font-weight: 800; line-height: 1.15; margin: 0; }
  .stars { font-size: 30pt; color: #C98A00; letter-spacing: 6pt; margin: 8mm 0 4mm; }
  .scan { font-size: 26pt; font-weight: 700; line-height: 1.3; margin: 0; }
  .scan-en { font-size: 16pt; color: #5E584E; margin: 2mm 0 0; }
  .qr { margin: 10mm 0 6mm; padding: 6mm; background: #FFF; border: 3mm solid #1B1A17; border-radius: 8mm; }
  .qr img { width: 115mm; height: 115mm; image-rendering: pixelated; display: block; }
  .time { font-size: 20pt; font-weight: 700; color: #1F6E50; margin: 0; }
  .foot { margin-top: auto; font-size: 11pt; color: #6E675B; }
</style></head><body><div class="page">
  <h1 class="shop">${escapeHtml(opts.shop)}</h1>
  <div class="stars">☆☆☆☆☆</div>
  <p class="scan">${escapeHtml(opts.scan)}</p>
  ${showEnglish ? `<p class="scan-en">${escapeHtml(opts.scanEn)}</p>` : ''}
  <div class="qr"><img src="data:image/png;base64,${opts.qrBase64}" alt="QR code" /></div>
  <p class="time">${escapeHtml(opts.time)}</p>
  <div class="foot">ReviewReach</div>
</div></body></html>`;
}

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
  const { t: tx } = useExtraText();

  const handlePoster = () => {
    if (!qrRef.current) {
      Alert.alert('Not ready', 'QR code is still rendering, please try again.');
      return;
    }
    qrRef.current.toDataURL(async (base64: string) => {
      try {
        const html = posterHtml({
          qrBase64: base64,
          shop: label || '',
          scan: tx('poster_scan'),
          scanEn: 'Scan to review us on Google',
          time: tx('poster_time'),
        });
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: tx('poster_btn'),
          UTI: 'com.adobe.pdf',
        });
      } catch {
        Alert.alert('', tx('cs_error'));
      }
    });
  };

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
    const message = `${tx('wa_message').replace('{{shop}}', name)}\n${shareUrl}`;
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
          Customer scans → taps a star → posts their own review on Google
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

      {/* Printable A4 poster for the counter */}
      <TouchableOpacity style={styles.btnPoster} onPress={handlePoster} activeOpacity={0.8} accessibilityRole="button">
        <Ionicons name="print-outline" size={20} color="#1B1A17" />
        <Text style={styles.btnPosterText}>{tx('poster_btn')}</Text>
      </TouchableOpacity>
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
  btnPoster: {
    alignSelf: 'stretch',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#FDE68A',
    borderWidth: 1.5,
    borderColor: '#F2A900',
  },
  btnPosterText: {
    color: '#1B1A17',
    fontSize: 16,
    fontWeight: '800',
  },
});
