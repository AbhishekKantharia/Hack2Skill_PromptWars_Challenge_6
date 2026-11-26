import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

const HEADER = 'x-session-id';
const VALID_ID = /^[a-zA-Z0-9_-]{8,64}$/;

export function getSessionId(req: NextRequest): string {
  const provided = req.headers.get(HEADER);
  return provided && VALID_ID.test(provided) ? provided : randomUUID();
}
