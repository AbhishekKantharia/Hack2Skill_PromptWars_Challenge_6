import type { AirIndxNavItem } from '@/types/airindx';

export const NAV_LEFT: readonly AirIndxNavItem[] = [
  { label: 'Air Quality', action: 'air-quality' },
  { label: 'Air Monitors', action: 'monitors' },
  { label: 'Discover', action: 'discover' },
];

export const NAV_RIGHT: readonly AirIndxNavItem[] = [
  { label: 'About', action: 'about' },
  { label: 'Technology', action: 'technology' },
];

export const AQI_LEGEND = [
  { label: 'Good', range: '0–50' },
  { label: 'Moderate', range: '51–100' },
  { label: 'Sensitive', range: '101–150' },
  { label: 'Unhealthy', range: '151–200' },
  { label: 'Very unhealthy', range: '201–300' },
  { label: 'Hazardous', range: '301+' },
] as const;

export const SHARE_NETWORKS = ['facebook', 'x', 'whatsapp'] as const;
export type ShareNetwork = (typeof SHARE_NETWORKS)[number];

export const MARKERS_ENDPOINT = '/api/airindx/markers';
export const MAX_MARKERS = 64;
