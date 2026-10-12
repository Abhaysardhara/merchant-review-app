/**
 * AnalyticsCharts.tsx
 *
 * Chart components with selectable time range.
 * Short ranges (≤1d) use hourly granularity; longer ranges use daily data
 * aggregated to weekly/monthly as needed.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { Branch } from '../types';
import {
  fetchDailyStats,
  fetchHourlyStats,
  type DailyStat,
  type HourlyStat,
} from '../services/firebase';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W  = SCREEN_W - 64;

// ─────────────────────────────────────────────
//  Time range config
// ─────────────────────────────────────────────

export type TimeRangeValue =
  | '1h' | '4h' | '1d' | '3d' | '1w' | '2w'
  | '1m' | '3m' | '6m' | '1y' | 'custom';

const TIME_RANGES: { label: string; value: TimeRangeValue }[] = [
  { label: 'Last 1 hour',    value: '1h'     },
  { label: 'Last 4 hours',   value: '4h'     },
  { label: 'Last 1 day',     value: '1d'     },
  { label: 'Last 3 days',    value: '3d'     },
  { label: 'Last 1 week',    value: '1w'     },
  { label: 'Last 2 weeks',   value: '2w'     },
  { label: 'Last 1 month',   value: '1m'     },
  { label: 'Last 3 months',  value: '3m'     },
  { label: 'Last 6 months',  value: '6m'     },
  { label: 'Last 1 year',    value: '1y'     },
  { label: 'Custom range…',  value: 'custom' },
];

function labelFor(v: TimeRangeValue, from?: Date, to?: Date): string {
  if (v === 'custom' && from && to) {
    return `${fmtDate(from)} – ${fmtDate(to)}`;
  }
  return TIME_RANGES.find((r) => r.value === v)?.label ?? v;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────
//  Unified chart point type
// ─────────────────────────────────────────────

interface ChartPoint {
  label: string;
  scans: number;
  linkVisits: number;
  copied: number;
}

// ─────────────────────────────────────────────
//  Data builders
// ─────────────────────────────────────────────

function hourLabel(iso: string) {
  // iso = "2026-10-12T14"
  const h = parseInt(iso.slice(11, 13), 10);
  return `${h}:00`;
}

function buildHourlyPoints(raw: HourlyStat[], fromHour: string, toHour: string): ChartPoint[] {
  const map: Record<string, HourlyStat> = {};
  raw.forEach((s) => { map[s.hour] = s; });

  const points: ChartPoint[] = [];
  let cur = fromHour;
  while (cur <= toHour) {
    const s = map[cur];
    points.push({
      label:      hourLabel(cur),
      scans:      s?.scans      ?? 0,
      linkVisits: s?.linkVisits ?? 0,
      copied:     s?.copied     ?? 0,
    });
    // advance 1 hour
    const d = new Date(cur + ':00:00Z');
    d.setUTCHours(d.getUTCHours() + 1);
    cur = d.toISOString().slice(0, 13);
  }
  return points;
}

function buildDailyPoints(raw: DailyStat[], fromDate: string, toDate: string): ChartPoint[] {
  const map: Record<string, DailyStat> = {};
  raw.forEach((s) => { map[s.date] = s; });

  const points: ChartPoint[] = [];
  let cur = fromDate;
  while (cur <= toDate) {
    const s = map[cur];
    const d = new Date(cur + 'T00:00:00Z');
    points.push({
      label:      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      scans:      s?.scans      ?? 0,
      linkVisits: s?.linkVisits ?? 0,
      copied:     s?.copied     ?? 0,
    });
    d.setUTCDate(d.getUTCDate() + 1);
    cur = d.toISOString().slice(0, 10);
  }
  return points;
}

/** Aggregate daily points into weekly buckets */
function aggregateWeekly(daily: ChartPoint[]): ChartPoint[] {
  const weeks: ChartPoint[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const slice = daily.slice(i, i + 7);
    weeks.push({
      label:      slice[0].label,
      scans:      slice.reduce((s, p) => s + p.scans, 0),
      linkVisits: slice.reduce((s, p) => s + p.linkVisits, 0),
      copied:     slice.reduce((s, p) => s + p.copied, 0),
    });
  }
  return weeks;
}

/** Aggregate daily points into monthly buckets (by calendar month) */
function aggregateMonthly(daily: ChartPoint[], raw: DailyStat[]): ChartPoint[] {
  const map: Record<string, ChartPoint> = {};
  raw.forEach((s) => {
    const key = s.date.slice(0, 7); // YYYY-MM
    const label = new Date(s.date + 'T00:00:00Z')
      .toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    if (!map[key]) map[key] = { label, scans: 0, linkVisits: 0, copied: 0 };
    map[key].scans      += s.scans;
    map[key].linkVisits += s.linkVisits ?? 0;
    map[key].copied     += s.copied;
  });
  return Object.keys(map).sort().map((k) => map[k]);
}

/** Sparse labels to avoid crowding on X axis */
function sparseLabels(points: ChartPoint[], maxLabels = 7): string[] {
  const n = points.length;
  if (n <= maxLabels) return points.map((p) => p.label);
  const step = Math.ceil(n / maxLabels);
  return points.map((p, i) => (i % step === 0 ? p.label : ''));
}

// ─────────────────────────────────────────────
//  Data fetch + shape for a given time range
// ─────────────────────────────────────────────

async function fetchPoints(
  placeId: string,
  range: TimeRangeValue,
  customFrom?: Date,
  customTo?: Date,
): Promise<ChartPoint[]> {
  const now = new Date();

  // ── Hourly ranges — pass exact bounds to Firestore ──
  if (range === '1h' || range === '4h' || range === '1d') {
    const hours = range === '1h' ? 1 : range === '4h' ? 4 : 24;
    const toH   = now.toISOString().slice(0, 13);
    const fromD = new Date(now);
    fromD.setUTCHours(fromD.getUTCHours() - hours);
    const fromH = fromD.toISOString().slice(0, 13);
    const raw   = await fetchHourlyStats(placeId, fromH, toH); // server-filtered
    return buildHourlyPoints(raw, fromH, toH);
  }

  // ── Daily ranges — compute bounds, pass to Firestore ──
  const toDate   = (customTo ?? now).toISOString().slice(0, 10);
  const fromDate = (() => {
    if (range === 'custom' && customFrom) return customFrom.toISOString().slice(0, 10);
    const d = new Date(now);
    const daysMap: Record<string, number> = {
      '3d': 3, '1w': 7, '2w': 14, '1m': 30, '3m': 90, '6m': 180, '1y': 365,
    };
    d.setUTCDate(d.getUTCDate() - (daysMap[range] ?? 7));
    return d.toISOString().slice(0, 10);
  })();

  const raw    = await fetchDailyStats(placeId, fromDate, toDate); // server-filtered
  const points = buildDailyPoints(raw, fromDate, toDate);

  // Aggregate for long ranges to keep chart readable
  if (points.length > 60) return aggregateMonthly(points, raw);
  if (points.length > 21) return aggregateWeekly(points);
  return points;
}

// ─────────────────────────────────────────────
//  Time range picker component
// ─────────────────────────────────────────────

interface TimeRangePickerProps {
  value: TimeRangeValue;
  customFrom?: Date;
  customTo?: Date;
  onChange: (v: TimeRangeValue, from?: Date, to?: Date) => void;
}

function TimeRangePicker({ value, customFrom, customTo, onChange }: TimeRangePickerProps) {
  const [open, setOpen]           = useState(false);
  const [picking, setPicking]     = useState<'from' | 'to' | null>(null);
  const [tempFrom, setTempFrom]   = useState<Date>(customFrom ?? new Date());
  const [tempTo, setTempTo]       = useState<Date>(customTo   ?? new Date());

  const select = (v: TimeRangeValue) => {
    if (v === 'custom') {
      setPicking('from');
      return;
    }
    setOpen(false);
    onChange(v);
  };

  const handleDateChange = (_: unknown, date?: Date) => {
    if (!date) { setPicking(null); return; }
    if (picking === 'from') {
      setTempFrom(date);
      setPicking('to');
    } else {
      const to = date < tempFrom ? tempFrom : date;
      setTempTo(to);
      setPicking(null);
      setOpen(false);
      onChange('custom', tempFrom, to);
    }
  };

  return (
    <>
      <TouchableOpacity style={s.rangeBtn} onPress={() => setOpen(true)} activeOpacity={0.75}>
        <Ionicons name="calendar-outline" size={13} color="#4F46E5" />
        <Text style={s.rangeBtnText}>{labelFor(value, customFrom, customTo)}</Text>
        <Ionicons name="chevron-down" size={12} color="#94A3B8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Select time range</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {TIME_RANGES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[s.rangeOption, value === r.value && s.rangeOptionActive]}
                  onPress={() => select(r.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.rangeOptionText, value === r.value && s.rangeOptionTextActive]}>
                    {r.label}
                  </Text>
                  {value === r.value && (
                    <Ionicons name="checkmark" size={16} color="#4F46E5" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Native date pickers for custom range */}
      {picking !== null && (
        <DateTimePicker
          value={picking === 'from' ? tempFrom : tempTo}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
//  Chart config
// ─────────────────────────────────────────────

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo:   '#ffffff',
  decimalPlaces: 0,
  color:      () => 'rgba(79,70,229,0.15)',
  labelColor: () => '#94A3B8',
  strokeWidth: 2,
  propsForDots: { r: '3', strokeWidth: '1.5' },
  propsForBackgroundLines: { stroke: '#F1F5F9', strokeDasharray: '' },
};

// ─────────────────────────────────────────────
//  Branch line chart
// ─────────────────────────────────────────────

interface BranchLineChartProps {
  placeId: string;
  defaultRange?: TimeRangeValue;
}

export function BranchLineChart({ placeId, defaultRange = '2w' }: BranchLineChartProps) {
  const [range, setRange]         = useState<TimeRangeValue>(defaultRange);
  const [customFrom, setFrom]     = useState<Date>();
  const [customTo, setTo]         = useState<Date>();
  const [points, setPoints]       = useState<ChartPoint[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async (r: TimeRangeValue, from?: Date, to?: Date) => {
    setLoading(true);
    const data = await fetchPoints(placeId, r, from, to);
    setPoints(data);
    setLoading(false);
  }, [placeId]);

  useEffect(() => { load(range, customFrom, customTo); }, []);

  const handleRangeChange = (v: TimeRangeValue, from?: Date, to?: Date) => {
    setRange(v);
    if (from) setFrom(from);
    if (to)   setTo(to);
    load(v, from, to);
  };

  return (
    <View>
      <TimeRangePicker value={range} customFrom={customFrom} customTo={customTo} onChange={handleRangeChange} />
      <ChartBody points={points} loading={loading} emptyMessage="No scan data yet for this period" />
    </View>
  );
}

// ─────────────────────────────────────────────
//  Overall line chart (aggregates all branches)
// ─────────────────────────────────────────────

interface OverallLineChartProps {
  branches: Branch[];
  defaultRange?: TimeRangeValue;
}

export function OverallLineChart({ branches, defaultRange = '1w' }: OverallLineChartProps) {
  const [range, setRange]     = useState<TimeRangeValue>(defaultRange);
  const [customFrom, setFrom] = useState<Date>();
  const [customTo, setTo]     = useState<Date>();
  const [points, setPoints]   = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r: TimeRangeValue, from?: Date, to?: Date) => {
    if (!branches.length) { setLoading(false); return; }
    setLoading(true);
    const all = await Promise.all(branches.map((b) => fetchPoints(b.placeId, r, from, to)));

    // Merge by label index (all ranges return same number of points)
    const len = Math.max(...all.map((a) => a.length), 0);
    const merged: ChartPoint[] = Array.from({ length: len }, (_, i) => ({
      label:      all[0]?.[i]?.label ?? '',
      scans:      all.reduce((s, a) => s + (a[i]?.scans      ?? 0), 0),
      linkVisits: all.reduce((s, a) => s + (a[i]?.linkVisits ?? 0), 0),
      copied:     all.reduce((s, a) => s + (a[i]?.copied     ?? 0), 0),
    }));
    setPoints(merged);
    setLoading(false);
  }, [branches]);

  useEffect(() => { load(range, customFrom, customTo); }, [branches.length]);

  const handleRangeChange = (v: TimeRangeValue, from?: Date, to?: Date) => {
    setRange(v);
    if (from) setFrom(from);
    if (to)   setTo(to);
    load(v, from, to);
  };

  return (
    <View>
      <TimeRangePicker value={range} customFrom={customFrom} customTo={customTo} onChange={handleRangeChange} />
      <ChartBody points={points} loading={loading} emptyMessage="No data yet — ask customers to scan QR codes or share the link" />
    </View>
  );
}

// ─────────────────────────────────────────────
//  Shared chart body
// ─────────────────────────────────────────────

function ChartBody({ points, loading, emptyMessage }: { points: ChartPoint[]; loading: boolean; emptyMessage: string }) {
  if (loading) return <ChartSkeleton />;

  const hasData = points.some((p) => p.scans > 0 || p.linkVisits > 0 || p.copied > 0);

  return (
    <View>
      <View style={s.legend}>
        <LegendDot color="#4F46E5" label="QR Scans" />
        <LegendDot color="#8B5CF6" label="Link Visits" />
        <LegendDot color="#F59E0B" label="Copied" />
      </View>
      {hasData && points.length >= 2 ? (
        <LineChart
          data={{
            labels: sparseLabels(points),
            datasets: [
              { data: points.map((p) => p.scans),      color: () => '#4F46E5', strokeWidth: 2 },
              { data: points.map((p) => p.linkVisits), color: () => '#8B5CF6', strokeWidth: 2 },
              { data: points.map((p) => p.copied),     color: () => '#F59E0B', strokeWidth: 2 },
            ],
          }}
          width={CHART_W}
          height={190}
          chartConfig={chartConfig}
          bezier
          withShadow={false}
          withDots={points.length <= 30}
          style={s.chart}
          withInnerLines
          withOuterLines={false}
        />
      ) : (
        <EmptyChart message={hasData ? 'Not enough data points for this range' : emptyMessage} />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
//  Branch comparison bar chart
// ─────────────────────────────────────────────

interface BranchBarChartProps {
  branches: Branch[];
}

export function BranchBarChart({ branches }: BranchBarChartProps) {
  if (!branches.length) return null;

  const hasData = branches.some((b) => b.analytics.totalScans > 0 || b.analytics.linkVisits > 0);
  if (!hasData) return <EmptyChart message="No scan data yet across branches" />;

  const labels = branches.map((b) => b.name.length > 8 ? b.name.slice(0, 7) + '…' : b.name);
  const data   = branches.map((b) => b.analytics.totalScans + b.analytics.linkVisits);

  return (
    <BarChart
      data={{ labels, datasets: [{ data }] }}
      width={CHART_W}
      height={180}
      yAxisLabel=""
      yAxisSuffix=""
      chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(79,70,229,${opacity})`, barPercentage: 0.6 }}
      style={s.chart}
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
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendLabel}>{label}</Text>
    </View>
  );
}

function ChartSkeleton() {
  return (
    <View style={s.skeleton}>
      <ActivityIndicator size="small" color="#4F46E5" />
      <Text style={s.skeletonText}>Loading chart…</Text>
    </View>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyText}>{message}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const s = StyleSheet.create({
  chart:          { borderRadius: 10, marginLeft: -16 },
  legend:         { flexDirection: 'row', gap: 14, marginBottom: 10, flexWrap: 'wrap' },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendLabel:    { fontSize: 11, color: '#64748B', fontWeight: '600' },
  skeleton:       { height: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  skeletonText:   { fontSize: 12, color: '#94A3B8' },
  empty: {
    height: 110, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  emptyText:      { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20 },

  // Range picker
  rangeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-end', marginBottom: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#EEF2FF', borderRadius: 20,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  rangeBtnText:   { fontSize: 12, fontWeight: '700', color: '#4F46E5' },

  // Modal
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, maxHeight: '75%',
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sheetTitle:     { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  rangeOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  rangeOptionActive:     { backgroundColor: '#F5F3FF' },
  rangeOptionText:       { fontSize: 14, color: '#334155' },
  rangeOptionTextActive: { color: '#4F46E5', fontWeight: '700' },
});
