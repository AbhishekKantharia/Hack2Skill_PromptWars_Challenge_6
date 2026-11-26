'use client';

import React from 'react';
import { PrefetchLink } from '@/components/PrefetchLink';
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
  const {
    airQuality,
    loadingAq,
    aqError,
    settings,
    setActiveCity,
    refreshAirQuality,
    prefetchAirQuality,
  } = useBreatheWise();

  if (loadingAq && !airQuality) {
    return (
      <div className="space-y-6">
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

  const errorBanner = aqError ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100">
      <span>{aqError}</span>
      <button
        type="button"
        onClick={() => void refreshAirQuality()}
        onMouseEnter={() => prefetchAirQuality()}
        onFocus={() => prefetchAirQuality()}
        onTouchStart={() => prefetchAirQuality()}
        className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
      >
        Retry Connection
      </button>
    </div>
  ) : null;

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
      {errorBanner}
      {airQuality.degraded && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <strong>Degraded feed:</strong> {airQuality.liveError ?? 'Live data unavailable.'} Values below are labeled Demo Mode.
        </div>
      )}
      {/* Quick City Switcher Pills */}
      <div className="hidden flex-wrap items-center justify-between gap-3 lg:flex">
        <div>
          <h1 className="text-h1 tracking-tight text-slate-900 dark:text-white">
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
                onMouseEnter={() => prefetchAirQuality(city)}
                onFocus={() => prefetchAirQuality(city)}
                onTouchStart={() => prefetchAirQuality(city)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
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

      <section className="rounded-3xl border border-emerald-200/70 bg-white p-4 shadow-xs lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-micro font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Today · {airQuality.location.name}
            </p>
            <h2 className="mt-1 text-h2 text-slate-900 dark:text-white">How is the air?</h2>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-micro font-bold ${meta.badgeClass}`}>
            {airQuality.category}
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-6xl font-black leading-none tracking-tight" style={{ color: meta.colorHex }}>
              {airQuality.aqi}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800 dark:text-white">US EPA AQI</div>
              <div className="truncate text-micro text-slate-500 dark:text-slate-400">
                {settings.sensitivityGroup.replace('_', ' ')}
              </div>
            </div>
          </div>
          {airQuality.dataMode === 'demo' && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-micro font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
              SAMPLE
            </span>
          )}
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{meta.guidance}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
          <div className="min-w-0 text-center">
            <div className="text-micro text-slate-500">Temp</div>
            <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{tempDisplay}</div>
          </div>
          <div className="min-w-0 text-center">
            <div className="text-micro text-slate-500">Humidity</div>
            <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {airQuality.weather.humidityPct !== null ? `${airQuality.weather.humidityPct}%` : 'N/A'}
            </div>
          </div>
          <div className="min-w-0 text-center">
            <div className="text-micro text-slate-500">Wind</div>
            <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{windDisplay}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <PrefetchLink
            href="/cleaner-day"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white"
          >
            <CalendarClock className="h-4 w-4" />
            Plan My Day
          </PrefetchLink>
          <PrefetchLink
            href="/assistant"
            apiPath="/api/chat"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 px-3 py-2.5 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
          >
            <Bot className="h-4 w-4" />
            Ask AI
          </PrefetchLink>
        </div>
      </section>

      {/* Hero AQI & Weather Row */}
      <div className="hidden gap-5 lg:grid lg:grid-cols-3">
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
              <PrefetchLink
                href="/cleaner-day"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
              >
                <CalendarClock className="h-4 w-4" />
                Plan My Cleaner Day
                <ArrowRight className="h-4 w-4" />
              </PrefetchLink>
              <PrefetchLink
                href="/assistant"
                apiPath="/api/chat"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
              >
                <Bot className="h-3.5 w-3.5" />
                Ask AI About Today’s Air
              </PrefetchLink>
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
              <h2 className="text-h2 text-slate-900 dark:text-white">
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

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-micro text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            Low wind (&lt;8 km/h) often traps morning &amp; evening exhaust near ground level.
          </div>
        </div>
      </div>

      {/* Intelligent Alerts */}
      <AlertsStrip />

      <section className="lg:hidden">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-h3 text-slate-900 dark:text-white">Pollutants</h2>
          <span className="text-micro text-slate-500 dark:text-slate-400">WHO 2021 reference</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {pollutantCards.map((p) => (
            <div
              key={p.label}
              className="min-w-0 rounded-2xl border border-emerald-200/60 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="truncate text-micro font-semibold text-slate-500 dark:text-slate-400">
                {p.label}
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="truncate text-xl font-extrabold text-slate-900 dark:text-white">
                  {p.value !== null ? p.value : 'N/A'}
                </span>
                <span className="shrink-0 text-micro text-slate-500">{p.unit}</span>
              </div>
              <div className="mt-1 truncate text-micro text-slate-500 dark:text-slate-400" title={p.guide}>
                {p.guide}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6 Pollutant Metric Cards */}
      <div className="hidden lg:block">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h2 text-slate-900 dark:text-white flex items-center gap-2">
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
              className="min-w-0 rounded-2xl border border-emerald-200/60 bg-white p-4 shadow-xs transition-colors hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900/90"
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
                  <div className="text-micro font-medium text-slate-500">{p.unit}</div>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-2 text-micro text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {p.guide}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Recharts Trends & Forecast */}
      <AirQualityCharts hourly={airQuality.hourly} />

      <section className="lg:hidden">
        <h2 className="mb-2 text-h3 text-slate-900 dark:text-white">Explore BreatheWise</h2>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          <PrefetchLink href="/map" className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
              <MapIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">Live Air Map</span>
              <span className="block truncate text-micro text-slate-500">Compare monitors and city snapshots</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </PrefetchLink>
          <PrefetchLink href="/indoor" className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Home className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">Indoor Advisor</span>
              <span className="block truncate text-micro text-slate-500">Affordable filtration strategies and limits</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </PrefetchLink>
          <PrefetchLink href="/calculator" apiPath="/api/calculator" className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Calculator className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">Impact &amp; Simulator</span>
              <span className="block truncate text-micro text-slate-500">Track avoided emissions and scenarios</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </PrefetchLink>
          <PrefetchLink href="/presentation" className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
              <Activity className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">Competition Deck</span>
              <span className="block truncate text-micro text-slate-500">Problem, GenAI innovation and impact</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </PrefetchLink>
        </div>
      </section>

      {/* Feature Navigation Cards */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-4">
        <PrefetchLink
          href="/map"
          className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-sky-400 dark:border-slate-800 dark:bg-slate-900"
        >
          <MapIcon className="h-5 w-5 text-sky-600" />
          <div className="mt-2 text-h3 text-slate-900 dark:text-white">Live Air Map</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Compare spatial monitors and global city snapshots.
          </p>
        </PrefetchLink>
        <PrefetchLink
          href="/indoor"
          className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
        >
          <Home className="h-5 w-5 text-emerald-600" />
          <div className="mt-2 text-h3 text-slate-900 dark:text-white">Indoor Advisor</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Free, affordable, and HEPA strategies with honest limits.
          </p>
        </PrefetchLink>
        <PrefetchLink
          href="/calculator"
          apiPath="/api/calculator"
          className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
        >
          <Calculator className="h-5 w-5 text-emerald-600" />
          <div className="mt-2 text-h3 text-slate-900 dark:text-white">Impact &amp; Simulator</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Track avoided CO₂, fuel, energy &amp; explore what-if scenarios.
          </p>
        </PrefetchLink>
        <PrefetchLink
          href="/presentation"
          className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-sky-400 dark:border-slate-800 dark:bg-slate-900"
        >
          <Activity className="h-5 w-5 text-sky-600" />
          <div className="mt-2 text-h3 text-slate-900 dark:text-white">Competition Deck</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Explore the problem, GenAI innovation &amp; social impact story.
          </p>
        </PrefetchLink>
      </div>
    </div>
  );
}
