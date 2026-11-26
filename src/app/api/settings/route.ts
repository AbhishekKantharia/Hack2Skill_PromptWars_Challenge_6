import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/store';
import { getSessionId } from '@/lib/request-context';
import { withApiPolicy } from '@/lib/api-route';
import { parseSettingsPatch, readJsonObject } from '@/lib/validation';

export const GET = withApiPolicy('settings-read', 'Failed to load settings', async (req: NextRequest) => {
  const settings = await getSettings(getSessionId(req));
  return NextResponse.json({ settings });
});

export const PATCH = withApiPolicy('settings-write', 'Failed to update settings', async (req: NextRequest) => {
  const sessionId = getSessionId(req);
  const body = await readJsonObject(req);
  const patch = body ? parseSettingsPatch(body) : null;
  if (!patch) {
    return NextResponse.json({ error: 'No valid settings supplied' }, { status: 400 });
  }
  const updated = await updateSettings(patch, sessionId);
  return NextResponse.json({ settings: updated });
});
