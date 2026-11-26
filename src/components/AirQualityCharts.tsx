'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HourlyAirPoint } from '@/types/breathewise';

type MetricKey = 'aqi' | 'pm25' | 'pm10' | 'o3' | 'no2';

const METRIC_META: Record<
  MetricKey,
  { label: string; unit: string; color: string; guideline?: number; referenceLabel?: string }
> = {
  aqi: { label: 'US AQI', unit: 'AQI', color: '#10b981', guideline: 100, referenceLabel: 'Moderate (100)' },
  pm25: {
    label: 'PM2.5',
    unit: 'µg/m³',
    color: '#0284c7',
    guideline: 15,
    referenceLabel: 'WHO 24h guide (15)',
  },
  pm10: {
    label: 'PM10',
    unit: 'µg/m³',
    color: '#0d9488',
    guideline: 45,
    referenceLabel: 'WHO 24h guide (45)',
  },
  o3: {
    label: 'Ozone (O₃)',
    unit: 'µg/m³',
    color: '#6366f1',
    guideline: 100,
    referenceLabel: 'WHO 8h guide (100)',
  },
  no2: {
    label: 'NO₂',
    unit: 'µg/m³',
    color: '#f59e0b',
    guideline: 25,
    referenceLabel: 'WHO 24h guide (25)',
  },
};

const CHART_MARGIN = { top: 10, right: 12, left: -10, bottom: 0 };
const AXIS_TICK = { fontSize: 11, fill: '#64748b' };
const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid rgba(16,185,129,0.25)',
  backgroundColor: 'rgba(15, 23, 42, 0.94)',
  color: '#f8fafc',
  fontSize: '12px',
};
const REFERENCE_LABEL = {
  position: 'insideTopRight' as const,
  fill: '#d97706',
  fontSize: 10,
};

function formatLabel(label: unknown, items: unknown) {
  const payload = Array.isArray(items) ? (items[0] as { payload?: HourlyAirPoint } | undefined)?.payload : undefined;
  return `${String(label)} (${payload?.isForecast ? 'Modeled Forecast' : 'Recent Observation'})`;
}

export const AirQualityCharts = React.memo(function AirQualityCharts({
  hourly,
}: {
  hourly: HourlyAirPoint[];
}) {
  const [metric, setMetric] = useState<MetricKey>('aqi');
  const [horizon, setHorizon] = useState<'all' | 'past' | 'forecast'>('all');

  const filtered = useMemo(
    () =>
      hourly.filter((pt) => {
        if (horizon === 'past') return !pt.isForecast;
        if (horizon === 'forecast') return pt.isForecast;
        return true;
      }),
    [hourly, horizon]
  );

  const meta = METRIC_META[metric];
  const tooltipFormatter = useCallback(
    (value: unknown): [string, string] => [
      value === null || value === undefined ? 'Unavailable' : `${value} ${meta.unit}`,
      meta.label,
    ],
    [meta]
  );

  return (
    <div className="min-w-0 max-w-full rounded-2xl border border-emerald-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-h2 text-slate-900 dark:text-white">
            24-Hour Pollution Trend &amp; Forecast
          </h2>
          <p className="text-caption text-slate-500 dark:text-slate-400">
            Observed recent hours and modeled forecast ({meta.label} in {meta.unit})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-xl bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
            {(['all', 'past', 'forecast'] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`rounded-lg px-2.5 py-1 font-medium capitalize transition-colors ${
                  horizon === h
                    ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-700 dark:text-emerald-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {h === 'all' ? '24h Combined' : h === 'past' ? 'Recent' : 'Forecast'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(Object.keys(METRIC_META) as MetricKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMetric(key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              metric === key
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {METRIC_META[key].label}
          </button>
        ))}
      </div>

      <div className="h-72 w-full min-w-0 max-w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
          <AreaChart data={filtered} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="bwMetricGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={meta.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={meta.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={tooltipFormatter}
              labelFormatter={formatLabel}
            />
            {meta.guideline && (
              <ReferenceLine
                y={meta.guideline}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ ...REFERENCE_LABEL, value: meta.referenceLabel ?? `Reference (${meta.guideline})` }}
              />
            )}
            <Area
              type="monotone"
              dataKey={metric}
              stroke={meta.color}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#bwMetricGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
