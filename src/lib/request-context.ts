import { randomUUID } from 'crypto';
import { isIP } from 'node:net';
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

function validIp(value: string | null | undefined): string | null {
  const candidate = value?.split(',')[0]?.trim().replace(/^\[|\]$/g, '');
  return candidate && isIP(candidate) > 0 ? candidate : null;
}

export function getClientIp(req: NextRequest): string {
  return (
    validIp(req.headers.get('x-vercel-forwarded-for')) ??
    validIp(req.headers.get('x-real-ip')) ??
    validIp(req.headers.get('x-forwarded-for')) ??
    'unknown-ip'
  );
}

export function rateLimitKey(sessionId: string, req: NextRequest, namespace: string): string {
  return `${namespace}:${sessionId}:${getClientIp(req)}`;
}
