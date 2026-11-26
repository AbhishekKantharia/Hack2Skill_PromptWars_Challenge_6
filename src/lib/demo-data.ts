import type {
  AirQualityPayload,
  CityLocation,
  CommunityChallenge,
  CommunityObservation,
  UserSettings,
} from '@/types/breathewise';
import { determineDominantPollutant, getAqiMeta } from '@/lib/aqi';
import { formatLocalHour, hourFromLabel } from '@/lib/time';

export const FEATURED_CITIES: CityLocation[] = [
  { name: 'New Delhi', country: 'India', region: 'Delhi NCR', lat: 28.6139, lon: 77.209, timezone: 'Asia/Kolkata' },
  { name: 'London', country: 'United Kingdom', region: 'Greater London', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London' },
  { name: 'San Francisco', country: 'United States', region: 'California', lat: 37.7749, lon: -122.4194, timezone: 'America/Los_Angeles' },
  { name: 'Tokyo', country: 'Japan', region: 'Kanto', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo' },
  { name: 'Nairobi', country: 'Kenya', region: 'Nairobi County', lat: -1.2921, lon: 36.8219, timezone: 'Africa/Nairobi' },
  { name: 'São Paulo', country: 'Brazil', region: 'São Paulo', lat: -23.5505, lon: -46.6333, timezone: 'America/Sao_Paulo' },
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  displayName: 'Urban Explorer',
  defaultCity: FEATURED_CITIES[0],
  sensitivityGroup: 'general',
  budgetTier: 'balanced',
  theme: 'light',
  units: 'metric',
  forceDemoMode: false,
  alerts: {
    highAqiThreshold: 101,
    severeAqiThreshold: 201,
    spikeDeltaThreshold: 35,
    favorableVentilationMaxAqi: 65,
    enableHighAqi: true,
    enableSevereAqi: true,
    enableSpikeAlerts: true,
    enableForecastSpikes: true,
    enableVentilationWindows: true,
  },
};

interface DemoCityProfile {
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  aqi: number;
  tempC: number;
  humidityPct: number;
  windKmh: number;
  condition: string;
}

const DEMO_CITY_PROFILES: Record<string, DemoCityProfile> = {
  'New Delhi': {
    pm25: 94.2,
    pm10: 158.0,
    no2: 46.5,
    so2: 14.2,
    co: 1120,
    o3: 52.0,
    aqi: 171,
    tempC: 23.4,
    humidityPct: 58,
    windKmh: 7.2,
    condition: 'Hazy urban inversion (Sample)',
  },
  London: {
    pm25: 11.4,
    pm10: 18.9,
    no2: 24.8,
    so2: 4.1,
    co: 320,
    o3: 64.0,
    aqi: 48,
    tempC: 12.1,
    humidityPct: 74,
    windKmh: 16.5,
    condition: 'Cool breeze (Sample)',
  },
  'San Francisco': {
    pm25: 9.2,
    pm10: 16.4,
    no2: 18.2,
    so2: 2.9,
    co: 285,
    o3: 58.0,
    aqi: 41,
    tempC: 16.8,
    humidityPct: 68,
    windKmh: 19.4,
    condition: 'Coastal onshore flow (Sample)',
  },
  Tokyo: {
    pm25: 16.8,
    pm10: 27.5,
    no2: 29.4,
    so2: 5.8,
    co: 410,
    o3: 72.5,
    aqi: 61,
    tempC: 15.2,
    humidityPct: 54,
    windKmh: 12.8,
    condition: 'Partly cloudy (Sample)',
  },
  Nairobi: {
    pm25: 22.6,
    pm10: 41.2,
    no2: 21.0,
    so2: 6.4,
    co: 490,
    o3: 61.0,
    aqi: 73,
    tempC: 22.5,
    humidityPct: 61,
    windKmh: 11.0,
    condition: 'Mild highland air (Sample)',
  },
  'São Paulo': {
    pm25: 19.4,
    pm10: 33.8,
    no2: 34.1,
    so2: 7.2,
    co: 540,
    o3: 69.2,
    aqi: 66,
    tempC: 24.8,
    humidityPct: 63,
    windKmh: 10.6,
    condition: 'Warm urban mix (Sample)',
  },
};

export function buildDemoAirQualityPayload(city: CityLocation): AirQualityPayload {
  const profile = DEMO_CITY_PROFILES[city.name] ?? {
    pm25: 24.5,
    pm10: 42.0,
    no2: 27.0,
    so2: 6.5,
    co: 460,
    o3: 62.0,
    aqi: 77,
    tempC: 20.0,
    humidityPct: 58,
    windKmh: 11.5,
    condition: 'Sample reference weather',
  };

  const now = new Date();
  const hourly = Array.from({ length: 24 }, (_, idx) => {
    const offset = idx - 8; // 8 past hours + 16 forecast hours
    const dt = new Date(now.getTime() + offset * 3600 * 1000);
    const label = formatLocalHour(dt.toISOString(), city.timezone);
    const hourOfDay = hourFromLabel(label) ?? 12;
    // Realistic diurnal urban traffic + boundary layer curve (morning/evening peaks, midday dip)
    const diurnalFactor =
      hourOfDay >= 7 && hourOfDay <= 10
        ? 1.12
        : hourOfDay >= 19 && hourOfDay <= 22
          ? 1.18
          : hourOfDay >= 13 && hourOfDay <= 16
            ? 0.82
            : 0.96;

    const aqi = Math.max(15, Math.round(profile.aqi * diurnalFactor));
    const pm25 = Number((profile.pm25 * diurnalFactor).toFixed(1));
    const pm10 = Number((profile.pm10 * diurnalFactor).toFixed(1));
    const no2 = Number((profile.no2 * (hourOfDay >= 7 && hourOfDay <= 20 ? 1.1 : 0.85)).toFixed(1));
    const o3 = Number((profile.o3 * (hourOfDay >= 12 && hourOfDay <= 17 ? 1.25 : 0.78)).toFixed(1));

    return {
      time: dt.toISOString(),
      label,
      aqi,
      pm25,
      pm10,
      o3,
      no2,
      isForecast: offset > 0,
    };
  });

  const pollutants = {
    pm25: profile.pm25,
    pm10: profile.pm10,
    no2: profile.no2,
    so2: profile.so2,
    co: profile.co,
    o3: profile.o3,
  };

  const meta = getAqiMeta(profile.aqi);
  const dominantPollutant = determineDominantPollutant(pollutants);

  const stations = [
    {
      id: `demo-central-${city.name}`,
      name: `${city.name} Central District (Demo)`,
      city: city.name,
      lat: city.lat,
      lon: city.lon,
      aqi: profile.aqi,
      pm25: profile.pm25,
      pm10: profile.pm10,
      no2: profile.no2,
      o3: profile.o3,
      sourceType: 'demo' as const,
      sourceLabel: 'DEMO SAMPLE STATION — NOT LIVE SENSOR',
      updatedAt: now.toISOString(),
    },
    {
      id: `demo-corridor-${city.name}`,
      name: `${city.name} Transit Corridor (Demo)`,
      city: city.name,
      lat: city.lat + 0.032,
      lon: city.lon - 0.028,
      aqi: Math.min(450, Math.round(profile.aqi * 1.12)),
      pm25: Number((profile.pm25 * 1.12).toFixed(1)),
      pm10: Number((profile.pm10 * 1.14).toFixed(1)),
      no2: Number((profile.no2 * 1.25).toFixed(1)),
      o3: Number((profile.o3 * 0.92).toFixed(1)),
      sourceType: 'demo' as const,
      sourceLabel: 'DEMO SAMPLE STATION — NOT LIVE SENSOR',
      updatedAt: now.toISOString(),
    },
    {
      id: `demo-park-${city.name}`,
      name: `${city.name} Greenbelt Park (Demo)`,
      city: city.name,
      lat: city.lat - 0.029,
      lon: city.lon + 0.035,
      aqi: Math.max(15, Math.round(profile.aqi * 0.84)),
      pm25: Number((profile.pm25 * 0.84).toFixed(1)),
      pm10: Number((profile.pm10 * 0.86).toFixed(1)),
      no2: Number((profile.no2 * 0.78).toFixed(1)),
      o3: Number((profile.o3 * 1.05).toFixed(1)),
      sourceType: 'demo' as const,
      sourceLabel: 'DEMO SAMPLE STATION — NOT LIVE SENSOR',
      updatedAt: now.toISOString(),
    },
  ];

  return {
    location: city,
    aqi: profile.aqi,
    aqiScale: 'US EPA',
    category: meta.category,
    dominantPollutant,
    pollutants,
    weather: {
      temperatureC: profile.tempC,
      humidityPct: profile.humidityPct,
      windSpeedKmh: profile.windKmh,
      windDirectionDeg: 285,
      condition: profile.condition,
    },
    hourly,
    stations,
    dataMode: 'demo',
    sourceName: 'DEMO MODE — Sample Reference Dataset (Not Live Sensor Readings)',
    sourceUrl: 'https://open-meteo.com/en/docs/air-quality-api',
    timestamp: now.toISOString(),
    uncertaintyNote:
      'Demo Mode active: values shown are realistic illustrative reference patterns, not real-time local measurements. Switch off Force Demo Mode with internet access to query live Open-Meteo environmental streams.',
  };
}

export const INITIAL_COMMUNITY_OBSERVATIONS: CommunityObservation[] = [
  {
    id: 'obs-1',
    neighborhood: 'Central Park North Sector',
    city: 'New Delhi',
    category: 'traffic_congestion',
    severity: 'high',
    description:
      'Heavy evening commuter idling near the arterial roundabout; noticeable diesel odor along sidewalks.',
    verificationType: 'user_submitted',
    upvotes: 14,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'obs-2',
    neighborhood: 'Riverside Greenbelt',
    city: 'London',
    category: 'clear_breeze',
    severity: 'low',
    description:
      'Steady westerly breeze clearing morning mist along the cycling path; comfortable visibility.',
    verificationType: 'user_submitted',
    upvotes: 9,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 'obs-3',
    neighborhood: 'East Industrial Perimeter',
    city: 'New Delhi',
    category: 'waste_burning',
    severity: 'high',
    description:
      'Observed open dry-leaf burning near vacant lot; local neighbors notified municipal sanitation helpline.',
    verificationType: 'user_submitted',
    upvotes: 21,
    createdAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
  },
  {
    id: 'obs-4',
    neighborhood: 'Mission Transit Corridor',
    city: 'San Francisco',
    category: 'green_commute',
    severity: 'low',
    description:
      'Neighborhood school walking-bus group completed morning drop-off with 18 families leaving cars at home.',
    verificationType: 'user_submitted',
    upvotes: 17,
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
];

export const INITIAL_COMMUNITY_CHALLENGES: CommunityChallenge[] = [
  {
    id: 'chal-carfree-week',
    title: '5-Day Transit & Walk-to-School Sprint',
    neighborhood: 'Metro School Districts',
    description:
      'Replace short drop-off or errand car trips with walking, cycling (when AQI < 100), or public transit.',
    targetActions: 250,
    currentActions: 174,
    participantsCount: 68,
    badgeName: 'Clean Corridor Steward',
    endsOn: '2026-12-15',
  },
  {
    id: 'chal-no-idle',
    title: 'Zero-Idling Pick-Up Zone Pledge',
    neighborhood: 'Neighborhood Transit Hubs',
    description:
      'Turn off engines when parked for >60 seconds outside schools, clinics, and grocery pickup lanes.',
    targetActions: 400,
    currentActions: 312,
    participantsCount: 115,
    badgeName: 'Idle-Free Advocate',
    endsOn: '2026-12-20',
  },
  {
    id: 'chal-clean-kitchen',
    title: 'Ventilated & Clean Cooking Check-In',
    neighborhood: 'Citywide Households',
    description:
      'Run exhaust fans or cross-ventilate during high-heat cooking and avoid indoor incense/smoke during low-ventilation evenings.',
    targetActions: 300,
    currentActions: 189,
    participantsCount: 84,
    badgeName: 'Healthy Home Champion',
    endsOn: '2026-12-31',
  },
];
