import type { Attribution, AttributionData, JourneyEntry, EnrichedEvent } from '../core/types';
import { getFirstTouchKey, getLastTouchKey, getJourneyKey, getSessionIdKey, removeLocalStorage, setLocalStorage } from './storage';
import { getLocalStorage } from './storage';
import { getCookie, setCookie, removeCookie } from './cookie';
import { validateAttribution, validateJourneyEntry, getFirstTouchTTL, getLastTouchTTL } from '../core/attribution';
import { getDebugEvents } from './debug';
import { clearAllDebugEvents } from './getDebugEvents';

export function getFirstTouchData(useLocalStorage: boolean = true): Attribution | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const key = getFirstTouchKey();
  let data: string | null = null;

  if (useLocalStorage) {
    data = getLocalStorage(key);
  } else {
    data = getCookie(key);
  }

  if (!data) {
    return null;
  }

  try {
    const parsed = JSON.parse(data);
    if (validateAttribution(parsed)) {
      return parsed;
    }
  } catch {
  }

  return null;
}

export function getLastTouchData(useLocalStorage: boolean = true): Attribution | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const key = getLastTouchKey();
  let data: string | null = null;

  if (useLocalStorage) {
    data = getLocalStorage(key);
  } else {
    data = getCookie(key);
  }

  if (!data) {
    return null;
  }

  try {
    const parsed = JSON.parse(data);
    if (validateAttribution(parsed)) {
      return parsed;
    }
  } catch {
  }

  return null;
}

export function getJourneyData(): JourneyEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const key = getJourneyKey();
  const data = getLocalStorage(key);

  if (!data) {
    return [];
  }

  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter(entry => validateJourneyEntry(entry));
    }
  } catch {
  }

  return [];
}

export function getAllAttributionData(useLocalStorage: boolean = true): AttributionData {
  return {
    firstTouch: getFirstTouchData(useLocalStorage),
    lastTouch: getLastTouchData(useLocalStorage),
    journey: getJourneyData(),
  };
}

export function getSessionId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const data = getLocalStorage('_utm_tracking_session_id');
    return data || null;
  } catch {
    return null;
  }
}

export function getTrackingData(): {
  timestamp: string;
  sessionId: string | null;
  attribution: AttributionData;
  debugEvents: EnrichedEvent[];
} {
  return {
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    attribution: getAllAttributionData(),
    debugEvents: typeof window !== 'undefined' ? getDebugEvents() : [],
  };
}

export function exportTrackingDataAsJSON(): string {
  const data = getTrackingData();
  return JSON.stringify(data, null, 2);
}

export function downloadTrackingData(filename: string = `tracking-data-${Date.now()}.json`): void {
  if (typeof window === 'undefined') {
    return;
  }

  const json = exportTrackingDataAsJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function clearFirstTouch(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const key = getFirstTouchKey();
  removeLocalStorage(key);
  removeCookie(key);
}

export function clearLastTouch(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const key = getLastTouchKey();
  removeLocalStorage(key);
  removeCookie(key);
}

export function clearJourney(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const key = getJourneyKey();
  removeLocalStorage(key);
}

export function clearAllAttribution(): void {
  clearFirstTouch();
  clearLastTouch();
  clearJourney();
}

export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const key = getSessionIdKey();
  removeLocalStorage(key);
}

export function clearAllTrackingData(): void {
  clearAllAttribution();
  clearSession();
  clearAllDebugEvents();
}

export function clearAfterConversion(): void {
  clearLastTouch();
  clearJourney();
}

export function setFirstTouch(attribution: Attribution, useLocalStorage: boolean = true): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!validateAttribution(attribution)) {
    return false;
  }

  const key = getFirstTouchKey();
  const data = JSON.stringify(attribution);

  if (useLocalStorage) {
    return setLocalStorage(key, data);
  } else {
    const ttl = getFirstTouchTTL();
    const ttlDays = Math.ceil(ttl / (24 * 60 * 60 * 1000));
    return setCookie(key, data, ttlDays);
  }
}

export function setLastTouch(attribution: Attribution, useLocalStorage: boolean = true): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!validateAttribution(attribution)) {
    return false;
  }

  const key = getLastTouchKey();
  const data = JSON.stringify(attribution);

  if (useLocalStorage) {
    return setLocalStorage(key, data);
  } else {
    const ttl = getLastTouchTTL();
    const ttlDays = Math.ceil(ttl / (24 * 60 * 60 * 1000));
    return setCookie(key, data, ttlDays);
  }
}

export function setJourney(journey: JourneyEntry[]): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const valid = journey.filter(entry => validateJourneyEntry(entry));
  const key = getJourneyKey();
  const data = JSON.stringify(valid);
  return setLocalStorage(key, data);
}

