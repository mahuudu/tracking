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
  const { track, funnel, page, identify, setContext, ready, version } = useTracking()

  // Wait for tracking to be ready
  if (!ready) {
    return <div>Loading...</div>
  }

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

#### 3. Auto Track Page Views (Alternative)

If you don't use `autoPageView` in `TrackingProvider`, you can use the `usePageView` hook:

```typescript
'use client'
import { usePageView } from '@mahuudu/tracking/react'

function MyPage() {
  usePageView() // Automatically tracks page views on route changes
  
  return <div>My Page</div>
}
```

**Note:** `usePageView` automatically detects Next.js App Router, React Router, or falls back to `window.location`.

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

Initialize tracking with configuration.

**Config Options:**

- `apiEndpoint` (optional): Backend API endpoint. If not provided, events are only stored in debug storage
- `autoPageView` (optional): Auto track page views (default: `false`)
- `pageValues` (optional): Map path → value (0-100). Example: `{ '/': 10, '/products': 30 }`
- `pageOverrides` (optional): Override page tracking behavior per path
  ```typescript
  pageOverrides: {
    '/admin': { disable: true },                    // Disable tracking for admin pages
    '/checkout': { value: 100, disableAutoPageView: true }  // Override value, disable auto tracking
  }
  ```
- `debug` (optional): Enable debug logs (default: `false`)
- `storage` (optional): `'cookie'` | `'localStorage'` (default: `'localStorage'`)
- `disableApi` (optional): Track locally only, don't send to API (default: `false`)
- `samplingRate` (optional): Sample rate for events (0.0 to 1.0, default: `1.0`). Use `0.5` to track 50% of events
- `maxJourneySize` (optional): Maximum number of journey entries to store (default: `100`)
- `errorReporting` (optional): Custom error handler
  ```typescript
  errorReporting: {
    captureException: (error: Error, context: Record<string, any>) => {
      // Send to your error tracking service (e.g., Sentry)
    }
  }
  ```
- `attributionTTL` (optional): TTL configuration for attribution data
  - `firstTouchDays` (default: `90`): Days to keep first-touch attribution
  - `lastTouchDays` (default: `30`): Days to keep last-touch attribution
  - `journeyDays` (default: `30`): Days to keep each journey entry
- `customUTM` (optional): Custom UTM parameter configuration
  - `enabled` (default: `false`): Enable custom UTM support
  - `prefix` (default: `'utm_'`): Custom prefix for additional UTM params
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

Identify user and attach user data to all subsequent events.

**Parameters:**
- `userId`: User ID (string)
- `traits`: Optional user traits (object)

**Example:**
```typescript
identify('user123', {
  email: 'user@example.com',
  plan: 'premium',
  signupDate: '2024-01-01'
})
```

### `setContext(context)`

Set global context that will be included in all events.

**Parameters:**
- `context`: Object with context data (e.g., `{ cartId: 'abc123', locale: 'en' }`)

**Example:**
```typescript
setContext({ cartId: 'cart-123', userId: 'user-456' })
```

### `isTrackingInitialized()`

Check if tracking has been initialized.

**Returns:** `boolean`

**Example:**
```typescript
if (isTrackingInitialized()) {
  track('event_name')
}
```

### `getTrackingVersion()`

Get the current tracking library version.

**Returns:** `string` (e.g., `'1.0.0'`)

## React Hooks

### `useTracking()`

React hook for tracking functionality. Returns tracking functions and state.

**Returns:**
```typescript
{
  ready: boolean,              // Whether tracking is initialized
  version: string,             // Tracking library version
  track: (name: string, properties?: Record<string, any>) => void,
  page: (options?: { path?: string; title?: string; value?: number }) => void,
  funnel: (step: string, options?: { stepNumber: number; value?: number; properties?: Record<string, any> }) => void,
  identify: (userId: string, traits?: Record<string, any>) => void,
  setContext: (context: Record<string, any>) => void,
}
```

**Example:**
```typescript
import { useTracking } from '@mahuudu/tracking/react'

function MyComponent() {
  const { track, ready, version } = useTracking()

  useEffect(() => {
    if (ready) {
      console.log(`Tracking v${version} is ready!`)
    }
  }, [ready, version])

  return <button onClick={() => track('button_clicked')}>Click me</button>
}
```

### `usePageView()`

React hook to automatically track page views on route changes. Works with Next.js App Router, React Router, or vanilla routing.

**Usage:**
```typescript
import { usePageView } from '@mahuudu/tracking/react'

function MyPage() {
  usePageView() // Automatically tracks page views when pathname changes
  
  return <div>Content</div>
}
```

**Note:** This hook automatically detects your routing library and tracks page views when the pathname changes. Use this if you don't use `autoPageView` in `TrackingProvider`.

## Examples & Use Cases

### E-commerce Conversion Funnel

```typescript
// Track a purchase funnel
funnel('view_product', { stepNumber: 1, value: 10 })
funnel('add_to_cart', { stepNumber: 2, value: 30 })
funnel('checkout_started', { stepNumber: 3, value: 50 })
funnel('payment_entered', { stepNumber: 4, value: 70 })
funnel('purchase_completed', { 
  stepNumber: 5, 
  value: 100,
  properties: { orderId: '12345', amount: 99.99 }
})
```

### User Identification

```typescript
// Identify user after login
identify('user123', {
  email: 'user@example.com',
  plan: 'premium',
  signupDate: '2024-01-01'
})

// Set context for shopping cart
setContext({ cartId: 'cart-abc123', cartValue: 149.99 })
```

### Page Value Tracking

```typescript
// Assign values to important pages
initTracking({
  pageValues: {
    '/': 5,                    // Homepage
    '/products': 20,           // Product listing
    '/product/[id]': 40,       // Product detail
    '/checkout': 80,           // Checkout
    '/thank-you': 100         // Conversion page
  }
})
```

### Custom Event Tracking

```typescript
// Track button clicks
track('cta_clicked', { 
  buttonId: 'signup-primary',
  location: 'header',
  text: 'Sign Up Now'
})

// Track form submissions
track('form_submitted', {
  formType: 'newsletter',
  success: true
})

// Track video interactions
track('video_played', {
  videoId: 'intro-video',
  duration: 120
})
```

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
import { getAllDebugEvents, getDebugEventsSummary, clearAllDebugEvents } from '@mahuudu/tracking'

getAllDebugEvents()        // Array of all events
getDebugEventsSummary()   // { total, byType, latest }
clearAllDebugEvents()     // Clear all debug events
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

getFirstTouchData()        // First-touch attribution (Attribution | null)
getLastTouchData()         // Last-touch attribution (Attribution | null)
getJourneyData()           // Journey array (JourneyEntry[])
getAllAttributionData()    // { firstTouch, lastTouch, journey }
getSessionId()             // Current session ID (string | null)
```

**Get all tracking data:**
```typescript
import { getTrackingData, exportTrackingDataAsJSON, downloadTrackingData } from '@mahuudu/tracking'

// Get as object
const data = getTrackingData()
// Returns: {
//   timestamp: '2025-12-29T...',
//   sessionId: '...',
//   attribution: { firstTouch, lastTouch, journey },
//   debugEvents: [...]
// }

// Export as JSON string
const json = exportTrackingDataAsJSON()

// Download as file
downloadTrackingData('my-tracking-data.json')
```

**Get system health:**
```typescript
import { getTrackingHealth } from '@mahuudu/tracking'

const health = getTrackingHealth()
// Returns: {
//   initialized: boolean,
//   queueSize: number,
//   lastEventTime: number | null,
//   storage: { available: boolean, usage: number }
// }
```

### Clear Tracking Data

**Clear attribution data:**
```typescript
import {
  clearFirstTouch,
  clearLastTouch,
  clearJourney,
  clearAllAttribution,
  clearSession,
  clearAllTrackingData,
  clearAfterConversion,
} from '@mahuudu/tracking'

clearFirstTouch()          // Clear first-touch attribution
clearLastTouch()           // Clear last-touch attribution
clearJourney()             // Clear journey array
clearAllAttribution()      // Clear all attribution data
clearSession()             // Clear session ID
clearAllTrackingData()     // Clear everything (attribution + debug events)
clearAfterConversion()     // Clear attribution after conversion (keeps session)
```

**Manually set attribution (advanced):**
```typescript
import { setFirstTouch, setLastTouch, setJourney } from '@mahuudu/tracking'

setFirstTouch({
  source: 'google',
  medium: 'cpc',
  campaign: 'summer2024',
  timestamp: Date.now(),
  referrer: 'https://google.com'
})

setLastTouch({ /* ... */ })
setJourney([{ /* ... */ }])
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

### Common Issues

1. **Events not being tracked**
   - Check if `initTracking()` has been called
   - Check if `apiEndpoint` is correct
   - Check Network tab: Are there POST requests?
   - Enable `debug: true` to see logs
   - Check `ready` state: `const { ready } = useTracking()`

2. **Attribution not captured**
   - Check custom UTM config: Is `keyMapping` correct?
   - Verify URL parameters are present
   - Check if attribution TTL has expired

3. **Events not sent to API**
   - Check `disableApi` is not `true`
   - Check `samplingRate` is not `0` (should be `1.0` for 100%)
   - Check Network tab for errors
   - Verify `apiEndpoint` URL is correct

4. **Debug and Health Checks**
   ```typescript
   import { getTrackingHealth, isTrackingInitialized } from '@mahuudu/tracking'
   
   // Check initialization
   console.log('Initialized:', isTrackingInitialized())
   
   // Check health
   const health = getTrackingHealth()
   console.log('Health:', health)
   // {
   //   initialized: true,
   //   queueSize: 0,
   //   lastEventTime: 1234567890,
   //   storage: { available: true, usage: 1024 }
   // }
   ```

5. **React-specific Issues**
   - Ensure `TrackingProvider` wraps your app
   - Check if `ready` is `true` before tracking
   - Verify `autoPageView` or `usePageView()` is set up correctly

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

