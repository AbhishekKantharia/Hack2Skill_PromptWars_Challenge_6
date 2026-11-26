import type {
  AirQualityPayload,
  DailyImpactRecommendation,
  ImpactSource,
  SensitivityGroup,
  SpaceType,
  UserSettings,
} from '@/types/breathewise';

const SOURCES: Record<'aqi' | 'who' | 'cdc' | 'filtration' | 'openmeteo', ImpactSource> = {
  aqi: {
    label: 'AirNow — AQI Basics',
    url: 'https://www.airnow.gov/aqi/aqi-basics/',
  },
  who: {
    label: 'WHO Global Air Quality Guidelines (2021)',
    url: 'https://www.who.int/news-room/questions-and-answers/item/who-global-air-quality-guidelines',
  },
  cdc: {
    label: 'CDC Wildfire Smoke Safety Guidance',
    url: 'https://www.cdc.gov/wildfires/safety/how-to-safely-stay-safe-during-a-wildfire.html',
  },
  filtration: {
    label: 'EPA Indoor Air Filtration Factsheet (2026)',
    url: 'https://www.epa.gov/system/files/documents/2026-06/indoor-air-filtration-factsheet.pdf',
  },
  openmeteo: {
    label: 'Open-Meteo Air Quality API Documentation',
    url: 'https://open-meteo.com/en/docs/air-quality-api',
  },
};

const BREATHING_M3_PER_HOUR: Record<SensitivityGroup, number> = {
  general: 1.2,
  children: 1.0,
  older_adults: 1.0,
  respiratory: 1.2,
  outdoor_athletes: 2.4,
};

const SPACE_DEFAULTS: Record<
  SpaceType,
  { outdoorMinutes: number; roomAreaFt2: number; commuteMinutes: number; kitchensPerPerson: number }
> = {
  household: { outdoorMinutes: 60, roomAreaFt2: 200, commuteMinutes: 40, kitchensPerPerson: 0.25 },
  school: { outdoorMinutes: 120, roomAreaFt2: 900, commuteMinutes: 60, kitchensPerPerson: 0.01 },
  neighborhood: { outdoorMinutes: 90, roomAreaFt2: 1500, commuteMinutes: 30, kitchensPerPerson: 0.05 },
  housing_society: { outdoorMinutes: 90, roomAreaFt2: 1200, commuteMinutes: 45, kitchensPerPerson: 0.07 },
};

const PM25_BREAKPOINTS: Array<[number, number, number, number]> = [
  [0, 50, 0, 9],
  [51, 100, 9.1, 35.4],
  [101, 150, 35.5, 55.4],
  [151, 200, 55.5, 125.4],
  [201, 300, 125.5, 225.4],
  [301, 500, 225.5, 325.4],
];

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function estimatePm25FromAqi(aqi: number): number {
  const bounded = clamp(aqi, 0, 500);
  const band = PM25_BREAKPOINTS.find(([low, high]) => bounded >= low && bounded <= high);
  if (!band) return PM25_BREAKPOINTS[PM25_BREAKPOINTS.length - 1][3];
  const [aqiLow, aqiHigh, pmLow, pmHigh] = band;
  const ratio = (bounded - aqiLow) / (aqiHigh - aqiLow || 1);
  return round(pmLow + ratio * (pmHigh - pmLow), 1);
}

function pointPm25(pm25: number | null, aqi: number): number {
  return typeof pm25 === 'number' && Number.isFinite(pm25)
    ? Math.max(0, pm25)
    : estimatePm25FromAqi(aqi);
}

function peopleLabel(people: number): string {
  return people === 1 ? 'one person' : `${people} people`;
}

export function buildDailyRecommendations(
  airQuality: AirQualityPayload,
  settings: UserSettings
): DailyImpactRecommendation[] {
  const people = clamp(Math.round(settings.groupSize) || 1, 1, 100000);
  const space = SPACE_DEFAULTS[settings.spaceType];
  const breathing = BREATHING_M3_PER_HOUR[settings.sensitivityGroup];
  const forecast = airQuality.hourly.filter((point) => point.isForecast).slice(0, 24);
  const relevant = forecast.length ? forecast : [airQuality.hourly[airQuality.hourly.length - 1]].filter(Boolean);
  const cleanest = relevant.reduce(
    (best, point) => (point.aqi < best.aqi ? point : best),
    relevant[0] ?? { time: '', label: 'now', aqi: airQuality.aqi, pm25: airQuality.pollutants.pm25, pm10: null, no2: null, o3: null, isForecast: false }
  );
  const worstWindow = relevant.slice(0, 12).reduce(
    (worst, point) => (point.aqi > worst.aqi ? point : worst),
    relevant[0] ?? cleanest
  );

  const currentPm = pointPm25(airQuality.pollutants.pm25, airQuality.aqi);
  const cleanPm = pointPm25(cleanest.pm25, cleanest.aqi);
  const worstPm = pointPm25(worstWindow.pm25, worstWindow.aqi);
  const outdoorHourPct = clamp(round(((airQuality.aqi - cleanest.aqi) / Math.max(airQuality.aqi, 1)) * 100), 0, 95);
  const outdoorHours = space.outdoorMinutes / 60;
  const outdoorDose = round(
    Math.max(0, currentPm - cleanPm) * outdoorHours * breathing * people,
    1
  );

  const commuterCount =
    settings.spaceType === 'household' ? people : clamp(Math.round(people / 4), 1, people);
  const commuteHours = space.commuteMinutes / 60;
  const commuteDose = round(currentPm * commuteHours * 2.0 * 0.85 * commuterCount, 1);
  const weeklyTrips =
    settings.spaceType === 'household' ? 5 : clamp(Math.round(people / 2), 5, people);
  const weeklyCo2 = round(weeklyTrips * 1.55, 1);
  const kitchenCount =
    settings.spaceType === 'household'
      ? 1
      : clamp(Math.round(people * space.kitchensPerPerson), 1, people);
  const cookingDose = round(80 * 0.6 * 0.5 * kitchenCount, 1);

  const roomArea = space.roomAreaFt2;
  const roomVolume = roomArea * 8;
  const recommendedCadr = round(roomArea * (2 / 3));
  const cleanAch = (recommendedCadr * 60) / roomVolume;
  const infiltrationAch = 0.5;
  const filtrationRemoval = clamp(round((cleanAch / (cleanAch + infiltrationAch)) * 100), 0, 95);
  const indoorOpen = round(worstPm * 0.8, 1);
  const indoorClosed = round(worstPm * 0.4, 1);
  const urgent = airQuality.aqi > 100;

  const recommendations: DailyImpactRecommendation[] = [
    {
      id: 'clean_hour',
      title: 'Move outdoor time to a cleaner hour',
      icon: 'clock',
      priority: urgent ? 1 : 2,
      action: `Shift outdoor play, exercise, or errands toward ${cleanest.label} when the forecast is cleaner.`,
      plainLanguage: `Right now the air reads ${airQuality.aqi} AQI. The cleanest nearby hour is about ${cleanest.aqi} AQI.`,
      whyItHelps:
        'Breathing harder outdoors increases the dose of fine particles. Choosing a cleaner hour lowers exposure without needing special equipment.',
      cost: 'Free',
      bestFor: `Families, outdoor workers, and ${peopleLabel(people)}`,
      impact: {
        headline: `${outdoorHourPct}% lower AQI around ${cleanest.label}`,
        detail: `About ${outdoorDose} µg/m³·h less particle dose for ${peopleLabel(people)} over ${space.outdoorMinutes} minutes.`,
        formula: `(PM2.5 now ${currentPm} − PM2.5 at ${cleanest.label} ${cleanPm}) × ${outdoorHours} h × ${breathing} m³/h × ${people} people`,
        unit: 'µg/m³·h',
      },
      assumptions: [
        'Hourly forecast values come from the same air-quality source shown on the dashboard.',
        'Breathing rate is fixed by the selected sensitivity profile, not by the AI.',
        'If PM2.5 is unavailable, a fixed US EPA AQI-to-PM2.5 breakpoint proxy is used.',
      ],
      sources: [SOURCES.openmeteo, SOURCES.aqi, SOURCES.who],
      dataMode: airQuality.dataMode,
    },
    {
      id: 'close_windows',
      title: 'Close windows during the worst hour',
      icon: 'window',
      priority: urgent ? 2 : 4,
      action: `Keep exterior windows and outdoor air intakes closed around ${worstWindow.label}, then air out when readings improve.`,
      plainLanguage: `The worst nearby hour is about ${worstWindow.aqi} AQI. Closing up during that peak keeps more pollution outside.`,
      whyItHelps:
        'Winter inversions and traffic peaks can trap smoke and exhaust close to the ground. Closing the building envelope reduces infiltration.',
      cost: 'Free',
      bestFor: `Bedrooms, classrooms, and shared rooms used by ${peopleLabel(people)}`,
      impact: {
        headline: `~${round(indoorOpen - indoorClosed)} µg/m³ lower indoor PM2.5 at peak`,
        detail: `Fixed model: indoor PM2.5 proxy falls from ${indoorOpen} to ${indoorClosed} µg/m³ when windows are closed.`,
        formula: `Open-window proxy = outdoor PM2.5 × 0.8; closed-window proxy = outdoor PM2.5 × 0.4; difference × worst-hour PM2.5 ${worstPm}`,
        unit: 'µg/m³',
      },
      assumptions: [
        'Infiltration factors are fixed planning values (0.8 open, 0.4 closed), not room measurements.',
        'Use recirculation mode if central air conditioning has a fresh-air intake.',
      ],
      sources: [SOURCES.cdc, SOURCES.aqi],
      dataMode: airQuality.dataMode,
    },
    {
      id: 'indoor_filtration',
      title: 'Set up a cleaner indoor-air room',
      icon: 'filter',
      priority: urgent ? 3 : 3,
      action: `Use one well-sized portable cleaner or a MERV-13 HVAC filter in the room where people spend the most time.`,
      plainLanguage:
        'A clean-air room gives children, older adults, and anyone with breathing sensitivity a safer place to rest.',
      whyItHelps:
        'Mechanical HEPA and MERV-13 filters remove smoke particles. EPA guidance recommends a portable cleaner with a smoke CADR of at least two-thirds of room area in square feet.',
      cost: settings.budgetTier === 'free_first' ? 'Low-cost DIY or existing HVAC filter' : 'Low-cost to advanced',
      bestFor: `One ${roomArea} ft² room used by ${peopleLabel(people)}`,
      impact: {
        headline: `~${filtrationRemoval}% lower steady-state indoor PM2.5`,
        detail: `Sized to ${recommendedCadr} CADR for a ${roomArea} ft² room, with doors and windows closed.`,
        formula: `Removal = clean ACH ÷ (clean ACH + infiltration ACH); clean ACH = CADR × 60 ÷ ${roomVolume} ft³; infiltration ACH = ${infiltrationAch}`,
        unit: '%',
      },
      assumptions: [
        'Assumes mechanical filtration only, correctly sized, continuously run, and no ozone-generating devices.',
        'Assumes an 8 ft ceiling and 0.5 air changes per hour of infiltration.',
      ],
      sources: [SOURCES.filtration, SOURCES.cdc],
      dataMode: airQuality.dataMode,
    },
    {
      id: 'mask_commute',
      title: 'Mask necessary open-air commutes',
      icon: 'mask',
      priority: urgent ? 4 : 5,
      action: `For unavoidable outdoor commutes, use a well-fitted NIOSH-approved N95 or FFP2 respirator.`,
      plainLanguage:
        'A tight-fitting respirator filters smoke particles before they reach your lungs. A loose mask gives much less protection.',
      whyItHelps:
        'Walking, cycling, and waiting at busy roads increase breathing rate near traffic and smoke. Fit matters as much as filter rating.',
      cost: 'Low-cost',
      bestFor: `${commuterCount} commuter${commuterCount === 1 ? '' : 's'} in ${peopleLabel(people)}`,
      impact: {
        headline: '~85% less PM2.5 inhaled on necessary commutes',
        detail: `About ${commuteDose} µg/m³·h avoided during ${space.commuteMinutes} minutes of commute for ${commuterCount} people.`,
        formula: `Avoided dose = outdoor PM2.5 ${currentPm} × ${commuteHours} h × 2.0 m³/h × 0.85 × ${commuterCount} commuters`,
        unit: 'µg/m³·h',
      },
      assumptions: [
        '0.85 effective filtration = 95% filter efficiency reduced by an assumed 10% fit leakage.',
        'Children under 2 should not wear masks; use safe alternatives and medical guidance for very young children.',
      ],
      sources: [SOURCES.cdc, SOURCES.who],
      dataMode: airQuality.dataMode,
    },
    {
      id: 'cleaner_travel',
      title: 'Switch short trips to cleaner travel',
      icon: 'transit',
      priority: urgent ? 5 : 1,
      action: `Replace one solo 10 km car round trip with transit, carpooling, or a walk/cycle only when AQI is safe.`,
      plainLanguage:
        'Cleaner travel lowers tailpipe pollution for everyone and lowers your own exposure when you choose transit over driving in heavy traffic.',
      whyItHelps:
        'Transport is a major source of urban NO₂ and fine particles. Mode shifts reduce emissions even when the air-quality model cannot see a street-level hotspot.',
      cost: 'Usually free to low-cost',
      bestFor: `Commuters in ${peopleLabel(people)}`,
      impact: {
        headline: `~${weeklyCo2} kg CO₂e avoided per week`,
        detail: `Assumes ${weeklyTrips} ten-km solo car round trips replaced by transit. Local PM and NO₂ also fall, but are not quantified here.`,
        formula: `${weeklyTrips} trips × (10 km × 0.25 kg/km car − 10 km × 0.095 kg/km transit) = ${weeklyCo2} kg CO₂e`,
        unit: 'kg CO₂e/week',
      },
      assumptions: [
        'Emission factors are fixed planning values from the existing calculator model.',
        'Cycling is recommended only when current AQI is within the selected sensitivity threshold.',
      ],
      sources: [SOURCES.who, SOURCES.aqi],
      dataMode: airQuality.dataMode,
    },
    {
      id: 'cleaner_cooking',
      title: 'Choose lower-emission cooking',
      icon: 'cooking',
      priority: 6,
      action: `Prefer boiling, steaming, or lidded low-heat cooking; run exhaust ventilation and avoid indoor burning.`,
      plainLanguage:
        'Cooking can create indoor particles even when outdoor air improves. Lower heat and good ventilation reduce that source.',
      whyItHelps:
        'WHO identifies household combustion as an important source of indoor pollution. Avoiding indoor burning and using lids lowers peaks.',
      cost: 'Free',
      bestFor: `${kitchenCount} kitchen${kitchenCount === 1 ? '' : 's'} in ${peopleLabel(people)}`,
      impact: {
        headline: `~48 µg/m³ lower kitchen PM2.5 for 30 minutes`,
        detail: `Fixed model avoids about ${cookingDose} µg/m³·h of kitchen PM2.5 across ${kitchenCount} kitchens.`,
        formula: '80 µg/m³ planning spike × 60% reduction × 0.5 h × kitchens',
        unit: 'µg/m³·h',
      },
      assumptions: [
        '80 µg/m³ is a fixed planning assumption, not a sensor measurement.',
        'Do not use ozone-generating air cleaners; prefer mechanical filtration.',
      ],
      sources: [SOURCES.who, SOURCES.cdc, SOURCES.filtration],
      dataMode: airQuality.dataMode,
    },
  ];

  return recommendations.sort((a, b) => a.priority - b.priority);
}
