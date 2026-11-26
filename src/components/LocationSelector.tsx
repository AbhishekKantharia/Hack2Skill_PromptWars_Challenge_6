'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import type { CityLocation } from '@/types/breathewise';
import { FEATURED_CITIES } from '@/lib/demo-data';
import { apiFetch } from '@/lib/client-api';
import { useBreatheWise } from '@/components/BreatheWiseProvider';

export function LocationSelector() {
  const { activeCity, setActiveCity, prefetchAirQuality } = useBreatheWise();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityLocation[]>(FEATURED_CITIES);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const geoStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (geoStatusTimerRef.current) clearTimeout(geoStatusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!open || term.length === 0) {
      setResults(FEATURED_CITIES);
      setSearchError(null);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await apiFetch(`/api/geocode?q=${encodeURIComponent(term)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Search failed (HTTP ${res.status})`);
        }
        const data = await res.json();
        setResults(data.results ?? FEATURED_CITIES);
      } catch (err) {
        setResults(FEATURED_CITIES);
        setSearchError(err instanceof Error ? err.message : 'City search is unavailable.');
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open]);

  const flashGeoStatus = useCallback((message: string) => {
    setGeoStatus(message);
    if (geoStatusTimerRef.current) clearTimeout(geoStatusTimerRef.current);
    geoStatusTimerRef.current = setTimeout(() => setGeoStatus(null), 3500);
  }, []);

  const requestGeolocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      flashGeoStatus('Browser geolocation unavailable. Use city search instead.');
      return;
    }
    flashGeoStatus('Requesting location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const located: CityLocation = {
          name: 'My Current Area',
          country: 'GPS',
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
        };
        setActiveCity(located);
        flashGeoStatus('Location updated');
      },
      () => {
        flashGeoStatus('Location permission declined. Showing selected city.');
      },
      { timeout: 8000 }
    );
  }, [flashGeoStatus, setActiveCity]);

  return (
    <div ref={containerRef} className="relative flex min-w-0 max-w-full items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-0">
        <div className="flex items-center rounded-xl border border-emerald-200/80 bg-white px-3 py-1.5 shadow-xs transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900">
          <Search className="mr-2 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <input
            type="text"
            aria-label="Search city or neighborhood"
            placeholder={`${activeCity.name}${activeCity.country ? `, ${activeCity.country}` : ''} — Search city...`}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            className="w-full min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </div>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="px-2.5 py-1 text-micro font-semibold uppercase tracking-wider text-slate-400">
              {searching ? 'Searching cities...' : query ? 'Search Results' : 'Featured Urban Hubs'}
            </div>
            {searchError && (
              <div className="mx-2.5 mb-1.5 rounded-lg bg-rose-500/10 px-2 py-1 text-micro text-rose-700 dark:text-rose-300">
                {searchError}
              </div>
            )}
            {results.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No matching locations found.</div>
            ) : (
              results.map((city, idx) => (
                <button
                  key={`${city.name}-${city.lat}-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveCity(city);
                    setQuery('');
                    setOpen(false);
                  }}
                  onMouseEnter={() => prefetchAirQuality(city)}
                  onFocus={() => prefetchAirQuality(city)}
                  onTouchStart={() => prefetchAirQuality(city)}
                  className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-slate-800"
                >
                  <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                    <span className="truncate">{city.name}</span>
                    {city.region ? (
                      <span className="shrink-0 text-xs font-normal text-slate-500">({city.region})</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">{city.country}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={requestGeolocation}
        title="Use my approximate location (optional)"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-800/70 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60"
      >
        <LocateFixed className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Locate</span>
      </button>

      {geoStatus && (
        <span className="hidden max-w-48 truncate rounded-lg bg-slate-100 px-2 py-1 text-micro text-slate-600 xl:inline-block dark:bg-slate-800 dark:text-slate-300">
          {geoStatus}
        </span>
      )}
    </div>
  );
}
