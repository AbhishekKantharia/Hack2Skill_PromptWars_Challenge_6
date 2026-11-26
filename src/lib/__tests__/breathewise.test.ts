import { describe, expect, it } from 'vitest';
import {
  determineDominantPollutant,
  evaluateIntelligentAlerts,
  getAqiMeta,
  pm25ToUsAqi,
} from '@/lib/aqi';
import {
  calculateSustainabilityImpact,
  evaluateSimulatorScenario,
} from '@/lib/calculations';
import { buildDemoAirQualityPayload, DEFAULT_USER_SETTINGS, FEATURED_CITIES } from '@/lib/demo-data';
import { generateCleanerDayRoutine } from '@/lib/routine-engine';
import { generateAssistantReply } from '@/lib/ai-assistant';
import {
  addCommunityObservation,
  getChatHistory,
  getSettings,
  upvoteObservation,
  updateSettings,
} from '@/lib/store';
import { parseFrequencies, parseSettingsPatch } from '@/lib/validation';
import { SUSTAINABILITY_ACTIONS } from '@/lib/calculations';

describe('AQI and Alert Engine', () => {
  it('computes accurate US EPA AQI from PM2.5 breakpoints', () => {
    expect(pm25ToUsAqi(5)).toBeLessThanOrEqual(50);
    expect(pm25ToUsAqi(20)).toBeGreaterThan(50);
    expect(pm25ToUsAqi(20)).toBeLessThanOrEqual(100);
    expect(pm25ToUsAqi(94.2)).toBeGreaterThan(150);
  });

  it('returns correct AQI category metadata', () => {
    expect(getAqiMeta(35).category).toBe('Good');
    expect(getAqiMeta(80).category).toBe('Moderate');
    expect(getAqiMeta(130).category).toBe('Unhealthy for Sensitive Groups');
    expect(getAqiMeta(175).category).toBe('Unhealthy');
    expect(getAqiMeta(250).category).toBe('Very Unhealthy');
  });

  it('identifies dominant pollutant relative to WHO reference ratios', () => {
    const dom = determineDominantPollutant({
      pm25: 90,
      pm10: 100,
      no2: 30,
      so2: 10,
      co: 500,
      o3: 50,
    });
    expect(dom).toBe('PM2.5');
  });

  it('triggers high AQI alert when reading exceeds threshold', () => {
    const delhiDemo = buildDemoAirQualityPayload(FEATURED_CITIES[0]); // 171 AQI
    const alerts = evaluateIntelligentAlerts(delhiDemo, DEFAULT_USER_SETTINGS.alerts);
    expect(alerts.some((a) => a.type === 'high_aqi')).toBe(true);
  });

  it('identifies favorable ventilation window for clean city', () => {
    const sfDemo = buildDemoAirQualityPayload(FEATURED_CITIES[2]); // 41 AQI
    const alerts = evaluateIntelligentAlerts(sfDemo, DEFAULT_USER_SETTINGS.alerts);
    expect(alerts.some((a) => a.type === 'favorable_ventilation')).toBe(true);
  });
});

describe('Sustainability Impact Calculator & What-If Simulator', () => {
  it('computes documented CO2, fuel, and kWh savings accurately', () => {
    const res = calculateSustainabilityImpact({
      frequencies: {
        public_transit: 2, // 2 * 1.55 = 3.10 kg CO2, 2 * 0.87 = 1.74 L
        save_electricity: 5, // 5 * 0.84 = 4.20 kg CO2, 5 * 2 = 10 kWh
      },
    });
    expect(res.weeklyCo2Kg).toBeCloseTo(7.3, 1);
    expect(res.weeklyFuelLiters).toBeCloseTo(1.74, 2);
    expect(res.weeklyEnergyKwh).toBeCloseTo(10, 1);
    expect(res.actionsCompletedPerWeek).toBe(7);
    expect(res.methodologyNote).toContain('NOT directly convert');
  });

  it('clamps simulator percentages and labels estimates as simulated', () => {
    const sim = evaluateSimulatorScenario('replace_car_trips', 20);
    expect(sim.adoptionPct).toBe(20);
    expect(sim.participatingHouseholds).toBe(2000);
    expect(sim.annualCo2TonnesAvoided).toBeGreaterThan(0);
    expect(sim.simulationLabel).toContain('NOT ACTUAL MEASURED AQI');
  });
});

describe('My Cleaner Day Routine & Grounded AI Safety', () => {
  it('generates Morning, Afternoon, and Evening routine items with caveats', () => {
    const payload = buildDemoAirQualityPayload(FEATURED_CITIES[0]);
    const routine = generateCleanerDayRoutine(payload, {
      sensitivityGroup: 'children',
      budgetTier: 'free_first',
      plannedActivities: ['outdoor_exercise', 'commute'],
      commuteMode: 'transit',
    });
    expect(routine.items.length).toBeGreaterThanOrEqual(3);
    expect(routine.items.some((i) => i.timeOfDay === 'Morning')).toBe(true);
    expect(routine.items.some((i) => i.timeOfDay === 'Afternoon')).toBe(true);
    expect(routine.items.some((i) => i.timeOfDay === 'Evening')).toBe(true);
    routine.items.forEach((item) => {
      expect(item.action.length).toBeGreaterThan(5);
      expect(item.explanation.length).toBeGreaterThan(10);
      expect(item.caveat.length).toBeGreaterThan(10);
    });
    expect(routine.safetyDisclaimer).toContain('not medical advice');
  });

  it('produces grounded AI guidance with uncertainty and no medical claims', async () => {
    const payload = buildDemoAirQualityPayload(FEATURED_CITIES[0]);
    const reply = await generateAssistantReply({
      question: 'Is it safe to exercise outdoors today?',
      airQuality: payload,
      sensitivityGroup: 'respiratory',
    });
    expect(reply.answer).toContain(payload.location.name);
    expect(reply.answer).toContain('not medical advice');
    expect(reply.sources.length).toBeGreaterThan(0);
  });

  it('redacts accidental GPS coordinates in community neighborhood labels', async () => {
    const obs = await addCommunityObservation({
      neighborhood: 'Near 28.61395 77.20901 Market',
      city: 'New Delhi',
      category: 'traffic_congestion',
      severity: 'moderate',
      description: 'Evening traffic slowdown near main bus stop.',
    });
    expect(obs.neighborhood).not.toContain('28.61395');
    expect(obs.verificationType).toBe('user_submitted');
  });

  it('only offers future forecast hours as clean-up windows', () => {
    const payload = buildDemoAirQualityPayload(FEATURED_CITIES[0]);
    payload.hourly = payload.hourly.map((point, i) => ({
      ...point,
      label: i < 8 ? `0${i + 1}:00` : `${i - 7}:00`,
      isForecast: i >= 8,
      aqi: i === 0 ? 5 : point.aqi,
    }));
    const routine = generateCleanerDayRoutine(payload, {
      sensitivityGroup: 'general',
      budgetTier: 'free_first',
      plannedActivities: ['outdoor_exercise'],
      commuteMode: 'transit',
    });
    expect(routine.bestOutdoorWindow).not.toContain('5 AQI');
  });
});

describe('Privacy, validation, and transparency', () => {
  it('isolates settings and chat history by browser session', async () => {
    await updateSettings({ displayName: 'Session A' }, 'session-a');
    await updateSettings({ displayName: 'Session B' }, 'session-b');
    expect((await getSettings('session-a')).displayName).toBe('Session A');
    expect((await getSettings('session-b')).displayName).toBe('Session B');
    expect((await getChatHistory('session-b')).length).toBe(0);
  });

  it('only records one confirmation per session', async () => {
    const first = await upvoteObservation('obs-1', 'session-a');
    const second = await upvoteObservation('obs-1', 'session-a');
    expect(first.alreadyVoted).toBe(false);
    expect(second.alreadyVoted).toBe(true);
    expect(second.observations.find((o) => o.id === 'obs-1')?.upvotes).toBe(15);
  });

  it('rejects invalid settings and clamps calculator frequencies', () => {
    expect(
      parseSettingsPatch({ theme: 'neon', highAqiThreshold: -100, forceDemoMode: 'yes' })
    ).toBeNull();
    const frequencies = parseFrequencies({
      public_transit: 999,
      unknown_action: 42,
      save_electricity: 2,
    });
    expect(frequencies?.public_transit).toBe(
      SUSTAINABILITY_ACTIONS.find((a) => a.id === 'public_transit')?.maxFrequency
    );
    expect(frequencies).not.toHaveProperty('unknown_action');
    expect(frequencies?.save_electricity).toBe(2);
  });

  it('labels the simulator proxy as an upper bound, not an AQI forecast', () => {
    const sim = evaluateSimulatorScenario('cleaner_cooking', 30);
    expect(sim.localSectorEmissionDropPct).toBe(30);
    expect(sim.proxyNote).toContain('not a measured emission inventory change');
  });
});
