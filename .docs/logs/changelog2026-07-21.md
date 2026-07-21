# Changelog - July 21, 2026

## [2026-07-21 09:31] - [PERF]

What: Replaced four overlapping Slack Team scanners with one thread-aware observation pipeline. Added webhook capture, a persisted Slack event/channel/member ledger, exact ingestion and analysis cursors, bounded unified signal analysis, fetch-once Brain backfill fan-out, database-first Manage People/Channels, explicit Refresh Slack, and per-run Slack/model/cost telemetry.

Why: The four 15-minute loops independently downloaded the same 30-minute Slack window, ignored messages after the first 300, omitted thread replies, and repeated channel downloads for every Person/Customer/Campaign Brain fork. Manage People also refreshed the whole workspace on every mount.

Impact: Normal Slack events are stored once, fallback reconciliation fetches each selected channel once, successful Team runs do not re-analyze the same messages, thread replies inform unanswered/risk detection, Brain forks reuse the stored period, and normal People/Channels loads issue database reads instead of Slack discovery calls. Existing Slack Team automations consolidate to one enabled Shadow loop with the combined safety limit.

Files: `apps/api/src/modules/slack/services/slack-observation.service.ts`, `apps/api/src/modules/slack/repositories/slack-observation.repository.ts`, `apps/api/src/modules/slack/repositories/slack-people-index.repository.ts`, `apps/api/src/modules/slack/services/slack.service.ts`, `apps/api/src/modules/slack/services/slack-people.service.ts`, `apps/api/src/modules/slack/controllers/slack-people.controller.ts`, `apps/api/src/modules/slack/slack.module.ts`, `apps/api/src/modules/spaces/services/slack-team-loop.service.ts`, `apps/api/src/modules/spaces/data/space-automation-template-catalog-team.ts`, `apps/api/src/modules/brain/services/brain-import-jobs-input.base.ts`, `apps/api/src/modules/brain/services/brain-import-jobs.base.ts`, `apps/web/src/features/team-2/hooks/use-slack-people.ts`, `apps/web/src/features/team-2/services/slack-people.service.ts`, `apps/web/src/features/team-2/components/people/SlackPeopleView.tsx`, `apps/web/src/features/team-2/config/messages.config.ts`, `supabase/migrations/20260721100000_slack_observation_ledger.sql`, `supabase/migrations/20260721101000_unify_slack_team_observation_loop.sql`, `documentation/features/spaces-automation.md`, `documentation/features/integration-connections.md`, `documentation/features/meeting-follow-up-slack.md`

## [2026-07-21 13:30] - [FIX]

What: Restored Fathom-dependent automations after a successful reconnect and changed Webinar Fulfillment call intake to automatically match connected Fathom calls from invitees, email domains, names, title/topic, timing, and transcript evidence.

Why: Disconnect disabled the Fathom automation route, but reconnect did not reverse that state. The Webinar playbook also required a manual recording selection even though Fathom already exposes enough meeting metadata for deterministic matching.

Impact: Reconnecting Fathom now restores only routes disabled by that disconnect, manually disabled routes remain untouched, and Webinar missions no longer require a recording picker unless candidates remain genuinely tied. Production's affected route was restored and five missed recent calls were backfilled idempotently.

Files: `apps/api/src/modules/integrations/fathom/services/fathom-oauth.service.ts`, `apps/api/src/modules/spaces/repositories/space-automation-external-events.repository.ts`, `apps/api/src/modules/spaces/services/space-automation-service-01.base.ts`, `apps/api/src/modules/spaces/services/space-automation.service.ts`, `apps/mission-worker/src/modules/missions/playbooks/webinar-fulfillment.playbook.ts`, focused tests, and feature documentation.

## [2026-07-21 14:00] - [FIX]

What: Removed an OpenRouter-incompatible `maxItems` keyword from the Slack Team Intelligence response schema and capped each scheduled run to one 250-message analysis batch.

Why: Azure-backed Claude requests rejected the schema before analysis, while the previous pending-event limit allowed up to eight model calls in one scheduled run.

Impact: Slack Team Intelligence can analyze successfully again, makes at most one model call per scheduled run, preserves remaining messages in the observation ledger for later runs, and continues advancing its exact cursor only after success.

Files: `apps/api/src/modules/spaces/services/slack-team-loop.service.ts`, `apps/api/src/modules/spaces/services/__tests__/slack-team-loop.service.test.ts`, `documentation/features/spaces-automation.md`
