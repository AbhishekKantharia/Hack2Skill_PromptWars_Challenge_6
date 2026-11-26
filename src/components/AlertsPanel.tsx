'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PrefetchLink } from '@/components/PrefetchLink';
import { AlertTriangle, Bell, CheckCircle2, Info, ShieldAlert, SlidersHorizontal, Wind, X } from 'lucide-react';
import { useBreatheWise } from '@/components/BreatheWiseProvider';
import type { IntelligentAlert } from '@/types/breathewise';

function getAlertStyle(alert: IntelligentAlert) {
  switch (alert.severity) {
    case 'critical':
      return {
        wrapper: 'border-rose-300 bg-rose-50/90 text-rose-950 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100',
        icon: <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
        badge: 'bg-rose-600 text-white',
      };
    case 'warning':
      return {
        wrapper: 'border-amber-300 bg-amber-50/90 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100',
        icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
        badge: 'bg-amber-500 text-slate-950',
      };
    case 'favorable':
      return {
        wrapper: 'border-emerald-300 bg-emerald-50/90 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
        icon: <Wind className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
        badge: 'bg-emerald-600 text-white',
      };
    default:
      return {
        wrapper: 'border-sky-300 bg-sky-50/90 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100',
        icon: <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />,
        badge: 'bg-sky-600 text-white',
      };
  }
}

export function AlertsBellButton() {
  const { alerts } = useBreatheWise();
  const [open, setOpen] = useState(false);

  const urgentCount = useMemo(
    () => alerts.filter((a) => a.severity === 'critical' || a.severity === 'warning').length,
    [alerts]
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open intelligent air quality alerts"
        aria-expanded={open}
        aria-controls="intelligent-alerts-panel"
        title="Intelligent alerts"
        className="relative inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <Bell className="h-4 w-4" />
        {alerts.length > 0 && (
          <span
            className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-micro font-bold text-white ${
              urgentCount > 0 ? 'bg-rose-500' : 'bg-emerald-600'
            }`}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close intelligent alerts"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-slate-950/25"
          />
          <div
            id="intelligent-alerts-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Intelligent air quality alerts"
            className="fixed right-3 top-16 z-50 w-[min(24rem,calc(100vw_-_1.5rem))] max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="min-w-0">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Intelligent Alerts ({alerts.length})
                </span>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Based on your saved thresholds and current forecast.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PrefetchLink
                  href="/settings"
                  apiPath="/api/settings"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Customize
                </PrefetchLink>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close alerts panel"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>No active pollution advisories based on your alert thresholds.</span>
              </div>
            ) : (
              <div className="mt-3 max-h-[min(30rem,calc(100vh_-_7rem))] space-y-2 overflow-y-auto pr-0.5">
                {alerts.map((alert) => {
                  const st = getAlertStyle(alert);
                  return (
                    <div key={alert.id} className={`rounded-xl border p-2.5 text-xs ${st.wrapper}`}>
                      <div className="flex items-start gap-2">
                        {st.icon}
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{alert.title}</span>
                            {alert.metricValue && (
                              <span className={`rounded-md px-1.5 py-0.5 text-micro font-bold ${st.badge}`}>
                                {alert.metricValue}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 opacity-90">{alert.message}</p>
                          <p className="mt-1.5 font-medium">Action: {alert.recommendedAction}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AlertsStrip() {
  const { alerts } = useBreatheWise();
  const [expanded, setExpanded] = useState(false);
  const visibleAlerts = expanded ? alerts : alerts.slice(0, 2);

  return (
    <section
      aria-label="Intelligent air quality alerts"
      className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Bell className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-h3 text-slate-900 dark:text-white">Intelligent Alerts</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-micro font-bold ${
              alerts.length === 0
                ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {alerts.length}
          </span>
        </div>
        <PrefetchLink
          href="/settings"
          apiPath="/api/settings"
          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Customize thresholds
        </PrefetchLink>
      </div>

      {alerts.length === 0 ? (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-semibold">No active advisories right now.</p>
            <p className="mt-1 opacity-90">
              Alerts appear here when your saved thresholds are met, including forecast spikes and favorable ventilation windows.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {visibleAlerts.map((alert) => {
              const st = getAlertStyle(alert);
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs transition ${st.wrapper}`}
                >
                  {st.icon}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{alert.title}</span>
                      {alert.metricValue && (
                        <span className={`rounded-full px-2 py-0.5 text-micro font-semibold ${st.badge}`}>
                          {alert.metricValue}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 opacity-90">{alert.message}</p>
                    <p className="mt-1 font-medium">Recommended: {alert.recommendedAction}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {alerts.length > 2 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-3 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-400 dark:border-slate-700 dark:text-slate-200"
            >
              {expanded ? `Show fewer alerts` : `Show all ${alerts.length} alerts`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
