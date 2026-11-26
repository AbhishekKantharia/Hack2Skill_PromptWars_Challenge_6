const windows = new Map<string, number[]>();
const MAX_REQUESTS = 12;
const WINDOW_MS = 60_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    windows.set(key, recent);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000)),
    };
  }
  recent.push(now);
  windows.set(key, recent);
  if (windows.size > 5000) {
    for (const [k, timestamps] of windows) {
      if (!timestamps.some((t) => now - t < WINDOW_MS)) windows.delete(k);
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function allowRequest(key: string): boolean {
  return checkRateLimit(key).allowed;
}
