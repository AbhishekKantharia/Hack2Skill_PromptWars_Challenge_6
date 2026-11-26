const windows = new Map<string, number[]>();
const MAX_REQUESTS = 12;
const WINDOW_MS = 60_000;

export function allowRequest(key: string): boolean {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    windows.set(key, recent);
    return false;
  }
  recent.push(now);
  windows.set(key, recent);
  if (windows.size > 5000) {
    for (const [k, timestamps] of windows) {
      if (!timestamps.some((t) => now - t < WINDOW_MS)) windows.delete(k);
    }
  }
  return true;
}
