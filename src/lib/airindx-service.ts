import { getAqiMeta } from '@/lib/aqi';
import { getAirQualityForLocation } from '@/lib/air-quality-service';
import { AIRINDX_CITIES } from '@/lib/airindx-data';
import type { AirIndxMarkersResponse } from '@/types/airindx';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONCURRENCY = 4;

let cachedResponse: { value: AirIndxMarkersResponse; expiresAt: number } | null = null;
let inFlight: Promise<AirIndxMarkersResponse> | null = null;

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index]);
      }
    })
  );
  return results;
}

async function buildAirIndxMarkers(): Promise<AirIndxMarkersResponse> {
  const payloads = await mapWithConcurrency(
    AIRINDX_CITIES,
    MAX_CONCURRENCY,
    (city) => getAirQualityForLocation(city, { includeHourly: false, includeStations: false })
  );

  const markers = payloads.map((payload, index) => {
    const city = AIRINDX_CITIES[index];
    const meta = getAqiMeta(payload.aqi);
    return {
      id: city.id,
      name: city.name,
      country: city.country,
      countryCode: city.countryCode,
      lat: city.lat,
      lon: city.lon,
      timezone: city.timezone,
      aqi: payload.aqi,
      category: meta.category,
      colorHex: meta.colorHex,
      dominantPollutant: payload.dominantPollutant,
      temperatureC: payload.weather.temperatureC,
      humidityPct: payload.weather.humidityPct,
      windSpeedKmh: payload.weather.windSpeedKmh,
      dataMode: payload.dataMode,
      sourceName: payload.sourceName,
      sourceUrl: payload.sourceUrl,
      timestamp: payload.timestamp,
    };
  });

  const degraded = payloads.some((payload) => payload.dataMode === 'demo' || payload.degraded);
  return {
    markers,
    dataMode: degraded ? 'demo' : 'live',
    degraded,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getAirIndxMarkers(): Promise<AirIndxMarkersResponse> {
  if (cachedResponse && Date.now() < cachedResponse.expiresAt) return cachedResponse.value;
  if (inFlight) return inFlight;

  inFlight = buildAirIndxMarkers()
    .then((value) => {
      cachedResponse = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function clearAirIndxCache(): void {
  cachedResponse = null;
}
