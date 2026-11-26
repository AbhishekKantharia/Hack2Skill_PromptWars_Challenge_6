import { NextRequest, NextResponse } from 'next/server';
import { searchCities } from '@/lib/air-quality-service';
import { asText } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const query = asText(new URL(req.url).searchParams.get('q'), 80) ?? '';
  const results = await searchCities(query);
  return NextResponse.json({ results });
}
