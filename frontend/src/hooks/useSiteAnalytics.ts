import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/endpoints';

const SESSION_KEY = 'anil_vid';

function visitorId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `v_${Date.now().toString(36)}`;
  }
}

function productIdFromPath(pathname: string): string | undefined {
  // Product detail uses slug in URL; product UUID is logged separately from ProductDetail.
  // Keep path-only visits here.
  void pathname;
  return undefined;
}

/** Fire-and-forget storefront page view tracking (skips /panel). */
export function useSiteAnalytics() {
  const { pathname, search } = useLocation();
  const last = useRef('');

  useEffect(() => {
    if (pathname.startsWith('/panel')) return;
    const key = `${pathname}${search}`;
    if (last.current === key) return;
    last.current = key;

    const payload = {
      path: pathname || '/',
      title: typeof document !== 'undefined' ? document.title : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      session_id: visitorId(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screen:
        typeof window !== 'undefined'
          ? `${window.screen?.width || 0}x${window.screen?.height || 0}`
          : '',
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      product_id: productIdFromPath(pathname),
    };

    // Small delay so document.title settles after route change
    const t = window.setTimeout(() => {
      payload.title = document.title || payload.title;
      api.logSiteVisit(payload).catch(() => {});
    }, 120);

    return () => window.clearTimeout(t);
  }, [pathname, search]);
}
