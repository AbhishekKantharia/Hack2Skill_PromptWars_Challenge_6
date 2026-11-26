import { NextRequest, NextResponse } from 'next/server';
import {
  actOnChallenge,
  addCommunityObservation,
  getCommunityData,
  upvoteObservation,
} from '@/lib/store';

export async function GET() {
  const data = await getCommunityData();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === 'create_observation') {
      if (!body.neighborhood || !body.description || !body.city) {
        return NextResponse.json(
          { error: 'Neighborhood, city, and description are required' },
          { status: 400 }
        );
      }
      const created = await addCommunityObservation({
        neighborhood: String(body.neighborhood),
        city: String(body.city),
        category: body.category ?? 'smoke_haze',
        severity: body.severity ?? 'moderate',
        description: String(body.description),
      });
      return NextResponse.json({ observation: created });
    }

    if (body.action === 'upvote_observation' && body.id) {
      const observations = await upvoteObservation(String(body.id));
      return NextResponse.json({ observations });
    }

    if (
      (body.action === 'join_challenge' || body.action === 'log_challenge_action') &&
      body.challengeId
    ) {
      const challenges = await actOnChallenge(
        String(body.challengeId),
        body.action === 'join_challenge' ? 'join' : 'log_action'
      );
      return NextResponse.json({ challenges });
    }

    return NextResponse.json({ error: 'Unsupported community action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Community operation failed', detail: String(err) },
      { status: 500 }
    );
  }
}
