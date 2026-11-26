import { NextRequest, NextResponse } from 'next/server';
import { getAirQualityForLocation, getMultiCitySnapshots } from '@/lib/air-quality-service';
import { evaluateIntelligentAlerts } from '@/lib/aqi';
import { FEATURED_CITIES } from '@/lib/demo-data';
import { getSettings } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const settings = await getSettings();

    const forceDemo =
      searchParams.get('demo') === 'true'
        ? true
        : searchParams.get('demo') === 'false'
          ? false
          : settings.forceDemoMode;

    if (searchParams.get('multi') === 'true') {
      const stations = await getMultiCitySnapshots(forceDemo);
      return NextResponse.json({ stations, dataMode: forceDemo ? 'demo' : 'live' });
    }

    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const cityParam = searchParams.get('city');
    const countryParam = searchParams.get('country');

    let location = settings.defaultCity;

    if (latParam && lonParam && !Number.isNaN(Number(latParam)) && !Number.isNaN(Number(lonParam))) {
      location = {
        name: cityParam || 'Selected Location',
        country: countryParam || '',
        lat: Number(latParam),
        lon: Number(lonParam),
      };
    } else if (cityParam) {
      const match = FEATURED_CITIES.find(
        (c) => c.name.toLowerCase() === cityParam.toLowerCase()
      );
      if (match) location = match;
    }

    const payload = await getAirQualityForLocation(location, { forceDemoMode: forceDemo });
    const alerts = evaluateIntelligentAlerts(payload, settings.alerts);

    return NextResponse.json({
      airQuality: payload,
      alerts,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Unable to retrieve air quality data', detail: String(err) },
      { status: 500 }
    );
  }
}
