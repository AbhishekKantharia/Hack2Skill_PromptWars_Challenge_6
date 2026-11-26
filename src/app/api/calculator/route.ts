import { NextRequest, NextResponse } from 'next/server';
import {
  calculateSustainabilityImpact,
  evaluateSimulatorScenario,
  SIMULATOR_SCENARIOS,
  SUSTAINABILITY_ACTIONS,
} from '@/lib/calculations';
import {
  getSavedImpactFrequencies,
  saveImpactFrequencies,
} from '@/lib/store';

export async function GET() {
  const frequencies = await getSavedImpactFrequencies();
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
    const body = await req.json();
    if (body.type === 'simulate') {
      const sim = evaluateSimulatorScenario(
        String(body.scenarioId ?? 'replace_car_trips'),
        Number(body.adoptionPct ?? 20)
      );
      return NextResponse.json({ simulation: sim });
    }

    const rawFreqs = (body.frequencies ?? {}) as Record<string, number>;
    const saved = await saveImpactFrequencies(rawFreqs);
    const impact = calculateSustainabilityImpact({ frequencies: saved });
    return NextResponse.json({ frequencies: saved, impact });
  } catch (err) {
    return NextResponse.json(
      { error: 'Calculation request failed', detail: String(err) },
      { status: 500 }
    );
  }
}
