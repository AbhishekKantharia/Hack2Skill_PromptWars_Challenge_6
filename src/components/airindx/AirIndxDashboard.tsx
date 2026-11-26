'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  Droplets,
  ExternalLink,
  Globe2,
  Info,
  LoaderCircle,
  Map as MapIcon,
  Menu,
  Minus,
  Plus,
  RefreshCw,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import { getAqiMeta } from '@/lib/aqi';
import { AirIndxGlobe, type ZoomCommand } from '@/components/airindx/AirIndxGlobe';
import { AirIndxMap } from '@/components/airindx/AirIndxMap';
import type { AirIndxMarker, AirIndxMarkersResponse } from '@/types/airindx';

type ViewMode = 'globe' | 'map';
type DialogKind = 'about' | 'technology' | 'monitors' | 'discover' | 'risk' | 'location' | null;

const NAV_LEFT = [
  { label: 'Air Quality', action: 'air-quality' },
  { label: 'Air Monitors', action: 'monitors' },
  { label: 'Discover', action: 'discover' },
] as const;

const NAV_RIGHT = [
  { label: 'About', action: 'about' },
  { label: 'Technology', action: 'technology' },
] as const;

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.14 8.44 9.94v-7.03H7.9V12.06h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.45 2.91h-2.33V22c4.78-.8 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

function XBrandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.25l-4.9-6.41L6.3 22H3.2l7.24-8.28L2.6 2h6.41l4.43 5.85L18.9 2Zm-1.1 18h1.73L8.36 3.9H6.5L17.8 20Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a10 10 0 0 0-8.6 15.13L2 22l5.05-1.33A10 10 0 1 0 12.04 2Zm0 18.18a8.16 8.16 0 0 1-4.16-1.14l-.3-.18-3 .79.8-2.93-.2-.31a8.18 8.18 0 1 1 6.86 3.77Zm4.49-6.12c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19a7.25 7.25 0 0 1-1.34-1.66c-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.74-1.79-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.83-.84 2.02s.86 2.35.98 2.51c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

function valueOrDash(value: number | null, suffix = '') {
  return value === null || !Number.isFinite(value) ? 'N/A' : `${value}${suffix}`;
}

export function AirIndxDashboard() {
  const [markers, setMarkers] = useState<AirIndxMarker[]>([]);
  const [dataMode, setDataMode] = useState<'live' | 'demo'>('demo');
  const [degraded, setDegraded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand>({ direction: 1, nonce: 0 });
  const [nowLabel, setNowLabel] = useState('');
  const [timeLabel, setTimeLabel] = useState('');
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const date = new Date();
      setNowLabel(
        new Intl.DateTimeFormat(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }).format(date)
      );
      setTimeLabel(
        new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(date)
      );
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/airindx/markers', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('airindx request failed');
        const data = (await response.json()) as AirIndxMarkersResponse;
        setMarkers(data.markers);
        setDataMode(data.dataMode);
        setDegraded(data.degraded);
        const preferred = data.markers.find((marker) => marker.id === 'jakarta') ?? data.markers[0];
        setSelectedId((current) =>
          current && data.markers.some((marker) => marker.id === current)
            ? current
            : preferred?.id ?? null
        );
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError('Global readings could not be loaded. Please retry.');
      })
      .finally(() => {
        setLoading(false);
      });
    return () => controller.abort();
  }, [reloadNonce]);

  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dialog]);

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedId) ?? markers[0] ?? null,
    [markers, selectedId]
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleZoom = (direction: 1 | -1) => {
    setZoomCommand((current) => ({ direction, nonce: current.nonce + 1 }));
  };

  const handleNav = (action: string) => {
    setMobileNavOpen(false);
    if (action === 'air-quality') {
      document.getElementById('air-quality')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setDialog(action as DialogKind);
  };

  const handleShare = (network: 'facebook' | 'x' | 'whatsapp') => {
    const url = typeof window === 'undefined' ? '' : window.location.href;
    const text = `Live global air quality on AirIndx${selectedMarker ? `: ${selectedMarker.name} ${selectedMarker.aqi} US AQI` : ''}`;
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    if (network === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (network === 'x') {
      window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`, '_blank', 'noopener,noreferrer');
  };

  const aqiMeta = selectedMarker ? getAqiMeta(selectedMarker.aqi) : null;
  const riskPercent = selectedMarker ? Math.min(100, Math.round(selectedMarker.aqi / 3)) : 0;
  const coordinateLabel = selectedMarker
    ? `${Math.abs(selectedMarker.lat).toFixed(2)}° ${selectedMarker.lat >= 0 ? 'N' : 'S'} / ${Math.abs(selectedMarker.lon).toFixed(2)}° ${selectedMarker.lon >= 0 ? 'E' : 'W'}`
    : '— / —';

  const dialogTitle =
    dialog === 'about'
      ? 'About AirIndx'
      : dialog === 'technology'
        ? 'Technology & data sources'
        : dialog === 'monitors'
          ? 'Global monitor network'
          : dialog === 'discover'
            ? 'Discover air-quality patterns'
            : dialog === 'risk'
              ? 'How the pollution risk indicator works'
              : dialog === 'location'
                ? selectedMarker
                  ? `${selectedMarker.name} air quality details`
                  : 'Location details'
                : '';

  const dialogBody = () => {
    if (dialog === 'about') {
      return (
        <p>
          AirIndx is an environmental intelligence interface for exploring current air quality across cities. It combines
          live atmospheric model data with an interactive globe so patterns are easier to understand at a glance.
        </p>
      );
    }
    if (dialog === 'technology') {
      return (
        <>
          <p>
            Readings come from the Open-Meteo CAMS global air-quality and weather feeds through the BreatheWise API.
            US EPA AQI categories are computed server-side; no value shown here is generated by a language model.
          </p>
          <p>
            The globe uses React Three Fiber, Drei, and Three.js with local satellite, night-light, specular, and normal
            textures. The map view uses OpenStreetMap tiles.
          </p>
        </>
      );
    }
    if (dialog === 'monitors') {
      return (
        <>
          <p>Each glowing marker represents one city grid reading. Select a marker to inspect its current AQI and weather.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {markers.map((marker) => (
              <button
                key={marker.id}
                type="button"
                onClick={() => {
                  handleSelect(marker.id);
                  setDialog(null);
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                <span className="block font-semibold text-white">{marker.name}</span>
                <span style={{ color: marker.colorHex }}>{marker.aqi} AQI</span>
              </button>
            ))}
          </div>
        </>
      );
    }
    if (dialog === 'discover') {
      return (
        <>
          <p>Compare marker colors to see where cleaner air and elevated pollution overlap across regions.</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Green: Good, up to 50 AQI.</li>
            <li>Yellow: Moderate, up to 100 AQI.</li>
            <li>Orange: Unhealthy for sensitive groups, up to 150 AQI.</li>
            <li>Red, purple, and maroon: increasingly unhealthy conditions.</li>
          </ul>
        </>
      );
    }
    if (dialog === 'risk') {
      return (
        <>
          <p>
            The percentage is a simple presentation indicator derived from the selected city’s US AQI
            (AQI ÷ 300, capped at 100). It is not a medical probability or an official risk forecast.
          </p>
          {selectedMarker && (
            <p className="text-cyan-200">
              {selectedMarker.name}: {selectedMarker.aqi} AQI → {riskPercent}% indicator.
            </p>
          )}
        </>
      );
    }
    if (dialog === 'location' && selectedMarker) {
      return (
        <>
          <p>
            {selectedMarker.name}, {selectedMarker.country} is currently at {selectedMarker.aqi} US AQI —{' '}
            {selectedMarker.category}. Dominant pollutant: {selectedMarker.dominantPollutant}.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <Thermometer className="mb-2 h-4 w-4 text-cyan-300" />
              <span className="block text-slate-400">Temperature</span>
              <span className="font-semibold text-white">{valueOrDash(selectedMarker.temperatureC, '°C')}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <Droplets className="mb-2 h-4 w-4 text-cyan-300" />
              <span className="block text-slate-400">Humidity</span>
              <span className="font-semibold text-white">{valueOrDash(selectedMarker.humidityPct, '%')}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <Wind className="mb-2 h-4 w-4 text-cyan-300" />
              <span className="block text-slate-400">Wind</span>
              <span className="font-semibold text-white">{valueOrDash(selectedMarker.windSpeedKmh, ' km/h')}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Source: {selectedMarker.sourceName}. Updated {new Date(selectedMarker.timestamp).toLocaleString()}.
          </p>
          <a
            href={selectedMarker.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 hover:underline"
          >
            View source documentation <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </>
      );
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-[#e9edf4] px-3 py-3 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div
        className="relative mx-auto min-h-[850px] max-w-[1180px] overflow-hidden rounded-[30px] border border-white/10 shadow-[0_40px_120px_rgba(15,23,42,0.35)]"
        style={{
          backgroundColor: '#080d2b',
          backgroundImage:
            'radial-gradient(circle at 78% 8%, rgba(88,55,190,0.34), transparent 34%), radial-gradient(circle at 22% 92%, rgba(12,116,180,0.22), transparent 38%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40 airindx-grid" />

        <header className="relative z-30 flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <nav className="hidden flex-1 items-center gap-6 text-sm md:flex" aria-label="Primary left navigation">
            {NAV_LEFT.map((item) => (
              <button
                key={item.action}
                type="button"
                onClick={() => handleNav(item.action)}
                className="text-slate-300 transition hover:text-cyan-200"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileNavOpen}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 md:hidden"
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5">
            <span className="airindx-brand-orb" aria-hidden="true" />
            <span className="text-base font-bold tracking-tight text-white sm:text-lg">AirIndx</span>
          </div>

          <nav className="hidden flex-1 items-center justify-end gap-5 text-sm md:flex" aria-label="Primary right navigation">
            {NAV_RIGHT.map((item) => (
              <button
                key={item.action}
                type="button"
                onClick={() => handleNav(item.action)}
                className="text-slate-300 transition hover:text-cyan-200"
              >
                {item.label}
              </button>
            ))}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-cyan-100"
            >
              Get Started <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </header>

        {mobileNavOpen && (
          <div className="absolute inset-x-4 top-16 z-40 rounded-2xl border border-white/10 bg-[#0b1233]/95 p-4 shadow-2xl backdrop-blur-xl md:hidden">
            <div className="grid gap-1">
              {[...NAV_LEFT, ...NAV_RIGHT].map((item) => (
                <button
                  key={item.action}
                  type="button"
                  onClick={() => handleNav(item.action)}
                  className="rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5"
                >
                  {item.label}
                </button>
              ))}
              <Link
                href="/"
                className="mt-2 rounded-xl bg-white px-3 py-2.5 text-center text-sm font-bold text-slate-900"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}

        <div className="relative z-10 grid gap-5 px-5 pb-6 sm:px-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-4">
          <section id="air-quality" className="airindx-enter min-w-0 space-y-5 pt-4 lg:pt-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/80">
                Global Environmental Intelligence
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl airindx-heading">
                Air Quality Index
              </h1>
              <p className="mt-3 text-sm text-slate-400">{nowLabel || 'Loading local date…'}</p>
              <p className="font-mono text-sm text-cyan-200">{timeLabel || '--:--:--'}</p>

              {selectedMarker && (
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <span className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                    {selectedMarker.countryCode}
                  </span>
                  <span className="text-sm font-semibold text-white">{selectedMarker.name}</span>
                  <span className="text-sm text-slate-400">{selectedMarker.country}</span>
                </div>
              )}
            </div>

            <div className="airindx-card-purple airindx-enter airindx-delay-1 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">Main Statistics</h2>
                <Activity className="h-4 w-4 text-cyan-300" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">AQI</p>
              <div className="mt-1 flex items-end gap-3">
                <span className="text-6xl font-bold leading-none tracking-tight text-white airindx-number">
                  {selectedMarker?.aqi ?? '—'}
                </span>
                <span className="mb-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                  US EPA
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">
                  Dominant Pollutant:{' '}
                  <span className="font-semibold text-white">{selectedMarker?.dominantPollutant ?? 'N/A'}</span>
                </span>
                <span className="text-slate-400">
                  Wind:{' '}
                  <span className="font-semibold text-white">
                    {valueOrDash(selectedMarker?.windSpeedKmh ?? null, ' km/h')}
                  </span>
                </span>
              </div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((selectedMarker?.aqi ?? 0) / 300) * 100)}%`,
                    backgroundColor: selectedMarker?.colorHex ?? '#22d3ee',
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">{aqiMeta?.category ?? 'Reading unavailable'}</p>
            </div>

            <div className="airindx-card-blue airindx-enter airindx-delay-2 relative overflow-hidden p-5">
              <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full opacity-50" viewBox="0 0 420 120" fill="none">
                <path d="M-20 96C60 38 132 118 214 64C290 14 352 96 440 42" stroke="#67e8f9" strokeOpacity="0.45" strokeWidth="2" />
                <path d="M-20 112C70 62 142 130 224 84C306 38 366 110 440 68" stroke="#a78bfa" strokeOpacity="0.35" strokeWidth="2" />
                <path d="M-20 126C74 84 150 146 232 104C314 62 372 124 440 92" stroke="#60a5fa" strokeOpacity="0.3" strokeWidth="2" />
              </svg>
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-white">Risk of Pollution</h2>
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                    INDICATOR
                  </span>
                </div>
                <p className="mt-5 text-5xl font-bold tracking-tight text-white">{riskPercent}%</p>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-200/80">
                  {riskPercent < 34
                    ? 'Lower pollution pressure in the selected location right now.'
                    : riskPercent < 67
                      ? 'Moderate pollution pressure; sensitive groups should stay aware.'
                      : 'Elevated pollution pressure; consider reducing prolonged outdoor exertion.'}
                </p>
                <button
                  type="button"
                  onClick={() => setDialog('risk')}
                  className="mt-4 rounded-xl bg-[#facc15] px-4 py-2 text-xs font-bold text-slate-900 shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-300"
                >
                  Details
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-300">Share</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => handleShare('facebook')} aria-label="Share on Facebook" className="airindx-social" title="Share on Facebook">
                    <FacebookIcon className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleShare('x')} aria-label="Share on X" className="airindx-social" title="Share on X">
                    <XBrandIcon className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleShare('whatsapp')} aria-label="Share on WhatsApp" className="airindx-social" title="Share on WhatsApp">
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Coordinates</p>
                <p className="mt-1 font-mono text-xs text-slate-300">{coordinateLabel}</p>
              </div>
            </div>
          </section>

          <section className="relative min-w-0 pt-3 lg:pt-0" aria-label="Interactive global air quality view">
            <div className="airindx-globe-shell relative h-[430px] overflow-hidden rounded-[28px] border border-cyan-300/10 sm:h-[540px] lg:h-[670px]">
              <div className="pointer-events-none absolute inset-0 airindx-space" />
              <div key={viewMode} className="absolute inset-0 airindx-view">
                {viewMode === 'globe' ? (
                  <AirIndxGlobe
                    markers={markers}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    zoomCommand={zoomCommand}
                  />
                ) : (
                  <AirIndxMap
                    markers={markers}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    zoomCommand={zoomCommand}
                  />
                )}
              </div>

              <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 sm:left-5 sm:top-5">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${
                    dataMode === 'live' && !degraded
                      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
                      : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
                  }`}
                >
                  {dataMode === 'live' && !degraded ? 'LIVE CAMS FEED' : 'SAMPLE DATA'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300 backdrop-blur-md">
                  {markers.length} AQI MARKERS
                </span>
              </div>

              {selectedMarker && !loading && (
                <div className="airindx-popup absolute left-3 top-16 z-20 w-[min(18rem,calc(100%_-_1.5rem))] rounded-2xl border border-white/10 bg-[#0b1233]/85 p-3.5 shadow-2xl backdrop-blur-xl sm:left-5 sm:top-20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                        <p className="truncate text-sm font-bold text-white">
                          {selectedMarker.name}, {selectedMarker.country}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">US AQI · {aqiMeta?.category}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-slate-950"
                      style={{ backgroundColor: selectedMarker.colorHex }}
                    >
                      {selectedMarker.aqi}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-300">
                    {aqiMeta?.guidance}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
                    <div>
                      <p className="text-[9px] uppercase tracking-wide text-slate-500">Temp</p>
                      <p className="text-xs font-semibold text-white">{valueOrDash(selectedMarker.temperatureC, '°C')}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wide text-slate-500">Humidity</p>
                      <p className="text-xs font-semibold text-white">{valueOrDash(selectedMarker.humidityPct, '%')}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wide text-slate-500">Wind</p>
                      <p className="text-xs font-semibold text-white">{valueOrDash(selectedMarker.windSpeedKmh)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDialog('location')}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-cyan-300 hover:underline"
                  >
                    Details <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#080d2b]/55 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200">
                    <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
                    Loading global readings…
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#080d2b]/70 p-6 text-center backdrop-blur-sm">
                  <div className="max-w-xs rounded-2xl border border-white/10 bg-white/5 p-5">
                    <Info className="mx-auto h-5 w-5 text-amber-300" />
                    <p className="mt-2 text-sm text-slate-200">{error}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoading(true);
                        setError(null);
                        setReloadNonce((value) => value + 1);
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retry
                    </button>
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-full border border-white/10 bg-[#0b1233]/75 p-1 shadow-xl backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('globe')}
                  aria-pressed={viewMode === 'globe'}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-bold tracking-wide transition sm:px-4 ${
                    viewMode === 'globe' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Globe2 className="h-3.5 w-3.5" /> 3D GLOBE
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  aria-pressed={viewMode === 'map'}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-bold tracking-wide transition sm:px-4 ${
                    viewMode === 'map' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5" /> IQ AIR MAP
                </button>
              </div>

              <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 sm:right-5">
                <button type="button" onClick={() => handleZoom(1)} aria-label="Zoom in" className="airindx-zoom">
                  <Plus className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => handleZoom(-1)} aria-label="Zoom out" className="airindx-zoom">
                  <Minus className="h-4 w-4" />
                </button>
              </div>

              <div className="absolute bottom-5 left-4 z-20 hidden font-mono text-[10px] text-slate-400 sm:block sm:left-5">
                X {selectedMarker?.lon.toFixed(2) ?? '—'} · Y {selectedMarker?.lat.toFixed(2) ?? '—'}
              </div>

              <div className="sr-only">
                <p>Available air quality locations</p>
                {markers.map((marker) => (
                  <button key={marker.id} type="button" onClick={() => handleSelect(marker.id)}>
                    Select {marker.name}, {marker.aqi} US AQI
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {dialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030617]/75 p-4 backdrop-blur-md" role="presentation" onClick={() => setDialog(null)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="airindx-dialog-title"
              onClick={(event) => event.stopPropagation()}
              className="airindx-popup w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b1233]/95 p-6 text-slate-200 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 id="airindx-dialog-title" className="text-xl font-bold text-white">
                  {dialogTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  aria-label="Close dialog"
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">{dialogBody()}</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
