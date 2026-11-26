import { NextRequest, NextResponse } from 'next/server';
import { getSessionId, rateLimitKey } from '@/lib/request-context';
import { checkRateLimit } from '@/lib/rate-limit';
import { isAllowedOrigin } from '@/lib/security';

function securityHeaders(): Record<string, string> {
  return {
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store',
  };
}

export function enforceApiPolicy(req: NextRequest, namespace: string): NextResponse | null {
  const headers = securityHeaders();
  const origin = req.headers.get('origin');
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (isMutation && !origin && !req.headers.get('sec-fetch-site')) {
    return NextResponse.json(
      { error: 'Mutation requests must include Origin or Sec-Fetch-Site' },
      { status: 403, headers }
    );
  }
  if (!isAllowedOrigin(origin, req.nextUrl.origin)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers });
  }
  if (req.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Cross-site requests are blocked' }, { status: 403, headers });
  }

  const sessionId = getSessionId(req);
  const limit = checkRateLimit(rateLimitKey(sessionId, req, namespace));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute and try again.' },
      {
        status: 429,
        headers: { ...headers, 'Retry-After': String(limit.retryAfterSeconds) },
      }
    );
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'JSON content type required' }, { status: 415, headers });
    }
  }
  return null;
}
