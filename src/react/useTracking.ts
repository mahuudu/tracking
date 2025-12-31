'use client';

import { useCallback, useEffect, useState } from 'react';
import { track, page, funnel, identify, isTrackingInitialized, onTrackingReady, setContext, getTrackingVersion } from '../browser/adapter';
import { getJourneyData, setJourney, clearJourney } from '../browser/getTrackingData';

export function useTracking() {
  const [ready, setReady] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return isTrackingInitialized();
  });

  const [version] = useState(() => getTrackingVersion());

  useEffect(() => {
    if (ready) {
      return;
    }

    const unsubscribe = onTrackingReady(() => {
      setReady(true);
    });

    return unsubscribe;
  }, [ready]);

  const trackEvent = useCallback((name: string, properties?: Record<string, any>) => {
    track(name, properties);
  }, []);

  const trackPage = useCallback((options?: { path?: string; title?: string; value?: number }) => {
    page(options);
  }, []);

  const trackFunnel = useCallback((
    step: string,
    options?: { stepNumber: number; value?: number; properties?: Record<string, any> }
  ) => {
    funnel(step, options);
  }, []);

  const identifyUser = useCallback((userId: string, traits?: Record<string, any>) => {
    identify(userId, traits);
  }, []);

  const setGlobalContext = useCallback((context: Record<string, any>) => {
    setContext(context);
  }, []);

  const getJourney = useCallback(() => {
    return getJourneyData();
  }, []);

  const updateJourney = useCallback((journey: any[]) => {
    return setJourney(journey);
  }, []);

  const clearJourneyData = useCallback(() => {
    return clearJourney();
  }, []);

  return {
    ready,
    version,
    track: trackEvent,
    page: trackPage,
    funnel: trackFunnel,
    identify: identifyUser,
    setContext: setGlobalContext,
    getJourney,
    setJourney: updateJourney,
    clearJourney: clearJourneyData,
  };
}

