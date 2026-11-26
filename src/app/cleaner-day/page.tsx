'use client';

import React, { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Coins,
  Info,
  Leaf,
  Loader2,
  ShieldAlert,
  Sparkles,
  Sunrise,
  Sun,
  Sunset,
  Wind,
} from 'lucide-react';
import { useBreatheWise } from '@/components/BreatheWiseProvider';
import { apiFetch } from '@/lib/client-api';
import type { BudgetTier, DailyRoutineResponse, SensitivityGroup } from '@/types/breathewise';

const ACTIVITIES = [
  { id: 'outdoor_exercise', label: 'Outdoor Exercise / Run' },
  { id: 'commute', label: 'Daily Work / School Commute' },
  { id: 'cooking', label: 'Home Cooking' },
  { id: 'kids_outdoor', label: 'Family / Kids Outdoor Time' },
];

export default function CleanerDayPage() {
  const { activeCity, settings } = useBreatheWise();
  const [sensitivityGroup, setSensitivityGroup] = useState<SensitivityGroup>(
    settings.sensitivityGroup
  );
  const [budgetTier, setBudgetTier] = useState<BudgetTier>(settings.budgetTier);
  const [commuteMode, setCommuteMode] = useState<'car' | 'transit' | 'walk_bike' | 'remote'>(
    'transit'
  );
  const [plannedActivities, setPlannedActivities] = useState<string[]>([
    'outdoor_exercise',
    'commute',
    'cooking',
  ]);
  const [routine, setRoutine] = useState<DailyRoutineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateRoutine() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: activeCity,
          sensitivityGroup,
          budgetTier,
          commuteMode,
          plannedActivities,
          forceDemoMode: settings.forceDemoMode,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'Could not generate a routine. Please try again.');
        return;
      }
      setRoutine(data.routine);
    } catch {
      setError('Network error. Could not generate a routine.');
    } finally {
      setLoading(false);
    }
  }

  function toggleActivity(id: string) {
    setPlannedActivities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function getTimeIcon(timeOfDay: 'Morning' | 'Afternoon' | 'Evening') {
    if (timeOfDay === 'Morning') return <Sunrise className="h-5 w-5 text-amber-500" />;
    if (timeOfDay === 'Afternoon') return <Sun className="h-5 w-5 text-sky-500" />;
    return <Sunset className="h-5 w-5 text-indigo-500" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          SIGNATURE FEATURE
        </div>
        <h1 className="mt-2 text-h1 text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarClock className="h-6 w-6 text-emerald-600" />
          My Cleaner Day Planner
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Converts hourly air-quality forecasts for <strong>{activeCity.name}</strong> into a practical Morning, Afternoon, and Evening routine with transparent costs, benefits, and caveats.
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-3xl border border-emerald-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Household Sensitivity
            </label>
            <select
              value={sensitivityGroup}
              onChange={(e) => setSensitivityGroup(e.target.value as SensitivityGroup)}
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
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Commute Mode Today
            </label>
            <select
              value={commuteMode}
              onChange={(e) =>
                setCommuteMode(e.target.value as 'car' | 'transit' | 'walk_bike' | 'remote')
              }
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="transit">Public Transit (Bus / Metro)</option>
              <option value="walk_bike">Walking / Cycling</option>
              <option value="car">Personal Vehicle</option>
              <option value="remote">Working / Studying from Home</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Budget Preference
            </label>
            <select
              value={budgetTier}
              onChange={(e) => setBudgetTier(e.target.value as BudgetTier)}
              className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="free_first">Free Actions Only ($0)</option>
              <option value="balanced">Balanced (Free + Low-Cost)</option>
              <option value="advanced">Include HEPA / Equipment</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void generateRoutine()}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Today’s Schedule
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Planned Activities:</span>
          {ACTIVITIES.map((act) => {
            const active = plannedActivities.includes(act.id);
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => toggleActivity(act.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                }`}
              >
                {act.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      )}

      {!routine && !loading && (
        <div className="rounded-3xl border border-dashed border-emerald-300 bg-white p-8 text-center dark:border-emerald-800 dark:bg-slate-900">
          <CalendarClock className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Choose your preferences above, then generate a forecast-aware schedule.
          </p>
          <button
            type="button"
            onClick={() => void generateRoutine()}
            className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Generate Today’s Schedule
          </button>
        </div>
      )}

      {/* Routine Output */}
      {routine && (
        <div className="space-y-5">
          {/* Summary Windows */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/30">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Daily Overview ({routine.dataMode.toUpperCase()})
              </div>
              <p className="mt-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                {routine.summary}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-800/50 dark:bg-sky-950/30">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                <Sun className="h-3.5 w-3.5" />
                Best Outdoor Window
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {routine.bestOutdoorWindow}
              </p>
            </div>
            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 dark:border-teal-800/50 dark:bg-teal-950/30">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                <Wind className="h-3.5 w-3.5" />
                Ventilation Guidance
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {routine.bestVentilationWindow}
              </p>
            </div>
          </div>

          {/* Schedule Cards */}
          <div className="space-y-4">
            {routine.items.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-emerald-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    {getTimeIcon(item.timeOfDay)}
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.timeOfDay}
                      </span>
                      <span className="ml-2 text-xs font-mono text-slate-500">
                        {item.timeWindow}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Forecast ~{item.forecastAqi} AQI
                  </span>
                </div>

                <h3 className="mt-3 text-h3 text-emerald-800 dark:text-emerald-300">
                  {item.action}
                </h3>
                <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">
                  {item.explanation}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-xl bg-emerald-50/70 p-3 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Expected Benefit
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">
                      {item.expectedBenefit}
                    </p>
                  </div>

                  <div className="rounded-xl bg-sky-50/70 p-3 dark:bg-sky-950/30">
                    <div className="flex items-center gap-1 font-bold text-sky-800 dark:text-sky-300">
                      <Coins className="h-3.5 w-3.5" />
                      Estimated Cost
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">{item.estimatedCost}</p>
                  </div>

                  <div className="rounded-xl bg-teal-50/70 p-3 dark:bg-teal-950/30">
                    <div className="flex items-center gap-1 font-bold text-teal-800 dark:text-teal-300">
                      <Leaf className="h-3.5 w-3.5" />
                      Environmental Impact
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">
                      {item.environmentalImpact}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50/70 p-2.5 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-200">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Important Limitation:</strong> {item.caveat}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <ShieldAlert className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
            <span>{routine.safetyDisclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
