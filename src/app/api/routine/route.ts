import { NextRequest, NextResponse } from 'next/server';
import { getAirQualityForLocation } from '@/lib/air-quality-service';
import { generateCleanerDayRoutine } from '@/lib/routine-engine';
import { getSettings } from '@/lib/store';
import { getSessionId, rateLimitKey } from '@/lib/request-context';
import { checkRateLimit } from '@/lib/rate-limit';
import { resolveDemoMode } from '@/lib/demo-mode';
import {
  parseBudgetTier,
  parseCityLocation,
  parseCommuteMode,
  parsePlannedActivities,
  parseSensitivityGroup,
  readJsonObject,
} from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const sessionId = getSessionId(req);
    const limit = checkRateLimit(rateLimitKey(sessionId, req, 'routine'));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const body = (await readJsonObject(req)) ?? {};
    const settings = await getSettings(sessionId);
    const location = parseCityLocation(body.location) ?? settings.defaultCity;
    const forceDemo = resolveDemoMode(
      typeof body.forceDemoMode === 'boolean' ? body.forceDemoMode : undefined,
      settings.forceDemoMode
    );

    const airQuality = await getAirQualityForLocation(location, {
      forceDemoMode: forceDemo,
    });

    const routine = generateCleanerDayRoutine(airQuality, {
      sensitivityGroup: parseSensitivityGroup(body.sensitivityGroup) ?? settings.sensitivityGroup,
      budgetTier: parseBudgetTier(body.budgetTier) ?? settings.budgetTier,
      plannedActivities: parsePlannedActivities(body.plannedActivities),
      commuteMode: parseCommuteMode(body.commuteMode),
    });

    return NextResponse.json({ routine, airQuality });
  } catch {
    return NextResponse.json({ error: 'Failed to generate daily routine' }, { status: 500 });
  }
}
