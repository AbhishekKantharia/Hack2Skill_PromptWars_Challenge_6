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
