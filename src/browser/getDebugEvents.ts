import { getDebugEvents, clearDebugEvents } from './debug';
import type { EnrichedEvent } from '../core/types';

export function getAllDebugEvents(): EnrichedEvent[] {
  return getDebugEvents();
}

export function clearAllDebugEvents(): void {
  clearDebugEvents();
}

export function getDebugEventsSummary(): {
  total: number;
  byType: Record<string, number>;
  latest: EnrichedEvent | null;
} {
  const events = getDebugEvents();

  const byType: Record<string, number> = {};
  events.forEach(event => {
    const type = event.event.type;
    byType[type] = (byType[type] || 0) + 1;
  });

  return {
    total: events.length,
    byType,
    latest: events[0] || null,
  };
}

