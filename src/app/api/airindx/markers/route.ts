import { NextResponse } from 'next/server';
import { withApiPolicy } from '@/lib/api-route';
import { getAirIndxMarkers } from '@/lib/airindx-service';

export const dynamic = 'force-dynamic';

export const GET = withApiPolicy(
  'airindx',
  'Unable to retrieve global air quality readings',
  async () => {
    const data = await getAirIndxMarkers();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
);
