# User Notifications System — Integration Plan

## Overview

When a mission gets blocked (or other actionable events happen), the user gets notified — in-app bell + sound, and optionally via Telegram/Slack based on their `preferred_channel`.

**Current state:** Mission blocked → log written to `missions_logs` → nothing reaches the user.
**Target state:** Mission blocked → `user_notifications` row created → realtime fires → bell updates + sound plays → if external channel preferred, push to Telegram/Slack.

---

## Architecture

```
Mission Worker (blocked event)
    │
    ├── INSERT into user_notifications
    │
    ├── POST /api/internal/missions/notification-push  (if preferred_channel != studio)
    │       │
    │       ├── Telegram push (existing pushTelegramAwarenessPoint)
    │       └── Slack push (existing pushSlackAwarenessPoint)
    │
    └── Supabase Realtime picks up INSERT
            │
            └── NotificationBell component
                    ├── Updates unread count
                    └── Plays notification sound
```

---

## Phase 1: Database Migration

**File:** `supabase/migrations/20260317000000_create_user_notifications.sql`

```sql
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'mission_blocked',
    'mission_completed',
    'mission_failed',
    'deliverable_ready',
    'subtask_blocked'
  )),
  title TEXT NOT NULL,
  body TEXT,
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  channel_sent JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_notifications_user_unread
  ON user_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX idx_user_notifications_user_recent
  ON user_notifications (user_id, created_at DESC);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for the notification bell
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
```

**Apply via Supabase MCP** `apply_migration`.

---

## Phase 2: Backend API (NestJS)

### 2a. DTO

**File:** `apps/api/src/modules/missions/dto/index.ts` — add to existing DTOs

```ts
// Notification types
export const NotificationTypeSchema = z.enum([
  'mission_blocked',
  'mission_completed',
  'mission_failed',
  'deliverable_ready',
  'subtask_blocked',
])
```

### 2b. Notifications Service

**File:** `apps/api/src/modules/missions/services/notifications.service.ts` — NEW

Methods:

- `getNotifications(userId, { limit, unreadOnly })` — fetch from `user_notifications`
- `markAllRead(userId)` — update `read_at = now()` where user_id and read_at IS NULL
- `markRead(userId, notificationId)` — update single
- `getUnreadCount(userId)` — count where read_at IS NULL

### 2c. Controller Routes

**File:** `apps/api/src/modules/missions/controllers/missions.controller.ts` — add to existing

| Method | Route                                      | Purpose                                            |
| ------ | ------------------------------------------ | -------------------------------------------------- |
| GET    | `/api/missions/notifications`              | List notifications (query: `limit`, `unread_only`) |
| GET    | `/api/missions/notifications/unread-count` | Quick badge count                                  |
| POST   | `/api/missions/notifications/read-all`     | Mark all read                                      |
| PATCH  | `/api/missions/notifications/:id/read`     | Mark single read                                   |

### 2d. Internal Notification Push Endpoint

**File:** `apps/api/src/modules/missions/controllers/internal-missions.controller.ts` — add

```ts
@Post('notification-push')
@HttpCode(HttpStatus.OK)
async notificationPush(@Body() body: {
  user_id: string
  agent_key: string
  content: string
  notification_type: string
  mission_title?: string
}) {
  // Reuse existing pushTelegramAwarenessPoint / pushSlackAwarenessPoint
  return this.missionsService.pushNotificationToExternalChannels(body)
}
```

### 2e. Service method: pushNotificationToExternalChannels

**File:** `apps/api/src/modules/missions/services/missions.service.ts`

Format the message nicely for external channels:

```
🚨 Mission Blocked: "{mission_title}"
{content}

Open in Vibey → {action_url}
```

Then call existing `pushTelegramAwarenessPoint` + `pushSlackAwarenessPoint`.

---

## Phase 3: Mission Worker — Emit Notifications on Blocked

### 3a. Create a helper service

**File:** `apps/mission-worker/src/modules/missions/services/user-notification-emitter.service.ts` — NEW

```ts
@Injectable()
export class UserNotificationEmitterService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async emitBlocked(mission: Record<string, any>, reason: string, agentKey: string) {
    const supabase = this.databaseService.getClient()

    // 1. Insert notification row
    await supabase.from('user_notifications').insert({
      user_id: mission.user_id,
      type: 'mission_blocked',
      title: `Mission blocked: ${mission.title}`,
      body: reason,
      mission_id: mission.id,
      action_url: `/mission-control`,
    })

    // 2. Check preferred channel
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_channel')
      .eq('id', mission.user_id)
      .maybeSingle()

    // 3. Push to external channel if not studio
    if (profile?.preferred_channel && profile.preferred_channel !== 'studio') {
      const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
      const internalToken = this.configService.get<string>('missionApi.internalToken') || ''
      const baseUrl = callbackUrl.replace('/api/internal/missions/callback', '')
      await fetch(`${baseUrl}/api/internal/missions/notification-push`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${internalToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: mission.user_id,
          agent_key: agentKey,
          content: reason,
          notification_type: 'mission_blocked',
          mission_title: mission.title,
        }),
      }).catch(() => {})
    }
  }
}
```

### 3b. Wire into Plan Phase

**File:** `apps/mission-worker/src/modules/missions/services/phases/mission-plan-phase.service.ts`

After line 88 (after inserting the blocked log), add:

```ts
await this.notificationEmitter.emitBlocked(
  mission,
  (planResult.feedback as string) || 'Blocked — requires your input',
  mgr,
)
```

### 3c. Wire into Review Phase

**File:** `apps/mission-worker/src/modules/missions/services/phases/mission-review-phase.service.ts`

After line 311 (after inserting the blocked log in the review blocked branch), add:

```ts
await this.notificationEmitter.emitBlocked(
  mission,
  feedback || 'Blocked — requires your input',
  mgr,
)
```

### 3d. Register in Module

**File:** `apps/mission-worker/src/modules/missions/missions.module.ts`

Add `UserNotificationEmitterService` to providers.
Inject into `MissionPlanPhaseService` and `MissionReviewPhaseService` constructors.

---

## Phase 4: Frontend — Notification Bell

### 4a. Frontend Service

**File:** `apps/web/src/features/mission-control/services/notifications.service.ts` — NEW

```ts
export async function fetchNotifications(limit = 50): Promise<UserNotification[]> { ... }
export async function fetchUnreadCount(): Promise<number> { ... }
export async function markNotificationsReadAll(): Promise<void> { ... }
export async function markNotificationRead(id: string): Promise<void> { ... }
```

### 4b. Types

**File:** `apps/web/src/features/mission-control/types/index.ts` — add

```ts
export interface UserNotification {
  id: string
  user_id: string
  type:
    | 'mission_blocked'
    | 'mission_completed'
    | 'mission_failed'
    | 'deliverable_ready'
    | 'subtask_blocked'
  title: string
  body: string | null
  mission_id: string | null
  action_url: string | null
  read_at: string | null
  channel_sent: Record<string, unknown>
  created_at: string
}
```

### 4c. Notification Sound

**File:** `apps/web/public/sounds/notification.mp3` — add a short chime sound

Use a royalty-free notification chime (< 1 second, ~10KB).

### 4d. NotificationBell Component

**File:** `apps/web/src/features/mission-control/components/NotificationBell.tsx` — NEW

Pattern mirrors `AwarenessPointsBell.tsx` but reads from `user_notifications`:

- Supabase realtime subscription on `user_notifications` table
- On new row: play sound (`new Audio('/sounds/notification.mp3').play().catch(() => {})`)
- Dropdown shows notifications grouped by time
- Click on a notification → navigate to `action_url` and mark as read
- "Mark all read" button

### 4e. Replace/Add Bell in Layout

**Option A (Recommended):** Keep `AwarenessPointsBell` for awareness. Add `NotificationBell` next to it in the Mission Control header.

**File:** `apps/web/src/features/mission-control/containers/MissionControlContainer.tsx`

```tsx
<header className="mb-spacing-4 flex items-start justify-between gap-3">
  <div>
    <h1 ...>{MISSION_CONTROL_MESSAGES.TITLE}</h1>
    <p ...>{MISSION_CONTROL_MESSAGES.SUBTITLE}</p>
  </div>
  <div className="flex items-center gap-2">
    <NotificationBell />
    <AwarenessPointsBell />
  </div>
</header>
```

**Option B:** Also add `NotificationBell` to the global layout (`apps/web/src/app/layout.tsx`) so notifications appear on ALL pages, not just Mission Control.

### 4f. Notification Sound Logic

Inside the realtime subscription callback in `NotificationBell`:

```ts
const prevCount = useRef(0)

// In realtime callback:
const newCount = data.filter((n) => !n.read_at).length
if (newCount > prevCount.current) {
  new Audio('/sounds/notification.mp3').play().catch(() => {})
}
prevCount.current = newCount
```

---

## Phase 5: Channel Preferences (Optional Enhancement)

### 5a. Add Slack to preferred channel UI

**File:** `apps/web/src/features/team/components/container/TeamCommunicationTab.tsx`

Change the channel array from `['studio', 'telegram']` to `['studio', 'telegram', 'slack']`.

### 5b. Update dispatcher to check for slack

**File:** `apps/mission-worker/src/modules/missions/services/awareness-action-dispatcher.service.ts`

Change line 60 condition from:

```ts
if (profile?.preferred_channel === 'telegram' && decision.content?.trim())
```

to:

```ts
if (profile?.preferred_channel !== 'studio' && decision.content?.trim())
```

(The internal endpoint already pushes to both Telegram and Slack.)

---

## File Summary

| Layer  | File                                                                           | Action               |
| ------ | ------------------------------------------------------------------------------ | -------------------- |
| DB     | `supabase/migrations/20260317000000_create_user_notifications.sql`             | NEW                  |
| API    | `apps/api/src/modules/missions/services/notifications.service.ts`              | NEW                  |
| API    | `apps/api/src/modules/missions/controllers/missions.controller.ts`             | ADD routes           |
| API    | `apps/api/src/modules/missions/controllers/internal-missions.controller.ts`    | ADD endpoint         |
| API    | `apps/api/src/modules/missions/services/missions.service.ts`                   | ADD method           |
| API    | `apps/api/src/modules/missions/dto/index.ts`                                   | ADD type             |
| Worker | `apps/mission-worker/.../user-notification-emitter.service.ts`                 | NEW                  |
| Worker | `apps/mission-worker/.../mission-plan-phase.service.ts`                        | EDIT (add emit)      |
| Worker | `apps/mission-worker/.../mission-review-phase.service.ts`                      | EDIT (add emit)      |
| Worker | `apps/mission-worker/.../missions.module.ts`                                   | EDIT (register)      |
| Web    | `apps/web/src/features/mission-control/services/notifications.service.ts`      | NEW                  |
| Web    | `apps/web/src/features/mission-control/types/index.ts`                         | EDIT (add type)      |
| Web    | `apps/web/src/features/mission-control/components/NotificationBell.tsx`        | NEW                  |
| Web    | `apps/web/src/features/mission-control/containers/MissionControlContainer.tsx` | EDIT (add bell)      |
| Web    | `apps/web/public/sounds/notification.mp3`                                      | NEW (asset)          |
| Web    | `apps/web/src/features/team/components/container/TeamCommunicationTab.tsx`     | EDIT (add slack)     |
| Worker | `apps/mission-worker/.../awareness-action-dispatcher.service.ts`               | EDIT (channel check) |

---

## Execution Order

1. **Migration** — Create `user_notifications` table
2. **API service + routes** — CRUD for notifications
3. **Internal push endpoint** — For mission worker to call
4. **Worker emitter service** — Creates notification + pushes to channels
5. **Wire into plan + review phases** — Emit on blocked
6. **Frontend bell + sound** — Display + audio
7. **Channel preferences update** — Add Slack option

---

## Future Extensions

Once `user_notifications` exists, easy to add:

- `mission_completed` — "Your mission X is done!"
- `deliverable_ready` — "A new deliverable is ready for review"
- `mission_failed` — "Mission X failed after 3 retries"
- Global notification bell in layout (not just Mission Control)
- Email digest of unread notifications
- Notification preferences (mute types, quiet hours)
