export function getCurrentURL(): URL {
  if (typeof window === 'undefined') {
    throw new Error('getCurrentURL can only be called in browser environment');
  }

  return new URL(window.location.href);
}

export function getReferrer(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.referrer || null;
}

export function isPageReload(): boolean {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return false;
  }

  const perf = window.performance;

  if ('navigation' in perf) {
    const nav = (perf as any).navigation;
    return nav.type === 1;
  }

  if ('getEntriesByType' in perf && typeof (perf as any).getEntriesByType === 'function') {
    const getEntriesByType = (perf as any).getEntriesByType as (type: string) => PerformanceNavigationTiming[];
    const entries = getEntriesByType('navigation');
    if (entries.length > 0) {
      return entries[0].type === 'reload';
    }
  }

  return false;
}

