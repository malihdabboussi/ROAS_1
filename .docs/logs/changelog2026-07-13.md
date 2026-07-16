# Changelog - July 13, 2026

## [2026-07-13 20:12] - [FIX]

What: Removed missing `whatsapp` plugin from `docker/openclaw.json` and redeployed `roas-runtimes` so OpenClaw `/v1/responses` enables again.
Why: Invalid plugin allowlist made gateway config fail silent endpoint registration (`/v1/models` 200, `/v1/responses` 404 → chat `gateway_connection`), blocking Nate skill-1 after campaign-brain restore.
Impact: Authenticated `/v1/responses` returns 200; Nate on Impact called `search_campaign_brain` and streamed a Pre-Call Strategy Map draft from campaign brain evidence.
Files: `docker/openclaw.json`

## [2026-07-13 19:50] - [FEATURE]

What: Restored hireable-agent campaign brain read via new `search_campaign_brain` action (ns_memories on campaign-scoped `ns_brains`), wired through schemas/policy/MCP/vibey-backend, Strategist skill-1 guidance, and managed marketing baseline.
Why: Phase 2 removed campaign-brain agent tools; Nate could not run pre-call strategy against Impact's 290 campaign memories (wrong family / missing Agent Brain).
Impact: Marketing/Strategist agents can search client package knowledge with `campaign_id` (auto in campaign chat). `search_campaign_knowledge` stays removed. Requires Fly `roas-runtimes` deploy for production Nate.
Files: `artifact-brain-search-actions.service.ts`, `artifact-brain-scholar.service.ts`, `artifact-action.dto.ts`, `artifact-action-schemas.ts`, `artifact-action.registry.ts`, `artifact-capability.policy.ts`, `vibey-api-action-docs.ts`, `packages/agent-policy/*`, `docker/tools/vibey-backend/index.ts`, strategist skill/ROLE, tests

## [2026-07-13 18:46] - [FEATURE]

What: Installed Agency Strategist employee (Nate) with 5 ROAS strategy skills in the library, employee library Agency filter, and hired to test@gmail.com.
Why: Agency onboarding skills (precall / adjust / launch brief + market research + voice) need a hireable Strategist template before Flows automation.
Impact: Ready Employees shows Strategist under Agency; skill_library + template_skill_assignments seeded; Nate hired with synced skills. Skill-1 chat pulls Impact brain context but OpenClaw `/v1/responses` returns 404 on roas-runtimes (blocks completion).
Files: `docker/agents/templates/strategist/**`, `scripts/seed-strategist-skills.ts`, `scripts/generate-strategist-skills-migration.ts`, `supabase/migrations/20260714020000_strategist_agency_skills.sql`, `ready-employees-modal.constants.ts`, `agent-onboarding-profile.ts`, `agent-provisioning.service.ts`

## [2026-07-13 16:24] - [FIX]

What: Cleared 7 stuck `brain_pattern_analysis` outbox rows for test@gmail.com; campaign-scoped brain queues no longer merge account-wide cortex ops.
Why: Campaign Knowledge passes `campaignId` without `brainId`, so `listActiveJobs` still loaded every pending cortex crystallize job and showed a phantom “7 processing” badge.
Impact: Impact Campaign Knowledge queue only shows campaign import jobs; cortex “Crystallize beliefs…” jobs stay on brain-scoped views. Tests added.
Files: `brain-import-job-status.service.ts`, `brain-import-job-status.service.test.ts`

## [2026-07-13 16:20] - [FIX]

What: Mirrored Impact ROAS-BRAIN package into `space_semantic_objects` / chunks for campaign Impact's Space so Campaign Knowledge UI can render objects.
Why: First ingest wrote `ns_memories` on the campaign brain; Brain → Campaign Knowledge reads the space semantic graph (empty when no indexed space objects) — hence 0 objects/0 connections.
Impact: Campaign Knowledge / Impact should show package seeds + source items after refresh. Unrelated stuck "Crystallize beliefs" queue jobs are pending `brain_ops_outbox` pattern analysis on other brains, not Impact ingest.
Files: (one-off DB write via ingest follow-up; `scripts/roas/ingest-roas-brain-package.py` still memories-only)

## [2026-07-13 16:11] - [FEATURE]

What: Ingested Impact Elite Page Grader ROAS-BRAIN package into campaign **Impact** brain (test@gmail.com / ROAS Supabase), with embeddings backfilled.
Why: First one-client bridge test — land sources + structured seeds in ROAS-BRAIN without treating PG intel notes as canonical.
Impact: Campaign brain `a878c721-…` now has 290 memories (13 seeds + 277 source items) all embedded; 277 evidence chunks; campaign.context stamped with page_grader_client_id. Legacy intel notes skipped.
Files: `scripts/roas/ingest-roas-brain-package.py`

## [2026-07-13 11:31] - [FIX]

What: Fix Brain live voice mic capture so input levels and PCM actually flow while Listening.
Why: Mic graph was created only after the slow `ready` event (outside the click gesture), so AudioContext often stayed suspended; ScriptProcessor was also routed to speakers at full gain, which echoCancellation commonly silences.
Impact: Mic opens and AudioContext resumes before session create; PCM meters update even while connecting; capture is silenced to speakers via gain 0; WS attach only starts forwarding audio.
Files: `apps/web/src/features/brain/hooks/brain-live-session-audio.ts`, `apps/web/src/features/brain/hooks/brain-live-session-audio.test.ts`, `apps/web/src/features/brain/hooks/use-brain-live-session.ts`, `apps/web/src/features/brain/hooks/__tests__/use-brain-live-session-reconnect.test.ts`, `apps/web/src/features/spaces/components/chat/SpaceVoiceSessionView.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceLiveTranscript.tsx`

## [2026-07-13 10:50] - [STYLE]

What: Rebranded user-facing Vibey → ROAS across `apps/web`, swapped sidebar/favicon assets to the new ROAS wordmark + R icon (black for light mode, white for dark mode).
Why: Product brand is ROAS; the old Vibey logos/copy still appeared in the sidebar, page titles, placeholders, and powered-by strings.
Impact: Expanded hub/sidebar shows ROAS wordmark; collapsed rail and browser favicon use the R mark with correct light/dark variants; visible product copy says ROAS. Code identifiers (e.g. `VibeyLoadingOrb`, agent key `vibey`) unchanged.
Files: `apps/web/public/Logos/roas/*`, `apps/web/public/Logos/logov2/*`, `apps/web/public/favicon-*.png`, `apps/web/public/apple-touch-icon.png`, `apps/web/src/app/layout.tsx`, `SidebarWordmark.tsx`, `SidebarHqHubLogoButton.tsx`, `SidebarStudioHeader.tsx`, `home-dashboard-v4.config.ts`, plus ~140 user-facing string updates under `apps/web/src/`

## [2026-07-13 14:37] - [FIX]

What: Hub menu now opens Team, Spaces, and Brain expanded by default (Projects stays collapsed); campaign folders under Spaces remain collapsed; Search spaces control moved below the list so it only expands on click instead of leaving empty top space.
Why: Frequent destinations should be visible immediately when opening the logo menu, and the lone search icon row above Campaigns created awkward empty space.
Impact: Opening the expanded hub shows Manage Agents/Skills + DMs, Manage/Train Brain links, and Campaigns collapsed under Spaces; Projects stays closed unless you're on a projects route.
Files: `sidebar-hq-hub-menu.utils.ts`, `sidebar-hq-hub-menu.utils.test.ts`, `useSidebarController.ts`, `SidebarHqHubMenuSpacesSection.tsx`, `.docs/logs/changelog2026-07-13.md`

## [2026-07-13 16:24] - [FIX]

What: Removed the floating voice orb from the Brain visualization page dock and deleted `BrainVoiceTrigger`.
Why: The idle orb floated above the toolbar and cluttered the Brain canvas; voice remains available from brain menus / URL actions.
Impact: Brain page bottom dock shows only the toolbar controls; no floating orb above it.
Files: `BrainVisualizationDock.tsx`, `BrainVisualization.tsx`, `use-brain-visualization-actions.ts`, `BrainVoiceTrigger.tsx` (deleted), `BrainVisualization.test.tsx`, `use-brain-visualization-actions.test.tsx`, `.docs/logs/changelog2026-07-13.md`
