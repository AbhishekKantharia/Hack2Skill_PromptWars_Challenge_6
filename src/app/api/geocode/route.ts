import { NextRequest, NextResponse } from 'next/server';
import { searchCities } from '@/lib/air-quality-service';
import { withApiPolicy } from '@/lib/api-route';
import { asText } from '@/lib/validation';

export const GET = withApiPolicy('geocode', 'City search failed', async (req: NextRequest) => {
  const query = asText(new URL(req.url).searchParams.get('q'), 80) ?? '';
  const results = await searchCities(query);
  return NextResponse.json({ results });
});
