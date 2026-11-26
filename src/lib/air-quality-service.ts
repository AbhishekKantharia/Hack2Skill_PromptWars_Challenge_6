import type {
  AirQualityPayload,
  AirQualityStation,
  CityLocation,
  HourlyAirPoint,
} from '@/types/breathewise';
import { determineDominantPollutant, getAqiMeta, pm25ToUsAqi } from '@/lib/aqi';
import { buildDemoAirQualityPayload, FEATURED_CITIES } from '@/lib/demo-data';

function describeWmoWeatherCode(code: number | null | undefined): string {
  if (code === null || code === undefined) return 'Observed conditions';
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Fog / mist';
  if (code >= 51 && code <= 67) return 'Rain / drizzle';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Variable sky';
}

export async function searchCities(query: string): Promise<CityLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) return FEATURED_CITIES;

  // Always allow matching local featured cities immediately if offline
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
        name: item.name,
        country: item.country ?? 'Unknown',
        region: item.admin1,
        lat: item.latitude,
        lon: item.longitude,
        timezone: item.timezone,
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
  const forceDemo =
    options?.forceDemoMode === true || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  if (forceDemo) {
    return buildDemoAirQualityPayload(city);
  }

  try {
    const aqUrl =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}` +
      `&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone` +
      `&hourly=us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone` +
      `&past_hours=8&forecast_hours=16&timezone=auto`;

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=auto`;

    const [aqRes, weatherRes] = await Promise.all([
      fetch(aqUrl, { cache: 'no-store', signal: AbortSignal.timeout(7000) }),
      fetch(weatherUrl, { cache: 'no-store', signal: AbortSignal.timeout(7000) }),
    ]);

    if (!aqRes.ok) {
      throw new Error(`Open-Meteo Air Quality HTTP ${aqRes.status}`);
    }

    const aqJson = await aqRes.json();
    const weatherJson = weatherRes.ok ? await weatherRes.json() : null;

    const current = aqJson.current ?? {};
    const pm25 = typeof current.pm2_5 === 'number' ? Number(current.pm2_5.toFixed(1)) : null;
    const pm10 = typeof current.pm10 === 'number' ? Number(current.pm10.toFixed(1)) : null;
    const no2 =
      typeof current.nitrogen_dioxide === 'number'
        ? Number(current.nitrogen_dioxide.toFixed(1))
        : null;
    const so2 =
      typeof current.sulphur_dioxide === 'number'
        ? Number(current.sulphur_dioxide.toFixed(1))
        : null;
    const co =
      typeof current.carbon_monoxide === 'number'
        ? Number(current.carbon_monoxide.toFixed(0))
        : null;
    const o3 = typeof current.ozone === 'number' ? Number(current.ozone.toFixed(1)) : null;

    const aqi =
      typeof current.us_aqi === 'number'
        ? Math.round(current.us_aqi)
        : pm25 !== null
          ? pm25ToUsAqi(pm25)
          : 50;

    const pollutants = { pm25, pm10, no2, so2, co, o3 };
    const meta = getAqiMeta(aqi);
    const dominantPollutant = determineDominantPollutant(pollutants);

    const hourlyTimes: string[] = aqJson.hourly?.time ?? [];
    const hourlyAqi: Array<number | null> = aqJson.hourly?.us_aqi ?? [];
    const hourlyPm25: Array<number | null> = aqJson.hourly?.pm2_5 ?? [];
    const hourlyPm10: Array<number | null> = aqJson.hourly?.pm10 ?? [];
    const hourlyO3: Array<number | null> = aqJson.hourly?.ozone ?? [];
    const hourlyNo2: Array<number | null> = aqJson.hourly?.nitrogen_dioxide ?? [];

    const nowMs = Date.now();
    const hourly: HourlyAirPoint[] = hourlyTimes.slice(0, 24).map((iso, i) => {
      const dt = new Date(iso);
      const pm25Val = hourlyPm25[i] ?? pm25 ?? 12;
      const aqiVal =
        typeof hourlyAqi[i] === 'number'
          ? Math.round(hourlyAqi[i] as number)
          : pm25ToUsAqi(pm25Val);
      return {
        time: iso,
        label: iso.includes('T') ? iso.split('T')[1].slice(0, 5) : dt.toTimeString().slice(0, 5),
        aqi: aqiVal,
        pm25: Number((pm25Val ?? 0).toFixed(1)),
        pm10: Number((hourlyPm10[i] ?? pm10 ?? 0).toFixed(1)),
        o3: Number((hourlyO3[i] ?? o3 ?? 0).toFixed(1)),
        no2: Number((hourlyNo2[i] ?? no2 ?? 0).toFixed(1)),
        isForecast: dt.getTime() > nowMs,
      };
    });

    const wCurrent = weatherJson?.current ?? {};
    const timestamp =
      typeof current.time === 'string'
        ? current.time
        : new Date().toISOString();

    // Build real spatial grid points around the queried location using Open-Meteo model grid
    // and optionally WAQI station if WAQI_API_TOKEN is configured.
    const stations: AirQualityStation[] = [
      {
        id: `openmeteo-center-${city.lat.toFixed(2)}-${city.lon.toFixed(2)}`,
        name: `${city.name} (CAMS / Open-Meteo Grid)`,
        city: city.name,
        lat: city.lat,
        lon: city.lon,
        aqi,
        pm25: pm25 ?? 0,
        pm10: pm10 ?? 0,
        no2: no2 ?? 0,
        o3: o3 ?? 0,
        sourceType: 'model_grid',
        sourceLabel: 'Open-Meteo CAMS Atmospheric Grid (Live)',
        updatedAt: timestamp,
      },
    ];

    // Optional WAQI ground monitoring station enrichment when token is present
    const waqiToken = process.env.WAQI_API_TOKEN;
    if (waqiToken) {
      try {
        const waqiRes = await fetch(
          `https://api.waqi.info/feed/geo:${city.lat};${city.lon}/?token=${encodeURIComponent(
            waqiToken
          )}`,
          { cache: 'no-store', signal: AbortSignal.timeout(3500) }
        );
        if (waqiRes.ok) {
          const waqiJson = await waqiRes.json();
          if (waqiJson.status === 'ok' && waqiJson.data) {
            const d = waqiJson.data;
            const geo = d.city?.geo;
            if (Array.isArray(geo) && geo.length === 2) {
              stations.push({
                id: `waqi-${d.idx ?? 'station'}`,
                name: d.city?.name ?? `${city.name} Ground Monitor`,
                city: city.name,
                lat: Number(geo[0]),
                lon: Number(geo[1]),
                aqi: typeof d.aqi === 'number' ? d.aqi : aqi,
                pm25: d.iaqi?.pm25?.v ?? pm25 ?? 0,
                pm10: d.iaqi?.pm10?.v ?? pm10 ?? 0,
                no2: d.iaqi?.no2?.v ?? no2 ?? 0,
                o3: d.iaqi?.o3?.v ?? o3 ?? 0,
                sourceType: 'official',
                sourceLabel: 'WAQI Official Ground Monitoring Station',
                updatedAt: d.time?.iso ?? timestamp,
              });
            }
          }
        }
      } catch {
        // Non-blocking optional enrichment
      }
    }

    return {
      location: city,
      aqi,
      aqiScale: 'US EPA',
      category: meta.category,
      dominantPollutant,
      pollutants,
      weather: {
        temperatureC:
          typeof wCurrent.temperature_2m === 'number'
            ? Number(wCurrent.temperature_2m.toFixed(1))
            : null,
        humidityPct:
          typeof wCurrent.relative_humidity_2m === 'number'
            ? Math.round(wCurrent.relative_humidity_2m)
            : null,
        windSpeedKmh:
          typeof wCurrent.wind_speed_10m === 'number'
            ? Number(wCurrent.wind_speed_10m.toFixed(1))
            : null,
        windDirectionDeg:
          typeof wCurrent.wind_direction_10m === 'number'
            ? Math.round(wCurrent.wind_direction_10m)
            : null,
        condition: describeWmoWeatherCode(wCurrent.weather_code),
      },
      hourly,
      stations,
      dataMode: 'live',
      sourceName: waqiToken
        ? 'Open-Meteo CAMS Air Quality & Weather + WAQI Ground Station'
        : 'Open-Meteo CAMS Global Air Quality & Weather API',
      sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
      timestamp,
      uncertaintyNote:
        'Satellite & atmospheric reanalysis models (~11–40 km grid) represent neighborhood-scale background conditions and may under-capture hyperlocal roadside exhaust, construction dust, or indoor cooking smoke.',
    };
  } catch {
    return buildDemoAirQualityPayload(city);
  }
}

export async function getMultiCitySnapshots(
  forceDemoMode = false
): Promise<AirQualityStation[]> {
  const results = await Promise.all(
    FEATURED_CITIES.map((c) => getAirQualityForLocation(c, { forceDemoMode }))
  );
  return results.flatMap((payload) => payload.stations);
}
