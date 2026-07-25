# Changelog - July 25, 2026

## 2026-07-25 08:18 - [FEATURE]

What: Added direct text and image editing in full funnel/website mode, serialized background saves with live status feedback, date-grouped and bookmarkable history, one-click first publish, and an explicit Publish updates action.

Why: The builder had durable file history and visual styling, but the core create-edit-recover-publish loop required too many indirect steps compared with leading AI website builders.

Impact: Users can edit selected content in place, replace images from their media library, understand when changes are saved, mark important versions, restore without losing later history, and publish through a clearer snapshot workflow.

Files: `apps/web/src/features/studio`, `apps/web/src/features/spaces/components/chat/FunnelDesignChatView.tsx`, `apps/web/src/lib/artifacts`, `apps/api/src/modules/funnels`, `documentation/features/website-artifacts.md`

## [2026-07-25 08:22] - [FIX]

What: Added an explicit `copy_approved` handoff for exact-copy IG organic video launches, taught the mission worker to skip only the redundant second confirmation, and added a guarded database migration that updates unchanged skill copies while preserving user-edited variants.
Why: The video skill stopped for copy confirmation even after a user filled the exact-copy form and clicked Create, preventing unattended UI, chat, and mission production from reaching footage and rendering.
Impact: Exact-copy launches can continue directly into video production; agent-written copy still requires human approval. Web payload, worker playbook, and skill migration contract tests pass.
Files: `ig-organic-video.ts`, `ig-organic-video.test.ts`, `ig-organic-video-ad.playbook.ts`, `ig-organic-video-ad.playbook.test.ts`, `ig-organic-video-ad-skill-contract.test.ts`, `20260725153000_ig_organic_video_preapproved_copy.sql`, `social-research.md`

## [2026-07-25 14:16] - [FIX]

What: Added a Railway-specific upload ignore file for the mission worker and documented why its deployment context excludes unrelated applications.
Why: Railway CLI indexed the entire monorepo and failed on an unrelated tracked machine-local symlink before the worker build could start.
Impact: Isolated mission-worker releases can be uploaded without bundling unrelated apps or failing on files outside the worker image.
Files: `.railwayignore`, `scripts/roas/README.md`

## [2026-07-25 14:20] - [FIX]

What: Applied and recorded the preapproved-copy migration on ROAS production, archive-deployed the isolated web release, and deployed the mission worker from the same release branch.
Why: Complete the production side of the ad-creation acceptance fix after local contract and rendering validation.
Impact: `app.roas.io` now serves combined latest-main deployment `dpl_CjrjiPDeFHCzjevHASubF6wCoxe1` (superseding the initial isolated deployment `dpl_HS3gpvJftMUxLWwfQhdrB62Xuaox`); Railway mission worker deployment `dd3e5dfc-c1ea-499e-a9ba-3443348a16a3` is healthy with its outbox listener and scheduler armed; production migration `20260725153000` is recorded on `lhfgtsjetcardinpgouq`.
Files: ROAS production Supabase, Vercel `roas-web`, Railway `roas-platform`
