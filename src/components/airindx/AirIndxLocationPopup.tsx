'use client';

import { ArrowUpRight, Droplets, Thermometer, Wind } from 'lucide-react';
import type { AqiLevelMeta } from '@/lib/aqi';
import { aqiTextColor, formatTimestamp, valueOrDash } from '@/components/airindx/format';
import type { AirIndxMarker } from '@/types/airindx';

interface AirIndxLocationPopupProps {
  marker: AirIndxMarker;
  meta: AqiLevelMeta;
  onDetails: () => void;
}

export function AirIndxLocationPopup({ marker, meta, onDetails }: AirIndxLocationPopupProps) {
  return (
    <div className="airindx-popup absolute left-3 top-16 z-20 w-[min(18rem,calc(100%_-_1.5rem))] rounded-2xl border border-white/10 bg-[#0b1233]/85 p-3.5 shadow-2xl backdrop-blur-xl sm:left-5 sm:top-20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: marker.colorHex, boxShadow: `0 0 10px ${marker.colorHex}` }}
              aria-hidden="true"
            />
            <p className="truncate text-sm font-bold text-white">
              {marker.name}, {marker.country}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">US AQI · {meta.category}</p>
        </div>
        <span
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold"
          style={{ backgroundColor: marker.colorHex, color: aqiTextColor(marker.colorHex) }}
        >
          {marker.aqi}
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-300">{meta.guidance}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
        <div>
          <p className="text-[9px] uppercase tracking-wide text-slate-400">Temp</p>
          <p className="text-xs font-semibold text-white">{valueOrDash(marker.temperatureC, '°C')}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-slate-400">Humidity</p>
          <p className="text-xs font-semibold text-white">{valueOrDash(marker.humidityPct, '%')}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-slate-400">Wind</p>
          <p className="text-xs font-semibold text-white">{valueOrDash(marker.windSpeedKmh, ' km/h')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDetails}
        className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-cyan-300 hover:underline"
      >
        Details <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export function AirIndxTimestamp({ marker }: { marker: AirIndxMarker }) {
  return (
    <p className="mt-4 text-xs text-slate-400">
      Source: {marker.sourceName}. Updated {formatTimestamp(marker.timestamp, marker.timezone)}.
    </p>
  );
}

export function AirIndxWeatherDetails({ marker }: { marker: AirIndxMarker }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <Thermometer className="mb-2 h-4 w-4 text-cyan-300" aria-hidden="true" />
        <span className="block text-slate-400">Temperature</span>
        <span className="font-semibold text-white">{valueOrDash(marker.temperatureC, '°C')}</span>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <Droplets className="mb-2 h-4 w-4 text-cyan-300" aria-hidden="true" />
        <span className="block text-slate-400">Humidity</span>
        <span className="font-semibold text-white">{valueOrDash(marker.humidityPct, '%')}</span>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <Wind className="mb-2 h-4 w-4 text-cyan-300" aria-hidden="true" />
        <span className="block text-slate-400">Wind</span>
        <span className="font-semibold text-white">{valueOrDash(marker.windSpeedKmh, ' km/h')}</span>
      </div>
    </div>
  );
}
