'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bot,
  Calculator,
  CalendarClock,
  CloudSun,
  Compass,
  Droplets,
  Home,
  Info,
  Map as MapIcon,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useBreatheWise } from '@/components/BreatheWiseProvider';
import { getAqiMeta } from '@/lib/aqi';
import { AlertsStrip } from '@/components/AlertsPanel';
import { AirQualityCharts } from '@/components/AirQualityCharts';
import { FEATURED_CITIES } from '@/lib/demo-data';

export default function DashboardPage() {
  const { airQuality, loadingAq, aqError, settings, setActiveCity, refreshAirQuality } =
    useBreatheWise();

  if (loadingAq && !airQuality) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-emerald-100/70 dark:bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-slate-200/70 dark:bg-slate-800" />
      </div>
    );
  }

  if (aqError && !airQuality) {
    return (
      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100">
        <h2 className="text-lg font-bold">Unable to retrieve environmental readings</h2>
        <p className="mt-1 text-sm">{aqError}</p>
        <button
          type="button"
          onClick={() => void refreshAirQuality()}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!airQuality) return null;

  const meta = getAqiMeta(airQuality.aqi);
  const tempDisplay =
    airQuality.weather.temperatureC === null
      ? 'N/A'
      : settings.units === 'imperial'
        ? `${((airQuality.weather.temperatureC * 9) / 5 + 32).toFixed(1)} °F`
        : `${airQuality.weather.temperatureC} °C`;

  const windDisplay =
    airQuality.weather.windSpeedKmh === null
      ? 'N/A'
      : settings.units === 'imperial'
        ? `${(airQuality.weather.windSpeedKmh * 0.621371).toFixed(1)} mph`
        : `${airQuality.weather.windSpeedKmh} km/h`;

  const pollutantCards = [
    {
      label: 'PM2.5',
      sub: 'Fine particles (≤2.5 µm)',
      value: airQuality.pollutants.pm25,
      unit: 'µg/m³',
      guide: 'WHO 24h: 15 µg/m³',
    },
    {
      label: 'PM10',
      sub: 'Coarse dust (≤10 µm)',
      value: airQuality.pollutants.pm10,
      unit: 'µg/m³',
      guide: 'WHO 24h: 45 µg/m³',
    },
    {
      label: 'NO₂',
      sub: 'Nitrogen dioxide',
      value: airQuality.pollutants.no2,
      unit: 'µg/m³',
      guide: 'WHO 24h: 25 µg/m³',
    },
    {
      label: 'O₃',
      sub: 'Ground-level ozone',
      value: airQuality.pollutants.o3,
      unit: 'µg/m³',
      guide: 'WHO 8h: 100 µg/m³',
    },
    {
      label: 'SO₂',
      sub: 'Sulfur dioxide',
      value: airQuality.pollutants.so2,
      unit: 'µg/m³',
      guide: 'WHO 24h: 40 µg/m³',
    },
    {
      label: 'CO',
      sub: 'Carbon monoxide',
      value: airQuality.pollutants.co,
      unit: 'µg/m³',
      guide: 'WHO 24h: 4,000 µg/m³',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick City Switcher Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Urban Air Quality Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Actionable environmental intelligence for{' '}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {airQuality.location.name}
            </span>
            {airQuality.location.country ? `, ${airQuality.location.country}` : ''} · Updated{' '}
            <span className="font-mono text-xs">
              {new Date(airQuality.timestamp).toLocaleString()}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FEATURED_CITIES.map((city) => {
            const selected = city.name === airQuality.location.name;
            return (
              <button
                key={city.name}
                type="button"
                onClick={() => setActiveCity(city)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-400 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                {city.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero AQI & Weather Row */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/50 to-sky-50/70 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-emerald-950/30 dark:to-sky-950/30">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${meta.badgeClass}`}>
                  {airQuality.category}
                </span>
                <span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  Dominant: {airQuality.dominantPollutant}
                </span>
                {airQuality.dataMode === 'demo' && (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                    SAMPLE DEMO DATA
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-3">
                <span
                  className="text-5xl sm:text-6xl font-black tracking-tight"
                  style={{ color: meta.colorHex }}
                >
                  {airQuality.aqi}
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    US EPA AQI
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Profile: {settings.sensitivityGroup.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <Link
                href="/cleaner-day"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:brightness-110"
              >
                <CalendarClock className="h-4 w-4" />
                Plan My Cleaner Day
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/assistant"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white/90 px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
              >
                <Bot className="h-3.5 w-3.5" />
                Ask AI About Today’s Air
              </Link>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {meta.guidance}
          </p>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/80 p-3 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
            <Info className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
            <span>
              <strong>Source &amp; Uncertainty:</strong> {airQuality.sourceName}.{' '}
              {airQuality.uncertaintyNote}
            </span>
          </div>
        </div>

        {/* Weather Context Card */}
        <div className="rounded-3xl border border-sky-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Weather &amp; Dispersion
              </h2>
              <CloudSun className="h-5 w-5 text-sky-500" />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Wind and humidity strongly affect how fast urban pollutants disperse.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-sky-50/70 p-3 dark:bg-slate-800/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Thermometer className="h-3.5 w-3.5 text-sky-600" />
                  Temperature
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {tempDisplay}
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-50/70 p-3 dark:bg-slate-800/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Droplets className="h-3.5 w-3.5 text-emerald-600" />
                  Humidity
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {airQuality.weather.humidityPct !== null
                    ? `${airQuality.weather.humidityPct}%`
                    : 'N/A'}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Wind className="h-3.5 w-3.5 text-sky-600" />
                  Wind Speed
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {windDisplay}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Compass className="h-3.5 w-3.5 text-emerald-600" />
                  Condition
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {airQuality.weather.condition}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            Low wind (&lt;8 km/h) often traps morning &amp; evening exhaust near ground level.
          </div>
        </div>
      </div>

      {/* Intelligent Alerts */}
      <AlertsStrip />

      {/* 6 Pollutant Metric Cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            {airQuality.dataMode === 'demo' ? 'Sample Pollutant Reference Data' : 'Live Pollutant Breakdown'}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            All concentrations displayed with standard units &amp; WHO 2021 reference levels
          </span>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {pollutantCards.map((p) => (
            <div
              key={p.label}
              className="rounded-2xl border border-emerald-200/60 bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{p.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{p.sub}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {p.value !== null ? p.value : 'N/A'}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">{p.unit}</div>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {p.guide}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Recharts Trends & Forecast */}
      <AirQualityCharts hourly={airQuality.hourly} />

      {/* Feature Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/map"
          className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <MapIcon className="h-5 w-5 text-sky-600" />
          <div className="mt-2 font-bold text-slate-900 dark:text-white">Live Air Map</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Compare spatial monitors and global city snapshots.
          </p>
        </Link>
        <Link
          href="/indoor"
          className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <Home className="h-5 w-5 text-emerald-600" />
          <div className="mt-2 font-bold text-slate-900 dark:text-white">Indoor Advisor</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Free, affordable, and HEPA strategies with honest limits.
          </p>
        </Link>
        <Link
          href="/calculator"
          className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <Calculator className="h-5 w-5 text-emerald-600" />
          <div className="mt-2 font-bold text-slate-900 dark:text-white">Impact &amp; Simulator</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Track avoided CO₂, fuel, energy &amp; explore what-if scenarios.
          </p>
        </Link>
        <Link
          href="/presentation"
          className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <Activity className="h-5 w-5 text-sky-600" />
          <div className="mt-2 font-bold text-slate-900 dark:text-white">Competition Deck</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Explore the problem, GenAI innovation &amp; social impact story.
          </p>
        </Link>
      </div>
    </div>
  );
}
