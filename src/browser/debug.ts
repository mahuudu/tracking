import type { EnrichedEvent } from '../core/types';
import { 
  saveDebugEventToIndexedDB, 
  getDebugEventsFromIndexedDB, 
  clearDebugEventsFromIndexedDB 
} from './offline';

interface DebugEventWithExpiry {
  id: string;
  event: EnrichedEvent;
  expiresAt: number;
}

export async function saveDebugEvent(event: EnrichedEvent): Promise<void> {
  await saveDebugEventToIndexedDB(event);
}

export async function getDebugEvents(): Promise<DebugEventWithExpiry[]> {
  return await getDebugEventsFromIndexedDB();
}

export async function clearDebugEvents(): Promise<void> {
  await clearDebugEventsFromIndexedDB();
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

