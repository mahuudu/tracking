import type { PageViewEvent, FunnelStepEvent, CustomEvent, TrackingEvent, Context, EnrichedEvent, AttributionData } from './types';

export function validatePageValue(
  value: number | undefined,
  path: string
): { valid: boolean; normalizedValue: number; error?: string } {
  if (value === undefined || value === null) {
    return { valid: true, normalizedValue: 0 };
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      normalizedValue: 0,
      error: 'Page value must be a number',
    };
  }

  if (value < 0 || value > 100) {
    return {
      valid: false,
      normalizedValue: Math.max(0, Math.min(100, value)),
      error: 'Page value must be between 0 and 100',
    };
  }

  const normalizedValue = Math.round(value);

  if (!path || typeof path !== 'string' || path.trim() === '') {
    return {
      valid: false,
      normalizedValue: 0,
      error: 'Path must be a non-empty string',
    };
  }

  return { valid: true, normalizedValue };
}

export function validateFunnelStep(
  stepName: string,
  stepNumber: number,
  value: number | undefined,
  previousStep: { stepNumber: number } | null,
  sessionSteps: { stepName: string; stepNumber: number }[]
): { valid: boolean; error?: string; warning?: string } {
  if (!stepName || typeof stepName !== 'string' || stepName.trim() === '') {
    return { valid: false, error: 'Step name must be a non-empty string' };
  }

  if (!Number.isInteger(stepNumber) || stepNumber <= 0) {
    return { valid: false, error: 'Step number must be a positive integer' };
  }

  const valueValidation = validatePageValue(value, stepName);
  if (!valueValidation.valid) {
    return { valid: false, error: valueValidation.error };
  }

  if (previousStep) {
    if (stepNumber <= previousStep.stepNumber) {
      return {
        valid: true,
        warning: `Step number ${stepNumber} is not greater than previous step ${previousStep.stepNumber}`,
      };
    }

    const expectedStep = previousStep.stepNumber + 1;
    if (stepNumber > expectedStep) {
      return {
        valid: true,
        warning: `Step ${expectedStep} was skipped. Current step is ${stepNumber}`,
      };
    }
  }

  const duplicateStep = sessionSteps.find(s => s.stepName === stepName);
  if (duplicateStep && duplicateStep.stepNumber !== stepNumber) {
    return {
      valid: true,
      warning: `Step name "${stepName}" was already used with step number ${duplicateStep.stepNumber}`,
    };
  }

  return { valid: true };
}

export function createPageViewEvent(
  path: string,
  title: string | undefined,
  value: number
): PageViewEvent {
  return {
    type: 'pageview',
    path,
    title,
    value,
    timestamp: Date.now(),
  };
}

export function createFunnelStepEvent(
  step: string,
  stepNumber: number,
  value: number,
  properties?: Record<string, any>
): FunnelStepEvent {
  return {
    type: 'funnel',
    step,
    stepNumber,
    value,
    properties,
    timestamp: Date.now(),
  };
}

export function validateEventName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { valid: false, error: 'Event name must be a non-empty string' };
  }

  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return { 
      valid: false, 
      error: 'Event name must be in snake_case format (lowercase letters, numbers, and underscores only, starting with a letter)' 
    };
  }

  if (name.length > 100) {
    return { valid: false, error: 'Event name must be 100 characters or less' };
  }

  return { valid: true };
}

export function createCustomEvent(
  name: string,
  properties?: Record<string, any>
): CustomEvent {
  const validation = validateEventName(name);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid event name');
  }

  return {
    type: 'event',
    name,
    properties,
    timestamp: Date.now(),
  };
}

export function collectContext(): Context {
  if (typeof window === 'undefined') {
    throw new Error('collectContext can only be called in browser environment');
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    userAgent: navigator.userAgent || '',
    screen: {
      width: window.screen.width || 0,
      height: window.screen.height || 0,
    },
    viewport: {
      width: window.innerWidth || 0,
      height: window.innerHeight || 0,
    },
    language: navigator.language || 'en',
    timezone,
    timestamp: Date.now(),
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer || null,
    sessionId: '',
  };
}

export function enrichEvent(
  event: TrackingEvent,
  attribution: AttributionData,
  context: Context
): EnrichedEvent {
  return {
    event,
    attribution,
    context: {
      ...context,
      sessionId: context.sessionId || '',
    },
  };
}

