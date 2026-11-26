'use client';

import React, { useState } from 'react';
import { PrefetchLink } from '@/components/PrefetchLink';
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
  Moon,
  MoreHorizontal,
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
  { href: '/', label: 'Home Dashboard', short: 'Today', icon: LayoutDashboard },
  { href: '/assistant', label: 'AI Quality Assistant', short: 'Ask AI', icon: Bot, apiPath: '/api/chat' },
  { href: '/map', label: 'Live Air Map', short: 'Map', icon: MapIcon },
  { href: '/cleaner-day', label: 'My Cleaner Day', short: 'Plan', icon: CalendarClock },
  { href: '/indoor', label: 'Indoor Air Advisor', short: 'Indoor', icon: Home },
  { href: '/calculator', label: 'Impact & Simulator', short: 'Impact', icon: Calculator, apiPath: '/api/calculator' },
  { href: '/community', label: 'Community Network', short: 'Community', icon: Users, apiPath: '/api/community' },
  { href: '/learn', label: 'Learning Center', short: 'Learn', icon: BookOpen },
  { href: '/settings', label: 'User Settings', short: 'Settings', icon: Settings, apiPath: '/api/settings' },
  { href: '/presentation', label: 'Competition Deck', short: 'Deck', icon: Presentation },
];

const MOBILE_TAB_HREFS = ['/', '/map', '/cleaner-day', '/assistant'];

function samePath(a: string, b: string): boolean {
  return a === b || (a !== '/' && b.startsWith(`${a}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    settings,
    activeCity,
    airQuality,
    loadingAq,
    refreshAirQuality,
    prefetchAirQuality,
    toggleTheme,
    toggleDemoMode,
  } = useBreatheWise();

  const isDemo = airQuality?.dataMode === 'demo';
  const degradedLive = isDemo && !settings.forceDemoMode;
  const warmModeToggle = () =>
    prefetchAirQuality(activeCity, degradedLive ? false : !settings.forceDemoMode);
  const mobileTabs = NAV_ITEMS.filter((item) => MOBILE_TAB_HREFS.includes(item.href));

  const modeToggleLabel = degradedLive
    ? 'Retry Live Feed'
    : settings.forceDemoMode || isDemo
      ? 'Switch to Live API'
      : 'Activate Demo Mode';

  const modeToggle = (
    <button
      type="button"
      onClick={() => {
        if (degradedLive) void refreshAirQuality(activeCity, false);
        else void toggleDemoMode();
      }}
      onMouseEnter={warmModeToggle}
      onFocus={warmModeToggle}
      onTouchStart={warmModeToggle}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-micro font-semibold text-emerald-700 shadow-xs transition-colors hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300"
    >
      <FlaskConical className="h-3.5 w-3.5" />
      {modeToggleLabel}
    </button>
  );

  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light or dark theme"
      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:border-sky-400 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {settings.theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-slate-600" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50/60 lg:flex lg:bg-transparent dark:bg-slate-950 lg:dark:bg-transparent">
      <aside className="hidden w-68 shrink-0 flex-col border-r border-emerald-200/70 bg-white lg:flex dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3 border-b border-emerald-100 px-5 py-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Wind className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              BreatheWise AI
            </div>
            <div className="text-micro font-medium text-emerald-700 dark:text-emerald-400">
              Urban Air Companion
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Desktop navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = samePath(pathname, item.href);
            return (
              <PrefetchLink
                key={item.href}
                href={item.href}
                apiPath={item.apiPath}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </PrefetchLink>
            );
          })}
        </nav>

        <div className="border-t border-emerald-100 p-4 dark:border-slate-800">
          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50 p-3 text-xs dark:border-emerald-800/40 dark:bg-emerald-950/30">
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {isDemo ? 'Demo Mode Active' : 'Live Environmental Feed'}
            </div>
            <p className="mt-1 text-micro leading-relaxed text-slate-600 dark:text-slate-300">
              {isDemo
                ? 'Sample reference readings are clearly labeled. Toggle anytime for live Open-Meteo feeds.'
                : 'Connected to Open-Meteo CAMS Air Quality & Weather streams.'}
            </p>
            <div className="mt-2">{modeToggle}</div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 hidden border-b border-emerald-200/70 bg-white px-6 py-3 lg:block dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <LocationSelector />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                isDemo
                  ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {isDemo ? <FlaskConical className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-emerald-500" />}
              {isDemo ? 'DEMO DATA' : 'LIVE'}
            </span>
            <button
              type="button"
              onClick={() => void refreshAirQuality()}
              onMouseEnter={() => prefetchAirQuality()}
              onFocus={() => prefetchAirQuality()}
              disabled={loadingAq}
              title="Refresh environmental readings"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loadingAq ? 'animate-spin' : ''}`} />
            </button>
            <AlertsBellButton />
            {themeButton}
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-30 border-b border-emerald-200/70 bg-white px-4 pb-3 pt-3 lg:hidden dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Wind className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                BreatheWise AI
              </div>
              <div className="truncate text-micro text-emerald-700 dark:text-emerald-400">
                {isDemo ? 'SAMPLE DATA' : 'LIVE FEED'} · {activeCity.name}
              </div>
            </div>
            <AlertsBellButton />
            {themeButton}
          </div>
          <div className="mt-3">
            <LocationSelector />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-semibold ${
                isDemo
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {isDemo ? <FlaskConical className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              {modeToggleLabel}
            </span>
            <button
              type="button"
              onClick={() => void refreshAirQuality()}
              onTouchStart={() => prefetchAirQuality()}
              disabled={loadingAq}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-micro font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              <RefreshCw className={`h-3 w-3 ${loadingAq ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-200/70 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden dark:border-slate-800 dark:bg-slate-950"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const active = samePath(pathname, item.href);
            return (
              <PrefetchLink
                key={item.href}
                href={item.href}
                apiPath={item.apiPath}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-micro font-semibold ${
                  active
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span className="truncate">{item.short}</span>
              </PrefetchLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="More navigation options"
            className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-micro font-semibold text-slate-500 dark:text-slate-400"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex w-[min(20rem,calc(100vw-2rem))] flex-col bg-white p-4 shadow-2xl dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
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
            <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Mobile drawer navigation">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = samePath(pathname, item.href);
                return (
                  <PrefetchLink
                    key={item.href}
                    href={item.href}
                    apiPath={item.apiPath}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      active
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </PrefetchLink>
                );
              })}
            </nav>
            <div className="mt-3 rounded-xl border border-emerald-200/60 bg-emerald-50 p-3 text-xs dark:border-emerald-800/40 dark:bg-emerald-950/30">
              <div className="font-semibold text-slate-800 dark:text-slate-100">
                {isDemo ? 'Demo Mode Active' : 'Live Environmental Feed'}
              </div>
              <div className="mt-2">{modeToggle}</div>
            </div>
            <PrefetchLink
              href="/legal"
              className="mt-3 text-center text-micro font-semibold text-emerald-700 underline dark:text-emerald-300"
            >
              Legal &amp; Privacy
            </PrefetchLink>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 lg:px-8 lg:py-6 lg:pb-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        <footer className="hidden border-t border-emerald-200/60 bg-white px-6 py-4 text-xs text-slate-500 lg:block dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <div>
              <strong>BreatheWise AI</strong> — Informational urban environmental intelligence. Not medical advice; consult a qualified clinician for health concerns.{' '}
              <PrefetchLink href="/legal" className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 dark:text-emerald-300">
                Legal &amp; Privacy
              </PrefetchLink>
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
