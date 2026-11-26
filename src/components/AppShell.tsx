'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Bot,
  Calculator,
  CalendarClock,
  FlaskConical,
  Home,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  Moon,
  Presentation,
  RefreshCw,
  Settings,
  Sun,
  Users,
  Wind,
  X,
} from 'lucide-react';
import { useBreatheWise } from '@/components/BreatheWiseProvider';
import { LocationSelector } from '@/components/LocationSelector';
import { AlertsBellButton } from '@/components/AlertsPanel';

const NAV_ITEMS = [
  { href: '/', label: 'Home Dashboard', icon: LayoutDashboard },
  { href: '/assistant', label: 'AI Quality Assistant', icon: Bot },
  { href: '/map', label: 'Live Air Map', icon: MapIcon },
  { href: '/cleaner-day', label: 'My Cleaner Day', icon: CalendarClock },
  { href: '/indoor', label: 'Indoor Air Advisor', icon: Home },
  { href: '/calculator', label: 'Impact & Simulator', icon: Calculator },
  { href: '/community', label: 'Community Network', icon: Users },
  { href: '/learn', label: 'Learning Center', icon: BookOpen },
  { href: '/settings', label: 'User Settings', icon: Settings },
  { href: '/presentation', label: 'Competition Deck', icon: Presentation },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    settings,
    airQuality,
    loadingAq,
    refreshAirQuality,
    toggleTheme,
    toggleDemoMode,
  } = useBreatheWise();

  const isDemo = airQuality?.dataMode === 'demo' || settings.forceDemoMode;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-68 lg:shrink-0 lg:flex-col border-r border-emerald-200/70 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-center gap-3 border-b border-emerald-100 px-5 py-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white shadow-md shadow-emerald-500/20">
            <Wind className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              BreatheWise AI
            </div>
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              Urban Air Companion
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-gradient-to-r from-emerald-500/15 to-sky-500/15 text-emerald-800 ring-1 ring-emerald-500/30 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-emerald-100 p-4 dark:border-slate-800">
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-sky-50 p-3 text-xs dark:from-emerald-950/40 dark:to-sky-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {isDemo ? 'Demo Mode Active' : 'Live Environmental Feed'}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {isDemo
                ? 'Sample reference readings are clearly labeled. Toggle anytime for live Open-Meteo feeds.'
                : 'Connected to Open-Meteo CAMS Air Quality & Weather streams.'}
            </p>
            <button
              type="button"
              onClick={() => void toggleDemoMode()}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-xs transition hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              {settings.forceDemoMode ? 'Switch to Live API' : 'Activate Demo Mode'}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-72 flex-col bg-white p-4 shadow-2xl dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-sky-600 text-white">
                  <Wind className="h-4 w-4" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white">BreatheWise AI</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-emerald-200/70 bg-white/85 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                className="rounded-xl border border-slate-200 p-2 text-slate-700 lg:hidden dark:border-slate-700 dark:text-slate-200"
              >
                <Menu className="h-4 w-4" />
              </button>
              <LocationSelector />
            </div>

            <div className="flex items-center gap-2">
              {isDemo ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <FlaskConical className="h-3 w-3" />
                  DEMO DATA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              )}

              <button
                type="button"
                onClick={() => void refreshAirQuality()}
                disabled={loadingAq}
                title="Refresh environmental readings"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RefreshCw className={`h-4 w-4 ${loadingAq ? 'animate-spin' : ''}`} />
              </button>

              <AlertsBellButton />

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle light or dark theme"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-sky-400 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {settings.theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-600" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        {/* Footer Safety & Source Attribution */}
        <footer className="border-t border-emerald-200/60 bg-white/70 px-4 py-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong>BreatheWise AI</strong> — Informational urban environmental intelligence. Not medical advice; consult a qualified clinician for health concerns.
            </div>
            <div>
              {airQuality?.sourceName ? `Data source: ${airQuality.sourceName}` : 'Connecting to environmental source...'}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
