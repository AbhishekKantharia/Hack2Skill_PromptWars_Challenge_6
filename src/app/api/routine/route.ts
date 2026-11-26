import { NextRequest, NextResponse } from 'next/server';
import { getAirQualityForLocation } from '@/lib/air-quality-service';
import { generateCleanerDayRoutine } from '@/lib/routine-engine';
import { getSettings } from '@/lib/store';
import { getSessionId } from '@/lib/request-context';
import { withApiPolicy } from '@/lib/api-route';
import { resolveDemoMode } from '@/lib/demo-mode';
import {
  parseBudgetTier,
  parseCityLocation,
  parseCommuteMode,
  parsePlannedActivities,
  parseSensitivityGroup,
  readJsonObject,
} from '@/lib/validation';

export const POST = withApiPolicy('routine', 'Failed to generate daily routine', async (req: NextRequest) => {
  const sessionId = getSessionId(req);
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
});
