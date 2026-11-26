import { safeEqual } from '@/lib/security';

const COOKIE_NAME = 'breathewise-session';
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
  return `${id}.${await sign(id, secret)}`;
}

export async function readSignedSessionId(
  value: string | undefined,
  secret: string
): Promise<string | null> {
  if (!value) return null;
  const separator = value.lastIndexOf('.');
  if (separator < 1) return null;
  const id = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id)) return null;
  const expected = await sign(id, secret);
  return safeEqual(signature, expected) ? id : null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  };
}
