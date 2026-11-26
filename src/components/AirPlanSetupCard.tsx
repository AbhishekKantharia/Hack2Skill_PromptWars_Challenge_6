'use client';

import React, { useState } from 'react';
import { CheckCircle2, MapPin, Pencil, Users } from 'lucide-react';
import { useBreatheWise } from '@/components/BreatheWiseProvider';
import { apiFetch } from '@/lib/client-api';
import { FEATURED_CITIES, SPACE_TYPE_OPTIONS } from '@/lib/demo-data';
import type { CityLocation, SpaceType } from '@/types/breathewise';

export function AirPlanSetupCard() {
  const { settings, updateSettings, activeCity } = useBreatheWise();
  const [showForm, setShowForm] = useState(false);
  const [cityQuery, setCityQuery] = useState<string | null>(null);
  const [spaceDraft, setSpaceDraft] = useState<SpaceType | null>(null);
  const [groupDraft, setGroupDraft] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showSetupForm = showForm || !settings.setupComplete;
  const resolvedSpace = spaceDraft ?? settings.spaceType;
  const resolvedGroup = groupDraft ?? settings.groupSize;
  const cityLabel = cityQuery ?? settings.defaultCity.name;
  const spaceOption = SPACE_TYPE_OPTIONS.find((option) => option.value === settings.spaceType);

  async function resolveCity(): Promise<CityLocation | null> {
    const term = cityLabel.trim();
    if (!term) return activeCity;
    const featured = FEATURED_CITIES.find(
      (city) => city.name.toLowerCase() === term.toLowerCase()
    );
    if (featured) return featured;
    const res = await apiFetch(`/api/geocode?q=${encodeURIComponent(term)}`);
    if (!res.ok) throw new Error('City search is unavailable right now.');
    const data = await res.json();
    const result = Array.isArray(data.results) ? (data.results[0] as CityLocation) : null;
    return result ?? null;
  }

  async function saveSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const city = await resolveCity();
      if (!city) {
        setStatus('No matching city was found. Try a nearby city name.');
        return;
      }
      const ok = await updateSettings({
        defaultCity: city,
        spaceType: resolvedSpace,
        groupSize: Math.min(100000, Math.max(1, Math.round(resolvedGroup))),
        setupComplete: true,
      });
      setStatus(
        ok
          ? `Your clean-air plan is ready for ${spaceOption?.shortLabel ?? 'your group'}.`
          : 'Could not save your setup. Please try again.'
      );
      if (ok) setShowForm(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save your setup.');
    } finally {
      setSaving(false);
    }
  }

  if (!showSetupForm) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-emerald-200/70 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            Your clean-air plan is ready
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {spaceOption?.label ?? 'Your group'} · {settings.groupSize}{' '}
            {settings.groupSize === 1 ? 'person' : 'people'} · {settings.defaultCity.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200"
        >
          <Pencil className="h-3.5 w-3.5" />
          Change setup
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void saveSetup(event)}
      className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/50 to-sky-50/60 p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:via-emerald-950/30 dark:to-sky-950/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-h2 text-slate-900 dark:text-white">Start with your place and people</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Tell us where you are and who this plan covers. Everything else stays simple and calm.
          </p>
        </div>
        {settings.setupComplete && (
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
            City or neighborhood
          </span>
          <span className="flex items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800">
            <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
            <input
              type="text"
              maxLength={80}
              value={cityLabel}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder="e.g. New Delhi"
              className="w-full min-w-0 bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
            />
          </span>
        </label>

        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Who is this for?
          </span>
          <select
            value={resolvedSpace}
            onChange={(event) => setSpaceDraft(event.target.value as SpaceType)}
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {SPACE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
            People covered
          </span>
          <span className="flex items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800">
            <Users className="h-4 w-4 shrink-0 text-sky-600" />
            <input
              type="number"
              min={1}
              max={100000}
              value={resolvedGroup}
              onChange={(event) =>
                setGroupDraft(Math.min(100000, Math.max(1, Number(event.target.value) || 1)))
              }
              className="w-full min-w-0 bg-transparent px-2 py-2 text-sm text-slate-900 focus:outline-none dark:text-white"
            />
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save my clean-air setup'}
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          No account needed. Saved privately for this browser session.
        </span>
      </div>
      {status && (
        <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">{status}</p>
      )}
    </form>
  );
}
