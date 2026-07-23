# Changelog - July 23, 2026

## [2026-07-23 11:18] - [FEATURE]

What: Replaced the Ads Research metric and summary-card stack with one linked narrative summary, added a compact circular production handoff, and introduced a dedicated Production mode between Research and Launch.

Why: Research evidence, production decisions, and campaign launching were competing in one report. The workflow needed a readable research conclusion and a distinct place to approve concepts and track recording, design, and build progress.

Impact: Blaze's outputs now open directly from the summary paragraph. Starting production preserves the source research mission, opens the new Production workspace, and continues through the existing persisted approval and Meta Ads Launch handoff.

Files: `apps/web/src/features/spaces/components/ads-research/*`, `apps/web/src/features/spaces/components/artifacts/paid-ads/PaidAdsSpaceView.tsx`, `apps/web/src/features/spaces/views/artifacts/*`, `apps/web/src/features/spaces/types/space-schema.ts`, `documentation/features/social-research.md`

## [2026-07-23 13:02] - [FEATURE]

What: Added fail-closed Slack Pixel authorization driven by Manage People, including Slack Connect classification, all-human channel checks, owner-funded internal execution, owner-only Personal Brain access, and short denial or temporary-verification replies.

Why: Slack identities without platform accounts need useful ROAS access, but clients, unknown users, mixed channels, and internal teammates requesting the owner's private memory must never inherit the Slack connection owner's full identity.

Impact: Internal people can use organization capabilities and credits without portal accounts. External, Ignored, unresolved, and unsafe-channel requests stop before file processing or agent execution. Non-owner Slack principals lose Personal Brain prompt access and are denied across direct, broad-search, Atlas, Brain Scholar, and transfer tool routes.

Files: `apps/api/src/modules/slack/*`, `apps/agent-api/src/modules/chat/*`, `apps/agent-api/src/modules/artifacts/services/artifact-access-policy-actions.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-channel-principal.policy.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.ts`, `apps/web/src/features/team-2/config/messages.config.ts`, `documentation/features/integration-connections.md`
