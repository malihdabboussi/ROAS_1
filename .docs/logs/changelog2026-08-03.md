# Changelog - August 03, 2026

## [2026-08-03 10:15] - [FEATURE]

What: Shipped Pixel Slack Team Intelligence digest delivery (batched conversational DMs + 12h thread follow-ups) that had been sitting as local uncommitted work since 2026-07-31.

Why: Active delivery was still sending one raw alert DM per signal in production because the digest composer never left the working tree.

Impact: Once merged/deployed, due cooling signals for the same recipient batch into one Viktor-style digest DM; later signals within 12h reply in that digest thread.

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
- `.docs/logs/changelog2026-07-31.md`
