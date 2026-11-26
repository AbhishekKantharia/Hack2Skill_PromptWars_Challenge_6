'use client';

import React from 'react';
import {
  AppWindow,
  BusFront,
  Clock3,
  CookingPot,
  ExternalLink,
  Filter,
  ShieldCheck,
  Wind,
} from 'lucide-react';
import { PrefetchLink } from '@/components/PrefetchLink';
import { useBreatheWise } from '@/components/BreatheWiseProvider';
import type { DailyImpactRecommendation } from '@/types/breathewise';

const ICONS: Record<DailyImpactRecommendation['icon'], React.ComponentType<{ className?: string }>> = {
  clock: Clock3,
  window: AppWindow,
  filter: Filter,
  mask: Wind,
  transit: BusFront,
  cooking: CookingPot,
};

export function DailyRecommendations() {
  const { recommendations, airQuality } = useBreatheWise();

  if (!airQuality || recommendations.length === 0) return null;

  return (
    <section className="rounded-3xl border border-emerald-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-h2 text-slate-900 dark:text-white">Today’s cleaner-air plan</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Fixed calculations from your live or labeled demo readings. AI only explains the results.
          </p>
        </div>
        <PrefetchLink
          href="/assistant"
          apiPath="/api/chat"
          className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-300"
        >
          Ask AI to explain this
        </PrefetchLink>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {recommendations.map((rec) => {
          const Icon = ICONS[rec.icon];
          return (
            <article
              key={rec.id}
              className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-white p-2 shadow-xs dark:bg-slate-800">
                  <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{rec.title}</div>
                  <div className="mt-1 text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                    {rec.impact.headline}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{rec.impact.detail}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-200">
                <p>
                  <strong>Do this:</strong> {rec.action}
                </p>
                <p>{rec.plainLanguage}</p>
                <p className="text-slate-500 dark:text-slate-400">{rec.whyItHelps}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-micro font-semibold text-emerald-700 dark:text-emerald-300">
                  {rec.cost}
                </span>
                <span className="rounded-full bg-sky-500/10 px-2 py-1 text-micro font-semibold text-sky-700 dark:text-sky-300">
                  {rec.bestFor}
                </span>
                <span className="rounded-full bg-slate-200/70 px-2 py-1 text-micro font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {rec.dataMode === 'demo' ? 'Labeled demo input' : 'Live input'}
                </span>
              </div>

              <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <summary className="cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100">
                  See formula and sources
                </summary>
                <div className="mt-2 space-y-2 text-micro text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>Formula:</strong> {rec.impact.formula}
                  </p>
                  <p>
                    <strong>Unit:</strong> {rec.impact.unit}
                  </p>
                  <ul className="list-disc space-y-1 pl-4">
                    {rec.assumptions.map((assumption) => (
                      <li key={assumption}>{assumption}</li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    {rec.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline dark:text-sky-300"
                      >
                        {source.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
