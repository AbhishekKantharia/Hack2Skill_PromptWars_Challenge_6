'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, CheckCircle2, Info, ShieldAlert, SlidersHorizontal, Wind } from 'lucide-react';
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

  const urgentCount = alerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'warning'
  ).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open intelligent air quality alerts"
        className="relative inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <Bell className="h-4 w-4" />
        {alerts.length > 0 && (
          <span
            className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
              urgentCount > 0 ? 'bg-rose-500' : 'bg-emerald-600'
            }`}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Intelligent Alerts ({alerts.length})
            </span>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Customize
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>No active pollution advisories based on your alert thresholds.</span>
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-0.5">
              {alerts.map((alert) => {
                const st = getAlertStyle(alert);
                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-2.5 text-xs ${st.wrapper}`}
                  >
                    <div className="flex items-start gap-2">
                      {st.icon}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{alert.title}</span>
                          {alert.metricValue && (
                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${st.badge}`}>
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
      )}
    </div>
  );
}

export function AlertsStrip() {
  const { alerts } = useBreatheWise();
  if (alerts.length === 0) return null;

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {alerts.slice(0, 2).map((alert) => {
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
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.badge}`}>
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
  );
}
