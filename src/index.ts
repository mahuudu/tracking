export { initTracking, track, page, funnel, identify, isTrackingInitialized, setContext, getTrackingVersion } from './browser/adapter';
export { getTrackingHealth } from './browser/health';
export { getAllDebugEvents, clearAllDebugEvents, getDebugEventsSummary } from './browser/getDebugEvents';
export {
  getFirstTouchData,
  getLastTouchData,
  getJourneyData,
  getAllAttributionData,
  getSessionId,
  getTrackingData,
  clearFirstTouch,
  clearLastTouch,
  clearJourney,
  clearAllAttribution,
  clearSession,
  clearAllTrackingData,
  clearAfterConversion,
  setFirstTouch,
  setLastTouch,
  setJourney,
} from './browser/getTrackingData';
export type {
  TrackingConfig,
  AttributionTTLConfig,
  CustomUTMConfig,
  Attribution,
  AttributionData,
  JourneyEntry,
  PageViewEvent,
  FunnelStepEvent,
  CustomEvent,
  TrackingEvent,
  Context,
  EnrichedEvent,
} from './core/types';

// React exports
export { useTracking, usePageView, TrackingProvider } from './react';
