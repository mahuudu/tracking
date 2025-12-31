import type { EnrichedEvent } from '../core/types';

const DB_NAME = 'tracking_storage';
const DB_VERSION = 1;
const OFFLINE_STORE_NAME = 'offline_events';
const DEBUG_STORE_NAME = 'debug_events';

interface QueuedEvent {
  id: string;
  event: EnrichedEvent;
  endpoint: string;
  createdAt: number;
  retries: number;
}

let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
      initPromise = null;
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
      initPromise = null;
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        const store = db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(DEBUG_STORE_NAME)) {
        const store = db.createObjectStore(DEBUG_STORE_NAME, { keyPath: 'id' });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
        store.createIndex('timestamp', 'event.timestamp', { unique: false });
      }
    };
  });

  return initPromise;
}

export async function saveEventToOfflineQueue(event: EnrichedEvent, endpoint: string): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return false;
  }

  try {
    const db = await initDB();
    const transaction = db.transaction([OFFLINE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(OFFLINE_STORE_NAME);

    const queuedEvent: QueuedEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      event,
      endpoint,
      createdAt: Date.now(),
      retries: 0,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.add(queuedEvent);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return true;
  } catch (error) {
    return false;
  }
}

export async function getOfflineEvents(): Promise<QueuedEvent[]> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return [];
  }

  try {
    const db = await initDB();
    const transaction = db.transaction([OFFLINE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(OFFLINE_STORE_NAME);
    const index = store.index('createdAt');

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch {
    return [];
  }
}

export async function removeOfflineEvent(id: string): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return false;
  }

  try {
    const db = await initDB();
    const transaction = db.transaction([OFFLINE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(OFFLINE_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return true;
  } catch {
    return false;
  }
}

export async function updateEventRetries(id: string, retries: number): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return false;
  }

  try {
    const db = await initDB();
    const transaction = db.transaction([OFFLINE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(OFFLINE_STORE_NAME);

    const getRequest = store.get(id);
    await new Promise<void>((resolve, reject) => {
      getRequest.onsuccess = () => {
        const event = getRequest.result;
        if (event) {
          event.retries = retries;
          const putRequest = store.put(event);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });

    return true;
  } catch {
    return false;
  }
}

export async function clearOfflineQueue(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return false;
  }

  try {
    const db = await initDB();
    const transaction = db.transaction([OFFLINE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(OFFLINE_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return true;
  } catch {
    return false;
  }
}

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return navigator.onLine !== false;
}

interface DebugEventWithExpiry {
  id: string;
  event: EnrichedEvent;
  expiresAt: number;
}

const MAX_DEBUG_EVENTS = 50;
const DEBUG_EVENT_TTL = 7 * 24 * 60 * 60 * 1000;

export async function saveDebugEventToIndexedDB(event: EnrichedEvent): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return false;
  }

  try {
    const db = await initDB();
    const transaction = db.transaction([DEBUG_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(DEBUG_STORE_NAME);
    const expiresIndex = store.index('expiresAt');

    const now = Date.now();
    const expiredKeyRange = IDBKeyRange.upperBound(now);
    const expiredRequest = expiresIndex.openCursor(expiredKeyRange);
    
    await new Promise<void>((resolve) => {
      expiredRequest.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      expiredRequest.onerror = () => resolve();
    });

    const allEvents = await new Promise<DebugEventWithExpiry[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const validEvents = allEvents.filter(e => e.expiresAt > now);
    
    if (validEvents.length >= MAX_DEBUG_EVENTS) {
      validEvents.sort((a, b) => a.expiresAt - b.expiresAt);
      const oldestId = validEvents[0].id;
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = store.delete(oldestId);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
    }

    const debugEvent: DebugEventWithExpiry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      event,
      expiresAt: now + DEBUG_EVENT_TTL,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.add(debugEvent);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return true;
  } catch {
    return false;
  }
}

export async function getDebugEventsFromIndexedDB(): Promise<DebugEventWithExpiry[]> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return [];
  }

  try {
    const db = await initDB();
    const transaction = db.transaction([DEBUG_STORE_NAME], 'readonly');
    const store = transaction.objectStore(DEBUG_STORE_NAME);
    const expiresIndex = store.index('expiresAt');

    const now = Date.now();
    const validKeyRange = IDBKeyRange.lowerBound(now);

    return new Promise((resolve, reject) => {
      const request = expiresIndex.getAll(validKeyRange);
      request.onsuccess = () => {
        const events = request.result || [];
        const sortedEvents = events.sort((a, b) => b.event.timestamp - a.event.timestamp);
        resolve(sortedEvents);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function clearDebugEventsFromIndexedDB(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return false;
  }

  try {
    const db = await initDB();
    const transaction = db.transaction([DEBUG_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(DEBUG_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return true;
  } catch {
    return false;
  }
}

export async function syncOfflineEvents(
  sendEventFn: (event: EnrichedEvent, endpoint: string) => Promise<boolean>,
  maxRetries: number = 3
): Promise<number> {
  if (!isOnline()) {
    return 0;
  }

  const events = await getOfflineEvents();
  let syncedCount = 0;

  for (const queuedEvent of events) {
    if (queuedEvent.retries >= maxRetries) {
      await removeOfflineEvent(queuedEvent.id);
      continue;
    }

    try {
      const success = await sendEventFn(queuedEvent.event, queuedEvent.endpoint);
      if (success) {
        await removeOfflineEvent(queuedEvent.id);
        syncedCount++;
      } else {
        await updateEventRetries(queuedEvent.id, queuedEvent.retries + 1);
      }
    } catch {
      await updateEventRetries(queuedEvent.id, queuedEvent.retries + 1);
    }
  }

  return syncedCount;
}

