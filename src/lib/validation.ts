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

export async function readJsonObject(
  req: NextRequest,
  maxBytes = 16_000
): Promise<Record<string, unknown> | null> {
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > maxBytes) return null;
  const body: unknown = await req.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

export function asText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

export function asFiniteNumber(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export function parseCityLocation(value: unknown): CityLocation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const name = asText(raw.name, 80);
  const lat = asFiniteNumber(raw.lat, -90, 90);
  const lon = asFiniteNumber(raw.lon, -180, 180);
  if (!name || lat === null || lon === null) return null;
  return {
    name,
    country: asText(raw.country, 80) ?? '',
    region: asText(raw.region, 80) ?? undefined,
    timezone: asText(raw.timezone, 64) ?? undefined,
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
  const neighborhood = asText(raw.neighborhood, 80);
  const city = asText(raw.city, 60);
  const description = asText(raw.description, 320);
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
