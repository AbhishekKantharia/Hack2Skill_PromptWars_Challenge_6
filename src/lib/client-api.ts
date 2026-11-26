'use client';

const PREFETCH_TTL_MS = 30_000;
const prefetchCache = new Map<string, { response: Response; expires: number }>();

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  return new Headers(extra);
}

function isGetLike(init: RequestInit): boolean {
  const method = (init.method ?? 'GET').toUpperCase();
  return method === 'GET' || method === 'HEAD';
}

function pruneCache(): void {
  const now = Date.now();
  for (const [path, entry] of prefetchCache) {
    if (entry.expires <= now) prefetchCache.delete(path);
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  cacheResponse = false
): Promise<Response> {
  if (isGetLike(init)) {
    pruneCache();
    const cached = prefetchCache.get(path);
    if (cached) {
      prefetchCache.delete(path);
      return cached.response.clone();
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const callerSignal = init.signal;
  const abortFromCaller = () => controller.abort();

  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    const response = await fetch(path, {
      ...init,
      headers: apiHeaders(init.headers),
      credentials: 'same-origin',
      signal: controller.signal,
    });
    if (cacheResponse && isGetLike(init) && response.ok && !callerSignal) {
      prefetchCache.set(path, {
        response: response.clone(),
        expires: Date.now() + PREFETCH_TTL_MS,
      });
    }
    return response;
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}

export function prefetchApiGet(path: string): Promise<void> {
  const cached = prefetchCache.get(path);
  if (cached && cached.expires > Date.now()) return Promise.resolve();
  return apiFetch(path, {}, true).then(
    () => undefined,
    () => undefined
  );
}

export function clearApiPrefetch(path?: string): void {
  if (path) prefetchCache.delete(path);
  else prefetchCache.clear();
}
