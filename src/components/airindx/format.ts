import type { AirIndxDialogKind, AirIndxMarker } from '@/types/airindx';
import type { ShareNetwork } from '@/components/airindx/constants';

const timestampFormatters = new Map<string, Intl.DateTimeFormat>();

export function valueOrDash(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'N/A' : `${value}${suffix}`;
}

export function coordinateLabel(marker: AirIndxMarker | null): string {
  if (!marker) return '— / —';
  return `${Math.abs(marker.lat).toFixed(2)}° ${marker.lat >= 0 ? 'N' : 'S'} / ${Math.abs(marker.lon).toFixed(2)}° ${marker.lon >= 0 ? 'E' : 'W'}`;
}

export function riskPercentFor(marker: AirIndxMarker | null): number {
  return marker ? Math.min(100, Math.round(marker.aqi / 3)) : 0;
}

export function riskMessage(percent: number): string {
  if (percent < 34) return 'Lower pollution pressure in the selected location right now.';
  if (percent < 67) return 'Moderate pollution pressure; sensitive groups should stay aware.';
  return 'Elevated pollution pressure; consider reducing prolonged outdoor exertion.';
}

export function aqiTextColor(colorHex: string): string {
  return colorHex.toLowerCase() === '#8b5cf6' || colorHex.toLowerCase() === '#991b1b'
    ? '#ffffff'
    : '#071022';
}

export function formatTimestamp(iso: string, timezone?: string): string {
  const key = timezone || 'UTC';
  let formatter = timestampFormatters.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: key,
      });
    } catch {
      formatter = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      });
    }
    timestampFormatters.set(key, formatter);
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : formatter.format(date);
}

export function getDialogTitle(
  kind: Exclude<AirIndxDialogKind, null>,
  marker: AirIndxMarker | null
): string {
  switch (kind) {
    case 'about':
      return 'About AirIndx';
    case 'technology':
      return 'Technology & data sources';
    case 'monitors':
      return 'Global monitor network';
    case 'discover':
      return 'Discover air-quality patterns';
    case 'risk':
      return 'How the pollution risk indicator works';
    case 'location':
      return marker ? `${marker.name} air quality details` : 'Location details';
  }
}

export function buildShareUrl(
  network: ShareNetwork,
  pageUrl: string,
  text: string
): string | null {
  let origin = '';
  try {
    const parsed = new URL(pageUrl);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') origin = parsed.toString();
  } catch {
    return null;
  }
  if (!origin) return null;
  const encodedUrl = encodeURIComponent(origin);
  const encodedText = encodeURIComponent(text);
  if (network === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
  if (network === 'x') {
    return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
}

export function statusMessage(
  marker: AirIndxMarker | null,
  dataMode: 'live' | 'demo',
  degraded: boolean
): string {
  if (!marker) return 'No global readings are available.';
  const mode = dataMode === 'live' && !degraded ? 'live CAMS feed' : 'sample data';
  return `${marker.name}: ${marker.aqi} US AQI, ${marker.category}. ${mode}.`;
}
