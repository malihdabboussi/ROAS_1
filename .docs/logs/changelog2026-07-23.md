# Changelog - July 23, 2026

## [2026-07-23 11:18] - [FEATURE]

What: Replaced the Ads Research metric and summary-card stack with one linked narrative summary, added a compact circular production handoff, and introduced a dedicated Production mode between Research and Launch.

Why: Research evidence, production decisions, and campaign launching were competing in one report. The workflow needed a readable research conclusion and a distinct place to approve concepts and track recording, design, and build progress.

Impact: Blaze's outputs now open directly from the summary paragraph. Starting production preserves the source research mission, opens the new Production workspace, and continues through the existing persisted approval and Meta Ads Launch handoff.

Files: `apps/web/src/features/spaces/components/ads-research/*`, `apps/web/src/features/spaces/components/artifacts/paid-ads/PaidAdsSpaceView.tsx`, `apps/web/src/features/spaces/views/artifacts/*`, `apps/web/src/features/spaces/types/space-schema.ts`, `documentation/features/social-research.md`
