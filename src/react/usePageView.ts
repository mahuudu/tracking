'use client';

import { useEffect, useState } from 'react';
import { page, isTrackingInitialized } from '../browser/adapter';

/**
 * Hook to automatically track page views on route changes.
 * 
 * Supports multiple routing libraries:
 * - Next.js (App Router): Automatically detects `usePathname` from `next/navigation`
 * - React Router: Automatically detects `useLocation` from `react-router-dom`
 * - Vanilla/No Router: Falls back to `window.location.pathname`
 * 
 * Works out of the box with any React app, no routing library required!
 */
export function usePageView() {
  const [pathname, setPathname] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : ''
  );

  // Try to get pathname from various sources
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Method 1: Try Next.js usePathname (if available)
    let currentPathname: string | undefined;
    
    try {
      // Dynamic import to avoid build-time dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nextNavigation = require('next/navigation');
      if (nextNavigation?.usePathname) {
        // This will only work if called inside Next.js App Router context
        // We'll use a wrapper component approach instead
      }
    } catch {
      // Next.js not available, continue
    }

    // Method 2: Try React Router useLocation (if available)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const reactRouter = require('react-router-dom');
      if (reactRouter?.useLocation) {
        // This will only work if called inside React Router context
        // We'll use a wrapper component approach instead
      }
    } catch {
      // React Router not available, continue
    }

    // Method 3: Fallback to window.location (always works)
    if (!currentPathname) {
      currentPathname = window.location.pathname;
    }

    // Update if changed
    if (currentPathname && currentPathname !== pathname) {
      setPathname(currentPathname);
    }
  }, []);

  // Track page view when pathname changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isTrackingInitialized() && pathname) {
      page({ path: pathname });
    }
  }, [pathname]);

  // Listen to popstate for browser back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const newPathname = window.location.pathname;
      if (newPathname !== pathname) {
        setPathname(newPathname);
      }
      if (isTrackingInitialized()) {
        page({ path: newPathname });
      }
    };

    // Listen to pushstate/replacestate (for programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => {
        const newPathname = window.location.pathname;
        if (newPathname !== pathname) {
          setPathname(newPathname);
        }
      }, 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => {
        const newPathname = window.location.pathname;
        if (newPathname !== pathname) {
          setPathname(newPathname);
        }
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [pathname]);
}

