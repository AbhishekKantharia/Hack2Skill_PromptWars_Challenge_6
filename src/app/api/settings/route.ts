import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/store';
import { getSessionId } from '@/lib/request-context';
import { enforceApiPolicy } from '@/lib/api-security';
import { parseSettingsPatch, readJsonObject } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const denied = enforceApiPolicy(req, 'settings-read');
  if (denied) return denied;
  const settings = await getSettings(getSessionId(req));
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  try {
    const denied = enforceApiPolicy(req, 'settings-write');
    if (denied) return denied;
    const sessionId = getSessionId(req);
    const body = await readJsonObject(req);
    const patch = body ? parseSettingsPatch(body) : null;
    if (!patch) {
      return NextResponse.json({ error: 'No valid settings supplied' }, { status: 400 });
    }
    const updated = await updateSettings(patch, sessionId);
    return NextResponse.json({ settings: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
