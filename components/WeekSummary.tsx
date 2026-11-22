/**
 * WeekSummary.tsx — the last 7 days in plain words, for the shop screen.
 *
 *   👀 42 people opened your review page
 *   ⭐ 18 went to Google to post a review
 *   😋 Customers liked:   Tasty food (12) · Quick service (9)
 *   😟 Customers unhappy: Long wait (4)
 *   Stars customers gave: 5★ ███ 10 …
 *
 * Counts come from the review page's daily stats (written by the server).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Branch, ReviewButton } from '../types';
import { loadRecentStats } from '../services/firebase';
import { useMerchant } from '../store/MerchantContext';
import { useExtraText } from '../i18n/extra';

export function WeekSummary({ branch }: { branch: Branch }) {
  const { currentUser } = useMerchant();
  const { t, buttonLang } = useExtraText();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  const load = useCallback(() => {
    if (!currentUser) return;
    loadRecentStats(currentUser.uid, branch.id, 7)
      .then(setCounts)
      .catch(() => setCounts({}));
  }, [currentUser, branch.id]);

  useEffect(load, [load]);
  useFocusEffect(load);

  if (!counts) {
    return (
      <View style={s.card}>
        <ActivityIndicator color="#B45309" />
      </View>
    );
  }

  const c = (k: string) => counts[k] ?? 0;
  const people = c('scan_landed_qr') + c('scan_landed_link') + c('scan_landed_direct');
  const google = c('google_tap');

  const top = (kind: ReviewButton['kind']) =>
    branch.buttons
      .filter((b) => b.kind === kind)
      .map((b) => ({ b, n: c(`btn_${b.id}`) }))
      .filter((x) => x.n > 0)
      .sort((a, z) => z.n - a.n)
      .slice(0, 4)
      .map((x) => `${x.b.emoji} ${x.b.labels[buttonLang] || x.b.labels.en} (${x.n})`)
      .join('  ·  ');

  const liked = [top('good'), top('bought')].filter(Boolean).join('  ·  ');
  const unhappy = top('improve');

  const stars = [5, 4, 3, 2, 1].map((n) => ({ n, v: c(`star_tapped_${n}`) }));
  const maxStar = Math.max(1, ...stars.map((x) => x.v));
  const anyStars = stars.some((x) => x.v > 0);

  return (
    <View style={s.card}>
      <Text style={s.title}>{t('ws_title')}</Text>

      {people === 0 ? (
        <Text style={s.none}>{t('ws_none')}</Text>
      ) : (
        <>
          <Row emoji="👀" text={t('ws_people', { n: people })} />
          <Row emoji="⭐" text={t('ws_google', { n: google })} />

          <View style={s.block}>
            <Text style={s.blockTitle}>😋 {t('ws_liked')}</Text>
            <Text style={s.blockText}>{liked || t('ws_noPicks')}</Text>
          </View>
          <View style={[s.block, s.blockBad]}>
            <Text style={s.blockTitle}>😟 {t('ws_unhappy')}</Text>
            <Text style={s.blockText}>{unhappy || t('ws_noPicks')}</Text>
          </View>

          {anyStars && (
            <View style={s.block}>
              <Text style={s.blockTitle}>{t('ws_stars')}</Text>
              {stars.map(({ n, v }) => (
                <View key={n} style={s.starRow} accessible accessibilityLabel={`${n} star: ${v}`}>
                  <Text style={s.starLabel}>{n}★</Text>
                  <View style={s.barTrack}>
                    <View style={[s.bar, { width: `${(v / maxStar) * 100}%` }]} />
                  </View>
                  <Text style={s.starCount}>{v}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function Row({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowEmoji}>{emoji}</Text>
      <Text style={s.rowText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  none: { fontSize: 15, color: '#475569', lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowEmoji: { fontSize: 20, lineHeight: 24 },
  rowText: { flex: 1, fontSize: 16, color: '#1E293B', lineHeight: 24 },
  block: { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 12, gap: 6 },
  blockBad: { backgroundColor: '#FEF2F2' },
  blockTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  blockText: { fontSize: 15, color: '#334155', lineHeight: 22 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starLabel: { width: 32, fontSize: 14, fontWeight: '600', color: '#475569' },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5, backgroundColor: '#F2A900' },
  starCount: { width: 32, textAlign: 'right', fontSize: 14, color: '#475569' },
});
