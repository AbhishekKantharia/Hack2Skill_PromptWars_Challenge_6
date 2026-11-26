import type {
  AirQualityPayload,
  AirQualityStation,
  CityLocation,
  HourlyAirPoint,
  PollutantReadings,
} from '@/types/breathewise';
import { determineDominantPollutant, getAqiMeta, pm25ToUsAqi } from '@/lib/aqi';
import { buildDemoAirQualityPayload, FEATURED_CITIES } from '@/lib/demo-data';
import { resolveDemoMode } from '@/lib/demo-mode';
import { formatLocalHour, parseUtcTimestamp } from '@/lib/time';

function roundOrNull(value: unknown, digits: number): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Number(value.toFixed(digits))
    : null;
}

function describeWmoWeatherCode(code: number | null | undefined): string {
  if (code === null || code === undefined) return 'Weather data unavailable';
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Fog / mist';
  if (code >= 51 && code <= 67) return 'Rain / drizzle';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Variable sky';
}

function demoFallback(city: CityLocation): AirQualityPayload {
  const reason = 'Live air-quality feed unavailable; showing labeled sample data.';
  const demo = buildDemoAirQualityPayload(city);
  return {
    ...demo,
    degraded: true,
    liveError: reason,
    uncertaintyNote: `${reason} ${demo.uncertaintyNote}`,
  };
}

export async function searchCities(query: string): Promise<CityLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) return FEATURED_CITIES;

  const localMatches = FEATURED_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(trimmed.toLowerCase()) ||
      c.country.toLowerCase().includes(trimmed.toLowerCase())
  );

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=6&language=en&format=json`;
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return localMatches;
    const data = await res.json();
    if (!Array.isArray(data.results) || data.results.length === 0) return localMatches;
    return data.results.map(
      (item: {
        name: string;
        country?: string;
        admin1?: string;
        latitude: number;
        longitude: number;
        timezone?: string;
      }) => ({
        name: String(item.name).slice(0, 80),
        country: String(item.country ?? 'Unknown').slice(0, 80),
        region: item.admin1 ? String(item.admin1).slice(0, 80) : undefined,
        lat: Number(item.latitude),
        lon: Number(item.longitude),
        timezone: item.timezone ? String(item.timezone).slice(0, 64) : undefined,
      })
    );
  } catch {
    return localMatches;
  }
}

export async function getAirQualityForLocation(
  city: CityLocation,
  options?: { forceDemoMode?: boolean }
): Promise<AirQualityPayload> {
  const forceDemo = resolveDemoMode(options?.forceDemoMode, undefined);
  if (forceDemo) {
    return buildDemoAirQualityPayload(city);
  }

  try {
    const locationParams = `latitude=${encodeURIComponent(String(city.lat))}&longitude=${encodeURIComponent(String(city.lon))}`;
    const aqUrl =
      `https://air-quality-api.open-meteo.com/v1/air-quality?${locationParams}` +
      `&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone` +
      `&hourly=us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone` +
      `&past_hours=8&forecast_hours=17&timezone=UTC`;
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?${locationParams}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=UTC`;

    const [aqRes, weatherRes] = await Promise.all([
      fetch(aqUrl, { cache: 'no-store', signal: AbortSignal.timeout(7000) }),
      fetch(weatherUrl, { cache: 'no-store', signal: AbortSignal.timeout(7000) }),
    ]);
    if (!aqRes.ok) throw new Error(`Air quality API returned HTTP ${aqRes.status}`);

    const aqJson = await aqRes.json();
    const weatherJson = weatherRes.ok ? await weatherRes.json() : null;
    const current = aqJson.current ?? {};

    const pollutants: PollutantReadings = {
      pm25: roundOrNull(current.pm2_5, 1),
      pm10: roundOrNull(current.pm10, 1),
      no2: roundOrNull(current.nitrogen_dioxide, 1),
      so2: roundOrNull(current.sulphur_dioxide, 1),
      co: roundOrNull(current.carbon_monoxide, 0),
      o3: roundOrNull(current.ozone, 1),
    };

    const measuredAqi = roundOrNull(current.us_aqi, 0);
    const aqi = measuredAqi ?? (pollutants.pm25 !== null ? pm25ToUsAqi(pollutants.pm25) : null);
    if (aqi === null) {
      throw new Error('No usable AQI or PM2.5 measurement returned for this location');
    }

    const hourlyTimes: string[] = Array.isArray(aqJson.hourly?.time) ? aqJson.hourly.time : [];
    const hourlyAqi: Array<number | null> = aqJson.hourly?.us_aqi ?? [];
    const hourlyPm25: Array<number | null> = aqJson.hourly?.pm2_5 ?? [];
    const hourlyPm10: Array<number | null> = aqJson.hourly?.pm10 ?? [];
    const hourlyO3: Array<number | null> = aqJson.hourly?.ozone ?? [];
    const hourlyNo2: Array<number | null> = aqJson.hourly?.nitrogen_dioxide ?? [];
    const nowMs =
      parseUtcTimestamp(current.time) ?? parseUtcTimestamp(hourlyTimes[0]) ?? Date.now();

    const hourly: HourlyAirPoint[] = hourlyTimes
      .map((iso, index): HourlyAirPoint | null => {
        const pm25Val = roundOrNull(hourlyPm25[index], 1);
        const rawHourAqi = roundOrNull(hourlyAqi[index], 0);
        const hourAqi = rawHourAqi ?? (pm25Val !== null ? pm25ToUsAqi(pm25Val) : null);
        if (hourAqi === null) return null;
        const pointMs = parseUtcTimestamp(iso);
        return {
          time: iso,
          label: formatLocalHour(iso, city.timezone),
          aqi: hourAqi,
          pm25: pm25Val,
          pm10: roundOrNull(hourlyPm10[index], 1),
          o3: roundOrNull(hourlyO3[index], 1),
          no2: roundOrNull(hourlyNo2[index], 1),
          isForecast: pointMs === null ? false : pointMs > nowMs,
        };
      })
      .filter((point): point is HourlyAirPoint => point !== null);

    if (hourly.length === 0) {
      throw new Error('No usable hourly air quality series returned for this location');
    }

    const wCurrent = weatherJson?.current ?? {};
    const timestamp = typeof current.time === 'string' ? current.time : new Date().toISOString();
    const stations: AirQualityStation[] = [
      {
        id: `openmeteo-center-${city.lat.toFixed(2)}-${city.lon.toFixed(2)}`,
        name: `${city.name} (CAMS / Open-Meteo Grid)`,
        city: city.name,
        lat: city.lat,
        lon: city.lon,
        aqi,
        pm25: pollutants.pm25,
        pm10: pollutants.pm10,
        no2: pollutants.no2,
        o3: pollutants.o3,
        sourceType: 'model_grid',
        sourceLabel: 'Open-Meteo CAMS Atmospheric Grid (Live Model)',
        updatedAt: timestamp,
      },
    ];

    let hasGroundStation = false;
    const waqiToken = process.env.WAQI_API_TOKEN;
    if (waqiToken) {
      try {
        const waqiRes = await fetch(
          `https://api.waqi.info/feed/geo:${encodeURIComponent(String(city.lat))};${encodeURIComponent(String(city.lon))}/?token=${encodeURIComponent(
            waqiToken
          )}`,
          { cache: 'no-store', signal: AbortSignal.timeout(3500) }
        );
        if (waqiRes.ok) {
          const waqiJson = await waqiRes.json();
          const d = waqiJson?.data;
          if (waqiJson.status === 'ok' && d && typeof d.aqi === 'number' && Array.isArray(d.city?.geo)) {
            stations.push({
              id: `waqi-${d.idx ?? 'station'}`,
              name: String(d.city?.name ?? `${city.name} Ground Monitor`).slice(0, 80),
              city: city.name,
              lat: Number(d.city.geo[0]),
              lon: Number(d.city.geo[1]),
              aqi: Math.round(d.aqi),
              pm25: roundOrNull(d.iaqi?.pm25?.v, 1),
              pm10: roundOrNull(d.iaqi?.pm10?.v, 1),
              no2: roundOrNull(d.iaqi?.no2?.v, 1),
              o3: roundOrNull(d.iaqi?.o3?.v, 1),
              sourceType: 'official',
              sourceLabel: 'WAQI Ground Monitoring Station',
              updatedAt: d.time?.iso ?? timestamp,
            });
            hasGroundStation = true;
          }
        }
      } catch {
        // Optional enrichment is non-blocking and never mislabeled as present.
      }
    }

    const missing = Object.entries(pollutants)
      .filter(([, value]) => value === null)
      .map(([key]) => key);

    return {
      location: city,
      aqi,
      aqiScale: 'US EPA',
      category: getAqiMeta(aqi).category,
      dominantPollutant: determineDominantPollutant(pollutants),
      pollutants,
      weather: {
        temperatureC: roundOrNull(wCurrent.temperature_2m, 1),
        humidityPct: roundOrNull(wCurrent.relative_humidity_2m, 0),
        windSpeedKmh: roundOrNull(wCurrent.wind_speed_10m, 1),
        windDirectionDeg: roundOrNull(wCurrent.wind_direction_10m, 0),
        condition: weatherJson ? describeWmoWeatherCode(wCurrent.weather_code) : 'Weather data unavailable',
      },
      hourly,
      stations,
      dataMode: 'live',
      sourceName:
        `Open-Meteo CAMS Global Air Quality & Weather API${hasGroundStation ? ' + WAQI ground station' : ''}`,
      sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
      timestamp,
      uncertaintyNote:
        'Atmospheric model grid (~11–40 km) represents neighborhood-scale background conditions and may under-capture roadside exhaust, construction dust, or indoor sources. ' +
        (missing.length
          ? `Unavailable in this feed: ${missing.join(', ')} (shown as N/A, never substituted).`
          : 'All reported current pollutant fields are present in the upstream response.'),
    };
  } catch {
    return demoFallback(city);
  }
}

export async function getMultiCitySnapshots(
  forceDemoMode?: boolean
): Promise<AirQualityStation[]> {
  const resolved = resolveDemoMode(forceDemoMode, undefined);
  const results = await Promise.all(
    FEATURED_CITIES.map((c) => getAirQualityForLocation(c, { forceDemoMode: resolved }))
  );
  return results.flatMap((payload) => payload.stations);
}
