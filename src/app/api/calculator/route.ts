import { NextRequest, NextResponse } from 'next/server';
import {
  calculateSustainabilityImpact,
  evaluateSimulatorScenario,
  SIMULATOR_SCENARIOS,
  SUSTAINABILITY_ACTIONS,
} from '@/lib/calculations';
import { getSavedImpactFrequencies, saveImpactFrequencies } from '@/lib/store';
import { getSessionId, rateLimitKey } from '@/lib/request-context';
import { checkRateLimit } from '@/lib/rate-limit';
import { asFiniteNumber, parseFrequencies, readJsonObject } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const sessionId = getSessionId(req);
  const frequencies = await getSavedImpactFrequencies(sessionId);
  const impact = calculateSustainabilityImpact({ frequencies });
  return NextResponse.json({
    frequencies,
    impact,
    actions: SUSTAINABILITY_ACTIONS,
    scenarios: SIMULATOR_SCENARIOS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = getSessionId(req);
    const limit = checkRateLimit(rateLimitKey(sessionId, req, 'calculator-write'));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }
    const body = (await readJsonObject(req)) ?? {};

    if (body.type === 'simulate') {
      const scenario = SIMULATOR_SCENARIOS.find((s) => s.id === body.scenarioId);
      const adoption = asFiniteNumber(body.adoptionPct, 0, 100);
      if (!scenario || adoption === null) {
        return NextResponse.json({ error: 'Invalid simulation scenario' }, { status: 400 });
      }
      return NextResponse.json({
        simulation: evaluateSimulatorScenario(scenario.id, adoption),
      });
    }

    const frequencies = parseFrequencies(body.frequencies);
    if (!frequencies) {
      return NextResponse.json({ error: 'Invalid impact frequencies' }, { status: 400 });
    }
    const saved = await saveImpactFrequencies(frequencies, sessionId);
    return NextResponse.json({
      frequencies: saved,
      impact: calculateSustainabilityImpact({ frequencies: saved }),
    });
  } catch {
    return NextResponse.json({ error: 'Calculation request failed' }, { status: 500 });
  }
}
