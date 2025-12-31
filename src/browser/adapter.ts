import type {
  TrackingConfig,
  Attribution,
  AttributionData,
  JourneyEntry,
  Context,
  EnrichedEvent,
  FunnelStep,
} from '../core/types';
import {
  shouldCaptureAttribution,
  parseAttributionFromURL,
  shouldAppendToJourney,
  appendToJourney,
  validateAttribution,
  validateJourneyEntry,
  isExpired,
  hasUTMParameters,
  isExternalReferrer,
  getFirstTouchTTL,
  getLastTouchTTL,
  getJourneyTTL,
} from '../core/attribution';
import {
  validatePageValue,
  validateFunnelStep,
  validateEventName,
  createPageViewEvent,
  createFunnelStepEvent,
  createCustomEvent,
  collectContext,
  enrichEvent,
} from '../core/event';
import {
  getLocalStorage,
  setLocalStorage,
  removeLocalStorage,
  getFirstTouchKey,
  getLastTouchKey,
  getJourneyKey,
  getOrCreateSessionId,
} from './storage';
import { setCookie, getCookie } from './cookie';
import { getCurrentURL, getReferrer, isPageReload } from './url';
import { sendEvent, sendEventWithBeacon } from './send';
import { saveDebugEvent, logDebugEvent } from './debug';


const TRACKING_VERSION = '1.0.0';
const MAX_QUEUE_SIZE = 100;
const QUEUE_TIMEOUT = 30000;

interface QueuedEvent {
  type: 'page' | 'funnel' | 'track';
  payload: any;
  queuedAt: number;
}

class TrackingAdapter {
  private config: TrackingConfig | null = null;
  private context: Context | null = null;
  private sessionSteps: FunnelStep[] = [];
  private initialized = false;
  private eventQueue: QueuedEvent[] = [];
  private globalContext: Record<string, any> = {};
  private queueTimeoutId: NodeJS.Timeout | null = null;

  init(config: TrackingConfig): void {
    if (this.initialized) {
      if (config.debug) {
        console.warn('[Tracking] Already initialized, skipping...');
      }
      return;
    }

    this.config = config;
    this.context = collectContext();
    this.context.sessionId = getOrCreateSessionId();
    this.mergeGlobalContext();

    this.captureAttribution();
    this.initialized = true;

    this.flushEventQueue();

    if (config.debug) {
      console.log('[Tracking] Initialized', this.config);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getVersion(): string {
    return TRACKING_VERSION;
  }

  setContext(context: Record<string, any>): void {
    this.globalContext = { ...this.globalContext, ...context };
    if (this.context) {
      this.mergeGlobalContext();
    }
  }

  private mergeGlobalContext(): void {
    if (!this.context) {
      return;
    }
    Object.assign(this.context, this.globalContext);
  }

  private shouldTrackPage(path: string): boolean {
    if (!this.config) {
      return true;
    }

    const override = this.config.pageOverrides?.[path];
    if (override?.disable) {
      return false;
    }

    return true;
  }

  private getPageValue(path: string): number | undefined {
    if (!this.config) {
      return undefined;
    }

    const override = this.config.pageOverrides?.[path];
    if (override?.value !== undefined) {
      return override.value;
    }

    return this.config.pageValues?.[path];
  }

  private queueEvent(type: 'page' | 'funnel' | 'track', payload: any): void {
    if (this.eventQueue.length >= MAX_QUEUE_SIZE) {
      if (this.config?.debug) {
        console.warn('[Tracking] Queue full, dropping oldest event');
      }
      this.eventQueue.shift();
    }

    this.eventQueue.push({ type, payload, queuedAt: Date.now() });

    if (this.config?.debug) {
      console.log(`[Tracking] Event queued (${this.eventQueue.length} in queue):`, type, payload);
    }

    if (!this.queueTimeoutId) {
      this.queueTimeoutId = setTimeout(() => {
        this.cleanupExpiredQueue();
      }, QUEUE_TIMEOUT);
    }
  }

  private cleanupExpiredQueue(): void {
    const now = Date.now();
    const initialLength = this.eventQueue.length;
    
    this.eventQueue = this.eventQueue.filter(
      e => now - e.queuedAt < QUEUE_TIMEOUT
    );

    if (this.eventQueue.length < initialLength && this.config?.debug) {
      console.log(`[Tracking] Cleaned up ${initialLength - this.eventQueue.length} expired queued events`);
    }

    this.queueTimeoutId = null;
  }

  private flushEventQueue(): void {
    if (this.eventQueue.length === 0) {
      return;
    }

    if (this.config?.debug) {
      console.log(`[Tracking] Flushing ${this.eventQueue.length} queued events`);
    }

    const queue = [...this.eventQueue];
    this.eventQueue = [];

    queue.forEach(({ type, payload }) => {
      try {
        if (type === 'page') {
          this.page(payload);
        } else if (type === 'funnel') {
          this.funnel(payload.step, payload.options);
        } else if (type === 'track') {
          this.track(payload.name, payload.properties);
        }
      } catch (error) {
        if (this.config?.debug) {
          console.error('[Tracking] Error flushing queued event:', error);
        }
      }
    });
  }

  private captureAttribution(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const url = getCurrentURL();
      const referrer = getReferrer();
      const isReload = isPageReload();

      const existingFirstTouch = this.getFirstTouch();
      const shouldCapture = shouldCaptureAttribution(url, referrer, existingFirstTouch, isReload, this.config?.customUTM);

      if (this.config?.debug) {
        console.log('[Tracking] Attribution capture check:', {
          url: url.href,
          referrer,
          hasUTM: hasUTMParameters(url, this.config?.customUTM),
          isExternalReferrer: referrer ? isExternalReferrer(referrer, url.hostname) : false,
          existingFirstTouch: !!existingFirstTouch,
          shouldCapture,
        });
      }

      // If no firstTouch exists yet, capture a default attribution even for internal navigation
      // This ensures we always have attribution data to send to backend
      if (!shouldCapture) {
        if (!existingFirstTouch) {
          // Capture default attribution when no firstTouch exists
          const defaultAttribution = parseAttributionFromURL(url, referrer, this.config?.customUTM);
          
          if (this.config?.debug) {
            console.log('[Tracking] Capturing default attribution (no firstTouch yet):', defaultAttribution);
          }
          
          this.setFirstTouch(defaultAttribution);
          this.setLastTouch(defaultAttribution);
          
          const existingJourney = this.getJourney();
          const shouldAppend = shouldAppendToJourney(defaultAttribution, existingJourney[existingJourney.length - 1] || null);
          
          if (this.config?.debug) {
            console.log('[Tracking] Journey append check:', {
              existingJourneyLength: existingJourney.length,
              shouldAppend,
              lastJourneyEntry: existingJourney[existingJourney.length - 1] || null,
            });
          }
          
          if (shouldAppend) {
            const journeyTTL = getJourneyTTL(this.config?.attributionTTL?.journeyDays);
            const maxJourneySize = this.config?.maxJourneySize;
            const updatedJourney = appendToJourney(existingJourney, defaultAttribution, journeyTTL, maxJourneySize);
            
            if (this.config?.debug) {
              console.log('[Tracking] Setting journey:', updatedJourney);
            }
            
            this.setJourney(updatedJourney);
          } else if (existingJourney.length === 0) {
            // If journey is empty and shouldAppend is false, still create initial journey entry
            // This can happen if shouldAppendToJourney returns false for some reason
            const journeyTTL = getJourneyTTL(this.config?.attributionTTL?.journeyDays);
            const initialJourney = appendToJourney([], defaultAttribution, journeyTTL, this.config?.maxJourneySize);
            
            if (this.config?.debug) {
              console.log('[Tracking] Creating initial journey entry:', initialJourney);
            }
            
            this.setJourney(initialJourney);
          }
        } else {
          if (this.config?.debug) {
            console.log('[Tracking] Skipping attribution capture (internal navigation or reload)');
          }
        }
        return;
      }

      const attribution = parseAttributionFromURL(url, referrer, this.config?.customUTM);

      if (this.config?.debug) {
        console.log('[Tracking] Captured attribution:', attribution);
      }

      if (!existingFirstTouch) {
        this.setFirstTouch(attribution);
      }

      this.setLastTouch(attribution);

      const existingJourney = this.getJourney();
      const shouldAppend = shouldAppendToJourney(attribution, existingJourney[existingJourney.length - 1] || null);
      
      if (this.config?.debug) {
        console.log('[Tracking] Journey append check:', {
          existingJourneyLength: existingJourney.length,
          shouldAppend,
          lastJourneyEntry: existingJourney[existingJourney.length - 1] || null,
        });
      }
      
      if (shouldAppend) {
        const journeyTTL = getJourneyTTL(this.config?.attributionTTL?.journeyDays);
        const maxJourneySize = this.config?.maxJourneySize;
        const updatedJourney = appendToJourney(existingJourney, attribution, journeyTTL, maxJourneySize);
        
        if (this.config?.debug) {
          console.log('[Tracking] Setting journey:', updatedJourney);
        }
        
        this.setJourney(updatedJourney);
      } else if (existingJourney.length === 0) {
        // If journey is empty and shouldAppend is false, still create initial journey entry
        const journeyTTL = getJourneyTTL(this.config?.attributionTTL?.journeyDays);
        const initialJourney = appendToJourney([], attribution, journeyTTL, this.config?.maxJourneySize);
        
        if (this.config?.debug) {
          console.log('[Tracking] Creating initial journey entry:', initialJourney);
        }
        
        this.setJourney(initialJourney);
      }
    } catch (e) {
      const errorContext = {
        function: 'captureAttribution',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        config: {
          apiEndpoint: this.config?.apiEndpoint,
          debug: this.config?.debug,
          storage: this.config?.storage,
        },
        timestamp: Date.now(),
      };

      if (this.config?.debug) {
        console.error('[Tracking] Error capturing attribution:', e, errorContext);
      }

      if (this.config?.errorReporting) {
        this.config.errorReporting.captureException(e instanceof Error ? e : new Error(String(e)), errorContext);
      }
    }
  }

  private getFirstTouch(): Attribution | null {
    const key = getFirstTouchKey();
    const useStorage = this.config?.storage === 'localStorage';

    let data: string | null = null;
    if (useStorage) {
      data = getLocalStorage(key);
    } else {
      data = getCookie(key);
    }

    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      if (!validateAttribution(parsed)) {
        this.clearFirstTouch();
        return null;
      }

      const ttl = getFirstTouchTTL(this.config?.attributionTTL?.firstTouchDays);
      if (isExpired(parsed.timestamp, ttl)) {
        this.clearFirstTouch();
        return null;
      }

      return parsed;
    } catch {
      this.clearFirstTouch();
      return null;
    }
  }

  private setFirstTouch(attribution: Attribution): void {
    const key = getFirstTouchKey();
    const data = JSON.stringify(attribution);
    const useStorage = this.config?.storage === 'localStorage';
    const ttlDays = this.config?.attributionTTL?.firstTouchDays ?? 90;

    if (useStorage) {
      setLocalStorage(key, data);
    } else {
      setCookie(key, data, ttlDays);
    }
  }

  private clearFirstTouch(): void {
    const key = getFirstTouchKey();
    if (this.config?.storage === 'localStorage') {
      removeLocalStorage(key);
    } else {
      getCookie(key);
    }
  }

  private getLastTouch(): Attribution | null {
    const key = getLastTouchKey();
    const useStorage = this.config?.storage === 'localStorage';

    let data: string | null = null;
    if (useStorage) {
      data = getLocalStorage(key);
    } else {
      data = getCookie(key);
    }

    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      if (!validateAttribution(parsed)) {
        this.clearLastTouch();
        return null;
      }

      const ttl = getLastTouchTTL(this.config?.attributionTTL?.lastTouchDays);
      if (isExpired(parsed.timestamp, ttl)) {
        this.clearLastTouch();
        return null;
      }

      return parsed;
    } catch {
      this.clearLastTouch();
      return null;
    }
  }

  private setLastTouch(attribution: Attribution): void {
    const key = getLastTouchKey();
    const data = JSON.stringify(attribution);
    const useStorage = this.config?.storage === 'localStorage';
    const ttlDays = this.config?.attributionTTL?.lastTouchDays ?? 30;

    if (useStorage) {
      setLocalStorage(key, data);
    } else {
      setCookie(key, data, ttlDays);
    }
  }

  private clearLastTouch(): void {
    const key = getLastTouchKey();
    if (this.config?.storage === 'localStorage') {
      removeLocalStorage(key);
    } else {
      getCookie(key);
    }
  }

  private getJourney(): JourneyEntry[] {
    const key = getJourneyKey();
    const data = getLocalStorage(key);

    if (!data) {
      return [];
    }

    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        this.clearJourney();
        return [];
      }

      const valid = parsed.filter(validateJourneyEntry);
      const journeyTTL = getJourneyTTL(this.config?.attributionTTL?.journeyDays);
      const notExpired = valid.filter(entry => !isExpired(entry.timestamp, journeyTTL));
      
      if (notExpired.length !== valid.length) {
        this.setJourney(notExpired);
      }
      
      return notExpired;
    } catch {
      this.clearJourney();
      return [];
    }
  }

  private setJourney(journey: JourneyEntry[]): void {
    const key = getJourneyKey();
    const data = JSON.stringify(journey);
    setLocalStorage(key, data);
  }

  private clearJourney(): void {
    const key = getJourneyKey();
    removeLocalStorage(key);
  }

  private getAttributionData(): AttributionData {
    return {
      firstTouch: this.getFirstTouch(),
      lastTouch: this.getLastTouch(),
      journey: this.getJourney(),
    };
  }

  private async sendEventToBackend(event: EnrichedEvent): Promise<void> {
    if (!this.config) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (this.config.debug) {
      logDebugEvent(event);
      saveDebugEvent(event);
    }

    if (this.config.disableApi || !this.config.apiEndpoint) {
      if (this.config.debug) {
        console.log('[Tracking] API disabled or no endpoint, event saved to debug storage only');
      }
      return;
    }

    const sent = sendEventWithBeacon(event, this.config.apiEndpoint);
    if (!sent) {
      await sendEvent(event, this.config.apiEndpoint);
    }
  }

  private shouldSample(): boolean {
    const rate = this.config?.samplingRate ?? 1.0;
    return Math.random() < rate;
  }

  page(options?: { path?: string; title?: string; value?: number }): void {
    if (!this.config || !this.context) {
      if (!this.initialized) {
        this.queueEvent('page', options);
        return;
      }
      if (this.config?.debug) {
        console.warn('[Tracking] Not initialized');
      }
      return;
    }

    if (!this.shouldSample()) {
      if (this.config.debug) {
        console.log('[Tracking] Event skipped due to sampling');
      }
      return;
    }

    const path = options?.path || (typeof window !== 'undefined' ? window.location.pathname : this.context.path);
    
    if (!this.shouldTrackPage(path)) {
      if (this.config.debug) {
        console.log(`[Tracking] Page tracking disabled for: ${path}`);
      }
      return;
    }

    const title = options?.title || (typeof document !== 'undefined' ? document.title : '');
    const pageValue = options?.value !== undefined
      ? options.value
      : this.getPageValue(path) ?? 0;

    if (!validatePageValue(pageValue, path).valid) {
      if (this.config.debug) {
        console.error('[Tracking] Invalid page value:', pageValue);
      }
      return;
    }

    // Check if we should capture attribution on this page (e.g., if URL has UTM params)
    // This allows attribution to be captured when navigating between pages
    if (typeof window !== 'undefined') {
      const url = getCurrentURL();
      const referrer = getReferrer();
      const hasUTM = hasUTMParameters(url, this.config?.customUTM);
      
      // Capture attribution if URL has UTM params (even for internal navigation)
      if (hasUTM) {
        if (this.config?.debug) {
          console.log('[Tracking] Page has UTM params, capturing attribution on page navigation');
        }
        this.captureAttribution();
      }
    }

    const pageEvent = createPageViewEvent(path, title, pageValue);
    const attribution = this.getAttributionData();
    const context = { ...this.context };
    this.mergeGlobalContext();

    const enriched = enrichEvent(pageEvent, attribution, context);
    this.sendEventToBackend(enriched);
  }

  funnel(step: string, options?: { stepNumber: number; value?: number; properties?: Record<string, any> }): void {
    if (!this.config || !this.context) {
      if (!this.initialized) {
        this.queueEvent('funnel', { step, options });
        return;
      }
      if (this.config?.debug) {
        console.warn('[Tracking] Not initialized');
      }
      return;
    }

    if (!this.shouldSample()) {
      if (this.config.debug) {
        console.log('[Tracking] Event skipped due to sampling');
      }
      return;
    }

    if (!options || options.stepNumber === undefined) {
      if (this.config.debug) {
        console.error('[Tracking] Funnel step requires stepNumber');
      }
      return;
    }

    const previousStep = this.sessionSteps.length > 0 ? this.sessionSteps[this.sessionSteps.length - 1] : null;
    const value = options.value !== undefined ? options.value : 0;

    const validation = validateFunnelStep(step, options.stepNumber, value, previousStep, this.sessionSteps);

    if (!validation.valid) {
      if (this.config.debug) {
        console.error(`[Tracking] Invalid funnel step:`, validation.error);
      }
      return;
    }

    if (validation.warning && this.config.debug) {
      console.warn(`[Tracking] Funnel step warning:`, validation.warning);
    }

    const funnelEvent = createFunnelStepEvent(step, options.stepNumber, value, options.properties);

    this.sessionSteps.push({
      stepName: step,
      stepNumber: options.stepNumber,
      value,
      timestamp: Date.now(),
    });

    const attribution = this.getAttributionData();
    const context = { ...this.context };
    this.mergeGlobalContext();

    const enriched = enrichEvent(funnelEvent, attribution, context);
    this.sendEventToBackend(enriched);
  }

  track(name: string, properties?: Record<string, any>): void {
    if (!this.config || !this.context) {
      if (!this.initialized) {
        this.queueEvent('track', { name, properties });
        return;
      }
      if (this.config?.debug) {
        console.warn('[Tracking] Not initialized');
      }
      return;
    }

    const nameValidation = validateEventName(name);
    if (!nameValidation.valid) {
      if (this.config.debug) {
        console.warn(`[Tracking] Invalid event name: "${name}". ${nameValidation.error}`);
      }
      return;
    }

    const event = createCustomEvent(name, properties);
    const attribution = this.getAttributionData();
    const context = { ...this.context };
    this.mergeGlobalContext();

    const enriched = enrichEvent(event, attribution, context);
    this.sendEventToBackend(enriched);
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.config) {
      return;
    }

    this.track('identify', {
      userId,
      ...traits,
    });
  }
}

let trackingInstance: TrackingAdapter | null = null;
let initialized = false;
const readyListeners = new Set<() => void>();

if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, '__trackingAdapter', {
    get: () => trackingInstance,
    configurable: true,
  });
}

export function initTracking(config: TrackingConfig): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!trackingInstance) {
    trackingInstance = new TrackingAdapter();
  }

  trackingInstance.init(config);
  initialized = true;
  readyListeners.forEach(listener => listener());
  readyListeners.clear();
}

export function isTrackingInitialized(): boolean {
  return trackingInstance !== null && trackingInstance.isInitialized();
}

export function onTrackingReady(callback: () => void): () => void {
  if (initialized) {
    callback();
    return () => {};
  }

  readyListeners.add(callback);
  return () => {
    readyListeners.delete(callback);
  };
}

export function track(name: string, properties?: Record<string, any>): void {
  if (!trackingInstance) {
    console.warn('[Tracking] Not initialized. Call initTracking() first.');
    return;
  }

  trackingInstance.track(name, properties);
}

export function page(options?: { path?: string; title?: string; value?: number }): void {
  if (!trackingInstance) {
    console.warn('[Tracking] Not initialized. Call initTracking() first.');
    return;
  }

  trackingInstance.page(options);
}

export function funnel(step: string, options?: { stepNumber: number; value?: number; properties?: Record<string, any> }): void {
  if (!trackingInstance) {
    console.warn('[Tracking] Not initialized. Call initTracking() first.');
    return;
  }

  trackingInstance.funnel(step, options);
}

export function identify(userId: string, traits?: Record<string, any>): void {
  if (!trackingInstance) {
    console.warn('[Tracking] Not initialized. Call initTracking() first.');
    return;
  }

  trackingInstance.identify(userId, traits);
}

export function setContext(context: Record<string, any>): void {
  if (!trackingInstance) {
    console.warn('[Tracking] Not initialized. Call initTracking() first.');
    return;
  }

  trackingInstance.setContext(context);
}

export function getTrackingVersion(): string {
  return TRACKING_VERSION;
}

