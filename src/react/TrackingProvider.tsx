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

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

function isConfigEqual(a: TrackingConfig, b: TrackingConfig): boolean {
  return (
    a.apiEndpoint === b.apiEndpoint &&
    a.autoPageView === b.autoPageView &&
    a.debug === b.debug &&
    a.storage === b.storage &&
    a.disableApi === b.disableApi &&
    a.samplingRate === b.samplingRate &&
    a.maxJourneySize === b.maxJourneySize &&
    a.useFetchInsteadOfBeacon === b.useFetchInsteadOfBeacon &&
    deepEqual(a.pageValues, b.pageValues) &&
    deepEqual(a.pageOverrides, b.pageOverrides) &&
    deepEqual(a.attributionTTL, b.attributionTTL) &&
    deepEqual(a.customUTM, b.customUTM) &&
    deepEqual(a.errorReporting, b.errorReporting)
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

