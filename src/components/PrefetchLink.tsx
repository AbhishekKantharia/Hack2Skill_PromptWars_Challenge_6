'use client';

import React, { useCallback, useRef } from 'react';
import Link, { type LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import { prefetchApiGet } from '@/lib/client-api';

type PrefetchLinkProps = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    apiPath?: string;
  };

export function PrefetchLink({
  href,
  apiPath,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...rest
}: PrefetchLinkProps) {
  const router = useRouter();
  const warmedRef = useRef<string | null>(null);
  const route = typeof href === 'string' ? href : href.pathname ?? '/';

  const warm = useCallback(() => {
    const key = `${route}|${apiPath ?? ''}`;
    if (warmedRef.current === key) return;
    warmedRef.current = key;
    try {
      router.prefetch(route);
    } catch {
      return;
    }
    if (apiPath) void prefetchApiGet(apiPath);
  }, [route, apiPath, router]);

  return (
    <Link
      href={href}
      onMouseEnter={(event) => {
        warm();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        warm();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        warm();
        onTouchStart?.(event);
      }}
      {...rest}
    />
  );
}
