'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  AirQualityPayload,
  CityLocation,
  IntelligentAlert,
  UserSettings,
} from '@/types/breathewise';
import { DEFAULT_USER_SETTINGS, FEATURED_CITIES } from '@/lib/demo-data';
import { apiFetch } from '@/lib/client-api';

interface BreatheWiseContextValue {
  settings: UserSettings;
  activeCity: CityLocation;
  airQuality: AirQualityPayload | null;
  alerts: IntelligentAlert[];
  loadingAq: boolean;
  aqError: string | null;
  setActiveCity: (city: CityLocation) => void;
  refreshAirQuality: (cityOverride?: CityLocation, demoOverride?: boolean) => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<boolean>;
  toggleTheme: () => void;
  toggleDemoMode: () => Promise<void>;
  requestGeolocation: () => void;
  geoStatus: string | null;
}

const BreatheWiseContext = createContext<BreatheWiseContextValue | null>(null);

export function BreatheWiseProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [activeCity, setActiveCityState] = useState<CityLocation>(FEATURED_CITIES[0]);
  const [airQuality, setAirQuality] = useState<AirQualityPayload | null>(null);
  const [alerts, setAlerts] = useState<IntelligentAlert[]>([]);
  const [loadingAq, setLoadingAq] = useState<boolean>(true);
  const [aqError, setAqError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const refreshIdRef = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('breathewise-theme', settings.theme);
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [settings.theme]);

  const refreshAirQuality = useCallback(
    async (cityOverride?: CityLocation, demoOverride?: boolean) => {
      const target = cityOverride ?? activeCity;
      const demoFlag = demoOverride ?? settings.forceDemoMode;
      const refreshId = ++refreshIdRef.current;
      setLoadingAq(true);
      setAqError(null);
      try {
        const params = new URLSearchParams({
          lat: String(target.lat),
          lon: String(target.lon),
          city: target.name,
          country: target.country,
          demo: String(demoFlag),
        });
        const res = await apiFetch(`/api/air-quality?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (refreshId !== refreshIdRef.current) return;
        setAirQuality(data.airQuality);
        setAlerts(data.alerts ?? []);
      } catch (err) {
        if (refreshId !== refreshIdRef.current) return;
        setAqError(err instanceof Error ? err.message : 'Failed to load air quality data');
      } finally {
        if (refreshId === refreshIdRef.current) setLoadingAq(false);
      }
    },
    [activeCity, settings.forceDemoMode]
  );

  useEffect(() => {
    let active = true;
    let preferredTheme: UserSettings['theme'] = 'light';
    try {
      const saved = window.localStorage.getItem('breathewise-theme');
      preferredTheme =
        saved === 'dark' || saved === 'light'
          ? saved
          : window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    } catch {
      preferredTheme = 'light';
    }
    (async () => {
      try {
        const res = await apiFetch('/api/settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (active && data.settings) {
            const hydrated = { ...data.settings, theme: preferredTheme } as UserSettings;
            setSettings(hydrated);
            setActiveCityState(hydrated.defaultCity);
            await refreshAirQuality(hydrated.defaultCity, hydrated.forceDemoMode);
            return;
          }
        }
      } catch {
        // Use defaults
      }
      if (active) {
        setSettings((prev) => ({ ...prev, theme: preferredTheme }));
        await refreshAirQuality(DEFAULT_USER_SETTINGS.defaultCity, false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveCity = useCallback(
    (city: CityLocation) => {
      setActiveCityState(city);
      void refreshAirQuality(city, settings.forceDemoMode);
    },
    [refreshAirQuality, settings.forceDemoMode]
  );

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>): Promise<boolean> => {
      try {
        const res = await apiFetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setSettings(data.settings);
        if (patch.defaultCity || typeof patch.forceDemoMode === 'boolean') {
          await refreshAirQuality(
            data.settings.defaultCity,
            data.settings.forceDemoMode
          );
        }
        return true;
      } catch {
        return false;
      }
    },
    [refreshAirQuality]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    void updateSettings({ theme: nextTheme });
  }, [settings.theme, updateSettings]);

  const toggleDemoMode = useCallback(async () => {
    const nextDemo = !settings.forceDemoMode;
    await updateSettings({ forceDemoMode: nextDemo });
  }, [settings.forceDemoMode, updateSettings]);

  const requestGeolocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoStatus('Browser geolocation unavailable. Use city search instead.');
      return;
    }
    setGeoStatus('Requesting location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const located: CityLocation = {
          name: 'My Current Area',
          country: 'GPS',
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
        };
        setGeoStatus('Location updated');
        setActiveCity(located);
        setTimeout(() => setGeoStatus(null), 3500);
      },
      () => {
        setGeoStatus('Location permission declined. Showing selected city.');
        setTimeout(() => setGeoStatus(null), 4000);
      },
      { timeout: 8000 }
    );
  }, [setActiveCity]);

  return (
    <BreatheWiseContext.Provider
      value={{
        settings,
        activeCity,
        airQuality,
        alerts,
        loadingAq,
        aqError,
        setActiveCity,
        refreshAirQuality,
        updateSettings,
        toggleTheme,
        toggleDemoMode,
        requestGeolocation,
        geoStatus,
      }}
    >
      {children}
    </BreatheWiseContext.Provider>
  );
}

export function useBreatheWise() {
  const ctx = useContext(BreatheWiseContext);
  if (!ctx) {
    throw new Error('useBreatheWise must be used inside BreatheWiseProvider');
  }
  return ctx;
}
