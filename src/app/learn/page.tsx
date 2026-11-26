'use client';

import React from 'react';
import { BookOpen, Info, ShieldCheck } from 'lucide-react';
import { POLLUTANT_GUIDES } from '@/lib/indoor-and-learn-data';

const AQI_BANDS = [
  { range: '0–50', label: 'Good', color: 'bg-emerald-500', note: 'Minimal risk for general public; great for outdoor exercise & natural ventilation.' },
  { range: '51–100', label: 'Moderate', color: 'bg-amber-400', note: 'Acceptable overall; unusually sensitive individuals may monitor symptoms.' },
  { range: '101–150', label: 'Unhealthy for Sensitive Groups', color: 'bg-orange-500', note: 'Children, older adults, and people with respiratory/heart conditions should ease exertion.' },
  { range: '151–200', label: 'Unhealthy', color: 'bg-rose-500', note: 'Everyone may experience effects; shift strenuous workouts indoors.' },
  { range: '201–300', label: 'Very Unhealthy', color: 'bg-violet-600', note: 'Health alert: avoid prolonged outdoor exertion; use HEPA filtration & fitted N95 masks outdoors.' },
  { range: '301+', label: 'Hazardous', color: 'bg-red-900', note: 'Emergency conditions: stay indoors with clean air filtration and follow public health guidance.' },
];

export default function LearningCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-emerald-600" />
          Environmental Learning Center
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Evidence-based guides on urban air pollutants, how AQI scales work, why forecast models carry uncertainty, and how to protect your household responsibly.
        </p>
      </div>

      {/* Pollutant Encyclopedia */}
      <section className="space-y-3">
        <h2 className="text-h2 text-slate-900 dark:text-white">
          Key Urban Pollutants &amp; WHO 2021 Reference Levels
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {POLLUTANT_GUIDES.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-emerald-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                  {p.symbol}
                </span>
                <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-micro font-semibold text-sky-700 dark:text-sky-300">
                  {p.whoGuideline24h}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{p.name}</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                <strong>Common Sources:</strong> {p.sources}
              </p>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                <strong>Why It Matters:</strong> {p.whyItMatters}
              </p>
              <div className="mt-3 rounded-xl bg-emerald-50/70 p-2.5 text-xs text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200">
                <strong>Practical Step:</strong> {p.practicalTip}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* US EPA AQI Scale */}
      <section className="rounded-3xl border border-emerald-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-h2 text-slate-900 dark:text-white mb-3">
          Understanding the US EPA Air Quality Index (AQI)
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {AQI_BANDS.map((b) => (
            <div
              key={b.range}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800"
            >
              <span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${b.color}`} />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {b.range} — {b.label}
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{b.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Uncertainty & Medical Boundaries */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 text-xs leading-relaxed text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-100">
          <div className="flex items-center gap-2 text-sm font-bold mb-2">
            <Info className="h-4 w-4 text-sky-600" />
            Why Measurements &amp; Forecasts Have Uncertainty
          </div>
          <p>
            Global atmospheric models (such as CAMS / Open-Meteo) evaluate 11–40 km grid cells. A busy diesel intersection, neighborhood wood stove, or kitchen frying pan can create localized pollution much higher than the grid average. Conversely, parks and tree buffers may sit slightly lower. Forecasts also carry ±15–25% uncertainty when winds or inversion heights shift unexpectedly.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-xs leading-relaxed text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          <div className="flex items-center gap-2 text-sm font-bold mb-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Medical &amp; Health Guidance Boundary
          </div>
          <p>
            BreatheWise AI translates public environmental science into everyday planning suggestions. It never diagnoses respiratory or cardiovascular conditions and cannot guarantee health protection. If you or a family member experience persistent coughing, wheezing, chest tightness, or asthma flare-ups, consult a licensed healthcare professional.
          </p>
        </div>
      </div>
    </div>
  );
}
