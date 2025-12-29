import type { EnrichedEvent } from '../core/types';

const DEBUG_STORAGE_KEY = '_utm_tracking_debug_events';
const MAX_DEBUG_EVENTS = 50;

export function saveDebugEvent(event: EnrichedEvent): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const existing = getDebugEvents();
    existing.unshift(event);

    if (existing.length > MAX_DEBUG_EVENTS) {
      existing.pop();
    }

    window.localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(existing));
  } catch {
  }
}

export function getDebugEvents(): EnrichedEvent[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const data = window.localStorage.getItem(DEBUG_STORAGE_KEY);
    if (!data) {
      return [];
    }

    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function clearDebugEvents(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(DEBUG_STORAGE_KEY);
  } catch {
  }
}

export function logDebugEvent(event: EnrichedEvent): void {
  const eventType = event.event.type;
  const eventPath = 'path' in event.event ? event.event.path : undefined;
  const eventName = 'name' in event.event ? event.event.name : undefined;
  const stepName = 'step' in event.event ? event.event.step : undefined;

  console.group(`[Tracking] ${eventType.toUpperCase()} Event`);
  console.log('Type:', eventType);
  if (eventPath) console.log('Path:', eventPath);
  if (eventName) console.log('Name:', eventName);
  if (stepName) console.log('Step:', stepName);
  console.log('Timestamp:', new Date(event.event.timestamp).toISOString());
  console.log('Attribution:', {
    firstTouch: event.attribution.firstTouch?.source,
    lastTouch: event.attribution.lastTouch?.source,
    journeyLength: event.attribution.journey.length,
  });
  console.log('Context:', {
    sessionId: event.context.sessionId,
    url: event.context.url,
  });
  console.log('Full Event:', event);
  console.groupEnd();
}

