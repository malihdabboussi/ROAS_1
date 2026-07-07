# Changelog - June 28, 2026

## [2026-06-28 14:52] - [FIX]

What:
- Added TDD coverage for read-only cross-Space task/view/context lookups and all-accessible Space semantic search.
- Allowed read-only Space lookup actions to target another accessible scope while keeping cross-scope writes blocked unless explicitly overridden.
- Removed the phase-3 `search_space_context` override block and made all-accessible retrieval use broad Space Knowledge policy with null Space/Campaign filters.

Why:
- Agents that had user-allowed Space access could still loop on scope mismatch before RLS and policy checks could prove access.

Impact:
- Vivi can read accessible Spaces across active-scope boundaries without treating the request as a tool mistake.
- Mutating Space/task actions still require `scope_override:true` when targeting another scope.

Files:
- `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.test.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-space-retrieval.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-space-retrieval.service.test.ts`
- `.docs/logs/changelog2026-06-28.md`

---

## [2026-06-28 14:49] - [ARCH]

What:
- Continued the Channels `ChannelComposer.tsx` frontend decomposition.
- Added mounted coverage for existing link, attachment, emoji, voice, and rerender-stability behavior.
- Extracted link input, editor/voice recorder, and bottom toolbar rendering into local props-only child components.

Why:
- `ChannelComposer.tsx` remains an active Phase 3 oversized frontend component, and the remediation plan requires behavior-locked splits before more state-heavy cleanup.

Impact:
- `ChannelComposer.tsx` dropped from 1,865 LOC to 1,718 LOC without changing its public contract.
- Focused tests, relaxed lint, and full `@vibey/web` typecheck pass; normal focused lint still reports only the remaining parent `max-lines` violation.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/ChannelComposer.test.tsx`
- `apps/web/src/features/channels/components/ChannelComposerLinkInput.tsx`
- `apps/web/src/features/channels/components/ChannelComposerEditorArea.tsx`
- `apps/web/src/features/channels/components/ChannelComposerBottomBar.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/logs/changelog2026-06-28.md`

## [2026-06-28 12:28] - [DOCS]

What:
- Added the first-principles improvement signal architecture to the suggestion/improvement layer plan.
- Captured the Sentry-like signal utility model, raw signal to cluster to issue lifecycle, and platform-vs-workspace ownership routing.
- Updated Suggestion Layer ownership responsibilities to include signal ledger, cluster ledger, and ownership router.

Why:
- The plan needed one accumulated source for the decision that signals should be shared, ownership should stay separate, and guarded action should happen only after confidence is high enough.

Impact:
- Future implementation can start from a neutral routing ledger instead of sending every weak signal directly to Jaime, Atlas, Loop, or an internal platform lane.

Files:
- `.docs/plans/suggestion-improvement-layer.md`
- `.docs/logs/changelog2026-06-28.md`

## [2026-06-28 11:41] - [ARCH]

What:
- Moved presentation HTML/PDF/PPT export helpers from the Studio artifact export utility into focused shared `@/lib/artifacts` modules.
- Rewired deliverable presentation export to use the shared artifacts barrel.
- Kept the old Studio artifact export path as a compatibility re-export for existing Studio consumers.

Why:
- Shared deliverable code still depended on a private Studio utility, and the utility remained over the frontend file-size limit.

Impact:
- `deliverable-presentation-export.ts` is clean of the Studio export utility import.
- `artifact-export.ts` dropped from 858 LOC to 25 LOC.
- New shared presentation utility files are under the utility LOC limit.

Files:
- `apps/web/src/components/deliverables/deliverable-presentation-export.ts`
- `apps/web/src/components/deliverables/deliverable-presentation-export.test.ts`
- `apps/web/src/features/studio/utils/artifact-export.ts`
- `apps/web/src/lib/artifacts/artifact-presentation-constants.ts`
- `apps/web/src/lib/artifacts/artifact-presentation-export.ts`
- `apps/web/src/lib/artifacts/artifact-presentation-html-export.ts`
- `apps/web/src/lib/artifacts/artifact-presentation-iframe-export.ts`
- `apps/web/src/lib/artifacts/artifact-presentation-pdf-export.ts`
- `apps/web/src/lib/artifacts/artifact-presentation-ppt-dom.ts`
- `apps/web/src/lib/artifacts/artifact-presentation-ppt-export.ts`
- `apps/web/src/lib/artifacts/artifact-presentation-slide-dom.ts`
- `apps/web/src/lib/artifacts/index.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `documentation/frontend-shared-surfaces.md`

---

## [2026-06-28 11:31] - [FIX]

What:
- Updated generated Vibey API Brain action docs so `get_brain_log` and `log_brain_event` examples include required `brain_type`.
- Added a drift guard that keeps Brain log action docs aligned with backend `brain_type` schema requirements.
- Updated checked-in Brain Scholar runtime action references so Brain examples include `brain_type` instead of teaching invalid payloads.
- Patched the production DB-backed `vibey-api` Brain reference for immediate runtime sync.

Why:
- Agents were following stale examples that omitted `brain_type`, causing schema preflight failures before Brain memory actions could run.

Impact:
- Runtime agents now see valid Brain payload examples.
- Future generator changes will fail the focused drift test if Brain log docs stop carrying required `brain_type`.

Files:
- `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`
- `apps/agent-api/src/modules/agent-sync/services/agent-capability-source-drift.test.ts`
- `docker/agents/atlas/skills/brain-library-organization/references/actions.md`
- `docker/agents/atlas/skills/brain-library-lint/references/actions.md`
- `docker/agents/atlas/skills/brain-pattern-analysis/references/actions.md`
- `docker/agents/templates/brain_scholar/skills/brain-library-organization/references/actions.md`
- `docker/agents/templates/brain_scholar/skills/brain-library-lint/references/actions.md`
- `docker/agents/templates/brain_scholar/skills/brain-pattern-analysis/references/actions.md`

---

## [2026-06-28 11:25] - [FIX]

What:
- Fixed org-scoped permission resolution so owned personal spaces remain accessible while an organization context is active.
- Added regression coverage for the owner case and the non-owner personal-space denial case.

Why:
- Home could request a user-owned personal space while the app was carrying an active organization scope, causing the access loader to hide the row before ownership could grant admin access.

Impact:
- Personal-space owners keep access across org-context navigation.
- Org roles still do not grant access to unrelated personal spaces, and scoped share/visibility mutations continue using the existing org-filtered loader.

Files:
- `apps/api/src/modules/spaces/repositories/space-permissions.repository.ts`
- `apps/api/src/modules/spaces/services/space-permissions.service.ts`
- `apps/api/src/modules/spaces/services/__tests__/space-permissions.service.test.ts`

---

## [2026-06-28 11:16] - [DOCS]

What:
- Updated the suggestion/improvement layer docs to reflect Agent Improvement proposal implementation for skills and agent files.
- Aligned the Agent Learning Loop plans with current Dream Ops, checkpoint, experiment, and route-out evidence.
- Recorded that live Vibey MCP Brain access was unavailable during the refresh.

Why:
- The plan still described agent changes as unbuilt and skill-only even though the V2 implementation now covers both skills and agent files.

Impact:
- Road maturity now distinguishes the implemented Jaime lane from still-separate Brain, route-out, and broader Loop suggestion lanes.
- Brain evidence is documented from repo and production schema, with the live MCP limitation called out.

Files:
- `.docs/plans/suggestion-improvement-layer.md`
- `.docs/plans/agent-learning-loops.md`
- `.docs/plans/agent-learning-loops-v2.md`
- `.vibey/refresh-log.md`
- `.docs/logs/changelog2026-06-28.md`

## [2026-06-28 10:52] - [FEATURE]

What:
- Added DB-backed default personal/org account preference fields and a profile API endpoint to save them.
- Wired dashboard bootstrap to apply the saved default after validating active org membership, while preserving `?org=` as an explicit URL override.
- Added a hover/focus star control in the avatar org switcher to save Personal Account or an organization as the default.

Why:
- Users needed a durable default account choice so app loads can open the preferred personal/org context instead of relying on session-only active org state.

Impact:
- `/api/profile` now returns `default_account_mode` and `default_org_id`.
- `PATCH /api/profile/default-account` saves the preference after server-side membership validation.
- Org-only invitation bootstrap now records the accepted org as the default org account.
- Production Supabase project `qfrvykscoymiwwgysvsr` and staging project `xeceeohfjugfwurailuq` have the migration applied and verified.
- Both remote migration histories are aligned to `20260628100736_profile_default_account`.

Files:
- `supabase/migrations/20260628100736_profile_default_account.sql`
- `apps/api/src/modules/users/dto/profile-default-account.dto.ts`
- `apps/api/src/modules/users/controllers/profile.controller.ts`
- `apps/api/src/modules/users/services/profile.service.ts`
- `apps/api/src/modules/users/repositories/users.repository.ts`
- `apps/api/src/modules/users/controllers/profile.controller.test.ts`
- `apps/api/src/modules/org/repositories/org.repository.ts`
- `apps/api/src/modules/org/services/org-invitation.service.ts`
- `apps/api/src/modules/org/services/__tests__/org-invitation.service.test.ts`
- `apps/api/src/test/contract/__snapshots__/route-inventory.test.ts.snap`
- `apps/web/src/lib/org/org-context-store.ts`
- `apps/web/src/lib/org/index.ts`
- `apps/web/src/features/org/store/use-org-store.test.ts`
- `apps/web/src/app/(dashboard)/providers.tsx`
- `apps/web/src/components/layout/AvatarDropdown.tsx`
- `apps/web/src/components/layout/config/sidebar-toast-errors.config.ts`
- `.docs/architecture/personal-vs-org.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 00:24] - [ARCH]

What:
- Split the ad artifact menu into shared props-only UI, shared menu action contracts/hooks, and thin Spaces/Studio wrappers.

Why:
- The shared artifact preview adapter still used a Spaces-private ad menu fallback for Studio compatibility.

Impact:
- The adapter now uses a Studio-owned ad wrapper backed by shared artifact menu UI. Spaces-only analytics view/store wiring stays in the Spaces wrapper, and email/form/funnel remain the next adapter fallback slices.

Files:
- `apps/web/src/components/artifacts/AdArtifactMenuDropdown.tsx`
- `apps/web/src/components/artifacts/ad-artifact-menu-types.ts`
- `apps/web/src/components/artifacts/ArtifactPreviewPaneAdapter.tsx`
- `apps/web/src/components/artifacts/ArtifactPreviewPaneAdapter.test.tsx`
- `apps/web/src/features/spaces/components/artifacts/ad/AdMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/ad/AdMenuDropdown.test.tsx`
- `apps/web/src/features/spaces/components/artifacts/ad/use-ad-menu-actions.ts`
- `apps/web/src/features/studio/components/preview/StudioAdMenuDropdown.tsx`
- `apps/web/src/features/studio/components/preview/StudioAdMenuDropdown.test.tsx`
- `apps/web/src/lib/artifacts/use-ad-menu-actions.ts`
- `apps/web/src/lib/artifacts/artifact-menu-actions-api.ts`
- `apps/web/src/lib/artifacts/artifact-preview-api.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 12:24] - [ARCH]

What:
- Moved the deliverable entity preview switch into non-barrel `DeliverableEntityPreviewAdapter.tsx`.
- Rewired `DeliverablePreviewBody.tsx` to receive entity rendering through a typed slot.
- Kept `DeliverablePreviewEntityFull.tsx` as a compatibility re-export and added mounted body coverage.

Why:
- The shared deliverable body still had hard ownership of the Studio entity preview renderer.

Impact:
- Core deliverable body/modal compatibility file scans are clean for direct `@/features/*` imports.
- Studio preview UI dependencies are isolated in a documented transitional adapter.

Files:
- `apps/web/src/components/deliverables/DeliverableEntityPreviewAdapter.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewBody.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewBody.test.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewEntityFull.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewEntityFull.test.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewModal.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewModal.test.tsx`
- `apps/web/src/components/deliverables/deliverable-preview-modal.types.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 12:11] - [ARCH]

What:
- Moved Spaces doc editor settings/types, doc source hashing, and visual-doc API calls into shared `@/lib/spaces`.
- Rewired shared deliverable Space doc/DOCX previews away from private Spaces service/type/helper imports.
- Kept old Spaces doc helper/type paths and `visualizeSpaceDoc` service export as compatibility delegates.

Why:
- Shared deliverable previews still depended on Spaces-owned helper/service internals for reusable doc contracts and API calls.

Impact:
- Deliverable Space doc previews now use the shared Spaces contract boundary for pure settings/hash/API behavior.
- Existing Spaces editor consumers still work through compatibility re-exports.

Files:
- `apps/web/src/components/deliverables/SpaceDocDeliverablePreview.tsx`
- `apps/web/src/components/deliverables/SpaceDocDeliverablePreview.test.tsx`
- `apps/web/src/components/deliverables/DocxFileDeliverablePreview.tsx`
- `apps/web/src/lib/spaces/doc-editor-types.ts`
- `apps/web/src/lib/spaces/doc-editor-settings.ts`
- `apps/web/src/lib/spaces/doc-visual-hash.ts`
- `apps/web/src/lib/spaces/index.ts`
- `apps/web/src/lib/spaces/spaces-api.ts`
- `apps/web/src/lib/spaces/spaces-api.test.ts`
- `apps/web/src/features/spaces/services/spaces.service.ts`
- `apps/web/src/features/spaces/components/docs/lib/doc-editor-settings.ts`
- `apps/web/src/features/spaces/components/docs/lib/doc-visual-hash.ts`
- `apps/web/src/features/spaces/components/docs/types/doc-editor.types.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 12:54] - [ARCH]

What:
- Added mounted toolbar characterization coverage for deliverable file, campaign, and Brain actions.
- Split `DeliverablePreviewModalToolbar` into props-only file action, campaign menu, and Brain menu children.
- Replaced hardcoded Brain badge palette classes with existing `badge-glass-*` utility classes.

Why:
- The deliverables modal/toolbar was the remaining Phase 3 deliverables decomposition target after the Space-doc cleanup.

Impact:
- Toolbar rendering is smaller and more maintainable without moving state, mutation, or feature wiring.
- Mounted modal/toolbar tests cover the split and render-loop guard.
- Remaining deliverables work is narrowed to modal header/title decomposition and future entity render-slot ownership inversion.

Files:
- `apps/web/src/components/deliverables/DeliverablePreviewModalToolbar.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewModalToolbar.test.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewToolbarFileActions.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewToolbarCampaignMenu.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewToolbarBrainMenu.tsx`
- `apps/web/src/components/deliverables/deliverable-preview-modal.utils.ts`
- `.docs/plans/architecture-compliance-remediation.md`

## [2026-06-28 05:59] - [ARCH]

What:
- Added mounted `FormPreviewPane` characterization coverage for fetch/save, tab switching, settings/responses/menu wiring, publish/unpublish behavior, and render-loop safety.
- Split form preview toolbar and publish-dropdown chrome into a private props-only child component.
- Moved `FormPreviewPane` form API/type imports from the Studio service re-export to shared `@/lib/forms`.

Why:
- The form preview pane was over the frontend component cap and still depended on the Studio artifact-preview service boundary.

Impact:
- `FormPreviewPane.tsx` is now under cap and cleaner for the later form renderer ownership slice. The shared adapter still has a transitional form preview fallback.

Files:
- `apps/web/src/features/spaces/components/artifacts/form/FormPreviewPane.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormPreviewPaneToolbarActions.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormPreviewPane.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 05:08] - [ARCH]

What:
- Split the Spaces form artifact menu into shared props-only UI, shared form menu actions, and a thin Spaces wrapper.

Why:
- The form menu still combined reusable menu behavior with Spaces-only target-space navigation and delete-modal wiring.

Impact:
- Form menu UI/actions are now reusable through `@/components/artifacts` and `@/lib/artifacts`. The larger form preview renderer remains a separate Phase 3 adapter cleanup target.

Files:
- `apps/web/src/components/artifacts/FormArtifactMenuDropdown.tsx`
- `apps/web/src/components/artifacts/form-artifact-menu-types.ts`
- `apps/web/src/features/spaces/components/artifacts/form/FormMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormMenuDropdown.test.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/use-form-menu-actions.ts`
- `apps/web/src/features/spaces/components/artifacts/artifact-menu-actions-hooks.test.tsx`
- `apps/web/src/features/spaces/components/artifacts/ArtifactCardDropdowns.tsx`
- `apps/web/src/features/spaces/components/artifacts/artifact-card-menu-targets.ts`
- `apps/web/src/features/spaces/components/artifacts/use-artifact-card-menus.ts`
- `apps/web/src/lib/artifacts/use-form-menu-actions.ts`
- `apps/web/src/lib/artifacts/artifact-menu-contracts.ts`
- `apps/web/src/lib/artifacts/artifact-menu-toast-messages.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 02:17] - [ARCH]

What:
- Split the funnel artifact menu into shared props-only UI, shared funnel menu actions/API wrappers, and thin Spaces/Studio wrappers.
- Promoted the custom-domain connect modal to shared domain UI.

Why:
- The shared artifact preview adapter still used a Spaces-private funnel menu fallback, and the Spaces funnel menu depended on a Studio-private domain modal.

Impact:
- The adapter now uses a Studio-owned funnel wrapper backed by shared artifact menu UI. Spaces-only funnel analytics wiring stays in the Spaces wrapper, and email/form are the remaining adapter fallback slices.

Files:
- `apps/web/src/components/artifacts/FunnelArtifactMenuDropdown.tsx`
- `apps/web/src/components/artifacts/funnel-artifact-menu-types.ts`
- `apps/web/src/components/domains/ConnectCustomDomainModal.tsx`
- `apps/web/src/features/spaces/components/artifacts/funnel/FunnelMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/funnel/FunnelMenuDropdown.test.tsx`
- `apps/web/src/features/spaces/components/artifacts/funnel/use-funnel-menu-actions.ts`
- `apps/web/src/features/studio/components/preview/StudioFunnelMenuDropdown.tsx`
- `apps/web/src/features/studio/components/preview/StudioFunnelMenuDropdown.test.tsx`
- `apps/web/src/lib/artifacts/use-funnel-menu-actions.ts`
- `apps/web/src/lib/artifacts/funnel-preview-api.ts`
- `apps/web/src/components/artifacts/ArtifactPreviewPaneAdapter.tsx`
- `apps/web/src/components/domains/custom-domain-dialogs.test.tsx`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 02:56] - [ARCH]

What:
- Split the Spaces email artifact menu into shared props-only UI, shared email menu actions/API wrappers, and a thin Spaces wrapper.

Why:
- The Phase 3 artifact menu boundary had shared ad/funnel coverage, but email menu behavior still lived inside a Spaces-private smart dropdown.

Impact:
- Email menu UI and menu actions are now reusable through `@/components/artifacts` and `@/lib/artifacts`. The larger email/form preview renderer ownership remains the next adapter cleanup area.

Files:
- `apps/web/src/components/artifacts/EmailArtifactMenuDropdown.tsx`
- `apps/web/src/components/artifacts/email-artifact-menu-types.ts`
- `apps/web/src/features/spaces/components/artifacts/email/EmailMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/email/EmailMenuDropdown.test.tsx`
- `apps/web/src/features/spaces/components/artifacts/email/use-email-menu-actions.ts`
- `apps/web/src/features/spaces/components/artifacts/artifact-menu-actions-hooks.test.tsx`
- `apps/web/src/features/spaces/components/artifacts/ArtifactCardDropdowns.tsx`
- `apps/web/src/features/spaces/components/artifacts/artifact-card-menu-targets.ts`
- `apps/web/src/features/spaces/components/artifacts/use-artifact-card-menus.ts`
- `apps/web/src/lib/artifacts/use-email-menu-actions.ts`
- `apps/web/src/lib/artifacts/artifact-menu-actions-api.ts`
- `apps/web/src/lib/artifacts/artifact-menu-actions-api.test.ts`
- `apps/web/src/lib/artifacts/artifact-menu-contracts.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 06:16] - [ARCH]

What:
- Split the Spaces form preview tab into a lean preview container, a private field renderer, and private form preview style helpers.
- Added mounted `FormPreviewTab` runtime characterization for start/end page rendering, hidden fields, custom color paths, rail callbacks, and render-loop safety.

Why:
- `FormPreviewTab.tsx` was still over the frontend component cap and imported form contracts through the Studio artifact-preview service re-export.

Impact:
- `FormPreviewTab.tsx` is now under cap and imports form contracts from `@/lib/forms`. The remaining oversized form backlog is settings, question editor, and responses.

Files:
- `apps/web/src/features/spaces/components/artifacts/form/FormPreviewTab.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormPreviewFieldPreview.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/form-preview-styles.ts`
- `apps/web/src/features/spaces/components/artifacts/form/FormPreviewTab.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 07:56] - [ARCH]

What:
- Split the Spaces form responses panel into a lean slide-over container, private display helpers, and private list/detail render components.
- Added mounted `FormResponsesPanel` characterization for response loading, row previews, detail rendering, escape/outside-click handling, and render-loop safety.

Why:
- `FormResponsesPanel.tsx` was still over the frontend component cap and imported form response APIs through the Studio artifact-preview service re-export.

Impact:
- `FormResponsesPanel.tsx` is now under cap and imports form APIs/contracts from `@/lib/forms`. The remaining oversized form backlog is settings and question editor.

Files:
- `apps/web/src/features/spaces/components/artifacts/form/FormResponsesPanel.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormResponsesPanelViews.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/form-responses-display.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormResponsesPanel.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 08:49] - [ARCH]

What:
- Split the Spaces form question editor into a lean smart editor, private preview renderer, private contact subfield editor, and private option list editor.
- Added mounted `FormQuestionEditor` characterization for editing controls, field binding, option editing, contact subfields, and render-loop safety.

Why:
- `FormQuestionEditor.tsx` was still over the frontend component cap and imported form contracts through the Studio artifact-preview service re-export.

Impact:
- `FormQuestionEditor.tsx` is now under cap and imports form contracts from `@/lib/forms`. The remaining form editor/settings backlog is `FormSettingsPanel.tsx`.

Files:
- `apps/web/src/features/spaces/components/artifacts/form/FormQuestionEditor.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormQuestionPreview.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormContactSubfieldsEditor.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormOptionListEditor.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormQuestionEditor.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 09:16] - [ARCH]

What:
- Split the Spaces form settings panel into a lean slide-over container, private submission/layout/color/task-title sections, and shared private row primitives.
- Added mounted `FormSettingsPanel` characterization for assignment, target-space binding, task-title selection, layout/color changes, outside-click handling, and render-loop safety.

Why:
- `FormSettingsPanel.tsx` was the last oversized file in the remaining form editor/settings follow-up cluster and still carried stale Studio form imports plus deep color-preset imports.

Impact:
- `FormSettingsPanel.tsx` is now 119 LOC and imports form contracts from `@/lib/forms`. Extracted settings children are under the frontend component cap, and the broader form settings/editor follow-up cluster is resolved.

Files:
- `apps/web/src/features/spaces/components/artifacts/form/FormSettingsPanel.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormSettingsPanel.test.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormSettingsPanelPrimitives.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormSettingsTaskTitlePicker.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormSettingsSubmissionSections.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormSettingsLayoutSection.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormSettingsColorsSection.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 09:37] - [ARCH]

What:
- Promoted the shared email preview editor and inline title controls to `@/components/artifacts`.
- Rewired `EmailArtifactPreview` to shared artifact API/type/error surfaces and added mounted behavior coverage for load, save, send, export, menu, and render-loop safety.

Why:
- The Spaces email preview still depended directly on private Studio preview/service/type/config paths.

Impact:
- `EmailArtifactPreview.tsx` is under the frontend component cap and clean of direct Studio preview/service/type/config imports. Remaining email boundary debt is now narrowed to the send dialog, contact communication composer, standalone deliverable preview, and the transitional adapter fallback.

Files:
- `apps/web/src/features/spaces/components/artifacts/email/EmailArtifactPreview.tsx`
- `apps/web/src/features/spaces/components/artifacts/email/EmailArtifactPreview.test.tsx`
- `apps/web/src/components/artifacts/EmailPreviewEditor.tsx`
- `apps/web/src/components/artifacts/InlineEditableArtifactTitle.tsx`
- `apps/web/src/features/studio/components/preview/EmailPreviewEditor.tsx`
- `apps/web/src/features/studio/components/preview/InlineEditableArtifactTitle.tsx`
- `apps/web/src/lib/artifacts/artifact-inline-errors.config.ts`

## [2026-06-28 10:25] - [UTIL]

What:
- Ran the authenticated mobile responsiveness audit with the YC demo session and system Chrome.
- Added Chrome fallback/progress/timeout/retry support to the mobile audit script.
- Wrote the route, dynamic page, and modal-interaction inventory to a Markdown report.

Why:
- The mobile optimization skill needed a concrete current inventory of static page findings and missing modal/dynamic coverage before page-by-page mobile work starts.

Impact:
- The report identifies confirmed high-priority static mobile issues on `/contacts` and `/setting-up`, lists static routes that passed this page-load pass, enumerates 10 dynamic route patterns still needing representative IDs, and inventories 210 modal-like interaction surfaces that need scripted open-state audits.

Files:
- `.agents/skills/mobile-optimization/SKILL.md`
- `.agents/skills/mobile-optimization/scripts/mobile-responsive-audit.mjs`
- `.docs/plans/mobile-responsive-audit-2026-06-28.md`
- `apps/web/src/components/artifacts/index.ts`
- `documentation/frontend-shared-surfaces.md`

## [2026-06-28 10:36] - [DOCS]

What:
- Added a CSS-first modal remediation strategy to the mobile responsive audit plan.
- Updated the mobile optimization skill to require desktop baseline and post-fix desktop checks.

Why:
- Modal responsiveness should start from existing shared CSS utilities instead of one-off edits across every modal, and mobile fixes need an explicit guard against desktop layout drift.

Impact:
- Future mobile optimization work will first harden `container-modal-*` utilities, avoid changing `z-modal-*` stacking classes into layout utilities, and verify desktop routes or open modal states remain unchanged after mobile fixes.

Files:
- `.agents/skills/mobile-optimization/SKILL.md`
- `.docs/plans/mobile-responsive-audit-2026-06-28.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 09:55] - [ARCH]

What:
- Split `EmailArtifactSendDialog` into a lean smart parent, private props-only sections, private primitives, and an option-loading hook.
- Added shared `@/lib/email` sender identity list API and moved campaign email broadcast sending to `@/lib/artifacts`.
- Added mounted send-dialog coverage plus shared API coverage.

Why:
- The send dialog was over the frontend component cap and imported Email, Settings, and Studio internals directly.

Impact:
- `EmailArtifactSendDialog.tsx` is now 308 LOC and clean of those restricted imports. Remaining email boundary work is narrowed to `StandaloneEmailDeliverablePreview.tsx`, `ContactCommunicationPanel.tsx`, and the transitional adapter fallback.

Files:
- `apps/web/src/features/spaces/components/artifacts/email/EmailArtifactSendDialog.tsx`
- `apps/web/src/features/spaces/components/artifacts/email/EmailArtifactSendDialog.sections.tsx`
- `apps/web/src/features/spaces/components/artifacts/email/EmailArtifactSendDialog.primitives.tsx`
- `apps/web/src/features/spaces/components/artifacts/email/use-email-artifact-send-options.ts`
- `apps/web/src/features/spaces/components/artifacts/email/EmailArtifactSendDialog.test.tsx`
- `apps/web/src/lib/artifacts/artifact-preview-api.ts`
- `apps/web/src/lib/artifacts/artifact-preview-api.test.ts`
- `apps/web/src/lib/email/email-sender-identities-api.ts`
- `apps/web/src/lib/email/email-sender-identities-api.test.ts`
- `apps/web/src/lib/email/index.ts`
- `apps/web/src/features/studio/services/artifact-preview.service.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 10:00] - [ARCH]

What:
- Rewired the standalone email deliverable preview to shared artifact editor/API/type boundaries.
- Added mounted coverage for fetch and debounced subject/body save behavior.

Why:
- A shared deliverables component still imported private Studio editor, service, and type paths.

Impact:
- `StandaloneEmailDeliverablePreview.tsx` is clean of those Studio imports and remains under cap. Remaining email boundary work is now concentrated in `ContactCommunicationPanel.tsx` and the transitional adapter fallback.

Files:
- `apps/web/src/components/deliverables/StandaloneEmailDeliverablePreview.tsx`
- `apps/web/src/components/deliverables/StandaloneEmailDeliverablePreview.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 10:05] - [ARCH]

What:
- Rewired `ContactCommunicationPanel` email composer to the shared artifact email editor.
- Added mounted coverage for composer open, send payload, success toast, inserted timeline row, and render-loop safety.

Why:
- The contact communication panel still imported the private Studio email editor path.

Impact:
- The old Studio editor import is gone from this panel. LOC/style cleanup remains as a dedicated follow-up because the panel is still 716 LOC and has pre-existing raw token/style debt.

Files:
- `apps/web/src/features/spaces/components/contacts/ContactCommunicationPanel.tsx`
- `apps/web/src/features/spaces/components/contacts/ContactCommunicationPanel.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 10:18] - [ARCH]

What:
- Split `ContactCommunicationPanel` into focused helper, sent-email body, timeline, and composer files.
- Removed the touched raw token color classes and inline scroll-mask style from the communication panel path.

Why:
- The panel was still 716 LOC after the editor-boundary cleanup and had pre-existing style-token debt.

Impact:
- `ContactCommunicationPanel.tsx` is now 290 LOC, and all extracted contact communication files are under the frontend component cap with mounted composer coverage still passing.

Files:
- `apps/web/src/features/spaces/components/contacts/ContactCommunicationPanel.tsx`
- `apps/web/src/features/spaces/components/contacts/ContactCommunicationComposer.tsx`
- `apps/web/src/features/spaces/components/contacts/ContactCommunicationTimeline.tsx`
- `apps/web/src/features/spaces/components/contacts/ContactCommunicationEmailBody.tsx`
- `apps/web/src/features/spaces/components/contacts/ContactCommunicationPanel.helpers.ts`
- `apps/web/src/features/spaces/components/contacts/ContactCommunicationPanel.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 10:29] - [ARCH]

What:
- Moved deliverable campaign menu campaign and lineage access to shared `@/lib/campaigns`.
- Added mounted hook coverage for campaign dropdown loading, lineage marking, move action, callback/toast, and render-loop safety.

Why:
- Shared deliverable UI still imported private Studio campaign service and type paths.

Impact:
- `use-deliverable-campaign-menu.ts` is clean of Studio campaign imports. Remaining deliverables boundary work is the separate artifact-preview service import cluster.

Files:
- `apps/web/src/components/deliverables/use-deliverable-campaign-menu.ts`
- `apps/web/src/components/deliverables/use-deliverable-campaign-menu.test.tsx`
- `apps/web/src/lib/campaigns/campaign-api.ts`
- `apps/web/src/lib/campaigns/campaign-api.test.ts`
- `apps/web/src/features/studio/services/campaign.service.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 10:36] - [ARCH]

What:
- Moved deliverable entity and presentation-bundle fetching to shared `@/lib/artifacts`.
- Added hook/export characterization coverage for entity text loading, Space-doc skip behavior, presentation HTML export, live iframe export, and slide fallback export.

Why:
- Shared deliverable helpers still imported private Studio artifact-preview service paths and Mission Control deliverable types.

Impact:
- The touched helper files are clean of those private fetch/type imports. Remaining deliverables service-boundary work is now concentrated in `DeliverablePreviewEntityFull.tsx` and `SpaceDocDeliverablePreview.tsx`, with the Studio export utility split left as a separate focused cleanup.

Files:
- `apps/web/src/components/deliverables/use-deliverable-entity-content.ts`
- `apps/web/src/components/deliverables/use-deliverable-entity-content.test.tsx`
- `apps/web/src/components/deliverables/deliverable-presentation-export.ts`
- `apps/web/src/components/deliverables/deliverable-presentation-export.test.ts`
- `apps/web/src/components/deliverables/use-deliverable-export-actions.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 10:44] - [ARCH]

What:
- Moved the remaining deliverables artifact-preview fetch imports to shared `@/lib/artifacts`.
- Added mounted preview characterization coverage for funnel full preview and Space doc deliverable preview.

Why:
- Shared deliverable preview components still depended on the private Studio artifact-preview service compatibility path for funnel and document fetches.

Impact:
- Deliverables production files are now clean of the old Studio artifact-preview service path. Larger UI ownership debt remains logged for Studio preview components, Spaces doc internals, Mission Control type imports, and the Studio artifact-export utility split.

Files:
- `apps/web/src/components/deliverables/DeliverablePreviewEntityFull.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewEntityFull.test.tsx`
- `apps/web/src/components/deliverables/SpaceDocDeliverablePreview.tsx`
- `apps/web/src/components/deliverables/SpaceDocDeliverablePreview.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 10:52] - [ARCH]

What:
- Moved touched deliverables off Mission Control type/service imports and Studio campaign listing imports.
- Added mounted brain-menu characterization coverage and preserved the existing campaign-menu coverage.
- Added a narrow org-store return type annotation to unblock full web typecheck on an existing dirty change.

Why:
- Shared deliverable components should depend on shared mission, agent, and campaign contracts instead of feature-private compatibility paths.

Impact:
- The touched deliverables production files are clean for Mission Control type/service paths and the Studio campaign service path. Remaining deliverables debt is now narrower: Brain ingest/campaign-knowledge side effects, Studio artifact-export helpers, and larger Studio/Spaces preview UI ownership splits.

Files:
- `apps/web/src/components/deliverables/use-deliverable-brain-menu.ts`
- `apps/web/src/components/deliverables/use-deliverable-brain-menu.test.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewMetaRow.tsx`
- `apps/web/src/components/deliverables/use-deliverable-campaign-menu.ts`
- `apps/web/src/components/deliverables/use-deliverable-campaign-menu.test.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewBody.tsx`
- `apps/web/src/components/deliverables/deliverable-movable-artifact.ts`
- `apps/web/src/components/deliverables/space-doc-deliverable.ts`
- `apps/web/src/components/deliverables/DeliverablePreviewModal.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewModalToolbar.tsx`
- `apps/web/src/lib/org/org-context-store.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 11:05] - [ARCH]

What:
- Moved Brain import-job APIs to shared `@/lib/brain` and kept the old Brain feature service as a compatibility re-export.
- Rewired the deliverable Brain ingest hook to shared Brain and campaign knowledge API barrels.
- Expanded mounted hook coverage to verify user Brain, campaign knowledge, and agent Brain ingestion payloads.

Why:
- Shared deliverable UI still imported private Brain and Studio side-effect services for ingestion.

Impact:
- `use-deliverable-brain-menu.ts` is clean of those private ingest imports, with render-loop and payload behavior locked by the mounted test. Remaining deliverables debt is now the larger Studio/Spaces preview UI ownership split and Studio export utility boundary.

Files:
- `apps/web/src/components/deliverables/use-deliverable-brain-menu.ts`
- `apps/web/src/components/deliverables/use-deliverable-brain-menu.test.tsx`
- `apps/web/src/lib/brain/brain-import-api.ts`
- `apps/web/src/lib/brain/index.ts`
- `apps/web/src/features/brain/services/user-brain-import.service.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 11:16] - [ARCH]

What:
- Moved deliverable attachment rename API access to shared `@/lib/spaces`.
- Added mounted modal coverage for task activity attachment rename and render-loop safety.
- Kept the old Spaces feature service helper as a compatibility wrapper.

Why:
- Shared deliverable UI still imported a private Spaces feature service for one cross-feature activity mutation.

Impact:
- `DeliverablePreviewModal.tsx` is clean of that private Spaces service import, and the shared Spaces API test locks the existing PATCH route and `attachment_rename` payload. `spaces.service.ts` remains over the frontend service LOC target and stays tracked for a separate service split.

Files:
- `apps/web/src/components/deliverables/DeliverablePreviewModal.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewModal.test.tsx`
- `apps/web/src/lib/spaces/spaces-api.ts`
- `apps/web/src/lib/spaces/spaces-api.test.ts`
- `apps/web/src/features/spaces/services/spaces.service.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 11:26] - [ARCH]

What:
- Moved generic artifact download, filename, text export, and em-dash normalization helpers to shared `@/lib/artifacts`.
- Rewired deliverable entity-content and export-action hooks away from the Studio `artifact-export` utility.
- Kept Studio `artifact-export` as a compatibility re-export for existing Studio consumers.

Why:
- Shared deliverable hooks still imported Studio-owned artifact export helpers for generic download and text conversion behavior.

Impact:
- Two deliverable hooks are clean of the Studio artifact-export import, with mounted hook coverage for normalized markdown export, JSON entity export, and render-loop safety. Remaining deliverable export debt is the presentation export helper path and Studio PDF helper/config imports.

Files:
- `apps/web/src/components/deliverables/use-deliverable-entity-content.ts`
- `apps/web/src/components/deliverables/use-deliverable-entity-content.test.tsx`
- `apps/web/src/components/deliverables/use-deliverable-export-actions.ts`
- `apps/web/src/components/deliverables/use-deliverable-export-actions.test.tsx`
- `apps/web/src/lib/artifacts/artifact-downloads.ts`
- `apps/web/src/lib/artifacts/artifact-text-export.ts`
- `apps/web/src/lib/artifacts/artifact-text-normalization.ts`
- `apps/web/src/lib/artifacts/index.ts`
- `apps/web/src/features/studio/utils/artifact-export.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## [2026-06-28 11:25] - [FIX]

What:
- Brought PR #45 in locally by defaulting Slack markdown tables to bullets through the shared OpenClaw resolver.
- Added cursor-paginated Spaces listing support and wired the sidebar to load more Spaces past the first 100.
- Added focused coverage for Slack table defaults, Spaces pagination, shared web API paths, and sidebar load-more behavior.

Why:
- Slack should avoid unreadable markdown tables without merging stale PR metadata.
- Users with more than 100 Spaces need an explicit cursor path instead of being capped at the first page.

Impact:
- Existing `/api/spaces` callers still receive the array response unless they request `paginated=true` or pass a cursor.
- The sidebar now fetches the first 100 Spaces and exposes a Load more action while another cursor exists.

Files:
- `apps/openclaw/src/config/markdown-tables.ts`
- `apps/openclaw/src/config/markdown-tables.test.ts`
- `apps/api/src/modules/spaces/dto/space-core.dto.ts`
- `apps/api/src/modules/spaces/controllers/spaces.controller.ts`
- `apps/api/src/modules/spaces/repositories/spaces.repository.ts`
- `apps/api/src/modules/spaces/repositories/spaces.repository.pagination.test.ts`
- `apps/api/src/modules/spaces/services/spaces-service-01.base.ts`
- `apps/web/src/lib/spaces/spaces-api.ts`
- `apps/web/src/lib/spaces/spaces-api.test.ts`
- `apps/web/src/features/spaces/services/spaces.service.ts`
- `apps/web/src/features/spaces/hooks/use-cached-spaces.ts`
- `apps/web/src/components/layout/config/sidebar-messages.config.ts`
- `apps/web/src/components/layout/sidebar/useSidebarController.ts`
- `apps/web/src/components/layout/sidebar/SidebarHqSpacesGroupedList.tsx`
- `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`
- `apps/web/src/components/layout/sidebar/SidebarHqMobileDrawer.tsx`
- `apps/web/src/components/layout/sidebar/SidebarHqSection.test.tsx`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 11:39] - [FIX]

What:
- Removed runtime fallback reads to removed legacy skill recommendation tables.
- Kept the skill recommendation Home, apply, detection, and job paths on canonical `agent_improvement_*` tables only.
- Deleted the obsolete legacy table normalization helper and updated focused service coverage.

Why:
- Production has `agent_improvement_proposals`, `agent_improvement_candidates`, and `agent_improvement_jobs`; the old `skill_recommendations`, `skill_recommendation_candidates`, and `skill_recommendation_jobs` tables no longer exist.

Impact:
- Skill recommendation UX no longer cascades schema-cache failures into dead legacy table lookups.
- Future schema drift now reports the canonical missing table instead of masking it behind stale table-name errors.

Files:
- `apps/api/src/modules/skill-recommendations/repositories/skill-recommendations.repository.ts`
- `apps/api/src/modules/skill-recommendations/repositories/skill-recommendations-legacy-tables.ts`
- `apps/api/src/modules/skill-recommendations/services/__tests__/skill-recommendations.service.test.ts`

---

## [2026-06-28 11:54] - [ARCH]

What:
- Moved markdown PDF export, remote PDF download, pagebreak config, PDF footer stamping, avatar PDF DOM builders, and offer PDF DOM builders into shared `@/lib/artifacts`.
- Rewired deliverables, Spaces doc/email export helpers, and Settings skill PDF export away from Studio PDF helper imports.
- Kept old Studio PDF/config paths as compatibility re-exports for Studio preview consumers.

Why:
- Shared deliverable/export surfaces still depended on Studio-owned PDF helper/config modules.

Impact:
- The deliverables export-helper boundary is now shared, with mounted hook coverage for source-PDF download, presentation export errors, generic offer PDF export, and render-loop safety.
- Existing Studio import paths still work through compatibility wrappers.

Files:
- `apps/web/src/components/deliverables/use-deliverable-export-actions.ts`
- `apps/web/src/components/deliverables/use-deliverable-export-actions.test.tsx`
- `apps/web/src/features/settings/components/settings-content/skills-page/use-skills-agents-and-skills.ts`
- `apps/web/src/features/spaces/components/doc-menu/export-space-doc.ts`
- `apps/web/src/features/spaces/components/artifacts/email/export-email-artifact-pdf.ts`
- `apps/web/src/features/studio/lib/campaign-markdown-pdf-export.ts`
- `apps/web/src/features/studio/lib/campaign-markdown-pdf-export.test.ts`
- `apps/web/src/features/studio/utils/artifact-pdf-shared.ts`
- `apps/web/src/features/studio/utils/artifact-pdf-jspdf-footer.ts`
- `apps/web/src/features/studio/utils/avatar-pdf-export.ts`
- `apps/web/src/features/studio/utils/avatar-pdf-hero.ts`
- `apps/web/src/features/studio/utils/avatar-demographics-hero.layout.ts`
- `apps/web/src/features/studio/utils/offer-pdf-export.ts`
- `apps/web/src/features/studio/config/avatar-deep-dive-fields.config.ts`
- `apps/web/src/features/studio/config/offer-sections.config.ts`
- `apps/web/src/lib/artifacts/artifact-markdown-pdf-export.ts`
- `apps/web/src/lib/artifacts/artifact-pdf-shared.ts`
- `apps/web/src/lib/artifacts/artifact-pdf-jspdf-footer.ts`
- `apps/web/src/lib/artifacts/avatar-pdf-export.ts`
- `apps/web/src/lib/artifacts/avatar-pdf-hero.ts`
- `apps/web/src/lib/artifacts/avatar-demographics-hero.layout.ts`
- `apps/web/src/lib/artifacts/offer-pdf-export.ts`
- `apps/web/src/lib/artifacts/avatar-deep-dive-fields.config.ts`
- `apps/web/src/lib/artifacts/offer-sections.config.ts`
- `apps/web/src/lib/artifacts/artifact-inline-errors.config.ts`
- `apps/web/src/lib/artifacts/index.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 12:40] - [ARCH]

What:
- Moved Space doc viewer UI into shared `@/components/spaces`.
- Split visual-doc PDF export into shared `@/lib/spaces` helpers under the file-size caps.
- Rewired deliverable Space-doc and DOCX previews away from private Spaces doc UI/export imports.
- Added mounted DOCX preview characterization coverage.

Why:
- Shared deliverables preview components still imported Spaces-owned doc UI and PDF export internals.

Impact:
- Space doc deliverable previews now depend on shared Space UI/lib boundaries.
- Existing Spaces feature import paths continue to work through compatibility re-exports.
- Remaining deliverables Phase 3 debt is modal/toolbar decomposition plus the future adapter ownership inversion.

Files:
- `apps/web/src/components/deliverables/SpaceDocDeliverablePreview.tsx`
- `apps/web/src/components/deliverables/SpaceDocDeliverablePreview.test.tsx`
- `apps/web/src/components/deliverables/DocxFileDeliverablePreview.tsx`
- `apps/web/src/components/deliverables/DocxFileDeliverablePreview.test.tsx`
- `apps/web/src/components/spaces/DocEditorProseStyles.tsx`
- `apps/web/src/components/spaces/DriveDocViewer.tsx`
- `apps/web/src/components/spaces/VisualDocView.tsx`
- `apps/web/src/components/spaces/index.ts`
- `apps/web/src/lib/spaces/index.ts`
- `apps/web/src/lib/spaces/space-doc-visual-pdf-dom.ts`
- `apps/web/src/lib/spaces/space-doc-visual-pdf-canvas.ts`
- `apps/web/src/lib/spaces/space-doc-visual-pdf-export.ts`
- `apps/web/src/features/spaces/components/doc-menu/export-space-doc.ts`
- `apps/web/src/features/spaces/components/docs/DriveDocViewer.tsx`
- `apps/web/src/features/spaces/components/docs/editor/DocEditorProseStyles.tsx`
- `apps/web/src/features/spaces/components/docs/visual/VisualDocView.tsx`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 13:01] - [ARCH]

What:
- Added mounted modal coverage for UUID-backed deliverable title renames through the mission deliverable API.
- Extracted deliverable preview title rename state/persistence into `use-deliverable-title-rename`.
- Moved modal title/header rendering into props-driven `DeliverablePreviewModalHeader`.
- Replaced touched raw ring and numeric modal z-index classes with token/named utilities.

Why:
- The deliverables preview modal still owned title rename state and header rendering inline after the toolbar decomposition.

Impact:
- `DeliverablePreviewModal` is smaller and now owns only the preview shell orchestration.
- Existing task-activity attachment rename and mission deliverable rename behavior is covered by mounted tests with render-loop assertions.
- Remaining deliverables debt is the future entity render-slot ownership inversion.

Files:
- `apps/web/src/components/deliverables/DeliverablePreviewModal.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewModal.test.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewModalHeader.tsx`
- `apps/web/src/components/deliverables/use-deliverable-title-rename.ts`
- `.docs/plans/architecture-compliance-remediation.md`

---

## [2026-06-28 13:10] - [ARCH]

What:
- Made `DeliverablePreviewModal` require a caller-owned `renderEntityPreview` slot.
- Added the non-barrel `deliverable-entity-preview-renderer` compatibility bridge for the current Studio-backed entity previews.
- Updated Channels, Studio, Mission Control, and Spaces modal callers to pass the renderer explicitly.
- Updated the shared-surface registry and follow-up log for the remaining oversized caller debt.

Why:
- The shared deliverable preview modal still imported the transitional Studio-backed entity preview adapter directly.

Impact:
- The shared modal is now props-driven for non-doc entity previews and no longer imports the adapter.
- Existing entity preview behavior is preserved through the same mounted modal/body tests.
- Remaining debt is the transitional adapter/renderer bridge and oversized parent caller cleanup.

Files:
- `apps/web/src/components/deliverables/DeliverablePreviewModal.tsx`
- `apps/web/src/components/deliverables/deliverable-entity-preview-renderer.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewModal.test.tsx`
- `apps/web/src/features/channels/containers/ChannelChatContainer.tsx`
- `apps/web/src/features/channels/components/DeliverablesView.tsx`
- `apps/web/src/features/studio/components/ChatInterface.tsx`
- `apps/web/src/features/mission-control/components/dialogs/MissionDetailOverlayModals.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskDetailModal.tsx`
- `apps/web/src/features/spaces/components/MissionsView.tsx`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 13:31] - [ARCH]

What:
- Extracted channel deliverable parsing, mapping, filter, and preview-text helpers from `DeliverablesView`.
- Rewired Channels deliverable imports to shared `@/lib` artifact, campaign, mission, and channel surfaces.
- Added mounted Channels deliverables characterization for extraction, campaign resolution, modal conversion, and rerender stability.

Why:
- Continue Phase 3 frontend architecture remediation by removing private cross-feature imports and lowering the oversized Channels deliverables parent with behavior locked first.

Impact:
- No behavior change intended. `DeliverablesView` remains oversized at 976 LOC but no longer owns the extracted pure deliverable helpers.
- New helper files are under limits and mounted coverage locks the preserved deliverables behavior.

Files:
- `apps/web/src/features/channels/components/DeliverablesView.tsx`
- `apps/web/src/features/channels/components/DeliverablesView.test.tsx`
- `apps/web/src/features/channels/components/ChannelThreadPanel.tsx`
- `apps/web/src/features/channels/components/ChannelChat.tsx`
- `apps/web/src/features/channels/lib/channel-deliverables.ts`
- `apps/web/src/features/channels/lib/channel-deliverable-mission-mapping.ts`
- `apps/web/src/features/channels/lib/channel-deliverable-preview-builders.ts`
- `apps/web/src/features/channels/lib/channel-deliverable-filters.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 13:42] - [ARCH]

What:
- Split `DeliverablesView` into a smaller orchestration parent plus `ChannelDeliverableCard`, `DeliverablesFilterDropdown`, and `DeliverablesActiveFilterChips`.
- Added mounted filter behavior coverage before the production move.

Why:
- Finish the Channels deliverables parent LOC remediation while preserving filter, preview, campaign resolution, and rerender behavior.

Impact:
- No behavior change intended. `DeliverablesView` is now 301 LOC and below the component cap.
- The new child components are under the cap; the dropdown is close to the limit and is tracked for follow-up headroom.

Files:
- `apps/web/src/features/channels/components/DeliverablesView.tsx`
- `apps/web/src/features/channels/components/DeliverablesView.test.tsx`
- `apps/web/src/features/channels/components/ChannelDeliverableCard.tsx`
- `apps/web/src/features/channels/components/DeliverablesFilterDropdown.tsx`
- `apps/web/src/features/channels/components/DeliverablesActiveFilterChips.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 13:47] - [ARCH]

What:
- Added mounted `ChannelThreadPanel` coverage for participants, deliverable count actions, and rerender settling.
- Extracted the thread participants popover into `ChannelThreadParticipants`.

Why:
- Continue the local Channels Phase 3 decomposition after `DeliverablesView` by clearing the adjacent `ChannelThreadPanel` component overage.

Impact:
- No behavior change intended. `ChannelThreadPanel` is now 394 LOC and under the component cap.
- Remaining local Channels parent LOC debt is `ChannelChat.tsx`.

Files:
- `apps/web/src/features/channels/components/ChannelThreadPanel.tsx`
- `apps/web/src/features/channels/components/ChannelThreadParticipants.tsx`
- `apps/web/src/features/channels/components/ChannelThreadPanel.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 14:01] - [ARCH]

What:
- Added mounted `ChannelChat` characterization for message orchestration, tabs, deliverables rerouting, unavailable-channel fallback, and rerender settling.
- Split `ChannelChat` into a smaller orchestration parent plus `ChannelChatMessagesPanel`, `ChannelChatTabs`, and `channel-chat-utils`.
- Rewired `ChannelChat` contracts to shared `@/lib/channels` and `@/lib/missions` surfaces.

Why:
- Finish the local Channels parent LOC cleanup from the deliverables caller slice while preserving behavior with the upgraded frontend runtime guard.

Impact:
- No behavior change intended. `ChannelChat` is now 360 LOC and under the component cap.
- The new child/helper files are under limits, and the local Channels parent overages from this slice are resolved.

Files:
- `apps/web/src/features/channels/components/ChannelChat.tsx`
- `apps/web/src/features/channels/components/ChannelChat.test.tsx`
- `apps/web/src/features/channels/components/ChannelChatMessagesPanel.tsx`
- `apps/web/src/features/channels/components/ChannelChatTabs.tsx`
- `apps/web/src/features/channels/components/channel-chat-utils.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 14:20] - [ARCH]

What:
- Added mounted `ChannelMessageBubble` characterization for media, attachments, reactions, edit/copy/delete/custom emoji actions, ordered blocks, failed-agent retry behavior, and rerender settling.
- Split `ChannelMessageBubble` into focused body, actions, status badge, reaction, avatar, and utility files.
- Promoted shared markdown/code/PDF/generated-media rendering and chat content segment parsing out of Studio-owned paths.

Why:
- Continue Phase 3 Channels cleanup with the upgraded frontend runtime guard while removing direct private Studio/Mission-Control dependencies from the message bubble path.

Impact:
- No behavior change intended. `ChannelMessageBubble` is now 243 LOC and under the component cap.
- Old Studio markdown/code/PDF paths remain as compatibility re-exports, and the shared-surface registry now documents the promoted chat rendering helpers.

Files:
- `apps/web/src/features/channels/components/ChannelMessageBubble.tsx`
- `apps/web/src/features/channels/components/ChannelMessageBubble.test.tsx`
- `apps/web/src/features/channels/components/ChannelMessageBody.tsx`
- `apps/web/src/features/channels/components/ChannelMessageActions.tsx`
- `apps/web/src/features/channels/components/ChannelAgentStatusBadges.tsx`
- `apps/web/src/features/channels/components/ChannelMessageReactions.tsx`
- `apps/web/src/features/channels/components/ChannelMessageAvatar.tsx`
- `apps/web/src/features/channels/components/channel-message-bubble-utils.ts`
- `apps/web/src/components/chat/ChatMarkdownView.tsx`
- `apps/web/src/components/chat/ChatMarkdownCodeBlockChrome.tsx`
- `apps/web/src/components/chat/PdfCard.tsx`
- `apps/web/src/components/chat/GeneratedMedia.tsx`
- `apps/web/src/lib/chat/chat-content-segments.ts`
- `apps/web/src/features/studio/components/chat/ChatMarkdownView.tsx`
- `apps/web/src/features/studio/components/chat/ChatMarkdownCodeBlockChrome.tsx`
- `apps/web/src/features/studio/components/message-bubble/PdfCard.tsx`
- `apps/web/src/features/studio/components/message-bubble/message-bubble.utils.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 14:35] - [ARCH]

What:
- Added mounted `ChannelComposer` characterization for visible state, file upload payloads, embedded handles, and rerender settling.
- Split attachment chip/persistence helpers and formatting toolbar UI out of `ChannelComposer`.
- Moved batched agent skill reads into `@/lib/agents` and rewired the composer away from direct Studio, Composer, Mission Control, and old channel-service imports.

Why:
- Start the remaining Channels composer Phase 3 cleanup with runtime coverage before splitting the 2,144 LOC component.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,865 LOC, but it remains over the component cap and is still active Phase 3 debt.
- The new extracted components and shared agent API test are under limits.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/ChannelComposer.test.tsx`
- `apps/web/src/features/channels/components/ChannelComposerAttachments.tsx`
- `apps/web/src/features/channels/components/ChannelComposerFormattingToolbar.tsx`
- `apps/web/src/components/chat/PastedTextComposerAdapter.tsx`
- `apps/web/src/lib/agents/mission-agents-api.ts`
- `apps/web/src/lib/agents/mission-agents-api.test.ts`
- `apps/web/src/features/mission-control/services/agent-skills.service.ts`
- `documentation/frontend-shared-surfaces.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 15:03] - [ARCH]

What:
- Extended mounted `ChannelComposer` coverage for existing Google Drive and Dropbox attach-menu callbacks.
- Moved composer attach, emoji, slash, entity mention, member mention, cloud modal, and pasted-text editor portal rendering into `ChannelComposerPortals`.
- Kept editor state, upload state, cloud picker state, suggestion state, and send behavior in the existing composer parent.

Why:
- Continue the Phase 3 Channels composer decomposition with runtime coverage before reducing the 1,718 LOC parent further.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,510 LOC, while `ChannelComposerPortals` is 395 LOC and under the component cap.
- The remaining composer parent debt is suggestion orchestration, draft persistence, and upload/cloud state extraction.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/ChannelComposerPortals.tsx`
- `apps/web/src/features/channels/components/ChannelComposer.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 15:53] - [ARCH]

What:
- Moved Channels composer attachment hydration, persistence, file selection, upload orchestration, failure marking, preview cleanup, remove behavior, and reset cleanup into `use-channel-composer-attachments`.
- Kept the same attachment state shape and callbacks consumed by the composer chips, bottom bar, payload builder, imperative handle, and cloud attachment portals.

Why:
- Continue reducing the oversized `ChannelComposer` parent with behavior-locked upload coverage.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,405 LOC, while the new attachment hook is 148 LOC.
- The remaining composer parent debt is draft persistence plus slash/entity/member suggestion orchestration.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-attachments.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 15:56] - [ARCH]

What:
- Added mounted `ChannelComposer` coverage for saved draft hydration reporting through visible state.
- Moved draft hydration guards, editor-update localStorage persistence, empty-draft removal, and draft clearing into `use-channel-composer-draft`.

Why:
- Continue reducing the oversized `ChannelComposer` parent while preserving existing draft behavior.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,395 LOC, while the new draft hook is 50 LOC.
- The remaining composer parent debt is slash/entity/member suggestion orchestration.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/ChannelComposer.test.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-draft.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 16:03] - [ARCH]

What:
- Added mounted `ChannelComposer` coverage for scoped slash skill loading and `getPayload()` skill-key extraction.
- Moved slash skill agent-key derivation, skill fetch lifecycle, enabled/duplicate skill filtering, sorted slash skill entries, and skill-key text parsing into `use-channel-composer-slash-skills`.

Why:
- Continue the oversized composer split while preserving existing slash skill payload behavior.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,338 LOC, while the new slash skills hook is 84 LOC.
- The remaining composer parent debt is slash menu construction/keyboard handling plus entity/member suggestion orchestration.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/ChannelComposer.test.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-slash-skills.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 16:10] - [ARCH]

What:
- Added mounted `ChannelComposer` coverage for the current file-drop overlay and dropped-file upload path.
- Moved root drag-depth tracking, drag/drop handlers, and root paste-capture image upload handling into `use-channel-composer-dropzone`.

Why:
- Continue reducing the oversized composer parent while preserving existing dropzone upload behavior.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,304 LOC, while the new dropzone hook is 98 LOC.
- The remaining composer parent debt is slash menu construction/keyboard handling plus entity/member suggestion orchestration.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/ChannelComposer.test.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-dropzone.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 16:14] - [ARCH]

What:
- Moved `ChannelComposer` visible-state snapshot reporting and editor update subscription lifecycle into `use-channel-composer-visible-state`.
- Kept the exported `ChannelComposerVisibleState` contract on the composer for existing channel consumers.

Why:
- Continue reducing the oversized composer parent while preserving visible-state reporting and rerender behavior.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,284 LOC, while the new visible-state hook is 66 LOC.
- The remaining composer parent debt is slash menu construction/keyboard handling plus entity/member suggestion orchestration.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-visible-state.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 16:19] - [ARCH]

What:
- Moved `ChannelComposer` imperative handle assignment and cleanup into `use-channel-composer-handle`.
- Kept the public `ChannelComposerHandle` export available from the composer.

Why:
- Continue reducing the oversized composer parent while preserving embedded composer handle behavior.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,281 LOC, while the new handle hook is 40 LOC.
- The remaining composer parent debt is still slash menu construction/keyboard handling plus entity/member suggestion orchestration.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-handle.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 16:23] - [ARCH]

What:
- Moved composer attach dropdown and emoji picker open state, refs, position calculation, and outside-click cleanup into `use-channel-composer-floating-controls`.

Why:
- Continue reducing the oversized composer parent while preserving existing attach and emoji menu behavior.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,258 LOC, while the new floating-controls hook is 61 LOC.
- The remaining composer parent debt is slash menu construction/keyboard handling plus entity/member suggestion orchestration.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-floating-controls.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 16:26] - [ARCH]

What:
- Moved composer link input open state, draft URL state, toggle/close handlers, and apply-link normalization into `use-channel-composer-link`.

Why:
- Continue reducing the oversized composer parent while preserving existing link input behavior.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,255 LOC, while the new link hook is 34 LOC.
- The remaining composer parent debt is slash menu construction/keyboard handling plus entity/member suggestion orchestration.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-link.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-28 16:33] - [ARCH]

What:
- Moved composer slash menu state, command construction, query sync, keyboard handling, command execution, and skill insertion into `use-channel-composer-slash-menu`.
- Added focused hook coverage for task status command execution and slash skill insertion.

Why:
- Continue reducing the oversized composer parent while preserving slash command behavior.

Impact:
- No behavior change intended. `ChannelComposer` is reduced to 1,026 LOC, while the new slash menu hook is 301 LOC.
- The remaining composer parent debt is mainly entity/member suggestion orchestration.

Files:
- `apps/web/src/features/channels/components/ChannelComposer.tsx`
- `apps/web/src/features/channels/components/use-channel-composer-slash-menu.ts`
- `apps/web/src/features/channels/components/use-channel-composer-slash-menu.test.tsx`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
