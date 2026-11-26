import { isSafeSessionId } from '@/lib/request-context';
import { safeEqual } from '@/lib/security';

const COOKIE_NAME = 'breathewise-session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export async function signSessionId(id: string, secret: string): Promise<string> {
  if (!isSafeSessionId(id)) throw new Error('Invalid session id');
  const payload = toBase64Url(encoder.encode(JSON.stringify({ sid: id, iat: Date.now() })));
  return `${payload}.${await sign(payload, secret)}`;
}

export async function readSignedSessionId(
  value: string | undefined,
  secret: string
): Promise<string | null> {
  if (!value) return null;
  const separator = value.lastIndexOf('.');
  if (separator < 1) return null;
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!/^[a-zA-Z0-9_-]+$/.test(payload)) return null;
  if (!safeEqual(signature, await sign(payload, secret))) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(payload));
    if (!isSafeSessionId(parsed.sid) || typeof parsed.iat !== 'number') return null;
    if (!Number.isFinite(parsed.iat)) return null;
    const age = Date.now() - parsed.iat;
    if (age < -60_000 || age > SESSION_MAX_AGE_SECONDS * 1000) return null;
    return parsed.sid;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function previewFingerprint(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`preview:${token}`));
  return toBase64Url(new Uint8Array(digest));
}
