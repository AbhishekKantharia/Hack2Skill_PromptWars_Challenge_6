import { NextRequest, NextResponse } from 'next/server';
import {
  actOnChallenge,
  addCommunityObservation,
  getCommunityData,
  upvoteObservation,
} from '@/lib/store';
import { getSessionId } from '@/lib/request-context';
import { enforceApiPolicy } from '@/lib/api-security';
import { parseObservationInput, readJsonObject, asText } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const denied = enforceApiPolicy(req, 'community-read');
  if (denied) return denied;
  const data = await getCommunityData(getSessionId(req));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const denied = enforceApiPolicy(req, 'community');
    if (denied) return denied;
    const sessionId = getSessionId(req);
    const body = await readJsonObject(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (body.action === 'create_observation') {
      const input = parseObservationInput(body);
      if (!input) {
        return NextResponse.json(
          { error: 'Valid neighborhood, city, category, and description are required' },
          { status: 400 }
        );
      }
      return NextResponse.json({ observation: await addCommunityObservation(input) });
    }

    if (body.action === 'upvote_observation') {
      const id = asText(body.id, 80);
      if (!id) {
        return NextResponse.json({ error: 'Observation id is required' }, { status: 400 });
      }
      const result = await upvoteObservation(id, sessionId);
      return NextResponse.json(result);
    }

    if (body.action === 'join_challenge' || body.action === 'log_challenge_action') {
      const challengeId = asText(body.challengeId, 80);
      if (!challengeId) {
        return NextResponse.json({ error: 'Challenge id is required' }, { status: 400 });
      }
      const result = await actOnChallenge(
        challengeId,
        body.action === 'join_challenge' ? 'join' : 'log_action',
        sessionId
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unsupported community action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Community operation failed' }, { status: 500 });
  }
}
