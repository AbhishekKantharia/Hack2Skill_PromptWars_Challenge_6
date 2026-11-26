'use client';

const STORAGE_KEY = 'breathewise-session-id';

export function getClientSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `bw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return `bw-${Date.now()}`;
  }
}

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  const headers = new Headers(extra);
  headers.set('x-session-id', getClientSessionId());
  return headers;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(path, { ...init, headers: apiHeaders(init.headers) });
}
