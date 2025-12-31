import { getDebugEvents, clearDebugEvents } from './debug';
import type { EnrichedEvent } from '../core/types';

export async function getAllDebugEvents(): Promise<EnrichedEvent[]> {
  const events = await getDebugEvents();
  return events.map(({ id, expiresAt, event }) => event);
}

export async function clearAllDebugEvents(): Promise<void> {
  await clearDebugEvents();
}

export async function getDebugEventsSummary(): Promise<{
  total: number;
  byType: Record<string, number>;
  latest: EnrichedEvent | null;
}> {
  const events = await getDebugEvents();

  const byType: Record<string, number> = {};
  events.forEach(item => {
    const type = item.event.event.type;
    byType[type] = (byType[type] || 0) + 1;
  });

  const latest = events[0];

  return {
    total: events.length,
    byType,
    latest: latest ? latest.event : null,
  };
}

