'use client';

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Info, LoaderCircle, RefreshCw } from 'lucide-react';
import { getAqiMeta } from '@/lib/aqi';
import { buildShareUrl, riskPercentFor, statusMessage } from '@/components/airindx/format';
import type { ShareNetwork } from '@/components/airindx/constants';
import {
  AirIndxAqiLegend,
  AirIndxMarkerShortcuts,
  AirIndxStatusBadges,
  AirIndxViewControls,
} from '@/components/airindx/AirIndxControls';
import { AirIndxClock } from '@/components/airindx/AirIndxClock';
import { AirIndxDialog } from '@/components/airindx/AirIndxDialog';
import { AirIndxLocationPopup } from '@/components/airindx/AirIndxLocationPopup';
import { AirIndxNav } from '@/components/airindx/AirIndxNav';
import { AirIndxStats } from '@/components/airindx/AirIndxStats';
import { useAirIndxData } from '@/components/airindx/hooks/useAirIndxData';
import { useReducedMotion } from '@/components/airindx/hooks/useReducedMotion';
import type {
  AirIndxDialogKind,
  AirIndxNavAction,
  AirIndxViewMode,
  ZoomCommand,
} from '@/types/airindx';

function ViewSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400" role="status">
      {label}
    </div>
  );
}

const AirIndxGlobe = dynamic(
  () => import('@/components/airindx/AirIndxGlobe').then((module) => module.AirIndxGlobe),
  { ssr: false, loading: () => <ViewSkeleton label="Loading 3D globe…" /> }
);
const AirIndxMap = dynamic(
  () => import('@/components/airindx/AirIndxMap').then((module) => module.AirIndxMap),
  { ssr: false, loading: () => <ViewSkeleton label="Loading map…" /> }
);

export function AirIndxDashboard() {
  const { data, loading, error, retry } = useAirIndxData();
  const reducedMotion = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AirIndxViewMode>('globe');
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand>({ direction: 1, nonce: 0 });
  const [rotationPaused, setRotationPaused] = useState(false);
  const [dialog, setDialog] = useState<AirIndxDialogKind>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const selectedMarker = useMemo(() => {
    const explicitlySelected = data.markers.find((marker) => marker.id === selectedId);
    if (explicitlySelected) return explicitlySelected;
    return (
      data.markers.find((marker) => marker.id === 'jakarta') ?? data.markers[0] ?? null
    );
  }, [data.markers, selectedId]);

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleRotation = useCallback(() => setRotationPaused((paused) => !paused), []);

  const handleZoom = useCallback((direction: 1 | -1) => {
    setZoomCommand((current) => ({ direction, nonce: current.nonce + 1 }));
  }, []);

  const handleNav = (action: AirIndxNavAction) => {
    closeMobileNav();
    if (action === 'air-quality') {
      document.getElementById('air-quality')?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      return;
    }
    setDialog(action);
  };

  const handleShare = (network: ShareNetwork) => {
    const text = `Live global air quality on AirIndx${selectedMarker ? `: ${selectedMarker.name} ${selectedMarker.aqi} US AQI` : ''}`;
    const target = buildShareUrl(network, window.location.href, text);
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  };

  const meta = selectedMarker ? getAqiMeta(selectedMarker.aqi) : null;
  const riskPercent = riskPercentFor(selectedMarker);
  const hasNoReadings = !loading && !error && data.markers.length === 0;

  return (
    <main className="min-h-screen bg-[#e9edf4] px-3 py-3 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div
        className="relative mx-auto min-h-[850px] max-w-[1180px] overflow-hidden rounded-[30px] border border-white/10 shadow-[0_40px_120px_rgba(15,23,42,0.35)]"
        style={{
          backgroundColor: '#080d2b',
          backgroundImage:
            'radial-gradient(circle at 78% 8%, rgba(88,55,190,0.34), transparent 34%), radial-gradient(circle at 22% 92%, rgba(12,116,180,0.22), transparent 38%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40 airindx-grid" />

        <AirIndxNav
          mobileOpen={mobileNavOpen}
          onToggleMobile={() => setMobileNavOpen((open) => !open)}
          onCloseMobile={closeMobileNav}
          onNavigate={handleNav}
        />

        <p className="sr-only" role="status" aria-live="polite">
          {loading ? 'Loading global air quality readings.' : statusMessage(selectedMarker, data.dataMode, data.degraded)}
        </p>

        <div className="relative z-10 grid gap-5 px-5 pb-6 sm:px-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-4">
          <section id="air-quality" className="airindx-enter min-w-0 space-y-5 pt-4 lg:pt-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/80">
                Global Environmental Intelligence
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl airindx-heading">
                Air Quality Index
              </h1>
              <AirIndxClock />
              {selectedMarker && (
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <span className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                    {selectedMarker.countryCode}
                  </span>
                  <span className="text-sm font-semibold text-white">{selectedMarker.name}</span>
                  <span className="text-sm text-slate-400">{selectedMarker.country}</span>
                </div>
              )}
            </div>

            <AirIndxStats marker={selectedMarker} onRiskDetails={() => setDialog('risk')} onShare={handleShare} />
          </section>

          <section className="relative min-w-0 pt-3 lg:pt-0" aria-label="Interactive global air quality view">
            <div className="airindx-globe-shell relative h-[430px] overflow-hidden rounded-[28px] border border-cyan-300/10 sm:h-[540px] lg:h-[670px]">
              <div className="pointer-events-none absolute inset-0 airindx-space" />

              <div className="absolute inset-0 airindx-view" hidden={viewMode !== 'globe'}>
                <AirIndxGlobe
                  markers={data.markers}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  zoomCommand={zoomCommand}
                  reducedMotion={reducedMotion}
                  rotationPaused={rotationPaused}
                />
              </div>
              <div className="absolute inset-0 airindx-view" hidden={viewMode !== 'map'}>
                <AirIndxMap
                  markers={data.markers}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  zoomCommand={zoomCommand}
                  active={viewMode === 'map'}
                />
              </div>

              <AirIndxStatusBadges
                dataMode={data.dataMode}
                degraded={data.degraded}
                markerCount={data.markers.length}
              />
              <AirIndxAqiLegend />

              {selectedMarker && meta && !loading && !error && (
                <AirIndxLocationPopup
                  marker={selectedMarker}
                  meta={meta}
                  onDetails={() => setDialog('location')}
                />
              )}

              {loading && (
                <div
                  className="absolute inset-0 z-30 flex items-center justify-center bg-[#080d2b]/55 backdrop-blur-sm"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200">
                    <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" aria-hidden="true" />
                    Loading global readings…
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#080d2b]/70 p-6 text-center backdrop-blur-sm">
                  <div className="max-w-xs rounded-2xl border border-white/10 bg-white/5 p-5">
                    <Info className="mx-auto h-5 w-5 text-amber-300" aria-hidden="true" />
                    <p role="alert" className="mt-2 text-sm text-slate-200">{error}</p>
                    <button
                      type="button"
                      onClick={retry}
                      className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
                    </button>
                  </div>
                </div>
              )}

              {hasNoReadings && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-6 text-center text-sm text-slate-300">
                  No global readings are available right now. Use Retry to request them again.
                </div>
              )}

              <AirIndxViewControls
                viewMode={viewMode}
                onViewChange={setViewMode}
                onZoom={handleZoom}
                rotationPaused={rotationPaused}
                onToggleRotation={toggleRotation}
              />
              <AirIndxMarkerShortcuts
                markers={data.markers}
                selectedId={selectedMarker?.id ?? null}
                onSelect={handleSelect}
              />
            </div>
          </section>
        </div>

        {dialog && (
          <AirIndxDialog
            kind={dialog}
            markers={data.markers}
            selectedMarker={selectedMarker}
            riskPercent={riskPercent}
            onSelectMarker={handleSelect}
            onClose={closeDialog}
          />
        )}
      </div>
    </main>
  );
}
