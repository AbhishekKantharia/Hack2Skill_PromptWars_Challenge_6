import { NextRequest, NextResponse } from 'next/server';
import { searchCities } from '@/lib/air-quality-service';
import { enforceApiPolicy } from '@/lib/api-security';
import { asText } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const denied = enforceApiPolicy(req, 'geocode');
  if (denied) return denied;
  const query = asText(new URL(req.url).searchParams.get('q'), 80) ?? '';
  const results = await searchCities(query);
  return NextResponse.json({ results });
}
