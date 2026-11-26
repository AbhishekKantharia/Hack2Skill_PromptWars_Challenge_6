import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin, isAdminPath, safeEqual } from '@/lib/security';
import {
  getSessionCookieName,
  readSignedSessionId,
  sessionCookieOptions,
  signSessionId,
} from '@/lib/session-cookie';

let processSecret: string | null = null;

function getSessionSecret(): string {
  if (process.env.SESSION_COOKIE_SECRET) return process.env.SESSION_COOKIE_SECRET;
  processSecret ??= `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  return processSecret;
}

function corsHeaders(origin: string | null, requestOrigin: string): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-session-id, authorization, x-admin-token',
    'Access-Control-Max-Age': '600',
  };
  if (origin && isAllowedOrigin(origin, requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export async function proxy(req: NextRequest) {
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

  if (!req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const secret = getSessionSecret();
  const cookieName = getSessionCookieName();
  const signed = req.cookies.get(cookieName)?.value;
  let sessionId = await readSignedSessionId(signed, secret);
  const needsCookie = !sessionId;
  if (!sessionId) sessionId = crypto.randomUUID();

  const headers = new Headers(req.headers);
  headers.set('x-session-id', sessionId);
  const res = NextResponse.next({ request: { headers } });
  for (const [key, value] of Object.entries(cors)) res.headers.set(key, value);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (needsCookie) {
    res.cookies.set(cookieName, await signSessionId(sessionId, secret), sessionCookieOptions());
  }
  return res;
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
