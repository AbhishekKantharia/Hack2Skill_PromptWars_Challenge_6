'use client';

import React, { useState } from 'react';
import { AlertCircle, Check, Flame, Home, Shield, Sparkles, Wind } from 'lucide-react';
import { INDOOR_RECOMMENDATIONS, type IndoorRecommendation } from '@/lib/indoor-and-learn-data';
import { useBreatheWise } from '@/components/BreatheWiseProvider';

export default function IndoorAdvisorPage() {
  const { airQuality } = useBreatheWise();
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'affordable' | 'advanced'>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

  const items = INDOOR_RECOMMENDATIONS.filter((rec) => {
    if (tierFilter !== 'all' && rec.tier !== tierFilter) return false;
    if (catFilter !== 'all' && rec.category !== catFilter) return false;
    return true;
  });

  function tierBadge(tier: IndoorRecommendation['tier']) {
    if (tier === 'free') {
      return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300';
    }
    if (tier === 'affordable') {
      return 'bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300';
    }
    return 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-300';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Home className="h-6 w-6 text-emerald-600" />
          Indoor Air Quality Advisor
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Practical home strategies organized into <strong>Free</strong>, <strong>Affordable</strong>, and <strong>Advanced</strong> categories — including HEPA realities, cooking smoke control, dust reduction, and explicit limitations of every measure.
        </p>
      </div>

      {/* Live Outdoor Context Bar */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-sky-600 shrink-0" />
          <div>
            <strong>Outdoor Baseline ({airQuality?.location.name ?? 'City'}):</strong>{' '}
            {airQuality ? `${airQuality.aqi} US AQI (${airQuality.category})` : 'Loading...'}.{' '}
            <span className="text-xs opacity-85">
              {airQuality && airQuality.aqi <= 75
                ? 'Outdoor air is currently favorable for brief cross-ventilation if no street smoke is nearby.'
                : 'Keep exterior windows mostly closed during elevated outdoor AQI; prioritize source control & indoor filtration.'}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'free', 'affordable', 'advanced'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTierFilter(t)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition ${
                tierFilter === t
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {t === 'all' ? 'All Budgets' : `${t} Tier`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'filtration', label: 'HEPA & Filtration' },
            { id: 'ventilation', label: 'Ventilation' },
            { id: 'cooking', label: 'Cleaner Cooking' },
            { id: 'dust', label: 'Dust Reduction' },
            { id: 'smoke', label: 'Indoor Smoke' },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatFilter(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                catFilter === c.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendation Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((rec) => (
          <div
            key={rec.id}
            className="flex flex-col justify-between rounded-3xl border border-emerald-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${tierBadge(
                    rec.tier
                  )}`}
                >
                  {rec.tier} · {rec.estimatedCost}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {rec.category}
                </span>
              </div>

              <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                {rec.title}
              </h2>

              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <strong>Why it helps:</strong> {rec.whyItWorks}
              </p>

              <ul className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                {rec.actionSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Limitations:</strong> {rec.limitations}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* HEPA vs Gaseous Pollutant Reference Box */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Shield className="h-5 w-5 text-emerald-600" />
            Understanding HEPA &amp; MERV-13 Ratings
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            True HEPA filters trap ≥99.95% of airborne particles (PM2.5, smoke, dust, pollen) per pass, while affordable MERV-13 pleated furnace filters capture ~85%+ of fine smoke particles in DIY box-fan builds. Always size purifiers by CADR (Clean Air Delivery Rate) relative to room square footage, and avoid ozone-producing ionizers.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Flame className="h-5 w-5 text-orange-500" />
            Why Source Control Beats Filtration Alone
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Filters cannot keep up if smoke is actively generated inside the room, and particle filters do not remove Carbon Monoxide (CO) or Nitrogen Dioxide (NO₂). External kitchen ventilation, avoiding indoor incense/smoking, and working CO detectors remain essential.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>
          Have asthma, allergies, or severe dampness/mold indoors? Consult a healthcare provider or qualified indoor environmental inspector.
        </span>
      </div>
    </div>
  );
}
