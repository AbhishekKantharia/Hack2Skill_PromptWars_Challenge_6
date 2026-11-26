'use client';

const STORAGE_KEY = 'breathewise-session-id';
const RESERVED_IDS = new Set(['__proto__', 'constructor', 'prototype', 'toString']);
let fallbackId: string | null = null;

function isUsableId(value: string | null): value is string {
  return (
    !!value &&
    /^[a-zA-Z0-9_-]{8,64}$/.test(value) &&
    !RESERVED_IDS.has(value) &&
    !Object.prototype.hasOwnProperty.call(Object.prototype, value)
  );
}

export function getClientSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (isUsableId(existing)) return existing;
  } catch {
    // Storage can be blocked; use a stable in-memory ID instead.
  }
  if (!fallbackId) {
    fallbackId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `bw-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, fallbackId);
  } catch {
    // In-memory ID still keeps this page consistent.
  }
  return fallbackId;
}

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  const headers = new Headers(extra);
  headers.set('x-session-id', getClientSessionId());
  return headers;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(path, { ...init, headers: apiHeaders(init.headers) });
}
