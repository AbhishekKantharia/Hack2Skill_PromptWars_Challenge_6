import type {
  AirQualityPayload,
  BudgetTier,
  DailyRoutineResponse,
  RoutineItem,
  SensitivityGroup,
} from '@/types/breathewise';

export interface RoutinePreferencesInput {
  sensitivityGroup: SensitivityGroup;
  budgetTier: BudgetTier;
  plannedActivities: string[]; // e.g., ['outdoor_exercise', 'commute', 'cooking']
  commuteMode: 'car' | 'transit' | 'walk_bike' | 'remote';
}

function getGroupThresholdOffset(group: SensitivityGroup): number {
  switch (group) {
    case 'children':
    case 'respiratory':
    case 'older_adults':
      return -25;
    case 'outdoor_athletes':
      return -15;
    default:
      return 0;
  }
}

export function generateCleanerDayRoutine(
  aq: AirQualityPayload,
  prefs: RoutinePreferencesInput
): DailyRoutineResponse {
  const forecasts = aq.hourly;
  const offset = getGroupThresholdOffset(prefs.sensitivityGroup);
  const adjustedAqi = Math.max(0, aq.aqi - offset);

  const morningHours = forecasts.slice(0, 8);
  const afternoonHours = forecasts.slice(8, 16);
  const eveningHours = forecasts.slice(16, 24);

  const avg = (arr: typeof forecasts, fallback: number) =>
    arr.length > 0
      ? Math.round(arr.reduce((s, x) => s + x.aqi, 0) / arr.length)
      : fallback;

  const morningAqi = avg(morningHours, aq.aqi);
  const afternoonAqi = avg(afternoonHours, Math.max(25, Math.round(aq.aqi * 0.85)));
  const eveningAqi = avg(eveningHours, Math.round(aq.aqi * 1.05));

  const cleanestHour = forecasts.reduce(
    (best, curr) => (curr.aqi < best.aqi ? curr : best),
    forecasts[0] ?? { label: '14:00', aqi: aq.aqi }
  );

  const isMorningHigh = morningAqi + Math.abs(offset) > 100;
  const isAfternoonClean = afternoonAqi <= 85;
  const isEveningHigh = eveningAqi + Math.abs(offset) > 100;

  const items: RoutineItem[] = [];

  // MORNING
  if (isMorningHigh) {
    items.push({
      id: 'morning-exercise',
      timeOfDay: 'Morning',
      timeWindow: '06:30 – 09:00',
      action:
        prefs.plannedActivities.includes('outdoor_exercise')
          ? 'Shift vigorous morning cardio indoors (home mobility, stationary bike, or ventilated gym)'
          : 'Review morning AQI before outdoor errands and keep exterior windows latched during morning peak',
      explanation: `Morning concentrations in ${aq.location.name} sit around ~${morningAqi} US AQI (dominated by ${aq.dominantPollutant}). Cooler early-morning air often traps exhaust close to ground level before sunlight disperses it.`,
      expectedBenefit:
        'Avoids deep lung inhalation during elevated morning particulate/NO2 concentrations when breathing rate increases during exercise.',
      estimatedCost: prefs.budgetTier === 'free_first' ? '$0 (Free)' : '$0 at home (or existing gym)',
      environmentalImpact: 'Personal exposure reduction; zero additional energy if bodyweight/home routine.',
      caveat:
        'Indoor air is only cleaner than outdoors if indoor sources (incense, smoking, unvented cooking) are absent and outdoor dust infiltration is limited.',
      forecastAqi: morningAqi,
    });
  } else {
    items.push({
      id: 'morning-exercise',
      timeOfDay: 'Morning',
      timeWindow: '06:30 – 09:00',
      action: 'Enjoy outdoor walking or light exercise along tree-lined streets away from main roads',
      explanation: `Morning air is relatively favorable (~${morningAqi} US AQI). Selecting side streets 50–100m away from heavy traffic corridors lowers roadside NO2 and ultrafine particle exposure.`,
      expectedBenefit: 'Supports cardiovascular fitness while keeping exposure near neighborhood background levels.',
      estimatedCost: '$0 (Free)',
      environmentalImpact: 'Replaces motorized morning trips if combined with walking/cycling errands.',
      caveat: 'Roadside micro-environments can spike briefly near idling buses or construction even when city-wide AQI looks low.',
      forecastAqi: morningAqi,
    });
  }

  // AFTERNOON
  if (prefs.commuteMode === 'car') {
    items.push({
      id: 'afternoon-commute',
      timeOfDay: 'Afternoon',
      timeWindow: '12:00 – 16:30',
      action:
        'Combine errands into a single trip, switch off engine instead of idling (>60s), and use cabin recirculation only in heavy tunnel/jam traffic',
      explanation: `Afternoon AQI averages ~${afternoonAqi}. While atmospheric mixing often improves dispersion midday, dense stop-and-go traffic creates localized NO2 and CO plumes inside vehicle lanes.`,
      expectedBenefit: 'Lowers both personal in-cabin pollution spikes and tailpipe emissions near schools and shops.',
      estimatedCost: 'Saves ~$1.20–$2.50 in avoided fuel per combined errand',
      environmentalImpact: '~0.8–1.5 kg CO2 avoided per replaced short cold-start car trip plus lower local NOx/PM.',
      caveat: 'Keep cabin recirculation off on long highway drives with multiple passengers so CO2 from exhaled breath does not build up and cause drowsiness.',
      forecastAqi: afternoonAqi,
    });
  } else if (prefs.commuteMode === 'transit' || prefs.commuteMode === 'walk_bike') {
    items.push({
      id: 'afternoon-commute',
      timeOfDay: 'Afternoon',
      timeWindow: '12:00 – 16:30',
      action:
        adjustedAqi > 130
          ? 'Use public transit over strenuous cycling and wear a well-fitted N95/FFP2 respirator along busy roads'
          : 'Travel via transit or lower-traffic greenway routes during the midday dispersion window',
      explanation: `Midday hours around ${cleanestHour.label} (~${cleanestHour.aqi} AQI) are projected as your cleanest outdoor travel window today.`,
      expectedBenefit: 'Balances sustainable low-emission mobility with lower cumulative particulate inhalation.',
      estimatedCost:
        prefs.budgetTier === 'free_first'
          ? '$0 walking / standard transit fare'
          : '$1–$3 per reusable N95/FFP2 respirator (when AQI > 130)',
      environmentalImpact: '~1.55 kg CO2 avoided per 10 km round-trip transit shift vs. solo driving.',
      caveat: 'No mask eliminates 100% of gaseous pollutants like NO2 or ozone; fit and seal around the nose bridge matter most for PM2.5.',
      forecastAqi: afternoonAqi,
    });
  } else {
    items.push({
      id: 'afternoon-home',
      timeOfDay: 'Afternoon',
      timeWindow: `${cleanestHour.label} (Cleanest Window)`,
      action: isAfternoonClean
        ? 'Open opposite windows for 15–20 minutes of cross-ventilation during midday outdoor dip'
        : 'Skip wide-open windows; run kitchen exhaust during lunch prep and damp-dust high-touch surfaces',
      explanation: `Forecast indicates outdoor air reaches ~${cleanestHour.aqi} AQI around ${cleanestHour.label}. Brief cross-ventilation flushes indoor CO2 and cooking VOCs when outdoor air is cleaner than indoor air.`,
      expectedBenefit: 'Improves indoor alertness and dilutes accumulated indoor pollutants without costly equipment.',
      estimatedCost: '$0 (Free)',
      environmentalImpact: 'Reduces reliance on mechanical AC/heating when outdoor temperatures are mild.',
      caveat: 'Do not assume outdoor air is always cleaner than indoors—if outdoor AQI exceeds 100 or visible smoke is present nearby, keep windows closed.',
      forecastAqi: cleanestHour.aqi,
    });
  }

  // EVENING
  items.push({
    id: 'evening-indoor',
    timeOfDay: 'Evening',
    timeWindow: '18:30 – 21:30',
    action: isEveningHigh
      ? 'Keep windows closed during evening traffic/inversion; use kitchen exhaust hood on high while cooking & run HEPA filtration in bedroom'
      : 'Ventilate briefly after dinner cooking if outdoor smoke is absent, and log your daily clean-air actions',
    explanation: `Evening AQI in ${aq.location.name} is projected near ~${eveningAqi}. Evening boundary-layer cooling and dinner-hour cooking often combine to spike both outdoor and indoor PM2.5.`,
    expectedBenefit: 'Protects overnight sleep air quality in bedrooms where people spend 7–9 continuous hours.',
    estimatedCost:
      prefs.budgetTier === 'free_first'
        ? '$0 (window timing & exhaust fan)'
        : prefs.budgetTier === 'balanced'
          ? '~$25–$45 DIY Corsi-Rosenthal box fan filter or ~$0.10/night purifier electricity'
          : '~$100–$250 True HEPA purifier (CADR matched to bedroom size)',
    environmentalImpact:
      'Cutting unnecessary standby appliances and batching evening laundry saves ~1–2 kWh/day (~0.4–0.8 kg CO2e).',
    caveat:
      'HEPA filters capture particles (PM2.5, dust, pollen) very effectively but do not remove gases like CO or NO2 unless paired with substantial activated carbon.',
    forecastAqi: eveningAqi,
  });

  // EXTRA COOKING / SUSTAINABLE REVIEW STEP
  items.push({
    id: 'evening-reflection',
    timeOfDay: 'Evening',
    timeWindow: '21:30 – 22:00',
    action: 'Avoid indoor incense/candles tonight and review tomorrow’s forecast before setting morning alarms',
    explanation: 'Combustion indoors—even small candles or incense sticks—can raise fine particulate concentrations indoors far above outdoor moderate levels.',
    expectedBenefit: 'Keeps overnight bedroom PM2.5 low without spending any money.',
    estimatedCost: '$0 (Free)',
    environmentalImpact: 'Eliminates avoidable indoor smoke and supports consistent low-impact household habits.',
    caveat: 'If any household member has persistent wheezing, chest tightness, or asthma flare-ups, consult a licensed clinician rather than relying on an app.',
    forecastAqi: eveningAqi,
  });

  const bestOutdoorWindow =
    cleanestHour.aqi <= 100
      ? `Around ${cleanestHour.label} (~${cleanestHour.aqi} AQI)`
      : 'No low-pollution outdoor window today — prioritize indoor low-smoke spaces';

  const bestVentilationWindow =
    cleanestHour.aqi <= 85
      ? `15–20 min cross-ventilation near ${cleanestHour.label} (~${cleanestHour.aqi} AQI)`
      : 'Hold off on open-window ventilation until AQI drops below ~85';

  return {
    city: aq.location.name,
    generatedAt: new Date().toISOString(),
    dataMode: aq.dataMode,
    summary: `Personalized ${prefs.sensitivityGroup.replace('_', ' ')} routine for ${aq.location.name} (${aq.aqi} US AQI — ${aq.category}, primary pollutant ${aq.dominantPollutant}).`,
    bestOutdoorWindow,
    bestVentilationWindow,
    items,
    safetyDisclaimer:
      'BreatheWise AI provides informational environmental planning, not medical advice. Forecast models carry ±15–25% uncertainty and may miss hyperlocal smoke or traffic spikes. Consult a qualified healthcare professional for health conditions.',
  };
}
