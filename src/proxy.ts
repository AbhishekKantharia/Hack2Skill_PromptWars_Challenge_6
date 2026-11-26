import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin, isAdminPath, safeEqual } from '@/lib/security';
import {
  getSessionCookieName,
  readSignedSessionId,
  sessionCookieOptions,
  signSessionId,
} from '@/lib/session-cookie';
import { PROXY_HEADER } from '@/lib/request-context';

const PREVIEW_COOKIE = 'breathewise-preview';
let processSecret: string | null = null;

function getSessionSecret(): string {
  const configured = process.env.SESSION_COOKIE_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_COOKIE_SECRET must be at least 32 characters in production');
  }
  processSecret ??= `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  return processSecret;
}

function getPreviewToken(): string | null {
  const configured = process.env.PREVIEW_ACCESS_TOKEN;
  if (!configured) return null;
  if (configured.length < 16) {
    throw new Error('PREVIEW_ACCESS_TOKEN must be at least 16 characters');
  }
  return configured;
}

function corsHeaders(origin: string | null, requestOrigin: string): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-session-id, authorization, x-admin-token, x-preview-token',
    'Access-Control-Max-Age': '600',
  };
  if (origin && isAllowedOrigin(origin, requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export async function proxy(req: NextRequest) {
  const previewToken = getPreviewToken();
  const previewLocked = process.env.VERCEL_ENV === 'preview' && !!previewToken;
  let previewGrantedByInput = false;

  if (previewToken && previewLocked) {
    const queryToken = req.nextUrl.searchParams.get('preview');
    const headerToken = req.headers.get('x-preview-token');
    const cookieToken = req.cookies.get(PREVIEW_COOKIE)?.value;
    const supplied = headerToken ?? queryToken ?? cookieToken;
    previewGrantedByInput = !!headerToken || !!queryToken;
    if (!safeEqual(supplied, previewToken)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  const requestOrigin = req.nextUrl.origin;
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin, requestOrigin);

  if (origin && !isAllowedOrigin(origin, requestOrigin)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  if (isAdminPath(req.nextUrl.pathname)) {
    const expected = process.env.ADMIN_TOKEN;
    if (!expected) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors });
    }
    const authorization = req.headers.get('authorization') ?? '';
    const supplied = authorization.toLowerCase().startsWith('bearer ')
      ? authorization.slice(7).trim()
      : (req.headers.get('x-admin-token') ?? '');
    if (!safeEqual(supplied, expected)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
    }
  }

  if (!req.nextUrl.pathname.startsWith('/api/')) {
    const res = NextResponse.next();
    if (previewGrantedByInput && previewToken) {
      res.cookies.set(PREVIEW_COOKIE, previewToken, sessionCookieOptions());
    }
    return res;
  }

  const secret = getSessionSecret();
  const cookieName = getSessionCookieName();
  const signed = req.cookies.get(cookieName)?.value;
  let sessionId = await readSignedSessionId(signed, secret);
  const needsCookie = !sessionId;
  if (!sessionId) sessionId = crypto.randomUUID();

  const headers = new Headers(req.headers);
  headers.set('x-session-id', sessionId);
  headers.set(PROXY_HEADER, '1');
  const res = NextResponse.next({ request: { headers } });
  for (const [key, value] of Object.entries(cors)) res.headers.set(key, value);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (needsCookie) {
    res.cookies.set(cookieName, await signSessionId(sessionId, secret), sessionCookieOptions());
  }
  if (previewGrantedByInput && previewToken) {
    res.cookies.set(PREVIEW_COOKIE, previewToken, sessionCookieOptions());
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
