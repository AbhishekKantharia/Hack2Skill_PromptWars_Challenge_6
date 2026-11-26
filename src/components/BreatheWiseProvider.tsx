'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
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
import { apiFetch, prefetchApiGet } from '@/lib/client-api';

interface BreatheWiseContextValue {
  settings: UserSettings;
  activeCity: CityLocation;
  airQuality: AirQualityPayload | null;
  alerts: IntelligentAlert[];
  loadingAq: boolean;
  aqError: string | null;
  setActiveCity: (city: CityLocation) => void;
  refreshAirQuality: (cityOverride?: CityLocation, demoOverride?: boolean) => Promise<void>;
  prefetchAirQuality: (cityOverride?: CityLocation, demoOverride?: boolean) => void;
  updateSettings: (patch: Partial<UserSettings>) => Promise<boolean>;
  toggleTheme: () => void;
  toggleDemoMode: () => Promise<void>;
}

const BreatheWiseContext = createContext<BreatheWiseContextValue | null>(null);
const EMPTY_ALERTS: IntelligentAlert[] = [];

export function airQualityApiPath(city: CityLocation, demo: boolean): string {
  const params = new URLSearchParams({
    lat: String(city.lat),
    lon: String(city.lon),
    city: city.name,
    country: city.country,
    demo: String(demo),
  });
  return `/api/air-quality?${params.toString()}`;
}

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

function cityMatches(a: CityLocation, b: CityLocation): boolean {
  return a.name === b.name && a.lat === b.lat && a.lon === b.lon;
}

function settingsMatch(a: UserSettings, b: UserSettings): boolean {
  return (
    a.forceDemoMode === b.forceDemoMode &&
    a.defaultCity.name === b.defaultCity.name &&
    a.defaultCity.lat === b.defaultCity.lat &&
    a.defaultCity.lon === b.defaultCity.lon &&
    JSON.stringify(a.alerts) === JSON.stringify(b.alerts) &&
    a.theme === b.theme
  );
}

export function BreatheWiseProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => ({
    ...DEFAULT_USER_SETTINGS,
    theme: readStoredTheme(),
  }));
  const [activeCity, setActiveCityState] = useState<CityLocation>(FEATURED_CITIES[0]);
  const [airQuality, setAirQuality] = useState<AirQualityPayload | null>(null);
  const [alerts, setAlerts] = useState<IntelligentAlert[]>(EMPTY_ALERTS);
  const [loadingAq, setLoadingAq] = useState<boolean>(true);
  const [aqError, setAqError] = useState<string | null>(null);
  const activeCityRef = useRef(activeCity);
  const settingsRef = useRef(settings);
  const refreshIdRef = useRef(0);
  const settingsWriteIdRef = useRef(0);
  const themeTogglePendingRef = useRef(false);
  const demoTogglePendingRef = useRef(false);

  useEffect(() => {
    activeCityRef.current = activeCity;
  }, [activeCity]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    try {
      window.localStorage.setItem('breathewise-theme', settings.theme);
    } catch {
      return;
    }
  }, [settings.theme]);

  const refreshAirQuality = useCallback(
    async (cityOverride?: CityLocation, demoOverride?: boolean) => {
      const target = cityOverride ?? activeCityRef.current;
      const demoFlag = demoOverride ?? settingsRef.current.forceDemoMode;
      const refreshId = ++refreshIdRef.current;
      setLoadingAq(true);
      setAqError(null);
      try {
        const res = await apiFetch(airQualityApiPath(target, demoFlag), {
          cache: 'no-store',
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (refreshId !== refreshIdRef.current) return;
        setAirQuality(data.airQuality);
        setAlerts(data.alerts ?? EMPTY_ALERTS);
      } catch (err) {
        if (refreshId !== refreshIdRef.current) return;
        setAqError(err instanceof Error ? err.message : 'Failed to load air quality data');
      } finally {
        if (refreshId === refreshIdRef.current) setLoadingAq(false);
      }
    },
    []
  );

  const prefetchAirQuality = useCallback((cityOverride?: CityLocation, demoOverride?: boolean) => {
    const target = cityOverride ?? activeCityRef.current;
    const demoFlag = demoOverride ?? settingsRef.current.forceDemoMode;
    void prefetchApiGet(airQualityApiPath(target, demoFlag));
  }, []);

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
            settingsRef.current = hydrated;
            setActiveCityState(hydrated.defaultCity);
            activeCityRef.current = hydrated.defaultCity;
            await refreshAirQuality(hydrated.defaultCity, hydrated.forceDemoMode);
            return;
          }
        }
      } catch {
        return;
      }
      if (active) {
        await refreshAirQuality(DEFAULT_USER_SETTINGS.defaultCity, false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshAirQuality]);

  const setActiveCity = useCallback(
    (city: CityLocation) => {
      if (cityMatches(city, activeCityRef.current)) return;
      activeCityRef.current = city;
      setActiveCityState(city);
      void refreshAirQuality(city);
    },
    [refreshAirQuality]
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
        const nextSettings: UserSettings = {
          ...data.settings,
          theme: (typeof patch.theme === 'undefined'
            ? settingsRef.current.theme
            : data.settings.theme) as UserSettings['theme'],
        };
        if (writeId === settingsWriteIdRef.current) {
          setSettings((prev) => (settingsMatch(prev, nextSettings) ? prev : nextSettings));
          settingsRef.current = nextSettings;
        }
        if (patch.defaultCity || typeof patch.forceDemoMode === 'boolean') {
          activeCityRef.current = data.settings.defaultCity;
          setActiveCityState(data.settings.defaultCity);
          await refreshAirQuality(data.settings.defaultCity, data.settings.forceDemoMode);
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
    const previous = settingsRef.current.theme;
    const nextTheme = previous === 'dark' ? 'light' : 'dark';
    const optimistic = { ...settingsRef.current, theme: nextTheme };
    settingsRef.current = optimistic;
    setSettings(optimistic);
    void updateSettings({ theme: nextTheme })
      .then((ok) => {
        if (!ok) {
          const reverted = { ...settingsRef.current, theme: previous };
          settingsRef.current = reverted;
          setSettings(reverted);
        }
      })
      .finally(() => {
        themeTogglePendingRef.current = false;
      });
  }, [updateSettings]);

  const toggleDemoMode = useCallback(async () => {
    if (demoTogglePendingRef.current) return;
    demoTogglePendingRef.current = true;
    const nextDemo = !settingsRef.current.forceDemoMode;
    try {
      await updateSettings({ forceDemoMode: nextDemo });
    } finally {
      demoTogglePendingRef.current = false;
    }
  }, [updateSettings]);

  const value = useMemo(
    () => ({
      settings,
      activeCity,
      airQuality,
      alerts,
      loadingAq,
      aqError,
      setActiveCity,
      refreshAirQuality,
      prefetchAirQuality,
      updateSettings,
      toggleTheme,
      toggleDemoMode,
    }),
    [
      settings,
      activeCity,
      airQuality,
      alerts,
      loadingAq,
      aqError,
      setActiveCity,
      refreshAirQuality,
      prefetchAirQuality,
      updateSettings,
      toggleTheme,
      toggleDemoMode,
    ]
  );

  return <BreatheWiseContext.Provider value={value}>{children}</BreatheWiseContext.Provider>;
}

export function useBreatheWise() {
  const ctx = useContext(BreatheWiseContext);
  if (!ctx) {
    throw new Error('useBreatheWise must be used inside BreatheWiseProvider');
  }
  return ctx;
}
