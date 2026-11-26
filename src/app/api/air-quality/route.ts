import { NextRequest, NextResponse } from 'next/server';
import { getAirQualityForLocation, getMultiCitySnapshots } from '@/lib/air-quality-service';
import { evaluateIntelligentAlerts } from '@/lib/aqi';
import { buildDailyRecommendations } from '@/lib/impact-engine';
import { getSettings } from '@/lib/store';
import { getSessionId } from '@/lib/request-context';
import { enforceApiPolicy } from '@/lib/api-security';
import { resolveDemoMode } from '@/lib/demo-mode';
import { asText, parseCityLocation } from '@/lib/validation';
import { FEATURED_CITIES } from '@/lib/demo-data';

export async function GET(req: NextRequest) {
  try {
    const denied = enforceApiPolicy(req, 'air-quality');
    if (denied) return denied;
    const { searchParams } = new URL(req.url);
    const sessionId = getSessionId(req);
    const settings = await getSettings(sessionId);
    const demoParam = searchParams.get('demo');
    const explicitDemo = demoParam === 'true' ? true : demoParam === 'false' ? false : undefined;
    const forceDemo = resolveDemoMode(explicitDemo, settings.forceDemoMode);

    if (searchParams.get('multi') === 'true') {
      const stations = await getMultiCitySnapshots(forceDemo);
      return NextResponse.json({
        stations,
        dataMode: stations.some((s) => s.sourceType === 'demo') ? 'demo' : 'live',
      });
    }

    const cityParam = asText(searchParams.get('city'), 80);
    const explicitCity = parseCityLocation({
      name: cityParam ?? 'Selected Location',
      country: searchParams.get('country') ?? '',
      lat: searchParams.get('lat'),
      lon: searchParams.get('lon'),
    });
    const matchedCity = FEATURED_CITIES.find(
      (c) => c.name.toLowerCase() === cityParam?.toLowerCase()
    );
    const city = explicitCity ?? matchedCity ?? settings.defaultCity;

    const payload = await getAirQualityForLocation(city, { forceDemoMode: forceDemo });
    const alerts = evaluateIntelligentAlerts(payload, settings.alerts);
    const recommendations = buildDailyRecommendations(payload, settings);

    return NextResponse.json({ airQuality: payload, alerts, recommendations });
  } catch {
    return NextResponse.json(
      { error: 'Unable to retrieve air quality data' },
      { status: 500 }
    );
  }
}
