# @raeduslabs/core -- Shared Mobile App Core

## What This Is
Shared core modules for all Raedus Labs Expo mobile apps. Single source of truth. Every app imports this package instead of having its own copy of auth, subscriptions, notifications, UI, etc.

## Architecture
```
src/
  ai/           → Gemini/LLM client: complete(), parseJsonResponse()
  auth/         → Supabase auth wrapper: useAuth(), AuthProvider
  constants/    → Design tokens: createAppTheme(), Colors, Typography, Spacing
  notifications/→ Push notification service (parameterized: app name, messages, channel)
  storage/      → Supabase client singleton
  subscription/ → RevenueCat hook: useSubscription()
  ui/           → Shared components: GlassCard, Button, Pill, ProgressBar, etc.
  index.ts      → Barrel export
```

## How Apps Use This

### Install
```bash
npm install github:astraedus/app-core
```

### Import
```typescript
import { useAuth, AuthProvider } from '@raeduslabs/core/auth';
import { GlassCard, Button, Pill } from '@raeduslabs/core/ui';
import { complete, parseJsonResponse } from '@raeduslabs/core/ai';
import { Colors, Typography, Spacing } from '@raeduslabs/core/constants';
import { configureNotifications } from '@raeduslabs/core/notifications';
import { useSubscription } from '@raeduslabs/core/subscription';
```

### App-Specific Config
Each app provides its own brand + notification config:

```typescript
// In app's _layout.tsx or config file:
import { configureNotifications } from '@raeduslabs/core/notifications';

configureNotifications({
  storagePrefix: '@pet-health',
  channelId: 'daily-reminders',
  channelName: 'Daily Reminders',
  appName: 'Pet Health',
  messages: ['Time to log your pet's health!', ...],
  accentColor: '#48BB78',
});
```

Colors are driven by `createAppTheme()`:
```typescript
import { createAppTheme } from '@raeduslabs/core/constants';

const PET_BRAND = {
  primary: '#48BB78',
  primarySoft: '#68D391',
  secondary: '#F6E05E',
  background: '#0A1A0E',
  backgroundMid: '#0D2510',
  backgroundLight: '#0A2E0E',
};

export const Colors = { ...createAppTheme(PET_BRAND), moods: { ... } };
```

## Rules for This Package
- **ZERO app-specific code.** No references to dreams, pets, astrology, etc.
- **All config is parameterized.** App name, colors, messages come from the consumer.
- **Peer dependencies only.** React, React Native, Supabase, RevenueCat, Expo modules are peers.
- **TypeScript source shipped directly.** Metro bundles it -- no build step.
- **Tests live in the consuming apps**, not here (they test integration, not isolation).

## Update Flow
1. Fix/improve code in this repo
2. Push to GitHub (`astraedus/app-core`)
3. In each app: `npm update @raeduslabs/core`
4. Verify tsc + tests in each app

## Current Consumers
- `dream-journal` (Recall: AI Dream Journal)
- (future: pet-health, astrology, adhd)
