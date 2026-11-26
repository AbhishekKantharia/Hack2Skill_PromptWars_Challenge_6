import type { DataMode } from '@/types/breathewise';

export interface AirIndxCity {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface AirIndxMarker {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  timezone: string;
  aqi: number;
  category: string;
  colorHex: string;
  dominantPollutant: string;
  temperatureC: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  dataMode: DataMode;
  sourceName: string;
  sourceUrl: string;
  timestamp: string;
}

export interface AirIndxMarkersResponse {
  markers: AirIndxMarker[];
  dataMode: DataMode;
  degraded: boolean;
  fetchedAt: string;
}

export type AirIndxViewMode = 'globe' | 'map';
export type AirIndxDialogKind =
  | 'about'
  | 'technology'
  | 'monitors'
  | 'discover'
  | 'risk'
  | 'location'
  | null;
export type AirIndxNavAction = 'air-quality' | Exclude<AirIndxDialogKind, null>;

export interface AirIndxNavItem {
  label: string;
  action: AirIndxNavAction;
}

export interface ZoomCommand {
  direction: 1 | -1;
  nonce: number;
}
