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
import { buildDailyRecommendations } from '@/lib/impact-engine';
import { generateAssistantReply } from '@/lib/ai-assistant';
import {
  actOnChallenge,
  addCommunityObservation,
  getChatHistory,
  getCommunityData,
  getSettings,
  upvoteObservation,
  updateSettings,
} from '@/lib/store';
import {
  asFiniteNumber,
  parseFrequencies,
  parseObservationInput,
  parseSettingsPatch,
  redactCoordinateLikeText,
} from '@/lib/validation';
import { SUSTAINABILITY_ACTIONS } from '@/lib/calculations';
import { getSessionId, isSafeSessionId, PROXY_HEADER } from '@/lib/request-context';
import { checkRateLimit } from '@/lib/rate-limit';
import { resolveDemoMode } from '@/lib/demo-mode';
import { formatLocalHour } from '@/lib/time';
import { isAdminPath, isAllowedOrigin, safeEqual } from '@/lib/security';
import { readSignedSessionId, signSessionId } from '@/lib/session-cookie';
import { checkAiBudget } from '@/lib/spend-cap';

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

  it('builds six fixed-impact recommendations with formulas and sources', () => {
    const payload = buildDemoAirQualityPayload(FEATURED_CITIES[0]);
    const settings = { ...DEFAULT_USER_SETTINGS, spaceType: 'school' as const, groupSize: 120 };
    const recs = buildDailyRecommendations(payload, settings);
    expect(recs).toHaveLength(6);
    expect(new Set(recs.map((rec) => rec.id)).size).toBe(6);
    recs.forEach((rec) => {
      expect(rec.impact.headline.length).toBeGreaterThan(5);
      expect(rec.impact.formula.length).toBeGreaterThan(10);
      expect(rec.assumptions.length).toBeGreaterThan(0);
      expect(rec.sources.length).toBeGreaterThan(0);
    });
    expect(recs.find((rec) => rec.id === 'mask_commute')?.impact.formula).toContain('0.85');
    expect(recs.find((rec) => rec.id === 'cleaner_travel')?.impact.unit).toBe('kg CO₂e/week');
  });

  it('keeps AI fallback grounded in fixed impact headlines', async () => {
    const payload = buildDemoAirQualityPayload(FEATURED_CITIES[0]);
    const recs = buildDailyRecommendations(payload, {
      ...DEFAULT_USER_SETTINGS,
      spaceType: 'housing_society',
      groupSize: 80,
    });
    const reply = await generateAssistantReply({
      question: 'How can we protect the children in our building?',
      airQuality: payload,
      sensitivityGroup: 'children',
      spaceType: 'housing_society',
      groupSize: 80,
      recommendations: recs,
    });
    expect(reply.answer).toContain('Fixed Impact Plan');
    expect(reply.answer).toContain(recs[0].impact.headline);
    expect(reply.answer).toContain('not medical advice');
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
    const futureLabels = payload.hourly.filter((h) => h.isForecast).map((h) => h.label);
    expect(routine.bestOutdoorWindow).not.toContain('5 AQI');
    for (const item of routine.items.filter((i) => i.id !== 'evening-reflection')) {
      expect(futureLabels.some((label) => item.timeWindow.includes(label))).toBe(true);
    }
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

  it('rejects prototype-like session IDs before they reach the store', () => {
    const req = {
      headers: { get: (name: string) => (name === 'x-session-id' ? '__proto__' : null) },
    } as never;
    const id = getSessionId(req);
    expect(id).not.toBe('__proto__');
    expect(isSafeSessionId('constructor')).toBe(false);
    expect(isSafeSessionId('valid-session-123')).toBe(true);

    const trustedReq = {
      headers: {
        get: (name: string) =>
          name === 'x-session-id'
            ? 'valid-session-123'
            : name === PROXY_HEADER
              ? '1'
              : null,
      },
    } as never;
    expect(getSessionId(trustedReq)).toBe('valid-session-123');
  });

  it('redacts common coordinate formats and rejects unsafe numeric coercion', () => {
    expect(redactCoordinateLikeText('Near 28.61 77.20 Market')).not.toContain('28.61');
    expect(redactCoordinateLikeText(`28°36'50"N 77°12'34"E`)).toBe('[redacted] [redacted]');
    expect(asFiniteNumber(null, 0, 10)).toBeNull();
    expect(asFiniteNumber('', 0, 10)).toBeNull();
    expect(asFiniteNumber(true, 0, 10)).toBeNull();
    expect(asFiniteNumber('7', 0, 10)).toBe(7);
  });

  it('validates observation privacy and ordered alert thresholds', () => {
    const observation = parseObservationInput({
      neighborhood: '28.61 77.20 Riverside',
      city: 'New Delhi',
      category: 'smoke_haze',
      description: `28°36'50"N near the market`,
    });
    expect(observation?.neighborhood).not.toContain('28.61');
    expect(observation?.description).not.toContain('°');
    expect(
      parseSettingsPatch({ alerts: { highAqiThreshold: 180, severeAqiThreshold: 150 } })
    ).toBeNull();
  });

  it('honors explicit demo overrides before session and environment defaults', () => {
    const previous = process.env.NEXT_PUBLIC_DEMO_MODE;
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    expect(resolveDemoMode(false, true)).toBe(false);
    expect(resolveDemoMode(undefined, false)).toBe(false);
    expect(resolveDemoMode(undefined, undefined)).toBe(true);
    if (previous === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
    else process.env.NEXT_PUBLIC_DEMO_MODE = previous;
  });

  it('formats forecast labels in the city timezone', () => {
    expect(formatLocalHour('2026-11-26T18:00:00Z', 'Asia/Kolkata')).toBe('23:30');
    expect(formatLocalHour('bad-date', 'Asia/Kolkata')).toBe('Time unavailable');
  });

  it('rate limits repeated writes with a retry hint', () => {
    const key = `test-limit-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < 12; i += 1) expect(checkRateLimit(key).allowed).toBe(true);
    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('persists challenge joins and action logs per session', async () => {
    const before = await getCommunityData('challenge-session');
    const challengeId = before.challenges[0].id;
    await actOnChallenge(challengeId, 'join', 'challenge-session');
    await actOnChallenge(challengeId, 'log_action', 'challenge-session');
    const after = await getCommunityData('challenge-session');
    const challenge = after.challenges.find((c) => c.id === challengeId);
    expect(challenge?.joined).toBe(true);
    expect(challenge?.currentActions).toBe(before.challenges[0].currentActions + 1);
    expect(challenge?.participantsCount).toBe(before.challenges[0].participantsCount + 1);
  });

  it('ignores forged community IDs instead of creating permission keys', async () => {
    const before = await getCommunityData('permission-session');
    const vote = await upvoteObservation('obs-forged-id', 'permission-session');
    const challenge = await actOnChallenge('challenge-forged', 'join', 'permission-session');
    expect(vote.observations.length).toBe(before.observations.length);
    expect(challenge.challenges).toEqual(before.challenges);
  });

  it('compares secrets safely and recognizes admin paths', () => {
    expect(safeEqual('token-123', 'token-123')).toBe(true);
    expect(safeEqual('token-123', 'token-124')).toBe(false);
    expect(safeEqual('short', 'longer-secret')).toBe(false);
    expect(isAdminPath('/api/admin/status')).toBe(true);
    expect(isAdminPath('/administration')).toBe(false);
  });

  it('allows only same-origin and explicitly configured origins', () => {
    const previous = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = 'https://demo.example.com';
    expect(isAllowedOrigin(null, 'https://app.example.com')).toBe(true);
    expect(isAllowedOrigin('https://app.example.com', 'https://app.example.com')).toBe(true);
    expect(isAllowedOrigin('https://demo.example.com', 'https://app.example.com')).toBe(true);
    expect(isAllowedOrigin('https://evil.example.com', 'https://app.example.com')).toBe(false);
    if (previous === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previous;
  });

  it('signs session cookies and rejects tampered values', async () => {
    const secret = 'test-secret-with-entropy';
    const signed = await signSessionId('valid-session-123', secret);
    expect(await readSignedSessionId(signed, secret)).toBe('valid-session-123');
    expect(await readSignedSessionId(`${signed}tampered`, secret)).toBeNull();
    expect(await readSignedSessionId('short.value', secret)).toBeNull();
  });

  it('enforces a daily AI request cap', () => {
    const previous = process.env.AI_DAILY_REQUEST_CAP;
    process.env.AI_DAILY_REQUEST_CAP = '1';
    const session = `budget-${Math.random().toString(36).slice(2)}`;
    expect(checkAiBudget(session).allowed).toBe(true);
    const blocked = checkAiBudget(session);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    if (previous === undefined) delete process.env.AI_DAILY_REQUEST_CAP;
    else process.env.AI_DAILY_REQUEST_CAP = previous;
  });
});
