import type {
  AirQualityPayload,
  BudgetTier,
  DailyRoutineResponse,
  HourlyAirPoint,
  RoutineItem,
  SensitivityGroup,
} from '@/types/breathewise';
import { SUSTAINABILITY_ACTIONS } from '@/lib/calculations';
import {
  getPlanningThreshold,
  getSensitiveMargin,
  getVentilationThreshold,
} from '@/lib/thresholds';
import { hourFromLabel } from '@/lib/time';

export interface RoutinePreferencesInput {
  sensitivityGroup: SensitivityGroup;
  budgetTier: BudgetTier;
  plannedActivities: string[];
  commuteMode: 'car' | 'transit' | 'walk_bike' | 'remote';
}

type DayPart = 'Morning' | 'Afternoon' | 'Evening';

function bucketForHour(hour: number): DayPart | null {
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 18) return 'Afternoon';
  if (hour >= 18) return 'Evening';
  return null;
}

function averageAqi(points: HourlyAirPoint[], fallback: number): number {
  return points.length
    ? Math.round(points.reduce((sum, point) => sum + point.aqi, 0) / points.length)
    : fallback;
}

function windowLabel(points: HourlyAirPoint[], fallback: string): string {
  if (!points.length) return fallback;
  const sorted = [...points].sort(
    (a, b) => (hourFromLabel(a.label) ?? 0) - (hourFromLabel(b.label) ?? 0)
  );
  return `${sorted[0].label} – ${sorted[sorted.length - 1].label}`;
}

function actionFactor(id: string): number {
  return SUSTAINABILITY_ACTIONS.find((action) => action.id === id)?.co2KgPerUnit ?? 0;
}

export function generateCleanerDayRoutine(
  aq: AirQualityPayload,
  prefs: RoutinePreferencesInput
): DailyRoutineResponse {
  const highThreshold = getPlanningThreshold(prefs.sensitivityGroup);
  const sensitiveMargin = getSensitiveMargin(prefs.sensitivityGroup);
  const effectiveAqi = Math.max(0, aq.aqi + sensitiveMargin);

  const future = aq.hourly.filter((point) => point.isForecast);
  const buckets: Record<DayPart, HourlyAirPoint[]> = {
    Morning: [],
    Afternoon: [],
    Evening: [],
  };
  for (const point of future) {
    const hour = hourFromLabel(point.label);
    if (hour === null) continue;
    const bucket = bucketForHour(hour);
    if (bucket) buckets[bucket].push(point);
  }
  for (const key of Object.keys(buckets) as DayPart[]) {
    if (buckets[key].length === 0) buckets[key] = future.slice(0, 4);
  }

  const morningAqi = averageAqi(buckets.Morning, aq.aqi);
  const afternoonAqi = averageAqi(buckets.Afternoon, aq.aqi);
  const eveningAqi = averageAqi(buckets.Evening, aq.aqi);

  const cleanestHour = future.reduce<HourlyAirPoint | null>(
    (best, point) => (!best || point.aqi < best.aqi ? point : best),
    null
  );

  const isMorningHigh = morningAqi >= highThreshold;
  const isEveningHigh = eveningAqi >= highThreshold;
  const ventilationThreshold = getVentilationThreshold(prefs.sensitivityGroup);
  const isAfternoonClean = afternoonAqi <= ventilationThreshold;
  const items: RoutineItem[] = [];

  items.push({
    id: 'morning-exercise',
    timeOfDay: 'Morning',
    timeWindow: windowLabel(buckets.Morning, '06:00 – 11:00'),
    action: isMorningHigh
      ? prefs.plannedActivities.includes('outdoor_exercise')
        ? 'Shift vigorous morning cardio indoors (home mobility, stationary bike, or ventilated gym)'
        : 'Review morning AQI before outdoor errands and keep exterior windows latched during the morning peak'
      : 'Consider outdoor walking or light exercise on side streets away from main roads',
    explanation: `Morning concentrations in ${aq.location.name} average around ~${morningAqi} US AQI (dominant pollutant: ${aq.dominantPollutant}). Your ${prefs.sensitivityGroup.replace('_', ' ')} profile uses a ${highThreshold} AQI planning threshold instead of 100.`,
    expectedBenefit:
      'Reduces inhalation of fine particles and NO₂ during exercise, when breathing rate and deposited dose increase.',
    estimatedCost: isMorningHigh
      ? prefs.budgetTier === 'free_first'
        ? '$0 (bodyweight or indoors at home)'
        : '$0 at home (existing gym fees if applicable)'
      : '$0 (Free)',
    environmentalImpact:
      'Walking or cycling short errands can avoid tailpipe emissions; expected climate benefit depends on the trip actually replaced.',
    caveat:
      'Indoor air is only cleaner if indoor combustion sources are absent; roadside and construction micro-environments can differ sharply from the city grid value.',
    forecastAqi: morningAqi,
  });

  const transitFactor = actionFactor('public_transit');
  const shortTripFactor = actionFactor('skip_short_car_trips');

  if (prefs.commuteMode === 'car') {
    items.push({
      id: 'afternoon-commute',
      timeOfDay: 'Afternoon',
      timeWindow: windowLabel(buckets.Afternoon, '12:00 – 17:00'),
      action:
        'Combine errands into one trip, avoid idling for more than 60 seconds, and use fresh-air cabin mode except in heavy traffic tunnels',
      explanation: `Afternoon AQI averages ~${afternoonAqi}. Midday mixing can improve dispersion, but stop-and-go traffic creates localized NO₂ and CO plumes near busy lanes.`,
      expectedBenefit:
        'Lowers in-cabin exposure spikes and avoids avoidable tailpipe emissions close to schools and shops.',
      estimatedCost: 'Saves the fuel cost of each avoided short trip (varies by vehicle and distance)',
      environmentalImpact: `Replacing one short car errand avoids about ${shortTripFactor} kg CO₂e using the calculator's documented EPA cold-start factor; local NOx/PM changes are not quantified here.`,
      caveat:
        'Keeping cabin recirculation on for long drives with several passengers can allow exhaled CO₂ to build up; switch back to fresh air on open roads.',
      forecastAqi: afternoonAqi,
    });
  } else if (prefs.commuteMode === 'remote') {
    items.push({
      id: 'afternoon-remote',
      timeOfDay: 'Afternoon',
      timeWindow: windowLabel(buckets.Afternoon, '12:00 – 17:00'),
      action: 'Keep the remote-work day; step outside briefly only during the cleanest remaining forecast hour',
      explanation: `Forecast afternoon AQI is ~${afternoonAqi}. Avoiding a commute removes both exposure time and vehicle emissions.`,
      expectedBenefit: 'Avoids peak-hour roadside exposure and eliminates one commute trip.',
      estimatedCost: '$0 (Free)',
      environmentalImpact: 'Avoided emissions depend on the commute distance and mode that would otherwise be used.',
      caveat: 'Short outdoor breaks still matter for comfort; recheck nearby conditions before opening windows.',
      forecastAqi: afternoonAqi,
    });
  } else {
    items.push({
      id: 'afternoon-commute',
      timeOfDay: 'Afternoon',
      timeWindow: windowLabel(buckets.Afternoon, '12:00 – 17:00'),
      action:
        effectiveAqi > 130 && prefs.commuteMode === 'walk_bike'
          ? 'Prefer public transit over strenuous cycling and use a well-fitted N95/FFP2 respirator on busy roads'
          : 'Travel by transit or a lower-traffic greenway route rather than a busy arterial',
      explanation: `Midday hours average ~${afternoonAqi} US AQI${cleanestHour ? `; the cleanest upcoming hour is ${cleanestHour.label} (~${cleanestHour.aqi} AQI)` : ''}.`,
      expectedBenefit:
        'Balances lower-emission mobility with reduced breathing dose compared with vigorous cycling beside heavy traffic.',
      estimatedCost:
        prefs.budgetTier === 'free_first'
          ? '$0 walking / standard transit fare'
          : prefs.budgetTier === 'balanced'
            ? 'Standard transit fare; optional low-cost respirator when AQI is high'
            : 'Transit fare plus a well-fitted respirator if you choose one',
      environmentalImpact: `A 10 km transit trip instead of solo driving avoids roughly ${transitFactor} kg CO₂e using the calculator's documented factor; local air-quality effects vary by corridor.`,
      caveat:
        'No mask fully removes gaseous pollutants such as NO₂ or ozone, and transit cabins can be crowded; exposure depends on the specific route and vehicle.',
      forecastAqi: afternoonAqi,
    });
  }

  const ventilationAction = isAfternoonClean
    ? 'Open opposite windows for 15–20 minutes during the cleaner midday window'
    : 'Keep windows mostly closed; use kitchen extraction while cooking and damp-dust settled particles';

  items.push({
    id: 'afternoon-ventilation',
    timeOfDay: 'Afternoon',
    timeWindow: windowLabel(buckets.Afternoon, '12:00 – 17:00'),
    action: ventilationAction,
    explanation: `Outdoor afternoon air is projected near ~${afternoonAqi} AQI. Ventilation helps only when outdoor air is cleaner than indoor air and no nearby smoke source is present.`,
    expectedBenefit:
      'Dilutes indoor CO₂ and cooking pollutants without assuming outdoor air is always cleaner.',
    estimatedCost: '$0 (Free)',
    environmentalImpact: 'Natural ventilation can reduce mechanical cooling demand when temperatures are mild.',
    caveat: `Skip open-window ventilation if visible smoke, strong traffic odor, or AQI above ~${ventilationThreshold} is present for your ${prefs.sensitivityGroup.replace('_', ' ')} profile.`,
    forecastAqi: afternoonAqi,
  });

  const filtrationPlan =
    prefs.budgetTier === 'free_first'
      ? {
          action: 'Keep windows closed during the evening peak, wipe surfaces with a damp cloth, and avoid indoor smoke sources',
          cost: '$0 (Free)',
        }
      : prefs.budgetTier === 'balanced'
        ? {
            action: 'Keep windows closed during the evening peak and consider a DIY MERV-13 box-fan filter for the main sleeping room',
            cost: '~$25–$45 one-time for a DIY Corsi-Rosenthal box (if parts are available)',
          }
        : {
            action: 'Keep windows closed during the evening peak and run a correctly sized True HEPA purifier in the bedroom',
            cost: '~$100–$250 one-time plus electricity, depending on room size',
          };

  items.push({
    id: 'evening-indoor',
    timeOfDay: 'Evening',
    timeWindow: windowLabel(buckets.Evening, '18:00 – 23:00'),
    action: isEveningHigh ? filtrationPlan.action : 'Ventilate briefly after cooking if outdoor smoke is absent, then review tomorrow’s forecast',
    explanation: `Evening AQI is projected near ~${eveningAqi}. Cooling boundary layers and cooking emissions can raise both outdoor and indoor particles after sunset.`,
    expectedBenefit: 'Reduces overnight particle exposure in bedrooms during long sleeping hours.',
    estimatedCost: isEveningHigh ? filtrationPlan.cost : '$0 (Free)',
    environmentalImpact:
      'Filtering and avoiding indoor combustion changes exposure; it does not by itself reduce outdoor emissions.',
    caveat:
      'HEPA filters capture particles effectively but not CO or NO₂ without substantial activated carbon. No device guarantees health protection.',
    forecastAqi: eveningAqi,
  });

  items.push({
    id: 'evening-reflection',
    timeOfDay: 'Evening',
    timeWindow: '21:30 – 22:00',
    action: 'Avoid incense and candles tonight, and recheck tomorrow’s forecast before setting morning alarms',
    explanation:
      'Indoor combustion can raise fine-particle concentrations above the outdoor neighborhood average even on a moderately clean day.',
    expectedBenefit: 'Keeps overnight bedroom PM2.5 lower without requiring purchases.',
    estimatedCost: '$0 (Free)',
    environmentalImpact: 'Avoids unnecessary indoor smoke production.',
    caveat:
      'If anyone has persistent wheezing, chest tightness, or asthma flare-ups, consult a qualified clinician rather than relying on this planner.',
    forecastAqi: eveningAqi,
  });

  return {
    city: aq.location.name,
    generatedAt: new Date().toISOString(),
    dataMode: aq.dataMode,
    summary: `Personalized ${prefs.sensitivityGroup.replace('_', ' ')} routine for ${aq.location.name} (${aq.aqi} US AQI — ${aq.category}; planning threshold ${highThreshold} AQI, primary pollutant ${aq.dominantPollutant}).`,
    bestOutdoorWindow: cleanestHour
      ? cleanestHour.aqi <= highThreshold
        ? `Around ${cleanestHour.label} (~${cleanestHour.aqi} AQI)`
        : `Cleanest upcoming hour is ${cleanestHour.label} (~${cleanestHour.aqi} AQI), still above your ${highThreshold} AQI planning threshold`
      : 'No future hourly forecast available — recheck later',
    bestVentilationWindow: cleanestHour
      ? cleanestHour.aqi <= ventilationThreshold
        ? `15–20 min cross-ventilation near ${cleanestHour.label} (~${cleanestHour.aqi} AQI)`
        : `Hold off on open-window ventilation until AQI drops below ~${ventilationThreshold}`
      : 'No future hourly forecast available — recheck later',
    items,
    safetyDisclaimer:
      'BreatheWise AI provides informational environmental planning, not medical advice. Forecast models carry uncertainty and may miss hyperlocal smoke or traffic spikes. Consult a qualified healthcare professional for health conditions.',
  };
}
