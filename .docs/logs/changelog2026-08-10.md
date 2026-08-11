# Changelog - August 10, 2026

## [2026-08-10 09:43] - [FEATURE]

What: Rebased and shipped local Home Agenda WIP onto current `origin/main`: persisted agenda minimize/exclusions (Fathom settings + webhook gate), impromptu instant meetings, Delegation Desk as `/home/delegation-desk`, Pixel legacy-name suffix normalization + seed migration, and Slack Active/Shadow copy polish. Kept main’s OpenClaw model routing and minimized-row UI.

Why: Valuable local work was parked behind a stale main and needed to land cleanly after fast-forwarding 51 upstream commits.

Impact: Users can hide agenda occurrences across sessions (and skip Fathom ingest for those), start impromptu calls without a calendar, open Delegation Desk as a home route, and see “Vibey · CEO”-style defaults as Pixel.

Files: fathom agenda-exclusion API/helpers, meeting instant create path, home agenda/instant host, delegation desk page/workspace, default-agent-identity, pixel seed migration, docs/follow-up/changelog

## 2026-08-10 20:14 - [FIX]

What: Restored Pixel's scheduled Slack observation loop, made BullMQ automation routing and in-process schedule polling explicit persistent-host opt-ins, split cron parsing from next-fire persistence failures, and added automatic repair for enabled schedules with a null next-fire timestamp.

Why: Vercel was enqueueing scheduled work to a Railway-private Redis queue with no deployed automation consumer, while the scheduler's recovery path could erase a valid next-fire timestamp when a transient database write failed.

Impact: Pixel completed a fresh production run with 469 observations after the outage. Vercel now executes scheduled automations inline through the authenticated cron endpoint; transient persistence failures remain due for retry; valid enabled schedules self-heal after a null next-fire incident.

Files: `apps/api/src/cron.service.ts`, `apps/api/src/cron.service.test.ts`, `apps/api/src/modules/spaces/services/space-automation-service-01.base.ts`, `apps/api/src/modules/spaces/services/space-automation-service-08.base.ts`, `apps/api/src/modules/spaces/services/space-automation-scheduler.service.ts`, `apps/api/src/modules/spaces/repositories/space-automations.repository.ts`, related tests, `documentation/features/spaces-automation.md`.
## [2026-08-10 21:06] - [FEATURE]

What: Added daily-deduped schedule recovery notices and Pixel owner DMs, persisted scheduled-run skip reasons and recipient delivery-gate outcomes, and exposed a 24-hour ran/skipped/delivered/held summary in Team Intelligence.

Why: Enabled schedules could recover after a silent period without reporting missed fires, while successful run rows did not explain safety-gate skips or held recipients.

Impact: Administrators can see why Pixel did or did not act without weakening quiet hours, internal-only delivery, allowlists, or person-level Active gates. The migration is included but was not applied to production.

Files: `supabase/migrations/20260811033000_space_automation_liveness_observability.sql`, `apps/api/src/modules/spaces/services/space-automation-liveness.service.ts`, `apps/api/src/modules/spaces/services/space-automation-scheduler.service.ts`, `apps/api/src/modules/spaces/services/space-automation-service-08.base.ts`, `apps/api/src/modules/spaces/services/slack-team-signal-delivery.service.ts`, `apps/api/src/modules/slack/services/slack-automation-health.service.ts`, `apps/web/src/features/team-2/components/people/SlackAutomationHealthCard.tsx`, `documentation/features/spaces-automation.md`

## [2026-08-10 21:20] - [FIX]

What: Restored manual Delegation Desk thought capture and removed a stale Home flyout prop left behind by its contract change.

Why: The production frontend build failed because one component imported a missing capture function and another passed a removed prop.

Impact: Vercel can compile the Home flyout contract again, and rough thoughts entered in Delegation Desk persist as unassigned review-mode Holding tank items.

Files: `apps/web/src/features/spaces/services/delegation-desk.service.ts`, `apps/web/src/features/spaces/services/__tests__/delegation-desk.service.test.ts`, `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`
## [2026-08-10 21:31] - [FEATURE]

What: Added timezone-correct Slack Team daily caps, raised default limits to 40, and added a full send-safe manual preview pipeline with isolated cursors/dedupe, Preview-badged admin proposals, and a server-side no-send guard.

Why: Pixel's cap reset at UTC midnight during the Pacific workday, and render-only dry runs could not exercise or review the real analysis/composition path safely.

Impact: Administrators can run the real Slack Team pipeline without consuming live evidence, compounding Brain memory, counting against the live cap, or delivering a message. Preview proposals remain reviewable/dismissible and are visibly marked.

Files: `apps/api/src/modules/spaces`, `apps/api/src/modules/slack/services`, `apps/web/src/features/spaces`, `apps/web/src/features/team-2`, `documentation/features/spaces-automation.md`, `.docs/plans/agent-follow-up-work.md`.

## [2026-08-10 22:19] - [FEATURE]

What: Extracted Slack signal routing from the team loop, added a shared Pixel Slack voice pack, and composed evidence-grounded proactive briefings with continuity, scoped offers, validation, usage logging, preview rendering, and deterministic fallback.

Why: Pixel's fixed digest copy could not match Viktor's specificity or natural variation, while routing and orchestration had reached the service's planned extraction boundary.

Impact: Preview and eligible internal delivery now use exact source names, channels, quotes, figures, and local-day context without weakening internal-only, confidence, quiet-hour, cap, or evidence safety rails. Model or validation failures preserve the existing deterministic copy.

Files: `packages/agent-policy/src/pixel-slack-voice.ts`, `apps/api/src/modules/spaces/services/slack-team-message-composer.service.ts`, signal routing/delivery services and tests, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:31] - [FEATURE]

What: Added evidence-woven personal-moment composition, an explicit belated variant after 20 hours, and delivery reuse of the validated preview copy.

Why: Personal moments were safe but still sounded templated and discarded their composed proposal at send time.

Impact: Dylan-first personal outreach can naturally reference one or two public details, says “belated” when appropriate, creates no offers, and still falls back deterministically behind the unchanged evidence validator.

Files: `apps/api/src/modules/spaces/services/slack-team-message-composer.service.ts`, `slack-team-personal-moment-propose.ts`, signal routing/delivery services, tests, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:34] - [FEATURE]

What: Added the `slack_open_items` ledger, signal writer, periodic source-thread resolution, and bounded retention.

Why: Evidence fingerprints prevented duplicates but also erased unanswered work from Pixel's memory after the first analysis window.

Impact: Questions, risks, and commitments persist across days, resolve from later Slack replies/reactions, retain their source evidence, and remain bounded to 500 open rows per organization with 14-day resolved/stale cleanup.

Files: `supabase/migrations/20260811054500_slack_open_items.sql`, `slack-open-items.repository.ts`, `slack-open-items.service.ts`, signal router/module wiring, tests, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:38] - [FEATURE]

What: Added staged open-item resurfacing and a recipient continuity pack spanning due open work, newly resolved work, and recent Pixel digests.

Why: Permanent evidence dedupe prevented useful cross-day reminders and made Pixel forget its own prior briefings.

Impact: Open work returns at 8h/24h/72h with compact ages, respects an eight-hour cooldown and four-surface cap, emits a terminal going-quiet note, and mentions resolutions once before retiring them from continuity.

Files: Slack open-item repository/service/tests, signal routing and delivery services, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:40] - [FEATURE]

What: Added the pending-offer ledger and persisted machine-readable composer offers after confirmed Slack delivery.

Why: Pixel's scoped offers were visible prose but had no durable acceptance or fulfillment identity.

Impact: Every delivered offer is linked to its recipient, source Shadow action, Slack thread, deliverable kind, exact scope, and 72-hour expiry window.

Files: `supabase/migrations/20260811055500_slack_pending_offers.sql`, pending-offer repository/service/tests, signal delivery/module wiring, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:42] - [FEATURE]

What: Added exact-thread pending-offer acceptance for ✅/👍 reactions and affirmative replies.

Why: Scoped offers needed a zero-plumbing conversion from Slack intent into durable accepted work.

Impact: Matching offered rows atomically become accepted with their acceptance path recorded; unrelated reactions and replies continue through existing handlers.

Files: pending-offer acceptance service/repository, Slack reaction and thread-enrichment integration, module wiring, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:47] - [FEATURE]

What: Added accepted-offer runtime fulfillment for recap briefs, case studies, and spend breakdowns, with same-thread acknowledgement/delivery and missed-promise reporting.

Why: Accepted Pixel offers needed to become delivered work without human plumbing or silent promise failure.

Impact: Acceptance acknowledges the exact promise, queues only when a persistent consumer is explicitly enabled, runs inline on Vercel, posts evidence-grounded artifacts to the source thread, records delivery references, and reports overdue work.

Files: Slack offer fulfillment service/repository/tests, pending-offer acceptance, automation runtime processor, composer schema, module wiring, docs.

## [2026-08-10 22:54] - [FEATURE]

What: Added configurable Pixel delivery cadence: weekday EOD consolidation, urgent-only interrupts, high-bar weekends, and a Sunday open-ledger check-in.

Why: Five-minute detection should preserve awareness without creating five-minute message behavior.

Impact: Ordinary work stays cooling until the local 17:00–18:00 digest, urgent work can interrupt, weekend output is rare, and Sunday produces one deduped Monday-readiness check-in from the ledger. Existing deterministic gates still run first.

Files: Slack cadence/delivery-policy services and tests, loop/routing/delivery wiring, automation schema/editor defaults, docs.

## [2026-08-10 22:59] - [FEATURE]

What: Added client-label joins for upcoming Google Calendar stakes and Fathom-created follow-up state in Pixel's composer context.

Why: Slack topics lacked the timing and meeting-follow-up context that makes an executive digest actionable.

Impact: Matching topics can mention the next relevant event and current call follow-up state, while unlabeled items perform no cross-context lookup and lookup failures retain the Slack/ledger-only fallback.

Files: Slack context-stakes service/tests, signal delivery/module wiring, docs.

## [2026-08-10 23:28] - [FIX]

What: Disabled Nest in-process timers on Vercel, moved automation scans out of maintenance slots, and moved cron ingress into a standalone function with no Nest/BullMQ imports.

Why: Vercel cron-origin requests initialized the monolith's unreachable Railway-private Redis socket and reset Supabase connections after Pixel's schedule claim; maintenance timers amplified the failure.

Impact: Cron ingress imports no application runtime, performs no database/Redis work, and dispatches the existing awaited execution path as a normal request, with at most one minute of pickup latency. Persistent deployments retain their timer behavior; queue opt-in and delivery safety gates are unchanged.

Files: `apps/api/src/app.module.ts`, `apps/api/vercel.json`, cron runtime policy/config tests, `documentation/features/spaces-automation.md`.
