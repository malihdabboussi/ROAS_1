# Changelog - July 31, 2026

## 2026-07-31 12:08 - [FIX]

What: Added a mission-worker Dockerfile-specific ignore file so Railway receives the worker and required workspace packages while excluding unrelated applications and build artifacts.

Why: The shared Fly build ignore file excluded `apps/mission-worker`, causing Railway production builds to find the Dockerfile but fail when copying the worker source.

Impact: Mission-worker Git deployments now use the full required monorepo context without increasing the Fly runtime build context.

Files: `apps/mission-worker/Dockerfile.dockerignore`, `.docs/logs/changelog2026-07-31.md`

## [2026-07-31 12:10] - [FEATURE]

What: Pixel Slack Team Intelligence now delivers curated digests with suggested actions and thread follow-ups instead of one-off alert posts with a compliance disclaimer.

Why: Active delivery was firing one raw “Name raised a … in #channel” message per signal (plus “Pixel will not message the external person”), which felt nothing like Viktor’s compiled coworker DM + threads.

Impact: Due cooling signals for the same recipient batch into one “here are N things…” DM; later signals within 12h reply in that digest thread; framing asks for drafts/next steps; 18 related unit tests pass.

Files:
- `apps/api/src/modules/spaces/services/slack-team-signal-message.ts`
- `apps/api/src/modules/spaces/services/slack-team-signal-delivery.service.ts`
- `apps/api/src/modules/spaces/services/slack-team-loop.service.ts`
- `apps/api/src/modules/spaces/services/slack-team-loop-analysis.ts`
- `apps/api/src/modules/spaces/repositories/slack-team-loop.repository.ts`
- `apps/api/src/modules/spaces/services/__tests__/slack-team-signal-message.test.ts`
- `apps/api/src/modules/spaces/services/__tests__/slack-team-signal-delivery.service.test.ts`
- `apps/api/src/modules/spaces/services/__tests__/slack-team-loop.service.test.ts`
- `documentation/features/integration-connections.md`

## [2026-07-31 12:15] - [FIX]

What: Rewrote Pixel Slack digest copy into conversational narrative (personalized greeting + prose paragraphs) instead of label-style “Name — kind in #channel” lists.

Why: Dylan feedback — messages should feel like Viktor (“Hey Dylan, hope you're having a good Friday… Georgette flagged… Yasir posted asking…”).

Impact: Outbound digests/thread follow-ups now greet by first name with varying cadence and narrate each signal; 19 related tests pass.

Files:
- `apps/api/src/modules/spaces/services/slack-team-signal-message.ts`
- `apps/api/src/modules/spaces/services/slack-team-signal-delivery.service.ts`
- `apps/api/src/modules/spaces/services/slack-team-loop.service.ts`
- `apps/api/src/modules/spaces/services/__tests__/slack-team-signal-message.test.ts`
- `apps/api/src/modules/spaces/services/__tests__/slack-team-signal-delivery.service.test.ts`
- `apps/api/src/modules/spaces/services/__tests__/slack-team-loop.service.test.ts`
