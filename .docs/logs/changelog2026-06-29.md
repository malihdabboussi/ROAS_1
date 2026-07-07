# Changelog - June 29, 2026

## [2026-06-29 11:15] - [ARCH]

What:
- Extracted Channels composer payload, send, and reset state into `use-channel-composer-submit.ts`.
- Pruned stale changelog `.docs/logs/changelog2026-06-14.md` per the 14-day log policy.

Why:
- Continue Phase 3 frontend decomposition while preserving mounted composer behavior and avoiding generated cache churn.

Impact:
- Behavior-neutral refactor. Composer payload assembly, upload gating, draft reset, embedded handle payload reads, and send/reset sequencing remain covered by focused tests.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-submit.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-29.md`
- `.docs/logs/changelog2026-06-14.md`

## [2026-06-29 11:35] - [ARCH]

What:
- Extracted Channels composer `@@` entity mention orchestration into `use-channel-composer-entity-mention.ts`.
- Added mounted composer coverage for local People entity mention insertion through the embedded handle payload.

Why:
- Continue Phase 3 frontend decomposition while preserving the task activity/send-to-agent composer contract.

Impact:
- Behavior-neutral refactor. `ChannelComposer.tsx` is reduced to 630 LOC; the new hook is 389 LOC. Entity mention payloads, slash menu behavior, and broader Channels mounted tests remain green.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-entity-mention.ts`
- `apps/web/src/features/channels/components/ChannelComposer.test.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-slash-menu.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 11:44] - [ARCH]

What:
- Extracted Channels composer member mention state into `use-channel-composer-member-mention.ts`.
- Extracted TipTap editor construction into `use-channel-composer-editor.ts`.
- Extracted the render-only main composer controls into `ChannelComposerMainControls.tsx`.

Why:
- Finish the current `ChannelComposer.tsx` LOC decomposition and clear the strict frontend component cap.

Impact:
- Behavior-neutral refactor. `ChannelComposer.tsx` is now 393 LOC and normal focused ESLint passes with `max-lines` enabled. Mounted composer, slash hook, broader Channels regression tests, and full web typecheck passed.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/ChannelComposerMainControls.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-editor.ts`
- `apps/web/src/features/channels/components/use-channel-composer-member-mention.ts`
- `apps/web/src/features/channels/components/ChannelComposer.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 14:07] - [ARCH]

What:
- Split the Spaces task detail modal's left panel, Cursor status card, prop contract, and campaign-agent mapping into focused local files.
- Moved task detail's campaign/team/mission type imports to shared `@/lib` surfaces.
- Added a non-barrel deliverables carousel adapter and documented it as transitional shared-boundary debt.

Why:
- Continue Phase 3 frontend architecture cleanup with a mounted behavior lock while clearing the `TaskDetailModal.tsx` LOC and direct cross-feature import violations.

Impact:
- Behavior-neutral refactor. `TaskDetailModal.tsx` is now 390 LOC; mounted task detail behavior, focused ESLint, and full web typecheck pass.

Files:
- `apps/web/src/features/spaces/components/task-detail/TaskDetailModal.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskDetailMainPanel.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskCursorStatusCard.tsx`
- `apps/web/src/features/spaces/components/task-detail/task-detail-modal.types.ts`
- `apps/web/src/features/spaces/components/task-detail/task-campaign-agents.ts`
- `apps/web/src/features/spaces/components/task-detail/TaskDetailModal.test.tsx`
- `apps/web/src/components/deliverables/DeliverablesCarouselAdapter.tsx`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.vibey/refresh-log.md`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 11:37] - [FIX]

What:
- Brought local equivalents of PRs #51, #52, and #53 into the current checkout without importing stale changelog churn.
- Allowed Spaces task statuses to accept custom workflow values and display `waiting_qa` as `Waiting QA`.
- Scoped campaign list cache keys by active org/personal context and mapped missing OpenAI Codex subscription auth to the reconnect banner.

Why:
- Close already-reviewed PRs only after their fixes exist locally in the current code shape.

Impact:
- Custom task statuses no longer lose readable labels, org switching no longer reuses a single campaign list cache key, and Codex subscription-model chat failures show the correct reconnect path.

Files:
- `apps/web/src/lib/spaces/space-item-types.ts`
- `apps/web/src/features/channels/components/use-channel-composer-slash-menu.ts`
- `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`
- `apps/web/src/features/spaces/components/space-item-values.ts`
- `apps/web/src/features/spaces/components/shared/SharedSpaceView.tsx`
- `apps/web/src/features/spaces/components/your-turn/YourTurnCard.tsx`
- `apps/web/src/lib/campaigns/campaign-api.ts`
- `apps/web/src/features/studio/services/campaign.service.ts`
- `apps/web/src/components/layout/sidebar/useSidebarCampaignsCore.ts`
- `apps/web/src/lib/agents/use-agent-menu-actions.ts`
- `apps/web/src/lib/agents/use-team-container-campaign-data.ts`
- `apps/web/src/lib/utils/clear-org-state.ts`
- `apps/agent-api/src/modules/chat/chat-stream-errors.ts`
- `apps/web/src/lib/chat/chat-stream-errors.config.ts`
- `documentation/frontend-shared-surfaces.md`
- `documentation/features/chat-stream-recovery.md`

## [2026-06-29 11:40] - [FIX]

What:
- Subscribed the Spaces realtime hook to active `spaces` row updates and merged schema changes through the existing Spaces store path.
- Added focused coverage for item realtime events and schema realtime updates.

Why:
- Agent-authored status schema changes update `spaces.schema`, while the frontend only listened to `space_items`, leaving status options stale until refresh.

Impact:
- Space status/category/schema changes from agents or other users appear live without a manual refresh; existing item realtime behavior is unchanged.

Files:
- `apps/web/src/features/spaces/hooks/use-space-items-realtime.ts`
- `apps/web/src/features/spaces/hooks/use-space-items-realtime.test.tsx`
- `documentation/features/space-items-custom-data-drive.md`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 11:53] - [ARCH]

What:
- Moved `EntityMentionPicker.tsx` from the Spaces `OptionBadge` compatibility export to the shared status UI import.
- Added `fixedFloatingPortalStyle` to shared UI positioning helpers and used it in `ChannelComposerPortals.tsx`.
- Documented the shared floating menu anchor utility.

Why:
- Continue Phase 3 frontend boundary cleanup after the Channels composer split without changing composer behavior.

Impact:
- Behavior-neutral cleanup. The Channels composer no longer has the direct picker status-dot import from Spaces, and composer portal style object construction is shared.

Files:
- `apps/web/src/features/channels/components/EntityMentionPicker.tsx`
- `apps/web/src/features/channels/components/ChannelComposerPortals.tsx`
- `apps/web/src/lib/ui/floating-menu-anchor.ts`
- `apps/web/src/lib/ui/floating-menu-anchor.test.ts`
- `documentation/utilities/floating-menu-anchor.md`
- `documentation/utilities/README.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 11:54] - [FIX]

What:
- Brought PR #54's Brain write verification guard into the current checkout without importing stale changelog deletion churn.
- Added Brain memory id readback, Brain ingestion acknowledgement proof, and Brain-specific unverified-write failure semantics.
- Added current-checkout post-action verification classifications for Space schema append and Dream Ops actions so the verifier contract test stays green.

Why:
- Prevent agents from claiming a memory was saved to Brain when post-action verification cannot prove a readable Brain row.

Impact:
- Unverified Brain writes now return `unknown_effect`, forbid saved/created wording, and instruct the agent to verify with Brain read/list/search before reporting success.

Files:
- `apps/agent-api/src/modules/artifacts/services/artifact-post-action-error-results.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.config.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.service.test.ts`
- `.docs/features/brain-feature-implementation.md`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 11:55] - [FIX]

What:
- Added Supabase Realtime reloads for shared Space list caches when visible Space or share rows change.
- Added task-detail subtask realtime handling from `space_items` changes in the active Space.
- Added shared automation run-history realtime reloads from `space_automation_runs`.
- Added focused regression coverage for all three live-update paths.

Why:
- Agent or teammate changes could land in the database while the frontend kept stale cached Space lists, open task subtasks, or automation run history until manual refresh.

Impact:
- Space sidebar/home lists, open task subtask panels, and Space/Flow automation history update from realtime events instead of waiting for a refresh or reopen.

Files:
- `apps/web/src/features/spaces/hooks/use-cached-spaces.ts`
- `apps/web/src/features/spaces/hooks/use-cached-spaces.test.tsx`
- `apps/web/src/features/spaces/hooks/useTaskDetailData.ts`
- `apps/web/src/features/spaces/hooks/useTaskDetailData.test.tsx`
- `apps/web/src/components/flows/AutomationRunsLog.tsx`
- `apps/web/src/components/flows/AutomationRunsLog.test.tsx`
- `documentation/features/space-items-custom-data-drive.md`
- `documentation/features/spaces-automation.md`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 11:56] - [FEATURE]

What:
- Added a hidden, noindex executive brief page to the public website.
- Built branded sections for the Brain, Agents, Spaces, upcoming Workflows, use cases, leadership outcomes, and a pilot path.

Why:
- Give leads a shareable C-level pre-read before the live Vibey walkthrough.

Impact:
- `/executive-brief` is available as a direct-share website route without adding it to navigation or the sitemap.

Files:
- `apps/website/src/app/executive-brief/page.tsx`
- `apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx`
- `apps/website/src/app/executive-brief/ExecutiveBriefPrimitives.tsx`
- `apps/website/src/app/executive-brief/executive-brief-data.ts`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 12:02] - [ARCH]

What:
- Added mounted Channels message-bubble coverage for action menu and emoji picker portal positioning.
- Moved `ChannelMessageActions.tsx` action and emoji portal style construction to the shared `fixedFloatingPortalStyle` helper.
- Marked the Channels anchored portal positioning follow-up resolved for composer and message-action surfaces.

Why:
- Continue Phase 3 frontend shared UI cleanup with the established TDD remediation loop and remove duplicated ad hoc fixed-position style object construction.

Impact:
- Behavior-neutral cleanup. Message action menus keep the same `top`, `left`, and emoji `translateX(-100%)` placement while using the shared `@/lib/ui` helper.

Files:
- `apps/web/src/features/channels/components/ChannelMessageActions.tsx`
- `apps/web/src/features/channels/components/ChannelMessageBubble.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 18:45] - [STYLE]

What:
- Redesigned `/executive-brief` to match website editorial patterns: mosaic hero, pill tabs, split-card sections, divider strips, pull quotes, and closing banner.
- Removed generic glass-card grids, centered section headers, and nested box layouts.

Why:
- The page looked like generic AI SaaS UI instead of the Vibey marketing site.

Impact:
- Executive brief now follows the same visual language as solution marketing pages — less boxy, more editorial.

Files:
- `apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx`
- `apps/website/src/app/executive-brief/ExecutiveBriefPrimitives.tsx`
- `apps/website/src/app/executive-brief/executive-brief-data.ts`
- `apps/website/src/app/globals.css`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 19:10] - [STYLE]

What:
- Removed all images from `/executive-brief`: hero mosaic, agent portraits, use-case photos, and tab mockup visuals.
- Hero now uses dot-grid + beam glow only; sections are copy-only.

Why:
- Hero mosaic tiles looked broken.

Impact:
- Executive brief is text-first with no photo or mockup imagery.

Files:
- `apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx`
- `apps/website/src/app/executive-brief/ExecutiveBriefPrimitives.tsx`
- `apps/website/src/app/executive-brief/executive-brief-data.ts`
- `apps/website/src/app/globals.css`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 21:00] - [FEATURE]

What:
- Rewrote `/executive-brief` as a champion pre-read: problem-class hero, operational pain points, reframed Brain/Agents/Spaces/Workflows tabs, example workflow chain, ops agent roles, security + phased rollout, proof patterns, and 5-step pilot path.
- Refreshed executive-brief CSS for divider-grid editorial layout.

Why:
- Page content was generic product marketing; champions need ops/compliance/pilot framing before C-level conversations.

Impact:
- Shareable leadership pre-read aligned with enterprise pipeline conversations (ERP handoffs, estimating, SOC-phased rollout).

Files:
- `apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx`
- `apps/website/src/app/executive-brief/ExecutiveBriefPrimitives.tsx`
- `apps/website/src/app/executive-brief/executive-brief-data.ts`
- `apps/website/src/app/executive-brief/page.tsx`
- `apps/website/src/app/globals.css`
- `.docs/logs/changelog2026-06-29.md`
## [2026-06-29 13:54] - [STYLE]
What: Rewrote the executive-brief hero headline and lede on the website app.
Why: Hero stated the pain twice and never delivered the Vibey promise; brief is meant to arm an internal champion forwarding it upward, so the headline now pairs the pain ("your systems hold everything") with the payoff ("Vibey finally ties them together"), echoing the prospect's own "tie all of this together" language.
Impact: Copy-only change to the hero section; no structural, token, or behavior changes.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx

## [2026-06-29 13:55] - [STYLE]
What: Removed the "Executive pre-read" eyebrow above the executive-brief hero headline (and the headline's now-orphaned top margin).
Why: Requested; the eyebrow added nothing for the champion reader.
Impact: Copy-only; hero starts directly on the headline.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx

## [2026-06-29 13:55] - [STYLE]
What: Removed the "For organizations with legacy ERPs..." qualifier line under the executive-brief hero lede.
Why: Requested; the targeting/qualifier copy fits better lower on the page than in the hero.
Impact: Copy-only; hero now goes lede -> CTAs.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx

## [2026-06-29 13:56] - [STYLE]
What: Generalized the executive-brief hero lede payoff away from estimate/proposal/ERP-specific wording.
Why: Copy skewed to one prospect's vertical; brief is shared with many org types, so the pain is now framed as work bouncing between tools/inboxes/people and starting over each step.
Impact: Copy-only.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx

## [2026-06-29 13:59] - [STYLE]
What: Reworked the executive-brief hero into a two-column layout (copy left, layer-stack visual right) and added the Brain/Agents/Spaces pyramid from the pitch deck.
Why: Requested; the deck's "unified brain that compounds on every action" 3-layer visual gives the hero a concrete mental model of Brain -> Agents -> Spaces.
Impact: Hero is now a 1024px+ two-column grid that stacks on mobile. Layer cards reuse existing chip-glass-emerald/purple/blue utilities; new executive-brief-hero-grid/-copy and executive-brief-stack-* classes are layout-only (widths, padding, flex) with the only color drawn from existing utilities/tokens.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-29 14:00] - [STYLE]
What: Reworded the executive-brief hero lede tail to a positive frame and removed the hero CTA buttons.
Why: Requested; "stops starting over at every step" read as unclear/negative, now "every task keeps its full context as it moves, instead of being rebuilt from scratch at each step." CTAs removed for now.
Impact: Copy-only plus removal of two hero links; ArrowRight import retained (still used elsewhere on the page).
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx

## [2026-06-29 14:04] - [STYLE]
What: Restructured the executive-brief hero so the two-line title is a centered full-width row on top, with the lede (left) and layer stack (right) in a two-column row below it.
Why: Requested layout - title first and centered, then text-left / layers-right beneath.
Impact: Added executive-brief-hero-title-block (centered) wrapper; hero-grid now nests under site-container below the title. Layout-only CSS.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-29 14:05] - [STYLE]
What: Generalized the three executive-brief pain cards (01/02/03) away from print/ERP-specific wording and removed the em dash from the hero lede.
Why: Pain copy was tailored to one prospect (ERP/estimates/specs/physical tickets); now framed for any business. Em dash removed per request.
Impact: Copy-only.
Files: apps/website/src/app/executive-brief/executive-brief-data.ts, apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx

## [2026-06-29 14:09] - [STYLE]
What: Changed the executive-brief hero lede from text-secondary to text-muted-foreground.
Why: The .text-secondary utility maps to --accent-secondary (brand purple), making the subtext render purple, which is off-palette for this page. Muted-foreground gives a neutral, regular color.
Impact: Hero subtext is now neutral gray; themes correctly in light/dark.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx

## [2026-06-29 14:10] - [FIX]
What: Brought PRs #55, #56, #57, #58, and #59 into the current checkout with local adaptations for runtime readiness, Brain write proof, Brain import retry logging, Skill Recommendation table naming, and chat model routing observability.
Why: The stale PR fixes were approved for local import, but several overlapped with fixes already in the repo and needed to land without reintroducing duplicate migrations or old changelog deletions.
Impact: Agent runtime readiness now checks Vibey API action allowlists, Brain nested result ids are read back before success is claimed, mission-worker Brain import calls retry transient Main API failures with context, Skill Recommendation storage uses canonical Agent Improvement names with legacy dedupe compatibility, and subscription-model chat failures persist routing evidence plus first-class OpenAI Codex/Claude error codes.
Files: apps/agent-api/src/modules/agent-sync/controllers/agent-sync.controller.ts, apps/agent-api/src/modules/agent-sync/controllers/agent-sync.controller.test.ts, apps/agent-api/src/modules/agent-sync/services/agent-runtime-readiness.service.test.ts, apps/agent-api/src/modules/shared/services/openclaw-gateway.service.ts, apps/agent-api/src/modules/shared/openclaw-gateway.service.test.ts, apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.service.ts, apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.service.test.ts, apps/mission-worker/src/modules/agent-runtime/processors/agent-runtime-brain-import.processor.ts, apps/mission-worker/src/modules/agent-runtime/processors/agent-runtime-brain-import.processor.test.ts, apps/api/src/modules/skill-recommendations/repositories/skill-recommendations.repository.ts, apps/api/src/modules/skill-recommendations/services/skill-recommendation-jobs.service.ts, apps/agent-api/src/modules/chat/chat-stream-errors.ts, apps/agent-api/src/modules/chat/chat-stream-errors.test.ts, apps/agent-api/src/modules/chat/services/chat-assistant-turn.service.ts, apps/agent-api/src/modules/chat/services/chat-run-event-store.service.ts, apps/agent-api/src/modules/chat/services/chat-run-event-store.service.test.ts, apps/agent-api/src/modules/chat/services/tracing.service.ts, apps/agent-api/src/modules/chat/services/tracing.service.test.ts, apps/agent-api/src/modules/chat/services/chat.service.ts, apps/agent-api/src/modules/chat/services/__tests__/chat.service.test.ts, apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts, apps/agent-api/src/modules/chat/services/chat.service.channel-message-persistence.test.ts, apps/web/src/lib/chat/chat-stream-errors.config.ts, apps/web/src/features/studio/config/chat-stream-errors.config.test.ts, documentation/features/missions.md, documentation/features/skill-recommendations.md, documentation/features/chat-stream-recovery.md, .docs/features/brain-feature-implementation.md, .docs/plans/agent-follow-up-work.md

## [2026-06-29 14:15] - [STYLE]
What: Replaced the executive-brief hero's stacked 3-layer visual with a circular loop diagram (Brain -> Agents -> Spaces -> Workflows -> back to Brain) and a center "every loop makes the next one better" caption.
Why: The vertical stack didn't balance the left copy column and didn't convey the compounding cycle; a square loop fills the right column and shows the feedback loop. Removed the now-unused executive-brief-stack/-row/-cardwrap/-card/-label CSS (kept -badge, reused by loop nodes).
Impact: New executive-brief-loop/-ring/-track/-arrowhead/-center/-node classes; SVG arcs use marker-end arrowheads; stroke/fill from --color-border and --color-muted-foreground tokens; node colors reuse chip-glass utilities. Layout-only otherwise.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-29 14:45] - [FIX]
What: Restored the executive-brief hero loop to the original 400×400 four-arc SVG with cards at 12.5%/87.5% positions inside a dedicated loop slot; connector lines and corner captions remain on a separate overlay.
Why: Scaling the arcs into a 1000×640 viewBox misaligned card positions and created uneven gaps in the loop.
Impact: Loop segments are uniform again with arrow markers; mobile falls back to a stacked card+caption list.
Files: apps/website/src/app/executive-brief/ExecutiveBriefHeroDiagram.tsx, apps/website/src/app/globals.css

## [2026-06-29 14:29] - [ARCH]

What:
- Promoted `DeliverablesCarousel` from a Mission Control-owned implementation to shared deliverables UI.
- Split the carousel into shared shell, card, list, thumbnail, and preview-helper files.
- Moved deliverable display metadata to `@/lib/missions`, removed `DeliverablesCarouselAdapter.tsx`, and switched Spaces task detail to the shared component.

Why:
- Resolve the Phase 3 shared-promotion follow-up left by Batch 291 and remove the adapter that still re-exported private Mission Control UI.

Impact:
- Behavior-neutral refactor covered by mounted carousel and task-detail tests.
- Mission Control keeps a compatibility re-export; cross-feature callers use the shared component directly.
- Browser smoke was not run for this authenticated Mission/Task surface, so mounted runtime coverage is the current evidence.

Files:
- `apps/web/src/components/deliverables/DeliverablesCarousel.tsx`
- `apps/web/src/components/deliverables/DeliverablesCarouselCard.tsx`
- `apps/web/src/components/deliverables/DeliverablesCarouselListView.tsx`
- `apps/web/src/components/deliverables/DeliverablesCarouselThumbnail.tsx`
- `apps/web/src/components/deliverables/deliverables-carousel-preview.ts`
- `apps/web/src/lib/missions/deliverable-display.tsx`
- `apps/web/src/lib/missions/index.ts`
- `apps/web/src/features/mission-control/components/dialogs/DeliverablesCarousel.tsx`
- `apps/web/src/features/mission-control/components/dialogs/DeliverablesCarousel.test.tsx`
- `apps/web/src/features/mission-control/components/dialogs/detail-helpers.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskDetailMainPanel.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskDetailModal.test.tsx`
- `apps/web/src/app/(dashboard)/campaigns/[id]/_lib/constants.ts`
- `apps/web/src/components/deliverables/DeliverablePreviewMetaRow.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `documentation/frontend-shared-surfaces.md`
- `.docs/logs/changelog2026-06-29.md`

## [2026-06-29 15:10] - [STYLE]
What: Added top/bottom breathing room to the executive-brief Spaces tab mockup — extra vertical padding, no full-height stretch, deck size variant.
Why: The Spaces board was flush against the panel borders; the empty kanban column area at the bottom made the stretch look worse than Brain’s inset frame.
Impact: Spaces tab visual now sits centered with gap from top and bottom borders, matching Brain’s treatment.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-29 15:18] - [STYLE]
What: Sized the executive-brief Spaces mockup to a new `brief` variant (~360–420px) between deck and full default height.
Why: Deck was too small; full stretch was flush against panel borders.
Impact: Spaces tab fills most of the right column while keeping top/bottom inset.
Files: apps/website/src/components/marketing/SpacesHeroMockup.tsx, apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css
