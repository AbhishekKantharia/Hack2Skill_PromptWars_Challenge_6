import type { NextRequest } from 'next/server';
import type {
  BudgetTier,
  CityLocation,
  SensitivityGroup,
  SpaceType,
  UserSettings,
} from '@/types/breathewise';
import type { AirIndxMarker, AirIndxMarkersResponse } from '@/types/airindx';
import { SUSTAINABILITY_ACTIONS } from '@/lib/calculations';

const SENSITIVITY_GROUPS: SensitivityGroup[] = [
  'general',
  'children',
  'older_adults',
  'respiratory',
  'outdoor_athletes',
];
const BUDGET_TIERS: BudgetTier[] = ['free_first', 'balanced', 'advanced'];
const SPACE_TYPES: SpaceType[] = ['household', 'school', 'neighborhood', 'housing_society'];
const CATEGORIES = [
  'smoke_haze',
  'traffic_congestion',
  'construction_dust',
  'waste_burning',
  'clear_breeze',
  'green_commute',
] as const;
const SEVERITIES = ['low', 'moderate', 'high'] as const;
export const COMMUNITY_CATEGORIES = CATEGORIES;
export const COMMUNITY_SEVERITIES = SEVERITIES;

export async function readJsonObject(
  req: NextRequest,
  maxBytes = 16_000
): Promise<Record<string, unknown> | null> {
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      void 0;
    }
  }
}

export function asText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

export function asFiniteNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export function sanitizePlaceName(value: unknown, maxLength = 80): string | null {
  const text = asText(value, maxLength * 4);
  if (!text) return null;
  const cleaned = text
    .replace(/[^\p{L}\p{N}\s.,'’()\-/]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  return cleaned || null;
}

export function redactCoordinateLikeText(value: unknown, maxLength = 160): string {
  const text = asText(value, maxLength * 4) ?? '';
  return text
    .replace(/\b\d{1,3}\s*°\s*\d{1,2}\s*['′]\s*\d{1,2}(?:\.\d+)?\s*["″]?\s*[NSEW]?\b/gi, '[redacted]')
    .replace(/\b-?\d{1,3}(?:\.\d{1,6})?\s*[,;]\s*-?\d{1,3}(?:\.\d{1,6})?\b/g, '[redacted]')
    .replace(/\b-?\d{1,3}(?:\.\d{1,6})?\s+-?\d{1,3}(?:\.\d{1,6})?\b/g, '[redacted]')
    .replace(/\b-?\d{2,3}\.\d{3,}\b/g, '[redacted]')
    .replace(/\b\d{1,3}\.\d{2,}\s*°?\s*[NSEW]\b/gi, '[redacted]')
    .slice(0, maxLength);
}

function isValidTimezone(value: unknown): string | undefined {
  const text = asText(value, 64);
  if (!text) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: text });
    return text;
  } catch {
    return undefined;
  }
}

export function parseCityLocation(value: unknown): CityLocation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const name = sanitizePlaceName(raw.name, 80);
  const lat = asFiniteNumber(raw.lat, -90, 90);
  const lon = asFiniteNumber(raw.lon, -180, 180);
  if (!name || lat === null || lon === null) return null;
  return {
    name,
    country: sanitizePlaceName(raw.country, 80) ?? '',
    region: sanitizePlaceName(raw.region, 80) ?? undefined,
    timezone: isValidTimezone(raw.timezone),
    lat,
    lon,
  };
}

export function parseSensitivityGroup(value: unknown): SensitivityGroup | null {
  return typeof value === 'string' && SENSITIVITY_GROUPS.includes(value as SensitivityGroup)
    ? (value as SensitivityGroup)
    : null;
}

export function parseBudgetTier(value: unknown): BudgetTier | null {
  return typeof value === 'string' && BUDGET_TIERS.includes(value as BudgetTier)
    ? (value as BudgetTier)
    : null;
}

export function parseSpaceType(value: unknown): SpaceType | null {
  return typeof value === 'string' && SPACE_TYPES.includes(value as SpaceType)
    ? (value as SpaceType)
    : null;
}

export function parseSettingsPatch(
  raw: Record<string, unknown>
): Partial<UserSettings> | null {
  const patch: Partial<UserSettings> = {};
  if ('displayName' in raw) {
    const name = asText(raw.displayName, 48);
    if (name) patch.displayName = name;
  }
  if ('defaultCity' in raw) {
    const city = parseCityLocation(raw.defaultCity);
    if (city) patch.defaultCity = city;
  }
  const sensitivity = parseSensitivityGroup(raw.sensitivityGroup);
  if (sensitivity) patch.sensitivityGroup = sensitivity;
  const budget = parseBudgetTier(raw.budgetTier);
  if (budget) patch.budgetTier = budget;
  const spaceType = parseSpaceType(raw.spaceType);
  if (spaceType) patch.spaceType = spaceType;
  const groupSize = asFiniteNumber(raw.groupSize, 1, 100000);
  if (groupSize !== null) patch.groupSize = Math.round(groupSize);
  if (typeof raw.setupComplete === 'boolean') patch.setupComplete = raw.setupComplete;
  if (raw.theme === 'light' || raw.theme === 'dark') patch.theme = raw.theme;
  if (raw.units === 'metric' || raw.units === 'imperial') patch.units = raw.units;
  if (typeof raw.forceDemoMode === 'boolean') patch.forceDemoMode = raw.forceDemoMode;

  if (raw.alerts && typeof raw.alerts === 'object' && !Array.isArray(raw.alerts)) {
    const alerts = raw.alerts as Record<string, unknown>;
    const thresholds: Array<[keyof UserSettings['alerts'], number, number]> = [
      ['highAqiThreshold', 20, 500],
      ['severeAqiThreshold', 50, 500],
      ['spikeDeltaThreshold', 5, 200],
      ['favorableVentilationMaxAqi', 10, 150],
    ];
    const toggles: Array<keyof UserSettings['alerts']> = [
      'enableHighAqi',
      'enableSevereAqi',
      'enableSpikeAlerts',
      'enableForecastSpikes',
      'enableVentilationWindows',
    ];
    const next: Partial<UserSettings['alerts']> = {};
    for (const [key, min, max] of thresholds) {
      const value = asFiniteNumber(alerts[key as string], min, max);
      if (value !== null) (next as Record<string, number>)[key as string] = value;
    }
    for (const key of toggles) {
      if (typeof alerts[key] === 'boolean') {
        (next as Record<string, boolean>)[key] = alerts[key] as boolean;
      }
    }
    const high = (next as Record<string, number>).highAqiThreshold;
    const severe = (next as Record<string, number>).severeAqiThreshold;
    const ventilation = (next as Record<string, number>).favorableVentilationMaxAqi;
    if (typeof high === 'number' && typeof severe === 'number' && severe <= high) return null;
    if (typeof high === 'number' && typeof ventilation === 'number' && ventilation >= high) {
      return null;
    }
    if (Object.keys(next).length) {
      patch.alerts = next as UserSettings['alerts'];
    }
  }

  return Object.keys(patch).length ? patch : null;
}

export function validateAlertOrder(alerts: UserSettings['alerts']): boolean {
  return alerts.severeAqiThreshold > alerts.highAqiThreshold &&
    alerts.favorableVentilationMaxAqi < alerts.highAqiThreshold;
}

function safeSourceUrl(value: unknown): string | null {
  const text = asText(value, 300);
  if (!text) return null;
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== 'https:') return null;
    const allowed =
      parsed.hostname === 'open-meteo.com' ||
      parsed.hostname.endsWith('.open-meteo.com') ||
      parsed.hostname === 'waqi.info' ||
      parsed.hostname.endsWith('.waqi.info');
    return allowed ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function parseNullableNumber(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null || value === undefined) return null;
  return asFiniteNumber(value, min, max) ?? undefined;
}

export function parseAirIndxMarkersResponse(value: unknown): AirIndxMarkersResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.markers) || raw.markers.length > 64) return null;

  const markers: AirIndxMarker[] = [];
  for (const item of raw.markers) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const entry = item as Record<string, unknown>;
    const id = asText(entry.id, 80);
    const name = asText(entry.name, 120);
    const country = asText(entry.country, 120);
    const countryCode = asText(entry.countryCode, 8);
    const timezone = isValidTimezone(entry.timezone) ?? 'UTC';
    const lat = asFiniteNumber(entry.lat, -90, 90);
    const lon = asFiniteNumber(entry.lon, -180, 180);
    const aqi = asFiniteNumber(entry.aqi, 0, 500);
    const category = asText(entry.category, 80);
    const colorHex = asText(entry.colorHex, 7)?.toLowerCase();
    const dominantPollutant = asText(entry.dominantPollutant, 40);
    const temperatureC = parseNullableNumber(entry.temperatureC, -100, 100);
    const humidityPct = parseNullableNumber(entry.humidityPct, 0, 100);
    const windSpeedKmh = parseNullableNumber(entry.windSpeedKmh, 0, 500);
    const dataMode = entry.dataMode === 'live' || entry.dataMode === 'demo' ? entry.dataMode : null;
    const sourceName = asText(entry.sourceName, 160);
    const sourceUrl = safeSourceUrl(entry.sourceUrl);
    const timestamp = asText(entry.timestamp, 64);
    const timestampMs = timestamp ? Date.parse(timestamp) : Number.NaN;

    if (
      !id || !name || !country || !countryCode || lat === null || lon === null ||
      aqi === null || !category || !colorHex || !/^#[0-9a-f]{6}$/.test(colorHex) ||
      !dominantPollutant || temperatureC === undefined || humidityPct === undefined ||
      windSpeedKmh === undefined || !dataMode || !sourceName || !sourceUrl ||
      !timestamp || !Number.isFinite(timestampMs)
    ) {
      return null;
    }

    markers.push({
      id, name, country, countryCode, timezone, lat, lon, aqi, category, colorHex,
      dominantPollutant, temperatureC, humidityPct, windSpeedKmh, dataMode,
      sourceName, sourceUrl, timestamp,
    });
  }

  const dataMode = raw.dataMode === 'live' || raw.dataMode === 'demo' ? raw.dataMode : null;
  const degraded = typeof raw.degraded === 'boolean' ? raw.degraded : null;
  const fetchedAt = asText(raw.fetchedAt, 64);
  const fetchedAtMs = fetchedAt ? Date.parse(fetchedAt) : Number.NaN;
  if (!dataMode || degraded === null || !fetchedAt || !Number.isFinite(fetchedAtMs)) return null;

  return { markers, dataMode, degraded, fetchedAt };
}

export function parseFrequencies(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const action of SUSTAINABILITY_ACTIONS) {
    const value = raw[action.id];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue;
    result[action.id] = Math.min(action.maxFrequency, Math.floor(value));
  }
  return result;
}

export function parseObservationInput(raw: Record<string, unknown>): {
  neighborhood: string;
  city: string;
  category: (typeof CATEGORIES)[number];
  severity: (typeof SEVERITIES)[number];
  description: string;
} | null {
  const neighborhood = redactCoordinateLikeText(raw.neighborhood, 80) || null;
  const city = sanitizePlaceName(raw.city, 60);
  const description = redactCoordinateLikeText(raw.description, 320) || null;
  const category = CATEGORIES.includes(raw.category as (typeof CATEGORIES)[number])
    ? (raw.category as (typeof CATEGORIES)[number])
    : null;
  const severity = SEVERITIES.includes(raw.severity as (typeof SEVERITIES)[number])
    ? (raw.severity as (typeof SEVERITIES)[number])
    : 'moderate';
  if (!neighborhood || !city || !description || !category) return null;
  return { neighborhood, city, category, severity, description };
}

export function parsePlannedActivities(value: unknown): string[] {
  const allowed = [
    'outdoor_exercise',
    'commute',
    'cooking',
    'errands',
    'remote_work',
    'kids_outdoor',
  ];
  if (!Array.isArray(value)) return ['outdoor_exercise', 'commute', 'cooking'];
  return value.filter((v): v is string => typeof v === 'string' && allowed.includes(v)).slice(0, 5);
}

export function parseCommuteMode(value: unknown): 'car' | 'transit' | 'walk_bike' | 'remote' {
  return value === 'car' || value === 'transit' || value === 'walk_bike' || value === 'remote'
    ? value
    : 'transit';
}
