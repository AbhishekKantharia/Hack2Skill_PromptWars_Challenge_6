import { NextRequest, NextResponse } from 'next/server';
import { enforceApiPolicy } from '@/lib/api-security';
import { getAirIndxMarkers } from '@/lib/airindx-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = enforceApiPolicy(req, 'airindx');
  if (denied) return denied;

  try {
    const data = await getAirIndxMarkers();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to retrieve global air quality readings' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
