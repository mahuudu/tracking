import type { Attribution, JourneyEntry } from './types';

export const DEFAULT_FIRST_TOUCH_TTL_DAYS = 90;
export const DEFAULT_LAST_TOUCH_TTL_DAYS = 30;
export const DEFAULT_JOURNEY_TTL_DAYS = 30;
export const JOURNEY_DEDUP_WINDOW = 5 * 60 * 1000;
export const MAX_JOURNEY_SIZE = 50;

export function getFirstTouchTTL(days?: number): number {
  const ttlDays = days ?? DEFAULT_FIRST_TOUCH_TTL_DAYS;
  return ttlDays * 24 * 60 * 60 * 1000;
}

export function getLastTouchTTL(days?: number): number {
  const ttlDays = days ?? DEFAULT_LAST_TOUCH_TTL_DAYS;
  return ttlDays * 24 * 60 * 60 * 1000;
}

export function getJourneyTTL(days?: number): number {
  const ttlDays = days ?? DEFAULT_JOURNEY_TTL_DAYS;
  return ttlDays * 24 * 60 * 60 * 1000;
}

export function isExpired(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp > ttl;
}

export function shouldCaptureAttribution(
  url: URL,
  referrer: string | null,
  existingFirstTouch: Attribution | null,
  isPageReload: boolean,
  customUTMConfig?: { enabled?: boolean; keyMapping?: Record<string, string | undefined> }
): boolean {
  if (hasUTMParameters(url, customUTMConfig)) {
    return true;
  }

  if (referrer && isExternalReferrer(referrer, url.hostname)) {
    return true;
  }

  if (!existingFirstTouch && !referrer && !isPageReload) {
    return true;
  }

  return false;
}

export function hasUTMParameters(url: URL, customUTMConfig?: { enabled?: boolean; keyMapping?: Record<string, string | undefined> }): boolean {
  const standardParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  
  if (standardParams.some(param => url.searchParams.has(param))) {
    return true;
  }

  if (customUTMConfig?.enabled && customUTMConfig.keyMapping) {
    const customKeys = Object.values(customUTMConfig.keyMapping).filter(Boolean) as string[];
    return customKeys.some(key => url.searchParams.has(key));
  }

  return false;
}

export function isExternalReferrer(referrer: string, currentHostname: string): boolean {
  try {
    const referrerUrl = new URL(referrer);
    return referrerUrl.hostname !== currentHostname;
  } catch {
    return false;
  }
}

export function parseAttributionFromURL(
  url: URL,
  referrer: string | null,
  customUTMConfig?: { enabled?: boolean; prefix?: string; allowedKeys?: string[]; keyMapping?: Record<string, string | undefined>; customParams?: { enabled?: boolean; keys?: string[]; parseJSON?: boolean; namespace?: string } }
): Attribution {
  let source: string | null = null;
  let medium: string | null = null;
  let campaign: string | null = null;
  let term: string | null = null;
  let content: string | null = null;

  if (customUTMConfig?.enabled && customUTMConfig.keyMapping) {
    const mapping = customUTMConfig.keyMapping;
    
    source = url.searchParams.get(mapping.source || 'utm_source') || 
             url.searchParams.get('utm_source') || null;
    medium = url.searchParams.get(mapping.medium || 'utm_medium') || 
             url.searchParams.get('utm_medium') || null;
    campaign = url.searchParams.get(mapping.campaign || 'utm_campaign') || 
               url.searchParams.get('utm_campaign') || null;
    term = url.searchParams.get(mapping.term || 'utm_term') || 
           url.searchParams.get('utm_term') || null;
    content = url.searchParams.get(mapping.content || 'utm_content') || 
              url.searchParams.get('utm_content') || null;
  } else {
    source = url.searchParams.get('utm_source') || null;
    medium = url.searchParams.get('utm_medium') || null;
    campaign = url.searchParams.get('utm_campaign') || null;
    term = url.searchParams.get('utm_term') || null;
    content = url.searchParams.get('utm_content') || null;
  }

  const finalSource = source || parseSourceFromReferrer(referrer) || 'direct';
  const finalMedium = medium || parseMediumFromReferrer(referrer) || 'none';

  const attribution: Attribution = {
    source: finalSource,
    medium: finalMedium,
    campaign,
    term,
    content,
    referrer,
    timestamp: Date.now(),
  };

  if (customUTMConfig?.enabled) {
    const prefix = customUTMConfig.prefix || 'utm_';
    const allowedKeys = customUTMConfig.allowedKeys;
    const keyMapping = customUTMConfig.keyMapping || {};

    url.searchParams.forEach((value, key) => {
      const isStandardUTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].includes(key);
      const isMappedKey = Object.values(keyMapping).includes(key);
      
      if (isStandardUTM || isMappedKey) {
        return;
      }

      if (key.startsWith(prefix)) {
        if (!allowedKeys || allowedKeys.includes(key)) {
          attribution[key] = value;
        }
      } else if (allowedKeys && allowedKeys.includes(key)) {
        attribution[key] = value;
      }
    });
  }

  if (customUTMConfig?.customParams?.enabled) {
    const customParamsConfig = customUTMConfig.customParams;
    const namespace = customParamsConfig.namespace || 'custom';
    const keysToCapture = customParamsConfig.keys;
    const parseJSON = customParamsConfig.parseJSON !== false;

    url.searchParams.forEach((value, key) => {
      const isStandardUTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].includes(key);
      const isMappedKey = customUTMConfig.keyMapping && Object.values(customUTMConfig.keyMapping).includes(key);
      const isCustomUTMParam = customUTMConfig.prefix && key.startsWith(customUTMConfig.prefix);
      
      if (isStandardUTM || isMappedKey || isCustomUTMParam) {
        return;
      }

      if (!keysToCapture || keysToCapture.includes(key)) {
        let parsedValue: any = value;
        
        if (parseJSON) {
          try {
            parsedValue = JSON.parse(value);
          } catch {
          }
        }

        if (namespace) {
          if (!attribution[namespace]) {
            attribution[namespace] = {};
          }
          attribution[namespace][key] = parsedValue;
        } else {
          attribution[key] = parsedValue;
        }
      }
    });
  }

  return attribution;
}

function parseSourceFromReferrer(referrer: string | null): string | null {
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes('google')) return 'google';
    if (hostname.includes('facebook')) return 'facebook';
    if (hostname.includes('twitter')) return 'twitter';
    if (hostname.includes('linkedin')) return 'linkedin';
    if (hostname.includes('instagram')) return 'instagram';

    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function parseMediumFromReferrer(referrer: string | null): string | null {
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes('google')) return 'organic';
    if (hostname.includes('facebook') || hostname.includes('twitter') || hostname.includes('linkedin') || hostname.includes('instagram')) {
      return 'social';
    }

    return 'referral';
  } catch {
    return null;
  }
}

export function shouldAppendToJourney(
  currentAttribution: Attribution,
  lastJourneyEntry: JourneyEntry | null
): boolean {
  if (!lastJourneyEntry) {
    return true;
  }

  if (currentAttribution.source !== lastJourneyEntry.source) {
    return true;
  }

  if (currentAttribution.medium !== lastJourneyEntry.medium) {
    return true;
  }

  if (currentAttribution.campaign !== lastJourneyEntry.campaign) {
    return true;
  }

  const timeDiff = currentAttribution.timestamp - lastJourneyEntry.timestamp;
  if (timeDiff < JOURNEY_DEDUP_WINDOW) {
    return false;
  }

  return false;
}

export function appendToJourney(
  journey: JourneyEntry[],
  attribution: Attribution,
  journeyTTL?: number,
  maxSize?: number
): JourneyEntry[] {
  const newEntry: JourneyEntry = {
    source: attribution.source,
    medium: attribution.medium,
    campaign: attribution.campaign,
    term: attribution.term,
    content: attribution.content,
    timestamp: attribution.timestamp,
  };

  Object.keys(attribution).forEach(key => {
    if (!['source', 'medium', 'campaign', 'term', 'content', 'referrer', 'timestamp'].includes(key)) {
      newEntry[key] = attribution[key];
    }
  });

  const updated = [...journey, newEntry];
  const maxJourneySize = maxSize ?? MAX_JOURNEY_SIZE;

  if (updated.length > maxJourneySize) {
    updated.shift();
  }

  if (journeyTTL) {
    return updated.filter(entry => !isExpired(entry.timestamp, journeyTTL));
  }

  return updated;
}

export function validateAttribution(attribution: any): attribution is Attribution {
  return (
    attribution &&
    typeof attribution === 'object' &&
    typeof attribution.source === 'string' &&
    typeof attribution.medium === 'string' &&
    typeof attribution.timestamp === 'number' &&
    (attribution.campaign === null || typeof attribution.campaign === 'string')
  );
}

export function validateJourneyEntry(entry: any): entry is JourneyEntry {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.source === 'string' &&
    typeof entry.medium === 'string' &&
    typeof entry.timestamp === 'number' &&
    (entry.campaign === null || typeof entry.campaign === 'string')
  );
}

