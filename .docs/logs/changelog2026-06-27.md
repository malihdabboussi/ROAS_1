# Changelog - June 27, 2026

## 2026-06-27 17:33 - [FIX]

What: Added a provider billing attempt ledger, OpenRouter generation lookup utilities, API settlement endpoints, incurred-cost credit debiting, agent-api stream-start attempt recording, OpenClaw billing-start SSE forwarding, and an env-gated mission-worker reconciler trigger.

Why: OpenRouter costs were only captured from completion metadata, so interrupted streams or missing generation IDs could not be reconciled later, and incurred provider costs could be undercharged by available-balance capping.

Impact: OpenRouter chat streams can now persist a provider generation ID before final completion and settle exact provider cost asynchronously. Settled incurred usage records full credits charged, marks overdraft metadata when needed, and keeps credit mutation inside the API backend.

Files: `supabase/migrations/20260627103000_provider_billing_attempts.sql`, `packages/api-shared/src/services/provider-billing/*`, `apps/api/src/modules/provider-billing/*`, `apps/api/src/modules/billing/*`, `apps/agent-api/src/modules/billing/services/provider-billing-attempts.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-*`, `apps/openclaw/src/agents/pi-embedded-runner/*`, `apps/openclaw/src/gateway/*`, `apps/mission-worker/src/modules/provider-billing/*`, `patches/@mariozechner__pi-ai@0.52.12.patch`

## 2026-06-27 17:46 - [FIX]

What: Applied the provider billing attempts migration through Supabase MCP to staging and production, then verified the table, claim RPC, added `ai_usage_events` columns, unique indexes, and remote migration history entries.

Why: The provider billing ledger schema must exist in the databases before deployed provider-attempt recording and settlement code can persist durable OpenRouter billing identities.

Impact: Staging and production are ready to store provider billing attempts and link settled AI usage events to those attempts.

Files: `supabase/migrations/20260627103000_provider_billing_attempts.sql`, Supabase project `xeceeohfjugfwurailuq`, Supabase project `qfrvykscoymiwwgysvsr`

## 2026-06-27 17:49 - [ARCH]

What: Finished the Studio artifact preview host LOC split by extracting private content and funnel/page preview components and moving host prop contracts into a local type file.

Why: `ArtifactPreviewPane.tsx` was still above the frontend component cap after the ad-panel extraction, and the new content file needed to stay under the same cap without introducing a host/content type cycle.

Impact: Artifact preview behavior stays locked by the mounted Spaces wrapper test, while the host and extracted preview pieces are now under the frontend LOC cap. The transitional adapter remains the explicit next shared-boundary cleanup target.

Files: `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewContent.tsx`, `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewFunnelContent.tsx`, `apps/web/src/features/studio/components/preview/artifacts/preview/artifact-preview-pane.types.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 17:54 - [ARCH]

What: Added a Spaces-owned artifact preview wrapper that supplies the current Spaces ad, email, form, funnel, and social-post renderers explicitly.

Why: The shared artifact preview adapter still carries transitional renderer defaults, so Spaces needed a feature-owned wrapper before those hidden defaults can be removed safely.

Impact: Spaces slide-over preview behavior stays unchanged and covered by the mounted wrapper test, while the next adapter cleanup can target shared fallback removal without changing the Spaces caller again.

Files: `apps/web/src/features/spaces/components/artifacts/SpacesArtifactPreviewPane.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 18:01 - [FIX]

What: Fixed the Home daily recommendation strip slide typing so TypeScript preserves the existing suggestion-versus-daily discriminated union.

Why: The previous inferred array return widened the suggestion slide literal to `{ kind: string; key: string }`, which blocked `@vibey/web` typecheck even though the mounted strip behavior was already green.

Impact: The Phase 3 web typecheck blocker is cleared without changing recommendation rendering or CTA behavior. The remaining Home strip cross-feature import and token cleanup debt is logged for a dedicated boundary batch.

Files: `apps/web/src/features/home/components/DailyRecommendationStrip.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 18:06 - [ARCH]

What: Rewired the Home daily recommendation strip from feature-private Org, Settings, and Skill-Recommendations imports to existing shared lib barrels.

Why: Phase 3 frontend cleanup requires features to avoid importing private internals from other features when documented shared domain barrels already exist.

Impact: The strip keeps the same mounted behavior while three cross-feature import edges are removed. The remaining Brain action import is tracked separately because those wrappers are not yet exposed from `@/lib/brain`.

Files: `apps/web/src/features/home/components/DailyRecommendationStrip.tsx`, `apps/web/src/features/home/components/DailyRecommendationStrip.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 18:10 - [ARCH]

What: Added shared Brain API wrappers for Customer Brain/Cortex actions and rewired the Home daily recommendation strip to use `@/lib/brain`.

Why: The Home strip was still importing Brain feature internals directly after the Org/Settings/Skill-Recommendations cleanup.

Impact: The Home strip now has zero direct Brain/Org/Settings/Skill-Recommendations feature-private imports. Shared Brain action endpoints are covered by focused wrapper tests and documented in the frontend shared-surfaces registry.

Files: `apps/web/src/lib/brain/brain-api.ts`, `apps/web/src/lib/brain/brain-api.test.ts`, `apps/web/src/features/home/components/DailyRecommendationStrip.tsx`, `apps/web/src/features/home/components/DailyRecommendationStrip.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 18:16 - [STYLE]

What: Replaced the Home daily recommendation strip's remaining raw gap utilities with approved spacing-token utilities.

Why: The Phase 3 frontend design guard requires tokenized spacing classes when matching `gap-spacing-*` utilities exist.

Impact: Home strip rendering behavior stays unchanged while the touched strip/test style scan is clean for the tracked raw `gap-2`/`gap-3` debt.

Files: `apps/web/src/features/home/components/DailyRecommendationStrip.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 18:23 - [ARCH]

What: Moved the funnel status glass helpers and capsule into shared artifact UI and rewired Studio/Spaces consumers to `@/components/artifacts`.

Why: Studio `FunnelToolbar.tsx` was importing a Spaces-private artifact status utility directly, which violates the Phase 3 shared-boundary rule.

Impact: Funnel status labels and badge classes stay covered by focused tests, the old Spaces path remains a compatibility export, and the direct Studio-to-Spaces status import is gone. `FunnelToolbar.tsx` remains tracked LOC debt.

Files: `apps/web/src/components/artifacts/funnel-status-glass.tsx`, `apps/web/src/components/artifacts/funnel-status-glass.test.tsx`, `apps/web/src/components/artifacts/index.ts`, `apps/web/src/features/spaces/components/artifacts/funnel-status-glass.tsx`, `apps/web/src/features/spaces/components/artifacts/funnel-status-glass.test.tsx`, `apps/web/src/features/studio/components/preview/FunnelToolbar.tsx`, `apps/web/src/features/spaces/components/artifacts/ArtifactSpaceView.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 18:43 - [ARCH]

What: Moved artifact menu contracts and mutation wrappers into shared artifact/campaign lib boundaries, added mounted menu-hook coverage, and tokenized the touched Spaces menu dropdown classes.

Why: Studio and Spaces artifact surfaces were sharing avatar/presentation/sequence menu contracts through Spaces-private hook paths and Studio campaign service re-exports.

Impact: Avatar, presentation, and sequence menu hooks now depend on shared artifact/campaign APIs while preserving existing rename/campaign-loading behavior. Remaining smart dropdown ownership and LOC debt is tracked for the next Phase 3 menu batch.

Files: `apps/web/src/lib/artifacts/artifact-menu-contracts.ts`, `apps/web/src/lib/artifacts/artifact-menu-actions-api.ts`, `apps/web/src/lib/artifacts/artifact-menu-actions-api.test.ts`, `apps/web/src/lib/artifacts/index.ts`, `apps/web/src/lib/campaigns/campaign-api.ts`, `apps/web/src/lib/campaigns/campaign-api.test.ts`, `apps/web/src/features/spaces/components/artifacts/artifact-menu-actions-hooks.test.tsx`, `apps/web/src/features/spaces/components/artifacts/*MenuDropdown.tsx`, `apps/web/src/features/spaces/components/artifacts/*/use-*-menu-actions.ts`, `apps/web/src/features/studio/services/campaign.service.ts`, `apps/web/src/features/studio/components/preview/PresentationToolbar.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 19:06 - [ARCH]

What: Split the presentation artifact menu into shared props-only UI, a shared delete confirmation, a shared presentation menu action hook, and thin Spaces/Studio wrappers.

Why: Studio preview surfaces were still importing the Spaces smart presentation dropdown directly.

Impact: `PresentationPreview.tsx` and `PresentationToolbar.tsx` now use a Studio-owned wrapper, the shared artifact menu files have no feature imports, and `PresentationMenuDropdown.tsx` dropped from 501 LOC to 77 LOC. Avatar and sequence menu boundaries remain tracked.

Files: `apps/web/src/components/artifacts/PresentationArtifactMenuDropdown.tsx`, `apps/web/src/components/artifacts/PresentationArtifactMenuSubmenu.tsx`, `apps/web/src/components/artifacts/ArtifactDeleteConfirmModal.tsx`, `apps/web/src/lib/artifacts/use-presentation-menu-actions.ts`, `apps/web/src/features/spaces/components/artifacts/presentation/PresentationMenuDropdown.tsx`, `apps/web/src/features/studio/components/preview/StudioPresentationMenuDropdown.tsx`, `apps/web/src/features/studio/components/preview/PresentationToolbar.tsx`, `apps/web/src/features/studio/components/preview/PresentationPreview.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 19:21 - [ARCH]

What: Split the avatar artifact menu into shared props-only UI, a shared avatar menu action hook, and thin Spaces/Studio wrappers.

Why: Studio `AvatarPreview.tsx` was still importing the Spaces smart avatar dropdown and old avatar target type path directly.

Impact: `AvatarPreview.tsx` now uses a Studio-owned wrapper, the shared avatar menu files have no feature imports, and `AvatarMenuDropdown.tsx` dropped from 341 LOC to 71 LOC. Sequence menu ownership remains tracked.

Files: `apps/web/src/components/artifacts/AvatarArtifactMenuDropdown.tsx`, `apps/web/src/components/artifacts/avatar-artifact-menu-types.ts`, `apps/web/src/lib/artifacts/use-avatar-menu-actions.ts`, `apps/web/src/features/spaces/components/artifacts/avatar/AvatarMenuDropdown.tsx`, `apps/web/src/features/studio/components/preview/StudioAvatarMenuDropdown.tsx`, `apps/web/src/features/studio/components/preview/AvatarPreview.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 19:31 - [UTIL]

What: Added a repo-local `mobile-optimization` skill with an audit-first workflow and a bundled Playwright mobile responsiveness audit script.

Why: Mobile optimization work needs a repeatable way to find desktop-only frontend surfaces while preserving the existing Vibey design instead of redesigning pages.

Impact: Agents can now list inferred app routes, audit supplied or static routes across phone/tablet viewports, collect overflow/tap-target/fixed-width findings, and use the skill workflow to mine existing responsive patterns before making scoped fixes.

Files: `.agents/skills/mobile-optimization/SKILL.md`, `.agents/skills/mobile-optimization/agents/openai.yaml`, `.agents/skills/mobile-optimization/scripts/mobile-responsive-audit.mjs`

## 2026-06-27 19:44 - [UTIL]

What: Added Playwright login support to the mobile responsiveness audit, including a YC demo login preset, generated storage-state reuse, and split route/auth helper scripts.

Why: Mobile audits of the actual app need authenticated coverage for dashboard routes, and the YC demo account is the stable seeded workspace for broad product checks.

Impact: The mobile audit can now create a session through the login UI, reuse an existing storage state, keep credentials in env/local gitignored files, and audit authenticated routes without hardcoding secrets into the skill.

Files: `.agents/skills/mobile-optimization/SKILL.md`, `.agents/skills/mobile-optimization/scripts/mobile-responsive-audit.mjs`, `.agents/skills/mobile-optimization/scripts/mobile-responsive-auth.mjs`, `.agents/skills/mobile-optimization/scripts/mobile-responsive-routes.mjs`

## 2026-06-27 19:36 - [ARCH]

What: Split the sequence artifact menu into shared props-only UI, a shared sequence menu action hook, and thin Spaces/Studio wrappers.

Why: Studio `SequencePreview.tsx` was still importing the Spaces smart sequence dropdown directly.

Impact: `SequencePreview.tsx` now uses a Studio-owned wrapper, the shared sequence menu files have no feature imports, and Spaces-only analytics view/store wiring stays in the Spaces wrapper. The remaining work is oversized Studio parent decomposition.

Files: `apps/web/src/components/artifacts/SequenceArtifactMenuDropdown.tsx`, `apps/web/src/components/artifacts/sequence-artifact-menu-types.ts`, `apps/web/src/lib/artifacts/use-sequence-menu-actions.ts`, `apps/web/src/features/spaces/components/artifacts/sequence/SequenceMenuDropdown.tsx`, `apps/web/src/features/spaces/components/artifacts/sequence/use-sequence-menu-actions.ts`, `apps/web/src/features/studio/components/preview/StudioSequenceMenuDropdown.tsx`, `apps/web/src/features/studio/components/preview/SequencePreview.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 19:57 - [ARCH]

What: Added mounted `SequencePreview` characterization coverage and split the sequence email editor card, toolbar/menu row, and carousel/pagination shell into local Studio components.

Why: Phase 3 still had `SequencePreview.tsx` over the frontend component cap after the sequence menu boundary was fixed.

Impact: `SequencePreview.tsx` is now under the 400 LOC component cap while sequence loading, navigation, add-email/refetch behavior, and render stability stay covered by the mounted test.

Files: `apps/web/src/features/studio/components/preview/SequencePreview.tsx`, `apps/web/src/features/studio/components/preview/SequencePreview.test.tsx`, `apps/web/src/features/studio/components/preview/SequenceEmailEditorCard.tsx`, `apps/web/src/features/studio/components/preview/SequencePreviewToolbar.tsx`, `apps/web/src/features/studio/components/preview/SequenceEmailCarousel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 20:18 - [ARCH]

What: Added mounted `AvatarPreview` characterization coverage and split the avatar persona body, demographics hero card, recursive persona value rendering, toolbar chrome, and edit helpers into local Studio files.

Why: Phase 3 still had `AvatarPreview.tsx` over the frontend component cap after the avatar menu boundary was fixed.

Impact: `AvatarPreview.tsx` is now under the 400 LOC component cap while avatar loading, edit/save behavior, custom fields, and render stability stay covered by the mounted test.

Files: `apps/web/src/features/studio/components/preview/AvatarPreview.tsx`, `apps/web/src/features/studio/components/preview/AvatarPreview.test.tsx`, `apps/web/src/features/studio/components/preview/AvatarPreviewBody.tsx`, `apps/web/src/features/studio/components/preview/AvatarPreviewHeroCard.tsx`, `apps/web/src/features/studio/components/preview/AvatarPreviewPersonaValue.tsx`, `apps/web/src/features/studio/components/preview/AvatarPreviewToolbar.tsx`, `apps/web/src/features/studio/components/preview/avatar-preview-persona-types.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 20:31 - [FIX]

What: Closed the remaining provider billing charge gaps by forcing paid provider calls through durable attempts, owner-aware settlement, incurred-credit debits, and a static payment-path guard.

Why: Customer-triggered OpenRouter, Gemini, Deepgram, DataForSEO, ScrapeCreators, and live Brain paths could previously finish after provider cost was incurred while charge recording was missing, detached, capped, or platform-owned.

Impact: OpenRouter streams and direct calls now have durable provider attempts, post-hoc settlement, authenticated TSX repair ownership, fail-closed billing context checks, full incurred debit behavior, and tests that block future uncharged provider paths.

Files: `packages/api-shared/src/services/provider-billing/*`, `apps/api/src/modules/provider-billing/*`, `apps/api/src/modules/billing/services/credits-service-processing.base.ts`, `apps/agent-api/src/modules/billing/services/*`, `apps/agent-api/src/modules/chat/services/*`, `apps/agent-api/src/modules/brain/**/*`, `apps/api/src/modules/brain/**/*`, `apps/api/src/modules/media/**/*`, `apps/api/src/modules/spaces/**/*`, `apps/api/src/modules/themes/**/*`, `apps/api/src/modules/team-roster/**/*`, `apps/api/src/modules/conversations/**/*`, `apps/api/src/modules/composio/**/*`, `apps/mission-worker/src/modules/provider-billing/*`, `apps/mission-worker/src/modules/brain-ops/**/*`, `apps/mission-worker/src/modules/missions/services/context/*`, `apps/web/src/app/api/tsx-repair/route.ts`, `supabase/migrations/20260627183000_provider_billing_settlement_guards.sql`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 20:31 - [ARCH]

What: Added mounted `PresentationToolbar` characterization coverage and split viewport, download, and share menu rendering into local Studio toolbar components.

Why: Phase 3 still had `PresentationToolbar.tsx` over the frontend component cap after the presentation menu boundary was fixed.

Impact: `PresentationToolbar.tsx` is now under the 400 LOC component cap while viewport switching, download/export, publish, menu opening, and render stability stay covered by the mounted test.

Files: `apps/web/src/features/studio/components/preview/PresentationToolbar.tsx`, `apps/web/src/features/studio/components/preview/PresentationToolbar.test.tsx`, `apps/web/src/features/studio/components/preview/PresentationViewportMenu.tsx`, `apps/web/src/features/studio/components/preview/PresentationDownloadMenu.tsx`, `apps/web/src/features/studio/components/preview/PresentationShareMenu.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-06-27 20:42 - [ARCH]

What: Added mounted characterization coverage for the artifact preview transitional adapter.

Why: The adapter still provides private Spaces ad/email/form/funnel defaults for Studio compatibility, so removing those imports without a behavior lock would risk breaking Studio artifact previews.

Impact: The current adapter fallback behavior and caller slot override behavior are now covered before the next ownership split. The adapter import cleanup remains open until ad/funnel menu wrappers and email/form renderers have Studio-owned or true shared ownership.

Files: `apps/web/src/components/artifacts/ArtifactPreviewPaneAdapter.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`
