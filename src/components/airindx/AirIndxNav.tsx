'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { NAV_LEFT, NAV_RIGHT } from '@/components/airindx/constants';
import type { AirIndxNavAction, AirIndxNavItem } from '@/types/airindx';

interface AirIndxNavProps {
  mobileOpen: boolean;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
  onNavigate: (action: AirIndxNavAction) => void;
}

function NavButton({
  item,
  onNavigate,
  compact = false,
}: {
  item: AirIndxNavItem;
  onNavigate: (action: AirIndxNavAction) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.action)}
      className={
        compact
          ? 'min-h-11 rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5'
          : 'min-h-11 rounded-lg px-1 text-sm text-slate-300 transition hover:text-cyan-200'
      }
    >
      {item.label}
    </button>
  );
}

export function AirIndxNav({
  mobileOpen,
  onToggleMobile,
  onCloseMobile,
  onNavigate,
}: AirIndxNavProps) {
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <header className="relative z-30 flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
      <nav className="hidden flex-1 items-center gap-6 md:flex" aria-label="Primary left navigation">
        {NAV_LEFT.map((item) => (
          <NavButton key={item.action} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <button
        type="button"
        onClick={onToggleMobile}
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileOpen}
        aria-controls="airindx-mobile-nav"
        className="min-h-11 min-w-11 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 md:hidden"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5">
        <span className="airindx-brand-orb" aria-hidden="true" />
        <span className="text-base font-bold tracking-tight text-white sm:text-lg">AirIndx</span>
      </div>

      <nav
        className="hidden flex-1 items-center justify-end gap-5 md:flex"
        aria-label="Primary right navigation"
      >
        {NAV_RIGHT.map((item) => (
          <NavButton key={item.action} item={item} onNavigate={onNavigate} />
        ))}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-cyan-100"
        >
          Get Started <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </nav>

      {mobileOpen && (
        <div
          id="airindx-mobile-nav"
          className="absolute inset-x-4 top-16 z-40 rounded-2xl border border-white/10 bg-[#0b1233]/95 p-4 shadow-2xl backdrop-blur-xl md:hidden"
        >
          <nav aria-label="Mobile navigation" className="grid gap-1">
            {[...NAV_LEFT, ...NAV_RIGHT].map((item) => (
              <NavButton key={item.action} item={item} onNavigate={onNavigate} compact />
            ))}
            <Link
              href="/"
              className="mt-2 min-h-11 rounded-xl bg-white px-3 py-2.5 text-center text-sm font-bold text-slate-900"
            >
              Get Started
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
