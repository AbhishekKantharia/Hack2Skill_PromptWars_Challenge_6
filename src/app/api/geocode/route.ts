import { NextRequest, NextResponse } from 'next/server';
import { searchCities } from '@/lib/air-quality-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') ?? '';
  const results = await searchCities(query);
  return NextResponse.json({ results });
}
