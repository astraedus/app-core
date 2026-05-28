# @raeduslabs/core -- Shared Mobile Infrastructure

## What This Is
Shared **infrastructure** modules for all Raedus Labs Expo mobile apps. Single source of truth for auth, payments, notifications, AI, and database. Each app builds its own visual identity -- this package handles plumbing, not pixels.

## Architecture
```
src/
  ai/           → LLM client: complete(), parseJsonResponse(), getClient()
  auth/         → Supabase auth: useAuth(), AuthProvider
  notifications/→ Push notifications: configureNotifications(), schedule/cancel
  storage/      → Supabase client singleton
  subscription/ → RevenueCat: useSubscription()
  index.ts      → Barrel export
```

**NOT in this package** (each app builds its own):
- Colors, themes, design tokens
- UI components (cards, buttons, etc.)
- Typography, spacing
- Domain logic, prompts, models

## Install
```bash
npm install github:astraedus/app-core
```

## Usage

```typescript
// Auth
import { useAuth, AuthProvider } from '@raeduslabs/core/auth';

// AI (Gemini/LLM)
import { complete, parseJsonResponse } from '@raeduslabs/core/ai';

// Subscriptions (RevenueCat)
import { useSubscription } from '@raeduslabs/core/subscription';

// Database
import { supabase } from '@raeduslabs/core/storage';

// Push Notifications (must configure first)
import { configureNotifications, setMorningReminderEnabled } from '@raeduslabs/core/notifications';
```

## Required App-Specific Config

### Notifications
Call `configureNotifications()` once at app startup before using any notification functions:

```typescript
import { configureNotifications } from '@raeduslabs/core/notifications';
import type { NotificationConfig } from '@raeduslabs/core/notifications';

const MY_CONFIG: NotificationConfig = {
  storagePrefix: '@my-app',          // AsyncStorage key prefix
  channelId: 'daily-reminders',      // Android notification channel ID
  channelName: 'Daily Reminders',    // Human-readable channel name
  appName: 'My App',                 // Notification title
  messages: [                        // Rotated notification body text
    'Time to check in!',
    'Don\'t forget to log today.',
  ],
  accentColor: '#48BB78',            // Android channel light color
};

// In _layout.tsx, before any component renders:
configureNotifications(MY_CONFIG);
```

### Supabase
Set these env vars in your `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Gemini AI
```
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

### RevenueCat
Set the platform key for the current build target:
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your-ios-key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your-android-key
```

`useSubscription()` configures RevenueCat lazily on first use. If the app starts anonymously and later gets a Supabase user id, call `initialize(user.id)` again; the hook will `logIn()` instead of dropping the identity change.

### Auth Profile Creation
`useAuth()` is app-agnostic by default and does not write a profile row. Apps that need profile bootstrap data should pass a profile config:

```typescript
<AuthProvider
  authOptions={{
    profile: {
      buildProfile: ({ email }) => ({ display_name: email.split('@')[0] }),
    },
  }}
>
  {children}
</AuthProvider>
```

## Dev Setup
```bash
npm install           # install dev dependencies
npm test              # run Jest test suite (79 tests)
npm run typecheck     # run tsc --noEmit
npm run test:exports  # verify package.json entry points point at real files
npm run test:all      # full local release gate
```

## Rules
- **ZERO app-specific code.** No references to dreams, pets, astrology, or any domain.
- **All config is parameterized.** App name, messages, keys come from the consumer.
- **Peer dependencies only.** React, React Native, Gemini, Supabase, RevenueCat, Expo modules.
- **TypeScript source shipped directly.** Metro bundles it -- no compile step needed.
- **Tests**: Unit tests in `src/<module>/__tests__/`. Run `npm run test:all` before push.

## Update Flow
1. Fix/improve code here
2. Push to GitHub (`astraedus/app-core`)
3. In each consuming app: `npm update @raeduslabs/core`
4. Run tsc + tests in each app to verify

## Module API Reference

### ai/
| Export | Type | Description |
|--------|------|-------------|
| `complete(options)` | async function | Send prompt to Gemini, get structured response |
| `parseJsonResponse<T>(content)` | function | Strip markdown fences, parse JSON from LLM output |
| `getClient()` | function | Get the GoogleGenerativeAI singleton |

### auth/
| Export | Type | Description |
|--------|------|-------------|
| `useAuth(options?)` | hook | Returns `{ user, session, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword }` |
| `AuthProvider` | component | Wrap app root to provide auth context |
| `useAuthContext()` | hook | Access auth context directly |
| `AuthProfileConfig` | type | Optional app-specific profile bootstrap config |

### notifications/
| Export | Type | Description |
|--------|------|-------------|
| `configureNotifications(config)` | function | **Must call first.** Sets app-specific notification config |
| `configureNotificationHandler()` | function | Register foreground notification behavior |
| `setupAndroidChannel()` | async function | Create Android notification channel |
| `requestPermissions()` | async function | Request notification permissions |
| `scheduleMorningReminder(hour, min)` | async function | Schedule daily notification |
| `cancelMorningReminder()` | async function | Cancel scheduled notification |
| `setMorningReminderEnabled(enabled, time?)` | async function | High-level toggle (permissions + schedule + persist) |
| `updateReminderTime(time)` | async function | Change reminder time |
| `loadReminderPreferences()` | async function | Read saved preferences |

### storage/
| Export | Type | Description |
|--------|------|-------------|
| `supabase` | SupabaseClient | Configured Supabase client singleton |

### subscription/
| Export | Type | Description |
|--------|------|-------------|
| `useSubscription()` | hook | Returns `{ isPro, loading, customerInfo, initialize, purchase, restore, getOfferings }` |

## Current Consumers
- **dream-journal** -- Recall: AI Dream Journal (Play Store review pending)
- (planned: pet-health, astrology, adhd)
