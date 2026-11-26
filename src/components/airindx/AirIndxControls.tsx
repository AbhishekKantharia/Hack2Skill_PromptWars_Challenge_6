'use client';

import { Globe2, Map as MapIcon, Minus, Pause, Play, Plus } from 'lucide-react';
import { AQI_LEGEND } from '@/components/airindx/constants';
import type { AirIndxMarker, AirIndxViewMode } from '@/types/airindx';

interface StatusBadgesProps {
  dataMode: 'live' | 'demo';
  degraded: boolean;
  markerCount: number;
}

export function AirIndxStatusBadges({ dataMode, degraded, markerCount }: StatusBadgesProps) {
  const live = dataMode === 'live' && !degraded;
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 sm:left-5 sm:top-5">
      <span
        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${
          live
            ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
            : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        }`}
      >
        {live ? 'LIVE CAMS FEED' : 'SAMPLE DATA'}
      </span>
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300 backdrop-blur-md">
        {markerCount} AQI MARKERS
      </span>
      <p className="sr-only">
        {live
          ? 'Showing live atmospheric model readings.'
          : 'Showing labeled sample data, not live measurements.'}
      </p>
    </div>
  );
}

export function AirIndxAqiLegend() {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 hidden max-w-[15rem] rounded-xl border border-white/10 bg-[#0b1233]/70 px-3 py-2 text-[10px] leading-relaxed text-slate-300 backdrop-blur-md lg:block">
      <span className="font-bold text-white">AQI color key: </span>
      {AQI_LEGEND.map((entry, index) => (
        <span key={entry.label}>
          {index > 0 ? ' · ' : ''}
          {entry.label} {entry.range}
        </span>
      ))}
    </div>
  );
}

interface ViewControlsProps {
  viewMode: AirIndxViewMode;
  onViewChange: (mode: AirIndxViewMode) => void;
  onZoom: (direction: 1 | -1) => void;
  rotationPaused: boolean;
  onToggleRotation: () => void;
}

export function AirIndxViewControls({
  viewMode,
  onViewChange,
  onZoom,
  rotationPaused,
  onToggleRotation,
}: ViewControlsProps) {
  return (
    <>
      <div
        className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-full border border-white/10 bg-[#0b1233]/75 p-1 shadow-xl backdrop-blur-xl"
        role="group"
        aria-label="Map display mode"
      >
        <button
          type="button"
          onClick={() => onViewChange('globe')}
          aria-pressed={viewMode === 'globe'}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-bold tracking-wide transition sm:px-4 ${
            viewMode === 'globe' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Globe2 className="h-3.5 w-3.5" aria-hidden="true" /> 3D GLOBE
        </button>
        <button
          type="button"
          onClick={() => onViewChange('map')}
          aria-pressed={viewMode === 'map'}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-bold tracking-wide transition sm:px-4 ${
            viewMode === 'map' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
          }`}
        >
          <MapIcon className="h-3.5 w-3.5" aria-hidden="true" /> IQ AIR MAP
        </button>
      </div>

      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 sm:right-5">
        <button
          type="button"
          onClick={() => onZoom(1)}
          aria-label={`Zoom in on ${viewMode === 'globe' ? 'globe' : 'map'}`}
          className="airindx-zoom"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onZoom(-1)}
          aria-label={`Zoom out of ${viewMode === 'globe' ? 'globe' : 'map'}`}
          className="airindx-zoom"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onToggleRotation}
          aria-label={rotationPaused ? 'Resume globe rotation' : 'Pause globe rotation'}
          aria-pressed={rotationPaused}
          className="airindx-zoom"
        >
          {rotationPaused ? (
            <Play className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Pause className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <p className="absolute bottom-5 left-4 z-20 hidden font-mono text-[10px] text-slate-400 sm:block sm:left-5">
        Longitude / latitude coordinates are listed beside the Share controls.
      </p>
    </>
  );
}

export function AirIndxMarkerShortcuts({
  markers,
  selectedId,
  onSelect,
}: {
  markers: AirIndxMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="sr-only" aria-label="Keyboard-accessible air quality locations">
      <p>Available air quality locations</p>
      {markers.map((marker) => (
        <button
          key={marker.id}
          type="button"
          onClick={() => onSelect(marker.id)}
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-xs focus:font-bold focus:text-slate-900"
          aria-pressed={marker.id === selectedId}
        >
          Select {marker.name}, {marker.aqi} US AQI, {marker.category}
        </button>
      ))}
    </div>
  );
}
