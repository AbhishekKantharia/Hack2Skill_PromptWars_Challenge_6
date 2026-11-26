'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseAirIndxMarkersResponse } from '@/lib/validation';
import { MARKERS_ENDPOINT } from '@/components/airindx/constants';
import type { AirIndxMarkersResponse } from '@/types/airindx';

const EMPTY_RESPONSE: AirIndxMarkersResponse = {
  markers: [],
  dataMode: 'demo',
  degraded: true,
  fetchedAt: '',
};

const REQUEST_TIMEOUT_MS = 15_000;

export function useAirIndxData() {
  const [data, setData] = useState<AirIndxMarkersResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setReloadNonce((nonce) => nonce + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    fetch(MARKERS_ENDPOINT, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('airindx request failed');
        const parsed = parseAirIndxMarkersResponse(await response.json());
        if (!parsed) throw new Error('invalid airindx payload');
        return parsed;
      })
      .then((parsed) => {
        if (!cancelled) setData(parsed);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        if (requestError instanceof DOMException && requestError.name === 'AbortError' && !timedOut) {
          return;
        }
        setError('Global readings could not be loaded. Please retry.');
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [reloadNonce]);

  return { data, loading, error, retry };
}
