export interface Attribution {
  source: string;
  medium: string;
  campaign: string | null;
  term?: string | null;
  content?: string | null;
  referrer: string | null;
  timestamp: number;
  [key: string]: any;
}

export interface JourneyEntry {
  source: string;
  medium: string;
  campaign: string | null;
  term?: string | null;
  content?: string | null;
  timestamp: number;
  [key: string]: any;
}

export interface AttributionData {
  firstTouch: Attribution | null;
  lastTouch: Attribution | null;
  journey: JourneyEntry[];
}

export interface PageViewEvent {
  type: 'pageview';
  path: string;
  title?: string;
  value: number;
  timestamp: number;
}

export interface FunnelStepEvent {
  type: 'funnel';
  step: string;
  stepNumber: number;
  value: number;
  properties?: Record<string, any>;
  timestamp: number;
}

export interface CustomEvent {
  type: 'event';
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

export type TrackingEvent = PageViewEvent | FunnelStepEvent | CustomEvent;

export interface Context {
  userAgent: string;
  screen: {
    width: number;
    height: number;
  };
  viewport: {
    width: number;
    height: number;
  };
  language: string;
  timezone: string;
  timestamp: number;
  url: string;
  path: string;
  referrer: string | null;
  sessionId: string;
  userId?: string;
  locale?: string;
  cartId?: string;
  device?: string;
  [key: string]: any;
}

export interface EnrichedEvent {
  event: TrackingEvent;
  attribution: AttributionData;
  context: Context;
}

export interface AttributionTTLConfig {
  firstTouchDays?: number;
  lastTouchDays?: number;
  journeyDays?: number;
  journeyDedupWindowSeconds?: number;
}

export interface CustomUTMConfig {
  enabled?: boolean;
  prefix?: string;
  allowedKeys?: string[];
  keyMapping?: Record<string, string>;
  customParams?: {
    enabled?: boolean;
    keys?: string[];
    parseJSON?: boolean;
    namespace?: string;
  };
}

export interface PageOverride {
  disable?: boolean;
  value?: number;
  disableAutoPageView?: boolean;
}

export interface ErrorReporting {
  captureException: (error: Error, context: Record<string, any>) => void;
}

export interface TrackingConfig {
  apiEndpoint?: string;
  autoPageView?: boolean;
  pageValues?: Record<string, number>;
  pageOverrides?: Record<string, PageOverride>;
  debug?: boolean;
  storage?: 'cookie' | 'localStorage';
  attributionTTL?: AttributionTTLConfig;
  customUTM?: CustomUTMConfig;
  disableApi?: boolean;
  maxJourneySize?: number;
  samplingRate?: number;
  errorReporting?: ErrorReporting;
  useFetchInsteadOfBeacon?: boolean;
}

export interface FunnelStep {
  stepName: string;
  stepNumber: number;
  value: number;
  timestamp: number;
}

