import type { SimulatorScenario, SustainabilityActionOption } from '@/types/breathewise';

/**
 * Transparent, cited environmental impact factors.
 * Sources:
 * - US EPA GHG Emission Factors Hub (2024): ~0.40 kg CO2 per passenger-mile (~0.25 kg CO2/km) for average passenger car;
 *   average fuel economy ~11.5 km/L (~0.087 L/km) for gasoline passenger vehicles.
 * - US EIA / IEA Grid Average Emission Factor: ~0.42 kg CO2/kWh global blended reference (varies regionally).
 *
 * IMPORTANT: Greenhouse gas (CO2e) reductions are global climate metrics and are strictly
 * distinguished from local criteria pollutant reductions (PM2.5, NOx, VOCs).
 */
export const SUSTAINABILITY_ACTIONS: SustainabilityActionOption[] = [
  {
    id: 'public_transit',
    label: 'Replace car commute with public transit (10 km round trip)',
    category: 'transport',
    unitLabel: 'round trips / week',
    defaultFrequency: 3,
    maxFrequency: 14,
    co2KgPerUnit: 1.55, // 2.50 kg car (10 km * 0.25) - 0.95 kg transit share (10 km * 0.095)
    fuelLitersPerUnit: 0.87, // 10 km / 11.5 km/L
    energyKwhPerUnit: 0,
    localPollutantNote:
      'Reduces tailpipe NOx, CO, and brake/exhaust PM per passenger-km when displacing single-occupancy gasoline/diesel car trips.',
    formulaDescription:
      'CO2 avoided = trips × (10 km × 0.25 kg/km car − 10 km × 0.095 kg/km transit) = 1.55 kg CO2/trip. Fuel saved = 10 km / 11.5 km/L = 0.87 L/trip.',
    sourceCitation: 'US EPA GHG Emission Factors Hub (2024) & IEA Transport Factors',
  },
  {
    id: 'carpooling',
    label: 'Carpool with 1+ passenger instead of solo driving (12 km trip)',
    category: 'transport',
    unitLabel: 'shared trips / week',
    defaultFrequency: 2,
    maxFrequency: 14,
    co2KgPerUnit: 1.50, // Half of 12 km * 0.25 kg/km = 1.50 kg CO2 saved per shared ride
    fuelLitersPerUnit: 0.52, // Half of (12 / 11.5) = 0.52 L
    energyKwhPerUnit: 0,
    localPollutantNote:
      'Lowers peak-hour roadway vehicle density and tailpipe NO2/PM emissions along urban corridors.',
    formulaDescription:
      'CO2 avoided = shared trips × (0.5 × 12 km × 0.25 kg/km) = 1.50 kg CO2/trip. Fuel saved = 0.5 × (12 / 11.5) = 0.52 L/trip.',
    sourceCitation: 'US EPA Passenger Vehicle Factor (0.25 kg CO2/km)',
  },
  {
    id: 'skip_short_car_trips',
    label: 'Walk or cycle instead of short car errands (3 km round trip)',
    category: 'transport',
    unitLabel: 'errands / week',
    defaultFrequency: 4,
    maxFrequency: 21,
    co2KgPerUnit: 0.82, // Short cold-start trips emit ~10% higher fuel/km
    fuelLitersPerUnit: 0.29,
    energyKwhPerUnit: 0,
    localPollutantNote:
      'Eliminates cold-start engine emissions (elevated CO, VOCs, and PM2.5 when catalytic converters are cold). Check outdoor AQI before brisk cycling.',
    formulaDescription:
      'CO2 avoided = errands × (3 km × 0.25 × 1.10 cold-start factor) = 0.82 kg CO2/errand. Fuel saved = 0.29 L/errand.',
    sourceCitation: 'EPA Cold-Start Mobile Emissions Guidance',
  },
  {
    id: 'save_electricity',
    label: 'Shift AC/appliances off-peak & trim standby loads (2 kWh/day)',
    category: 'energy',
    unitLabel: 'days / week',
    defaultFrequency: 5,
    maxFrequency: 7,
    co2KgPerUnit: 0.84, // 2 kWh * 0.42 kg CO2/kWh
    fuelLitersPerUnit: 0,
    energyKwhPerUnit: 2.0,
    localPollutantNote:
      'Where grids rely on coal/gas peaking plants, lower demand reduces regional SO2 and NOx; local urban AQI impact depends on power plant location.',
    formulaDescription:
      'CO2 avoided = days × (2.0 kWh × 0.42 kg CO2/kWh grid average) = 0.84 kg CO2/day.',
    sourceCitation: 'IEA / EPA Blended Grid Emission Factor (0.42 kg CO2/kWh)',
  },
  {
    id: 'efficient_household_heating_cooling',
    label: 'Optimize thermostat & seal window drafts (3.5 kWh/day)',
    category: 'energy',
    unitLabel: 'days / week',
    defaultFrequency: 4,
    maxFrequency: 7,
    co2KgPerUnit: 1.47, // 3.5 kWh * 0.42 kg/kWh
    fuelLitersPerUnit: 0,
    energyKwhPerUnit: 3.5,
    localPollutantNote:
      'Better sealing both reduces HVAC energy demand and lowers outdoor PM2.5 infiltration during smoky or high-AQI days.',
    formulaDescription:
      'CO2 avoided = days × (3.5 kWh × 0.42 kg CO2/kWh) = 1.47 kg CO2/day.',
    sourceCitation: 'US DOE Weatherization & EPA Grid Factor',
  },
  {
    id: 'waste_compost_no_burn',
    label: 'Compost/recycle organics & avoid open yard waste burning',
    category: 'waste',
    unitLabel: 'batches / week',
    defaultFrequency: 2,
    maxFrequency: 7,
    co2KgPerUnit: 1.10,
    fuelLitersPerUnit: 0,
    energyKwhPerUnit: 0,
    localPollutantNote:
      'Preventing open biomass/trash burning directly avoids acute local spikes in fine particulate matter (PM2.5), black carbon, and toxic smoke.',
    formulaDescription:
      'CO2e avoided = batches × 1.10 kg CO2e (landfill methane diversion proxy for ~2 kg organic waste).',
    sourceCitation: 'US EPA WARM (Waste Reduction Model) Organics Proxy',
  },
];

export interface ImpactCalculationInput {
  frequencies: Record<string, number>;
}

export interface ImpactBreakdownItem {
  id: string;
  label: string;
  category: 'transport' | 'energy' | 'waste';
  frequencyPerWeek: number;
  co2KgWeek: number;
  fuelLitersWeek: number;
  energyKwhWeek: number;
}

export interface ImpactCalculationResult {
  weeklyCo2Kg: number;
  monthlyCo2Kg: number;
  annualCo2Kg: number;
  weeklyFuelLiters: number;
  monthlyFuelLiters: number;
  weeklyEnergyKwh: number;
  monthlyEnergyKwh: number;
  actionsCompletedPerWeek: number;
  breakdown: ImpactBreakdownItem[];
  methodologyNote: string;
}

export function calculateSustainabilityImpact(
  input: ImpactCalculationInput
): ImpactCalculationResult {
  const breakdown: ImpactBreakdownItem[] = SUSTAINABILITY_ACTIONS.map((action) => {
    const rawFreq = input.frequencies[action.id] ?? 0;
    const freq = Math.max(0, Math.min(action.maxFrequency, Math.round(rawFreq)));
    return {
      id: action.id,
      label: action.label,
      category: action.category,
      frequencyPerWeek: freq,
      co2KgWeek: Number((freq * action.co2KgPerUnit).toFixed(2)),
      fuelLitersWeek: Number((freq * action.fuelLitersPerUnit).toFixed(2)),
      energyKwhWeek: Number((freq * action.energyKwhPerUnit).toFixed(2)),
    };
  });

  const weeklyCo2Kg = Number(
    breakdown.reduce((acc, item) => acc + item.co2KgWeek, 0).toFixed(2)
  );
  const weeklyFuelLiters = Number(
    breakdown.reduce((acc, item) => acc + item.fuelLitersWeek, 0).toFixed(2)
  );
  const weeklyEnergyKwh = Number(
    breakdown.reduce((acc, item) => acc + item.energyKwhWeek, 0).toFixed(2)
  );
  const actionsCompletedPerWeek = breakdown.reduce(
    (acc, item) => acc + item.frequencyPerWeek,
    0
  );

  return {
    weeklyCo2Kg,
    monthlyCo2Kg: Number((weeklyCo2Kg * 4.33).toFixed(1)),
    annualCo2Kg: Number((weeklyCo2Kg * 52).toFixed(1)),
    weeklyFuelLiters,
    monthlyFuelLiters: Number((weeklyFuelLiters * 4.33).toFixed(1)),
    weeklyEnergyKwh,
    monthlyEnergyKwh: Number((weeklyEnergyKwh * 4.33).toFixed(1)),
    actionsCompletedPerWeek,
    breakdown,
    methodologyNote:
      'Estimates reflect CO2e, fuel, and kWh savings using standard EPA/IEA emission factors. They do NOT directly convert to exact neighborhood AQI point reductions, because ambient AQI depends on meteorology, regional transport, and background sources.',
  };
}

export const SIMULATOR_SCENARIOS: SimulatorScenario[] = [
  {
    id: 'replace_car_trips',
    title: 'Replace Unnecessary Short Car Trips',
    description:
      'Explore estimated outcomes if a percentage of short urban car trips (< 5 km) shifted to walking, cycling, or transit.',
    parameterLabel: '% of unnecessary car trips replaced',
    minPct: 0,
    maxPct: 60,
    defaultPct: 20,
    householdsScope: 10000,
    co2KgPerHouseholdYearAt100Pct: 520,
    localPm25ProxyNote:
      'Lower mobile tailpipe NOx and exhaust/brake PM along neighborhood streets (simulated emission reduction, NOT a guaranteed ambient AQI forecast).',
    assumptions: [
      'Model cohort: 10,000 urban households averaging 4 short trips/week (4 km each).',
      'Emission factor: 0.25 kg CO2/km + 10% cold-start penalty.',
      'Local air pollutant impact is directional; actual ambient AQI depends on wind speed, regional background, and meteorology.',
    ],
  },
  {
    id: 'reduce_electricity',
    title: 'Neighborhood Electricity Conservation',
    description:
      'Estimate climate and regional power-sector impacts when households reduce peak and standby electricity use.',
    parameterLabel: '% household electricity reduction',
    minPct: 0,
    maxPct: 40,
    defaultPct: 15,
    householdsScope: 10000,
    co2KgPerHouseholdYearAt100Pct: 1450,
    localPm25ProxyNote:
      'Reduces fossil-fuel power generation demand (regional SO2/NOx); local street-level impact varies by where power plants are sited.',
    assumptions: [
      'Baseline household electricity: ~3,450 kWh/year across 10,000 urban households.',
      'Blended grid factor: 0.42 kg CO2/kWh (actual factor varies widely between hydro/nuclear and coal-heavy grids).',
      'Simulated figures represent avoided generation emissions, not measured AQI drops.',
    ],
  },
  {
    id: 'shared_transportation',
    title: 'Community Shared Commuting & Carpooling',
    description:
      'Model community adoption of carpooling and micro-transit shuttles for daily work/school commutes.',
    parameterLabel: '% of commuters joining shared transit',
    minPct: 0,
    maxPct: 70,
    defaultPct: 25,
    householdsScope: 10000,
    co2KgPerHouseholdYearAt100Pct: 780,
    localPm25ProxyNote:
      'Reduces peak rush-hour congestion, idling time, and roadside NO2 exposure near schools and transit corridors.',
    assumptions: [
      'Assumes 10,000 commuting households averaging 12 km/day solo driving before shifting to 2.5x occupancy.',
      'Does not assume zero emissions for shared vehicles; accounts for shared vehicle-km.',
      'Simulated scenario only — real outcomes depend on transit reliability and fleet fuel type.',
    ],
  },
  {
    id: 'cleaner_cooking',
    title: 'Transition to Cleaner Cooking & Ventilation',
    description:
      'Model households shifting from smoky solid/kerosene fuels or unvented gas to electric induction + range hoods.',
    parameterLabel: '% of households adopting clean cooking',
    minPct: 0,
    maxPct: 80,
    defaultPct: 30,
    householdsScope: 10000,
    co2KgPerHouseholdYearAt100Pct: 410,
    localPm25ProxyNote:
      'Substantially lowers acute indoor PM2.5, CO, and NO2 exposure spikes inside kitchens as well as neighborhood residential smoke.',
    assumptions: [
      'Applies to 10,000 urban/peri-urban households with mixed baseline cooking fuels.',
      'Indoor exposure benefits depend strongly on cooking duration and range-hood exhaust to the outdoors.',
      'Simulated scenario — indoor air quality varies by home ventilation rate and outdoor infiltration.',
    ],
  },
];

export function evaluateSimulatorScenario(scenarioId: string, adoptionPct: number) {
  const scenario =
    SIMULATOR_SCENARIOS.find((s) => s.id === scenarioId) ?? SIMULATOR_SCENARIOS[0];
  const clampedPct = Math.max(scenario.minPct, Math.min(scenario.maxPct, adoptionPct));
  const fraction = clampedPct / 100;
  const participatingHouseholds = Math.round(scenario.householdsScope * fraction);
  const annualCo2TonnesAvoided = Number(
    ((participatingHouseholds * scenario.co2KgPerHouseholdYearAt100Pct) / 1000).toFixed(1)
  );
  // Transparent upper-bound proxy: if related activity scaled perfectly linearly,
  // the affected sector's activity would change by exactly the adoption percentage.
  // This is NOT an ambient concentration or AQI prediction.
  const localSectorEmissionDropPct = clampedPct;

  return {
    scenario,
    adoptionPct: clampedPct,
    participatingHouseholds,
    annualCo2TonnesAvoided,
    monthlyCo2TonnesAvoided: Number((annualCo2TonnesAvoided / 12).toFixed(1)),
    localSectorEmissionDropPct,
    proxyNote:
      'Sector-activity proxy equals the selected adoption percentage (linear upper-bound assumption). It is not a measured emission inventory change or an AQI forecast.',
    simulationLabel: 'SIMULATED SCENARIO ESTIMATE — NOT ACTUAL MEASURED AQI',
  };
}
