'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
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

function readStoredTheme(): UserSettings['theme'] {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem('breathewise-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function BreatheWiseProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => ({
    ...DEFAULT_USER_SETTINGS,
    theme: readStoredTheme(),
  }));
  const [activeCity, setActiveCityState] = useState<CityLocation>(FEATURED_CITIES[0]);
  const [airQuality, setAirQuality] = useState<AirQualityPayload | null>(null);
  const [alerts, setAlerts] = useState<IntelligentAlert[]>([]);
  const [loadingAq, setLoadingAq] = useState<boolean>(true);
  const [aqError, setAqError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const refreshIdRef = useRef(0);
  const settingsWriteIdRef = useRef(0);
  const themeTogglePendingRef = useRef(false);
  const demoTogglePendingRef = useRef(false);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
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
      const targetChanged =
        target.name !== activeCity.name || target.lat !== activeCity.lat || target.lon !== activeCity.lon;
      const demoChanged = demoFlag !== settings.forceDemoMode;
      setLoadingAq(true);
      setAqError(null);
      if (targetChanged || demoChanged) setAirQuality(null);
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
    const preferredTheme = readStoredTheme();
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
      const writeId = ++settingsWriteIdRef.current;
      try {
        const res = await apiFetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (writeId === settingsWriteIdRef.current) {
          setSettings((prev) => ({
            ...data.settings,
            theme: typeof patch.theme === 'undefined' ? prev.theme : data.settings.theme,
          }));
        }
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
    if (themeTogglePendingRef.current) return;
    themeTogglePendingRef.current = true;
    const previous = settings.theme;
    const nextTheme = previous === 'dark' ? 'light' : 'dark';
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
    void updateSettings({ theme: nextTheme })
      .then((ok) => {
        if (!ok) setSettings((prev) => ({ ...prev, theme: previous }));
      })
      .finally(() => {
        themeTogglePendingRef.current = false;
      });
  }, [settings.theme, updateSettings]);

  const toggleDemoMode = useCallback(async () => {
    if (demoTogglePendingRef.current) return;
    demoTogglePendingRef.current = true;
    const nextDemo = !settings.forceDemoMode;
    try {
      await updateSettings({ forceDemoMode: nextDemo });
    } finally {
      demoTogglePendingRef.current = false;
    }
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
