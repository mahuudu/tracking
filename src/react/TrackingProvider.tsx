'use client';

import { useEffect, useRef } from 'react';
import { initTracking, isTrackingInitialized } from '../browser/adapter';
import type { TrackingConfig } from '../core/types';
import { usePageView } from './usePageView';

interface TrackingProviderProps {
  children: React.ReactNode;
  config: TrackingConfig;
  autoPageView?: boolean;
}

function AutoPageViewTracker() {
  usePageView();
  return null;
}

function isConfigEqual(a: TrackingConfig, b: TrackingConfig): boolean {
  return (
    a.apiEndpoint === b.apiEndpoint &&
    a.autoPageView === b.autoPageView &&
    a.debug === b.debug &&
    a.storage === b.storage &&
    a.disableApi === b.disableApi &&
    JSON.stringify(a.pageValues) === JSON.stringify(b.pageValues) &&
    JSON.stringify(a.pageOverrides) === JSON.stringify(b.pageOverrides) &&
    JSON.stringify(a.attributionTTL) === JSON.stringify(b.attributionTTL) &&
    JSON.stringify(a.customUTM) === JSON.stringify(b.customUTM)
  );
}

export function TrackingProvider({ children, config, autoPageView = false }: TrackingProviderProps) {
  const configRef = useRef<TrackingConfig | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (initializedRef.current && isTrackingInitialized()) {
      if (configRef.current && !isConfigEqual(configRef.current, config)) {
        if (config.debug) {
          console.warn('[Tracking] Config changed but tracking already initialized. Re-initialization skipped.');
        }
      }
      return;
    }

    if (!initializedRef.current || (configRef.current && !isConfigEqual(configRef.current, config))) {
      configRef.current = config;
      initTracking(config);
      initializedRef.current = true;
    }
  }, [config]);

  return (
    <>
      {autoPageView && <AutoPageViewTracker />}
      {children}
    </>
  );
}

