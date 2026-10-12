/**
 * AnalyticsCharts.tsx
 *
 * Reusable chart components for branch and overall analytics.
 * Uses react-native-chart-kit with react-native-svg.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import type { Branch } from '../types';
import { fetchDailyStats, type DailyStat } from '../services/firebase';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W   = SCREEN_W - 64; // card padding × 2 + outer padding × 2

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

/** Fill gaps so we always show exactly `days` data points */
function fillDays(stats: DailyStat[], days: number): DailyStat[] {
  const result: DailyStat[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = stats.find((s) => s.date === key);
    result.push(found ?? { date: key, scans: 0, linkVisits: 0, copied: 0 });
  }
  return result;
}

/** Short label: "Oct 12" → "12" or day-of-week abbr */
function shortLabel(iso: string, totalPoints: number): string {
  const d = new Date(iso + 'T00:00:00');
  if (totalPoints <= 7) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  return String(d.getDate());
}

/** Sparse labels — only show every Nth label to avoid crowding */
function sparseLabels(dates: string[]): string[] {
  const n = dates.length;
  const step = n <= 7 ? 1 : n <= 14 ? 2 : 5;
  return dates.map((d, i) => (i % step === 0 ? shortLabel(d, n) : ''));
}

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo:   '#ffffff',
  decimalPlaces: 0,
  color:      (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
  labelColor: () => '#94A3B8',
  strokeWidth: 2,
  propsForDots: { r: '3', strokeWidth: '1.5', stroke: '#4F46E5' },
  propsForBackgroundLines: { stroke: '#F1F5F9', strokeDasharray: '' },
};

// ─────────────────────────────────────────────
//  Branch timeseries line chart
// ─────────────────────────────────────────────

interface BranchLineChartProps {
  placeId: string;
  days?: 7 | 14 | 30;
}

export function BranchLineChart({ placeId, days = 14 }: BranchLineChartProps) {
  const [stats, setStats]     = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyStats(placeId, days).then((data) => {
      setStats(fillDays(data, days));
      setLoading(false);
    });
  }, [placeId, days]);

  if (loading) return <ChartSkeleton />;

  const hasData = stats.some((s) => s.scans > 0 || s.copied > 0);

  return (
    <View>
      <View style={styles.legend}>
        <LegendDot color="#4F46E5" label="QR Scans" />
        <LegendDot color="#8B5CF6" label="Link Visits" />
        <LegendDot color="#F59E0B" label="Copied" />
      </View>
      {hasData ? (
        <LineChart
          data={{
            labels: sparseLabels(stats.map((s) => s.date)),
            datasets: [
              { data: stats.map((s) => s.scans),      color: () => '#4F46E5', strokeWidth: 2 },
              { data: stats.map((s) => s.linkVisits), color: () => '#8B5CF6', strokeWidth: 2 },
              { data: stats.map((s) => s.copied),     color: () => '#F59E0B', strokeWidth: 2 },
            ],
          }}
          width={CHART_W}
          height={180}
          chartConfig={chartConfig}
          bezier
          withShadow={false}
          style={styles.chart}
          withInnerLines
          withOuterLines={false}
        />
      ) : (
        <EmptyChart message="No data yet — scans will appear here" />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
//  Overall line chart (aggregates all branches)
// ─────────────────────────────────────────────

interface OverallLineChartProps {
  branches: Branch[];
  days?: 7 | 14 | 30;
}

export function OverallLineChart({ branches, days = 7 }: OverallLineChartProps) {
  const [stats, setStats]     = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branches.length) { setLoading(false); return; }
    Promise.all(branches.map((b) => fetchDailyStats(b.placeId, days))).then((all) => {
      const map: Record<string, DailyStat> = {};
      all.flat().forEach((s) => {
        if (!map[s.date]) map[s.date] = { date: s.date, scans: 0, linkVisits: 0, copied: 0 };
        map[s.date].scans      += s.scans;
        map[s.date].linkVisits += s.linkVisits;
        map[s.date].copied     += s.copied;
      });
      const merged = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
      setStats(fillDays(merged, days));
      setLoading(false);
    });
  }, [branches, days]);

  if (loading) return <ChartSkeleton />;

  const hasData = stats.some((s) => s.scans > 0 || s.linkVisits > 0 || s.copied > 0);

  return (
    <View>
      <View style={styles.legend}>
        <LegendDot color="#4F46E5" label="QR Scans" />
        <LegendDot color="#8B5CF6" label="Link Visits" />
        <LegendDot color="#F59E0B" label="Copied" />
      </View>
      {hasData ? (
        <LineChart
          data={{
            labels: sparseLabels(stats.map((s) => s.date)),
            datasets: [
              { data: stats.map((s) => s.scans),      color: () => '#4F46E5', strokeWidth: 2 },
              { data: stats.map((s) => s.linkVisits), color: () => '#8B5CF6', strokeWidth: 2 },
              { data: stats.map((s) => s.copied),     color: () => '#F59E0B', strokeWidth: 2 },
            ],
          }}
          width={CHART_W}
          height={180}
          chartConfig={chartConfig}
          bezier
          withShadow={false}
          style={styles.chart}
          withInnerLines
          withOuterLines={false}
        />
      ) : (
        <EmptyChart message="No data yet — ask customers to scan QR codes or share the link" />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
//  Branch comparison bar chart (scans per branch)
// ─────────────────────────────────────────────

interface BranchBarChartProps {
  branches: Branch[];
}

export function BranchBarChart({ branches }: BranchBarChartProps) {
  if (!branches.length) return null;

  const hasData = branches.some((b) => b.analytics.totalScans > 0);
  if (!hasData) return <EmptyChart message="No scan data yet across branches" />;

  // Truncate long branch names
  const labels = branches.map((b) => b.name.length > 8 ? b.name.slice(0, 7) + '…' : b.name);
  const data   = branches.map((b) => b.analytics.totalScans);

  return (
    <BarChart
      data={{ labels, datasets: [{ data }] }}
      width={CHART_W}
      height={180}
      yAxisLabel=""
      yAxisSuffix=""
      chartConfig={{
        ...chartConfig,
        color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
        barPercentage: 0.6,
      }}
      style={styles.chart}
      withInnerLines
      showValuesOnTopOfBars
      fromZero
    />
  );
}

// ─────────────────────────────────────────────
//  Small helpers
// ─────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function ChartSkeleton() {
  return (
    <View style={styles.skeleton}>
      <ActivityIndicator size="small" color="#4F46E5" />
      <Text style={styles.skeletonText}>Loading chart…</Text>
    </View>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  chart: { borderRadius: 10, marginLeft: -16 },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  skeleton: { height: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  skeletonText: { fontSize: 12, color: '#94A3B8' },
  empty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20 },
});
