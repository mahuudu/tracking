# Tracking Framework

Browser-based tracking framework cho Next.js/React applications với attribution tracking, page value, và funnel analytics.

## Features

- ✅ **Attribution Tracking**: First-touch (90d), last-touch (30d), journey (30d)
- ✅ **Page Value**: Assign business value (0-100) cho từng trang
- ✅ **Funnel Tracking**: Track conversion funnel steps
- ✅ **Custom Events**: Track any user interaction
- ✅ **UTM Tracking**: Auto-capture UTM parameters + custom UTM support
- ✅ **TypeScript**: Full type safety
- ✅ **Debug Mode**: Built-in debugging tools

## Quick Start

### 1. Setup TrackingProvider

Add vào layout:

```typescript
// src/components/layouts/locale/index.tsx
'use client'
import { TrackingProvider } from '@mahuudu/tracking/react'

export default function LocaleClientLayout({ children }) {
  return (
    <TrackingProvider
      config={{
        apiEndpoint: '/api/track',
        debug: process.env.NODE_ENV === 'development',
        pageValues: {
          '/events/trial-c67': 50,
        },
      }}
      autoPageView={true}
    >
      {children}
    </TrackingProvider>
  )
}
```

### 2. Track Events

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

## API Reference

### `initTracking(config: TrackingConfig)`

**Config:**
- `apiEndpoint` (optional): Backend API endpoint. Nếu không có, events chỉ lưu vào debug storage
- `autoPageView` (optional): Auto track page views (default: false)
- `pageValues` (optional): Map path → value (0-100)
- `debug` (optional): Enable debug logs (default: false)
- `storage` (optional): 'cookie' | 'localStorage' (default: 'localStorage')
- `disableApi` (optional): Track local only, không gửi API (default: false)
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
  - `customParams` (optional): Capture custom params không liên quan UTM
    ```typescript
    customParams: {
      enabled: true,                    // Bật capture custom params
      keys: ['userId', 'plan', 'ref'],  // Whitelist keys (optional, nếu không có thì capture tất cả)
      parseJSON: true,                  // Tự động parse JSON strings (default: true)
      namespace: 'custom'               // Lưu vào object riêng (default: 'custom')
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

Mọi event được enrich với:

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

// Get as object (dùng để gọi API, xử lý, etc.)
const data = getTrackingData()
// Returns: {
//   timestamp: '2025-12-29T...',
//   sessionId: '...',
//   attribution: { firstTouch, lastTouch, journey },
//   debugEvents: [...]
// }

// Ví dụ: Gửi lên backend
fetch('/api/sync-tracking', {
  method: 'POST',
  body: JSON.stringify(data),
})
```

## Custom UTM Parameters

Hỗ trợ custom UTM format (không chỉ `utm_source`, `utm_medium`, etc.)

### Ví dụ 1: Facebook Ads format

```typescript
// URL: ?fb_source=facebook&fb_medium=cpc&campaign_id=summer2024
<TrackingProvider
  config={{
    apiEndpoint: '/api/track',
    customUTM: {
      enabled: true,
      keyMapping: {
        source: 'fb_source',      // 'fb_source' → 'source'
        medium: 'fb_medium',      // 'fb_medium' → 'medium'
        campaign: 'campaign_id',   // 'campaign_id' → 'campaign'
      }
    }
  }}
/>
```

### Ví dụ 2: Custom prefix + additional params

```typescript
// URL: ?source=google&medium=cpc&campaign=test&custom_param=value
<TrackingProvider
  config={{
    apiEndpoint: '/api/track',
    customUTM: {
      enabled: true,
      keyMapping: {
        source: 'source',         // 'source' → 'source' (không cần prefix)
        medium: 'medium',
        campaign: 'campaign',
      },
      prefix: 'custom_',          // Capture thêm params có prefix 'custom_'
      allowedKeys: ['custom_param', 'custom_id']  // Whitelist
    }
  }}
/>
```

### Ví dụ 3: Custom params (không liên quan UTM)

```typescript
// URL: ?utm_source=google&userId=123&plan=premium&metadata={"ref":"friend"}
<TrackingProvider
  config={{
    apiEndpoint: '/api/track',
    customUTM: {
      enabled: true,
      customParams: {
        enabled: true,
        keys: ['userId', 'plan', 'metadata'],  // Chỉ capture các keys này
        parseJSON: true,                        // Parse JSON strings
        namespace: 'custom'                     // Lưu vào attribution.custom
      }
    }
  }}
/>

// Kết quả trong attribution:
{
  source: 'google',
  medium: 'none',
  campaign: null,
  custom: {
    userId: '123',
    plan: 'premium',
    metadata: { ref: 'friend' }  // Đã parse JSON
  }
}
```

### Ví dụ 4: Custom params không namespace

```typescript
// URL: ?utm_source=google&ref=friend&campaign_id=summer
customParams: {
  enabled: true,
  keys: ['ref', 'campaign_id'],
  namespace: undefined  // Lưu trực tiếp vào attribution root
}

// Kết quả:
{
  source: 'google',
  ref: 'friend',        // Lưu trực tiếp
  campaign_id: 'summer' // Lưu trực tiếp
}
```

### Fallback behavior

- Nếu có cả standard UTM (`utm_source`) và custom key (`fb_source`), ưu tiên standard UTM
- Nếu không có mapping, vẫn dùng standard UTM format
- Custom params (không map) được lưu vào attribution object
- Custom params có thể lưu vào namespace riêng hoặc root level

## Testing

Xem [TESTING_GUIDE.md](./TESTING_GUIDE.md) để test đầy đủ tất cả các cases.

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

1. Check `initTracking()` được gọi chưa
2. Check `apiEndpoint` đúng chưa
3. Check Network tab: Có POST requests?
4. Enable `debug: true` để xem logs
5. Check custom UTM config: `keyMapping` đúng chưa?
6. Check `ready` state: `const { ready } = useTracking()`
7. Check sampling: `samplingRate` = 1.0?
8. Check health: `getTrackingHealth()`

## Architecture

```
src/tracking/
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