import { isTrackingInitialized } from './adapter';
import { getDebugEvents } from './debug';
import { getLocalStorage } from './storage';

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function getStorageUsage(): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 0;
  }

  try {
    let total = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const value = window.localStorage.getItem(key);
        if (value) {
          total += key.length + value.length;
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export function getTrackingHealth(): {
  initialized: boolean;
  queueSize: number;
  lastEventTime: number | null;
  storage: {
    available: boolean;
    usage: number;
  };
} {
  const debugEvents = typeof window !== 'undefined' ? getDebugEvents() : [];
  const lastEvent = debugEvents.length > 0 ? debugEvents[0] : null;

  let queueSize = 0;
  try {
    const adapter = (globalThis as any).__trackingAdapter;
    if (adapter && adapter.eventQueue) {
      queueSize = adapter.eventQueue.length;
    }
  } catch {
  }

  return {
    initialized: isTrackingInitialized(),
    queueSize,
    lastEventTime: lastEvent?.event.timestamp ?? null,
    storage: {
      available: isStorageAvailable(),
      usage: getStorageUsage(),
    },
  };
}

