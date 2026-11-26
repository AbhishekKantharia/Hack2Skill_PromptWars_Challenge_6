import { NextRequest, NextResponse } from 'next/server';
import { getAirQualityForLocation } from '@/lib/air-quality-service';
import { generateCleanerDayRoutine } from '@/lib/routine-engine';
import { getSettings } from '@/lib/store';
import type { CityLocation } from '@/types/breathewise';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = await getSettings();
    const location: CityLocation = body.location ?? settings.defaultCity;
    const forceDemo =
      typeof body.forceDemoMode === 'boolean' ? body.forceDemoMode : settings.forceDemoMode;

    const airQuality = await getAirQualityForLocation(location, {
      forceDemoMode: forceDemo,
    });

    const routine = generateCleanerDayRoutine(airQuality, {
      sensitivityGroup: body.sensitivityGroup ?? settings.sensitivityGroup,
      budgetTier: body.budgetTier ?? settings.budgetTier,
      plannedActivities: Array.isArray(body.plannedActivities)
        ? body.plannedActivities
        : ['outdoor_exercise', 'commute', 'cooking'],
      commuteMode: body.commuteMode ?? 'transit',
    });

    return NextResponse.json({ routine, airQuality });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to generate daily routine', detail: String(err) },
      { status: 500 }
    );
  }
}
