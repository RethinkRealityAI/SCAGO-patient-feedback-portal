'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart as PieChartIcon,
  BarChart3,
  Hash,
  Sigma,
  ListTodo,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export type WidgetType = 'pie' | 'bar' | 'stat-avg' | 'stat-count' | 'breakdown';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  fieldId?: string;
  label: string;
  color?: string;
}

const ICONS: Record<WidgetType, any> = {
  'pie': PieChartIcon,
  'bar': BarChart3,
  'stat-avg': Sigma,
  'stat-count': Hash,
  'breakdown': ListTodo,
};

const FALLBACK_COLOR = '#3b82f6';
const CHART_PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6'];

function extractValue(raw: any): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  if (Array.isArray(raw)) {
    const parts = raw.map((v) => extractValue(v)).filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }
  if (typeof raw === 'object') {
    if (typeof raw.selection === 'string' && raw.selection.trim()) return raw.selection.trim();
    if (typeof raw.value === 'string' && raw.value.trim()) return raw.value.trim();
    if (typeof raw.label === 'string' && raw.label.trim()) return raw.label.trim();
    if (typeof raw.name === 'string' && raw.name.trim()) return raw.name.trim();
  }
  return null;
}

function extractNumber(raw: any): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof raw === 'object') {
    if (typeof raw.value === 'number') return raw.value;
    if (typeof raw.value === 'string') {
      const n = Number(raw.value);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function explodeValues(raw: any): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((v) => explodeValues(v));
  }
  const v = extractValue(raw);
  return v ? [v] : [];
}

function getDistribution(submissions: any[], fieldId: string): { name: string; value: number }[] {
  const counts: Record<string, number> = {};
  for (const sub of submissions) {
    const values = explodeValues(sub[fieldId]);
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function getNumericValues(submissions: any[], fieldId: string): number[] {
  const out: number[] = [];
  for (const sub of submissions) {
    const n = extractNumber(sub[fieldId]);
    if (n !== null) out.push(n);
  }
  return out;
}

function getNumericBuckets(values: number[]): { name: string; value: number }[] {
  if (values.length === 0) return [];
  const isInteger = values.every((v) => Number.isInteger(v));
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Integer scale buckets (e.g. 0-10 ratings)
  if (isInteger && max - min <= 20) {
    const counts: Record<number, number> = {};
    for (const v of values) counts[v] = (counts[v] || 0) + 1;
    const out: { name: string; value: number }[] = [];
    for (let i = min; i <= max; i++) {
      out.push({ name: String(i), value: counts[i] || 0 });
    }
    return out;
  }
  // Otherwise create ~6 equal-width buckets
  const buckets = 6;
  const step = (max - min) / buckets || 1;
  const counts = new Array(buckets).fill(0);
  for (const v of values) {
    const idx = Math.min(buckets - 1, Math.floor((v - min) / step));
    counts[idx]++;
  }
  return counts.map((c, i) => {
    const lo = min + i * step;
    const hi = i === buckets - 1 ? max : lo + step;
    const fmt = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(1));
    return { name: `${fmt(lo)}–${fmt(hi)}`, value: c };
  });
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

interface WidgetRendererProps {
  widget: DashboardWidget;
  submissions: any[];
}

export function WidgetRenderer({ widget, submissions }: WidgetRendererProps) {
  const color = widget.color || FALLBACK_COLOR;
  const Icon = ICONS[widget.type] || Hash;

  // STAT-COUNT: total submissions
  if (widget.type === 'stat-count') {
    return (
      <StatCard
        label={widget.label}
        value={submissions.length.toLocaleString()}
        sublabel="total submissions"
        color={color}
        Icon={Icon}
      />
    );
  }

  // All other types need a fieldId
  if (!widget.fieldId) {
    return <EmptyCard label={widget.label} message="No question configured" Icon={Icon} color={color} />;
  }

  if (widget.type === 'stat-avg') {
    const values = getNumericValues(submissions, widget.fieldId);
    const avg = average(values);
    return (
      <StatCard
        label={widget.label}
        value={avg !== null ? avg.toFixed(2).replace(/\.00$/, '') : '—'}
        sublabel={`${values.length} responses`}
        color={color}
        Icon={Icon}
      />
    );
  }

  if (widget.type === 'pie') {
    const data = getDistribution(submissions, widget.fieldId);
    return (
      <ChartCard label={widget.label} color={color} Icon={Icon}>
        {data.length === 0 ? (
          <EmptyContent />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={(d: any) => d.name}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    );
  }

  if (widget.type === 'bar') {
    const values = getNumericValues(submissions, widget.fieldId);
    const data = getNumericBuckets(values);
    return (
      <ChartCard label={widget.label} color={color} Icon={Icon}>
        {data.length === 0 ? (
          <EmptyContent />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    );
  }

  if (widget.type === 'breakdown') {
    const data = getDistribution(submissions, widget.fieldId).slice(0, 8);
    const total = data.reduce((sum, d) => sum + d.value, 0);
    return (
      <ChartCard label={widget.label} color={color} Icon={Icon}>
        {data.length === 0 ? (
          <EmptyContent />
        ) : (
          <div className="space-y-2">
            {data.map((row) => {
              const pct = total > 0 ? (row.value / total) * 100 : 0;
              return (
                <div key={row.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate pr-2 font-medium">{row.name}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">{row.value} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>
    );
  }

  return null;
}

function StatCard({ label, value, sublabel, color, Icon }: { label: string; value: string; sublabel?: string; color: string; Icon: any }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold" style={{ color }}>{value}</div>
        {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ label, color, Icon, children }: { label: string; color: string; Icon: any; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold truncate">{label}</CardTitle>
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyCard({ label, message, Icon, color }: { label: string; message: string; Icon: any; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground py-4 text-center">{message}</p>
      </CardContent>
    </Card>
  );
}

function EmptyContent() {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <p className="text-sm text-muted-foreground">No data yet</p>
    </div>
  );
}

interface DashboardWidgetsProps {
  widgets: DashboardWidget[];
  submissions: any[];
}

export function DashboardWidgets({ widgets, submissions }: DashboardWidgetsProps) {
  if (!widgets || widgets.length === 0) return null;

  // Separate stat-style widgets from chart-style for nicer layout
  const stats = widgets.filter((w) => w.type === 'stat-avg' || w.type === 'stat-count');
  const charts = widgets.filter((w) => w.type !== 'stat-avg' && w.type !== 'stat-count');

  return (
    <div className="space-y-4">
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((w) => (
            <WidgetRenderer key={w.id} widget={w} submissions={submissions} />
          ))}
        </div>
      )}
      {charts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {charts.map((w) => (
            <WidgetRenderer key={w.id} widget={w} submissions={submissions} />
          ))}
        </div>
      )}
    </div>
  );
}
