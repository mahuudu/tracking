# @mahuudu/tracking

[![npm version](https://img.shields.io/npm/v/@mahuudu/tracking.svg)](https://www.npmjs.com/package/@mahuudu/tracking)
[![npm downloads](https://img.shields.io/npm/dm/@mahuudu/tracking.svg)](https://www.npmjs.com/package/@mahuudu/tracking)
[![license](https://img.shields.io/npm/l/@mahuudu/tracking.svg)](https://github.com/mahuudu/tracking/blob/main/LICENSE)

> A lightweight, privacy-focused browser tracking framework for Next.js/React and vanilla JavaScript applications. Track user journeys, conversions, and marketing attribution with full TypeScript support.

## What is this?

`@mahuudu/tracking` is a comprehensive browser-based analytics tracking library that helps you:

- **Track user attribution** - Understand how users discover your product (first-touch, last-touch, and complete journey tracking)
- **Measure page value** - Assign business values to different pages to prioritize optimization efforts
- **Analyze conversion funnels** - Track multi-step conversion processes with detailed funnel analytics
- **Capture marketing data** - Automatically capture UTM parameters and custom marketing tags
- **Monitor user behavior** - Track custom events and user interactions throughout your application

Unlike heavy analytics platforms, this library is lightweight, gives you full control over your data, and works seamlessly with your existing backend infrastructure.

## Why use this?

- ✅ **Lightweight & Fast** - No external dependencies (React is optional), minimal bundle size
- ✅ **Privacy-First** - Your data stays with you, no third-party tracking services
- ✅ **Framework Agnostic** - Works with React/Next.js or vanilla JavaScript
- ✅ **TypeScript Native** - Full type safety and excellent IDE support
- ✅ **Flexible Attribution** - Supports standard UTM, custom parameters, and complex attribution models
- ✅ **Developer-Friendly** - Built-in debug mode, local storage for testing, and comprehensive documentation
- ✅ **Production-Ready** - Battle-tested architecture with proper error handling and session management

Perfect for teams who want full control over their analytics data without relying on external services like Google Analytics or Mixpanel.

## Installation

```bash
npm install @mahuudu/tracking
# or
yarn add @mahuudu/tracking
# or
pnpm add @mahuudu/tracking
```

## Features

- ✅ **Attribution Tracking**: First-touch (90d), last-touch (30d), journey (30d)
- ✅ **Page Value**: Assign business value (0-100) for each page
- ✅ **Funnel Tracking**: Track conversion funnel steps
- ✅ **Custom Events**: Track any user interaction
- ✅ **UTM Tracking**: Auto-capture UTM parameters + custom UTM support
- ✅ **TypeScript**: Full type safety
- ✅ **Debug Mode**: Built-in debugging tools

## Quick Start

### Option 1: React/Next.js (Recommended)

#### 1. Setup TrackingProvider

```typescript
'use client'
import { TrackingProvider } from '@mahuudu/tracking/react'

export default function Layout({ children }) {
  return (
    <TrackingProvider
      config={{
        apiEndpoint: '/api/track',
        debug: process.env.NODE_ENV === 'development',
        pageValues: { '/': 10, '/products': 30 },
      }}
      autoPageView={true}
    >
      {children}
    </TrackingProvider>
  )
}
```

#### 2. Track Events

```typescript
'use client'
import { useTracking } from '@mahuudu/tracking/react'

function MyComponent() {
  const { track, funnel } = useTracking()

  const handleClick = () => {
    track('button_clicked', { buttonId: 'cta-primary' })
  }

  const handlePurchase = () => {
    funnel('purchase_completed', {
      stepNumber: 5,
      value: 100,
      properties: { orderId: '12345' },
    })
  }

  return <button onClick={handleClick}>Click me</button>
}
```

### Option 2: Vanilla HTML/JS (No React)

```javascript
import { initTracking, track, page, funnel } from '@mahuudu/tracking'

initTracking({
  apiEndpoint: '/api/track',
  debug: true,
  pageValues: { '/': 10, '/products': 30 },
})

// Track page view
page()

// Track events
document.getElementById('cta').addEventListener('click', () => {
  track('button_clicked', { buttonId: 'cta-primary' })
})
```

**With data attributes:**
```html
<button data-track="signup_clicked">Sign Up</button>

<script>
document.querySelectorAll('[data-track]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    track(e.target.dataset.track)
  })
})
</script>
```

## API Reference

### `initTracking(config: TrackingConfig)`

**Config:**
- `apiEndpoint` (optional): Backend API endpoint. If not provided, events are only stored in debug storage
- `autoPageView` (optional): Auto track page views (default: false)
- `pageValues` (optional): Map path → value (0-100)
- `debug` (optional): Enable debug logs (default: false)
- `storage` (optional): 'cookie' | 'localStorage' (default: 'localStorage')
- `disableApi` (optional): Track locally only, don't send to API (default: false)
- `attributionTTL` (optional): TTL config
  - `firstTouchDays` (default: 90)
  - `lastTouchDays` (default: 30)
  - `journeyDays` (default: 30)
- `customUTM` (optional): Custom UTM config
  - `enabled` (default: false): Enable custom UTM support
  - `prefix` (default: 'utm_'): Custom prefix for additional UTM params
  - `allowedKeys` (optional): Whitelist keys for additional params
  - `keyMapping` (optional): Map custom keys to standard UTM fields
    ```typescript
    keyMapping: {
      source: 'fb_source',      // Map 'fb_source' → 'source'
      medium: 'fb_medium',      // Map 'fb_medium' → 'medium'
      campaign: 'campaign_id',   // Map 'campaign_id' → 'campaign'
      term: 'keyword',
      content: 'ad_id'
    }
    ```
  - `customParams` (optional): Capture custom params unrelated to UTM
    ```typescript
    customParams: {
      enabled: true,                    // Enable custom params capture
      keys: ['userId', 'plan', 'ref'],  // Whitelist keys (optional, if not provided, capture all)
      parseJSON: true,                  // Automatically parse JSON strings (default: true)
      namespace: 'custom'               // Store in separate object (default: 'custom')
    }
    ```

### `page(options?)`

Track page view.

**Options:**
- `path` (optional): Path (default: current pathname)
- `title` (optional): Title (default: document.title)
- `value` (optional): Page value (override config)

### `funnel(step, options)`

Track funnel step.

**Options:**
- `stepNumber` (required): Step number
- `value` (optional): Step value (default: 0)
- `properties` (optional): Additional properties

### `track(name, properties?)`

Track custom event.

**Parameters:**
- `name`: Event name (snake_case recommended)
- `properties`: Optional event properties

### `identify(userId, traits?)`

Identify user.

**Parameters:**
- `userId`: User ID
- `traits`: Optional user traits

## Event Schema

All events are enriched with:

```typescript
{
  event: {
    type: 'pageview' | 'funnel' | 'event',
    timestamp: number,
    // ... event-specific fields
  },
  attribution: {
    firstTouch: Attribution | null,  // 90 days TTL
    lastTouch: Attribution | null,   // 30 days TTL
    journey: JourneyEntry[]          // 30 days TTL per entry
  },
  context: {
    userAgent: string,
    screen: { width: number, height: number },
    viewport: { width: number, height: number },
    language: string,
    timezone: string,
    timestamp: number,
    url: string,
    path: string,
    referrer: string | null,
    sessionId: string
  }
}
```

## Debug

Enable debug mode:

```typescript
initTracking({
  apiEndpoint: '/api/track',
  debug: true,
})
```

### Get Tracking Data

**Get all debug events:**
```typescript
import { getAllDebugEvents, getDebugEventsSummary } from '@mahuudu/tracking'
getAllDebugEvents()        // Array of all events
getDebugEventsSummary()   // { total, byType, latest }
```

**Get attribution data:**
```typescript
import {
  getFirstTouchData,
  getLastTouchData,
  getJourneyData,
  getAllAttributionData,
  getSessionId,
} from '@mahuudu/tracking'

getFirstTouchData()        // First-touch attribution
getLastTouchData()         // Last-touch attribution
getJourneyData()           // Journey array
getAllAttributionData()    // { firstTouch, lastTouch, journey }
getSessionId()             // Current session ID
```

**Get all tracking data (as object):**
```typescript
import { getTrackingData } from '@mahuudu/tracking'

// Get as object (use to call API, process, etc.)
const data = getTrackingData()
// Returns: {
//   timestamp: '2025-12-29T...',
//   sessionId: '...',
//   attribution: { firstTouch, lastTouch, journey },
//   debugEvents: [...]
// }

// Example: Send to backend
fetch('/api/sync-tracking', {
  method: 'POST',
  body: JSON.stringify(data),
})
```

## Custom UTM Parameters

Support for custom UTM formats beyond standard `utm_*` parameters.

**Facebook Ads format:**
```typescript
// URL: ?fb_source=facebook&fb_medium=cpc&campaign_id=summer2024
customUTM: {
  enabled: true,
  keyMapping: {
    source: 'fb_source',
    medium: 'fb_medium',
    campaign: 'campaign_id',
  }
}
```

**Custom params with namespace:**
```typescript
// URL: ?utm_source=google&userId=123&plan=premium
customUTM: {
  enabled: true,
  customParams: {
    enabled: true,
    keys: ['userId', 'plan'],
    parseJSON: true,
    namespace: 'custom'  // → attribution.custom.userId
  }
}
```

**Direct root storage:**
```typescript
customParams: {
  enabled: true,
  keys: ['ref', 'campaign_id'],
  namespace: undefined  // → attribution.ref (root level)
}
```

**Notes:**
- Standard UTM takes priority over custom mappings
- JSON strings are automatically parsed when `parseJSON: true`
- See [full documentation](https://github.com/mahuudu/tracking#custom-utm-parameters) for advanced use cases

**Quick test:**
```typescript
// Enable debug mode
initTracking({ apiEndpoint: '/api/track', debug: true })

// Check data
import { getTrackingData, getTrackingHealth } from '@mahuudu/tracking'
getTrackingHealth() // Check system health
getTrackingData()   // Get all tracking data
```

## Troubleshooting

1. Check if `initTracking()` has been called
2. Check if `apiEndpoint` is correct
3. Check Network tab: Are there POST requests?
4. Enable `debug: true` to see logs
5. Check custom UTM config: Is `keyMapping` correct?
6. Check `ready` state: `const { ready } = useTracking()`
7. Check sampling: Is `samplingRate` = 1.0?
8. Check health: `getTrackingHealth()`

## Architecture

```
src/
├── core/              # Pure logic, framework-agnostic
│   ├── types.ts       # TypeScript interfaces
│   ├── attribution.ts # Attribution logic
│   └── event.ts       # Event creation & validation
├── browser/           # Browser adapter (main)
│   ├── adapter.ts     # Main tracking adapter
│   ├── storage.ts     # localStorage operations
│   ├── cookie.ts      # Cookie operations
│   ├── url.ts         # URL parsing
│   ├── send.ts        # API calls
│   └── debug.ts       # Debug helpers
├── react/             # React helpers (optional)
│   ├── useTracking.ts
│   ├── usePageView.ts
│   └── TrackingProvider.tsx
└── index.ts           # Public API exports
```

See [source code](https://github.com/mahuudu/tracking/tree/main/tracking/src) for more details.

## License

MIT

---

**Need help?** [Open an issue](https://github.com/mahuudu/tracking/issues) or check the [documentation](https://github.com/mahuudu/tracking#readme).

