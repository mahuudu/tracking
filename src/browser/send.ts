import type { EnrichedEvent } from '../core/types';

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendEvent(
  event: EnrichedEvent,
  endpoint: string,
  retries: number = MAX_RETRIES
): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
        keepalive: true,
      });

      if (response.ok) {
        return true;
      }

      if (response.status >= 400 && response.status < 500) {
        return false;
      }

      if (i < retries - 1) {
        await delay(Math.pow(2, i) * RETRY_DELAY_BASE);
        continue;
      }
    } catch (e) {
      if (i < retries - 1) {
        await delay(Math.pow(2, i) * RETRY_DELAY_BASE);
        continue;
      }
    }
  }

  return false;
}

export function sendEventWithBeacon(event: EnrichedEvent, endpoint: string): boolean {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    return false;
  }

  try {
    const blob = new Blob([JSON.stringify(event)], { type: 'application/json' });
    return navigator.sendBeacon(endpoint, blob);
  } catch {
    return false;
  }
}

