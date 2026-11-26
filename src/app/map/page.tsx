'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Globe2, Layers, MapPin, Radio } from 'lucide-react';
import { useBreatheWise } from '@/components/BreatheWiseProvider';
import type { AirQualityStation } from '@/types/breathewise';
import { getAqiMeta } from '@/lib/aqi';
import { apiFetch, prefetchApiGet } from '@/lib/client-api';

const EMPTY_STATIONS: AirQualityStation[] = [];
const GLOBAL_MAP_PATH = '/api/air-quality?multi=true';
const POLLUTANT_GUIDELINES: Record<string, number> = {
  pm25: 15,
  pm10: 45,
  no2: 25,
  o3: 100,
};

const AirMapLeaflet = dynamic(() => import('@/components/AirMapLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] w-full items-center justify-center rounded-2xl bg-slate-200/70 text-sm text-slate-500 dark:bg-slate-800">
      Loading interactive environmental map...
    </div>
  ),
});

export default function LiveMapPage() {
  const { activeCity, airQuality, settings } = useBreatheWise();
  const [scope, setScope] = useState<'local' | 'global'>('local');
  const [metric, setMetric] = useState<'aqi' | 'pm25' | 'pm10' | 'no2' | 'o3'>('aqi');
  const [globalStations, setGlobalStations] = useState<AirQualityStation[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const globalPath = `${GLOBAL_MAP_PATH}&demo=${settings.forceDemoMode}`;
  const warmGlobal = () => void prefetchApiGet(globalPath);

  useEffect(() => {
    if (scope !== 'global') return;
    let active = true;
    const controller = new AbortController();
    (async () => {
      setLoadingGlobal(true);
      setGlobalError(null);
      try {
        const res = await apiFetch(globalPath, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) setGlobalStations(data.stations ?? []);
      } catch {
        if (active) {
          setGlobalStations([]);
          setGlobalError('Could not load global monitoring nodes. Please retry.');
        }
      } finally {
        if (active) setLoadingGlobal(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [scope, globalPath]);

  const stations = useMemo(
    () => (scope === 'global' ? globalStations : (airQuality?.stations ?? EMPTY_STATIONS)),
    [scope, globalStations, airQuality?.stations]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-sky-600" />
            Live Air Quality Map
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Interactive visualization distinguishing WAQI ground monitors (when configured), atmospheric model grid nodes, and clearly labeled Demo Mode reference points.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 text-xs dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setScope('local')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                scope === 'local'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              Active City
            </button>
            <button
              type="button"
              onClick={() => setScope('global')}
              onMouseEnter={warmGlobal}
              onFocus={warmGlobal}
              onTouchStart={warmGlobal}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                scope === 'global'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Globe2 className="h-3.5 w-3.5" />
              Global Hubs
            </button>
          </div>
        </div>
      </div>

      {/* Pollutant Overlay Selector + Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/70 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Layers className="h-3.5 w-3.5" />
            Layer:
          </span>
          {(['aqi', 'pm25', 'pm10', 'no2', 'o3'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase transition ${
                metric === m
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {metric === 'aqi' ? (
          <div className="flex flex-wrap items-center gap-2 text-micro font-medium text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Good (0–50)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Moderate (51–100)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> USG (101–150)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Unhealthy (151–200)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-600" /> Very Unhealthy (201–300)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-900" /> Hazardous (301+)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> N/A — no reading
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-micro font-medium text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ≤50% of WHO {metric.toUpperCase()} ({POLLUTANT_GUIDELINES[metric]} µg/m³)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> ≤100% reference
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> ≤200% reference
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> &gt;200% reference
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> N/A — no reading
            </span>
          </div>
        )}
      </div>

      {/* Interactive Leaflet Map */}
      <div className="relative">
        {loadingGlobal && (
          <div className="mb-2 text-xs font-medium text-sky-600 dark:text-sky-400">
            Fetching multi-city readings...
          </div>
        )}
        {scope === 'global' && !loadingGlobal && globalStations.length === 0 && (
          <div className="mb-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            {globalError ?? 'No global monitoring nodes are available right now.'}
          </div>
        )}
        <AirMapLeaflet
          centerLat={scope === 'global' ? 22 : activeCity.lat}
          centerLon={scope === 'global' ? 15 : activeCity.lon}
          stations={stations}
          metric={metric}
        />
      </div>

      {/* Station Table */}
      <div className="rounded-2xl border border-emerald-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-h2 text-slate-900 dark:text-white mb-3">
          Visible Monitoring Nodes ({stations.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((st) => {
            const meta = getAqiMeta(st.aqi);
            return (
              <div
                key={st.id}
                className="rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{st.name}</div>
                    <div className="text-micro text-slate-500">{st.sourceLabel}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 font-bold ${meta.badgeClass}`}>
                    {st.aqi} AQI
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-4 gap-1 text-center rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                  <div>
                    <div className="text-micro text-slate-500">PM2.5</div>
                    <div className="font-semibold">{st.pm25 ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-micro text-slate-500">PM10</div>
                    <div className="font-semibold">{st.pm10 ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-micro text-slate-500">NO₂</div>
                    <div className="font-semibold">{st.no2 ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-micro text-slate-500">O₃</div>
                    <div className="font-semibold">{st.o3 ?? 'N/A'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
