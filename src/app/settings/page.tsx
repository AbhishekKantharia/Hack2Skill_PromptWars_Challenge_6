'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, FlaskConical, Lock, Moon, Settings, Sun } from 'lucide-react';
import { useBreatheWise } from '@/components/BreatheWiseProvider';
import { FEATURED_CITIES, SPACE_TYPE_OPTIONS } from '@/lib/demo-data';
import type {
  AlertPreferences,
  BudgetTier,
  SensitivityGroup,
  SpaceType,
} from '@/types/breathewise';

export default function SettingsPage() {
  const { settings, updateSettings, toggleTheme } = useBreatheWise();
  const [savedToast, setSavedToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [draftAlerts, setDraftAlerts] = useState<AlertPreferences | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const savePatch = useCallback(
    async (
      patch: Parameters<typeof updateSettings>[0],
      message = 'Settings Saved',
      clearDraft = false
    ) => {
      const ok = await updateSettings(patch);
      setSavedToast(ok ? { message, ok } : { message: 'Could not save settings. Please try again.', ok });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setSavedToast(null), 3000);
      if (ok && clearDraft) setDraftAlerts(null);
    },
    [updateSettings]
  );

  const savePatchRef = useRef(savePatch);

  useEffect(() => {
    savePatchRef.current = savePatch;
  }, [savePatch]);

  const commitAlerts = useCallback(() => {
    if (draftAlerts) void savePatchRef.current({ alerts: draftAlerts }, 'Alert preferences saved', true);
  }, [draftAlerts]);

  useEffect(() => {
    if (!draftAlerts) return;
    const timer = setTimeout(commitAlerts, 400);
    return () => clearTimeout(timer);
  }, [draftAlerts, commitAlerts]);

  const alerts = draftAlerts ?? settings.alerts;
  const isKnownCity = FEATURED_CITIES.some(
    (c) => c.name === settings.defaultCity.name && c.lat === settings.defaultCity.lat
  );

  function setAlertValue(key: keyof AlertPreferences, value: number | boolean) {
    setDraftAlerts((prev) => {
      const next = { ...(prev ?? settings.alerts), [key]: value };
      if (key === 'highAqiThreshold' && typeof value === 'number') {
        if (next.severeAqiThreshold <= value) next.severeAqiThreshold = value + 1;
        if (next.favorableVentilationMaxAqi >= value) {
          next.favorableVentilationMaxAqi = Math.max(10, value - 1);
        }
      }
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-emerald-600" />
            User Settings &amp; Alert Preferences
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Customize sensitivity profiles, alert thresholds, units, theme, and Live/Demo data mode.
          </p>
        </div>

        {savedToast && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              savedToast.ok
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
            }`}
          >
            {savedToast.ok ? <Check className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            {savedToast.message}
          </span>
        )}
      </div>

      {/* Profile & Localization */}
      <div className="rounded-3xl border border-emerald-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-h2 text-slate-900 dark:text-white">
          Profile &amp; Environmental Preferences
        </h2>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Display Name (saved to your private server-side session)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={48}
              value={displayName ?? settings.displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="button"
              onClick={() => {
                const name = (displayName ?? settings.displayName).trim();
                if (name) void savePatch({ displayName: name });
              }}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Save
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Sensitivity Profile
            </label>
            <select
              value={settings.sensitivityGroup}
              onChange={(e) =>
                void savePatch({ sensitivityGroup: e.target.value as SensitivityGroup })
              }
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="general">General Adult</option>
              <option value="children">Families with Children</option>
              <option value="older_adults">Older Adults (65+)</option>
              <option value="respiratory">Asthma / Respiratory Sensitivity</option>
              <option value="outdoor_athletes">Outdoor Runners / Cyclists</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Recommendation Budget Tier
            </label>
            <select
              value={settings.budgetTier}
              onChange={(e) =>
                void savePatch({ budgetTier: e.target.value as BudgetTier })
              }
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="free_first">Free Actions First ($0)</option>
              <option value="balanced">Balanced (Free + Affordable)</option>
              <option value="advanced">Include HEPA / Equipment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Default Home City
            </label>
            <select
              value={settings.defaultCity.name}
              onChange={(e) => {
                const found = FEATURED_CITIES.find((c) => c.name === e.target.value);
                if (found) void savePatch({ defaultCity: found, setupComplete: true }, 'Air plan updated');
              }}
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {!isKnownCity && (
                <option value={settings.defaultCity.name}>
                  {settings.defaultCity.name}, {settings.defaultCity.country || 'Selected area'}
                </option>
              )}
              {FEATURED_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}, {c.country}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Who is this air plan for?
            </label>
            <select
              value={settings.spaceType}
              onChange={(e) =>
                void savePatch(
                  { spaceType: e.target.value as SpaceType, setupComplete: true },
                  'Air plan updated'
                )
              }
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {SPACE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              People Covered
            </label>
            <input
              type="number"
              min={1}
              max={100000}
              value={settings.groupSize}
              onChange={(e) =>
                void savePatch(
                  {
                    groupSize: Math.min(100000, Math.max(1, Number(e.target.value) || 1)),
                    setupComplete: true,
                  },
                  'Air plan updated'
                )
              }
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Weather Units
            </label>
            <select
              value={settings.units}
              onChange={(e) =>
                void savePatch({ units: e.target.value as 'metric' | 'imperial' })
              }
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="metric">Metric (°C, km/h, µg/m³)</option>
              <option value="imperial">Imperial (°F, mph, µg/m³)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appearance & Data Mode */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-emerald-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              Appearance Theme
            </div>
            <div className="text-xs text-slate-500">
              Currently: {settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-800 hover:border-sky-400 dark:border-slate-700 dark:text-slate-100"
          >
            {settings.theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" /> Switch to Light
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-600" /> Switch to Dark
              </>
            )}
          </button>
        </div>

        <div className="rounded-3xl border border-emerald-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              Demo Mode Override
            </div>
            <div className="text-xs text-slate-500">
              {settings.forceDemoMode
                ? 'Using labeled sample data'
                : 'Using live Open-Meteo environmental APIs'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void savePatch({ forceDemoMode: !settings.forceDemoMode })}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              settings.forceDemoMode
                ? 'bg-amber-500 text-slate-950'
                : 'bg-emerald-600 text-white'
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            {settings.forceDemoMode ? 'Demo ON' : 'Live ON'}
          </button>
        </div>
      </div>

      {/* Intelligent Alerts Configuration */}
      <div className="rounded-3xl border border-emerald-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Bell className="h-5 w-5 text-emerald-600" />
          Intelligent Alert Thresholds
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Elevated AQI Advisory Threshold ({alerts.highAqiThreshold} AQI)
            </label>
            <input
              type="range"
              min={50}
              max={180}
              value={alerts.highAqiThreshold}
              onChange={(e) => setAlertValue('highAqiThreshold', Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Severe Pollution Alert Threshold ({alerts.severeAqiThreshold} AQI)
            </label>
            <input
              type="range"
              min={Math.max(150, alerts.highAqiThreshold + 1)}
              max={300}
              value={Math.max(alerts.severeAqiThreshold, alerts.highAqiThreshold + 1)}
              onChange={(e) => setAlertValue('severeAqiThreshold', Number(e.target.value))}
              className="w-full accent-rose-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Unusual Change Delta ({alerts.spikeDeltaThreshold} AQI shift)
            </label>
            <input
              type="range"
              min={15}
              max={80}
              value={alerts.spikeDeltaThreshold}
              onChange={(e) => setAlertValue('spikeDeltaThreshold', Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Favorable Ventilation Window Max ({alerts.favorableVentilationMaxAqi} AQI)
            </label>
            <input
              type="range"
              min={30}
              max={100}
              value={alerts.favorableVentilationMaxAqi}
              onChange={(e) => setAlertValue('favorableVentilationMaxAqi', Number(e.target.value))}
              className="w-full accent-sky-600"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 pt-2">
          {[
            { key: 'enableHighAqi', label: 'Enable High AQI Advisories' },
            { key: 'enableSevereAqi', label: 'Enable Severe Pollution Alerts' },
            { key: 'enableSpikeAlerts', label: 'Enable Unusual Change Detection' },
            { key: 'enableForecastSpikes', label: 'Enable Forecasted Spike Warnings' },
            { key: 'enableVentilationWindows', label: 'Enable Favorable Ventilation Windows' },
          ].map((toggle) => {
            const k = toggle.key as keyof typeof settings.alerts;
            const checked = Boolean(settings.alerts[k]);
            return (
              <label
                key={toggle.key}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium dark:border-slate-800 dark:bg-slate-800/50 cursor-pointer"
              >
                <span>{toggle.label}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    void savePatch({
                      alerts: {
                        ...settings.alerts,
                        [k]: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Privacy Statement */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-100">
        <Lock className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
        <div>
          <strong>Privacy:</strong> Preferences and chat history are isolated by a signed, HttpOnly session cookie and are not shared between visitors; the cookie persists for up to one year. Browser geolocation is optional, used only on demand to fetch environmental data, and is never published. Community reports accept neighborhood-level names only; coordinate-like strings are redacted.
        </div>
      </div>
    </div>
  );
}
