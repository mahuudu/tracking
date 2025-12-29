const STORAGE_PREFIX = '_utm_tracking_';
const FIRST_TOUCH_KEY = `${STORAGE_PREFIX}ft`;
const LAST_TOUCH_KEY = `${STORAGE_PREFIX}lt`;
const JOURNEY_KEY = `${STORAGE_PREFIX}journey`;
const SESSION_ID_KEY = `${STORAGE_PREFIX}session_id`;

export function getLocalStorage(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      return false;
    }
    return false;
  }
}

export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
  }
}

export function getFirstTouchKey(): string {
  return FIRST_TOUCH_KEY;
}

export function getLastTouchKey(): string {
  return LAST_TOUCH_KEY;
}

export function getJourneyKey(): string {
  return JOURNEY_KEY;
}

export function getSessionIdKey(): string {
  return SESSION_ID_KEY;
}

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

const SESSION_TIMEOUT = 30 * 60 * 1000;

interface SessionData {
  id: string;
  lastActivity: number;
}

export function getOrCreateSessionId(): string {
  const key = getSessionIdKey();
  const data = getLocalStorage(key);

  if (data) {
    try {
      const session: SessionData = JSON.parse(data);
      
      if (Date.now() - session.lastActivity < SESSION_TIMEOUT) {
        const updated: SessionData = {
          id: session.id,
          lastActivity: Date.now(),
        };
        setLocalStorage(key, JSON.stringify(updated));
        return session.id;
      }
    } catch {
    }
  }

  const newSessionId = generateSessionId();
  const newSession: SessionData = {
    id: newSessionId,
    lastActivity: Date.now(),
  };
  setLocalStorage(key, JSON.stringify(newSession));
  return newSessionId;
}

