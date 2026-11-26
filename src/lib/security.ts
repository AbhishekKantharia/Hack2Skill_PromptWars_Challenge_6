import { createHash } from 'crypto';

export function safeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export function isAdminPath(pathname: string): boolean {
  return /^\/(api\/)?admin(?:\/|$)/.test(pathname);
}

export function allowedOrigins(requestOrigin: string): string[] {
  const configured = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set([requestOrigin, ...configured]));
}

export function isAllowedOrigin(origin: string | null, requestOrigin: string): boolean {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return allowedOrigins(requestOrigin).some((allowed) => {
      try {
        return new URL(allowed).origin === parsed.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
