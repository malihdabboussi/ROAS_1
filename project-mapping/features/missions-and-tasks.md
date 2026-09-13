# Feature: Missions & Tasks

> Read-only reverse-engineering, 2026-09-05. Evidence tags: **CONFIRMED** (read in code),
> **LIKELY** (one inference hop), **UNKNOWN**.
> Scope: `apps/web/src/features/{all-tasks,my-work,mission-control,work-requests}`,
> `apps/api/src/modules/{missions,your-turn,work-requests,programs}`, all of `apps/mission-worker`.
> Cross-references: [`../03-architecture.md`](../03-architecture.md),
> [`../05-api-map.md`](../05-api-map.md), [`../06-database-map.md`](../06-database-map.md),
> [`../08-auth-security.md`](../08-auth-security.md),
> [`../10-background-processes.md`](../10-background-processes.md),
> [`spaces-campaigns.md`](./spaces-campaigns.md).

## Status

**PARTIALLY IMPLEMENTED / DUPLICATED** — the mission engine itself (outbox → `pg_notify` →
BullMQ → five phase services → internal callback) is complete, coherent and the most carefully
built subsystem in the repo; the _task_ layer around it is four half-migrated presentations of
two underlying models, one of which (`my-work`) is dead code and two of which link to
`/mission-control`, a route that **does not exist**.

## Purpose

Missions are how an agent does multi-step work. A mission is created (by a user, an agent, or a
playbook kickoff), planned into subtasks, executed step by step by agent runtimes, reviewed, and
either finished or handed to a human. "Tasks" is the human-facing projection of that work plus
ordinary Space rows that were never a mission at all.

### The four-task-concepts question, resolved

**CONFIRMED. There are two data models and four UI presentations. Nothing is a duplicate of
another at the storage layer; the duplication is entirely in the read/presentation layer.**

```text
MODEL A — the mission engine (canonical for agent work)
  missions ─┬─ mission_subtasks ── mission_deliverables
            ├─ missions_logs
            └─ mission_outbox        (delivery)

MODEL B — Space rows (canonical for human work)
  spaces ── space_items             (see spaces-campaigns.md)

BRIDGE  — a DB trigger copies published mission_subtasks into space_items
  trg_sync_mission_subtask_to_space_task
  (supabase/migrations/20260717203000_link_mission_steps_to_space_tasks.sql:124)
  space_items.linked_mission_id / .linked_mission_subtask_id
```

| Concept                      | What it actually is                                                                                                                                                 | Reads from                         | Canonical?                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `mission-control`            | The real mission UI: list, detail modal, plan approval, subtask actions, artifact viewer. 84 files.                                                                 | `/api/missions/*`                  | **Yes, for missions** — but only reachable through adapters, never through a `/mission-control` route |
| `all-tasks`                  | A rolled-up _project-management_ board: every `space_items` row across the campaigns/programs you can see.                                                          | `GET /api/tasks/rollup`            | **Yes, for the task board** — `/all-tasks` is the live route                                          |
| `my-work`                    | An orphaned personal-inbox container. Nothing imports it.                                                                                                           | `useYourTurnFeed`                  | **No — dead code**                                                                                    |
| `work-requests`              | An unrelated _external service-request intake_ flow: a public tokenised review page that finalises into a `space_items` row and mirrors to ClickUp via Page Grader. | `/api/work-requests/review/:token` | **Yes, but it is not a task view**                                                                    |
| `your-turn` (no feature dir) | The actual personal inbox, a 4-branch Postgres UNION view. Rendered by `features/home`.                                                                             | `GET /api/your-turn`               | **Yes, for the inbox**                                                                                |

So the honest summary: **`mission-control` + `your-turn` + `all-tasks` are three legitimate,
non-overlapping views** (agent work / my next action / everything in the portfolio);
**`my-work` is dead**; **`work-requests` is misfiled** — it belongs next to integrations, not next
to tasks.

The clearest single piece of evidence that the two models are deliberately bridged rather than
duplicated is the adapter `taskRollupToYourTurnItem`
(`apps/web/src/lib/tasks/task-rollup-to-your-turn.ts:4`), which converts a rollup row into an
inbox row so that `/all-tasks` can reuse the inbox's detail host.

## User Capabilities

**Missions**

- Create a mission (title, brief, priority, optional playbook kickoff) — costs credits.
- Watch it plan itself, then approve or reject the plan (`pending_approval`).
- Approve or deny an agent's access request (`awaiting_access_approval`).
- Comment on a running mission — a comment becomes a `directive` phase job.
- Attach files, rate the mission, extend its deadline, retry it, delete it.
- Per subtask: retry, complete-as-human, bounce back to the agent, reassign to another human,
  mark blocked.
- Read the plan, the deliverables, and the execution log; export a deliverable to Google Docs.
- Bulk-patch missions; batch-fetch deliverables.
- Toggle personal settings: awareness, auto-approve.
- 15 notification operations (read/unread, snooze, bucket, clear, delete).

**Tasks**

- `/all-tasks`: a filterable board of every visible `space_items` row, scoped by
  program/campaign, with a detail host shared with the home inbox.
- Home inbox: the "your turn" feed — human subtasks, assigned Space items, pending agent
  suggestions, and missions awaiting plan approval.

**Work requests**

- Receive a Page Grader webhook, get a 24-hour tokenised review link, fill in missing context via a
  chat flow on a public page, finalise into a Space task, and have it mirrored into ClickUp.

## Entry Points

### Frontend

| Route                     | File                                                                                                         | Notes                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------ |
| `/all-tasks`              | `apps/web/src/app/(dashboard)/all-tasks/page.tsx` → `_components/AllTasksWorkspace.tsx`                      | title `'All Tasks                                                                                                | ROAS'` |
| `/home`                   | `apps/web/src/app/(dashboard)/home/page.tsx`, `apps/web/src/features/home/containers/HomeInboxWorkspace.tsx` | the real personal inbox                                                                                          |
| `/home/my-tasks`          | `apps/web/src/app/(dashboard)/home/my-tasks/page.tsx`                                                        | **redirects to `/all-tasks`**                                                                                    |
| `/home/delegation-desk`   | `apps/web/src/app/(dashboard)/home/delegation-desk/page.tsx`                                                 | `DelegationDeskWorkspace`                                                                                        |
| `/request-review/[token]` | `apps/web/src/app/request-review/[token]/page.tsx`                                                           | **public**, outside `(dashboard)`                                                                                |
| `/mission-control`        | **DOES NOT EXIST**                                                                                           | three call sites and the `your_turn_items` view all link here                                                    |
| mission UI (via adapters) | `apps/web/src/components/missions/MissionListAdapter.tsx`, `MissionDetailModalAdapter.tsx`                   | consumed by `features/home`, `features/spaces`, `features/team-2`, `features/agency-clients`, `components/shell` |

### Backend

| Controller                                         | Prefix                 | Guards                                                                  |
| -------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `missions.controller.ts`                           | `missions`             | `AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard`              |
| `missions-lifecycle.controller.ts`                 | `missions`             | same, + `CreditsGuard` on `create`, `approve-plan`, `retry`, `extend`   |
| `missions-query.controller.ts`                     | `missions`             | same                                                                    |
| `missions-subtasks.controller.ts`                  | `missions`             | same, + `CreditsGuard` on subtask retry                                 |
| `missions-status.controller.ts`                    | `missions`             | same                                                                    |
| `missions-feedback.controller.ts`                  | `missions`             | same                                                                    |
| `missions-access-approval.controller.ts`           | `missions`             | same, + `CreditsGuard`                                                  |
| `missions-notifications.controller.ts`             | notifications prefix   | authenticated                                                           |
| `missions-user.controller.ts`                      | user prefix            | authenticated                                                           |
| `agent-checkpoints.controller.ts`                  | checkpoints            | authenticated                                                           |
| `internal-missions.controller.ts`                  | `internal/missions`    | **`InternalAuthGuard`** — the worker callback                           |
| `internal-mission-manager.controller.ts`           | `internal/…/manager`   | `InternalAuthGuard`                                                     |
| `internal-mission-awareness.controller.ts`         | `internal/…/awareness` | `InternalAuthGuard`                                                     |
| `internal-mission-awareness-actions.controller.ts` | `internal/…/awareness` | `InternalAuthGuard`                                                     |
| `internal-agents.controller.ts`                    | internal agents        | `InternalAuthGuard`                                                     |
| `your-turn.controller.ts`                          | `your-turn`            | `AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard`              |
| `task-rollup.controller.ts`                        | `tasks`                | same                                                                    |
| `work-request.controller.ts`                       | `@Controller()` (root) | `AuthGuard, ThrottlerGuard` at class level, **every route `@Public()`** |

## API Endpoints

| Method                | Route                                                                                                                                                                        | Handler                               | Purpose                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------ |
| POST                  | `/api/missions`                                                                                                                                                              | `MissionsLifecycleController.create`  | create mission (throttled 30/min, credits) |
| GET                   | `/api/missions`                                                                                                                                                              | `MissionsController`                  | list missions                              |
| GET                   | `/api/missions/:id`                                                                                                                                                          | `MissionsQueryController`             | mission detail                             |
| PATCH                 | `/api/missions/:id`                                                                                                                                                          | `MissionsLifecycleController`         | patch mission fields                       |
| DELETE                | `/api/missions/:id`                                                                                                                                                          | `MissionsLifecycleController`         | delete mission                             |
| PATCH                 | `/api/missions/bulk`                                                                                                                                                         | `MissionsQueryController`             | bulk patch                                 |
| PATCH                 | `/api/missions/:id/status`                                                                                                                                                   | `MissionsStatusController`            | status transition                          |
| GET                   | `/api/missions/:id/plan`                                                                                                                                                     | `MissionsQueryController`             | the generated plan                         |
| POST                  | `/api/missions/:id/approve-plan`                                                                                                                                             | `MissionsLifecycleController`         | leave `pending_approval` (credits)         |
| POST                  | `/api/missions/:id/reject-plan`                                                                                                                                              | `MissionsLifecycleController`         | reject and replan                          |
| POST                  | `/api/missions/:id/retry`                                                                                                                                                    | `MissionsLifecycleController`         | retry (credits)                            |
| POST                  | `/api/missions/:id/extend`                                                                                                                                                   | `MissionsLifecycleController`         | extend deadline (credits)                  |
| POST                  | `/api/missions/:id/comment`                                                                                                                                                  | `MissionsLifecycleController`         | comment → `directive` phase                |
| POST                  | `/api/missions/:id/attachments`                                                                                                                                              | `MissionsLifecycleController`         | attach file                                |
| POST                  | `/api/missions/:id/rate`                                                                                                                                                     | `MissionsFeedbackController`          | rate outcome                               |
| GET                   | `/api/missions/:id/logs`                                                                                                                                                     | `MissionsQueryController`             | execution log                              |
| GET                   | `/api/missions/:id/deliverables`                                                                                                                                             | `MissionsQueryController`             | deliverables                               |
| GET                   | `/api/missions/deliverables/batch`                                                                                                                                           | `MissionsQueryController`             | batch fetch                                |
| PATCH                 | `/api/missions/deliverables/:deliverableId`                                                                                                                                  | `MissionsQueryController`             | edit deliverable                           |
| POST                  | `/api/missions/:id/deliverables/export-google-doc`                                                                                                                           | `MissionsQueryController`             | export                                     |
| GET                   | `/api/missions/:id/access-requests`                                                                                                                                          | `MissionsQueryController`             | pending access requests                    |
| POST                  | `/api/missions/:id/access-requests/approve`                                                                                                                                  | `MissionsAccessApprovalController`    | approve (credits)                          |
| POST                  | `/api/missions/:id/access-requests/deny`                                                                                                                                     | `MissionsAccessApprovalController`    | deny                                       |
| GET                   | `/api/missions/:id/subtasks`                                                                                                                                                 | `MissionsSubtasksController`          | list subtasks                              |
| PATCH                 | `/api/missions/:id/subtasks/:subtaskId`                                                                                                                                      | `MissionsSubtasksController`          | edit subtask                               |
| POST                  | `/api/missions/:id/subtasks/:subtaskId/retry`                                                                                                                                | `MissionsSubtasksController`          | retry (credits)                            |
| POST                  | `/api/missions/:id/subtasks/:subtaskId/complete-human`                                                                                                                       | `MissionsSubtasksController`          | human closes `awaiting_human`              |
| POST                  | `/api/missions/:id/subtasks/:subtaskId/bounce-to-agent`                                                                                                                      | `MissionsSubtasksController`          | hand back to agent                         |
| POST                  | `/api/missions/:id/subtasks/:subtaskId/reassign-human`                                                                                                                       | `MissionsSubtasksController`          | reassign                                   |
| POST                  | `/api/missions/:id/subtasks/:subtaskId/block-human`                                                                                                                          | `MissionsSubtasksController`          | mark blocked                               |
| GET                   | `/api/your-turn`                                                                                                                                                             | `YourTurnController.list`             | personal inbox feed                        |
| GET                   | `/api/tasks/rollup`                                                                                                                                                          | `TaskRollupController`                | portfolio task board                       |
| POST                  | `/api/internal/missions/create`                                                                                                                                              | `InternalMissionsController`          | agent-created mission                      |
| POST                  | `/api/internal/missions/callback`                                                                                                                                            | `InternalMissionsController`          | **worker → API result callback**           |
| POST                  | `/api/internal/missions/plan`                                                                                                                                                | `InternalMissionsController`          | worker writes the plan                     |
| POST                  | `/api/internal/missions/deliverable`                                                                                                                                         | `InternalMissionsController`          | worker writes a deliverable                |
| POST                  | `/api/internal/…/manager/{mission-fields,append-subtasks,prepare-replan,cancel-subtask,edit-subtask,retry-subtask}`                                                          | `InternalMissionManagerController`    | manager-agent mission edits                |
| POST                  | `/api/internal/…/awareness/{telegram-push,retry,comment,reassign,nudge-subtask,progress-notes,append-subtasks,cancel-subtask,edit-subtask,retry-subtask,replan,pause,amend}` | `InternalMissionAwareness*Controller` | CEO-awareness loop actions                 |
| GET/POST/PATCH/DELETE | 15 notification routes                                                                                                                                                       | `MissionsNotificationsController`     | read/unread/snooze/bucket/clear            |
| PATCH                 | `/api/…/awareness-toggle`, `/api/…/auto-approve-toggle`, `/api/…/profile/settings`                                                                                           | `MissionsUserController`              | per-user mission prefs                     |
| GET/PATCH/POST        | `/api/…/checkpoints/:checkpointId[/restore]`                                                                                                                                 | `AgentCheckpointsController`          | agent checkpoint restore                   |
| GET                   | `/api/work-requests/review/:token`                                                                                                                                           | `WorkRequestController`               | **public** review payload                  |
| GET/POST              | `/api/work-requests/review/:token/chat`                                                                                                                                      | `WorkRequestController`               | **public** intake chat                     |
| PATCH                 | `/api/work-requests/review/:token`                                                                                                                                           | `WorkRequestController`               | **public** field edits                     |
| POST                  | `/api/work-requests/review/:token/finalize`                                                                                                                                  | `WorkRequestController`               | **public** finalise → Space task + ClickUp |
| POST                  | `/api/work-requests/review/:token/refresh`                                                                                                                                   | `WorkRequestController`               | **public** request a fresh link            |
| POST                  | `/api/integrations/page-grader/webhooks/work-request-drafts[/refresh]`                                                                                                       | `WorkRequestController`               | signed Page Grader intake                  |
| POST                  | `/api/internal/work-requests/{process-reminders,stamp-conversation}`                                                                                                         | `WorkRequestController`               | cron/agent hooks                           |

## Main Files

| File                                                                                | Responsibility                                                                                              |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `apps/mission-worker/src/modules/missions/types/missions.types.ts`                  | `MissionPhase`, the 13 `MissionStatus` values, 7 `SubtaskStatus` values, `MissionJobData`, `priorityToRank` |
| `apps/mission-worker/src/modules/missions/processors/missions.processor.ts`         | the single BullMQ processor                                                                                 |
| `apps/mission-worker/src/modules/missions/services/missions.service.ts`             | 35-line phase switch → five phase services                                                                  |
| `.../services/phases/mission-plan-phase.service.ts`                                 | plan generation                                                                                             |
| `.../services/phases/mission-execute-phase.service.ts`                              | subtask execution                                                                                           |
| `.../services/phases/mission-review-phase.service.ts`                               | review gate                                                                                                 |
| `.../services/phases/mission-subtask-triage.service.ts`                             | triage of failed/blocked subtasks                                                                           |
| `.../services/phases/mission-comment-directive.service.ts`                          | user comment → mid-flight directive                                                                         |
| `.../services/phases/mission-action-policy.ts`                                      | what an agent is allowed to do in a phase                                                                   |
| `.../services/missions.outbox-dispatcher.service.ts`                                | `LISTEN mission_outbox_new`, claim, enqueue, reconcile fallback                                             |
| `.../services/missions.outbox-dispatcher.mapping.ts`                                | outbox `event_type` → `MissionJobData`                                                                      |
| `.../services/missions.scheduler.ts` + `missions.scheduler-recovery.*.ts` (8 files) | stale detection, auto-retry, watchdogs A/B, outbox recovery                                                 |
| `.../services/mission-execution-lease.ts`                                           | prevents two workers executing the same subtask                                                             |
| `.../services/human-subtask-notifier.service.ts`                                    | notifies the assignee when a subtask hits `awaiting_human`                                                  |
| `.../services/ceo-awareness-runner.service.ts`, `ceo-operational-loop.service.ts`   | the autonomous "CEO" oversight loop                                                                         |
| `.../playbooks/mission-playbook.registry.ts`                                        | `resolveMissionPlaybookId` + `expandMissionPlaybook` (9 branches)                                           |
| `apps/api/src/modules/missions/controllers/internal-missions.controller.ts`         | the worker callback surface                                                                                 |
| `apps/api/src/modules/missions/services/mission-lifecycle-native-tx.service.ts`     | mission state + outbox write in one transaction                                                             |
| `apps/api/src/modules/missions/services/mission-internal-plan.base.ts`              | plan persistence + follow-on outbox events                                                                  |
| `apps/api/src/modules/missions/repositories/missions-repository-missions.base.ts`   | mission rows + outbox inserts                                                                               |
| `apps/api/src/modules/your-turn/services/your-turn.service.ts`                      | reads `your_turn_items`, then filters by feed scope in JS                                                   |
| `apps/api/src/modules/programs/services/task-rollup.service.ts`                     | campaigns → program permission filter → `space_items` rollup                                                |
| `apps/api/src/modules/work-requests/services/work-request.service.ts`               | draft lifecycle, `finalizeReview` at `:225`                                                                 |
| `apps/api/src/modules/work-requests/services/work-request-mirror.ts`                | `mirrorWorkRequestFinalTask` → Page Grader → ClickUp, 15-min retry backoff                                  |
| `apps/api/src/modules/work-requests/services/work-request-review-security.ts`       | SHA-256 token hashing (`:50`), secret redaction (`:211`)                                                    |
| `apps/web/src/features/mission-control/containers/MissionControlContainer.tsx`      | **orphan** — only the barrel exports it                                                                     |
| `apps/web/src/features/mission-control/components/MissionList.tsx`                  | reused via `components/missions/MissionListAdapter.tsx`                                                     |
| `apps/web/src/features/all-tasks/components/AllTasksBoard.tsx`                      | rollup board                                                                                                |
| `apps/web/src/features/all-tasks/components/AllTasksScopeFilters.tsx`               | program/campaign scope                                                                                      |
| `apps/web/src/lib/work-views/use-task-rollup.ts`                                    | the rollup hook (also used by campaign + program pages)                                                     |
| `apps/web/src/lib/tasks/task-rollup-to-your-turn.ts`                                | rollup row → inbox row adapter                                                                              |
| `apps/web/src/lib/tasks/task-lifecycle-review.ts`                                   | shared task state transitions                                                                               |
| `apps/web/src/features/my-work/containers/MyWorkContainer.tsx`                      | **dead code**                                                                                               |
| `apps/web/src/features/work-requests/components/WorkRequestReviewPage.tsx`          | the public review page                                                                                      |
| `apps/web/src/features/work-requests/hooks/useWorkRequestReviewChat.ts`             | intake chat                                                                                                 |
| `apps/web/src/features/work-requests/lib/work-request-chat-steps.ts`                | the missing-field questionnaire                                                                             |

## Database Tables

**Mission engine**

- `missions` — the mission. 13-value `status`, `phase` drives the worker, `brief`, `description`,
  `priority`, `due_date`, `user_id`, `org_id`.
- `mission_subtasks` — the plan steps. `status` (7 values), `assignee_type` (`agent` | `human`),
  `assigned_agent_key`, `assigned_user_id`, `publish_to_task_list`, `scheduled_at`, `intent`,
  `sort_order`, `feedback`.
- `mission_deliverables` — outputs.
- `missions_logs` — execution log.
- `mission_outbox` — the delivery queue.
  `supabase/migrations/20260228210000_mission_outbox.sql:8`:
  `status IN ('pending','processing','processed','dead_letter')`, with a
  `(status, next_attempt_at, created_at)` index at `:21`.
- `agent_awareness_points`, `agent_delegations`, `agents_registry`, `agent_definitions`,
  `agent_skills`, `agent_team_members` — the agent side.

**Task layer**

- `space_items` — human tasks. Mission linkage via `linked_mission_id` and
  `linked_mission_subtask_id`; `assignee_type`, `assignee_id`, `suggestion_state`,
  `parent_item_id`, `source` (`'agent_suggested'` for suggestions).
- `spaces`, `campaigns`, `programs` — the grouping hierarchy read by the rollup.
- `work_request_drafts` — `supabase/migrations/20260816030000_work_request_drafts.sql`;
  carries `status`, `sync_status` (`synced`/`sync_pending`/`sync_failed`),
  `review_token_expires_at`, `final_space_item_id`, `page_grader_receipt`, `clickup_receipt`,
  `sync_attempt_count`, `next_retry_at`, `last_error`.

**View**

- `your_turn_items` — `CREATE VIEW … WITH (security_invoker = true)`, a four-branch `UNION ALL`
  defined at `supabase/migrations/20260717203000_link_mission_steps_to_space_tasks.sql:141`:

  | `kind`            | Source             | Predicate                                                                                                                                                                                  |
  | ----------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `mission_subtask` | `mission_subtasks` | `assignee_type='human'`, `status IN ('awaiting_human','pending','revision')`, `assigned_user_id = auth.uid()`, **and no `space_items` row links to it** (deduplication against the mirror) |
  | `space_item`      | `space_items`      | `assignee_type='human'`, `assignee_id = auth.uid()`, not dismissed, `status NOT IN ('done','archived')`                                                                                    |
  | `suggestion`      | `space_items`      | `source='agent_suggested'`, `suggestion_state='pending'`, `user_id = auth.uid()`                                                                                                           |
  | `plan_approval`   | `missions`         | `status='pending_approval'`, `user_id = auth.uid()`                                                                                                                                        |

**Trigger**

- `trg_sync_mission_subtask_to_space_task` (same migration, `:124`) fires
  `AFTER INSERT OR UPDATE OF publish_to_task_list, title, status, assignee_type,
assigned_agent_key, assigned_user_id, scheduled_at, intent, sort_order` on `mission_subtasks`
  and calls `sync_mission_subtask_to_space_task()` (`:30`). Subtask statuses are mapped to Space
  task statuses by `mission_subtask_space_task_status()` (`:14`).

## Business Logic

**Mission engine — correctly placed.** `missions.processor.ts` does nothing but hand the job to
`MissionsService`, which is a 35-line switch over `job.data.phase` delegating to five phase
services. Policy is isolated in `mission-action-policy.ts`; concurrency in
`mission-execution-lease.ts`; recovery in eight `missions.scheduler-recovery.*` files. This is the
one area of the repo where the layering holds.

**Delivery — correctly placed, in the database.** State change and outbox write happen in one
transaction (`mission-lifecycle-native-tx.service.ts`), so a mission can never move status without
its job being durably queued. `pg_notify('mission_outbox_new', NEW.id::text)`
(`supabase/migrations/20260301091500_mission_outbox_notify_wakeup.sql:8`) is a _wake-up hint only_;
the dispatcher also polls (`missions.outbox-dispatcher.service.ts:175` logs
`'Outbox LISTEN/NOTIFY unavailable, using reconcile fallback'` when
`SUPABASE_DIRECT_DB_URL` is unset, `:147`). Correct design: notify is an optimisation, the claim
query is the contract.

**Your-turn — logic in the wrong place.** The four-way UNION lives in Postgres (good), but
`YourTurnService.list` then re-filters by feed scope **in JavaScript, after the limit has already
been applied by the repository** (`your-turn.service.ts:33`–`:53`). See
[Known Problems](#known-problems).

**Task rollup — in a service, correctly.** `task-rollup.service.ts` fetches campaigns, filters them
through `programPermissions.filterAccessibleCampaignsByProgram`, then rolls up `space_items`.
Permissions are applied before data, which is the right order.

**Work requests — in services, but the module is misplaced.** `work-request.service.ts` owns the
whole state machine; `work-request-mirror.ts` owns the ClickUp side-effect and its own 15-minute
retry schedule. Nothing lives in the controller. The problem is only that a Page-Grader/ClickUp
intake flow sits in a module named after tasks.

**Frontend — thin, correctly.** `AllTasksWorkspace.tsx` is a 4-import shell over
`AllTasksBoard` + `HomeTaskDetailHost` + `useHomeFeedOpen` + the rollup adapter.

## Validation

- `ZodValidationPipe` on mission create (`CreateMissionDtoSchema`), subtask patches, deliverable
  patches and the work-request DTOs (`apps/api/src/modules/work-requests/dto/work-request.dto.ts`).
- `@Throttle({ default: { limit: 30, ttl: 60000 } })` on mission create
  (`missions-lifecycle.controller.ts:60`).
- Mission phase is validated at the worker: `missions.service.ts` throws
  `Unknown mission phase: …` on anything outside the five phases.
- Playbook ids are resolved permissively — `resolveMissionPlaybookId` accepts `playbook_id`,
  `playbook`, `playbook_kickoff.playbook_id` or `playbook_kickoff.playbook`
  (`mission-playbook.registry.ts:33`) and returns `''` when none match;
  `expandMissionPlaybook` then returns `null` for an unknown id rather than throwing.
- Work-request tokens: 32-byte random, stored **only as a SHA-256 hash**
  (`hashWorkRequestReviewToken`, `work-request-review-security.ts:50`), 24-hour expiry
  (`work-request.service.ts` sets `issuedAt + 24h`), and the states `expired` / `revoked` /
  `finalized` are resolved before any mutation. Finalisation refuses to proceed while
  `missing_fields.length > 0`.
- Secrets are stripped from error text before persistence — the regex at
  `work-request-review-security.ts:211` redacts `api_key|authorization|bearer|access_token|secret|password`.

## Permissions

- All user-facing mission routes: `AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard`.
  No `@RequireOrgRole` on any mission controller, so any org member who passes
  `OrgContextGuard` has full mission access within the org.
- `CreditsGuard` gates the spend-incurring operations: mission create, plan approval, retry,
  extend, subtask retry, access-request approval.
- `InternalAuthGuard` (shared bearer) protects the entire worker↔API surface:
  `internal/missions/*`, `internal/…/manager/*`, `internal/…/awareness/*`.
- `your_turn_items` is `security_invoker = true` and every branch is predicated on `auth.uid()`,
  so row-level isolation is enforced by Postgres, not by the service. The service's extra
  JS filtering is org-scope narrowing on top of that, not the security boundary.
- **Work requests are entirely public by design.** The controller declares
  `@UseGuards(AuthGuard, ThrottlerGuard)` at class level and then marks **every single route
  `@Public()`**, including `internal/work-requests/process-reminders` and
  `internal/work-requests/stamp-conversation`. Authorisation is the unguessable review token for
  the review routes and a webhook signature for the Page Grader routes; the two `internal/*` routes
  rely on neither. See [Known Problems](#known-problems).

## External Dependencies

- **Redis / BullMQ** — the mission queue (`MISSIONS_QUEUE` = `AGENT_RUNTIME_MISSION_QUEUE`).
- **Postgres `LISTEN`/`NOTIFY`** over a **direct** connection (`SUPABASE_DIRECT_DB_URL`), not the
  Supabase pooler — the dispatcher degrades to polling without it.
- **Railway** — hosts `mission-worker`; see [`../10-background-processes.md`](../10-background-processes.md).
- **`apps/agent-api` / OpenClaw on Fly.io** — the runtime that actually executes a subtask.
- **LLM providers via OpenRouter** — planning and execution; billed through
  [`billing-and-credits.md`](./billing-and-credits.md).
- **Page Grader → ClickUp** — work-request mirroring.
- **Telegram** — `internal/…/awareness/telegram-push`.
- **Google Docs** — deliverable export.

## Background Jobs

| Job                                 | Runtime          | Files                                                                                                                             | Trigger                                          |
| ----------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Mission phase execution             | `mission-worker` | `missions.processor.ts` → `missions.service.ts` → phase services                                                                  | BullMQ job from the outbox dispatcher            |
| Outbox dispatch                     | `mission-worker` | `missions.outbox-dispatcher.service.ts`                                                                                           | `LISTEN mission_outbox_new` + periodic reconcile |
| Stale-mission recovery / auto-retry | `mission-worker` | `missions.scheduler.ts`, `missions.scheduler-recovery.{stale,auto-retry,outbox,watchdogs,watchdogs.phase-a,watchdogs.phase-b}.ts` | interval                                         |
| CEO awareness / operational loop    | `mission-worker` | `ceo-awareness-runner.service.ts`, `ceo-operational-loop.service.ts`, `daily-digest.service.ts`                                   | interval                                         |
| Human-subtask notification          | `mission-worker` | `human-subtask-notifier.service.ts`                                                                                               | subtask enters `awaiting_human`                  |
| Agent pattern evaluation            | `mission-worker` | `agent-pattern-evaluator.service.ts`                                                                                              | interval                                         |
| Work-request reminders              | `apps/api`       | `work-request-reminders.ts` via `POST /api/internal/work-requests/process-reminders`                                              | external scheduler                               |
| Work-request ClickUp retry          | `apps/api`       | `work-request-mirror.ts` (`next_retry_at = now + 15 min`)                                                                         | reminder run                                     |

## Frontend Flow

**Mission (via the Spaces surface, which is how it is actually reached).**
`features/spaces/components/MissionsView.tsx` renders `MissionListAdapter` →
`features/mission-control/components/MissionList.tsx`. Selecting a mission opens
`MissionDetailModalAdapter` → the mission-control detail modal, which fetches
`/api/missions/:id`, `/…/plan`, `/…/subtasks`, `/…/deliverables`, `/…/logs`. Plan approval posts
`/…/approve-plan`; subtask actions post the five `/…/subtasks/:subtaskId/*` routes. Everything goes
through `apps/web/src/lib/missions/missions-api.ts` → `backend-client.ts` → the Next proxy.

**Inbox.** `HomeInboxWorkspace.tsx` calls `useYourTurnFeed` → `GET /api/your-turn`. Items carry a
`source_url` computed _by the view_; `mission_subtask` and `plan_approval` rows point at
`/mission-control?...`, which 404s. `apps/web/src/lib/notifications/notification-open-target.ts`
also maps notifications to `/mission-control`.

**All tasks.** `/all-tasks` → `AllTasksWorkspace` → `AllTasksBoard` → `useTaskRollup`
(`lib/work-views/use-task-rollup.ts`) → `GET /api/tasks/rollup`. Rows are converted with
`taskRollupToYourTurnItem` so `HomeTaskDetailHost` (an inbox component) can render the detail pane.

**Work request.** A recipient opens `/request-review/[token]` → `WorkRequestReviewPage` →
`GET /api/work-requests/review/:token`. If fields are missing, `useWorkRequestReviewChat` walks
`work-request-chat-steps.ts` and PATCHes answers. `WorkRequestFinalizedActions` posts
`/finalize`.

## Backend Flow

**Create → plan.** `POST /api/missions` (`CreditsGuard`, 30/min) →
`MissionsCreationService.create(supabase, userId, body, scope.orgId, scope.orgRole)`. The
lifecycle service writes the `missions` row _and_ a `mission_outbox` row in one native
transaction. The insert trigger fires `pg_notify('mission_outbox_new', id)`.

**Dispatch.** `MissionsOutboxDispatcherService` is `LISTEN`ing on a direct pg client. On notify (or
on the reconcile interval) it runs a claim query — `SELECT … FROM mission_outbox … FOR UPDATE SKIP
LOCKED` followed by `UPDATE mission_outbox … SET status='processing'`
(`missions.outbox-dispatcher.service.ts:220`–`:236`) — maps the row to `MissionJobData` via
`missions.outbox-dispatcher.mapping.ts`, and adds it to BullMQ.

**Execute.** `MissionsProcessor` → `MissionsService.processMission` → the phase service. Execution
takes a lease (`mission-execution-lease.ts`), calls the agent runtime, then reports back via
`POST ${BACKEND_URL}/api/internal/missions/callback` (and `/plan`, `/deliverable` for those
artefacts). The API applies the result, writes the next outbox event, and the cycle repeats.

**Human gate.** When a subtask has `assignee_type='human'`, the execute phase sets
`status='awaiting_human'`, `human-subtask-notifier.service.ts` notifies the assignee, and the DB
trigger mirrors the subtask into `space_items` if `publish_to_task_list` is set. The `your_turn_items`
view then shows _either_ the raw subtask _or_ the mirrored Space item, never both — the
`NOT EXISTS (SELECT 1 FROM space_items WHERE linked_mission_subtask_id = ms.id)` clause is the
deduplication. The human resolves it with `complete-human`, `bounce-to-agent`, `reassign-human` or
`block-human`.

**Plan gate.** A mission in `pending_approval` appears in the inbox as a `plan_approval` row.
`approve-plan` writes an `execute` outbox event; `reject-plan` writes a replan event
(`mission-internal-plan.base.ts`).

**Recovery.** The scheduler looks for missions stuck in `processing`/`in_progress` past a
threshold, missions whose outbox rows never left `pending`, and dead-lettered events, then
re-enqueues or fails them.

## Full Request Flow

Mission creation through to the human gate — the path that ties both models together:

```mermaid
sequenceDiagram
    participant U as User (Spaces MissionsView)
    participant PX as Next proxy<br/>app/api/proxy/[...path]/route.ts
    participant MLC as MissionsLifecycleController<br/>missions-lifecycle.controller.ts:59
    participant CG as CreditsGuard
    participant TX as MissionLifecycleNativeTxService
    participant DB as Supabase Postgres
    participant OD as MissionsOutboxDispatcherService<br/>(mission-worker)
    participant BQ as BullMQ (Redis)
    participant MP as MissionsProcessor → MissionsService
    participant EX as MissionExecutePhaseService
    participant IMC as InternalMissionsController<br/>internal/missions/callback
    participant HN as HumanSubtaskNotifierService

    U->>PX: POST /api/missions {title, brief, playbook_kickoff}
    PX->>MLC: forward (AuthGuard, OrgContextGuard, OrgRoleGuard, Throttle 30/min)
    MLC->>CG: canActivate — credits available?
    CG-->>MLC: ok
    MLC->>TX: create(userId, body, orgId, orgRole)
    TX->>DB: BEGIN; insert missions; insert mission_outbox(event_type='mission.plan'); COMMIT
    DB-->>OD: pg_notify('mission_outbox_new', outboxId)
    MLC-->>U: 201 {missionId}

    OD->>DB: SELECT ... FOR UPDATE SKIP LOCKED; UPDATE mission_outbox SET status='processing'
    OD->>OD: missions.outbox-dispatcher.mapping.ts → MissionJobData{phase:'plan'}
    OD->>BQ: queue.add(MISSIONS_QUEUE, jobData)
    BQ->>MP: job
    MP->>MP: switch(job.data.phase) → planPhase.process(job)
    MP->>IMC: POST /api/internal/missions/plan (InternalAuthGuard)
    IMC->>DB: insert mission_subtasks; status='pending_approval'; insert mission_outbox

    Note over U,DB: mission now surfaces in your_turn_items as kind='plan_approval'
    U->>PX: POST /api/missions/:id/approve-plan
    PX->>MLC: forward (+ CreditsGuard)
    MLC->>DB: status='in_progress'; insert mission_outbox(event_type='mission.execute')
    DB-->>OD: pg_notify
    OD->>BQ: MissionJobData{phase:'execute', subtaskId}
    BQ->>MP: job
    MP->>EX: executePhase.process(job)
    EX->>DB: acquire lease (mission-execution-lease.ts)
    alt subtask.assignee_type = 'agent'
        EX->>EX: call agent runtime (agent-api / OpenClaw)
        EX->>IMC: POST /api/internal/missions/callback {result}
    else subtask.assignee_type = 'human'
        EX->>DB: mission_subtasks.status='awaiting_human'
        DB->>DB: trg_sync_mission_subtask_to_space_task → insert/update space_items
        EX->>HN: notify assignee
    end
    Note over DB: your_turn_items hides the raw subtask because a space_items row now links it
```

## Error Handling

- **Worker.** Unknown phase → thrown `Error`. BullMQ retries per queue config; exhausted jobs are
  reflected back onto the mission as `error`/`failed` (two distinct statuses exist and the
  difference is not documented — see [Open Questions](#open-questions)).
- **Outbox.** `status='dead_letter'` is the terminal state
  (`supabase/migrations/20260228210000_mission_outbox.sql:8`); `next_attempt_at` drives backoff;
  `missions.scheduler-recovery.outbox.ts` sweeps stragglers.
- **Notify unavailable.** Logged as a warning and degraded to polling, not fatal
  (`missions.outbox-dispatcher.service.ts:147`, `:175`). Listener client errors are reported under
  `MISSIONS_OUTBOX_LISTENER_CLIENT_ERROR` / `MISSIONS_OUTBOX_LISTENER_START_FAILED`.
- **API.** `internal-missions.controller.ts` returns structured results; user routes use Nest
  exceptions. Work requests use precise HTTP semantics: `NotFoundException` for an unknown token,
  **`GoneException`** for expired/revoked, `BadRequestException` for incomplete context
  (`work-request.service.ts:225`–`:243`).
- **ClickUp mirroring.** Never throws to the caller. Both the success and the `catch` branch write
  a receipt plus `sync_status`, `sync_attempt_count`, `last_sync_attempt_at`, `next_retry_at` and a
  redacted `last_error` (`work-request-mirror.ts:92`–`:107`).
- **Frontend copy.** `apps/web/src/features/work-requests/config/{errors,messages}.config.ts`,
  `apps/web/src/features/all-tasks/config/{all-tasks-messages,all-tasks-toast-errors}.config.ts`.

## Test Scenarios

1. **End-to-end mission.** Create a mission with `playbook_kickoff.playbook_id = 'meta-ads-launch'`.
   Expect: `missions` row, `mission_outbox` row, worker log for the plan phase, subtasks written,
   status `pending_approval`, and a `plan_approval` row in `/api/your-turn`.
2. **Notify vs. poll.** Unset `SUPABASE_DIRECT_DB_URL` on the worker and create a mission. Expect
   the warning at `missions.outbox-dispatcher.service.ts:147` and the mission to still run, just
   later. This is the single most important resilience property to verify.
3. **Human gate dedup.** Force a subtask to `assignee_type='human'` with
   `publish_to_task_list = true`. Confirm a `space_items` row appears **and** that
   `/api/your-turn` returns exactly one row for it (`kind='space_item'`, not `mission_subtask`).
   Then set `publish_to_task_list = false` and confirm the row flips to `kind='mission_subtask'`.
4. **The 404.** Open `/api/your-turn`, take any `mission_subtask` or `plan_approval` item, and
   navigate to its `source_url`. Expect a Next 404 — there is no `/mission-control` route.
5. **Your-turn limit bug.** As a user with more than `limit` inbox items where the newest are
   personal (`org_id IS NULL`) and the older ones belong to the current org, call
   `GET /api/your-turn?feed_scope=org&feed_org_id=…&limit=5`. Expect fewer than 5 results, or zero,
   even though matching rows exist.
6. **Duplicate dispatch.** Run two `mission-worker` instances against one Redis and one Postgres.
   Create ten missions. Expect each outbox row claimed exactly once (`FOR UPDATE SKIP LOCKED`) and
   each subtask executed once (`mission-execution-lease.ts`).
7. **Stale recovery.** Manually set a mission to `in_progress` with an old `updated_at` and no
   pending outbox row. Expect `missions.scheduler-recovery.stale.ts` to pick it up and re-enqueue
   or fail it.
8. **Unknown playbook.** Create a mission with `playbook_id = 'does-not-exist'`. Confirm
   `expandMissionPlaybook` returns `null` and observe what the plan phase does with that — the
   fallback path is not obvious from the registry.
9. **Work-request token lifecycle.** Fire the Page Grader webhook, open the review link, wait past
   24 h (or edit `review_token_expires_at`), and re-open. Expect HTTP 410 Gone, not 404.
10. **Work-request finalise + ClickUp failure.** Point Page Grader at an unreachable host and
    finalise a request. Expect the Space task to still be created, `sync_status='sync_failed'`,
    `next_retry_at ≈ now + 15 min`, and `last_error` with any credentials redacted.
11. **Public internal routes.** Call `POST /api/internal/work-requests/process-reminders` with no
    auth header at all. Confirm whether it executes (it is marked `@Public()`).
12. **Credits gate.** Drain the org's credits and try mission create, plan approval and subtask
    retry. All three should 402/403 from `CreditsGuard`; read-only mission routes should still work.

## Known Problems

**HIGH — `/mission-control` is referenced everywhere and does not exist.**
`apps/web/src/app/(dashboard)` contains no `mission-control` directory (verified against the full
`page.tsx` listing), yet three application call sites build that URL —
`apps/web/src/features/team-2/components/teams/team-overview-utils.ts:207`,
`apps/web/src/features/mission-control/components/mission-menu/use-mission-menu-actions.ts:20`,
`apps/web/src/features/spaces/components/task-detail/TaskDetailMainPanel.tsx:181` — and, worse, the
**database view emits it**: `your_turn_items` hard-codes
`'/mission-control?mission=' || …` for `kind='mission_subtask'` and
`'/mission-control?mission=' || … || '&tab=plan'` for `kind='plan_approval'`
(`supabase/migrations/20260717203000_link_mission_steps_to_space_tasks.sql:156`, `:232`).
`apps/web/src/lib/notifications/notification-open-target.ts` routes there too. Every one of these is
a dead click. Fixing the frontend alone is insufficient — the view needs a migration.

**HIGH — `YourTurnService` limits before it filters, silently truncating the inbox.**
`apps/api/src/modules/your-turn/services/your-turn.service.ts:33` passes `limit` to
`listYourTurnItems`, which applies it in the SQL query. The feed-scope filters
(`personal` / `workspace` / `org`) then run as `rows.filter(...)` in JavaScript at `:39`–`:53`.
A user whose most recent N items are out of the requested scope gets an inbox that is short or
empty while matching rows exist in the view. The org-membership check at `:20` is correct; the
filtering is in the wrong layer.

**MEDIUM — every work-request route is `@Public()`, including the two `internal/*` ones.**
`apps/api/src/modules/work-requests/controllers/work-request.controller.ts:35` applies
`AuthGuard, ThrottlerGuard` at class level and then marks all 10 routes `@Public()`. For the
review routes that is the design (the token is the credential, hashed with SHA-256 at
`work-request-review-security.ts:50`), and the webhooks verify a signature. But
`POST /api/internal/work-requests/process-reminders` and
`POST /api/internal/work-requests/stamp-conversation` are named `internal` and guarded by
neither a token nor `InternalAuthGuard` — unlike every other `internal/*` route in the repo. At
minimum they are an unauthenticated trigger for reminder sends. Cross-check against
[`../08-auth-security.md`](../08-auth-security.md).

**MEDIUM — `apps/web/src/features/my-work` is dead code.**
`MyWorkContainer.tsx` and `index.ts` reference only each other; no route, component or barrel
outside the directory imports either. Per `AGENTS.md` §2 this should have been deleted when the
inbox moved to `features/home`.

**MEDIUM — `MissionControlContainer` is orphaned while its children are the live mission UI.**
`apps/web/src/features/mission-control/containers/MissionControlContainer.tsx:29` is exported by
`features/mission-control/index.ts:1` and imported nowhere else. Meanwhile
`MissionList.tsx` and the detail modal _are_ used, but only through
`apps/web/src/components/missions/MissionListAdapter.tsx` and `MissionDetailModalAdapter.tsx`.
So a 84-file feature directory has one dead entry point and a shared-component tail — the
container should go and the components should move to `components/missions`.

**MEDIUM — the mission API surface is spread over 15 controllers with no index.**
Five of them (`internal-mission-manager`, `internal-mission-awareness`,
`internal-mission-awareness-actions`, `internal-agents`, `internal-missions`) expose 30+ internal
POST routes with overlapping names — `append-subtasks`, `cancel-subtask`, `edit-subtask` and
`retry-subtask` each exist **twice**, once under `manager/` and once under `awareness/`. Whether
those pairs are equivalent is not determinable from the route names.

**LOW — `error` and `failed` are both mission statuses.**
`apps/mission-worker/src/modules/missions/types/missions.types.ts:7`–`:20` lists both. No comment
or code path distinguishes them, so the UI has to treat them identically and any consumer
switching on status must handle both.

**LOW — `work-requests` is filed under tasks but is an integration.**
It talks to Page Grader and ClickUp (`work-request-mirror.ts`), lives at a public top-level route
(`/request-review/[token]`), and its only relationship to tasks is that finalisation creates one
`space_items` row. It belongs with [`integrations-oauth.md`](./integrations-oauth.md).

**LOW — `resolveMissionPlaybookId` accepts four different key spellings.**
`mission-playbook.registry.ts:33` reads `playbook_id`, `playbook`, `playbook_kickoff.playbook_id`
and `playbook_kickoff.playbook` in priority order. That is four call-site conventions preserved
rather than one enforced, which means the true contract is unknowable from a caller's side.

**LOW — the recovery subsystem is eight files for one concern.**
`missions.scheduler-recovery.{service,stale,auto-retry,outbox,watchdogs,watchdogs.phase-a,watchdogs.phase-b,types}.ts`
plus `missions.scheduler.ts` and `missions.scheduler-state-transitions.service.ts`. This is
LOC-limit-driven splitting rather than domain decomposition; see
`.docs/guidelines/architecture/project-architecture.md`.

## Related Features

- [`spaces-campaigns.md`](./spaces-campaigns.md) — `space_items`, `spaces`, `campaigns` and
  `programs` are the substrate for everything in the task half of this document.
- [`billing-and-credits.md`](./billing-and-credits.md) — `CreditsGuard` gates mission create,
  approve, retry and extend; mission LLM calls are what consume credits.
- [`content-artifacts-studio.md`](./content-artifacts-studio.md) — `mission_deliverables` are
  artifacts, and agents act on missions through the artifact action registry.
- [`contacts-crm.md`](./contacts-crm.md) — playbooks read and write contacts.
- [`integrations-oauth.md`](./integrations-oauth.md) — Page Grader (work requests) and Telegram
  (awareness push).
- [`../10-background-processes.md`](../10-background-processes.md) — the queue inventory and the
  competing-consumer / Redis-mismatch warnings that apply to `MISSIONS_QUEUE`.

## Open Questions

1. What is the difference between mission status `error` and `failed`? Both are declared; nothing
   documents or branches on the distinction.
2. Are the `manager/*` and `awareness/*` variants of `append-subtasks`, `cancel-subtask`,
   `edit-subtask` and `retry-subtask` the same operation with different callers, or genuinely
   different semantics? Not determinable from the controllers.
3. Was `/mission-control` deleted, renamed, or never built? No route file, no redirect, and no
   changelog entry was found — but the DB view was written _expecting_ it, so it existed at some
   point or was planned when that migration was authored.
4. Which playbooks are live? Nine `expandMissionPlaybook` branches exist, but nothing enumerates
   the ids to a user, and `task-cleanup` and `client-lifecycle` read like internal maintenance
   rather than user-selectable work.
5. What does the plan phase do when `expandMissionPlaybook` returns `null` — fall back to
   LLM planning, or fail the mission?
6. Is `awaiting_access_approval` reachable in practice? The two approve/deny routes exist
   (`missions-access-approval.controller.ts`) but no producer of that status was traced.
7. Do the two `@Public()` `internal/work-requests/*` routes have upstream protection (a Vercel cron
   secret, an edge rule, an IP allowlist)? Not visible in the repo.
8. Is `mission-control` intended to become a route again, or should the DB view be migrated to emit
   `/spaces?...` URLs like its `space_item` branch already does?
