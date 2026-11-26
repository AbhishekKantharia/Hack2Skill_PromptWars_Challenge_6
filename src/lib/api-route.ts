import { NextRequest, NextResponse } from 'next/server';
import { enforceApiPolicy } from '@/lib/api-security';

type ApiHandler = (req: NextRequest) => Promise<NextResponse>;

export function withApiPolicy(
  namespace: string,
  errorMessage: string,
  handler: ApiHandler
): ApiHandler {
  return async (req: NextRequest) => {
    try {
      const denied = enforceApiPolicy(req, namespace);
      return denied ?? (await handler(req));
    } catch {
      return NextResponse.json(
        { error: errorMessage },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  };
}
