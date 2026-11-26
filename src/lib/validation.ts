import type { NextRequest } from 'next/server';
import type {
  BudgetTier,
  CityLocation,
  SensitivityGroup,
  UserSettings,
} from '@/types/breathewise';
import { SUSTAINABILITY_ACTIONS } from '@/lib/calculations';

const SENSITIVITY_GROUPS: SensitivityGroup[] = [
  'general',
  'children',
  'older_adults',
  'respiratory',
  'outdoor_athletes',
];
const BUDGET_TIERS: BudgetTier[] = ['free_first', 'balanced', 'advanced'];
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
      if (total > maxBytes) return null;
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

export function parseFrequencies(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const action of SUSTAINABILITY_ACTIONS) {
    const value = raw[action.id];
    if (typeof value !== 'number' && typeof value !== 'string') continue;
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) {
      result[action.id] = Math.min(action.maxFrequency, Math.floor(n));
    }
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
