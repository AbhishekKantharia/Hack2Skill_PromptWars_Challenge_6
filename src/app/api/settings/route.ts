import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/store';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  try {
    const patch = await req.json();
    const updated = await updateSettings(patch);
    return NextResponse.json({ settings: updated });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update settings', detail: String(err) },
      { status: 500 }
    );
  }
}
