import { getAqiMeta } from '@/lib/aqi';
import { getAirQualityForLocation } from '@/lib/air-quality-service';
import { AIRINDX_CITIES } from '@/lib/airindx-data';
import type { AirIndxMarkersResponse } from '@/types/airindx';

export async function getAirIndxMarkers(): Promise<AirIndxMarkersResponse> {
  const payloads = await Promise.all(
    AIRINDX_CITIES.map((city) => getAirQualityForLocation(city))
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
