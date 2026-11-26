import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

const HEADER = 'x-session-id';
export const PROXY_HEADER = 'x-breathewise-trusted';
const VALID_ID = /^[a-zA-Z0-9_-]{8,64}$/;
const RESERVED_IDS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
]);

export function isSafeSessionId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    VALID_ID.test(value) &&
    !RESERVED_IDS.has(value) &&
    !Object.prototype.hasOwnProperty.call(Object.prototype, value)
  );
}

export function getSessionId(req: NextRequest): string {
  const provided = req.headers.get(HEADER);
  const verified = req.headers.get(PROXY_HEADER) === '1';
  return verified && isSafeSessionId(provided) ? provided : randomUUID();
}

export function getClientIp(req: NextRequest): string {
  const vercelIp = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  const forwardedIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return vercelIp || realIp || forwardedIp || 'unknown-ip';
}

export function rateLimitKey(sessionId: string, req: NextRequest, namespace: string): string {
  return `${namespace}:${sessionId}:${getClientIp(req)}`;
}
