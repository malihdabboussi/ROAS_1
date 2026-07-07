## [2026-06-30 13:24] - [FIX]

What:
- Added POST /api/spaces/ensure-flows-concept as a reliable sandbox provisioner when the org automations route is unavailable.
- Concept space detection now matches by title as well as schema flag; create-anything mode loads flows via space-scoped API instead of org-scoped list.

Why:
- Loop send failed because concept-space returned 404 on a stale API process and fetchOrgFlows returned 403 without org context.

Impact:
- Create anything mode reuses existing "Flow concepts" spaces and loads flow data without org-list permission errors.

Files:
- apps/api/src/modules/spaces/controllers/spaces.controller.ts
- apps/api/src/modules/spaces/services/org-automation-flows.service.ts
- apps/web/src/lib/flows/flows-scope-storage.ts
- apps/web/src/features/flows/services/flows.service.ts
- apps/web/src/features/flows/containers/FlowsPage.tsx

---

---

---

---

## [2026-06-30 14:52] - [STYLE]

What:
- Redesigned Add step picker: no header (click outside to close), rounded modal, search at top.
- Home: Popular integrations | Built-in tools | Vibey tools columns (Zapier-style).
- Apps sidebar: real integration logos (Fathom, Slack, Gmail, etc.) with drill-down events.
- Removed bottom Add step button; inline + between steps only.

Why:
- Picker was ugly/generic; Integrations tab should list actual apps like Browse, not one "Integration" row.

Impact:
- Adding Slack sends send_slack_message; Fathom/Google apps drill to triggers/actions.

Files:
- apps/web/src/features/flows/components/flow-builder/FlowBuilderAddStepPicker.tsx
- apps/web/src/lib/flows/flow-builder-picker-catalog.utils.ts
- apps/web/src/features/flows/components/flow-builder/FlowBuilderStudio.tsx
- apps/web/src/lib/flows/flow-builder-step-types.utils.ts
- apps/web/src/app/globals.css

---

## [2026-06-30 14:45] - [FEATURE]

What:
- Step panel: Setup → Configure → Test wizard (Zapier-style) with Continue flow and phase checkmarks.
- Setup: app/category + trigger event or action type; Configure: field mapping; Test: validation + sample-data placeholder.
- Add-step modal: sidebar categories (Integrations, Agents, Space, Flow controls, Utilities), search, wider panel.
- Inline + buttons between canvas steps to insert steps mid-flow.

Why:
- Match Zapier-style per-step configure/test UX without requiring Loop compile.

Impact:
- Build tab feels like Loop (left) + canvas (center) + step wizard (right); live record preview still TODO.

Files:
- apps/web/src/features/flows/components/flow-builder/FlowBuilderStepPanel.tsx
- apps/web/src/features/flows/components/flow-builder/FlowBuilderStepWizardNav.tsx
- apps/web/src/features/flows/components/flow-builder/FlowBuilderStepSetupPanel.tsx
- apps/web/src/features/flows/components/flow-builder/FlowBuilderStepTestPanel.tsx
- apps/web/src/features/flows/components/flow-builder/FlowBuilderAddStepPicker.tsx
- apps/web/src/features/flows/components/flow-builder/FlowBuilderCanvas.tsx
- apps/web/src/features/flows/components/flow-builder/FlowBuilderStudio.tsx
- apps/web/src/lib/flows/flow-builder-step-phase.utils.ts
- apps/web/src/lib/flows/flow-builder-step-types.utils.ts
- apps/web/src/features/spaces/components/automations/TriggerBuilder.tsx
- apps/web/src/features/spaces/components/automations/ActionBuilder.tsx
- apps/web/src/app/globals.css
- Removed: FlowBuilderAddStepMenu.tsx

---

## [2026-06-30 14:38] - [FIX]

What:
- Browse/Manage/Webhooks tabs no longer snap back to Build when an active build session exists.
- Auto-open Build only when a new build session starts or user sends Loop compose; respect manual tab picks.

Why:
- useEffects forced panelTab back to build on every browse/manage click, causing flicker.

Impact:
- Users can leave Build while Loop session stays active; Build tab remains available to return.

Files:
- apps/web/src/features/flows/containers/FlowsPage.tsx

---

## [2026-06-30 14:37] - [FEATURE]

What:
- Build tab toolbar: explicit Save draft + Validate; autosave after first draft id without toast spam.
- First save creates draft via createFlowDraft (no Loop compile required); subsequent saves updateFlowDraft.
- Per-step Test step button runs client-side validateTrigger / validateConcreteAction.
- Step card colors: Space=yellow, Action=orange, Agent=green, Brain=purple, Skill/Webhook=cyan, Integration=blue.

Why:
- Zapier-style configure/save/test each step without pushing back to Loop agent.

Impact:
- Build tab is self-serve once Loop returns a plan; Save draft persists locally to DB independent of Loop compile.

Files:
- apps/web/src/features/flows/containers/FlowsPage.tsx
- apps/web/src/features/flows/components/FlowBuildVisualPanel.tsx
- apps/web/src/features/flows/components/flow-builder/FlowBuilderStudio.tsx
- apps/web/src/features/flows/components/flow-builder/FlowBuilderStepPanel.tsx
- apps/web/src/lib/flows/flow-builder-canvas.utils.ts
- apps/web/src/app/globals.css

---

What:
- Loop scope trigger now shows "Create anything" when that mode is active instead of the generic "Space" label.

Why:
- Collapsed state should reflect the pre-selected concept mode.

Impact:
- Trigger reads "Create anything" by default; switches to the Space name only when a Space is picked.

Files:
- apps/web/src/features/flows/components/FlowComposerSpaceSelector.tsx

---

## [2026-06-30 13:55] - [STYLE]

What:
- Replaced Create anything toggle with a single compact Space dropdown; Create anything is the first option in the expanded picker.

Why:
- Thinner Loop composer chrome while keeping space-scoped and concept modes in one control.

Impact:
- Default remains Create anything; open Space to pick a real Space or switch back to concept mode.

Files:
- apps/web/src/features/flows/components/FlowComposerSpaceSelector.tsx
- apps/web/src/features/flows/containers/FlowsPage.tsx
- apps/web/src/features/flows/components/FlowComposerScopeControl.tsx (removed)

---

## [2026-06-30 13:45] - [FIX]

What:
- Fixed Flow concepts sandbox schema (invalid view type `task` → `list`) so space creation passes API validation.
- Stopped duplicate sandbox error toasts on page load; errors now surface on send only.

Why:
- Fallback POST /api/spaces failed Zod validation, breaking Create anything mode provisioning.

Impact:
- Flow sandbox provisions successfully; page load stays quiet unless send fails.

Files:
- apps/api/src/modules/spaces/constants/flows-concept-space.constants.ts
- apps/web/src/lib/flows/flows-scope-storage.ts
- apps/web/src/features/flows/services/flows.service.ts
- apps/web/src/features/flows/containers/FlowsPage.tsx
- apps/web/src/features/team-2/components/hr-side-chat/TeamHrSideChatPanel.tsx

---

## [2026-06-30 13:35] - [FIX]

What:
- Added fallback Flow concepts sandbox provisioning via POST /api/spaces when concept-space endpoint is unavailable.

Why:
- Running API had not registered /api/automations/flows/concept-space yet, causing sandbox setup to fail on send.

Impact:
- Create anything mode provisions the sandbox even on older API builds; dedicated endpoint still preferred when present.

Files:
- apps/web/src/lib/flows/flows-scope-storage.ts
- apps/web/src/features/flows/services/flows.service.ts

---

## [2026-06-30 13:25] - [FIX]

What:
- Unblocked Loop composer typing in Create anything mode even when the concept sandbox Space is still provisioning.
- Resolve or create the Flow concepts sandbox automatically on send; hydrate from existing Spaces when available.

Why:
- Composer was gated on effectiveSpaceId, which stayed null when concept-space API failed or had not finished.

Impact:
- Users can type immediately in Create anything mode; first send provisions the sandbox if needed.

Files:
- apps/web/src/features/flows/containers/FlowsPage.tsx
- apps/web/src/features/team-2/containers/TeamHrSideChatLayout.tsx
- apps/web/src/features/team-2/components/hr-side-chat/TeamHrSideChatPanel.tsx

---

## [2026-06-30 13:15] - [FIX]

What:
- Unblocked Loop chat in Create anything mode by skipping the create/update start gate overlay and composer lock.

Why:
- Users should describe a flow in chat immediately instead of clicking Create New first.

Impact:
- With Create anything on, Loop composer is open on load; Loop starts the build from the first message.

Files:
- apps/web/src/features/flows/containers/FlowsPage.tsx

---

## [2026-06-30 13:02] - [STYLE]

What:
- Replaced custom Create anything toggle with shared green glass Switch component for clear on/off affordance.

Why:
- Custom toggle was low-contrast and did not read as a switch in dark mode.

Impact:
- Create anything mode shows green when on and muted grey track when off, matching other toggles in the app.

Files:
- apps/web/src/features/flows/components/FlowComposerScopeControl.tsx

---

## [2026-06-30 12:48] - [FEATURE]

What:
- Added "Create anything" toggle (default on) to Flows Loop composer so admins can build and test flows without picking a Space first.
- Auto-provisions a hidden Flow concepts sandbox space per org; toggling off reveals the Space selector for space-scoped flows.

Why:
- Remove friction when exploring flow ideas before assigning them to a real Space.

Impact:
- /flows opens ready to build with Loop; concept flows live in an org sandbox until assigned to a real Space.

Files:
- apps/api/src/modules/spaces/constants/flows-concept-space.constants.ts
- apps/api/src/modules/spaces/services/org-automation-flows.service.ts
- apps/api/src/modules/spaces/controllers/org-automation-flows.controller.ts
- apps/web/src/lib/flows/flows-scope-storage.ts
- apps/web/src/lib/flows/flows-ui-labels.ts
- apps/web/src/features/flows/services/flows.service.ts
- apps/web/src/features/flows/components/FlowComposerScopeControl.tsx
- apps/web/src/features/flows/containers/FlowsPage.tsx

---

## [2026-06-30 12:35] - [FEATURE]

What:
- Added agency_ops Flows preset category and two installable templates: Agency Funnel Build (task trigger) and Agency Funnel Build (Slack).
- Seeded stub funnel-wireframe skill on vibey for the wireframe pipeline step.
- Wired copy → wireframe → design send_to_agent chain with step output pass-through and skill references.

Why:
- Collaborative agency funnel automation on existing admin-only /flows surface per Agency Flow Presets plan.

Impact:
- Admins can install agency presets from Flows Browse once migrations run; Slack variant needs connected Slack account.
- Wireframe skill is a stub ready for replacement when custom agency skill is provided.

Files:
- apps/api/src/modules/spaces/data/space-automation-template-catalog-agency.ts
- apps/api/src/modules/spaces/data/space-automation-template-catalog.ts
- apps/api/src/modules/spaces/data/__tests__/space-automation-template-catalog.test.ts
- apps/web/src/lib/flows/automation-templates.ts
- apps/web/src/lib/flows/automation-template-nav.ts
- supabase/migrations/20260521120000_space_automation_templates.sql
- supabase/migrations/20260630120000_agency_flow_presets.sql
- supabase/migrations/20260630120100_agency_funnel_wireframe_skill.sql

---

What:
- Moved Deliverables Carousel thumbnail iframe/text scaling out of inline `style` props and into named `deliverable-thumbnail-*` utilities.
- Synced the new utilities in both web and website globals.
- Updated the Phase 3 Batch 292 plan/follow-up evidence to match the final style-scan state.

Why:
- Keep the promoted shared deliverables UI aligned with the token/utility-only frontend rule before closing the batch.

Impact:
- Behavior-neutral cleanup for thumbnail sizing and scaling.
- Product chrome no longer carries inline thumbnail scaling styles; only isolated generated mini-preview code strings remain as the documented style-scan exception.

Files:
- `apps/web/src/components/deliverables/DeliverablesCarouselThumbnail.tsx`
- `apps/web/src/app/globals.css`
- `apps/website/src/app/globals.css`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 07:52] - [ARCH]

What:
- Added mounted `MissionsView.test.tsx` characterization for mission list rendering, deliverable preview, mission capture send, and rerender stability.
- Moved the Spaces mission capture composer, billing, campaign-team, and document attachment imports to shared frontend paths.
- Added the non-barrel `MissionListAdapter` and used the existing `MissionDetailModalAdapter` so `MissionsView.tsx` no longer imports Mission Control UI directly.
- Cleaned touched Missions grouped-header and capability-warning token drift.

Why:
- Reduce Phase 3 direct Studio, Settings, and Mission Control UI imports in Spaces MissionsView with a mounted behavior lock.

Impact:
- Behavior-neutral frontend architecture cleanup.
- Remaining parent debt is Mission Control config/service/type imports and the 910 LOC `MissionsView.tsx` parent.

Files:
- `apps/web/src/features/spaces/components/MissionsView.tsx`
- `apps/web/src/features/spaces/components/MissionsView.test.tsx`
- `apps/web/src/components/missions/MissionListAdapter.tsx`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 08:08] - [ARCH]

What:
- Moved mission create, batch deliverable, subtask, and mission-create toast error behavior into shared `@/lib/missions`.
- Rewired `MissionsView.tsx` and `group-missions.ts` to shared mission/agent APIs and contracts.
- Reduced the old Mission Control service/config/type paths to compatibility re-exports for the moved contracts.
- Removed stale old-path mocks from the mounted `MissionsView` test.

Why:
- Finish the Phase 3 Spaces MissionsView cross-feature boundary cleanup before the remaining LOC split.

Impact:
- Behavior-neutral frontend architecture cleanup.
- Touched Spaces files are now clean for direct `@/features/mission-control` imports; remaining `MissionsView.tsx` debt is the 907 LOC parent.

Files:
- `apps/web/src/features/spaces/components/MissionsView.tsx`
- `apps/web/src/features/spaces/components/MissionsView.test.tsx`
- `apps/web/src/features/spaces/lib/group-missions.ts`
- `apps/web/src/lib/missions/missions-api.ts`
- `apps/web/src/lib/missions/missions-api.test.ts`
- `apps/web/src/lib/missions/mission-types.ts`
- `apps/web/src/lib/missions/mission-create-toast-errors.ts`
- `apps/web/src/lib/missions/mission-create-toast-errors.test.ts`
- `apps/web/src/lib/missions/index.ts`
- `apps/web/src/features/mission-control/services/missions.service.ts`
- `apps/web/src/features/mission-control/config/mission-control-toast-errors.config.ts`
- `apps/web/src/features/mission-control/types/index.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 08:15] - [ARCH]

What:
- Added mounted empty-state coverage for `MissionsView`.
- Extracted empty/filter-empty rendering to `MissionsViewEmptyState.tsx`.
- Extracted the new-mission capture portal rendering to `MissionCaptureModal.tsx`.
- Removed stale old feature-path mocks from the mounted `MissionsView` test.

Why:
- Continue the Phase 3 `MissionsView.tsx` LOC decomposition after finishing its shared-boundary cleanup.

Impact:
- Behavior-neutral frontend split.
- `MissionsView.tsx` is down from 907 to 803 LOC; remaining parent debt is data loading, realtime/subtask cache handling, grouping/list rendering, and modal orchestration.

Files:
- `apps/web/src/features/spaces/components/MissionsView.tsx`
- `apps/web/src/features/spaces/components/MissionsView.test.tsx`
- `apps/web/src/features/spaces/components/MissionCaptureModal.tsx`
- `apps/web/src/features/spaces/components/MissionsViewEmptyState.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 08:43] - [ARCH]

What:
- Added mounted grouped-list coverage for `MissionsView`.
- Extracted grouped/ungrouped mission list rendering into `MissionsViewListContent.tsx`.
- Moved list data, realtime sync, column persistence, and subtask cache behavior into local focused hooks.

Why:
- Complete the Phase 3 `MissionsView.tsx` LOC decomposition without changing mission list, preview, capture, or realtime behavior.

Impact:
- Behavior-neutral frontend split.
- `MissionsView.tsx` is now 240 LOC, and all touched Missions files are under the frontend limits with focused tests/lint/typecheck passing.

Files:
- `apps/web/src/features/spaces/components/MissionsView.tsx`
- `apps/web/src/features/spaces/components/MissionsView.test.tsx`
- `apps/web/src/features/spaces/components/MissionsViewListContent.tsx`
- `apps/web/src/features/spaces/components/useMissionsViewListState.ts`
- `apps/web/src/features/spaces/components/useMissionsViewRealtime.ts`
- `apps/web/src/features/spaces/components/useMissionsViewColumns.ts`
- `apps/web/src/features/spaces/components/useMissionsViewSubtasks.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 09:13] - [ARCH]

What:
- Added mounted task activity coverage and reused the agent-feedback behavior lock for the Task Activity split.
- Extracted task activity state/realtime/comment/composer-member orchestration into `useTaskActivityState.ts`.
- Extracted timeline rendering, agent execution rendering, avatar rendering, attachment mapping, local types, and formatting helpers from `TaskActivity.tsx`.
- Replaced the moved avatar initial arbitrary text size with the existing typography utility.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by reducing the Spaces task activity god component without changing task activity, composer, or agent execution behavior.

Impact:
- Behavior-neutral frontend split.
- `TaskActivity.tsx` is now 246 LOC and under the component cap.
- Remaining Task Activity debt is the private Channels `ChannelComposer` and `ChannelOrderedBlocks` imports.

Files:
- `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`
- `apps/web/src/features/spaces/components/task-detail/useTaskActivityState.ts`
- `apps/web/src/features/spaces/components/task-detail/task-activity-attachments.ts`
- `apps/web/src/features/spaces/components/task-detail/TaskActivityTimeline.tsx`
- `apps/web/src/features/spaces/components/task-detail/AgentTaskExecutionBlock.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivityAvatar.tsx`
- `apps/web/src/features/spaces/components/task-detail/task-activity-format.ts`
- `apps/web/src/features/spaces/components/task-detail/task-activity-types.ts`
- `apps/web/src/features/spaces/components/task-detail/TaskActivity.test.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivity.agent-feedback.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 09:25] - [ARCH]

What:
- Added non-barrel Channels compatibility adapters for the composer and ordered block renderer.
- Rewired Spaces task activity, agent execution, and send-to-agent callers to those adapter paths.
- Rewired `SendTaskToAgentModal` to use the shared team roster type from `@/lib/team`.
- Documented the Channels adapters in the frontend shared-surface registry.

Why:
- Finish the immediate Task Activity shared-boundary cleanup after the LOC split without changing composer or task-agent activity behavior.

Impact:
- Behavior-neutral frontend boundary cleanup.
- Focused normal ESLint is clean for the touched Spaces task-detail files.
- The true shared Channels composer/ordered-block renderer work remains logged as follow-up.

Files:
- `apps/web/src/components/channels/ChannelComposerAdapter.tsx`
- `apps/web/src/components/channels/ChannelOrderedBlocksAdapter.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`
- `apps/web/src/features/spaces/components/task-detail/AgentTaskExecutionBlock.tsx`
- `apps/web/src/features/spaces/components/task-detail/SendTaskToAgentModal.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivity.test.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivity.agent-feedback.test.tsx`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 09:42] - [ARCH]

What:
- Added mounted `TaskMetaFields` characterization for existing metadata rendering, workflow status updates, assignee clearing, extra-field expansion/update behavior, and rerender stability.
- Split the 644 LOC `TaskMetaFields.tsx` into local orchestration, core metadata grid, status controls, extra fields, and helper modules.
- Moved `TaskMetaFields` off the Org feature-private `TeamRosterEntry` import and onto shared `@/lib/team`.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the Spaces task-detail metadata LOC and private-import violation without changing metadata behavior.

Impact:
- Behavior-neutral frontend split.
- All touched Task Detail metadata files are under the frontend LOC cap.
- Focused mounted test, ESLint, and full web typecheck passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- Pre-existing metadata style-token drift remains logged as follow-up.

Files:
- `apps/web/src/features/spaces/components/task-detail/TaskMetaFields.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskMetaCoreFields.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskMetaStatusField.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskMetaExtraFields.tsx`
- `apps/web/src/features/spaces/components/task-detail/task-meta-fields-helpers.ts`
- `apps/web/src/features/spaces/components/task-detail/TaskMetaFields.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 09:50] - [ARCH]

What:
- Added mounted `TaskActivityComment` characterization for edit/save, delete, copy, send-to-agent, link-preview open, entity-chip click, and rerender stability.
- Split binary attachment rendering and file badge helpers from `TaskActivityComment.tsx` into `TaskActivityCommentAttachments.tsx`.
- Moved `TaskActivityComment` off the Mission Control private `MissionDeliverable` type import and onto shared `@/lib/missions`.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the Spaces task activity comment LOC and private-import violation without changing comment behavior.

Impact:
- Behavior-neutral frontend split.
- `TaskActivityComment.tsx` is now 320 LOC, and touched comment files are under the frontend LOC cap.
- Focused mounted test, ESLint, and full web typecheck passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- Pre-existing comment/attachment style-token drift remains logged as follow-up.

Files:
- `apps/web/src/features/spaces/components/task-detail/TaskActivityComment.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivityCommentAttachments.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivityComment.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 09:57] - [ARCH]

What:
- Added mounted `TaskActivityFilePreview` characterization for file preview rendering, text-file fetch/update behavior, URL-field separation, and rerender stability.
- Moved file preview attachment-kind, document attachment, and preview UI imports from Studio internals to shared chat boundaries.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by removing direct Studio imports from the Spaces task activity file preview without changing preview behavior.

Impact:
- Behavior-neutral frontend boundary cleanup.
- `TaskActivityFilePreview.tsx` remains under the frontend LOC cap at 386 LOC.
- Focused mounted test, ESLint, and full web typecheck passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- Pre-existing URL preview link style-token drift remains logged as follow-up.

Files:
- `apps/web/src/features/spaces/components/task-detail/TaskActivityFilePreview.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskActivityFilePreview.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 10:13] - [ARCH]

What:
- Added mounted `TaskSubtasks` characterization for subtask mounting, closed-row reveal, selection, quick add, fields-menu portal opening, collapse sync, and rerender stability.
- Split the subtask panel into parent orchestration, header, fields-menu portal, table/row rendering, and bulk-action portal wiring files.
- Kept the public `TaskSubtasks` props and existing subtask behavior unchanged while dropping the parent below the frontend LOC cap.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the Spaces task-detail `TaskSubtasks.tsx` LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `TaskSubtasks.tsx` is now 392 LOC, and all touched subtask files are under the frontend component cap.
- Focused mounted test, ESLint, and full web typecheck passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- Pre-existing subtask panel style-token/layout drift remains logged as follow-up.

Files:
- `apps/web/src/features/spaces/components/task-detail/TaskSubtasks.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskSubtasksTable.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskSubtasksBulkActions.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskSubtasksHeader.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskSubtasksFieldsMenu.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskSubtasks.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 10:21] - [ARCH]

What:
- Added mounted `SocialPostMenuDropdown` characterization for action rendering, campaign submenu delegation, delete confirmation, and rerender stability.
- Extracted the campaign submenu into local props-driven `SocialPostCampaignSubmenu.tsx`.
- Kept dropdown actions, public props, and menu behavior unchanged while dropping the parent below the frontend LOC cap.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the smallest current Spaces artifact menu hard LOC violation with mounted coverage.

Impact:
- Behavior-neutral frontend split.
- `SocialPostMenuDropdown.tsx` is now 356 LOC, and the new submenu child is 100 LOC.
- Focused mounted test, ESLint, and full web typecheck passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- Pre-existing social-post menu style-token and portal-positioning drift remains logged as follow-up.

Files:
- `apps/web/src/features/spaces/components/artifacts/social-post/SocialPostMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/social-post/SocialPostCampaignSubmenu.tsx`
- `apps/web/src/features/spaces/components/artifacts/social-post/SocialPostMenuDropdown.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 10:36] - [ARCH]

What:
- Added mounted `ArtifactsMainView` characterization for artifact controls, website-funnel filtering, fields-button delegation, group popover opening, funnels subview navigation, and rerender stability.
- Moved the funnel fetch import from the Studio service re-export to shared `@/lib/artifacts/funnel-preview-api`.
- Extracted repeated artifact card-field rows into local props-driven `ArtifactsCardFieldsSection.tsx` and tokenized touched product chrome.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the Spaces customize artifacts LOC and private Studio import target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split and boundary cleanup.
- `ArtifactsMainView.tsx` is now 260 LOC, and the new card-fields child is 125 LOC.
- Focused mounted test, ESLint, full web typecheck, LOC/private-import/style scans, trailing-whitespace scan, and scoped diff check passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.

Files:
- `apps/web/src/features/spaces/components/customize/views/artifacts/ArtifactsMainView.tsx`
- `apps/web/src/features/spaces/components/customize/views/artifacts/ArtifactsCardFieldsSection.tsx`
- `apps/web/src/features/spaces/components/customize/views/artifacts/ArtifactsMainView.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 10:53] - [ARCH]

What:
- Added mounted `ContactsToolbar` characterization for list-mode search, sort, refresh, segment clear/open actions, detail-mode Back navigation, communication-tab switching, and rerender stability.
- Extracted detail-mode toolbar rendering into local props-driven `ContactsDetailToolbarSection.tsx`.
- Extracted list/right-side toolbar actions into local props-driven `ContactsToolbarActions.tsx`.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the Spaces contacts toolbar LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `ContactsToolbar.tsx` is now 46 LOC, with extracted children at 143 LOC and 257 LOC.
- Focused mounted test, ESLint, full web typecheck, LOC/private-import/raw-token scans, trailing-whitespace scan, stale-log scan, and scoped diff check passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- The only focused `style={{ ... }}` hit is the preserved dynamic width/margin alignment for contact-detail communication tabs.

Files:
- `apps/web/src/features/spaces/views/contacts/ContactsToolbar.tsx`
- `apps/web/src/features/spaces/views/contacts/ContactsDetailToolbarSection.tsx`
- `apps/web/src/features/spaces/views/contacts/ContactsToolbarActions.tsx`
- `apps/web/src/features/spaces/views/contacts/ContactsToolbar.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 11:04] - [ARCH]

What:
- Added mounted `FolderMenuDropdown` characterization for action callbacks, move/clone submenus, add-artifact composer prefill event dispatch, and rerender stability.
- Extracted the clone-to-ad-set submenu into local props-driven `FolderMenuCloneSubmenu.tsx`.
- Moved `AdSetOption` into a local type file while preserving the existing public type export path.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the Studio artifact tree dropdown LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `FolderMenuDropdown.tsx` is now 376 LOC, with the extracted submenu at 56 LOC.
- Focused mounted test, ESLint, full web typecheck, LOC/private-import scans, trailing-whitespace scan, stale-log scan, and scoped diff check passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- The focused style scan now reports only preserved dynamic portal positioning/status-dot size `style={{ ... }}` hits.

Files:
- `apps/web/src/features/studio/components/preview/artifacts/tree/FolderMenuDropdown.tsx`
- `apps/web/src/features/studio/components/preview/artifacts/tree/FolderMenuCloneSubmenu.tsx`
- `apps/web/src/features/studio/components/preview/artifacts/tree/FolderMenuDropdown.types.ts`
- `apps/web/src/features/studio/components/preview/artifacts/tree/FolderMenuDropdown.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 11:13] - [ARCH]

What:
- Added mounted `TreeItem` characterization for leaf selection, new-artifact clearing, menu edit delegation, social-platform Show all behavior, and rerender stability.
- Extracted the right-side count/menu/delete rendering into local props-driven `TreeItemActions.tsx`.
- Tokenized the touched Meta badge and ungrouped delete button while preserving dynamic indentation layout styles.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the Studio artifact tree item LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `TreeItem.tsx` is now 366 LOC, with the extracted actions child at 109 LOC.
- Focused mounted test, ESLint, full web typecheck, LOC/private-import/style scans, trailing-whitespace scan, stale-log scan, and scoped diff check passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- The focused style scan now reports only preserved dynamic indentation `style={{ ... }}` hits.

Files:
- `apps/web/src/features/studio/components/preview/artifacts/tree/TreeItem.tsx`
- `apps/web/src/features/studio/components/preview/artifacts/tree/TreeItemActions.tsx`
- `apps/web/src/features/studio/components/preview/artifacts/tree/TreeItem.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 11:34] - [ARCH]

What:
- Added mounted GoHighLevel import dialog and all-contacts modal characterization coverage before changing production code.
- Moved CRM import API wrappers into shared `@/lib/contacts/crm-import-api`.
- Moved and split the GoHighLevel contacts import dialog into shared `@/components/contacts`.
- Updated Studio and Spaces consumers to the shared contacts boundary and deleted the old Studio dialog source.
- Split the Studio all-contacts modal table/body rendering into local props-driven `AllContactsModalTable.tsx`.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by removing a Spaces-to-Studio contacts import and resolving the touched Studio contacts modal LOC violation.

Impact:
- Behavior-neutral frontend/shared API boundary cleanup.
- `AllContactsImportGhlDialog.tsx` is now 278 LOC in shared contacts, `AllContactsModal.tsx` is now 312 LOC, and `AllContactsModalTable.tsx` is 204 LOC.
- Focused mounted tests, shared API tests, scoped ESLint, full web typecheck, LOC/import/style scans, and generated `apps/web/tsconfig.tsbuildinfo` restoration passed.
- Browser/dev-server smoke was not run for this authenticated contacts modal surface; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/components/contacts/AllContactsImportGhlDialog.tsx`
- `apps/web/src/components/contacts/AllContactsImportGhlDialogBody.tsx`
- `apps/web/src/components/contacts/AllContactsImportGhlDialogTable.tsx`
- `apps/web/src/components/contacts/AllContactsImportGhlDialogSyncStatus.tsx`
- `apps/web/src/components/contacts/AllContactsImportGhlDialog.helpers.ts`
- `apps/web/src/components/contacts/AllContactsImportGhlDialog.test.tsx`
- `apps/web/src/components/contacts/index.ts`
- `apps/web/src/lib/contacts/crm-import-api.ts`
- `apps/web/src/lib/contacts/crm-import-api.test.ts`
- `apps/web/src/lib/contacts/index.ts`
- `apps/web/src/features/studio/components/preview/AllContactsImportGhlDialog.tsx`
- `apps/web/src/features/studio/components/preview/AllContactsModal.tsx`
- `apps/web/src/features/studio/components/preview/AllContactsModalTable.tsx`
- `apps/web/src/features/studio/components/preview/AllContactsModal.test.tsx`
- `apps/web/src/features/studio/services/leads.service.ts`
- `apps/web/src/features/spaces/components/modals/SpaceModalsHost.tsx`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 11:52] - [ARCH]

What:
- Added mounted invite accept route characterization for signed-out rendering, email signup bootstrap, callback bootstrap, and rerender stability.
- Split the invite accept route render tree into local props-only `InviteAcceptSections.tsx`.
- Moved Org service/store imports from private feature re-export paths to the public `@/lib/org` boundary.
- Removed stale old-path test mocks and tokenized the moved invite JSX away from inline CSS-variable utilities.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the invite route LOC target and private Org import boundary with mounted runtime coverage.

Impact:
- Behavior-neutral frontend route split.
- `page.tsx` is now 234 LOC, with the extracted presentational section at 243 LOC and mounted test at 191 LOC.
- Focused mounted test, scoped ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, stale-log scan, and scoped diff check passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- Browser/dev-server smoke was not run for this authenticated invite route; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/app/(auth)/invite/[token]/page.tsx`
- `apps/web/src/app/(auth)/invite/[token]/InviteAcceptSections.tsx`
- `apps/web/src/app/(auth)/invite/[token]/page.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 12:02] - [ARCH]

What:
- Added mounted `ThemePreview` characterization for preview sections, scoped CSS, Google font links, design setting labels, and rerender stability.
- Split `ThemePreview.tsx` into a smart preview shell plus local props-driven showcase/settings section files.
- Moved theme helper/type imports from feature compatibility re-exports to the public `@/lib/themes` boundary.
- Marked the dynamic inline style surface as intentional user-selected theme preview rendering.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the smallest current oversized web component with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `ThemePreview.tsx` is now 100 LOC, with extracted section files at 36, 265, 164, and 17 LOC plus an 86 LOC mounted test.
- Focused mounted test, scoped ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, stale-log scan, and scoped diff check passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- The focused style scan reports intentional dynamic theme-preview inline styles and test color fixtures, not ordinary app chrome drift.

Files:
- `apps/web/src/features/themes/components/ThemePreview.tsx`
- `apps/web/src/features/themes/components/ThemePreviewSections.tsx`
- `apps/web/src/features/themes/components/ThemePreviewShowcaseSections.tsx`
- `apps/web/src/features/themes/components/ThemePreviewSettingsSections.tsx`
- `apps/web/src/features/themes/components/ThemePreviewSections.types.ts`
- `apps/web/src/features/themes/components/ThemePreview.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 12:19] - [ARCH]

What:
- Added mounted `AdStudioLayout` characterization for header controls, host refs, loading behavior, agent-key settling, and rerender stability.
- Added web Vitest aliases for `@vibey/api-shared/ad-strategies` and `@vibey/api-shared/image-models` so existing package subpath imports resolve in mounted web tests.
- Split the ad-canvas header/chrome into local props-only `AdStudioHeader.tsx`.
- Kept graph/action orchestration in `AdStudioLayout.tsx` and tokenized the moved header spacing/icon classes.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next Studio ad creative canvas LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `AdStudioLayout.tsx` is now 371 LOC and `AdStudioHeader.tsx` is 86 LOC.
- Focused mounted test, scoped ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, stale-log scan, and scoped diff check passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.
- Browser/dev-server smoke was not run for this authenticated Studio ad creative canvas surface; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/studio/components/preview/ad-canvas/AdStudioLayout.tsx`
- `apps/web/src/features/studio/components/preview/ad-canvas/AdStudioLayout.test.tsx`
- `apps/web/src/features/studio/components/preview/ad-canvas/components/AdStudioHeader.tsx`
- `apps/web/vitest.config.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 12:32] - [ARCH]

What:
- Removed the unused 415 LOC `CampaignKnowledgeHubToolbar.tsx` campaign route toolbar file.
- Verified the exported toolbar component and `KnowledgeSort` type have no current repo consumers.
- Kept the active campaign knowledge route unchanged; it renders `CampaignKnowledgeTab` directly.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next oversized apps/web target without splitting dead UI into more files.

Impact:
- Behavior-neutral dead-source removal.
- No mounted test was added because the removed file has no runtime consumer to mount.
- Clean no-usage scan and full web typecheck passed; generated `apps/web/tsconfig.tsbuildinfo` was restored after typecheck.

Files:
- `apps/web/src/app/(dashboard)/campaigns/[id]/_components/CampaignKnowledgeHubToolbar.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 12:50] - [ARCH]

What:
- Added mounted `AgentInfoSkillsTab` characterization for skill deny loading, toggling, hover peeks, Manage Skills routing, failed-toggle rollback, and render stability.
- Added shared `mission-agents-api` tests for skill override writes and denied-skill mapping.
- Moved skill override/deny API calls to `@/lib/agents`, leaving Mission Control as a compatibility re-export.
- Split `AgentInfoSkillsTab.tsx` into local catalog, peek portal, and workflow section files while keeping state orchestration in the parent.
- Moved touched panel type imports to shared `@/lib/agents` and `@/lib/campaigns`.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next Team agent info panel LOC and private Mission Control boundary target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split and shared API boundary move.
- `AgentInfoSkillsTab.tsx` is now 207 LOC; extracted files are 114, 110, and 51 LOC.
- Focused mounted/shared API tests, focused ESLint, full web typecheck, LOC/import/style scans, and tsbuildinfo restoration passed.
- Browser/dev-server smoke was not run for this authenticated Team agent info surface; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoSkillsTab.tsx`
- `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoSkillCatalogSection.tsx`
- `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoSkillPeekPortal.tsx`
- `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoSkillWorkflowsSection.tsx`
- `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoSkillsTab.test.tsx`
- `apps/web/src/features/team/components/chat/agent-info-panel/agent-info-panel.types.ts`
- `apps/web/src/lib/agents/mission-agents-api.ts`
- `apps/web/src/lib/agents/mission-agents-api.test.ts`
- `apps/web/src/features/mission-control/services/missions.service.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 13:06] - [ARCH]

What:
- Added mounted `CreateSpaceModal` characterization for team/private payloads, permission selection, icon schema, validation, template browsing, create failures, and render stability.
- Split `CreateSpaceModal.tsx` into local header, identity fields, permission section, privacy section, and footer components.
- Kept reset, submit, close, and payload orchestration in the parent modal.
- Converted the existing modal copy to `DialogPrimitive.Description` and tokenized touched modal/input/button classes.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next Spaces modal LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `CreateSpaceModal.tsx` is now 177 LOC; extracted files are 34, 94, 180, 23, and 32 LOC.
- Focused mounted test, focused ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, stale-log scan, scoped diff check, and tsbuildinfo restoration passed.
- Browser/dev-server smoke was not run for this authenticated sidebar modal surface; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/spaces/components/CreateSpaceModal.tsx`
- `apps/web/src/features/spaces/components/CreateSpaceModal.test.tsx`
- `apps/web/src/features/spaces/components/create-space-modal/CreateSpaceModalHeader.tsx`
- `apps/web/src/features/spaces/components/create-space-modal/CreateSpaceModalIdentityFields.tsx`
- `apps/web/src/features/spaces/components/create-space-modal/CreateSpaceModalPermissionSection.tsx`
- `apps/web/src/features/spaces/components/create-space-modal/CreateSpaceModalPrivacySection.tsx`
- `apps/web/src/features/spaces/components/create-space-modal/CreateSpaceModalFooter.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 13:19] - [ARCH]

What:
- Added mounted `DriveFoldersPanel` characterization for Drive mapping load, dropdown actions, folder picker mapping, syncing callback, and render stability.
- Split `DriveFoldersPanel.tsx` into local dropdown, status indicator, and helper utility files.
- Kept Drive status/mapping fetches, polling, picker orchestration, busy state, and dropdown positioning in the parent panel.
- Tokenized touched toolbar/dropdown/status classes and moved dropdown positioning to shared `fixedFloatingPortalStyle`.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next Spaces docs toolbar LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `DriveFoldersPanel.tsx` is now 274 LOC; extracted files are 149, 37, and 38 LOC.
- Focused mounted test, focused ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, stale-log scan, scoped diff check, and tsbuildinfo restoration passed.
- Browser/dev-server smoke was not run for this authenticated Spaces docs toolbar surface; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/spaces/components/docs/DriveFoldersPanel.tsx`
- `apps/web/src/features/spaces/components/docs/DriveFoldersPanel.test.tsx`
- `apps/web/src/features/spaces/components/docs/drive-folders-panel/DriveFoldersDropdown.tsx`
- `apps/web/src/features/spaces/components/docs/drive-folders-panel/DriveMappingStatusIndicator.tsx`
- `apps/web/src/features/spaces/components/docs/drive-folders-panel/drive-folders-panel-utils.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 13:29] - [ARCH]

What:
- Added mounted `ImagesTab` characterization for image section rendering, existing image edit/remove callbacks, upload metadata collection, style-keyword generation, manual prompt edits, disabled generation, and rerender stability.
- Split `ImagesTab.tsx` into local upload-card and image-style-examples components.
- Kept style generation, prompt value, and top-level tab composition in `ImagesTab.tsx`.
- Removed unused local upload-card props and tokenized touched image tab/upload/example classes.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next Themes LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `ImagesTab.tsx` is now 165 LOC; extracted files are 196 and 62 LOC.
- Focused mounted test, focused ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, scoped diff check, and tsbuildinfo restoration passed.
- Browser/dev-server smoke was not run for this authenticated theme editor/settings surface; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/themes/components/ImagesTab.tsx`
- `apps/web/src/features/themes/components/ImagesTab.test.tsx`
- `apps/web/src/features/themes/components/images-tab/ImageUploadCard.tsx`
- `apps/web/src/features/themes/components/images-tab/ImageStyleExamples.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 13:36] - [ARCH]

What:
- Added mounted `FeatureUpdateMockup` characterization for title routing across Team, Skills, Brain/knowledge, Organization, Campaign, Mission, and generic thumbnails, plus rerender stability.
- Split fixed screenshot-style mockup primitives into `feature-update-mockups/feature-update-mockup-primitives.tsx`.
- Kept public `FeatureUpdateMockup` title routing and individual miniature compositions in the parent file.
- Marked the inline fixed color/dimension surface as an intentional thumbnail design exception.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next Updates LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `FeatureUpdateMockups.tsx` is now 282 LOC; extracted primitives file is 167 LOC.
- Focused mounted test, focused ESLint, full web typecheck, LOC/import scans, trailing-whitespace scan, stale-log scan, scoped diff check, and tsbuildinfo restoration passed.
- Focused style exception scan reports only documented fixed-thumbnail inline styles/colors.
- Browser/dev-server smoke was not run for this tiny notification thumbnail surface; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/updates/components/FeatureUpdateMockups.tsx`
- `apps/web/src/features/updates/components/FeatureUpdateMockups.test.tsx`
- `apps/web/src/features/updates/components/feature-update-mockups/feature-update-mockup-primitives.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 13:48] - [ARCH]

What:
- Added mounted `MissionControlToolbar` characterization for status/search/view callbacks, priority multi-select behavior, sort selection, outside-click close, and rerender stability.
- Split toolbar option metadata/types, mobile controls, desktop controls, search input, status menu, priority menu, sort menu, and selected-check UI into local props-driven files.
- Kept active-dropdown state, outside-click behavior, and pill expansion in `MissionControlToolbar.tsx`.
- Preserved public toolbar type exports from `MissionControlToolbar.tsx` for existing consumers.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next clean Mission Control toolbar LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `MissionControlToolbar.tsx` is now 83 LOC; extracted files are 18-133 LOC.
- Focused mounted test, focused ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, stale-log scan, scoped diff check, and tsbuildinfo restoration passed.
- Browser/dev-server smoke was not run for this authenticated Mission Control toolbar slice; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/mission-control/components/MissionControlToolbar.tsx`
- `apps/web/src/features/mission-control/components/MissionControlToolbar.test.tsx`
- `apps/web/src/features/mission-control/components/mission-control-toolbar/MissionControlDesktopToolbar.tsx`
- `apps/web/src/features/mission-control/components/mission-control-toolbar/MissionControlMobileToolbar.tsx`
- `apps/web/src/features/mission-control/components/mission-control-toolbar/MissionPriorityFilterMenu.tsx`
- `apps/web/src/features/mission-control/components/mission-control-toolbar/MissionSortMenu.tsx`
- `apps/web/src/features/mission-control/components/mission-control-toolbar/MissionStatusFilterMenu.tsx`
- `apps/web/src/features/mission-control/components/mission-control-toolbar/MissionToolbarSearchInput.tsx`
- `apps/web/src/features/mission-control/components/mission-control-toolbar/MissionToolbarSelectedCheck.tsx`
- `apps/web/src/features/mission-control/components/mission-control-toolbar/mission-control-toolbar-options.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 13:56] - [ARCH]

What:
- Added mounted `CrmContactsContainer` characterization for list loading, row navigation, status filter query shape, column visibility, filter drawer open/apply, and rerender stability.
- Split storage/cache/default-column/sort/column option helpers into local `crm-contacts-container-utils.ts`.
- Extracted the Contacts sticky toolbar, status pills, search, filter/sort/columns/refresh controls, and dropdowns into local `CrmContactsToolbar.tsx`.
- Converted touched Contacts self-feature imports to relative imports.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next clean Contacts LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `CrmContactsContainer.tsx` is now 222 LOC; extracted files are 217 and 88 LOC.
- Focused mounted test, focused ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, stale-log scan, scoped diff check, and tsbuildinfo restoration passed.
- Browser/dev-server smoke was not run for this authenticated Contacts list container; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/contacts/components/CrmContactsContainer.tsx`
- `apps/web/src/features/contacts/components/CrmContactsContainer.test.tsx`
- `apps/web/src/features/contacts/components/crm-contacts-container/CrmContactsToolbar.tsx`
- `apps/web/src/features/contacts/components/crm-contacts-container/crm-contacts-container-utils.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 14:10] - [ARCH]

What:
- Added mounted `UseTemplateConfirmDialog` characterization for template detail loading, create payloads, cache/store/router side effects, failed-create sanitization, and rerender stability.
- Split included-items rendering and privacy/default-permission rendering into local props-driven files.
- Kept detail fetching, create orchestration, store/cache updates, navigation, and dropdown measurement/listener state in the parent.
- Converted touched Spaces self-feature imports to relative imports and cleaned touched token/style drift.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next clean Spaces template dialog LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `UseTemplateConfirmDialog.tsx` is now 281 LOC; extracted files are 96, 143, and 13 LOC.
- Focused mounted test, focused ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, stale-log scan, scoped diff check, and tsbuildinfo restoration passed.
- Focused style scan reports only preserved dynamic portal menu geometry in `TemplatePrivacySection.tsx`.
- Browser/dev-server smoke was not run for this authenticated Spaces template dialog surface; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/spaces/components/templates/UseTemplateConfirmDialog.tsx`
- `apps/web/src/features/spaces/components/templates/UseTemplateConfirmDialog.test.tsx`
- `apps/web/src/features/spaces/components/templates/use-template-confirm-dialog/TemplateIncludedItemsSection.tsx`
- `apps/web/src/features/spaces/components/templates/use-template-confirm-dialog/TemplatePrivacySection.tsx`
- `apps/web/src/features/spaces/components/templates/use-template-confirm-dialog/use-template-confirm-dialog-options.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 14:23] - [ARCH]

What:
- Added mounted `AgentVoiceMode` characterization for live-session scope wiring, start-session behavior, visible turn rendering, voice controls, task panel rendering, and rerender stability.
- Split the voice session header, transcript rendering, and voice-mode helpers into local props-driven files.
- Rewired Team voice mode and its task panel away from Mission Control and Studio private imports to shared agent/chat boundaries.
- Added documented non-barrel transitional adapters for the Brain voice orb scene and Brain live-session hook.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the next clean Team voice-mode LOC and cross-feature-import target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `AgentVoiceMode.tsx` is now 247 LOC; extracted files are 133, 121, and 44 LOC.
- Focused mounted test, focused ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, and tsbuildinfo restoration passed.
- Team voice files no longer import Mission Control or Studio private paths directly; remaining Brain feature imports are isolated inside documented transitional adapters.
- Browser/dev-server smoke was not run for this authenticated Team voice surface; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/team/components/voice/AgentVoiceMode.tsx`
- `apps/web/src/features/team/components/voice/AgentVoiceMode.test.tsx`
- `apps/web/src/features/team/components/voice/VoiceTaskPanel.tsx`
- `apps/web/src/features/team/components/voice/agent-voice-mode/AgentVoiceSessionHeader.tsx`
- `apps/web/src/features/team/components/voice/agent-voice-mode/AgentVoiceTranscript.tsx`
- `apps/web/src/features/team/components/voice/agent-voice-mode/agent-voice-mode-utils.ts`
- `apps/web/src/components/chat/BrainVoiceOrbSceneAdapter.tsx`
- `apps/web/src/lib/brain/brain-live-session-adapter.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 14:40] - [ARCH]

What:
- Added mounted `ProjectSupabasePanel` characterization for Supabase OAuth redirect, project provision payloads, existing-project link failures, database-browser delegation, and rerender stability.
- Split the project Supabase select, provision/link forms, and disconnected/status views into local props-driven files.
- Kept Supabase status loading, org/project loading, selected values, dropdown listener state, provision/link orchestration, and database-browser delegation in the parent.
- Removed moved inline code and cleaned touched status/icon/dropdown style drift.

Why:
- Continue Phase 3 Type 3-E frontend cleanup by resolving the Projects Supabase panel LOC target with mounted runtime coverage.

Impact:
- Behavior-neutral frontend split.
- `ProjectSupabasePanel.tsx` is now 214 LOC; extracted files are 200, 120, and 77 LOC.
- Focused mounted test, focused ESLint, full web typecheck, LOC/import/style scans, trailing-whitespace scan, stale-log scan, scoped diff check, and tsbuildinfo restoration passed.
- Adjacent `ProjectPage.tsx` Studio resize-helper imports are logged as follow-up boundary debt.
- Browser/dev-server smoke was not run for this authenticated Projects database panel; mounted runtime coverage is current evidence.

Files:
- `apps/web/src/features/projects/components/ProjectSupabasePanel.tsx`
- `apps/web/src/features/projects/components/ProjectSupabasePanel.test.tsx`
- `apps/web/src/features/projects/components/project-supabase-panel/ProjectSupabaseForms.tsx`
- `apps/web/src/features/projects/components/project-supabase-panel/ProjectSupabaseSelect.tsx`
- `apps/web/src/features/projects/components/project-supabase-panel/ProjectSupabaseStatusViews.tsx`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/logs/changelog2026-06-30.md`

## [2026-06-30 14:50] - [STYLE]
What: Removed the "Proof" kicker from the executive-brief industries section; saved Adley, Brian, and ROAS images to `public/proof/`; tuned avatar crop and logo contain styles.
Why: User-provided proof assets were missing and the section kicker was unwanted.
Impact: Proof story cards now show portrait photos and the ROAS logo with correct framing.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css, apps/website/public/proof/

## [2026-06-30 15:05] - [STYLE]
What: Moved the ROAS logo out of the avatar slot to the top-right corner of its proof card at a larger size.
Why: The logo read better as a corner mark than a small square avatar.
Impact: ROAS card shows name/context on the left with the logo anchored top-right above the stats.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-30 15:20] - [DOCS]
What: Added live org team-member counts to executive-brief proof stories — Viralish 9, PT DOM 5, ROAS 10 (active `org_members` in production).
Why: Leadership pre-read should show real operating scale for each proof customer.
Impact: Proof card stats now include a team-members line for Adley, Brian, and ROAS.
Files: apps/website/src/app/executive-brief/executive-brief-data.ts

## [2026-06-30 15:35] - [STYLE]
What: Removed the ROAS logo black box via a CSS luminance mask; restyled proof stats as a lighter editorial row (label above value, body scale, top rule).
Why: The logo JPEG baked in a black field and the stat numbers were oversized and misaligned.
Impact: ROAS mark renders in foreground token color with no black surround; proof metrics read like a doc footer.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-30 16:10] - [FEATURE]
What: Replaced Neel with Hadassah Medical Center Limassol in executive-brief proof stories; added transparent `public/proof/hadassah.png` with wide logo styling.
Why: User requested Hadassah as the fourth proof customer, starting with the logo.
Impact: Fourth proof card shows the Hadassah logo and name; copy/stats unchanged for now.
Files: apps/website/src/app/executive-brief/executive-brief-data.ts, apps/website/src/app/globals.css, apps/website/public/proof/hadassah.png

## [2026-06-30 16:30] - [DOCS]
What: Wrote Hadassah proof-story copy from Sefy Olympus personal-brain call memories — greenfield medical launch, compliance-first Brain/funnel work, and three leadership stats.
Why: Replace leftover Neel placeholder with accurate executive-brief positioning grounded in Fathom/project notes.
Impact: Hadassah card now shows medical-launch context, compliance-first title/body, and 8+ services / 0→1 stack / 3 teams stats.
Files: apps/website/src/app/executive-brief/executive-brief-data.ts

## [2026-06-30 17:00] - [STYLE]
What: Redesigned executive-brief proof stories as unified cards with capability tags, TLDR label, identity header, and footer stats; added per-customer tags in data.
Why: Surface niches (marketing, ops, compliance, etc.) at a glance while keeping existing story copy.
Impact: Proof section reads as a scannable case index instead of a split zigzag layout.
Files: apps/website/src/app/executive-brief/executive-brief-data.ts, apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-30 17:20] - [FIX]
What: Reverted proof stories to left/right split layout — text + compact keyword line + small stat cards on one side, large image panel on the other; removed chips and TLDR label.
Why: Unified card redesign was rejected; user wanted pitch-style split with inline keywords only.
Impact: Original zigzag proof layout restored with keywords as muted dot-separated text and stats as compact cards under the story.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-30 17:35] - [STYLE]
What: Rebuilt proof stories using `solution-marketing-split-card` / `solution-marketing-visual-pane` from the marketing site — smaller images, stat cards overlaid on the visual, name caption bar at the bottom.
Why: Match the website mockup pattern the user referenced; prior layout had oversized images and stats on the wrong side.
Impact: Left/right split with copy pane + compact visual pane; stats float on the image above the caption chip.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-30 18:00] - [STYLE]
What: Reverted proof stories to original small-image layout — 50/50 zigzag with copy left, compact avatar card right (ROAS logo top-right), editorial stats row; removed keywords/tags and large visual panes.
Why: User requested the pre-redesign layout with small image on the right column.
Impact: Proof section matches original executive-brief pattern; Hadassah story and copy preserved.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/executive-brief/executive-brief-data.ts, apps/website/src/app/globals.css

## [2026-06-30 18:15] - [STYLE]
What: Removed avatar image borders and stat divider lines (top rule + column separators) on executive-brief proof cards.
Why: User requested cleaner proof card visuals without bordered images or in-between stats.
Impact: Proof avatars and stats read as open layout with gap spacing only.
Files: apps/website/src/app/globals.css

## [2026-06-30 18:25] - [STYLE]
What: Wrapped each executive-brief proof stat in a compact chip (bordered card pill with label + value stacked).
Why: User requested stats display as small chips instead of open inline text.
Impact: Proof stats read as discrete tagged metrics in a flex-wrap row.
Files: apps/website/src/app/globals.css

## [2026-06-30 18:35] - [STYLE]
What: Split proof stats on the card side — KPI labels as plain text above, numeric values only in chips below.
Why: User wanted descriptive metrics outside chips with data in chips underneath.
Impact: Right column shows label + value chip pairs instead of both inside one chip.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-30 18:45] - [STYLE]
What: Moved proof outcome labels (e.g. messages in 72 hours, client capacity) to the text column; card column keeps numeric value chips only.
Why: Outcome descriptors belong with the story copy, not the identity/image side.
Impact: Text side reads context → title → body → outcomes; card side shows avatar + metric chips.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-30 19:00] - [FIX]
What: Reverted proof stats to label+value chips on the card/image side only.
Why: User rejected split layout and text-column outcome labels.
Impact: Card side back to compact chips with label and value stacked inside each.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-30 15:14] - [ARCH]
What: Split the Spaces Paid Ads toolbar into local controls and moved paid-ads fetch/status helpers into shared `@/lib/artifacts/paid-ads-api`.
Why: Phase 3 frontend remediation needed the toolbar under the component LOC cap and its direct Studio service import removed without changing behavior.
Impact: `PaidAdsToolbar.tsx` is now 113 LOC with mounted coverage for mode/search/refresh/publish behavior; Studio keeps compatibility re-exports while small Spaces paid-ads consumers use shared artifact API/types.
Files: apps/web/src/features/spaces/views/artifacts/PaidAdsToolbar.tsx, apps/web/src/features/spaces/views/artifacts/PaidAdsToolbar.test.tsx, apps/web/src/features/spaces/views/artifacts/paid-ads-toolbar/PaidAdsModeMenu.tsx, apps/web/src/features/spaces/views/artifacts/paid-ads-toolbar/PaidAdsSearchControls.tsx, apps/web/src/features/spaces/views/artifacts/paid-ads-toolbar/PaidAdsMetaRefreshButton.tsx, apps/web/src/features/spaces/views/artifacts/paid-ads-toolbar/PaidAdsPrimaryActions.tsx, apps/web/src/lib/artifacts/paid-ads-api.ts, apps/web/src/lib/artifacts/funnel-settings-api.ts, apps/web/src/lib/artifacts/index.ts, apps/web/src/features/studio/services/artifact-preview.service.ts, apps/web/src/features/spaces/components/artifacts/paid-ads/use-paid-ads-data.ts, apps/web/src/features/spaces/components/artifacts/paid-ads/PaidAdsCreativesPane.tsx

## [2026-06-30 15:22] - [ARCH]
What: Added mounted coverage for `PaidAdsPublishFlow` and moved its data/type imports to shared artifact/campaign APIs with documented Meta publish modal adapters.
Why: Spaces paid-ads publish flow still imported Studio service/type/modal paths directly after the toolbar split.
Impact: `PaidAdsPublishFlow.tsx` no longer imports Studio service/type/private-modal paths directly; remaining true modal ownership debt is isolated in non-barrel `@/components/artifacts/paid-ads` adapters.
Files: apps/web/src/features/spaces/components/artifacts/paid-ads/PaidAdsPublishFlow.tsx, apps/web/src/features/spaces/components/artifacts/paid-ads/PaidAdsPublishFlow.test.tsx, apps/web/src/components/artifacts/paid-ads/MetaIntegrationsReviewModalAdapter.tsx, apps/web/src/components/artifacts/paid-ads/MetaPublishModalAdapter.tsx, documentation/frontend-shared-surfaces.md, .docs/plans/architecture-compliance-remediation.md, .docs/plans/agent-follow-up-work.md

## [2026-06-30 19:30] - [STYLE]
What: Executive-brief section rhythm (hero through proof): grid/beam confined to hero, surface ladder on pain/explore/use cases/quote bands, subtle emerald wash on proof.
Why: User-approved background rhythm to separate sections without layout changes.
Impact: Hero reads loud; calm surface blocks alternate with deep/panel quote bands; proof opens darker accent band; sections after proof unchanged.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/globals.css

## [2026-06-30 19:45] - [STYLE]
What: Extended executive-brief section surface rhythm to Security (surface), Pilot (deep), and CTA (deep-darker); removed site footer from the page.
Why: Complete the approved background-only pass and keep the pre-read as a standalone document.
Impact: Full page alternates neutral bands; CTA closes on darkest band with emerald banner; no footer chrome.
Files: apps/website/src/app/executive-brief/ExecutiveBriefContent.tsx, apps/website/src/app/executive-brief/page.tsx, apps/website/src/app/globals.css

## [2026-06-30 15:51] - [ARCH]
What: Added mounted coverage for `PaidAdsStructurePane`, moved paid-ads campaign/ad-set API helpers into shared `@/lib/artifacts/paid-ads-api`, and split the structure pane into local sidebar/tree/action/menu files under the frontend LOC cap.
Why: Phase 3 frontend remediation needed the 1029 LOC Spaces paid-ads structure component below the component cap and off direct Studio service/type imports without changing behavior.
Impact: `PaidAdsStructurePane.tsx` is now 214 LOC, all extracted local structure files are under 400 LOC, and Studio keeps compatibility re-exports while Spaces uses the shared paid-ads API boundary.
Files: apps/web/src/features/spaces/components/artifacts/paid-ads/PaidAdsStructurePane.tsx, apps/web/src/features/spaces/components/artifacts/paid-ads/PaidAdsStructurePane.test.tsx, apps/web/src/features/spaces/components/artifacts/paid-ads/paid-ads-structure/PaidAdsStructureSidebar.tsx, apps/web/src/features/spaces/components/artifacts/paid-ads/paid-ads-structure/PaidAdsStructureTreeBlocks.tsx, apps/web/src/features/spaces/components/artifacts/paid-ads/paid-ads-structure/PaidAdsStructureRowMenuHost.tsx, apps/web/src/features/spaces/components/artifacts/paid-ads/paid-ads-structure/use-paid-ads-structure-actions.ts, apps/web/src/features/spaces/components/artifacts/paid-ads/paid-ads-structure/paid-ads-structure-action-utils.ts, apps/web/src/features/spaces/components/artifacts/paid-ads/paid-ads-structure/paid-ads-structure-helpers.ts, apps/web/src/lib/artifacts/paid-ads-api.ts, apps/web/src/lib/artifacts/paid-ads-api.test.ts, apps/web/src/lib/artifacts/artifact-preview-api.ts, apps/web/src/features/studio/services/artifact-preview.service.ts, .docs/plans/architecture-compliance-remediation.md, .docs/plans/agent-follow-up-work.md

## [2026-06-30 13:43] - [FIX]

What: Loop agent sync now reads the system `agents_registry` row when materializing `skills/vibey-api` for system agents.
Why: Personal sync queried `user_id = current user` only, so Loop never got `SKILL.md` / `ALLOWED_ACTIONS.json` and chat failed with `runtime_not_ready:loop:missing_vibey_api_skill`.
Impact: Loop runtime passes inspection after sync; flow-build messages can proceed once OpenClaw gateway is running.
Files: apps/agent-api/src/modules/agent-sync/repositories/agent-sync-materialization.repository.ts, apps/agent-api/src/modules/agent-sync/services/agent-sync-agent.service.ts, apps/agent-api/src/modules/agent-sync/services/agent-sync.materialization-access.test.ts

## [2026-06-30 13:45] - [FIX]

What: Artifact RBAC now falls back to the platform system `agents_registry` row for protected system agents (Loop, HR, Atlas, etc.).
Why: `get_flow_build_context` failed with `Unknown agent "loop"` because authorization only queried `user_id = current user`, but Loop is registered with `user_id IS NULL`.
Impact: Loop can call flow build tools in `/flows` chat; Build tab should populate when Loop plans a flow.
Files: apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-runtime.repository.ts, apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-runtime.repository.test.ts

## [2026-06-30 13:49] - [FIX]

What: Artifact authorization resolves protected system agents (Loop, HR, Atlas, etc.) from platform contracts when RLS hides the system `agents_registry` row from the user client.
Why: Registry fallback queries still ran under user JWT, so Loop stayed `Unknown agent` even after the scoped lookup fix.
Impact: Loop can authorize `get_flow_build_context` and other flow build tools in `/flows` chat.
Files: apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.test.ts

## [2026-06-30 13:52] - [FEATURE]

What: `/flows` Create anything mode auto-opens the Build tab when Loop chat starts and shows live build progress in `FlowBuildInspector`.
Why: User expects the right panel to visually build the flow (trigger + steps) while typing in Loop, not stay on Manage.
Impact: Sending a Loop message switches to Build immediately; inspector shows drafting/loading until the plan appears, then steps update via realtime.
Files: apps/web/src/features/flows/containers/FlowsPage.tsx, apps/web/src/features/flows/components/FlowBuildInspector.tsx

---

## [2026-06-30 13:57] - [FEATURE]

What: Build tab now shows the Zapier-style flow map (`AutomationFlowMap`) instead of text Plan/Steps lists.
Why: User expects a visual trigger → action canvas while Loop builds the flow in chat.
Impact: Build panel renders When/Then cards with arrows as steps arrive; compiled drafts use live flow data when available.
Files: apps/web/src/features/flows/components/FlowBuildVisualPanel.tsx, apps/web/src/lib/flows/flow-build-plan-automation.utils.ts, apps/web/src/features/spaces/components/automations/AutomationFlowMap.tsx, apps/web/src/features/flows/containers/FlowsPage.tsx

---

## [2026-06-30 14:05] - [FEATURE]

What: Build tab uses split canvas + step config layout (map right, When/Step forms left on click) matching the Flow Builder mock pattern.
Why: User HTML reference shows Zapier-style flow with clickable steps and a config pane, not map-only preview.
Impact: Live Loop builds show read-only step config on click; once compiled, full editable editor with add-step controls and autosave.
Files: apps/web/src/features/flows/components/FlowBuildVisualPanel.tsx, apps/web/src/features/flows/containers/FlowsPage.tsx

---

## [2026-06-30 14:12] - [UX]

What: Create anything mode hides Browse/Manage/Build tabs while Loop is building and shows the flow builder full-screen on the right (like the HTML mock).
Why: User expected the HTML FlowBuilder layout, not a separate Build tab buried in Manage.
Impact: After sending a Loop prompt in Create anything, right panel is only the builder canvas + step config; back arrow returns to flow list.
Files: apps/web/src/features/flows/containers/FlowsPage.tsx, apps/web/src/features/flows/components/nav/FlowsShell.tsx, apps/web/src/features/flows/components/FlowBuildVisualPanel.tsx

---

## [2026-06-30 14:18] - [FEATURE]

What: Rebuilt Loop flow builder UI to match standalone Flow Builder mock — centered STEP cards, type badges, connectors, dashed Add step, slide-in config panel, toolbar with Test run/Activate.
Why: User provided self-contained HTML mock; prior Build tab used AutomationFlowMap split editor, not the mock canvas.
Impact: Create anything + Loop build shows mock-style canvas; click a step opens right config panel; compiled drafts become editable with autosave.
Files: apps/web/src/features/flows/components/flow-builder/*, apps/web/src/lib/flows/flow-builder-canvas.utils.ts, apps/web/src/app/globals.css

---

## [2026-06-30 14:25] - [UX]

What: Flow builder uses standard Flows breadcrumb + tabs header; mock canvas is content-only below tabs (custom FlowBuilderToolbar removed).
Why: User wanted same header as Browse/Manage/History, with uploaded mock UI only for the step canvas + right config panel.
Impact: Build/Manage edit show `Flows / campaign / space / flow name` + tab bar; canvas fills the content area under tabs.
Files: apps/web/src/features/flows/containers/FlowsPage.tsx, apps/web/src/features/flows/components/nav/FlowsShell.tsx, apps/web/src/features/flows/components/FlowsEditorPanel.tsx, apps/web/src/features/flows/components/flow-builder/FlowBuilderStudio.tsx

---

## [2026-06-30 14:20] - [FIX]

What: Flow builder step Summary and canvas card subtitles now derive from live trigger/action config (e.g. "Changes status from To do to In progress", "Adds comment: \"Task completed.\"").
Why: Generic plan descriptions did not reflect configured from/to statuses or comment text.
Impact: Step detail panel and canvas cards update as users change trigger/action settings.
Files: apps/web/src/lib/flows/automation-flow-step-summary.utils.ts, apps/web/src/features/flows/components/flow-builder/FlowBuilderStepPanel.tsx, apps/web/src/lib/flows/flow-builder-canvas.utils.ts

---

## [2026-06-30 14:24] - [FIX]

What: Flow builder "Add step" button now appends a configurable action step and opens the right panel; Loop build view is editable as soon as a plan exists (autosave when automation_id is available).
Why: Add step was a dead button with no onClick, and create-anything mode kept the builder read-only until the compiled draft appeared in the flows list.
Impact: Users can add steps via UI or chat; new steps show as "Choose action" until configured in the panel.
Files: apps/web/src/features/flows/components/flow-builder/FlowBuilderStudio.tsx, apps/web/src/features/flows/components/FlowBuildVisualPanel.tsx, apps/web/src/features/flows/containers/FlowsPage.tsx, apps/web/src/lib/flows/flow-builder-canvas.utils.ts

---

## [2026-06-30 14:27] - [FEATURE]

What: Add step opens a category picker popover (Integration, Skill, Brain, Space, Human Gate, Condition, Action, Agent) matching the Flow Builder mock; canvas cards get color-accent hover/selection and gradient connectors.
Why: User expected the mock add-step menu and richer step card styling (colors, spacing).
Impact: Picking a category inserts a starter action and opens the config panel; step cards and connectors use per-type accent colors.
Files: apps/web/src/features/flows/components/flow-builder/FlowBuilderAddStepMenu.tsx, apps/web/src/lib/flows/flow-builder-step-types.utils.ts, apps/web/src/features/flows/components/flow-builder/FlowBuilderCanvas.tsx, apps/web/src/app/globals.css

---

## [2026-06-30 14:29] - [FIX]

What: Add step menu caps height to available viewport space, scrolls when needed, and opens below the button when there is more room (flips above only when necessary).
Why: Popover grew upward over existing step cards and clipped off-screen on longer flows.
Impact: Category picker stays within the viewport and no longer covers the flow canvas.
Files: apps/web/src/features/flows/components/flow-builder/FlowBuilderAddStepMenu.tsx, apps/web/src/app/globals.css

---

## [2026-06-30 14:33] - [FEATURE]

What: Webhook is a first-class Step 1 option in the flow builder — "Start flow" menu sets `webhook_received` trigger with endpoint picker in the config panel; canvas shows Webhook badge and live summary.
Why: Webhooks lived only on a separate tab; user expects webhook-triggered flows to be built as steps like other triggers.
Impact: Pick Webhook from Add step → configure endpoint via TriggerBuilder; Webhooks tab remains for URL/secret/mappings management.
Files: apps/web/src/lib/flows/flow-builder-step-types.utils.ts, apps/web/src/features/flows/components/flow-builder/FlowBuilderStudio.tsx, apps/web/src/lib/flows/flow-builder-canvas.utils.ts, apps/web/src/lib/flows/automation-flow-step-summary.utils.ts

---

## [2026-06-30 14:31] - [FIX]

What: Build tab flow builder wired end-to-end — canvas labels/badges follow live trigger/action config; add-step categories map to real automation types; step panel supports remove + ActionBuilder/TriggerBuilder edits with autosave indicator.
Why: UI looked functional but plan metadata stale-overrode user changes; Integration category incorrectly defaulted to send_to_cursor; no delete or save feedback on Build tab.
Impact: Add/configure/remove steps persist to draft via updateFlowDraft when automation_id exists; Integration/Human Gate/Condition open action picker; Agent/Space/Brain/Skill/Action insert configured starters.
---

## [2026-06-30 15:03] - [FEATURE]

What: Consolidated Browse hub — My Loops and History live in Browse sidebar; My templates peers with All templates; Make as template on loop card menu.
Why: Manage and History top tabs duplicated Browse; users wanted one discovery surface for templates, owned loops, run history, and personal templates.
Impact: Top tabs are Browse, Webhooks, Build, Clarifications only; My Loops opens the former Manage grid; History embeds in Browse; saving a template creates a `Template ·` draft shown under My templates.
Files: FlowsPage.tsx, FlowsBrowseHub.tsx, FlowsMyTemplatesPanel.tsx, FlowMenuDropdown.tsx, FlowsManageGridView.tsx, flows-page.types.ts, flow-user-template.utils.ts, flows-ui-labels.ts, FlowsBrowseHub.test.tsx, FlowsManagePanel.test.tsx

---

## [2026-06-30 15:03] - [STYLE]

What: Build tab flow builder hint moved above the canvas with updated copy.
Why: Users should see guidance before configuring steps, not after scrolling past the canvas.
Impact: Hint reads "Configure your flow or ask Loop in chat to add or change steps" at the top of the build canvas area.
Files: FlowBuilderStudio.tsx, globals.css

---

## [2026-06-30 15:05] - [STYLE]

What: Add-step picker uses settings modal shell — Radix dialog, blurred backdrop, surface-card + wizard-container-border.
Why: Custom overlay looked wrong (shape + flat tint overlapping the build panel).
Impact: Picker matches Account/Workspace Settings modal container and backdrop treatment.
Files: FlowBuilderAddStepPicker.tsx, globals.css

---

## [2026-06-30 15:07] - [FEATURE]

What: Flow builder Integrations tab lists full app catalog — connected first, then all available integrations.
Why: Apps tab was a short hardcoded list and mislabeled; users need every integration they can connect in Settings.
Impact: Sidebar says Integrations; grid shows Connected + All integrations sections; each integration opens triggers/actions or a configurable integration step.
Files: flow-builder-picker-catalog.utils.ts, FlowBuilderAddStepPicker.tsx, flow-builder-step-types.utils.ts, use-flow-builder-connected-integrations.ts, flow-builder-picker-catalog.utils.test.ts

---

## [2026-06-30 15:12] - [FEATURE]

What: Integrations picker matches Settings — connected detection, list rows with proper logos; Agents tab lists workspace agents; Space moved to Utilities.
Why: Connected integrations were invisible (overview-only fetch); grid logos looked wrong; Agents tab was generic; Space tab cluttered sidebar.
Impact: Connected section uses same merge logic as Settings (org overview + Composio + Slack); integration rows match connector layout; Agents tab picks a specific agent; no Space sidebar tab.
Files: fetch-connected-integration-ids.ts, use-flow-builder-connected-integrations.ts, FlowBuilderAddStepPicker.tsx, flow-builder-step-types.utils.ts

---

## [2026-06-30 15:12] - [STYLE]

What: Browse sidebar puts My Loops and History at the top, above Templates.
Why: Your loops and run history are primary destinations, not buried under Library at the bottom.
Impact: My Loops and History appear directly under Add flow, separated from template filters below.
Files: FlowsBrowseHub.tsx

---

## [2026-06-30 15:20] - [FIX]

What: Clicking a draft flow card in My Loops opens the flow builder for that flow.
Why: Draft cards had no card-level click handler; only the bottom icon buttons worked.
Impact: Grid and list draft cards open FlowsEditorPanel on click; action buttons still work independently.
Files: FlowsManageGridView.tsx, FlowsManageListView.tsx, FlowDraftCardActions.tsx

---

## [2026-06-30 15:28] - [FEATURE]

What: Flow editor shows a back button and hides top section tabs (including Build) while editing a flow from My Loops.
Why: Card click opens the builder directly; a separate Build tab and Browse/Webhooks tabs were redundant in that view.
Impact: Back returns to My Loops list; Build tab still appears for Loop build sessions when not in the flow editor.
Files: FlowsEditorPanel.tsx, FlowsShell.tsx, FlowsPage.tsx

---

## [2026-06-30 15:24] - [REFACTOR]

What: Removed Build and Webhooks top tabs; Webhooks moved to browse sidebar bottom; Build tab removed entirely.
Why: Flow cards open the builder directly; top tabs were redundant clutter.
Impact: Webhooks lives in sidebar; Build tab gone (Loop builds open My Loops editor); top tabs only show during clarifications.
Files: FlowsBrowseHub.tsx, FlowsSectionTabs.tsx, FlowsShell.tsx, FlowsPage.tsx, flows-page.types.ts

---

## [2026-06-30 15:26] - [STYLE]

What: Removed duplicate New flow button from My Loops toolbar top-right.
Why: Add flow already lives in the browse sidebar; the toolbar button was redundant.
Impact: My Loops toolbar keeps filters and view controls only.
Files: FlowsToolbar.tsx, FlowsManagePanel.tsx, FlowsPage.tsx

---

## [2026-06-30 15:30] - [STYLE]

What: Moved Add description control into the top breadcrumb, next to the flow name.
Why: Description belonged with the flow title in the header, not in the editor toolbar corner.
Impact: Breadcrumb shows `Untitled flow draft · Add description`; editor bar keeps back, validate, and publish only.
Files: FlowsBreadcrumbHeader.tsx, FlowsShell.tsx, FlowsEditorPanel.tsx, FlowsPage.tsx

---

## [2026-06-30 15:30] - [FIX]

What: New flows start with an empty trigger step ("Select your trigger") instead of a pre-filled task + comment template.
Why: Every Add flow draft used the same default trigger/actions, so all builders looked identical.
Impact: Blank drafts show one trigger step with setup panel open; each flow stays distinct once configured.
Files: FlowsPage.tsx, FlowBuilderStudio.tsx, flow-builder-canvas.utils.ts, automation-flow-step-summary.utils.ts, automation-publishable.ts, describe-flow-trigger.ts, space-schema.ts, space-automation-trigger.dto.ts

---

## [2026-06-30 15:32] - [FIX]

What: Fixed Delete flow opening the builder instead of showing the delete confirm dialog.
Why: Closing the menu on mousedown let the click pass through to the flow card underneath.
Impact: Delete opens a confirm dialog; confirming deletes and stays on My Loops (closes editor if that flow was open).
Files: FlowMenuDropdown.tsx, FlowsManageGridView.tsx, FlowsPage.tsx

---

## [2026-06-30 15:34] - [FIX]

What: Stopped delete confirm from briefly opening the flow editor after clicking Delete.
Why: Dialog dismiss let a ghost click reach the flow card before delete finished clearing selection.
Impact: Confirm delete stays on My Loops; card open is suppressed for 600ms and selection clears before the API call.
Files: flow-card-open-suppress.ts, FlowsPage.tsx, FlowsManageGridView.tsx, ConfirmDialog.tsx

---

## [2026-06-30 15:38] - [FEATURE]

What: Blank flows show an empty "Select trigger" + slot on the canvas; clicking it opens the full trigger picker (space, integrations, webhook).
Why: Trigger selection should match action steps — pick from the popup, not pre-filled dropdowns in the side panel.
Impact: New flows start with a dashed + trigger slot; side panel opens only after a trigger is chosen.
Files: FlowBuilderCanvas.tsx, FlowBuilderStudio.tsx, FlowBuilderAddStepPicker.tsx, flow-builder-canvas.utils.ts, flow-builder-picker-catalog.utils.ts

---

## [2026-06-30 15:41] - [FIX]

What: Trigger picker home columns scroll independently — Space list no longer scrolls the whole modal.
Why: The outer list container was scrolling all three columns together when Space overflowed.
Impact: Only the overflowing column scrolls; integrations and Other stay fixed in place.
Files: globals.css, FlowBuilderAddStepPicker.tsx

---

## [2026-06-30 15:43] - [FIX]

What: Trigger picker Integrations tab lists Workspace triggers first, then workspace connections, then all integrations.
Why: Third-party apps appeared before native workspace triggers and connected org integrations.
Impact: Integrations tab order is Workspace → Workspace connections → All integrations.
Files: FlowBuilderAddStepPicker.tsx

---

## [2026-06-30 15:48] - [FEATURE]

What: Connected-app triggers show app + event dropdowns in setup; canvas and panel use integration logos (e.g. Fathom).
Why: Connected Apps only showed a flat event list and generic plug icon instead of app → event hierarchy.
Impact: Setup shows Trigger on → Connected app → Trigger event; Fathom/Slack/Gmail steps show brand logos.
Files: flow-builder-connected-app-trigger.utils.ts, FlowBuilderStepSetupPanel.tsx, FlowBuilderStepIcon.tsx, FlowBuilderCanvas.tsx, FlowBuilderStepPanel.tsx, flow-builder-canvas.utils.ts, globals.css

---

## [2026-06-30 15:49] - [FIX]

What: Agent action steps label as "Run agent" instead of "Run task" in the flow builder.
Why: send_to_agent summary title was misnamed.
Impact: Canvas step card and setup panel header match the Agent step type.
Files: automation-flow-step-summary.utils.ts

---

## [2026-06-30 15:51] - [FEATURE]

What: Agent action steps show the agent's avatar from team roster instead of the generic bot icon.
Why: Run agent steps should visually identify which agent runs, like connected apps show logos.
Impact: Canvas, panel header, and setup card use roster avatar_url when agent_key is set.
Files: flow-builder-agent-avatar.utils.ts, FlowBuilderStepIcon.tsx, flow-builder-canvas.utils.ts, FlowBuilderCanvas.tsx, FlowBuilderStepPanel.tsx, FlowBuilderStepSetupPanel.tsx, globals.css

---

## [2026-06-30 16:26] - [FIX]

What: Stronger draft ↔ Loop session linking (automation_id, fuzzy names, stale targets) and openFlowWorkspace now resolves both sides and dispatches Loop chat immediately.
Why: Duplicate draft rows still appeared and clicking one side did not open the builder or chat on the other.
Impact: Matching "Comment on Task Completed" draft + planned build merges to one row; either click opens builder + Loop chat together.
Files: map-flow-draft-build-links.ts, FlowsPage.tsx

---

## [2026-06-30 16:21] - [FEATURE]

What: Draft flows and Loop build sessions are unified — one row per loop, clicking opens the visual builder and Loop chat together; manual drafts auto-link to a Loop session.
Why: Users saw duplicate "Comment on Task Completed" rows (draft + build in progress) and opening one did not open the other.
Impact: Click any draft or in-progress build to get builder + Loop chat; orphan sessions dedupe when they match a draft by name; Add flow creates a linked Loop session.
Files: map-flow-draft-build-links.ts, FlowsPage.tsx, FlowsManagePanel.tsx, FlowsManageGridView.tsx, FlowsManageListView.tsx

---

## [2026-06-30 16:14] - [FIX]

What: Flow card ⋯ menu Rename opens an in-app dialog instead of window.prompt; menu actions show toast errors on failure.
Why: window.prompt does not appear in the embedded browser, so Rename looked like a no-op.
Impact: Rename, duplicate, publish, delete, and other menu actions give visible feedback when they succeed or fail.
Files: FlowRenameDialog.tsx, FlowMenuDropdown.tsx, FlowsManageGridView.tsx, FlowsPage.tsx

---

## [2026-06-30 16:08] - [FEATURE]

What: My Loops defaults to list view; list rows now include the same action buttons as card view (⋯ menu, validation alert, draft plan/draft/session actions).
Why: User requested list as the default layout with full action parity.
Impact: Opening My Loops shows list view by default; draft and published rows support context menu, attention alert, and draft shortcuts.
Files: FlowsPage.tsx, FlowsManageListView.tsx, FlowsManageGridView.tsx, FlowCardAttentionAlert.tsx

---

## [2026-06-30 16:05] - [FEATURE]

What: Flow builder steps show configuration status on the canvas — green check when complete, amber alert when setup done but fields missing, dashed border when type not chosen.
Why: Zapier-style at-a-glance visibility for which steps still need work.
Impact: Fathom + configured agent steps show checkmarks; incomplete steps show warning or dashed outline.
Files: flow-builder-step-phase.utils.ts, flow-builder-canvas.utils.ts, FlowBuilderCanvas.tsx, globals.css

---

## [2026-06-30 15:35] - [FIX]

What: Blank new flows no longer auto-validate or show "Can't publish yet"; trigger setup shows empty dropdowns instead of pre-selecting Tasks.
Why: Auto-validation ran publish-ready checks against choose_action placeholder trigger and empty actions.
Impact: Add flow opens a clean builder with no red validation banner until trigger and actions are configured.
Files: automation-publishable.ts, FlowsPage.tsx, FlowsEditorPanel.tsx, FlowBuilderStepSetupPanel.tsx

---

## [2026-06-30 16:30] - [FIX]

What: Draft list dedupes all build sessions tied to the same draft (by id or plan name), not just the first match.
Why: A manual draft plus a Loop build session for the same flow showed as two DRAFTS rows.
Impact: One row per draft; clicking it still opens builder + Loop chat via the preferred linked session.
Files: apps/web/src/features/flows/lib/map-flow-draft-build-links.ts, apps/web/src/features/flows/lib/__tests__/map-flow-draft-build-links.test.ts

---

## [2026-06-30 16:33] - [FIX]

What: Add flow now creates a dedicated Loop conversation, links it to the build session, and expands the Loop chat panel alongside the builder.
Why: ensureBuildSession reused an old chat or left conversation_id null; loopBuildPanelPinned never expanded the side panel.
Impact: Add flow opens builder + fresh Loop chat in sync; opening an existing draft selects its linked conversation and opens the panel.
Files: apps/web/src/features/flows/containers/FlowsPage.tsx, apps/web/src/lib/flows/loop-chat-conversation.ts, apps/web/src/features/team-2/containers/TeamHrSideChatLayout.tsx

---

## [2026-06-30 16:35] - [FIX]

What: Feature updates unread badge no longer reads sessionStorage/localStorage during the initial render.
Why: Server HTML omitted the Updates dot but the client showed it on hydration, triggering a Next.js mismatch in SidebarHqRail.
Impact: /flows and other dashboard routes hydrate cleanly; unread badge appears after mount when applicable.
Files: apps/web/src/features/updates/hooks/useFeatureUpdates.ts

---

## [2026-06-30 16:36] - [FIX]

What: Restored missing fetchDistinctContactSourceValues import in FlowsPage.
Why: Prior edit dropped the import when adding createNewConversation, causing a ReferenceError on /flows.
Impact: Flows page loads without runtime error.
Files: apps/web/src/features/flows/containers/FlowsPage.tsx

---

## [2026-06-30 17:19] - [FEATURE]

What: Added an "Open [flow name]" chip above the Loop composer for chats linked to a flow build session.
Why: Users in Loop chat had no obvious way to jump to the synced draft on the right.
Impact: Switching conversations updates the linked flow; clicking the chip opens that draft in the visual editor.
Files: map-flow-draft-build-links.ts, FlowComposerLinkedFlowButton.tsx, FlowsPage.tsx, map-flow-draft-build-links.test.ts

---

## [2026-06-30 17:15] - [FIX]

What: Untitled flow drafts auto-rename from the Loop build plan the first time trigger/actions are compiled.
Why: Add flow created placeholder drafts that stayed "Untitled" even after Loop planned a named flow with steps.
Impact: First compile names the draft from plan.name or step titles; already-named drafts are never overwritten.
Files: flow-builder.ts, artifact-flow-builder-plan.service.ts, FlowsPage.tsx, use-flow-build-session.ts, flow-builder-naming.test.ts, artifact-flow-builder.service.test.ts

---

## [2026-06-30 17:04] - [FIX]

What: Loop chat now opens the matching flow editor after the agent saves a draft; mermaid flow diagrams render instead of staying on "Rendering diagram…".
Why: Stream settle only refreshed build state without selecting the draft; mermaid used the elk renderer without a registered layout loader so render never completed.
Impact: After Loop builds or updates a flow, the right panel jumps to that draft's visual editor; mermaid blocks in chat hydrate reliably.
Files: FlowsPage.tsx, use-flow-build-session.ts, mermaid-diagram.tsx, MarkdownContent.tsx

---

## [2026-06-30 16:57] - [FIX]

What: Pending clarification cards no longer collapse into the "Worked for X" summary when Loop finishes streaming.
Why: buildFinalAnswerLayoutSegments hid any blocks before the final text block, including interactive clarification cards.
Impact: Question cards stay visible in chat after the stream ends; stale skipped flow blocks no longer block re-sync from DB.
Files: message-bubble.utils.ts, message-bubble.utils.test.ts, chat.service.ts, sync-flow-clarifications-to-chat.ts

---

## [2026-06-30 16:46] - [FIX]

What: Pending Loop clarification question cards survive the post-stream message refresh instead of disappearing.
Why: mergeMessagesPreservingOrderedBlocks dropped local clarification ui_blocks when the backend message already had text blocks.
Impact: Flow build questions stay visible in chat until answered or skipped.
Files: apps/web/src/features/studio/services/chat.service.ts, apps/web/src/features/studio/services/chat-message-merge.test.ts

---

## [2026-06-30 16:52] - [FIX]

What: Open flow build clarifications now render as interactive choice cards above the Loop composer and sync into chat when Loop uses create_flow_clarification.
Why: Loop often wrote questions as plain text only; the UI only showed cards from ephemeral message blocks.
Impact: Structured flow questions (1-3) stay visible and submittable until answered; answers persist through the flow build session API.
Files: flow-clarification-ui.ts, sync-flow-clarifications-to-chat.ts, FlowBuildClarificationsComposer.tsx, FlowsPage.tsx, FlowClarificationsView.tsx, MessageContentBlockSwitchPartB.tsx

---

## [2026-06-30 16:41] - [FIX]

What: Add flow now always creates a fresh Loop conversation, registers it in the chat panel, and selects it alongside the builder.
Why: Stale flows state skipped build-session creation; loadConversations cleared the new selection before the list caught up.
Impact: Add flow opens builder + empty Loop chat on the left, linked to that draft.
Files: FlowsPage.tsx, loop-chat-conversation.ts, TeamHrSideChatPanel.tsx

---

## [2026-06-30 17:33] - [FIX]

What: Draft row clicks, Draft action button, and Loop chat "Open flow" chip open the visual editor again; org flow list prefers compiled automation actions over empty definition stubs.
Why: isFlowCardOpenSuppressed was used without import (ReferenceError on every open); linked-flow open required effectiveSpaceId even in all-spaces view.
Impact: My Loops drafts open the builder; action counts reflect real steps instead of placeholder choose_action rows.
Files: FlowsPage.tsx, flow-card-open-suppress.ts (import), map-flow-draft-build-links.ts, describe-flow-trigger.ts, FlowsManageListView.tsx, FlowsManageGridView.tsx, org-automation-flows.service.ts

---

## [2026-06-30 17:36] - [FIX]

What: Mermaid diagrams in Loop chat hydrate reliably after page refresh instead of staying on "Rendering diagram…".
Why: Hydration ran once before code-block chrome re-rendered the markdown DOM; m.parse had no timeout and failed loads poisoned the module singleton.
Impact: Diagrams render after refresh; stuck placeholders retry and fall back to a clear error instead of spinning forever.
Files: mermaid-diagram.tsx, ChatMarkdownView.tsx, MarkdownContent.tsx, AgentConversationThread.tsx

---

## [2026-06-30 17:50] - [FIX]

What: Loop build plans now sync into the visual editor — placeholder drafts merge plan steps for immediate display and persist to the database after stream settle, on workspace open, and when the plan updates.
Why: Loop described Fathom → summarize → Slack in chat but the right-side canvas stayed on "Select trigger" because the draft row was never compiled from the session plan.
Impact: All planned trigger/action steps appear on the builder after Loop finishes; Slack channel and other integration fields can still be filled manually afterward without blocking compile.
Files: sync-flow-plan-to-draft.ts, FlowsPage.tsx, flows-loop-awareness-context.ts, artifact-flow-builder-plan.service.ts, sync-flow-plan-to-draft.test.ts, vitest.config.ts

---

## [2026-06-30 18:01] - [FIX]

What: Compile no longer spawns duplicate Untitled drafts; UI sync patches the linked draft instead of re-compiling; editor auto-opens after plan sync.
Why: API compile always INSERTed a new automation row; frontend sync also called compile when a draft already existed; Loop compile hit workflow circuit-open after retries so steps never landed in the editor.
Impact: One draft per build session; Fathom → agent → Slack steps write into the existing draft even when chat compile fails; Loop told not to call create_flow_draft during active sessions.
Files: space-flow-builder.service.ts, sync-flow-plan-to-draft.ts, FlowsPage.tsx, flows-loop-awareness-context.ts

---

## [2026-06-30 18:04] - [STYLE]

What: Loop chat composer linked-flow chip label shortened to "Open Loop".
Why: Full flow name made the chip too long in the composer footer.
Impact: Cleaner composer; aria-label unchanged intent for screen readers.
Files: FlowComposerLinkedFlowButton.tsx, FlowsPage.tsx

---

## [2026-06-30 18:10] - [FIX]

What: Mermaid diagrams retry hydration for 30s instead of a single pass; Open Loop reloads the linked draft, switches to the correct space, and bypasses open-suppress.
Why: Diagrams stuck on "Rendering diagram…" after code-block re-renders; Open Loop no-op when draft was missing from stale flows state or card-open suppress fired.
Impact: Chat diagrams recover reliably; Open Loop opens the visual editor for the linked build session.
Files: ChatMarkdownView.tsx, MarkdownContent.tsx, mermaid-diagram.tsx, FlowsPage.tsx

---

## [2026-06-30 18:20] - [FIX]

What: Open Loop and post-build auto-open now load flows in the linked draft's space, preserve selection across reloads, and use a pending editor hint so the canvas opens immediately.
Why: loadFlows cleared selectedFlowId after open because it used stale scope state; selectedFlow stayed null so the list view never switched to the editor.
Impact: Open Loop opens the visual editor; Loop stream settle auto-opens the compiled draft.
Files: FlowsPage.tsx, map-flow-draft-build-links.ts

---

## [2026-06-30 19:10] - [FEATURE]

What: Flow editor breadcrumb shows the loop's campaign and space instead of All campaigns / All spaces; multi-space loops list every install.
Why: Users could not see which campaign or space a flow belongs to while editing.
Impact: Breadcrumb reflects flow scope with tooltips; multi-space flows open a spaces dropdown; click space to focus that scope.
Files: resolve-flow-scope-locations.ts, FlowsFlowScopeBreadcrumb.tsx, FlowsBreadcrumbHeader.tsx, FlowsShell.tsx, FlowsPage.tsx, flows-ui-labels.ts

---

## [2026-06-30 19:35] - [FEATURE]

What: ROAS Ad Kit agency template (Slack channel → concepts → copy → human gate → design), five ROAS skills seeded on ads_manager, human_gate automation action.
Why: Agency pipeline for Meta ad kit with human approval before design render.
Impact: Install "ROAS Ad Kit (Slack)" under Agency in /flows; approve by moving task In Review → Done; run scripts/seed-roas-ad-skills.ts after migrate for PNG assets.
Files: space-automation-template-catalog-agency.ts, supabase/migrations/20260630200000_roas_ad_skills.sql, supabase/migrations/20260630201000_agency_roas_ad_kit_template.sql, scripts/seed-roas-ad-skills.ts, docker/agents/templates/ads_manager/skills/**, space-automation-action.dto.ts, space-automation-service-07/09/15.base.ts, flow-builder-step-types.utils.ts, FlowsShell.tsx

---

## [2026-06-30 19:35] - [FIX]

What: FlowsShell destructures hideSectionTabs and showClarificationsTab props.
Why: Runtime ReferenceError crashed /flows when section tabs were conditional.
Impact: /flows loads again.
Files: FlowsShell.tsx

---

## [2026-06-30 20:15] - [FIX]

What: Template install opens the new flow editor; orphan Loop build rows no longer duplicate published flows.
Why: Installing from /flows templates showed success but stayed on browse; compiled Loop sessions for published flows appeared as extra draft rows.
Impact: Clicking a template lands in the flow editor; "Loop build in progress" orphans hide when session matches a published flow.
Files: FlowsBrowseHub.tsx, FlowsBrowseView.tsx, FlowsPage.tsx, map-flow-draft-build-links.ts, map-flow-draft-build-links.test.ts

---

## [2026-06-30 20:20] - [FIX]

What: Flow editor canvas scrolls inside the panel; opening a flow only reuses Loop chat when the session belongs to that flow; template install starts a fresh Loop thread.
Why: Long flows were clipped with no scroll; stale Loop conversation from a prior build showed while editing ROAS Ad Kit.
Impact: Full step list scrolls above the validation banner; template install and unrelated flows get the correct Loop chat.
Files: FlowsEditorPanel.tsx, FlowBuilderStudio.tsx, FlowsPage.tsx

---

## [2026-06-30 20:25] - [STYLE]

What: Flow builder step status icon (configured / needs setup) moved next to STEP label instead of beside the step icon.
Why: Tighter card layout; step icon aligns cleanly with title row.
Impact: Checkmark or warning appears beside STEP 1, STEP 2, etc.
Files: FlowBuilderCanvas.tsx, globals.css

---

## [2026-06-30 20:35] - [FEATURE]

What: Connected-app trigger setup reordered — Trigger on first, integration summary card second, Connect app with OAuth account picker or connect button third.
Why: Setup panel layout did not match how users connect Slack and other integrations.
Impact: Pick Connected Apps → see app summary → Connect app to select Slack and link account or start OAuth.
Files: FlowBuilderStepSetupPanel.tsx, FlowConnectedAppConnectField.tsx, flow-builder-connected-app-trigger.utils.ts

---

## [2026-06-30 20:50] - [STYLE]

What: Connected-app integration banner sits under Connect app dropdown with Connected / Not connected badge, Connect CTA, and account picker.
Why: Integration card was above app picker; connect flow should follow app selection.
Impact: Select Slack → banner shows status → Connect or pick account → Trigger event.
Files: FlowBuilderStepSetupPanel.tsx, FlowConnectedAppConnectField.tsx

---

## [2026-06-30 20:40] - [STYLE]

What: Flow editor validation errors moved from bottom banner to compact callout beside Publish.
Why: Bottom bar consumed canvas space and clipped long flows.
Impact: First validation error shows next to Publish with tooltip for full list; Ask Loop to fix stays inline.
Files: FlowsEditorPanel.tsx

---

## [2026-06-30 21:08] - [FEATURE]

What: Human gate architecture — needs_revision status, reviewer assignment, reject resume with feedback, flow_loop step, ROAS template + flow builder UI.
Why: Human gates must assign reviewers to Your Turn, support pass/fail revision loops, and surface reject paths on the canvas.
Impact: ROAS brief task pauses in review assigned to a picker-chosen reviewer; Done continues to design; Needs revision + comment loops copy agent with {{run.review_feedback}}; Loop step available in flow controls.
Files: space-automation-service-07/09/15/17.base.ts, space-automation-template.ts, space-automation-action.dto.ts, space-automation-draft-action.dto.ts, space-automation-template-catalog-agency.ts, space-schema.ts, spaces-api.ts, space-item-types.ts, flow-capabilities.ts, ActionBuilder.tsx, automation-publishable.ts, automation-flow-step-summary.utils.ts, flow-builder-step-types.utils.ts, flow-builder-canvas.utils.ts, FlowBuilderCanvas.tsx, globals.css, 20260630210000_human_gate_run_context.sql, space-automation-human-gate.test.ts

---

## [2026-06-30 13:35] - [FIX]

What: Flows browse hub loads templates and org-wide flows in personal account context (All spaces view).
Why: `/api/automations/templates` and `/api/automations/flows` returned 403 without org context, leaving empty template counts and silent fetch failures.
Impact: Template catalog and cross-space flow list work on All spaces; failed loads show a toast instead of empty UI.
Files: org-automation-flows.controller.ts, org-automation-flows.service.ts, space-flow-definitions.repository.ts, space-automation-read.repository.ts, org-automation-flows.controller.test.ts, FlowsBrowseHub.tsx, FlowsBrowseView.tsx, FlowsPage.tsx

---
