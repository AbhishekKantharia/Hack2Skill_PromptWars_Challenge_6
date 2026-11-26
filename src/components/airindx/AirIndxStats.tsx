'use client';

import { Activity } from 'lucide-react';
import { getAqiMeta } from '@/lib/aqi';
import {
  coordinateLabel,
  riskMessage,
  riskPercentFor,
  valueOrDash,
} from '@/components/airindx/format';
import { SHARE_NETWORKS, type ShareNetwork } from '@/components/airindx/constants';
import type { AirIndxMarker } from '@/types/airindx';

interface AirIndxStatsProps {
  marker: AirIndxMarker | null;
  onRiskDetails: () => void;
  onShare: (network: ShareNetwork) => void;
}

export function AirIndxStats({ marker, onRiskDetails, onShare }: AirIndxStatsProps) {
  const meta = marker ? getAqiMeta(marker.aqi) : null;
  const riskPercent = riskPercentFor(marker);

  return (
    <>
      <div className="airindx-card-purple airindx-enter airindx-delay-1 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Main Statistics</h2>
          <Activity className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">AQI</p>
        <div className="mt-1 flex items-end gap-3">
          <span className="text-6xl font-bold leading-none tracking-tight text-white airindx-number">
            {marker?.aqi ?? '—'}
          </span>
          <span className="mb-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
            US EPA
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">
            Dominant Pollutant:{' '}
            <span className="font-semibold text-white">{marker?.dominantPollutant ?? 'N/A'}</span>
          </span>
          <span className="text-slate-400">
            Wind:{' '}
            <span className="font-semibold text-white">
              {valueOrDash(marker?.windSpeedKmh ?? null, ' km/h')}
            </span>
          </span>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full border border-white/25 transition-all duration-500"
            style={{
              width: `${Math.min(100, ((marker?.aqi ?? 0) / 300) * 100)}%`,
              backgroundColor: marker?.colorHex ?? '#22d3ee',
            }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">{meta?.category ?? 'Reading unavailable'}</p>
      </div>

      <div className="airindx-card-blue airindx-enter airindx-delay-2 relative overflow-hidden p-5">
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full opacity-50"
          viewBox="0 0 420 120"
          fill="none"
          aria-hidden="true"
        >
          <path d="M-20 96C60 38 132 118 214 64C290 14 352 96 440 42" stroke="#67e8f9" strokeOpacity="0.45" strokeWidth="2" />
          <path d="M-20 112C70 62 142 130 224 84C306 38 366 110 440 68" stroke="#a78bfa" strokeOpacity="0.35" strokeWidth="2" />
          <path d="M-20 126C74 84 150 146 232 104C314 62 372 124 440 92" stroke="#60a5fa" strokeOpacity="0.3" strokeWidth="2" />
        </svg>
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Risk of Pollution</h2>
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
              INDICATOR
            </span>
          </div>
          <p className="mt-5 text-5xl font-bold tracking-tight text-white">{riskPercent}%</p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-200/80">
            {riskMessage(riskPercent)}
          </p>
          <button
            type="button"
            onClick={onRiskDetails}
            className="mt-4 min-h-11 rounded-xl bg-[#facc15] px-4 py-2 text-xs font-bold text-slate-900 shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-300"
          >
            Details
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-300">Share</p>
          <div className="mt-2 flex gap-2">
            {SHARE_NETWORKS.map((network) => (
              <button
                key={network}
                type="button"
                onClick={() => onShare(network)}
                aria-label={`Share on ${network === 'x' ? 'X' : network === 'facebook' ? 'Facebook' : 'WhatsApp'}`}
                title={`Share on ${network === 'x' ? 'X' : network === 'facebook' ? 'Facebook' : 'WhatsApp'}`}
                className="airindx-social min-h-11 min-w-11"
              >
                <ShareGlyph network={network} />
              </button>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Coordinates</p>
          <p className="mt-1 font-mono text-xs text-slate-300">{coordinateLabel(marker)}</p>
        </div>
      </div>
    </>
  );
}

function ShareGlyph({ network }: { network: ShareNetwork }) {
  if (network === 'facebook') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.14 8.44 9.94v-7.03H7.9V12.06h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.45 2.91h-2.33V22c4.78-.8 8.44-4.94 8.44-9.94Z" />
      </svg>
    );
  }
  if (network === 'x') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.25l-4.9-6.41L6.3 22H3.2l7.24-8.28L2.6 2h6.41l4.43 5.85L18.9 2Zm-1.1 18h1.73L8.36 3.9H6.5L17.8 20Z" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a10 10 0 0 0-8.6 15.13L2 22l5.05-1.33A10 10 0 1 0 12.04 2Zm0 18.18a8.16 8.16 0 0 1-4.16-1.14l-.3-.18-3 .79.8-2.93-.2-.31a8.18 8.18 0 1 1 6.86 3.77Zm4.49-6.12c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19a7.25 7.25 0 0 1-1.34-1.66c-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.74-1.79-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.83-.84 2.02s.86 2.35.98 2.51c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}
