# Changelog - June 22, 2026

## [2026-06-22 22:17] - [REFACTOR]

What: Removed ChatInput freeze-debug instrumentation (render-storm probes, model-picker debug route/probes, home-page freeze marks) after verified fix.
Why: User confirmed the infinite re-render loop is resolved; debug probes were no longer needed and added noise.
Impact: Production ChatInput keeps the floating-menu/draft/zustand fixes only; no debug fetch traffic or storm logging.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-model-picker-view.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-menu.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-prefs.ts`, `apps/web/src/app/(dashboard)/home/page.tsx`, `apps/web/src/lib/settings/workspace-settings-modal-context.tsx`, deleted `apps/web/src/lib/debug/chat-input-debug-probes.ts`, deleted `apps/web/src/lib/debug/model-picker-debug-probe.ts`, deleted `apps/web/src/app/api/model-picker-debug/route.ts`

## [2026-06-22 15:20] - [FIX]

What: Pointed shared domain dialog components at `@/lib/domains/*` and fixed the public-agent adopt-conversation test to use the exported `loadExistingMessages` API.
Why: Vercel `@vibey/web` build failed because `components/domains/*` imported `../config`, `../services`, and `../types` paths that do not exist beside those components; the adopt-conversation test referenced a non-exported hook method.
Impact: Production web build typechecks domain dialogs and public-agent tests again.
Files: `apps/web/src/components/domains/AddCustomDomainDialog.tsx`, `apps/web/src/components/domains/CustomDomainDnsDialog.tsx`, `apps/web/src/features/public-agent/hooks/usePublicAgentChat.test.ts`

## [2026-06-22 13:19] - [FIX]

What: Un-ignored and committed `apps/web/src/lib/agents/**` and `apps/web/src/components/agents/**` so Vercel can resolve web agent imports.
Why: Root `.gitignore` `agents/` rule excluded the new web lib split modules; local typecheck passed but production `@vibey/web` build failed with module-not-found errors.
Impact: Vercel `@vibey/web` build can resolve `@/lib/agents/*` and `@/components/agents/side-chat/AgentSideChatLayout`.
Files: `.gitignore`, `apps/web/src/lib/agents/agent-display.ts`, `apps/web/src/lib/agents/agent-skill-types.ts`, `apps/web/src/lib/agents/mission-agents-api.ts`, `apps/web/src/lib/agents/mission-agents-api.test.ts`, `apps/web/src/lib/agents/side-chat-compose.ts`, `apps/web/src/components/agents/side-chat/AgentSideChatLayout.tsx`

What: Soft-deleted empty duplicate Vibey org and renamed the real org slug from `vibe` to `vibey`.
Why: Two active orgs named Vibey existed; the empty duplicate (`vibey`) caused confusion while the real org with all team/data used slug `vibe`.
Impact: Real org (`699e3530-…`) is now the sole active org at slug `vibey` with 8 members, 13 campaigns, and 27 spaces. Empty duplicate is suspended with tombstone slug `vibey-deleted-3024aab7`. Slug `vibe` is no longer active.
Files: Supabase production data (`organizations`, `org_members`), `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:42] - [FEATURE]
What: Enabled admin and superadmin users to open official skills in the Skills settings page and view their instructions.
Why: Official skills were visible but intentionally rendered as locked placeholders, which prevented trusted platform admins from inspecting the actual skill content.
Impact: Non-admin users still see official skills as read-only locked cards and no longer receive official markdown/resource bodies from the API. Admin and superadmin users can open official skills, read the markdown/resources, and export/download the content while write actions remain locked. Focused API/web tests, focused Skills web lint, and API typecheck pass. A final full web typecheck is blocked by unrelated dirty Studio `SettingsTab` errors.
Files: `apps/api/src/modules/missions/repositories/missions-repository.base.ts`, `apps/api/src/modules/missions/services/agent-skill-management.service.ts`, `apps/api/src/modules/missions/services/agent-skill-management.service.test.ts`, `apps/web/src/features/settings/components/settings-content/SkillsPageContent.tsx`, `apps/web/src/features/settings/components/settings-content/skills-page/skills-main-panel.tsx`, `apps/web/src/features/settings/components/settings-content/skills-page/skills-tree-sidebar.tsx`, `apps/web/src/features/settings/components/settings-content/skills-page/skills-catalog-tree.tsx`, `apps/web/src/features/settings/components/settings-content/skills-page/skills-inline-detail-panel.tsx`, `apps/web/src/features/settings/components/settings-content/skills-page/skills-preview-panel.tsx`, `apps/web/src/features/settings/components/settings-content/skills-page/dialogs/skill-detail-mobile-fullscreen.tsx`, `apps/web/src/features/settings/components/settings-content/skills-page/skill-card.tsx`, `apps/web/src/features/settings/components/settings-content/skills-page/skills-list-panel.tsx`, `apps/web/src/features/settings/components/settings-content/skills-page/official-skill-admin-access.test.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:33] - [ARCH]
What: Added PromptMode action lifecycle exclusion for Projects/Code Runtime and Supabase actions while keeping backend compatibility maps intact.
Why: Projects and raw Supabase actions are on hold, so agents should not see, be granted, or execute them even when stale prompts or old generated skills still reference them.
Impact: On-hold actions are filtered from policy, generated `vibey-api` skills, Docker plugin action enums, scoped `ALLOWED_ACTIONS.json`, global scope metadata, and capability allowlists. Backend execution now rejects those actions before authz, schema/preflight side effects, provider calls, or handler dispatch with `ACTION_ON_HOLD` and `failed_before_effect`. Custom object actions remain active. Focused TDD tests, policy tests/typecheck, agent-api typecheck, and requested artifact/plugin/agent-sync suites pass; `architecture:check` still fails on pre-existing repo-wide LOC/cross-feature debt.
Files: `packages/agent-policy/src/action-lifecycle.ts`, `packages/agent-policy/src/actions.ts`, `packages/agent-policy/src/registry.ts`, `packages/agent-policy/src/role-defaults.ts`, `packages/agent-policy/src/action-contracts.ts`, `packages/agent-policy/src/index.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-lifecycle.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-lifecycle-error.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-execution.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-policy-skill.service.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`, `docker/tools/vibey-backend/index.ts`, `AGENTS.md`, `.docs/.knowledge/promptmode-action-family-map.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 00:02] - [ARCH]
What: Moved funnel preview API/cache wrappers and `useFunnelPagePreview` from Studio into shared artifact modules.
Why: Phase 3-A needs Spaces funnel hero previews to stop importing Studio-owned preview hooks and services.
Impact: No runtime logic changed. Added API and hook behavior-lock tests before the move, then reran them after the move. Focused ESLint, full web typecheck, LOC checks, stale old-hook scan, stale changelog scan, and `git diff --check` pass. `spaces -> studio` dropped from 64 to 63, and `artifact-preview.service.ts` dropped from 1670 to 1616 LOC.
Files: `apps/web/src/lib/artifacts/funnel-preview-api.ts`, `apps/web/src/lib/artifacts/funnel-preview-api.test.ts`, `apps/web/src/lib/artifacts/use-funnel-page-preview.ts`, `apps/web/src/lib/artifacts/use-funnel-page-preview.test.tsx`, `apps/web/src/features/studio/services/artifact-preview.service.ts`, `apps/web/src/features/studio/components/chat/artifact-inline-preview-card/hooks/useFunnelPagePreview.ts`, `apps/web/src/features/studio/components/chat/artifact-inline-preview-card/hooks/useFunnelPagePreview.test.tsx`, `apps/web/src/features/studio/services/artifact-preview-funnel-preview.test.ts`, `apps/web/src/features/studio/components/chat/artifact-inline-preview-card/FunnelArtifactInlinePreview.tsx`, `apps/web/src/features/spaces/components/artifacts/FunnelCardHeroPreview.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 00:10] - [ARCH]
What: Moved channel mention contracts and parser utilities into shared channel modules, with the old Channels parser path kept as a compatibility re-export.
Why: Phase 3-A is reducing Spaces imports from Channels feature internals for reusable mention parsing and composer payload mapping.
Impact: No runtime logic changed. Added parser, composer payload, and doc mention preview behavior-lock tests before the move, then reran them after the move. Focused ESLint, full web typecheck, LOC checks, stale import scan, stale changelog scan, and `git diff --check` pass. `spaces -> channels` dropped from 11 to 9.
Files: `apps/web/src/lib/channels/channel-types.ts`, `apps/web/src/lib/channels/mention-parser.ts`, `apps/web/src/lib/channels/mention-parser.test.ts`, `apps/web/src/features/channels/lib/mention-parser.ts`, `apps/web/src/features/channels/lib/mention-parser.test.ts`, `apps/web/src/features/channels/services/channels.service.ts`, `apps/web/src/features/spaces/lib/composer-payload-to-activity.ts`, `apps/web/src/features/spaces/lib/composer-payload-to-activity.test.ts`, `apps/web/src/features/spaces/lib/doc-mention-link-previews.ts`, `apps/web/src/features/spaces/lib/doc-mention-link-previews.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 00:22] - [ARCH]
What: Moved CRM contacts API/types and custom-field contracts into shared web lib modules with feature compatibility re-exports.
Why: Phase 3-A is reducing cross-feature imports from Spaces/Brain into Contacts and Properties for reusable CRM query/type boundaries.
Impact: No runtime logic changed. Added CRM API and contact merge-field behavior-lock tests before the move, then reran them after the move. Focused ESLint and full web typecheck pass. Remaining contact-detail API and Settings custom-field import cleanup is logged for follow-up.
Files: `apps/web/src/lib/contacts/crm-contacts-api.ts`, `apps/web/src/lib/contacts/crm-contacts-api.test.ts`, `apps/web/src/features/contacts/services/crm-contacts-api.ts`, `apps/web/src/features/contacts/services/crm-contacts-api.test.ts`, `apps/web/src/lib/properties/custom-fields.ts`, `apps/web/src/features/properties/types/custom-fields.ts`, `apps/web/src/features/spaces/services/contacts-view.service.ts`, `apps/web/src/features/spaces/services/__tests__/contacts-view.service.test.ts`, `apps/web/src/features/spaces/utils/contact-merge-fields.ts`, `apps/web/src/features/spaces/utils/contact-merge-fields.test.ts`, `apps/web/src/features/spaces/components/contacts/ContactInfoSection.tsx`, `apps/web/src/features/brain/components/CustomerAddInfoPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 00:35] - [ARCH]
What: Moved Contacts detail API wrappers into shared web contacts lib with the old Contacts service path kept as a compatibility export.
Why: Phase 3-A is removing Spaces and Studio imports from Contacts feature service internals for reusable contact fetch/update/note/reclassification APIs.
Impact: No runtime logic changed. Added baseline behavior-lock coverage before the move, migrated it into the shared contacts API test, reran focused contacts tests, clean subset ESLint, and full web typecheck. The stale Contacts service import scan is clean; remaining full changed-file ESLint blockers are existing UI component ownership and LOC debt tracked in follow-up work.
Files: `apps/web/src/lib/contacts/contacts-api.ts`, `apps/web/src/lib/contacts/contacts-api.test.ts`, `apps/web/src/features/contacts/services/contacts-api.ts`, `apps/web/src/features/spaces/components/contacts/ContactsView.tsx`, `apps/web/src/features/spaces/components/contacts/ContactInfoSection.tsx`, `apps/web/src/features/spaces/components/contacts/ContactCommunicationPanel.tsx`, `apps/web/src/features/spaces/components/artifacts/email/EmailArtifactSendDialog.tsx`, `apps/web/src/features/spaces/components/automations/AutomationsPanel.tsx`, `apps/web/src/features/studio/components/preview/LeadsTab.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 00:36] - [ARCH]
What: Moved Settings custom-field consumers plus shared selection and date helpers to shared properties lib paths.
Why: Phase 3-A needs Settings and Spaces to stop importing reusable Properties feature helper/type internals.
Impact: No behavior changed. Added shared helper coverage for date labels and selection state, kept old Properties paths as compatibility re-exports, and verified focused tests, focused ESLint, full web typecheck, stale old-path scans, and LOC checks. `ContactsSegmentPanel.tsx` remains over the component limit and is tracked in follow-up work.
Files: `apps/web/src/lib/properties/custom-fields.ts`, `apps/web/src/lib/properties/format-date.ts`, `apps/web/src/lib/properties/use-selection-state.ts`, `apps/web/src/lib/properties/properties-ui-helpers.test.tsx`, `apps/web/src/features/properties/types/custom-fields.ts`, `apps/web/src/features/properties/hooks/useSelectionState.ts`, `apps/web/src/features/properties/utils/format-date.ts`, `apps/web/src/features/settings/components/settings-content/properties/custom-fields/CustomFieldsTab.tsx`, `apps/web/src/features/settings/components/settings-content/properties/custom-fields/CustomFieldEditorDialog.tsx`, `apps/web/src/features/settings/components/settings-content/properties/custom-fields/CustomFieldDeleteDialog.tsx`, `apps/web/src/features/settings/components/settings-content/properties/shared/field-type-icon.tsx`, `apps/web/src/features/spaces/components/contacts/ContactsSegmentPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 00:43] - [ARCH]
What: Moved custom-fields API/hook ownership and segment contracts into shared properties lib modules.
Why: Phase 3-A is reducing Settings, Contacts, and Spaces imports from Properties feature internals for reusable custom-field and segment contracts.
Impact: No behavior changed. Added API behavior-lock coverage before the move, migrated it to the shared API test, and verified focused tests, clean subset ESLint, full web typecheck, stale old-path scans, and LOC checks. Full changed-file ESLint is still blocked by the existing `SegmentFilterBuilder` component boundary, now logged separately.
Files: `apps/web/src/lib/properties/custom-fields-api.ts`, `apps/web/src/lib/properties/custom-fields-api.test.ts`, `apps/web/src/lib/properties/use-custom-fields.ts`, `apps/web/src/lib/properties/segments.ts`, `apps/web/src/features/properties/services/custom-fields-api.ts`, `apps/web/src/features/properties/hooks/useCustomFields.ts`, `apps/web/src/features/properties/types/segments.ts`, `apps/web/src/features/properties/services/segments-api.ts`, `apps/web/src/features/properties/hooks/useSegments.ts`, `apps/web/src/features/properties/components/segments/SegmentFilterBuilder.tsx`, `apps/web/src/features/settings/components/settings-content/properties/PropertiesPageContainer.tsx`, `apps/web/src/features/settings/components/settings-content/properties/segments/SegmentEditorDialog.tsx`, `apps/web/src/features/settings/components/settings-content/properties/segments/SegmentDeleteDialog.tsx`, `apps/web/src/features/settings/components/settings-content/properties/segments/SegmentViewDialog.tsx`, `apps/web/src/features/settings/components/settings-content/properties/shared/filter-badges.ts`, `apps/web/src/features/spaces/components/contacts/ContactsSegmentPanel.tsx`, `apps/web/src/features/contacts/components/ContactInfoPanel.tsx`, `apps/web/src/features/spaces/components/contacts/ContactCommunicationPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 00:56] - [ARCH]
What: Moved shared billing API wrappers and billing contracts from Settings into shared billing lib modules.
Why: Phase 3-A is reducing Billing, Mission Control, deliverables, and shared layout imports from Settings feature service/type internals.
Impact: No behavior changed. Added billing API behavior-lock coverage before the move, migrated it to the shared API test, and verified focused tests, clean subset ESLint, full web typecheck, stale non-Settings import scan, and LOC checks. Full changed-file ESLint is still blocked by existing `CreditPurchaseDialog.tsx` max-lines and Mission Control Settings/Studio import debt now logged in follow-up work.
Files: `apps/web/src/lib/billing/billing-api.ts`, `apps/web/src/lib/billing/billing.types.ts`, `apps/web/src/lib/billing/billing-api.test.ts`, `apps/web/src/features/settings/services/billing-api.ts`, `apps/web/src/features/settings/types/billing.types.ts`, `apps/web/src/features/billing/components/PurchaseSuccessHandler.tsx`, `apps/web/src/features/billing/components/CreditPurchaseDialog.tsx`, `apps/web/src/features/mission-control/containers/MissionControlContainer.tsx`, `apps/web/src/features/mission-control/components/AwarenessToggle.tsx`, `apps/web/src/components/deliverables/use-deliverable-brain-menu.ts`, `apps/web/src/components/layout/SidebarCreditsHover.tsx`, `apps/web/src/components/layout/AvatarDropdown.tsx`, `apps/web/src/components/layout/sidebar/useSidebarController.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:05] - [ARCH]
What: Moved shared chat/upload constants and toast messages from Studio into a shared chat lib module.
Why: Phase 3-A is reducing Mission Control imports from Studio feature config internals for reusable upload limits, accept lists, and chat toast messages.
Impact: No behavior changed. Added config and mission upload behavior-lock coverage before the move, migrated the config assertions to the shared chat test, and verified focused tests, clean subset ESLint, full web typecheck, Mission Control stale old-path scan, LOC checks, stale changelog scan, and `git diff --check`. Full changed-file ESLint is still blocked by existing Mission Control LOC and cross-feature import debt now logged in follow-up work.
Files: `apps/web/src/lib/chat/chat-toast-errors.config.ts`, `apps/web/src/lib/chat/chat-toast-errors.config.test.ts`, `apps/web/src/features/studio/config/chat-toast-errors.config.ts`, `apps/web/src/features/mission-control/containers/MissionControlContainer.tsx`, `apps/web/src/features/mission-control/lib/upload-mission-creation-attachments.ts`, `apps/web/src/features/mission-control/lib/upload-mission-creation-attachments.test.ts`, `apps/web/src/features/mission-control/components/MissionQuickCapture.tsx`, `apps/web/src/features/mission-control/components/MissionQuickCapture.test.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:11] - [ARCH]
What: Moved shared campaign team contracts and API wrapper into the shared campaigns lib.
Why: Phase 3-A is reducing Mission Control imports from Studio campaign service internals for campaign list/team data.
Impact: No behavior changed. Added campaign-team behavior-lock coverage before the move, migrated direct API assertions to the shared campaign API test, and verified focused tests, clean subset ESLint, full web typecheck, Mission Control stale Studio campaign-service scan, LOC checks, stale changelog scan, and `git diff --check`. Full changed-file ESLint is still blocked by existing Mission Control Settings/Org imports now logged in follow-up work.
Files: `apps/web/src/lib/campaigns/campaign-api.ts`, `apps/web/src/lib/campaigns/campaign-api.test.ts`, `apps/web/src/features/studio/services/campaign.service.ts`, `apps/web/src/features/studio/services/campaign.service.test.ts`, `apps/web/src/features/mission-control/containers/MissionControlContainer.tsx`, `apps/web/src/features/mission-control/store/use-mission-dashboard-store.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:15] - [ARCH]
What: Moved account settings modal context, hook, and section type into a shared settings lib module.
Why: Phase 3-A is reducing Mission Control imports from Settings feature context internals for opening account billing/settings flows.
Impact: No behavior changed. Added account settings provider/hook behavior-lock coverage before the move, migrated it to the shared settings test, and verified focused tests, focused ESLint, full web typecheck, Mission Control stale Settings context scan, LOC checks, stale changelog scan, and `git diff --check`.
Files: `apps/web/src/lib/settings/account-settings-modal-context.tsx`, `apps/web/src/lib/settings/account-settings-modal-context.test.tsx`, `apps/web/src/features/settings/contexts/AccountSettingsModalContext.tsx`, `apps/web/src/features/settings/contexts/AccountSettingsModalContext.test.tsx`, `apps/web/src/features/mission-control/containers/MissionControlContainer.tsx`, `apps/web/src/features/mission-control/components/AwarenessToggle.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:18] - [ARCH]
What: Moved Mission Control Org store imports to the existing shared org context store.
Why: Phase 3-A is removing Mission Control imports from Org feature re-export paths when the source of truth already lives under `src/lib/org`.
Impact: No behavior changed. Reused the org context store behavior-lock test before and after the import cleanup, then verified focused ESLint, full web typecheck, Mission Control stale Org store scan, LOC checks, stale changelog scan, and `git diff --check`.
Files: `apps/web/src/features/mission-control/store/use-mission-dashboard-store.ts`, `apps/web/src/features/mission-control/components/NotificationBell.tsx`, `apps/web/src/lib/org/org-context-store.ts`, `apps/web/src/features/org/store/use-org-store.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:22] - [ARCH]
What: Moved notification metadata helpers into a shared notifications lib module.
Why: Phase 3-A is removing Mission Control imports from Notifications feature helper internals for notification labels, dot classes, markdown formatting, and retry metadata.
Impact: No behavior changed. Added notification metadata behavior-lock coverage before the move, migrated it to the shared notification test, and verified focused tests, focused ESLint, full web typecheck, Mission Control stale Notifications helper scan, LOC checks, stale changelog scan, and `git diff --check`.
Files: `apps/web/src/lib/notifications/notification-meta.ts`, `apps/web/src/lib/notifications/notification-meta.test.ts`, `apps/web/src/features/notifications/lib/notification-meta.ts`, `apps/web/src/features/notifications/lib/notification-meta.test.ts`, `apps/web/src/features/mission-control/components/NotificationsFeedModal.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:25] - [ARCH]
What: Moved clipboard image extraction helpers into shared media lib.
Why: Phase 3-A is removing Mission Control imports from Studio utility internals for pasted image attachment handling.
Impact: No behavior changed. Reused the clipboard helper behavior-lock test before the move, migrated it to the shared media test, and verified focused tests, clean subset ESLint, full web typecheck, Mission Control stale Studio clipboard utility scan, LOC checks, stale changelog scan, and `git diff --check`. Full changed-file ESLint is still blocked by existing `ActivityTimeline.tsx` LOC and Studio FileAttachments debt now logged in follow-up work.
Files: `apps/web/src/lib/media/clipboard-image.ts`, `apps/web/src/lib/media/clipboard-image.test.ts`, `apps/web/src/features/studio/utils/clipboard-image.ts`, `apps/web/src/features/studio/utils/clipboard-image.test.ts`, `apps/web/src/features/mission-control/components/dialogs/ActivityTimeline.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:34] - [ARCH]
What: Moved shared markdown rendering, document-content markdown extraction, and offer-step preview helpers into shared web lib modules.
Why: Phase 3-A is removing Mission Control and other non-owner imports from Spaces/Studio helper internals for reusable deliverable preview behavior.
Impact: No behavior changed. Added helper behavior-lock tests at the old paths, migrated them to shared `src/lib` paths, and verified focused tests, clean subset ESLint, full web typecheck, stale old-helper import scans, and LOC checks. Full changed-file ESLint is still blocked by existing `DeliverablesView.tsx`, Spaces campaign-docs, and Team preview cross-feature imports/LOC debt now logged in follow-up work.
Files: `apps/web/src/lib/content/markdown-to-html.ts`, `apps/web/src/lib/content/markdown-to-html.test.ts`, `apps/web/src/lib/content/document-content-markdown.ts`, `apps/web/src/lib/content/document-content-markdown.test.ts`, `apps/web/src/lib/artifacts/offer-step-preview.ts`, `apps/web/src/lib/artifacts/offer-step-preview.test.ts`, `apps/web/src/features/spaces/lib/markdown-to-html.ts`, `apps/web/src/features/studio/lib/document-content-markdown.ts`, `apps/web/src/features/studio/lib/offer-step-preview.ts`, `apps/web/src/features/mission-control/components/dialogs/DeliverablesCarousel.tsx`, `apps/web/src/components/deliverables/use-deliverable-entity-content.ts`, `apps/web/src/components/deliverables/SpaceDocDeliverablePreview.tsx`, `apps/web/src/features/spaces/hooks/use-space-campaign-docs.ts`, `apps/web/src/features/team/lib/conversation-artifact-preview.utils.ts`, `apps/web/src/features/team/components/chat/ConversationArtifactPreviewCard.tsx`, `apps/web/src/features/channels/components/DeliverablesView.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:39] - [ARCH]
What: Moved chat model-settings contracts and parsing into a shared chat lib module.
Why: Phase 3-A is removing Mission Control imports from Studio chat service internals for agent communication model settings.
Impact: No behavior changed. Added model-settings behavior-lock coverage at the Studio service path before the move, migrated it to the shared chat test, and verified focused tests, focused ESLint, full web typecheck, Mission Control stale Studio chat-service scan, and LOC checks. `chat.service.ts` remains over the frontend service limit and is tracked as Phase 3-B follow-up debt.
Files: `apps/web/src/lib/chat/chat-model-settings.ts`, `apps/web/src/lib/chat/chat-model-settings.test.ts`, `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/features/studio/services/chat-model-settings.test.ts`, `apps/web/src/features/mission-control/services/missions.service.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:44] - [ARCH]
What: Moved shared chat content-block contracts from Studio types into a shared chat lib module.
Why: Phase 3-A is removing Mission Control imports from Studio type internals for mission execution stream and locked-in activity rendering.
Impact: No behavior changed. Added type-shape behavior-lock coverage at the Studio type path before the move, migrated it to the shared chat test, and verified focused tests, clean subset ESLint, full web typecheck, Mission Control stale Studio types scan, and LOC checks. Full changed-file ESLint is still blocked by the existing `MissionLockedIn.tsx` import of Studio `ToolBlockInline`, now logged as the next component-boundary cleanup.
Files: `apps/web/src/lib/chat/message-content-blocks.ts`, `apps/web/src/lib/chat/message-content-blocks.test.ts`, `apps/web/src/features/studio/types/index.ts`, `apps/web/src/features/studio/types/message-content-blocks.test.ts`, `apps/web/src/features/mission-control/hooks/useMissionExecStream.ts`, `apps/web/src/features/mission-control/components/dialogs/MissionLockedIn.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:50] - [ARCH]
What: Moved reusable chat tool-step rendering from Studio `FlowTimeline` into shared `src/components/chat`.
Why: Phase 3-A is removing Mission Control imports from Studio chat component internals while preserving Studio timeline compatibility exports.
Impact: No behavior changed. The old Studio renderer behavior was locked with a focused test before the move, then migrated to the shared component test. Focused test, focused ESLint, full web typecheck, stale Studio renderer import scan, LOC checks, stale changelog scan, and `git diff --check` pass. Mission Control cross-feature imports dropped to the remaining Spaces list/menu/space-item and Studio file-attachment/artifact-preview boundaries.
Files: `apps/web/src/components/chat/ToolBlockInline.tsx`, `apps/web/src/components/chat/ToolBlockInline.test.tsx`, `apps/web/src/features/studio/components/chat/FlowTimeline.tsx`, `apps/web/src/features/studio/components/chat/ToolBlockInline.test.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionLockedIn.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:55] - [ARCH]
What: Moved reusable chat file attachments UI, document attachment contracts, and file status labels into shared chat boundaries.
Why: Phase 3-A is removing Mission Control imports from Studio chat component/type internals for reusable attachment chips and upload state labels.
Impact: No behavior changed. The existing Studio attachment status test passed before the move, then passed at the shared component path after the move. Clean subset ESLint and full web typecheck pass. Full changed-file ESLint remains blocked by pre-existing Mission Control modal/activity max-lines and the still-open Spaces mission-menu import, which are tracked for the next batches.
Files: `apps/web/src/components/chat/FileAttachments.tsx`, `apps/web/src/components/chat/FileAttachments.test.tsx`, `apps/web/src/lib/chat/document-attachments.ts`, `apps/web/src/lib/chat/chat-file-status.config.ts`, `apps/web/src/features/studio/components/chat/FileAttachments.tsx`, `apps/web/src/features/studio/components/chat/FileAttachments.test.tsx`, `apps/web/src/features/studio/config/chat-file-status.config.ts`, `apps/web/src/features/studio/types/index.ts`, `apps/web/src/features/mission-control/components/dialogs/ActivityTimeline.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 01:59] - [ARCH]
What: Moved the mission menu dropdown and its action hook from Spaces into Mission Control ownership.
Why: Phase 3-A is clearing Mission Control imports from Spaces internals; the menu already depended on Mission Control services/types and had no Spaces consumers.
Impact: No runtime logic changed. Added retry-state characterization coverage at the old Spaces path, reran it, moved the test with the hook, and reran it at the Mission Control path. Clean subset ESLint and full web typecheck pass. Full changed-file ESLint remains blocked by pre-existing Mission Control max-lines and the remaining `MissionList` Spaces select/type imports.
Files: `apps/web/src/features/mission-control/components/mission-menu/MissionMenuDropdown.tsx`, `apps/web/src/features/mission-control/components/mission-menu/use-mission-menu-actions.ts`, `apps/web/src/features/mission-control/components/mission-menu/use-mission-menu-actions.test.ts`, `apps/web/src/features/spaces/components/mission-menu/MissionMenuDropdown.tsx`, `apps/web/src/features/spaces/components/mission-menu/use-mission-menu-actions.ts`, `apps/web/src/features/spaces/components/mission-menu/use-mission-menu-actions.test.ts`, `apps/web/src/features/mission-control/components/MissionList.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 02:03] - [ARCH]
What: Moved field color preset and progress fill helpers from Spaces cells into shared UI lib.
Why: Phase 3-A is clearing Mission Control imports from Spaces cell internals for mission progress bar customization.
Impact: No behavior changed. Added helper characterization coverage at the old Spaces path, reran it, moved the test to the shared path, and reran it after the move. Focused ESLint, full web typecheck, stale Mission Control old-path scan, stale changelog scan, and `git diff --check` pass. The shared helper is logged for a future split because it is 306 LOC and mixes pure helpers with small React UI pieces.

## [2026-06-22 09:27] - [DOCS]
What: Started the unified Agent Tool Error Contract goal with a source-of-truth plan for taxonomy, retry semantics, user-safe explanation, and rollout.
Why: Agent-facing tool errors are currently only partially classified; some paths return raw errors, some collapse structure into prose, and downstream response filtering cannot teach the agent how to recover.
Impact: Defines the initial contract fields, error classes, reliability/effect-state model, presentation-preview example, inventory queries, and first implementation target across the artifact harness and backend tool adapter.
Files: `.docs/plans/agent-tool-error-contract.md`, `.docs/logs/changelog2026-06-22.md`
Files: `apps/web/src/lib/ui/field-color-presets.tsx`, `apps/web/src/lib/ui/field-color-presets.test.ts`, `apps/web/src/features/spaces/components/cells/field-color-presets-popover.tsx`, `apps/web/src/features/spaces/components/cells/field-color-presets-popover.test.ts`, `apps/web/src/features/mission-control/components/MissionListProgressCell.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 02:20] - [ARCH]
What: Moved shared space item lookup and artifact preview entity fetchers into shared web lib boundaries.
Why: Phase 3-A is clearing Mission Control `DeliverablesCarousel` imports from Spaces service internals and Studio artifact preview service internals.
Impact: No behavior changed. Added behavior-lock coverage at the old feature service paths before the move, migrated the assertions to shared `src/lib` tests, kept old Spaces/Studio compatibility exports, and verified focused tests, focused ESLint, full web typecheck, stale import scans, LOC checks, stale changelog scan, and `git diff --check`. Mission Control cross-feature imports are now down to the two `MissionList` Spaces select/schema imports.
Files: `apps/web/src/lib/spaces/space-item-types.ts`, `apps/web/src/lib/spaces/spaces-api.ts`, `apps/web/src/lib/spaces/spaces-api.test.ts`, `apps/web/src/features/spaces/types/index.ts`, `apps/web/src/features/spaces/services/spaces.service.ts`, `apps/web/src/lib/artifacts/artifact-preview-api.ts`, `apps/web/src/lib/artifacts/artifact-preview-api.test.ts`, `apps/web/src/lib/artifacts/core-artifact-types.ts`, `apps/web/src/lib/artifacts/artifact-types.ts`, `apps/web/src/features/studio/services/artifact-preview.service.ts`, `apps/web/src/features/studio/types/index.ts`, `apps/web/src/features/mission-control/components/dialogs/DeliverablesCarousel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 02:31] - [ARCH]
What: Moved reusable Spaces select UI, option badge/status helpers, and mission-list schema contracts into shared web UI/lib boundaries.
Why: Phase 3-A needed to clear the final Mission Control imports from Spaces feature internals.
Impact: No behavior changed. The old Spaces select/option paths remain compatibility re-exports, shared behavior-lock tests pass, full web typecheck passes, and the Mission Control cross-feature scan now returns no hits. Full changed-file ESLint is still blocked by the existing `MissionList.tsx` max-lines violation, now tracked for Phase 3-B.
Files: `apps/web/src/components/ui/forms/SelectCell.tsx`, `apps/web/src/components/ui/forms/SelectCell.test.tsx`, `apps/web/src/components/ui/status/OptionBadge.tsx`, `apps/web/src/components/ui/status/OptionDot.test.tsx`, `apps/web/src/lib/spaces/space-schema-types.ts`, `apps/web/src/lib/spaces/status-categories.ts`, `apps/web/src/features/spaces/components/cells/SelectCell.tsx`, `apps/web/src/features/spaces/components/OptionBadge.tsx`, `apps/web/src/features/spaces/lib/status-categories.ts`, `apps/web/src/features/spaces/types/space-schema.ts`, `apps/web/src/features/mission-control/components/MissionList.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 02:42] - [ARCH]
What: Split the oversized Mission Control mission list into focused presentation modules.
Why: Phase 3-B needs frontend god components below the 400-line component limit after the Phase 3-A import boundary cleanup.
Impact: No behavior changed. Added MissionList characterization coverage before the split, then verified the same tests after extraction. `MissionList.tsx` is now 357 LOC, every extracted file is below its limit, focused ESLint including `MissionList.tsx` passes, full web typecheck passes, and Mission Control still has no cross-feature imports.
Files: `apps/web/src/features/mission-control/components/MissionList.tsx`, `apps/web/src/features/mission-control/components/MissionList.test.tsx`, `apps/web/src/features/mission-control/components/mission-list-config.ts`, `apps/web/src/features/mission-control/components/MissionListAgents.tsx`, `apps/web/src/features/mission-control/components/MissionListCell.tsx`, `apps/web/src/features/mission-control/components/MissionListHeader.tsx`, `apps/web/src/features/mission-control/components/MissionListMobileCards.tsx`, `apps/web/src/features/mission-control/components/MissionListDesktopRows.tsx`, `apps/web/src/features/mission-control/components/MissionListDeleteDialog.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 02:46] - [ARCH]
What: Split the oversized Mission Control quick-capture composer into focused pieces.
Why: Phase 3-B is reducing Mission Control god components after clearing cross-feature imports.
Impact: No behavior changed. Existing MissionQuickCapture tests passed before and after the split. `MissionQuickCapture.tsx` is now 316 LOC, all extracted files are under the component limit, focused ESLint passes, full web typecheck passes, and Mission Control still has no cross-feature imports.
Files: `apps/web/src/features/mission-control/components/MissionQuickCapture.tsx`, `apps/web/src/features/mission-control/components/MissionQuickCapture.test.tsx`, `apps/web/src/features/mission-control/components/mission-quick-capture-config.ts`, `apps/web/src/features/mission-control/components/MissionQuickCaptureFileChips.tsx`, `apps/web/src/features/mission-control/components/MissionQuickCaptureIdleFooter.tsx`, `apps/web/src/features/mission-control/components/MissionQuickCaptureRecordingFooter.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 02:56] - [ARCH]
What: Split the oversized Mission Control activity timeline into focused dialog components.
Why: Phase 3-B is reducing Mission Control god components after the cross-feature import cleanup.
Impact: No behavior changed. Added rendered activity characterization coverage before the split, kept existing paste coverage, and verified focused tests, focused ESLint, full web typecheck, Mission Control cross-feature scan, LOC checks, stale changelog scan, and `git diff --check`. `ActivityTimeline.tsx` is now 195 LOC and all extracted files are under the component limit.
Files: `apps/web/src/features/mission-control/components/dialogs/ActivityTimeline.tsx`, `apps/web/src/features/mission-control/components/dialogs/ActivityTimeline.test.tsx`, `apps/web/src/features/mission-control/components/dialogs/ActivityTimelineComposer.tsx`, `apps/web/src/features/mission-control/components/dialogs/ActivityTimelineLogList.tsx`, `apps/web/src/features/mission-control/components/dialogs/ActivityTimelineLogItem.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 03:10] - [ARCH]
What: Split the oversized Mission Control detail modal into focused shells, view, and attachment hook.
Why: Phase 3-B needed the remaining Mission Control hard LOC blocker below the 400-line component limit.
Impact: No behavior changed. Added MissionDetailModal characterization coverage for desktop close behavior, mobile activity navigation, and text comment sending before the split. Focused tests, focused ESLint, full web typecheck, Mission Control cross-feature scan, LOC checks, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.test.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailModalView.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailMobileShell.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailDesktopShell.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailOverlayModals.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionAccessApprovalCard.tsx`, `apps/web/src/features/mission-control/components/dialogs/useMissionDetailCommentAttachments.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 03:34] - [ARCH]
What: Split the oversized HQ sidebar section into focused sidebar modules.
Why: Phase 3-B needed the layout shell god component below the 400-line frontend component limit before continuing to the remaining feature god files.
Impact: No behavior changed. Added sidebar characterization coverage before the split, then verified the same test after extraction. `SidebarHqSection.tsx` is now 196 LOC and all extracted sidebar files are below 400 LOC. Focused test, focused ESLint, full web typecheck, LOC checks, styling/import hygiene scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/components/layout/sidebar/SidebarHqSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSection.test.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqMobileDrawer.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSpacesGroupedList.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSpacesMenuLayers.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSpacesRows.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqProjectList.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 03:54] - [ARCH]
What: Extracted pure `ChatInput` helpers and constants into focused helper modules.
Why: Phase 3-B is reducing the oversized Studio chat composer in small behavior-locked slices before touching stateful send/upload/portal behavior.
Impact: No behavior changed. Added 14 helper characterization tests before wiring, removed the replaced inline helper code from `ChatInput.tsx`, and reduced the component from 5312 LOC to 4713 LOC. Focused helper tests, focused ESLint, full web typecheck, LOC checks, styling/import hygiene scan, stale changelog scan, and `git diff --check` pass. Remaining `ChatInput.tsx` JSX/state and styling debt is logged for the next Phase 3-B slices.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-at-mentions.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-at-mentions.test.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-constants.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-format.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-model-settings.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-model-settings.test.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-policy.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-policy.test.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-slash-menu.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-slash-menu.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 04:00] - [ARCH]
What: Extracted `ChatInput` @-mention visual row and tab helpers into a focused module.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked slices while cleaning touched style debt.
Impact: No behavior changed. Added render coverage for @-menu tabs, media thumbnails, task status dots, and spacer sizing; moved the visual helpers to `chat-input-at-menu.tsx`; removed the old Spaces `OptionBadge` import from `ChatInput.tsx`; and replaced the moved thumbnail raw token classes with `bg-muted-20`. `ChatInput.tsx` is now 4603 LOC. Focused helper tests, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-at-menu.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-at-menu.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 04:03] - [ARCH]
What: Extracted `ChatInput` slash-command menu presentation into a focused view module.
Why: Phase 3-B is continuing the Studio chat composer split in small behavior-preserving slices.
Impact: No behavior changed. Added render coverage for slash empty state, skill/workflow sections, row highlight/select callbacks, and show-more callbacks; moved slash menu row/section rendering to `chat-input-slash-menu-view.tsx`; and kept portal/floating style ownership in `ChatInput.tsx`. `ChatInput.tsx` is now 4504 LOC. Focused helper tests, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-slash-menu-view.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-slash-menu-view.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 04:06] - [ARCH]
What: Extracted `ChatInput` composer notice and drag overlay presentation.
Why: Phase 3-B is reducing the Studio chat composer while cleaning style debt in touched visual slices.
Impact: No behavior changed. Added render coverage for the credit purchase event, destructive notice styling, drag overlay copy, token utility classes, and wrapper rounding behavior. Replaced the touched raw token classes with `text-destructive`, `bg-background/80`, and `border-primary`. `ChatInput.tsx` is now 4489 LOC. Focused helper tests, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-composer-notices.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-composer-notices.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 04:09] - [ARCH]
What: Extracted `ChatInput` attached reference chip presentation.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked display slices.
Impact: No behavior changed. Added coverage for visible reference filtering, chip removal callbacks, and empty rendering. Replaced the moved arbitrary `max-w-[140px]` label class with `max-w-36`. `ChatInput.tsx` is now 4465 LOC. Focused helper tests, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-reference-chips.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-reference-chips.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 04:14] - [ARCH]
What: Extracted `ChatInput` active capability chip presentation.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked display slices while cleaning touched style debt.
Impact: No behavior changed. Added coverage for selected capability rendering, icon rendering, clear callback delegation, and empty rendering. Replaced the moved arbitrary chip classes with `body-4`, `max-w-32`, and `hover:bg-hover-subtle`. `ChatInput.tsx` is now 4444 LOC. Focused helper tests, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-active-capability-chip.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-active-capability-chip.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 04:23] - [ARCH]
What: Extracted `ChatInput` plus-menu presentation.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked visual slices while reducing menu JSX in the main composer.
Impact: No behavior changed. Added coverage for submenu hover delegation, attach tab selection, integration toggles/connects, skill toggles/info cards, and access policy states. Replaced moved arbitrary width/height classes with existing fixed utilities. `ChatInput.tsx` is now 4215 LOC. Focused helper tests, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-view.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-view.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 04:27] - [ARCH]
What: Extracted `ChatInput` context meter presentation.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked visual slices while removing the inline warning color from the context ring.
Impact: No behavior changed. Added coverage for token labels, success/warning/destructive ring thresholds, disabled-panel rendering, and popover toggle behavior. Replaced the inline warning stroke with `var(--color-warning)`. `ChatInput.tsx` is now 4149 LOC. Focused helper tests, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-context-meter.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-context-meter.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 04:44] - [ARCH]
What: Extracted `ChatInput` model picker presentation and portal panels.
Why: Phase 3-B is reducing the oversized Studio chat composer in behavior-locked visual slices without changing model-selection behavior.
Impact: No behavior changed. Added model-picker render/interaction coverage before wiring, then replaced the inline trigger, dropdown, hover card, edit panel, and tooltip JSX with focused view/panel modules. `ChatInput.tsx` is now 3819 LOC; the new model picker files are 270 LOC and 267 LOC. Focused helper tests, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-model-picker-view.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-model-picker-panels.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-model-picker-view.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 04:52] - [ARCH]
What: Extracted `ChatInput` @-mention autocomplete presentation.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked visual slices without changing mention selection behavior.
Impact: No behavior changed. Added @-mention menu render/interaction coverage before wiring, then replaced the inline artifact, media, campaign, task, mission, loading, and empty-state rows with a focused view module. `ChatInput.tsx` is now 3553 LOC; the new @-mention view is 351 LOC. Focused @-mention tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-at-mention-menu-view.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-at-mention-menu-view.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:01] - [ARCH]
What: Extracted `ChatInput` recording-mode footer presentation.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked slices while keeping the recorder callback contract unchanged.
Impact: No behavior changed. Added recording-footer characterization coverage before wiring, moved the lazy Deepgram recorder wrapper and stop/cancel/finishing controls into `chat-input-recording-footer.tsx`, and replaced the moved recording stop icon `text-red-500` class with `text-destructive`. `ChatInput.tsx` is now 3508 LOC; the extracted footer is 91 LOC. Focused recording-footer tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-recording-footer.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-recording-footer.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:06] - [ARCH]
What: Extracted `ChatInput` voice and send controls.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked footer slices.
Impact: Interaction behavior stayed the same. Added voice/send control coverage before wiring, moved voice input, live voice, send, and streaming stop controls into `chat-input-voice-send-controls.tsx`, and replaced the touched manual send/stop SVGs with lucide icons. `ChatInput.tsx` is now 3467 LOC; the extracted control file is 71 LOC. Focused voice/send tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-voice-send-controls.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-voice-send-controls.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:14] - [ARCH]
What: Extracted the `ChatInput` slash-command portal wrapper.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked portal slices.
Impact: No behavior changed. Added slash portal coverage before wiring, moved the portal shell into `chat-input-slash-menu-portal.tsx`, and removed the replaced inline portal JSX from `ChatInput.tsx`. `ChatInput.tsx` is now 3457 LOC; the extracted portal wrapper is 56 LOC. Focused slash portal tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-slash-menu-portal.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-slash-menu-portal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:18] - [ARCH]
What: Extracted the `ChatInput` context breakdown popover portal wrapper.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked portal slices.
Impact: No behavior changed. Added context portal coverage before wiring, moved the measured-position portal shell into `chat-input-context-popover-portal.tsx`, and removed the replaced inline context popover portal JSX from `ChatInput.tsx`. `ChatInput.tsx` is now 3440 LOC; the extracted portal wrapper is 50 LOC. Focused context portal tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-context-popover-portal.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-context-popover-portal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:23] - [ARCH]
What: Extracted the `ChatInput` textarea and highlight backdrop renderer.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked render slices while keeping input state and menu sync in the parent.
Impact: No behavior changed. Added textarea renderer coverage before wiring, moved the textarea/highlight shell into `chat-input-textarea.tsx`, and removed the replaced inline textarea JSX from `ChatInput.tsx`. `ChatInput.tsx` is now 3431 LOC; the extracted textarea renderer is 76 LOC. Focused textarea tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-textarea.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-textarea.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:27] - [ARCH]
What: Extracted the `ChatInput` attachment render area.
Why: Phase 3-B is continuing the Studio chat composer split in behavior-locked attachment slices without moving upload state yet.
Impact: No behavior changed. Added attachment-area coverage before wiring, moved the hidden file input plus file/artifact/reference/credits rendering into `chat-input-attachments-area.tsx`, and removed the replaced inline JSX from `ChatInput.tsx`. `ChatInput.tsx` is now 3408 LOC; the extracted attachment area is 72 LOC. Focused attachment-area tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-attachments-area.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-attachments-area.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:32] - [ARCH]
What: Extracted `ChatInput` file attachment state helpers.
Why: Phase 3-B is reducing the Studio chat composer by moving duplicated attachment state logic behind tested helpers before splitting async upload orchestration.
Impact: No behavior changed. Added file-state helper coverage before wiring, moved restored document seeding, pending upload entry creation, blob preview revocation, file removal cleanup, and send-time document mapping into `chat-input-file-state.ts`. `ChatInput.tsx` is now 3325 LOC; the extracted helper is 110 LOC. Focused file-state tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-file-state.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-file-state.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:40] - [ARCH]
What: Extracted `ChatInput` async file upload orchestration into a focused hook.
Why: Phase 3-B is continuing the Studio chat composer split by moving attachment upload state and polling out of the oversized component after the file-state helper extraction.
Impact: No behavior changed. Added upload-hook behavior coverage for presigned upload payloads, document-intelligence polling, max-file rejection, restored documents, blob URL revocation, removal, and clear behavior. `ChatInput.tsx` is now 3212 LOC; the extracted hook is 207 LOC. Focused upload-hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-file-upload.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-file-upload.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:46] - [ARCH]
What: Extracted `ChatInput` drag/drop handling into a focused hook.
Why: Phase 3-B is continuing the Studio chat composer split by moving composer, document-level, and outer-dropzone drag state out of the oversized component.
Impact: No behavior changed. Added dropzone-hook behavior coverage for local file drops, artifact drops, document-level file drops, and outer dropzone drops. `ChatInput.tsx` is now 3039 LOC; the extracted hook is 224 LOC. Focused dropzone-hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-dropzone.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-dropzone.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:50] - [ARCH]
What: Moved pasted-text strip and editor rendering behind a shared Composer wrapper.
Why: Phase 3-B is continuing the Studio chat composer split while keeping pasted-text ownership inside the Composer pasted-text feature.
Impact: No behavior changed. Added wrapper coverage for edit, remove, save, and close delegation. `ChatInput.tsx` is now 3031 LOC; the shared pasted-text wrapper is 45 LOC. Focused wrapper tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/composer/pasted-text/PastedTextComposerControls.tsx`, `apps/web/src/features/composer/pasted-text/PastedTextComposerControls.test.tsx`, `apps/web/src/features/composer/pasted-text/index.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 05:56] - [ARCH]
What: Extracted `ChatInput` plus-menu positioning state into a focused hook.
Why: Phase 3-B is continuing the Studio chat composer split by moving portal positioning, submenu timers, refs, and info-card state out of the oversized component.
Impact: No behavior changed. Added plus-menu hook coverage for trigger positioning, submenu positioning, info-card placement, and close cleanup. `ChatInput.tsx` is now 2900 LOC; the extracted hook is 199 LOC. Focused plus-menu hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-menu.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-menu.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:01] - [ARCH]
What: Extracted `ChatInput` model-menu positioning state into a focused hook.
Why: Phase 3-B is continuing the Studio chat composer split by moving model dropdown, hover card, edit panel, and tooltip positioning out of the oversized component.
Impact: No behavior changed. Added model-menu hook coverage for dropdown placement, hover-card placement, edit-panel placement, tooltip placement, and close-state cleanup. `ChatInput.tsx` is now 2788 LOC; the extracted hook is 184 LOC. Focused model-menu hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-menu.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-menu.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:06] - [ARCH]
What: Extracted `ChatInput` context popover positioning state into a focused hook.
Why: Phase 3-B is continuing the Studio chat composer split by moving context breakdown popover measurement, open state, and keyboard handling out of the oversized component.
Impact: No behavior changed. Added hook coverage for measured position, disabled reset, and Escape close. `ChatInput.tsx` is now 2742 LOC; the extracted hook is 93 LOC. Focused context-popover hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-context-popover.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-context-popover.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:14] - [ARCH]
What: Extracted `ChatInput` slash and @ menu positioning state into a focused hook.
Why: Phase 3-B is continuing the Studio chat composer split by moving Floating UI refs, caret anchors, shell measurement, and layout sync out of the oversized component.
Impact: No behavior changed. Added hook coverage for slash floating refs, scroll reset, position updates, @ shell measurement, and closed-state cleanup. `ChatInput.tsx` is now 2640 LOC; the extracted hook is 169 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-floating-menus.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-floating-menus.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:19] - [ARCH]
What: Extracted `ChatInput` external Space attach listeners and shared the presentation import event contract.
Why: Phase 3-B is reducing the Studio chat composer while keeping feature boundaries clean; the moved hook could not import a Spaces feature file.
Impact: No behavior changed. Added hook coverage for external task/file attach events, duplicate guards, max-file handling, and composer import-file delegation. `ChatInput.tsx` is now 2550 LOC; the extracted hook is 141 LOC. Focused hook tests, existing presentation-import tests, full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, old Spaces event import scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-external-attachments.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-external-attachments.test.ts`, `apps/web/src/lib/spaces/presentation-import-events.ts`, `apps/web/src/features/spaces/lib/presentation-import-events.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:23] - [ARCH]
What: Extracted `ChatInput` recording and transcription state into a focused hook.
Why: Phase 3-B is reducing the oversized Studio chat composer while preserving voice input behavior.
Impact: No behavior changed. Added hook coverage for cursor-based interim transcript display, final transcript commit, cancel restore, and error restore. `ChatInput.tsx` is now 2481 LOC; the extracted hook is 107 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-recording.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-recording.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:30] - [ARCH]
What: Extracted `ChatInput` local/cloud file picker state into a focused hook.
Why: Phase 3-B is reducing the oversized Studio chat composer while preserving file attach behavior.
Impact: No behavior changed. Added hook coverage for chat toast configuration, plus-menu cleanup before cloud picker opens, hidden file input clicks, cloud file upload delegation, and Drive/Dropbox picker state passthrough. `ChatInput.tsx` is now 2472 LOC; the extracted hook is 43 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-cloud-attach.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-cloud-attach.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:35] - [ARCH]
What: Extracted `ChatInput` prewarm scheduler state into a focused hook.
Why: Phase 3-B is reducing the oversized Studio chat composer while preserving model/context prewarm behavior.
Impact: No behavior changed. Added hook coverage for chat scope payload construction, immediate focus prewarm, debounced input prewarm, active-textarea payload refresh, and scheduler cleanup. `ChatInput.tsx` is now 2446 LOC; the extracted hook is 72 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-prewarm.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-prewarm.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:40] - [ARCH]
What: Extracted `ChatInput` model hydration and preference persistence into a focused hook.
Why: Phase 3-B is reducing the oversized Studio chat composer while preserving model picker state, defaults, prewarm inputs, and conversation preference persistence.
Impact: No behavior changed. Added hook coverage for default hydration, row metadata, active settings output, and debounced preference persistence after user selection. `ChatInput.tsx` is now 2296 LOC; the extracted hook is 235 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-prefs.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-prefs.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:43] - [ARCH]
What: Extracted duplicated `ChatInput` composer shortcut handling into a pure helper.
Why: Phase 3-B is reducing keyboard orchestration inside the oversized Studio chat composer before splitting the larger @/slash menu navigation block.
Impact: No behavior changed. Added helper coverage for Cmd/Ctrl+D recording toggle, Cmd/Ctrl+S live voice start, disabled/no-op default prevention, and non-shortcut pass-through. `ChatInput.tsx` is now 2291 LOC; the extracted helper is 42 LOC. Focused helper tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-shortcuts.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-shortcuts.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:52] - [ARCH]
What: Extracted `ChatInput` @/slash menu keyboard navigation into a pure helper.
Why: Phase 3-B is reducing menu orchestration inside the oversized Studio chat composer while preserving the current keyboard behavior before moving send/draft state.
Impact: No behavior changed. Added helper coverage for @ Escape/cross-campaign close, highlight wrapping, campaign/artifact/media/mission selection, slash Escape/navigation/selection, and @-empty fall-through to slash handling. `ChatInput.tsx` is now 2230 LOC; the extracted helper is 220 LOC. Focused helper tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-menu-keyboard.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-menu-keyboard.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 06:57] - [ARCH]
What: Extracted `ChatInput` send orchestration into a focused hook.
Why: Phase 3-B is reducing stateful send logic inside the oversized Studio chat composer while preserving the current send/enqueue contract.
Impact: No behavior changed. Added hook coverage for merged text send payloads, document/artifact/reference forwarding, streaming enqueue routing, image-model validation, composer reset, and draft clearing. `ChatInput.tsx` is now 2195 LOC; the extracted hook is 141 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-send.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-send.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 07:02] - [ARCH]
What: Extracted `ChatInput` draft restore and persistence orchestration into a focused hook.
Why: Phase 3-B is reducing stateful draft logic inside the oversized Studio chat composer while preserving restore, context-switch, and debounce behavior.
Impact: No behavior changed. Added hook coverage for restore nonce handling, stored draft hydration, pending `new` draft transfer into a real conversation context, debounced save/clear, and latest-value unmount save. `ChatInput.tsx` is now 2122 LOC; the extracted hook is 150 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-draft.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-draft.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 07:13] - [ARCH]
What: Extracted `ChatInput` @-mention data loading and active-token sync into a focused hook.
Why: Phase 3-B is reducing the oversized Studio chat composer while preserving campaign artifact/media/mission mention behavior.
Impact: No behavior changed. Added hook coverage for base campaign rows, other-campaign rows, cross-campaign rows, close/reset behavior, and shell highlight reset notification. `ChatInput.tsx` is now 1871 LOC; the extracted hook is 277 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-at-mention-data.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-at-mention-data.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 07:19] - [ARCH]
What: Extracted `ChatInput` slash-command skill/workflow loading into a focused hook.
Why: Phase 3-B is reducing the oversized Studio chat composer while preserving slash menu data loading, filtering, and cache behavior.
Impact: No behavior changed. Added hook coverage for skills/workflows mapping, disabled-item filtering, partial workflow-load failure, and slash-token close behavior. `ChatInput.tsx` is now 1796 LOC; the extracted hook is 133 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-slash-data.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-slash-data.test.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-at-mention-data.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 07:23] - [ARCH]
What: Extracted `ChatInput` @-mention selection text and attachment mutations into a pure helper.
Why: Phase 3-B is reducing inline selection mutation logic while preserving campaign browsing and attached-reference behavior.
Impact: No behavior changed. Added helper coverage for campaign `@` replacement, selected-token removal, message-reference construction, duplicate guards, and local artifact chip rules. `ChatInput.tsx` is now 1782 LOC; the helper is 84 LOC. Focused helper tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-at-mention-selection.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-at-mention-selection.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 07:28] - [ARCH]
What: Extracted `ChatInput` slash-command selection and Backspace text mutations into a pure helper.
Why: Phase 3-B is reducing inline keyboard mutation logic while preserving slash command insertion and deletion behavior.
Impact: No behavior changed. Added helper coverage for selected-token replacement, no-token insert fallback, known-command Backspace deletion, and unknown-command no-op behavior. `ChatInput.tsx` is now 1783 LOC; the helper is 44 LOC. Focused helper tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-slash-selection.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-slash-selection.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 07:39] - [ARCH]
What: Extracted `ChatInput` textarea autosize, scroll sync, change/select syncing, and footer @ menu opening into a focused hook.
Why: Phase 3-B is reducing the oversized Studio chat composer while preserving composer text, @ mention, slash menu, and recording-mode behavior.
Impact: No behavior changed. Added hook coverage for composer change syncing, highlight scroll/floating-menu alignment, idle @ insertion, and recording-mode display-text insertion. `ChatInput.tsx` is now 1755 LOC; the extracted hook is 161 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-textarea-controller.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-textarea-controller.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 07:46] - [ARCH]
What: Extracted `ChatInput` composer integration, skill, and access policy orchestration into a focused hook.
Why: Phase 3-B is reducing the oversized Studio chat composer while preserving plus-menu access controls and integration connection behavior.
Impact: No behavior changed. Added hook coverage for overview/override hydration, lazy access-policy loading, skill rollback behavior, access override payloads, and provider redirect contracts. `ChatInput.tsx` is now 1552 LOC; the extracted hook is 307 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-composer-access.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-composer-access.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 07:51] - [ARCH]
What: Extracted the `ChatInput` @-mention portal wrapper into a focused component.
Why: Phase 3-B is reducing inline render orchestration in the oversized Studio chat composer while preserving @ menu positioning and selection behavior.
Impact: No behavior changed. Added portal coverage for closed rendering, measured and fallback widths, portal target rendering, and selection delegation. `ChatInput.tsx` is now 1529 LOC; the extracted portal wrapper is 55 LOC. Focused portal tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-at-mention-menu-portal.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-at-mention-menu-portal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 07:58] - [ARCH]
What: Extracted the `ChatInput` plus-menu portal wrapper into a focused component.
Why: Phase 3-B is reducing inline portal orchestration in the oversized Studio chat composer while preserving plus-menu rendering and actions.
Impact: No behavior changed. Added portal coverage for closed rendering, portal target rendering, menu positioning passthrough, submenu action delegation, and event containment. `ChatInput.tsx` is now 1526 LOC; the wrapper is 25 LOC. Focused portal/view tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-portal.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-portal.test.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-view.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:05] - [ARCH]
What: Extracted the normal `ChatInput` footer shell into a focused component.
Why: Phase 3-B is reducing inline composer render orchestration while preserving footer controls, context meter behavior, plus-menu actions, and send controls.
Impact: No behavior changed. Added footer-shell coverage for add-menu delegation, model label rendering, optional slot rendering, capability clear, context toggling, send delegation, context omission, and plus submenu passthrough. `ChatInput.tsx` is now 1483 LOC; the footer shell is 123 LOC. Focused footer tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-normal-footer.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-normal-footer.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:13] - [ARCH]
What: Extracted `ChatInput` @-mention layout state and derivation into a focused hook.
Why: Phase 3-B is reducing stateful menu orchestration inside the oversized Studio chat composer while preserving @ menu tabs, nav rows, campaign filtering, and reset behavior.
Impact: No behavior changed. Added hook coverage for menu-open tab reset, campaign filtering/nav slices, cross-campaign tabs and exit reset, and preview expansion reset. `ChatInput.tsx` is now 1321 LOC; the layout hook is 241 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-at-mention-layout.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-at-mention-layout.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:17] - [ARCH]
What: Extracted `ChatInput` slash menu preview layout into a focused hook.
Why: Phase 3-B is reducing menu orchestration inside the oversized Studio chat composer while preserving slash skill/workflow grouping, expansion, and highlight behavior.
Impact: No behavior changed. Added hook coverage for preview-limited rows, more counts, section expansion, expansion reset on item changes, highlight clamping, and empty-menu reset. `ChatInput.tsx` is now 1289 LOC; the slash layout hook is 70 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-slash-layout.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-slash-layout.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:26] - [ARCH]
What: Extracted `ChatInput` model-option loading into a focused hook.
Why: Phase 3-B is reducing async loading effects inside the oversized Studio chat composer while preserving model dropdown refresh behavior.
Impact: No behavior changed. Added hook coverage for initial loading, dropdown-open refresh, failure fallback, and parent-state mirroring. `ChatInput.tsx` is now 1263 LOC; the extracted hook is 62 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-options.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-options.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:31] - [ARCH]
What: Extracted `ChatInput` text accessors and pending composer text consumption into a focused hook.
Why: Phase 3-B is reducing shell-owned effects inside the oversized Studio chat composer while preserving external text insertion and artifact prompt handoff behavior.
Impact: No behavior changed. Added hook coverage for append/replace refs, mirror updates, pending text consumption, textarea resize/focus, and disabled consumption. `ChatInput.tsx` is now 1223 LOC; the extracted hook is 109 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-text-accessors.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-text-accessors.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:36] - [ARCH]
What: Extracted `ChatInput` outside-click menu closing into a focused hook.
Why: Phase 3-B is reducing shell-owned document effects inside the oversized Studio chat composer while preserving menu dismissal behavior.
Impact: No behavior changed. Added hook coverage for outside mousedown dismissal, plus menu containment, and slash/@ textarea containment. `ChatInput.tsx` is now 1205 LOC; the extracted hook is 130 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-outside-close.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-outside-close.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:40] - [ARCH]
What: Extracted `ChatInput` document-level shortcut listener into a focused hook.
Why: Phase 3-B is reducing shell-owned effects inside the oversized Studio chat composer while preserving global recording and live voice shortcuts.
Impact: No behavior changed. Added hook coverage for document shortcuts outside the composer, ignored shortcuts inside `[data-chat-input]`, and listener cleanup on unmount. `ChatInput.tsx` is now 1197 LOC; the extracted hook is 35 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-global-shortcuts.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-global-shortcuts.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:44] - [ARCH]
What: Extracted `ChatInput` slash, campaign, and @-mention selection callbacks into a focused hook.
Why: Phase 3-B is reducing stateful menu mutation logic inside the oversized Studio chat composer while preserving selection behavior.
Impact: No behavior changed. Added hook coverage for slash token replacement, campaign selection reset, artifact reference/artifact chip append, and space-task attach delegation. `ChatInput.tsx` is now 1111 LOC; the extracted hook is 187 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-selection-handlers.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-selection-handlers.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:50] - [ARCH]
What: Extracted `ChatInput` textarea keydown orchestration into a focused hook.
Why: Phase 3-B is reducing inline keyboard orchestration inside the oversized Studio chat composer while preserving shortcut, menu, Backspace, queue, and send behavior.
Impact: No behavior changed. Added hook coverage for shortcut precedence, known slash-command Backspace removal, empty-composer queue send-now, normal Enter send, and Shift Enter pass-through. `ChatInput.tsx` is now 1055 LOC; the extracted hook is 248 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-keydown.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-keydown.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:53] - [ARCH]
What: Extracted `ChatInput` slash highlight backdrop rendering into a focused helper.
Why: Phase 3-B is reducing inline textarea rendering helpers inside the oversized Studio chat composer while preserving slash-command highlighting.
Impact: No behavior changed. Added helper coverage for skill highlight classes, workflow/unknown command classes, transparent overlay preservation, and slash command detection. `ChatInput.tsx` is now 1032 LOC; the extracted helper is 42 LOC. Focused helper tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. The only style scan hit is the moved known transparent overlay in `chat-input-highlight-backdrop.tsx`.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-highlight-backdrop.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-highlight-backdrop.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:56] - [ARCH]
What: Extracted `ChatInput` attachment chip removal callbacks into a focused hook.
Why: Phase 3-B is reducing inline composer shell mutation callbacks while preserving attachment and reference chip behavior.
Impact: No behavior changed. Added hook coverage for artifact chip removal, matching artifact/conversation reference cleanup, and reference-only removal by id/kind. `ChatInput.tsx` is now 1026 LOC; the extracted hook is 43 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. The only style scan hit remains the moved transparent overlay in `chat-input-highlight-backdrop.tsx`.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-attachment-removal.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-attachment-removal.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 08:59] - [ARCH]
What: Extracted `ChatInput` @-mention menu portal action callbacks into a focused hook.
Why: Phase 3-B is reducing inline menu mutation callbacks inside the oversized Studio chat composer while preserving @ menu navigation behavior.
Impact: No behavior changed. Added hook coverage for cross-campaign reset, tab/highlight reset, artifact collapse/show-more updaters, and media collapse/show-more updaters. `ChatInput.tsx` is now 1024 LOC; the extracted hook is 75 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. The only style scan hit remains the moved transparent overlay in `chat-input-highlight-backdrop.tsx`.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-at-menu-actions.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-at-menu-actions.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 09:04] - [ARCH]
What: Extracted `ChatInput` context meter data assembly into a focused hook.
Why: Phase 3-B is reducing inline context-meter orchestration inside the oversized Studio chat composer while preserving context estimate behavior.
Impact: No behavior changed. Added hook coverage for context-window fallback order, live estimate payload construction, attachment/artifact/reference/pasted-block mapping, and baseline fallback when the live estimate is unavailable. `ChatInput.tsx` is now 994 LOC; the extracted hook is 73 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. The only style scan hit remains the moved transparent overlay in `chat-input-highlight-backdrop.tsx`.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-context-meter-data.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-context-meter-data.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 09:11] - [ARCH]
What: Extracted `ChatInput` paste handling into a focused hook.
Why: Phase 3-B is reducing inline composer event handling inside the oversized Studio chat composer while preserving image paste and pasted-text behavior.
Impact: No behavior changed. Added hook coverage for image paste upload precedence, large pasted-text block capture, normal paste passthrough, and disabled/recording no-op behavior. `ChatInput.tsx` is now 987 LOC; the extracted hook is 37 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. The only style scan hit remains the moved transparent overlay in `chat-input-highlight-backdrop.tsx`.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-paste.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-paste.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 09:15] - [ARCH]
What: Extracted `ChatInput` model-picker footer prop assembly into a focused hook.
Why: Phase 3-B is reducing inline footer prop orchestration inside the oversized Studio chat composer while preserving model picker behavior.
Impact: No behavior changed. Added hook coverage for editable model lookup and select-before-position edit-panel behavior. `ChatInput.tsx` is now 978 LOC; the extracted hook is 42 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. Style scan hits are the known dynamic model-picker positioning style and moved transparent overlay.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-model-picker-view.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-picker-props.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-picker-props.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 09:28] - [FIX]
What: Standardized file-aware agent/tool actions on `asset_ref` while preserving existing legacy fields.
Why: Agents were still forced to guess between local paths, signed URLs, Drive URLs, and media asset ids, which can route connected files into the wrong tool path.
Impact: `asset_ref`/`asset_refs` now normalize into existing handler fields for document reading, image/video analysis, media processing, skill asset upload, form/funnel/presentation attachment, and image generation/editing. OpenClaw `read`/`write`/`edit` now reject URL-like paths before treating them as local workspace files. TDD tests were added first; focused tests, full Agent API artifacts-services smoke, Agent Sync tests, Agent Policy tests, OpenClaw path e2e tests, and broader OpenClaw agent smoke pass. The first broad OpenClaw smoke failed under network-restricted sandbox on existing `web_fetch` DNS tests and passed when rerun with network access.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-action-data-normalizer.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-data-normalizer.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/openclaw/src/agents/pi-tools.read.ts`, `apps/openclaw/src/agents/pi-tools.workspace-paths.e2e.test.ts`, `packages/agent-policy/src/mcp-catalog.ts`, `documentation/utilities/asset-ref.md`, `documentation/features/document-intelligence.md`, `documentation/utilities/README.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-22 09:38] - [FIX]
What: Added the first structured Agent Tool Error Contract fields to artifact/backend tool failures.
Why: Raw tool error strings let agents over-explain internal failures as platform problems and retry without knowing whether the failure was reliable, correctable, or terminal.
Impact: Artifact error envelopes now include stable error codes, reliability, effect state, retry policy, correction/fallback guidance, agent diagnosis/instruction, user explanation, forbidden user framing, and observability metadata while preserving legacy `error_class`, `retryable`, `agent_guidance`, and `user_hint`. Artifact executor preflight failures now use the contract instead of raw `{ success:false, error }` strings. The Vibey backend adapter preserves the new fields in tool output and no longer tells agents to expose backend/platform wording for unreachable transport failures. Focused artifact tests, standalone plugin TypeScript check, LOC checks, stale changelog scan, and `git diff --check` pass.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-error-classifier.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-execution.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-error-classifier.tdd.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.dispatch.test.ts`, `docker/tools/vibey-backend/index.ts`, `.docs/plans/agent-tool-error-contract.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 09:45] - [DOCS]
What: Expanded the Agent Tool Error Contract plan with a boundary inventory and shared-home decision, and removed generated protocol wording that framed repeated schema failures as platform errors.
Why: The rollout needs a real map of every agent-facing error surface before standardizing all tool failures, and generated agent protocols should reinforce "tool error" framing instead of platform-blame language.
Impact: The plan now covers artifact/backend actions, OpenClaw tool adapter errors, backend transport failures, MCP, Composio/integration runtime, OpenClaw last-tool-error state, stream UI/reporting, sanitizers, and generated agent protocols. It also records `packages/api-shared/src/types/agent-tool-error-contract.ts` as the backend/API contract home and calls out that OpenClaw should first map its native `PlatformFailureEnvelope` locally because it does not depend on `@vibey/api-shared`. Focused Agent Sync and artifact tests, LOC checks, stale changelog scan, and `git diff --check` pass.
Files: `.docs/plans/agent-tool-error-contract.md`, `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.ts`, `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.test.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 09:58] - [DOCS]
What: Updated the Viralish carousel incident report to mark signed/media URL handling as closed by the `asset_ref` action layer.
Why: The previous Bug 4 wording implied saving uploaded or connected user media into the agent local workspace, which is not the intended Vibey architecture.
Impact: Bug 3 and Bug 4 now point to the DB/storage-backed `asset_ref` contract and OpenClaw URL-path guard. The next open bug in the report is Bug 5, media processing contract validation.
Files: `.docs/reports/viralish-carousel-incident-bugs-2026-06-21.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 10:08] - [FIX]
What: Added Space item metadata support to agent-created Space documents.
Why: `save_document`, DOCX, and PDF document creation were creating Space Docs copies but dropping task-style fields such as category, due dates, and custom Space fields.
Impact: Space document creation now validates and persists supported Space item fields through the existing task schema helper, while reserved document metadata remains protected. `update_document` can also update linked Space Doc fields without storing those fields on `conversation_documents`. Focused helper, document sync, schema, and file-service tests passed; targeted ESLint passed. Full agent-api typecheck is blocked by unrelated existing `chat.service.ts` `recordTimingSpan` errors.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-space-item-field-contract.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-space-item-field-payload.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-space-scope.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-document-space-docs.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-documents.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-docx.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-pdf.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-helper-data-access.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-documents.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 10:16] - [FIX]
What: Fixed the six public widget chat latency gaps found in the Brian MDM/25K accelerator analysis.
Why: Public widget sends were still paying avoidable shared-runtime routing, duplicate readiness, full Brain retrieval, and unmeasured prompt/context setup costs, making simple messages like "Hi" or "How do you work?" feel slow.
Impact: Shared Railway public widgets now route to trusted Railway runtime URLs without Fly pin headers, widget open/focus can prewarm stable chat context, public send no longer repeats controller-level runtime readiness, low-context public prompts use fast scoped agent context, Brain retrieval is limited to policy-allowed families, and assistant metadata/terminal stream payloads include durable `timing_spans`. Focused Agent API, web, and Worker tests passed; Agent API, web, and Worker TypeScript checks passed; `git diff --check` passed. No builds were run.
Files: `workers/apps-proxy/src/index.ts`, `workers/apps-proxy/src/index.test.ts`, `apps/agent-api/src/modules/public-agent/controllers/public-chat.controller.ts`, `apps/agent-api/src/modules/public-agent/public-chat.controller.test.ts`, `apps/agent-api/src/modules/brain/services/brain-context.service.ts`, `apps/agent-api/src/modules/brain/services/brain-context.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`, `apps/agent-api/src/modules/chat/services/chat-progressive-stream.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-completion.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-gateway-preparation.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-session.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-streaming-state.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-terminal.service.ts`, `apps/web/src/features/public-agent/services/public-agent.service.ts`, `apps/web/src/features/public-agent/hooks/usePublicAgentChat.ts`, `apps/web/src/features/public-agent/containers/PublicAgentContainer.tsx`, `apps/web/src/features/public-agent/containers/EmbeddedMessagesView.tsx`, `.docs/plans/shared-railway-agent-runtime-pilot-2026-06-08.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 10:21] - [FIX]
What: Closed the current model-visible agent tool error boundaries with the structured tool error contract.
Why: A partial rollout would leave agents able to expose internal/platform blame or repeat bad tool calls from uncovered error-shaped results.
Impact: Artifact actions now normalize every failed handler result and preserve structured leaf contracts through stream and non-stream controller paths. `vibey_backend` local validation and transport failures now preserve the contract in tool `details`. OpenClaw now classifies thrown and returned error-shaped tool results, HTTP `/tools/invoke` failures include the contract, fallback payloads use contract user explanations, and chat tool-end events prefer the contract user-safe sentence. Focused Agent API tests, OpenClaw typecheck, OpenClaw adapter/e2e tests, HTTP invoke test, standalone plugin TypeScript check, LOC checks, and contract wording scans passed.
Files: `packages/api-shared/src/types/agent-tool-error-contract.ts`, `packages/api-shared/src/index.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-error-classifier.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-execution.service.ts`, `apps/agent-api/src/modules/artifacts/controllers/artifacts.controller.ts`, `apps/agent-api/src/modules/artifacts/artifacts.controller.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.dispatch.test.ts`, `apps/agent-api/src/modules/chat/services/openclaw-tool-events.ts`, `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.test.ts`, `apps/openclaw/src/agents/platform-failure.ts`, `apps/openclaw/src/agents/pi-tool-definition-adapter.ts`, `apps/openclaw/src/agents/pi-tool-definition-adapter.test.ts`, `apps/openclaw/src/agents/pi-embedded-subscribe.tools.ts`, `apps/openclaw/src/agents/pi-embedded-subscribe.handlers.tools.ts`, `apps/openclaw/src/agents/pi-embedded-runner/run/payloads.ts`, `apps/openclaw/src/agents/pi-embedded-runner/run/payloads.e2e.test.ts`, `apps/openclaw/src/gateway/tools-invoke-http.ts`, `apps/openclaw/src/gateway/tools-invoke-http.test.ts`, `docker/tools/vibey-backend/index.ts`, `.docs/plans/agent-tool-error-contract.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 10:31] - [DOCS]
What: Added workflow circuit breaker research to the Agent Tool Error Contract plan.
Why: The per-call tool error contract can tell an agent what one failure means, but it does not by itself stop adjacent tool-call loops across the same user goal.
Impact: The plan now defines cross-call breaker inputs, workflow classes, states, opening rules, open-state instructions, user-facing fallback wording, reset rules, implementation boundary, and definition-of-done tests before implementation.
Files: `.docs/plans/agent-tool-error-contract.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 10:37] - [DOCS]
What: Tightened workflow circuit breaker research around verified recovery options instead of open-ended fallbacks.
Why: Unbounded fallback language can let agents continue an adjacent workaround loop after the breaker opens.
Impact: The plan now defines the breaker as a tool-call gate, adds a `verified_recovery_options` shape with no-tool defaults and one bounded tool recovery case, updates the presentation example, and requires tests that prove blocked workflows cannot turn into fallback chains.
Files: `.docs/plans/agent-tool-error-contract.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 10:52] - [DOCS]
What: Added the implementation-ready workflow circuit breaker plan to the Agent Tool Error Contract research.
Why: The cross-call breaker needs a complete file-level design before implementation so every model-visible tool route, direct HTTP invoke path, and documented Vibey action is covered without leaving UX gaps.
Impact: The plan now specifies the OpenClaw modules to add, the execution chokepoints to wire, workflow-class coverage, state keys, transition rules, the synthetic `WORKFLOW_CIRCUIT_OPEN` contract, and the required test matrix for same-error loops, adjacent-tool loops, client tools, HTTP invoke, payload wording, and Vibey action catalog coverage.
Files: `.docs/plans/agent-tool-error-contract.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:02] - [ARCH]
What: Extracted `ChatInput` plus-menu footer prop assembly into a focused hook.
Why: Phase 3-B is reducing inline footer prop orchestration inside the oversized Studio chat composer while preserving plus-menu behavior.
Impact: No behavior changed. Added hook coverage for portal-target derivation, submenu anchor registration, and async plus-menu action delegation. `ChatInput.tsx` remains 978 LOC; the extracted hook is 80 LOC. Focused hook tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. Style scan hits are the known dynamic plus-menu positioning styles and moved transparent overlay.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-portal.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-menu-props.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-menu-props.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:09] - [ARCH]
What: Composed `ChatInput` plus-menu state, access state, cloud attach, and plus-menu props into one focused controller hook.
Why: Phase 3-B is reducing inline plus-menu orchestration inside the oversized Studio chat composer while preserving the dependency between close handling, cloud pickers, and portal props.
Impact: No behavior changed. Added controller coverage for plus-menu/access/cloud/portal wiring. `ChatInput.tsx` is now 909 LOC; the extracted controller is 130 LOC. Focused controller tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. Style scan hits remain the known dynamic plus-menu positioning styles and moved transparent overlay.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-controller.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-controller.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:20] - [ARCH]
What: Composed `ChatInput` model option, menu, preference, and picker-prop wiring into one focused controller hook.
Why: Phase 3-B is reducing inline model orchestration inside the oversized Studio chat composer while avoiding new cross-feature imports from extracted files.
Impact: No behavior changed. Added controller coverage for model option loading, preference inputs, workspace model settings delegation, and picker props. `ChatInput.tsx` is now 832 LOC; the extracted controller is 140 LOC. Focused controller tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. Style scan hits remain known dynamic menu positioning styles and moved transparent overlay.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-controller.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-controller.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:25] - [ARCH]
What: Composed `ChatInput` @-mention task mapping, data, layout, and action wiring into one focused controller hook.
Why: Phase 3-B is reducing inline @-mention orchestration inside the oversized Studio chat composer while preserving menu selection and keyboard contracts.
Impact: No behavior changed. Added controller coverage for Space task mention mapping and data/layout/action hook wiring. `ChatInput.tsx` is now 786 LOC; the extracted controller is 143 LOC. Focused controller tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. Style scan hits remain known dynamic menu positioning styles and moved transparent overlay.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-at-mention-controller.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-at-mention-controller.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:28] - [ARCH]
What: Composed `ChatInput` context meter and context popover wiring into one focused controller hook.
Why: Phase 3-B is reducing inline context orchestration inside the oversized Studio chat composer while preserving idle/recording text selection and footer popover behavior.
Impact: No behavior changed. Added controller coverage for idle-vs-recording context text and breakdown-panel enablement. `ChatInput.tsx` is now 782 LOC; the extracted controller is 61 LOC. Focused controller tests, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. Style scan hits remain known dynamic menu positioning styles and moved transparent overlay.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-context-controller.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-context-controller.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:44] - [ARCH]
What: Extracted the `ChatInput` presentational render tree into a focused shell component.
Why: Phase 3-B is reducing the oversized Studio chat composer while preserving state/controller ownership and avoiding new cross-feature imports.
Impact: No behavior changed. Added shell coverage for normal/recording footer branches, drag-event delegation, modal rendering, attachment accept pass-through, wrapper overrides, and drag-overlay rendering. `ChatInput.tsx` is now 759 LOC; `chat-input-shell.tsx` is 109 LOC. Focused shell test, the full ChatInput helper suite, focused ESLint, full web typecheck, LOC/style scans, stale changelog scan, branch check on `develop`, and `git diff --check` pass. Style scan hits remain known dynamic menu positioning styles and moved transparent overlay.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-shell.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-shell.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:52] - [ARCH]
What: Finished the `ChatInput.tsx` hard LOC target by extracting the public prop contract and grouping controller hook outputs.
Why: Phase 3-B needed the Studio chat composer under the 600 LOC cap without changing send, menu, model, context, or upload behavior.
Impact: No behavior changed. `ChatInput.tsx` is now 596 LOC; `chat-input.types.ts` is 81 LOC. Full ChatInput helper suite passed after one rerun for a teardown-time Vitest window cleanup flake, focused ESLint passed, full web typecheck passed, LOC/style scans passed with only known dynamic style debt, stale changelog scan was empty, branch check was `develop`, and `git diff --check` passed.
Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input.types.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:07] - [FEATURE]
What: Added V1 post-action verification for artifact action success paths.
Why: Artifact handlers could previously return success without proving the created, updated, delivered, or external result was technically reachable through the expected path.
Impact: Successful write/output artifact actions now pass through a central V1 proof layer before session success is recorded. The verifier classifies every action, skips read/status-only actions, checks DB read-back, asset refs, URL access, validation results, or provider acknowledgements, and returns `ARTIFACT_DELIVERY_FAILED` with `succeeded_delivery_failed` when proof fails after handler success. Full artifacts service smoke passed: 58 files / 549 tests.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.config.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-execution.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.dispatch.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.rbac.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.rbac.integrations-media.test.ts`, `.docs/plans/agent-tool-error-contract.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:10] - [ARCH]
What: Standardized the PromptMode action schema/preflight path with exhaustive schema coverage, preflight coverage classification, action-specific preflight validators for media/video/integration/MCP calls, execution wiring before handler dispatch, plugin/policy/MCP catalog drift tests, docs, and AGENTS guardrails.
Why: PromptMode actions were able to pass through without hard validation when missing from `ACTION_SCHEMAS`, causing agents to discover malformed payloads only after runtime/provider work.
Impact: Every backend `VALID_ACTIONS` entry now has a schema and preflight classification; malformed `process_media`, `analyze_video`, `use_integration`, and `use_mcp_tool` calls fail before side effects with structured `failed_before_effect` errors; `describe_action` exposes preflight guidance; backend plugin, agent-policy, and MCP catalog action drift are test-enforced.
Files: AGENTS.md, apps/agent-api/src/modules/artifacts/services/artifact-action-additional-schemas.ts, apps/agent-api/src/modules/artifacts/services/artifact-action-preflight.ts, apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts, apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts, apps/agent-api/src/modules/artifacts/services/artifact-action-execution.service.ts, apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.service.ts, apps/agent-api/src/modules/artifacts/services/artifacts.service.ts, apps/agent-api/src/modules/artifacts/services/artifacts.service.dispatch.test.ts, apps/agent-api/src/modules/shared/vibey-backend-plugin.test.ts, docker/tools/vibey-backend/index.ts, packages/agent-policy/src/actions.ts, packages/agent-policy/src/registry.ts, packages/agent-policy/src/action-contracts.ts, scripts/arch/loc-allowlist.json, documentation/features/integration-connections.md, .docs/plans/agent-tool-error-contract.md, .docs/architecture/brain-tools-map.md, .docs/plans/agent-follow-up-work.md

## [2026-06-22 11:28] - [FEATURE]
What: Implemented the OpenClaw workflow circuit breaker for cross-call tool failure loops.
Why: The per-call tool error contract tells the agent what one failure means, but it did not stop repeated same-payload or adjacent workflow-class retries after non-recoverable failures.
Impact: Tool execution now classifies calls by workflow class, fingerprints redacted payloads, records failure state per session/agent/workflow, blocks repeated non-retryable or over-budget workflow attempts with `WORKFLOW_CIRCUIT_OPEN`, returns verified recovery options instead of open-ended fallback instructions, and moves open circuits to one half-open attempt on a real user turn. The guard is wired through model tools, delegated client tools, compaction tool setup, direct HTTP `/tools/invoke`, user-facing payload wording, and tool error category inference. Focused OpenClaw classifier, breaker, adapter, payload, split-tool, runner-import, and gateway tests passed. `pnpm --dir apps/openclaw tsgo:test` remains blocked by unrelated existing test typing errors in `extensions/bluebubbles`, web, wizard, and other broad suites.
Files: `apps/openclaw/src/agents/workflow-circuit-classifier.ts`, `apps/openclaw/src/agents/workflow-circuit-breaker.ts`, `apps/openclaw/src/agents/workflow-circuit-classifier.test.ts`, `apps/openclaw/src/agents/workflow-circuit-breaker.test.ts`, `apps/openclaw/src/agents/pi-tool-definition-adapter.ts`, `apps/openclaw/src/agents/pi-tool-definition-adapter.test.ts`, `apps/openclaw/src/agents/pi-embedded-runner/tool-split.ts`, `apps/openclaw/src/agents/pi-embedded-runner/run/attempt.ts`, `apps/openclaw/src/agents/pi-embedded-runner/compact.ts`, `apps/openclaw/src/agents/pi-embedded-runner/run/payloads.ts`, `apps/openclaw/src/agents/pi-embedded-runner/run/payloads.e2e.test.ts`, `apps/openclaw/src/agents/pi-embedded-runner.splitsdktools.e2e.test.ts`, `apps/openclaw/src/gateway/tools-invoke-http.ts`, `apps/openclaw/src/gateway/tools-invoke-http.test.ts`, `apps/agent-api/src/modules/chat/services/openclaw-tool-events.ts`, `.docs/plans/agent-tool-error-contract.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:40] - [DOCS]
What: Added future-tool requirements for the agent tool error contract and workflow circuit breaker to the repo operating protocol.
Why: New agent-visible tools or transports should inherit the structured error contract and circuit breaker instead of reintroducing raw platform/internal errors or retry loops.
Impact: Future tool work now has explicit AGENTS guidance to route through existing chokepoints, preserve structured contract fields, map workflow classes, record breaker state, and add regressions for thrown, returned, transport, same-payload, corrected-retry, and adjacent-workflow failures.
Files: `AGENTS.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:44] - [DOCS]
What: Added a PromptMode action legacy audit to classify the 374 backend actions before continuing broad preflight work.
Why: Deep preflight should target the canonical action set, not blindly harden old, legacy, or low-evidence actions that may no longer need to be agent-facing.
Impact: The audit separates public MCP actions, static product references, tested internal actions, legacy-review actions, and no-static-reference removal candidates. It identifies 29 first-review actions and recommends telemetry-backed deprecation before removal.
Files: `.docs/plans/promptmode-action-legacy-audit-2026-06-22.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 11:56] - [DOCS]
What: Added the PromptMode action family map for the full 374-action backend surface.
Why: The action surface needs a readable product map before continuing preflight work, especially now that Projects/Code Runtime and Supabase are confirmed on hold while every other family remains needed.
Impact: Documentation now shows each action family, count, status, plain-language purpose, full action list, and maintenance rules. It marks 350 actions as keep/needed and 24 actions as on hold across Projects/Code Runtime and Supabase.
Files: `.docs/.knowledge/promptmode-action-family-map.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:11] - [ARCH]
What: Extracted the website settings slice from the oversized Studio `SettingsTab.tsx` component.
Why: Phase 3-B is decomposing hard frontend LOC targets with behavior-lock coverage before each behavior-neutral move.
Impact: No behavior changed. Added focused coverage for website layout editing and save payloads, moved website image/nav/layout UI into focused files, introduced a shared theme lookup boundary, and reduced `SettingsTab.tsx` from 3490 to 2835 LOC. Focused website settings test, clean-subset ESLint, full web typecheck, LOC/style scans for the extracted files, stale changelog scan, branch check on `develop`, and `git diff --check` passed. Parent `SettingsTab.tsx` remains a Phase 3-B hard target.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/website-settings-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/website-brand-image-card.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/website-nav-style-dropdown.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/website-settings.types.ts`, `apps/web/src/features/studio/components/preview/SettingsTab/website-settings-section.test.tsx`, `apps/web/src/lib/themes/themes-api.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:19] - [ARCH]
What: Extracted the funnel settings shell from the oversized Studio `SettingsTab.tsx` component.
Why: Phase 3-B is continuing the test-first decomposition of the remaining Settings tab render sections.
Impact: No behavior changed. Added focused coverage for active funnel rendering, empty state, edit-name flow, saving indicator, arrow-key navigation callbacks, and detail-section prop delegation. `SettingsTab.tsx` is now 2708 LOC, and the extracted funnel component/test are 202 LOC and 208 LOC. Focused funnel settings test, focused ESLint, full web typecheck, and LOC/style scans passed.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/funnel-settings-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/funnel-settings-section.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:24] - [ARCH]
What: Extracted the Settings tab navigation/sidebar into a focused component.
Why: Phase 3-B is reducing the oversized Settings tab while cleaning local raw-token UI classes in extracted boundaries.
Impact: No behavior changed. Added focused coverage for desktop nav entries, conditional Presentation/Website visibility, and theme subtab callbacks. `SettingsTab.tsx` is now 2591 LOC, and the extracted navigation component/test are 172 LOC and 59 LOC. Focused nav test, focused ESLint, full web typecheck, and LOC/style scans passed.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/settings-tab-navigation.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/settings-tab-navigation.test.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/settings-tab.types.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:17] - [FEATURE]
What: Added presentation HTML bundle pre-save validation and presentation-specific post-action verification/repair feedback.
Why: Agents could save presentation bundles that technically persisted but behaved like responsive web pages, so users could still see broken or inconsistent slide rendering after the agent said the deck was done.
Impact: `create_presentation`/`update_presentation` now reject unrenderable full bundles before DB writes, file-level presentation writes reject malformed source before upsert, and successful presentation mutations now run a saved-source contract check for fixed 1280x720 stage, deck wrapper, theme-native marker, slide anchors, reflow-prone CSS, and missing local references. Repairable post-save failures return `ARTIFACT_PRESENTATION_CONTRACT_REPAIR_REQUIRED` with `partial_effect`, exact issue details, and file-edit tool guidance so the agent fixes the saved draft before finalizing. Focused presentation verifier/preflight tests passed, dispatcher regression passed, and full artifact services smoke passed: 59 files / 556 tests.
Files: `apps/agent-api/src/modules/artifacts/utils/presentation-html-contract.util.ts`, `apps/agent-api/src/modules/artifacts/utils/presentation-html-contract-references.util.ts`, `apps/agent-api/src/modules/artifacts/utils/presentation-html-contract.util.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentation-action-preflight.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentation-post-action-verification.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentation-post-action-verification.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-post-action-error-results.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-preflight.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.config.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentations.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentation-bundle.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-presentations.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-post-action-verification.service.test.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:32] - [FEATURE]
What: Added Mission Worker Railway autoscaling for queued chat and applied the existing production chat recovery migration.
Why: Shared Railway chat needs a controlled horizontal scaling loop before Fly fallback can be safely retired, and production was missing the checkpoint/status schema used by queued chat recovery.
Impact: Mission Worker can now watch BullMQ chat queue pressure, coordinate one scaler across replicas with Redis locking, and update Railway `VibeyV2` replicas through Railway GraphQL between the configured min/max. The default policy scales up after two 10-second backlog samples and scales down after 15 idle minutes. Production Supabase now has `agent_runtime_run_checkpoints` and the terminal status constraint includes `failed_recoverable` and `continued`. Focused Agent Runtime tests, Mission Worker typecheck, focused ESLint, Prettier check, and `git diff --check` passed.
Files: `apps/mission-worker/src/config/configuration.ts`, `apps/mission-worker/src/modules/agent-runtime/agent-runtime.module.ts`, `apps/mission-worker/src/modules/agent-runtime/autoscaler/agent-runtime-autoscaler.types.ts`, `apps/mission-worker/src/modules/agent-runtime/autoscaler/agent-runtime-autoscaler-policy.ts`, `apps/mission-worker/src/modules/agent-runtime/autoscaler/agent-runtime-autoscaler.service.ts`, `apps/mission-worker/src/modules/agent-runtime/autoscaler/railway-replica-client.ts`, `apps/mission-worker/src/modules/agent-runtime/autoscaler/agent-runtime-autoscaler-policy.test.ts`, `apps/mission-worker/src/modules/agent-runtime/autoscaler/agent-runtime-autoscaler.service.test.ts`, `apps/mission-worker/src/modules/agent-runtime/autoscaler/railway-replica-client.test.ts`, `scripts/smoke/railway-chat-autoscale-smoke.ts`, `package.json`, `documentation/features/chat-stream-recovery.md`, `supabase/migrations/20260619123000_chat_run_checkpoints_and_terminal_statuses.sql`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:34] - [ARCH]
What: Extracted the Studio Settings agent section into a focused component.
Why: Phase 3-B is continuing the test-first decomposition of the oversized `SettingsTab.tsx` component without changing campaign settings behavior.
Impact: No behavior changed. Added focused coverage for media generation toggle delegation, model strategy selection, saving indicators, and campaign integrations prop forwarding. `SettingsTab.tsx` is now 2525 LOC, and the extracted agent component/test are 121 LOC and 103 LOC. The moved raw `ring-white/10` class was removed from the extracted boundary. Focused agent test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, stale changelog scan, and branch check on `develop` passed. Parent lint still fails on the already-tracked restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/agent-settings-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/agent-settings-section.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:39] - [ARCH]
What: Extracted the Studio Settings danger/delete section into a focused component.
Why: Phase 3-B is reducing `SettingsTab.tsx` through small behavior-locked sections before taking the larger presentation and ads surfaces.
Impact: No behavior changed. Added focused coverage for delete dialog open/reset behavior, confirmation gating, cancel delegation, and confirmed delete callback delegation. `SettingsTab.tsx` is now 2463 LOC, and the extracted danger component/test are 105 LOC and 68 LOC. The moved raw destructive border, rounded/spacing, and icon sizing classes were replaced with existing token utilities. Focused danger test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, and stale changelog scan passed.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/danger-settings-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/danger-settings-section.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:45] - [ARCH]
What: Extracted the Studio Settings presentation header into a focused component.
Why: Phase 3-B is breaking down the remaining presentation settings surface before tackling the larger domain and pixel controls.
Impact: No behavior changed. Added focused coverage for presentation display/edit-name branches, status labels, saving indicator, previous/next navigation callbacks, and dot selection. `SettingsTab.tsx` is now 2388 LOC, and the extracted header component/test are 131 LOC and 110 LOC. The moved raw presentation name input ring styling was replaced with token utility classes. Focused header test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, and stale changelog scan passed.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/presentation-settings-header.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/presentation-settings-header.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:52] - [ARCH]
What: Extracted the Studio Settings presentation custom-domain section into a focused component.
Why: Phase 3-B is reducing the remaining presentation settings surface while keeping domain connection behavior locked.
Impact: No behavior changed. Added focused coverage for domain loading/empty states, dropdown domain selection, add-domain delegation, verified-domain connect payloads, loading toggles, and local presentation updater behavior. `SettingsTab.tsx` is now 2147 LOC, and the extracted domain component/test are 293 LOC and 128 LOC. Extracted-file ESLint, full web typecheck, full extracted SettingsTab test set, LOC scan, stale changelog scan, and branch check on `develop` passed. Style scan has one known moved fixed-position portal `style={{ top, left, width }}` hit.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/presentation-domain-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/presentation-domain-section.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 10:16] - [FIX]
What: Fixed the six public widget chat latency gaps found in the Brian MDM/25K accelerator analysis.
Why: Public widget sends were still paying avoidable shared-runtime routing, duplicate readiness, full Brain retrieval, and unmeasured prompt/context setup costs, making simple messages like "Hi" or "How do you work?" feel slow.
Impact: Shared Railway public widgets now route to trusted Railway runtime URLs without Fly pin headers, widget open/focus can prewarm stable chat context, public send no longer repeats controller-level runtime readiness, low-context public prompts use fast scoped agent context, Brain retrieval is limited to policy-allowed families, assistant metadata/terminal stream payloads include durable `timing_spans`, and Agent API tests/typecheck now resolve source workspace packages without relying on ignored build output. Focused Agent API, web, and Worker tests passed; Agent API, web, and Worker TypeScript checks passed; `git diff --check` passed. No builds were run.
Files: `workers/apps-proxy/src/index.ts`, `workers/apps-proxy/src/index.test.ts`, `apps/agent-api/tsconfig.json`, `apps/agent-api/vitest.config.ts`, `apps/agent-api/src/modules/public-agent/controllers/public-chat.controller.ts`, `apps/agent-api/src/modules/public-agent/public-chat.controller.test.ts`, `apps/agent-api/src/modules/brain/services/brain-context.service.ts`, `apps/agent-api/src/modules/brain/services/brain-context.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`, `apps/agent-api/src/modules/chat/services/chat-progressive-stream.service.ts`, `apps/web/src/features/public-agent/services/public-agent.service.ts`, `apps/web/src/features/public-agent/hooks/usePublicAgentChat.ts`, `apps/web/src/features/public-agent/containers/PublicAgentContainer.tsx`, `apps/web/src/features/public-agent/containers/EmbeddedMessagesView.tsx`, `.docs/plans/shared-railway-agent-runtime-pilot-2026-06-08.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:04] - [FIX]
What: Prevented empty model streams from completing as successful public widget turns and added public-agent error copy for no-answer SSE failures.
Why: After the widget speed deploy, a fast empty stream could leave the visitor with their message visible but no assistant answer.
Impact: The Agent API now retries one empty stream as before, then marks a second empty result as `empty_agent_response` so downstream SSE handlers classify it as `no_answer` instead of saving a blank success. Public widgets now map `no_answer` and related stream codes to clear retry messages. Focused Agent API and web tests passed; Agent API and web typechecks passed. No builds were run.
Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `apps/web/src/features/public-agent/hooks/usePublicAgentChat.ts`, `apps/web/src/features/public-agent/config/errors.config.ts`, `apps/web/src/features/public-agent/config/errors.config.test.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:28] - [FIX]
What: Fixed public widget turns where the assistant answer was generated and persisted but the live widget did not render it.
Why: Production traces and message rows for conversation `d5c92b2b-3486-42e8-b601-6a433b5e07a9` showed real assistant output, so the failure was in SSE delivery/render recovery rather than OpenClaw generation.
Impact: Public chat now tracks the response stream lifecycle from the response object instead of request `close`, avoids writing after the SSE response is closed, parses a final SSE event even without a trailing newline, and reloads persisted conversation messages if the live stream ends without rendered assistant text. Focused Agent API and web tests passed; Agent API and web typechecks passed. No builds were run.
Files: `apps/agent-api/src/modules/public-agent/controllers/public-chat.controller.ts`, `apps/agent-api/src/modules/public-agent/public-chat.controller.test.ts`, `apps/web/src/features/public-agent/services/public-agent.service.ts`, `apps/web/src/features/public-agent/hooks/usePublicAgentChat.ts`, `apps/web/src/features/public-agent/__tests__/public-agent-sse.test.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:48] - [FIX]
What: Removed the assistant "Fork chat" action from public agent widget surfaces and aligned public widget sends to the latest user message like Studio chat.
Why: Public embedded visitors cannot use authenticated Studio forking, and widget sends were still anchoring to the bottom instead of moving the new user turn to the start of the response area.
Impact: Public agent containers now disable assistant forking while Studio and other internal chat surfaces keep it by default. Public widgets share a scroll helper that anchors the latest user message and keeps enough bottom space for the answer/status area to render beneath it. Web typecheck passed; focused ESLint passed for the new hook and assistant action file. The broader touched-file lint command still reports pre-existing cross-feature import violations in shared chat files. No builds were run.
Files: `apps/web/src/features/public-agent/containers/EmbeddedMessagesView.tsx`, `apps/web/src/features/public-agent/containers/PublicAgentContainer.tsx`, `apps/web/src/features/public-agent/hooks/usePublicAgentMessageScroll.ts`, `apps/web/src/features/studio/components/MessageBubble.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/features/studio/components/message-bubble/MessageBubbleOrderedBlocks.tsx`, `apps/web/src/features/studio/components/message-bubble/message-bubble.types.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 12:57] - [ARCH]
What: Extracted the Studio Settings presentation branding toggle into a focused component.
Why: Phase 3-B is continuing behavior-locked decomposition of the oversized `SettingsTab.tsx` presentation settings surface.
Impact: No behavior changed. Added focused coverage for watermark copy, saving indicator rendering, paid-user toggle delegation, and free-user disabled behavior. `SettingsTab.tsx` is now 2129 LOC, and the extracted branding component/test are 43 LOC and 68 LOC. Focused branding test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, and stale changelog scan passed.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/presentation-branding-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/presentation-branding-section.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:05] - [ARCH]
What: Extracted the Studio Settings presentation Meta pixel/events section into a focused component.
Why: Phase 3-B is continuing behavior-locked decomposition of the oversized `SettingsTab.tsx` presentation settings surface.
Impact: No behavior changed. Added focused coverage for current pixel rendering, saving-disabled remove behavior, remove delegation, event dropdown updates, Meta-sourced pixel additions, and manual pasted pixel additions. `SettingsTab.tsx` is now 1906 LOC, and the extracted pixel/events component/test are 224 LOC and 180 LOC. Focused pixel/events test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, and stale changelog scan passed. Parent lint still fails on the existing restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/presentation-pixel-events-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/presentation-pixel-events-section.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:12] - [ARCH]
What: Extracted the Studio Settings ads Default Meta Assets section into a focused component.
Why: Phase 3-B is reducing the remaining oversized `SettingsTab.tsx` ads surface with behavior-locked slices.
Impact: No behavior changed. Added focused coverage for default profile creation, campaign config saving, Meta pixel loading after ad-account selection, default profile application to non-overridden ad campaigns, and overridden campaign skip behavior. `SettingsTab.tsx` is now 1659 LOC, and the extracted ads default-assets component/test are 295 LOC and 173 LOC. Focused ads default-assets test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, and stale changelog scan passed. Parent lint still fails on the existing restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/ads-default-meta-assets-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/ads-default-meta-assets-section.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:21] - [FIX]
What: Added a synchronous public widget send lock and persisted-answer recovery for failed SSE streams.
Why: Production data for conversation `f3e498fa-64ab-4059-84a4-d335403eff2a` showed one visible short prompt produced three durable user/assistant turns, and completed assistant rows still failed to render in the widget.
Impact: Public widget sends are now blocked inside `usePublicAgentChat` before async conversation setup can race, so duplicate click/touch/Enter events cannot launch parallel backend runs. If a stream errors after the backend already saved an assistant answer, the widget reloads persisted messages instead of staying blank. Focused public-agent tests passed, web typecheck passed, and the new test file linted cleanly. The changed hook still carries a pre-existing cross-feature import lint violation that is logged for shared chat boundary cleanup. No builds were run.
Files: `apps/web/src/features/public-agent/hooks/usePublicAgentChat.ts`, `apps/web/src/features/public-agent/hooks/usePublicAgentChat.test.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:20] - [ARCH]
What: Extracted the Studio Settings ads per-campaign override list into a focused component.
Why: Phase 3-B is reducing the remaining oversized `SettingsTab.tsx` ads surface with behavior-locked slices.
Impact: No behavior changed. Added focused coverage for turning off custom override mode, alternate profile selection, override ad-account Meta pixel loading, and create-pixel callback wiring. `SettingsTab.tsx` is now 1253 LOC, and the extracted override component/test are 399 LOC and 218 LOC. Focused override test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, and stale changelog scan passed. Parent lint still fails on the existing restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/ads-campaign-overrides-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/ads-campaign-overrides-section.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:27] - [ARCH]
What: Extracted Studio Settings Meta/ad asset cache state and fetch effects into a focused hook.
Why: Phase 3-B is reducing the remaining oversized `SettingsTab.tsx` state/effect surface after the ads JSX blocks were split.
Impact: No behavior changed. Added hook coverage for unique pixel option derivation, relevant-section Meta asset loading, and missing profile Instagram account loading. `SettingsTab.tsx` is now 1097 LOC, and the extracted hook/test are 230 LOC and 90 LOC. Focused hook test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, and stale changelog scan passed. Parent lint still fails on the existing restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/use-settings-tab-meta-assets.ts`, `apps/web/src/features/studio/components/preview/SettingsTab/use-settings-tab-meta-assets.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:34] - [ARCH]
What: Extracted Studio Settings funnel, presentation, and website edit-save controls into a focused hook.
Why: Phase 3-B is reducing the remaining oversized `SettingsTab.tsx` state/handler surface after the major settings sections were split.
Impact: No behavior changed. Added hook coverage for funnel name optimistic save, website layout persistence, and presentation branding rollback. `SettingsTab.tsx` is now 922 LOC, and the extracted entity controls hook/test are 272 LOC and 116 LOC. Focused hook test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, and stale changelog scan passed. Parent lint still fails on the existing restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/use-settings-tab-entity-controls.ts`, `apps/web/src/features/studio/components/preview/SettingsTab/use-settings-tab-entity-controls.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:41] - [ARCH]
What: Extracted Studio Settings presentation pixel save/add-flow controls into a focused hook.
Why: Phase 3-B is reducing the remaining oversized `SettingsTab.tsx` state/handler surface while keeping presentation pixel metadata saves behavior-locked.
Impact: No behavior changed. Added hook coverage for pixel metadata saves, active-presentation add-flow reset, and Meta event metadata saves. `SettingsTab.tsx` is now 859 LOC, and the extracted pixel controls hook/test are 103 LOC and 112 LOC. Focused hook test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, stale changelog scan, and branch check on `develop` passed. Parent lint still fails on the existing restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/use-presentation-pixel-controls.ts`, `apps/web/src/features/studio/components/preview/SettingsTab/use-presentation-pixel-controls.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:48] - [ARCH]
What: Extracted the Studio Settings presentation render shell into a focused component.
Why: Phase 3-B is reducing the remaining oversized `SettingsTab.tsx` render orchestration after its presentation child sections were split.
Impact: No behavior changed. Added shell coverage for active presentation rendering, previous/next callback delegation, keyboard arrow navigation, and empty presentation rendering. `SettingsTab.tsx` is now 807 LOC, and the extracted presentation shell/test are 171 LOC and 107 LOC. Focused shell test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, stale changelog scan, and branch check on `develop` passed. Parent lint still fails on the existing restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/presentation-settings-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/presentation-settings-section.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:52] - [ARCH]
What: Extracted Studio Settings agent/theme save controls into a focused hook.
Why: Phase 3-B is reducing the remaining oversized `SettingsTab.tsx` handler surface while keeping campaign config save behavior locked.
Impact: No behavior changed. Added hook coverage for media-generation optimistic saves, model strategy rollback on save failure, and theme update event dispatch. `SettingsTab.tsx` is now 731 LOC, and the extracted agent/theme hook/test are 123 LOC and 110 LOC. Focused hook test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, stale changelog scan, and branch check on `develop` passed. Parent lint still fails on the existing restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/use-settings-tab-agent-theme-controls.ts`, `apps/web/src/features/studio/components/preview/SettingsTab/use-settings-tab-agent-theme-controls.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:56] - [ARCH]
What: Extracted the Studio Settings ads render shell into a focused component.
Why: Phase 3-B is reducing the remaining oversized `SettingsTab.tsx` ads orchestration while keeping Settings-owned integration card wiring in the parent.
Impact: No behavior changed. Added shell coverage for disconnected Meta connection-card rendering, unavailable fallback rendering, and connected default/override section rendering. `SettingsTab.tsx` is now 699 LOC, and the extracted ads shell/test are 112 LOC and 71 LOC. Focused shell test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, stale changelog scan, and branch check on `develop` passed. Parent lint still fails on the existing restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/ads-settings-section.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/ads-settings-section.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:01] - [ARCH]
What: Extracted Studio Settings initial data hydration into a focused hook.
Why: Phase 3-B is reducing the remaining oversized `SettingsTab.tsx` loader surface and moving billing access through the shared lib boundary.
Impact: No behavior changed. Added hook coverage for successful campaign, funnel, presentation, ad, billing, and Meta hydration plus failure reset defaults. `SettingsTab.tsx` is now 654 LOC, and the extracted loader hook/test are 122 LOC and 137 LOC. Focused loader test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, stale changelog scan, and branch check on `develop` passed. Parent lint still fails on the existing restricted imports and max-lines debt.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/use-settings-tab-load-settings.ts`, `apps/web/src/features/studio/components/preview/SettingsTab/use-settings-tab-load-settings.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:11] - [ARCH]
What: Extracted Studio Settings domain state and dialog controller logic into a focused hook.
Why: Phase 3-B needed the remaining `SettingsTab.tsx` hard-file target under 600 LOC while keeping domain loading and selection behavior locked.
Impact: No behavior changed. Added hook coverage for domain loading, active presentation domain sync, add-domain selection/DNS dialog behavior, and DNS verification update merging. `SettingsTab.tsx` is now 591 LOC, and the extracted domain hook/test are 166 LOC and 116 LOC. Focused domain hook test, full extracted SettingsTab test set, extracted-file ESLint, full web typecheck, LOC/style scans, stale changelog scan, and branch check on `develop` passed. Parent lint still reports six restricted imports and the stricter 400-line max-lines rule.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/use-settings-tab-domain-controls.ts`, `apps/web/src/features/studio/components/preview/SettingsTab/use-settings-tab-domain-controls.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 15:13] - [FEATURE]
What: Added analyzed and formula-breakdown status icons with tooltips on social research cards.
Why: After analyzing a post or running formula breakdown, grid/list cards had no visual difference from untouched posts.
Impact: Research grid cards show ScanText (analyzed) and Zap (formula breakdown) icons on the footer right; list view shows the same icons on the thumbnail. Active enrichments render green; missing ones stay muted with explanatory tooltips.
Files: `apps/web/src/features/spaces/lib/social-research-enrichment.ts`, `apps/web/src/features/spaces/lib/social-research-enrichment.test.ts`, `apps/web/src/features/spaces/components/social-research/SocialResearchEnrichmentBadges.tsx`, `apps/web/src/features/spaces/components/instagram-research/ContentCard.tsx`, `apps/web/src/features/spaces/components/instagram-research/InstagramResearchList.tsx`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:18] - [STYLE]
What: Improved social post media placeholder button hover on the fixed dark creative canvas in light mode.
Why: `chip-glass-neutral` is tuned for light app surfaces and was nearly invisible on the dark LinkedIn mock placeholder.
Impact: Upload video/image and Media library buttons now use `chip-glass-on-dark-surface` with readable default state and a brighter glass hover lift on the dark placeholder.
Files: `apps/web/src/app/globals.css`, `apps/website/src/app/globals.css`, `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:03] - [FIX]
What: Fixed Spaces social post preview panel still clipping tall LinkedIn posts after the first scroll pass.
Why: The flex chain above `SocialPostPreview` lacked `min-h-0`/`flex-1`, so the slide-over grew to content height and ancestor `overflow-hidden` clipped the bottom instead of letting the inner preview body scroll.
Impact: The artifact preview panel now constrains height correctly; tall text-only LinkedIn posts scroll inside the right pane.
Files: `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 13:59] - [FIX]
What: Fixed LinkedIn social post preview scrolling in Spaces (and Studio slide-over) when posts are taller than the panel, including caption edit mode.
Why: The preview body used `flex-1` + `justify-center`, which clipped overflow and blocked scrolling; the LinkedIn caption textarea also capped height by newline count only.
Impact: Tall LinkedIn posts scroll fully in the artifact preview panel; clicking the caption to edit expands the textarea to full content and keeps the preview anchored from the top in edit mode.
Files: `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `.docs/logs/changelog2026-06-22.md`

Why: Production `/home` loads were logging `ReferenceError: document is not defined`, which matches React error `#419` from a failed Suspense server render.
Impact: The model picker now resolves a portal target only when `document` exists, and the closed picker has a server-render regression test. Focused Vitest coverage and the web typecheck passed. Touched files are below architecture limits at 273 LOC and 221 LOC; no stale changelog files needed pruning.
Files: `apps/web/src/features/studio/components/ChatInput/chat-input-model-picker-view.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-model-picker-view.test.tsx`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:18] - [FIX]
What: Fixed shared markdown/doc PDF exports clipping the final section.
Why: The html2pdf fallback measured source height before html2pdf inserted page-break padding, then passed that stale fixed height to html2canvas, which could crop the tail of long docs.
Impact: Spaces doc PDFs and other shared markdown PDF routes now let html2canvas measure the final post-pagebreak clone height. Added regression coverage for the shared exporter options; visual canvas-based PDF routes were audited separately and left unchanged.
Files: `apps/web/src/features/studio/lib/campaign-markdown-pdf-export.ts`, `apps/web/src/features/studio/lib/campaign-markdown-pdf-export.test.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:25] - [FIX]
What: Skip `fetchCompanyCortexStatus` in personal workspace; only call when `activeOrgId` is set.
Why: Company Cortex requires org context; unconditional fetch in brain nav/recurring rules caused 400 on `/api/proxy/brain/company/status` in personal mode.
Impact: No more 400 spam in personal workspace; company cortex still loads in org context.
Files: `apps/web/src/features/brain/hooks/use-brain-scope-nav-options.ts`, `apps/web/src/features/brain/services/recurring-rules.service.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:34] - [ARCH]
What: Extracted the final Studio Settings tab content shell into `settings-tab-content.tsx`.
Why: Phase 3-B needed `SettingsTab.tsx` under the 400-line frontend component limit while preserving existing section behavior.
Impact: No behavior changed. `SettingsTab.tsx` is now 346 LOC, the new content shell is 384 LOC, and focused SettingsTab coverage passes at 20 files / 48 tests. Full web typecheck also passes after exporting the existing public-agent conversation options type to clear a declaration naming error in already-dirty public-agent work.
Files: `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/settings-tab-content.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab/settings-tab-content.test.tsx`, `apps/web/src/features/public-agent/hooks/usePublicAgentConversationPreparation.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:46] - [ARCH]
What: Moved model strategy constants and display helpers into a shared web agent boundary.
Why: Phase 3-B needed Studio model strategy usage to stop importing Team constants while preserving Team and ChatInput behavior.
Impact: No behavior changed. Added shared model strategy tests, Team constants helper tests, and raw chat model settings parser coverage. Studio no longer imports `@/features/team/constants/team.constants`; `SettingsTab.tsx` now has five remaining restricted imports instead of six.
Files: `apps/web/src/lib/agents/model-strategies.ts`, `apps/web/src/lib/agents/model-strategies.test.ts`, `apps/web/src/lib/chat/chat-model-settings.ts`, `apps/web/src/lib/chat/chat-model-settings.test.ts`, `apps/web/src/features/team/constants/team.constants.ts`, `apps/web/src/features/team/constants/team.constants.test.ts`, `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/ComposerModelPicker.tsx`, `apps/web/src/features/studio/lib/composer-model-picker.ts`, `apps/web/src/features/studio/components/chat/chat-turn-change-divider.utils.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-model-settings.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-model-settings.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:33] - [FIX]
What: Made public widget chat prewarm reliable across frontend sends and backend stable-context resolution.
Why: Widget sends could race the best-effort prewarm, causing `stable_context` to rebuild during the user-visible request and keeping simple prompts around the previous 7-18s path.
Impact: New and existing public widget conversations now share one conversation/prewarm promise before Send, duplicate sends are blocked, persisted assistant recovery remains covered, and the backend send path joins completed or in-flight stable prewarm work with Redis-backed cache support and trace metadata for `cache_status`/store/reuse. Focused Agent API/web tests and both typechecks passed.
Files: `apps/agent-api/src/modules/chat/services/chat-prewarm-cache.service.ts`, `apps/agent-api/src/modules/chat/services/chat-prewarm-context.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-bootstrap.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-session.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-prewarm-cache.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`, `apps/agent-api/src/modules/public-agent/public-chat.controller.test.ts`, `apps/web/src/features/public-agent/hooks/usePublicAgentConversationPreparation.ts`, `apps/web/src/features/public-agent/hooks/usePublicAgentChat.ts`, `apps/web/src/features/public-agent/hooks/usePublicAgentChat.test.ts`, `apps/web/src/features/public-agent/containers/EmbeddedMessagesView.tsx`, `apps/web/src/features/public-agent/containers/PublicAgentContainer.tsx`, `apps/web/src/features/public-agent/components/common/AgentIntroCard.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:49] - [UTIL]
What: Added production freeze diagnostics for dashboard page loads.
Why: `/home` and `/team?agent=...` can freeze on production with normal 200 server logs, so the frontend needs lightweight client breadcrumbs that land in Vercel runtime logs.
Impact: Authenticated dashboard sessions now emit `[freeze_debug]` events for watched production routes, long tasks, main-thread stalls, client errors, route readiness, and key backend fetch start/end/error timings. Diagnostics are automatic on `/home`, `/team`, and `/spaces`, can be forced with `?freeze_debug=1`, and disabled for the session with `?freeze_debug=0`.
Files: `apps/web/src/app/api/freeze-debug/route.ts`, `apps/web/src/lib/debug/freeze-diagnostics.ts`, `apps/web/src/app/(dashboard)/providers.tsx`, `apps/web/src/lib/api/backend-client.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 14:54] - [ARCH]
What: Moved the Workspace Settings modal context into a shared web settings boundary.
Why: Phase 3-B needed Studio settings/model-picker surfaces to stop importing the Settings feature context directly.
Impact: No behavior changed. Added shared context coverage for open/focus/consume/close behavior and preserved the old Settings context path as a compatibility re-export. Studio `SettingsTab.tsx` now has four remaining restricted imports, and `ComposerModelPicker.tsx` now only has the existing 786-line max-lines blocker.
Files: `apps/web/src/lib/settings/workspace-settings-modal-context.tsx`, `apps/web/src/lib/settings/workspace-settings-modal-context.test.tsx`, `apps/web/src/features/settings/contexts/WorkspaceSettingsModalContext.tsx`, `apps/web/src/features/settings/containers/SettingsModalProvider.tsx`, `apps/web/src/features/settings/containers/WorkspaceSettingsModal.tsx`, `apps/web/src/features/studio/components/ComposerModelPicker.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 15:07] - [ARCH]
What: Split the Studio Composer model picker dropdown and portal panels into focused files.
Why: Phase 3-B needed `ComposerModelPicker.tsx` under the 400-line frontend component limit after the Settings/modal boundary cleanup.
Impact: No behavior changed. Added behavior-lock coverage for strategy selection, editable model settings preservation, and the Add Models settings handoff. `ComposerModelPicker.tsx` is now 395 LOC, and targeted blocker lint now only reports the four remaining `SettingsTab.tsx` Domains/Settings imports.
Files: `apps/web/src/features/studio/components/ComposerModelPicker.tsx`, `apps/web/src/features/studio/components/ComposerModelPicker.test.tsx`, `apps/web/src/features/studio/components/composer-model-picker-dropdown.tsx`, `apps/web/src/features/studio/components/composer-model-picker-panels.tsx`, `apps/web/src/features/studio/components/composer-model-picker.types.ts`, `apps/web/src/features/studio/components/use-composer-model-picker-positioning.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 15:16] - [ARCH]
What: Moved custom-domain dialogs, table, API client, types, and toast config into shared web Domains boundaries.
Why: Phase 3-B needed Studio Settings, Settings, and Spaces consumers to stop importing reusable Domains UI/data through the Domains feature.
Impact: No behavior changed. Added shared dialog behavior-lock coverage for adding a domain and rendering DNS records. Studio `SettingsTab.tsx` no longer imports Domains feature files, and targeted parent lint now reports only `IntegrationCard` and `useIntegrations` from Settings. Full web typecheck is currently blocked by unrelated public-agent test type drift around `adoptConversation`.
Files: `apps/web/src/components/domains/AddCustomDomainDialog.tsx`, `apps/web/src/components/domains/CustomDomainDnsDialog.tsx`, `apps/web/src/components/domains/DeleteCustomDomainDialog.tsx`, `apps/web/src/components/domains/CustomDomainsTable.tsx`, `apps/web/src/components/domains/custom-domain-dialogs.test.tsx`, `apps/web/src/lib/domains/custom-domains-api.ts`, `apps/web/src/lib/domains/domains.types.ts`, `apps/web/src/lib/domains/domains-toast-errors.config.ts`, `apps/web/src/features/domains/components/AddCustomDomainDialog.tsx`, `apps/web/src/features/domains/components/CustomDomainDnsDialog.tsx`, `apps/web/src/features/domains/components/DeleteCustomDomainDialog.tsx`, `apps/web/src/features/domains/components/CustomDomainsTable.tsx`, `apps/web/src/features/domains/services/custom-domains-api.ts`, `apps/web/src/features/domains/types/domains.types.ts`, `apps/web/src/features/domains/config/domains-toast-errors.config.ts`, `apps/web/src/features/settings/components/settings-content/DomainsPageContent.tsx`, `apps/web/src/features/spaces/components/customize/funnels-customize/FunnelSettingsSubView.tsx`, `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 15:29] - [ARCH]
What: Moved Studio Settings integration overview and Meta connect usage behind shared integration boundaries.
Why: Phase 3-B needed `SettingsTab.tsx` to stop importing Settings integration UI/data directly after Domains ownership was cleared.
Impact: No behavior changed for the scoped Studio flows. Added shared catalog/status tests and Meta connection-card tests, rewired Studio Settings and campaign integration sections to shared integration types/hooks, and removed the final Settings restricted imports from `SettingsTab.tsx`. Full web typecheck still stops on unrelated public-agent `adoptConversation` test drift.
Files: `apps/web/src/lib/integrations/integration-catalog.ts`, `apps/web/src/lib/integrations/integration-status-utils.ts`, `apps/web/src/lib/integrations/integrations.types.ts`, `apps/web/src/lib/integrations/use-campaign-integrations.ts`, `apps/web/src/lib/integrations/use-integration-overview.ts`, `apps/web/src/lib/integrations/meta-integrations-library-eligibility.ts`, `apps/web/src/lib/integrations/integration-boundary.test.ts`, `apps/web/src/components/integrations/MetaIntegrationConnectCard.tsx`, `apps/web/src/components/integrations/meta-integration-connect-card.test.tsx`, `apps/web/src/features/settings/components/settings-content/integrations.types.ts`, `apps/web/src/features/settings/components/settings-content/useCampaignIntegrations.ts`, `apps/web/src/features/settings/lib/meta-integrations-library-eligibility.ts`, `apps/web/src/features/studio/components/preview/SettingsTab.tsx`, `apps/web/src/features/studio/components/preview/CampaignIntegrationsSettingsSection.tsx`, `apps/web/src/features/team-2/components/teams/TeamAccessView.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 15:43] - [ARCH]
What: Moved Team-2 access policy/types/UI behind shared web agent boundaries.
Why: Phase 3-B needed `TeamAccessView.tsx` to stop importing AgentTeams and Team feature internals directly.
Impact: No behavior changed. Added TeamAccessView behavior-lock coverage, kept old feature paths as compatibility re-exports, removed the restricted Team/AgentTeams imports from `TeamAccessView.tsx`, and full web typecheck now passes in the current workspace.
Files: `apps/web/src/lib/agents/agent-teams.types.ts`, `apps/web/src/lib/agents/agent-access-policy.logic.ts`, `apps/web/src/components/agents/AgentAccessRowUi.tsx`, `apps/web/src/features/agent-teams/types.ts`, `apps/web/src/features/team/components/chat/agent-info-panel/access-row-ui.tsx`, `apps/web/src/features/team/components/chat/agent-info-panel/agent-access-policy.logic.ts`, `apps/web/src/features/team/components/chat/agent-info-panel/agent-access-policy.logic.test.ts`, `apps/web/src/features/team-2/components/teams/TeamAccessView.tsx`, `apps/web/src/features/team-2/components/teams/TeamAccessView.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 15:44] - [FIX]
What: Fixed the shared custom domains API type import used by the Vercel web build.
Why: `apps/web/src/lib/domains/custom-domains-api.ts` had been moved under `src/lib/domains` but still imported `../types/domains.types`, a path that does not exist in the deployed checkout.
Impact: The web TypeScript check can resolve the domains response types again; the deployment compile error for `@vibey/web` is cleared once this fix lands on the deployed branch.
Files: `apps/web/src/lib/domains/custom-domains-api.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 15:56] - [ARCH]
What: Moved the Spaces funnel settings subview off Settings and Studio feature internals.
Why: Phase 3-B needed `FunnelSettingsSubView.tsx` to use shared settings, billing, funnel-settings, artifact, domain, and workflow boundaries instead of cross-feature imports.
Impact: No behavior changed. Added Spaces subview behavior-lock coverage, moved reusable funnel settings UI/hooks and API helpers into shared `components`/`lib` boundaries with Studio compatibility re-exports, and full web typecheck passes.
Files: `apps/web/src/features/spaces/components/customize/funnels-customize/FunnelSettingsSubView.tsx`, `apps/web/src/features/spaces/components/customize/funnels-customize/FunnelSettingsSubView.test.tsx`, `apps/web/src/components/funnels/funnel-settings`, `apps/web/src/lib/artifacts/funnel-settings-api.ts`, `apps/web/src/lib/artifacts/funnel-preview-api.ts`, `apps/web/src/lib/artifacts/artifact-inline-errors.config.ts`, `apps/web/src/lib/workflows/workflow-api.ts`, `apps/web/src/features/studio/components/preview/funnel-settings`, `apps/web/src/features/studio/services/artifact-preview.service.ts`, `apps/web/src/features/studio/services/workflow.service.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 16:14] - [ARCH]
What: Moved the Spaces presentation card hero preview off Studio feature internals.
Why: Phase 3-B needed `PresentationCardHeroPreview.tsx` to use shared presentation preview, artifact API, theme, and mini-preview boundaries instead of importing Studio preview files.
Impact: No behavior changed. Added Spaces hero and full-mode-store behavior coverage, kept old Studio/Theme paths as compatibility re-exports, and full web typecheck passes.
Files: `apps/web/src/features/spaces/components/artifacts/PresentationCardHeroPreview.tsx`, `apps/web/src/features/spaces/components/artifacts/PresentationCardHeroPreview.test.tsx`, `apps/web/src/components/presentations/PresentationSlideMiniPreview.tsx`, `apps/web/src/lib/presentations`, `apps/web/src/lib/artifacts/artifact-preview-api.ts`, `apps/web/src/lib/artifacts/artifact-preview-api.test.ts`, `apps/web/src/lib/artifacts/core-artifact-types.ts`, `apps/web/src/lib/artifacts/artifact-types.ts`, `apps/web/src/lib/html/html-bundle-srcdoc.ts`, `apps/web/src/lib/themes`, `apps/web/src/features/studio/store/use-presentation-full-mode-store.ts`, `apps/web/src/features/studio/store/use-presentation-full-mode-store.test.ts`, `apps/web/src/features/spaces/containers/SpacesContainer.tsx`, `apps/web/src/features/studio/components/preview/PresentationHtmlPreview.tsx`, `apps/web/src/features/studio/services/artifact-preview.service.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 16:26] - [ARCH]
What: Moved the Team conversation artifact preview card off Studio feature internals.
Why: Phase 3-B needed `ConversationArtifactPreviewCard.tsx` to use shared artifact document helpers, APIs, and types instead of importing Studio preview files.
Impact: No behavior changed. Added Team preview and shared helper behavior coverage, kept old Studio helper/type paths as compatibility re-exports, removed the card's restricted Studio imports, and full web typecheck passes.
Files: `apps/web/src/features/team/components/chat/ConversationArtifactPreviewCard.tsx`, `apps/web/src/features/team/components/chat/ConversationArtifactPreviewCard.test.tsx`, `apps/web/src/features/team/lib/conversation-artifact-preview.utils.ts`, `apps/web/src/lib/artifacts/conversation-document-to-pending-artifact.ts`, `apps/web/src/lib/artifacts/conversation-document-to-pending-artifact.test.ts`, `apps/web/src/lib/artifacts/pending-artifact-open.ts`, `apps/web/src/features/studio/lib/conversation-document-to-pending-artifact.ts`, `apps/web/src/features/studio/types/vibey-pending-artifact-open.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 16:40] - [UTIL]
What: Added component-level production freeze breadcrumbs for the dashboard home and Team agent loading paths.
Why: Production freezes on `/home` and `/team?agent=...` were returning normal 200 server logs, and the previous freeze debug route used `getSession()`, causing Supabase warnings to obscure the actual `[freeze_debug]` payloads.
Impact: Authenticated freeze debug posts now validate with `getUser()` and log without the Supabase session warning. The home composer, Team 2 conversation sidebar, and canonical `AgentChatPanel` initial/session hydration paths now emit `component_mark` events with component names, phases, counts, and durations so the next freeze can identify whether campaign load, conversation load, initial hydration, or message hydration is the stuck path.
Files: `apps/web/src/app/api/freeze-debug/route.ts`, `apps/web/src/lib/debug/freeze-diagnostics.ts`, `apps/web/src/app/(dashboard)/home/page.tsx`, `apps/web/src/features/team-2/components/Team2AgentChatWithConversations.tsx`, `apps/web/src/features/team/components/AgentChatPanel.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 16:44] - [FIX]
What: Corrected Workspace Brain Cortex Max rows to hide legacy campaign brains and label Customer Brain separately.
Why: The settings table inferred brain type from legacy foreign keys and still joined campaigns, so campaign-linked `ns_brains` rows could appear and customer-scope rows fell through as `Your Brain`.
Impact: Workspace Brain settings now show Cortex Max rows only for user, agent, and customer brains. Campaign-linked brain rows are filtered out, Customer Brain appears with its own type, stale Customer Brain copy was updated, and the panel now uses a settings-owned Brain API wrapper instead of importing Brain feature internals.
Files: `apps/web/src/features/settings/components/settings-content/BrainPageContent.tsx`, `apps/web/src/features/settings/lib/brain-settings-api.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 16:51] - [FIX]
What: Scoped Workspace Brain Cortex Max rows to the signed-in owner.
Why: The `ns_brains` select relied on access policies only, so shared/viewable personal brain rows could still appear as another `Your Brain` in the settings table.
Impact: The personal Brain settings table now loads only the authenticated user's active personal brains before applying the user, agent, customer, and campaign filters.
Files: `apps/web/src/features/settings/components/settings-content/BrainPageContent.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 16:53] - [ARCH]
What: Moved Team media panel artifact/conversation dependencies behind shared web library boundaries and split both media panels under component limits.
Why: Phase 3-B needed `AgentMediaPanel.tsx`, `AllChatsMediaModal.tsx`, and `useAgentMedia.ts` to stop importing Studio/Mission feature internals while preserving media/document/link behavior.
Impact: No intended behavior changed. Added Team media behavior-lock coverage, moved reusable artifact opening, agent documents, conversation messages, conversation assets, and conversation types into shared `src/lib` modules, fixed the modal's loading callback restart loop, and removed temporary Settings usage debug fetches that blocked full web typecheck.
Files: `apps/web/src/features/team/components/chat/AgentMediaPanel.tsx`, `apps/web/src/features/team/components/chat/AllChatsMediaModal.tsx`, `apps/web/src/features/team/components/chat/all-chats-media-feed.tsx`, `apps/web/src/features/team/components/chat/agent-media-row-menus.tsx`, `apps/web/src/features/team/components/chat/ChatMediaTile.tsx`, `apps/web/src/features/team/hooks/useAgentMedia.ts`, `apps/web/src/features/team/hooks/useAgentMedia.test.tsx`, `apps/web/src/features/team/components/chat/AllChatsMediaModal.test.tsx`, `apps/web/src/lib/artifacts/open-studio-artifact.ts`, `apps/web/src/lib/artifacts/artifact-preview-api.ts`, `apps/web/src/lib/artifacts/artifact-preview-api.test.ts`, `apps/web/src/lib/conversations/conversations-api.ts`, `apps/web/src/lib/conversations/conversations-api.test.ts`, `apps/web/src/lib/conversations/conversation.types.ts`, `apps/web/src/features/studio/lib/open-studio-artifact.ts`, `apps/web/src/features/settings/components/settings-content/UsagePageContent.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 16:57] - [ARCH]
What: Moved the Team conversation media hook off Studio artifact/type imports.
Why: Phase 3-B needed `useConversationMedia.ts` to use shared artifact and conversation boundaries after the broader Team media split.
Impact: No behavior changed. Added behavior-lock coverage for document splitting plus media/link extraction, added shared `fetchConversationDocuments`, and full web typecheck passes.
Files: `apps/web/src/features/team/hooks/useConversationMedia.ts`, `apps/web/src/features/team/hooks/useConversationMedia.test.tsx`, `apps/web/src/lib/artifacts/artifact-preview-api.ts`, `apps/web/src/lib/artifacts/artifact-preview-api.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 17:00] - [FIX]
What: Split public widget prewarm into page-load agent context and conversation-scoped context reuse.
Why: Public widgets can know the agent before a conversation exists, so model/policy/runtime/Brain-presence work should start at page load and Send should join or reuse that work instead of rebuilding it inside the user-visible wait.
Impact: Public widget page load now calls agent prewarm, conversation preparation joins that same work after the conversation id exists, and Send waits on the shared preparation promise. Agent API traces now expose agent-prewarm cache status/store/reuse metadata inside stable-context timing, while prompt quality remains unchanged because conversation-specific context is still added before the model call.
Files: `apps/agent-api/src/modules/chat/services/chat-prewarm-cache.service.ts`, `apps/agent-api/src/modules/chat/services/chat-prewarm-context.service.ts`, `apps/agent-api/src/modules/chat/services/chat-prewarm-context.types.ts`, `apps/agent-api/src/modules/chat/services/chat-process-message.types.ts`, `apps/agent-api/src/modules/chat/services/chat.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-session.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-bootstrap.service.ts`, `apps/agent-api/src/modules/public-agent/controllers/public-chat.controller.ts`, `apps/agent-api/src/modules/public-agent/public-chat.controller.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`, `apps/web/src/features/public-agent/services/public-agent.service.ts`, `apps/web/src/features/public-agent/hooks/usePublicAgentConversationPreparation.ts`, `apps/web/src/features/public-agent/containers/EmbeddedAgentContainer.tsx`, `apps/web/src/features/public-agent/hooks/usePublicAgentChat.test.ts`, `documentation/features/chat-stream-recovery.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:11] - [FIX]
What: Fixed public widget message anchoring so the identity prompt no longer covers new messages and the anchor spacer disappears after the active reply completes.
Why: The embedded identity prompt was sticky inside the scroll area, while the message scroll hook always anchored the latest user message to the top and always reserved a viewport-height spacer under it.
Impact: New widget sends still jump the latest user message upward during pending/streaming replies, but the save-details prompt scrolls with the thread instead of overlaying the message, and completed replies no longer leave a long empty area below the messages.
Files: `apps/web/src/features/public-agent/hooks/usePublicAgentMessageScroll.ts`, `apps/web/src/features/public-agent/hooks/usePublicAgentMessageScroll.test.ts`, `apps/web/src/features/public-agent/containers/EmbeddedMessagesView.tsx`, `apps/web/src/features/public-agent/containers/PublicAgentContainer.tsx`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 17:00] - [ARCH]
What: Removed small Team Studio type imports from conversation search and team campaign collection types.
Why: Phase 3-B needed the Team conversation utility/type files to use shared contracts instead of Studio feature types.
Impact: No behavior changed. Added search behavior coverage, made the search helper preserve each caller's message type with a generic minimal shape, and full web typecheck passes.
Files: `apps/web/src/features/team/components/chat/ConversationSearch.tsx`, `apps/web/src/features/team/components/chat/ConversationSearch.test.ts`, `apps/web/src/features/team/types/team-container.types.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 17:06] - [ARCH]
What: Moved small Team and Team-2 agent type/model helper usage to shared web agent boundaries.
Why: Phase 3-B needed small Team/Team-2 helper files to stop importing Mission Control and Team feature internals where shared contracts already exist.
Impact: No behavior changed. Added helper/store behavior-lock coverage, rewired selected MissionAgent/MissionAgentSidebar imports to `src/lib/agents`, moved `agentModelId` into the shared model-strategy helper, and full web typecheck passes.
Files: `apps/web/src/features/team-2/store/use-team-focus-store.ts`, `apps/web/src/features/team-2/store/use-team-focus-store.test.ts`, `apps/web/src/features/team/lib/agent-info-panel-tabs.ts`, `apps/web/src/features/team/lib/agent-info-panel-tabs.test.ts`, `apps/web/src/features/team/lib/team-agent-favorites.ts`, `apps/web/src/features/team/lib/team-agent-favorites.test.ts`, `apps/web/src/features/team-2/components/AgentModelChip.tsx`, `apps/web/src/features/team-2/components/tabs/ChatTab.tsx`, `apps/web/src/lib/agents/model-strategies.ts`, `apps/web/src/lib/agents/model-strategies.test.ts`, `apps/web/src/features/team/constants/team.constants.ts`, `apps/web/src/features/team/constants/team.constants.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 17:09] - [ARCH]
What: Moved Team-2 DM artifact preview selection/type aliases into shared artifact types.
Why: Phase 3-B needed `team-dm-artifact-preview.ts` to stop importing Spaces and Studio feature-owned type aliases.
Impact: No behavior changed. Added mapping coverage, kept old Spaces/Studio type paths as compatibility exports, and full web typecheck passes.
Files: `apps/web/src/features/team-2/lib/team-dm-artifact-preview.ts`, `apps/web/src/features/team-2/lib/team-dm-artifact-preview.test.ts`, `apps/web/src/lib/artifacts/artifact-preview-types.ts`, `apps/web/src/features/spaces/components/artifacts/artifact-preview-selection.ts`, `apps/web/src/features/studio/components/chat/artifact-inline-preview-card/artifact-inline-preview.types.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 17:11] - [ARCH]
What: Moved Team-2 mission-agent-to-roster conversion to shared agent and roster types.
Why: Phase 3-B needed `mission-agent-to-roster.ts` to stop importing Mission Control and Org feature-owned type aliases.
Impact: No behavior changed. Added conversion coverage, rewired the converter to shared `src/lib/agents` and `src/lib/team` contracts, and full web typecheck passes.
Files: `apps/web/src/features/team-2/lib/mission-agent-to-roster.ts`, `apps/web/src/features/team-2/lib/mission-agent-to-roster.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 17:14] - [ARCH]
What: Moved Team-2 agent metrics to shared Mission and MissionAgent contracts.
Why: Phase 3-B needed `agent-team-metrics.ts` to stop importing Mission Control feature types for pure aggregate helpers.
Impact: No behavior changed. Added deterministic metrics coverage with a fixed clock, introduced shared `src/lib/missions/mission-types.ts`, and full web typecheck passes.
Files: `apps/web/src/features/team-2/lib/agent-team-metrics.ts`, `apps/web/src/features/team-2/lib/agent-team-metrics.test.ts`, `apps/web/src/lib/missions/mission-types.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 17:17] - [ARCH]
What: Moved Team campaign destination selection to the shared campaign contract.
Why: Phase 3-B needed `CampaignDestinationField.tsx` to stop importing Studio feature types.
Impact: No behavior changed. Added select behavior coverage, switched to shared `Campaign`, token-cleaned the touched select classes, and full web typecheck passes.
Files: `apps/web/src/features/team/components/shared/CampaignDestinationField.tsx`, `apps/web/src/features/team/components/shared/CampaignDestinationField.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:10] - [FIX]
What: Stabilized ChatInput model settings so focused composers do not re-prewarm on unrelated rerenders.
Why: Production freeze logs showed `/team` emitting repeated long-task debug events while `/api/proxy/chat/prewarm` and brain import polling ran every few seconds. The active model settings object was rebuilt on every render, so a focused composer treated normal poll-driven rerenders as a new prewarm payload.
Impact: Chat prewarm still fires on focus, input, and real scope/model changes, but stable rerenders no longer generate repeated `/api/chat/prewarm` posts. Added focused regression coverage and verified web typecheck.
Files: `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-prefs.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-prefs.test.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:09] - [ARCH]
What: Moved ready-employee modal Team dependencies behind shared web boundaries.
Why: Phase 3-B needed the ready-employee modal and HR insights flow to stop importing Mission Control, Studio, Agent Teams, and Team-2 internals where shared contracts/helpers are enough.
Impact: No intended behavior changed. Added ready-employee modal behavior coverage, kept legacy feature paths as compatibility re-exports, moved ready-employee types/API, agent-team hooks/API, Team-2 permissions, campaign fetch/update, and conversation send helpers into shared `src/lib` boundaries, and full web typecheck passes.
Files: `apps/web/src/features/team/components/ready-employees-modal`, `apps/web/src/lib/agents/ready-employee-types.ts`, `apps/web/src/lib/agents/ready-employees-api.ts`, `apps/web/src/lib/agents/agent-teams-api.ts`, `apps/web/src/lib/agents/use-agent-teams.ts`, `apps/web/src/lib/agents/use-agent-team-permissions.ts`, `apps/web/src/lib/agents/team-system-agent-keys.ts`, `apps/web/src/lib/conversations/conversations-api.ts`, `apps/web/src/lib/campaigns/campaign-api.ts`, `apps/web/src/lib/chat/chat-credit-state.ts`, `apps/web/src/features/mission-control/services/missions.service.ts`, `apps/web/src/features/mission-control/types/index.ts`, `apps/web/src/features/agent-teams`, `apps/web/src/features/team-2`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:16] - [ARCH]
What: Extracted the first pure logic slice from the Spaces Vibey chat panel.
Why: Phase 3-B needs `SpaceVibeyChatPanel.tsx` decomposed while Phase 3-A continues reducing Spaces cross-feature imports.
Impact: No behavior changed. Added helper behavior coverage for home chat seeds, task mutations, conversation ownership, and conversation merging; moved the helper logic out of the 2.5k-line component; and rewired touched roster/campaign imports to shared `src/lib` boundaries.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:19] - [ARCH]
What: Extracted Spaces chat auto-focus decisions from the Vibey chat panel.
Why: Phase 3-B needs the oversized Spaces chat panel split through tested behavior slices before larger UI/hook moves.
Impact: No behavior changed. Added coverage for mission, document, and artifact auto-focus mapping, moved the parsing/mapping logic into the Spaces chat helper, and kept the component responsible only for dispatching the selected focus event.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:25] - [FIX]
What: Added same-key cooldown dedupe to Studio chat prewarm requests.
Why: Production logs on the hotfix build still showed `/api/proxy/chat/prewarm` posting every few seconds with the same focused Team composer payload; the existing prewarm dedupe only covered in-flight requests and allowed immediate repeats after a 200.
Impact: A completed prewarm for the same conversation/model/scope key is suppressed for 60 seconds, while real key changes still prewarm immediately. Focused prewarm/model tests and web typecheck pass.
Files: `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/features/studio/services/chat-prewarm.test.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:05] - [FIX]
What: Made ChatInput composer integration/access data load lazily from the plus menu instead of on mount.
Why: Local production reproduction froze on pages that only mounted ChatInput, and recent architecture remediation had moved composer access/integration support into eager mount effects.
Impact: Home and Team no longer fetch integration overview or agent override data just because a composer rendered. Integrations load when opening `+ -> Integrations`; skill/access overrides load when opening `+ -> Skills` or `+ -> Access`.
Files: `apps/web/src/features/studio/components/ChatInput/use-chat-input-composer-access.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-composer-access.test.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:28] - [ARCH]
What: Extracted Spaces Vibey chat message-shaping logic from the oversized chat panel.
Why: Phase 3-B is decomposing `SpaceVibeyChatPanel.tsx` through behavior-locked pure slices before broader UI/hook moves.
Impact: No behavior changed. Added coverage for hidden/delegation filtering, voice-delegation task collection, undo id selection, and turn grouping, then rewired the panel to the new helper. Focused tests, focused ESLint, full web typecheck, targeted LOC/import scans, `git diff --check`, and branch checks passed.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-messages.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-messages.logic.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:41] - [ARCH]
What: Extracted Spaces Vibey chat voice-run task derivation from the chat panel.
Why: Phase 3-B is reducing `SpaceVibeyChatPanel.tsx` through behavior-locked pure logic slices while preserving the current voice task panel contract.
Impact: No behavior changed. Added coverage for delegation metadata mapping, invalid status defaulting, live task replacement, and live-only task preservation, then rewired the panel to the shared message helper. Focused tests, changed-file ESLint, full web typecheck, targeted LOC/import scans, `git diff --check`, stale changelog pruning/check, and branch checks passed.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-messages.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-messages.logic.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:44] - [ARCH]
What: Extracted Spaces Vibey chat editable-message lookup from the chat panel.
Why: Phase 3-B continues reducing `SpaceVibeyChatPanel.tsx` through behavior-locked pure slices before larger UI and hook moves.
Impact: No behavior changed. Added coverage for last-user lookup, streaming-disable behavior, and assistant-only threads, then rewired the panel to the shared message helper. Focused tests, changed-file ESLint, full web typecheck, targeted LOC/import scans, `git diff --check`, and stale changelog pruning/check passed.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-messages.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-messages.logic.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:47] - [ARCH]
What: Extracted Spaces Vibey chat conversation URL construction from the chat panel.
Why: Phase 3-B is moving deterministic chat-panel logic behind tested helpers before larger component and hook decomposition.
Impact: No behavior changed. Added coverage for channel URL encoding, space URL encoding, and the existing empty-space fallback, then rewired the panel callback to preserve the browser guard and delegate URL assembly. Focused tests, changed-file ESLint, full web typecheck, targeted LOC/import scans, `git diff --check`, and stale changelog pruning/check passed.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 18:56] - [ARCH]
What: Moved Spaces voice-runs message rendering to a shared chat adapter.
Why: Phase 3-B needs Spaces child components off Studio feature imports before the parent chat panel can be treated as clean.
Impact: No behavior changed. Added `SpaceVoiceRunsView` behavior coverage, introduced shared `MessageBubbleAdapter` and `ChatRenderMessage` contracts, rewired the view off Studio imports, and verified focused tests, ESLint, full web typecheck, LOC/import scans, `git diff --check`, stale changelog pruning/check, and branch checks.
Files: `apps/web/src/features/spaces/components/chat/SpaceVoiceRunsView.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceRunsView.test.tsx`, `apps/web/src/components/chat/MessageBubbleAdapter.tsx`, `apps/web/src/lib/chat/chat-render-message.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:01] - [ARCH]
What: Moved generic chat message search to a shared chat helper.
Why: Phase 3-B needs Spaces and Team-2 chat surfaces off Team feature internals when the helper is not Team-specific.
Impact: No behavior changed. Kept the old Team path as a compatibility re-export, added shared helper coverage, rewired Spaces and Team-2 HR side chat to `src/lib/chat`, and fixed an unrelated debug probe type shape so full web typecheck could run green.
Files: `apps/web/src/lib/chat/conversation-search.ts`, `apps/web/src/lib/chat/conversation-search.test.ts`, `apps/web/src/features/team/components/chat/ConversationSearch.tsx`, `apps/web/src/features/team/components/chat/ConversationSearch.test.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/team-2/components/hr-side-chat/TeamHrSideChatPanel.tsx`, `apps/web/src/lib/debug/interaction-freeze-probe.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:03] - [ARCH]
What: Moved Spaces chat toast errors to the shared chat config import.
Why: Phase 3-B is clearing old Studio compatibility imports from the oversized Spaces chat panel one boundary at a time.
Impact: No behavior changed. `SpaceVibeyChatPanel.tsx` now reads `CHAT_TOAST_ERRORS` from `src/lib/chat`, with focused config tests, ESLint, full web typecheck, LOC/import scans, and stale old-config scans passing.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/lib/chat/chat-toast-errors.config.ts`, `apps/web/src/lib/chat/chat-toast-errors.config.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:09] - [ARCH]
What: Routed Spaces chat input and message bubbles through shared chat adapters.
Why: Phase 3-B is clearing direct Studio UI imports from the oversized Spaces chat panel while preserving behavior.
Impact: No behavior changed. Added `ChatInputAdapter`, reused `MessageBubbleAdapter`, rewired `SpaceVibeyChatPanel.tsx` to shared adapter imports, and updated the voice-runs test mock to the shared adapter path. Focused tests, ESLint, full web typecheck, LOC/import scans, and stale direct Studio ChatInput/MessageBubble scans passed.
Files: `apps/web/src/components/chat/ChatInputAdapter.tsx`, `apps/web/src/components/chat/MessageBubbleAdapter.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceRunsView.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:18] - [FIX]
What: Routed the interaction freeze probe into the app freeze-debug endpoint.
Why: Local production still froze after lazy ChatInput access loading, so click-level instrumentation needs to show whether pointer handling, render scheduling, or post-click async work blocks the main thread.
Impact: `debug_interaction=1` now emits `interaction_probe` entries to `/api/freeze-debug` for pointer capture/bubble, microtask, animation-frame, timeout return, long tasks, org-store changes near clicks, and active-org link propagation timing.
Files: `apps/web/src/lib/debug/interaction-freeze-probe.ts`, `apps/web/src/app/(dashboard)/providers.tsx`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:35] - [FIX]
What: Added a temporary binary-isolation gate that hides the Home composer without deleting its implementation.
Why: The Home freeze still reproduces with WebGL disabled and browser-level tracing points to renderer-side React/composer work, so the next reliable test is removing the visible Home ChatInput subtree.
Impact: Local test builds can verify whether `/home` still freezes with `HomeComposer` skipped. The original composer code remains intact and can be restored by flipping the temporary constant.
Files: `apps/web/src/app/(dashboard)/home/page.tsx`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:37] - [FIX]
What: Restored the missing `init` parameter in the shared Railway proxy route test fetch mock.
Why: Full web TypeScript checking was blocked by an out-of-scope test type error where the mock asserted `init.headers` without receiving `init`.
Impact: The web typecheck can proceed to validate the freeze-isolation change.
Files: `apps/web/src/app/api/proxy/[...path]/route.test.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:46] - [FIX]
What: Re-enabled the Home composer wrapper and added a temporary ChatInput early-return mode that renders only a minimal textarea.
Why: Hiding the full Home composer stopped the freeze, so the next binary test needs to distinguish ChatInput module import from ChatInput hook/controller initialization.
Impact: Local production testing can verify whether the freeze happens before or after ChatInput hooks run. The original ChatInput implementation remains intact behind the temporary mode constant.
Files: `apps/web/src/app/(dashboard)/home/page.tsx`, `apps/web/src/features/studio/components/ChatInput.tsx`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:18] - [FIX]
What: Guarded ChatInput model dropdown position updates so resize/measurement callbacks do not write identical coordinates back into React state, and aligned model-options tests with lazy dropdown loading.
Why: The Home freeze reproduced only after full models loaded into the open picker; the remaining state loop was the model dropdown resize/position path repeatedly measuring and setting equivalent position objects.
Impact: Model rows still load on demand when the picker opens, but repeated resize callbacks no longer force unnecessary rerenders that can pin the browser main thread.
Files: `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-menu.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-options.test.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:14] - [ARCH]
What: Moved the shared attached-artifact chat type contract to `src/lib/chat`.
Why: Phase 3-B is clearing Studio-owned type imports from Spaces chat surfaces while preserving the current Studio attachment component API.
Impact: No behavior changed. `SpaceVibeyChatPanel.tsx` now imports `AttachedArtifact` from shared lib, `ArtifactAttachments.tsx` keeps compatibility type exports, and focused tests, ESLint, full web typecheck, LOC/import scans, and stale old type-import checks passed.
Files: `apps/web/src/lib/chat/attached-artifact.ts`, `apps/web/src/features/studio/components/chat/ArtifactAttachments.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:17] - [ARCH]
What: Moved the shared artifact preview-pane height to `src/lib/chat`.
Why: Phase 3-B is clearing non-Studio consumers from Studio-owned chat attachment exports.
Impact: No behavior changed. Added shared constant coverage, kept the Studio compatibility export, and rewired Brain and Spaces to the shared preview-layout import. Focused tests, clean-subset ESLint, full web typecheck, LOC/import scans, and stale Brain/Spaces old-import scans passed.
Files: `apps/web/src/lib/chat/artifact-preview-layout.ts`, `apps/web/src/lib/chat/artifact-preview-layout.test.ts`, `apps/web/src/features/studio/components/chat/ArtifactAttachments.tsx`, `apps/web/src/features/brain/components/KnowledgeSourceMediaPreview.tsx`, `apps/web/src/features/spaces/components/artifacts/ArtifactSpaceView.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:20] - [ARCH]
What: Rewired `ArtifactSpaceView` to shared artifact and form type contracts.
Why: Phase 3-B is removing direct Spaces imports from Studio artifact service/type compatibility paths.
Impact: No runtime behavior changed. `ArtifactSpaceView.tsx` now reads artifact types from `src/lib/artifacts` and form types from `src/lib/forms`; full web typecheck passed and stale Studio service/type import scans for the file are clean. The file still needs decomposition for its 1305 LOC max-lines blocker.
Files: `apps/web/src/features/spaces/components/artifacts/ArtifactSpaceView.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:23] - [ARCH]
What: Extracted pure artifact card display helpers from `ArtifactSpaceView`.
Why: Phase 3-B is reducing the oversized Spaces artifact grid through behavior-locked slices.
Impact: No behavior changed. Added helper coverage for card width classes, drag node type mapping, and badge tone classes, then moved those helpers into `artifact-card-display.ts`. Focused tests, clean-subset ESLint, full web typecheck, stale helper scans, and LOC checks passed; the parent is now 1235 LOC.
Files: `apps/web/src/features/spaces/components/artifacts/ArtifactSpaceView.tsx`, `apps/web/src/features/spaces/components/artifacts/artifact-card-display.ts`, `apps/web/src/features/spaces/components/artifacts/artifact-card-display.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:28] - [ARCH]
What: Extracted the artifact card body renderer from `ArtifactSpaceView`.
Why: Phase 3-B is reducing the oversized Spaces artifact grid through tested component slices.
Impact: No behavior changed. Added coverage for generic document-card rendering and email preview rendering, moved the card body into `ArtifactCardBody.tsx`, and reduced the parent to 1049 LOC. Focused tests, clean-subset ESLint, full web typecheck, stale import scans, and LOC checks passed; parent lint still only fails on max-lines.
Files: `apps/web/src/features/spaces/components/artifacts/ArtifactSpaceView.tsx`, `apps/web/src/features/spaces/components/artifacts/ArtifactCardBody.tsx`, `apps/web/src/features/spaces/components/artifacts/ArtifactCardBody.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:32] - [ARCH]
What: Extracted artifact card menu-target mapping from `ArtifactSpaceView`.
Why: Phase 3-B is continuing the oversized Spaces artifact grid split through tested pure helpers.
Impact: No behavior changed. Added coverage for menu-target normalization across offer, social, sequence, presentation, avatar, ad, form, and email cards, moved the inline mapping logic to `artifact-card-menu-targets.ts`, and reduced the parent to 992 LOC. Focused tests, clean-subset ESLint, full web typecheck, stale import scans, and LOC checks passed.
Files: `apps/web/src/features/spaces/components/artifacts/ArtifactSpaceView.tsx`, `apps/web/src/features/spaces/components/artifacts/artifact-card-menu-targets.ts`, `apps/web/src/features/spaces/components/artifacts/artifact-card-menu-targets.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:39] - [ARCH]
What: Extracted artifact card action buttons from `ArtifactSpaceView`.
Why: Phase 3-B is reducing the oversized Spaces artifact grid through tested UI slices.
Impact: No behavior changed. Added coverage for menu toggle delegation and full-view delegation, moved the repeated action button strip into `ArtifactCardActionButtons.tsx`, and reduced the parent to 929 LOC. Focused tests, clean-subset ESLint, full web typecheck, stale import scans, and LOC checks passed.
Files: `apps/web/src/features/spaces/components/artifacts/ArtifactSpaceView.tsx`, `apps/web/src/features/spaces/components/artifacts/ArtifactCardActionButtons.tsx`, `apps/web/src/features/spaces/components/artifacts/ArtifactCardActionButtons.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:39] - [FIX]
What: Cleared unused fetch mock parameters in the proxy route test.
Why: Full web typecheck was blocked by adjacent dirty test changes that removed header assertions from some mocks but left unused `init` parameters.
Impact: No runtime behavior changed. The proxy route test and full web typecheck pass.
Files: `apps/web/src/app/api/proxy/[...path]/route.test.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:36] - [DOCS]

What: Added a Loop Workflow Capability Inventory analysis document that maps current Flow triggers/actions and active agent backend actions into first-pass workflow capability classifications, schemas, side effects, produced contexts, and UI field controls.

Why: Establish the source document for turning platform agent tools into Loop-composable Flow blueprints rendered by a schema-driven Flows UI.

Impact: Documentation-only. No runtime behavior changed.

Files:
- `.docs/analysis/loop-workflow-capability-inventory-2026-06-22.md`

## [2026-06-22 19:36] - [FIX]
What: Moved every production profile runtime target to shared Railway, changed production profile defaults to shared Railway, and updated auth/onboarding/proxy gates to treat shared Railway as runtime-ready without provisioning or falling back to Fly.
Why: Production users were still defaulting to and falling back through Fly machines, which caused completed users to get stuck in onboarding when Fly machine creation left a machine in an unusable `created` state.
Impact: Production now has 158/158 profiles configured with `agent_runtime_type = shared_railway` and `agent_runtime_url = https://vibeyv2-production-1437.up.railway.app`; new production profiles default to the same target. The web proxy no longer falls back from shared Railway chat/API failures to Fly, auth callback skips background Fly provisioning for shared Railway users, and onboarding status reports shared Railway as ready.
Files: `apps/web/src/lib/runtime/machine-profile-env.ts`, `packages/api-shared/src/services/machine-profile-env.ts`, `packages/api-shared/src/index.ts`, `packages/api-shared/dist/index.d.ts`, `packages/api-shared/dist/index.js`, `packages/api-shared/dist/services/machine-profile-env.d.ts`, `packages/api-shared/dist/services/machine-profile-env.js`, `apps/web/src/middleware.ts`, `apps/api/src/modules/users/services/profile.service.ts`, `apps/api/src/modules/users/controllers/profile.controller.test.ts`, `apps/api/src/modules/onboarding/services/onboarding-status.service.ts`, `apps/api/src/modules/onboarding/services/__tests__/onboarding-status.service.test.ts`, `apps/web/src/app/(auth)/callback/route.ts`, `apps/web/src/app/(auth)/onboarding/page.tsx`, `apps/web/src/app/(auth)/setting-up/page.tsx`, `apps/web/src/app/api/proxy/[...path]/route.ts`, `apps/web/src/app/api/proxy/[...path]/route.test.ts`, `supabase/migrations/20260622193000_default_profiles_to_shared_railway_runtime.sql`, production Supabase `profiles`

## [2026-06-22 19:44] - [ARCH]
What: Added a shared Workflow Capability contract that wraps the current Flow capability catalog with input schema source, derived UI schema metadata, side-effect classification, approval policy, executor status, and explicit contract gaps.
Why: Loop needs a machine-readable capability graph before it can build Flow blueprints from platform capabilities without pretending inferred metadata is final schema.
Impact: No existing Flow capability endpoint behavior changed. Current Flow capabilities can now be exposed as workflow-capability candidates while agent-action graph generation remains a follow-up slice.
Files: `packages/api-shared/src/types/workflow-capabilities.ts`, `packages/api-shared/src/types/workflow-capabilities.test.ts`, `packages/api-shared/src/index.ts`, `.docs/analysis/loop-workflow-capability-inventory-2026-06-22.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 19:46] - [ARCH]
What: Extracted artifact card dropdown rendering from `ArtifactSpaceView`.
Why: Phase 3-B is reducing the oversized Spaces artifact grid through tested UI slices.
Impact: No behavior changed. Added coverage for open offer dropdown rendering plus close/full-view delegation, moved the dropdown render block into `ArtifactCardDropdowns.tsx`, and reduced the parent to 845 LOC. Focused tests, clean-subset ESLint, full web typecheck, stale parent import scans, and LOC checks passed.
Files: `apps/web/src/features/spaces/components/artifacts/ArtifactSpaceView.tsx`, `apps/web/src/features/spaces/components/artifacts/ArtifactCardDropdowns.tsx`, `apps/web/src/features/spaces/components/artifacts/ArtifactCardDropdowns.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:00] - [ARCH]
What: Extracted artifact card menu state and controls from `ArtifactSpaceView`.
Why: Phase 3-B is reducing the oversized Spaces artifact grid while keeping menu behavior covered.
Impact: No behavior changed. Added hook coverage for offer menu controls and unsupported cards, moved refs/state/action/dropdown/context-menu orchestration into `use-artifact-card-menus.ts`, reduced the parent to 549 LOC, and kept the new hook under the hook cap at 268 LOC. Focused tests, clean-subset ESLint, full web typecheck, import scans, and LOC checks passed.
Files: `apps/web/src/features/spaces/components/artifacts/ArtifactSpaceView.tsx`, `apps/web/src/features/spaces/components/artifacts/use-artifact-card-menus.ts`, `apps/web/src/features/spaces/components/artifacts/use-artifact-card-menus.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:05] - [ARCH]
What: Moved the artifact card component out of `ArtifactSpaceView`.
Why: Phase 3-B needed the Spaces artifact grid parent below the frontend component line limit.
Impact: No behavior changed. Added card-level coverage for body-open and full-view delegation, moved `ArtifactCard` into its own component file, and reduced `ArtifactSpaceView.tsx` to 382 LOC. Focused tests, focused ESLint, full web typecheck, direct import scans, and LOC checks passed; the artifact-grid follow-up item is resolved.
Files: `apps/web/src/features/spaces/components/artifacts/ArtifactSpaceView.tsx`, `apps/web/src/features/spaces/components/artifacts/ArtifactCard.tsx`, `apps/web/src/features/spaces/components/artifacts/ArtifactCard.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:09] - [ARCH]
What: Extracted Spaces chat specialized-mode sync logic.
Why: Phase 3-B is continuing the oversized `SpaceVibeyChatPanel` decomposition through behavior-locked slices.
Impact: No behavior changed. Added coverage for the current ordered presentation/funnel mode transitions, moved the repeated mode-sync effects into `space-vibey-chat-mode-sync.ts`, and reduced `SpaceVibeyChatPanel.tsx` to 2315 LOC. Focused tests, clean-subset ESLint, parent ESLint, full web typecheck, import scans, and LOC checks passed.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-mode-sync.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-mode-sync.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:05] - [ARCH]
What: Added the agent-api workflow capability graph and exposed it through Flow build context.
Why: Loop needs to see both compile-ready Flow steps and broader platform-capable agent actions before it can draft reusable workflow blueprints without pretending unsupported actions can already compile.
Impact: `get_flow_build_context` now returns `workflow_capabilities` with Flow catalog entries plus schema-backed `agent_action.*` candidates. Existing Flow compile/publish behavior remains conservative: only `space_automation` entries are directly compile-ready, while agent action candidates are marked as needing a Flow runtime bridge when applicable. Loop prompt/instruction surfaces now explain that distinction, and focused smoke tests plus shared/backend/web typechecks pass.
Files: `packages/api-shared/src/types/workflow-capabilities.ts`, `packages/api-shared/src/types/workflow-capabilities.test.ts`, `packages/api-shared/src/types/flow-builder.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-workflow-capability-graph.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-workflow-capability-graph.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder-context.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flow-builder.service.test.ts`, `apps/api/src/modules/spaces/services/space-flow-builder-context.service.ts`, `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.ts`, `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.test.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`, `apps/web/src/features/flows/lib/flows-loop-awareness-context.ts`, `apps/web/src/features/flows/lib/flows-loop-awareness-context.test.ts`, `.docs/analysis/loop-workflow-capability-inventory-2026-06-22.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:17] - [ARCH]
What: Extracted the Spaces chat header action controls from `SpaceVibeyChatPanel`.
Why: Phase 3-B is continuing the oversized Spaces chat panel decomposition through behavior-locked UI slices.
Impact: No behavior changed. Added coverage for collapse, search, new conversation, voice-runs, conversations, query-change, and search-close delegation, moved the header action strip into `SpaceChatHeaderActions.tsx`, and reduced the parent to 2239 LOC. Focused tests, clean-subset ESLint, parent ESLint, full web typecheck, import/style scans, and LOC checks passed.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:21] - [ARCH]
What: Extracted Spaces chat visible panel-mode selection.
Why: Phase 3-B is continuing the oversized `SpaceVibeyChatPanel` decomposition through tested pure helper slices.
Impact: No behavior changed. Added coverage for first-match specialized panel priority and fallback to the current mode, moved the inline render-mode ternary into `resolveSpaceChatPanelMode`, and reduced the parent to 2235 LOC. Focused tests, clean-subset ESLint, parent ESLint, full web typecheck, import scans, and LOC checks passed.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-mode-sync.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-mode-sync.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:30] - [ARCH]
What: Extracted Spaces chat subpanel rendering from `SpaceVibeyChatPanel`.
Why: Phase 3-B is reducing the oversized Spaces chat panel by moving coherent render branches behind tested local components.
Impact: No behavior changed. Added mocked subpanel coverage for voice-runs back delegation, presentation-comments close/reset delegation, and conversations fallback, then moved the subpanel branch into `SpaceChatSubPanel.tsx`. Focused tests, clean-subset ESLint, parent ESLint, full web typecheck, import/style scans, and LOC checks passed; the parent is now 2174 LOC and the subpanel is 269 LOC.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatSubPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatSubPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:33] - [ARCH]
What: Moved the Spaces chat Org store import to the shared org context boundary.
Why: Phase 3-A/B is reducing direct cross-feature imports from Spaces chat while the panel decomposition continues.
Impact: No behavior changed. `SpaceVibeyChatPanel` now reads `useOrgStore` from `@/lib/org/org-context-store`; focused chat tests, focused ESLint, full web typecheck, LOC checks, import-boundary scans, and style scans passed. The file remains 2174 LOC and stays open for Studio/Team boundary cleanup plus decomposition.
Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:28] - [FIX]
What: Fixed ChatInput model dropdown infinite re-render loop that froze production on first interaction.
Why: Runtime evidence showed React error #185 (maximum update depth) when opening the model picker; `ResizeObserver` repositioning used live `offsetHeight`, which changed as model rows loaded and retriggered placement in a loop.
Impact: Model dropdown placement now uses a stable height cap and no longer observes dropdown resize for repositioning. Model option hydration keys off model id instead of option object identity. Debug probes remain for verification. Focused model menu/prefs tests pass.
Files: `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-menu.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-menu.test.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-prefs.ts`, `apps/web/src/lib/debug/model-picker-debug-probe.ts`, `apps/web/src/app/api/model-picker-debug/route.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:39] - [ARCH]
What: Moved the voice approval context to a shared chat boundary.
Why: Phase 3-A/B is removing direct Team imports from Spaces chat while preserving the shared voice approval provider/hook contract.
Impact: No behavior changed. Added shared context coverage, kept the old Team path as a compatibility re-export, and rewired `SpaceVibeyChatPanel` to the shared provider. Focused tests, focused ESLint, full web typecheck, non-incremental source typecheck, LOC checks, and import scans passed. Also corrected a dirty ChatInput textarea-controller test cast so full typecheck could run.
Files: `apps/web/src/components/chat/VoiceApprovalContext.tsx`, `apps/web/src/components/chat/VoiceApprovalContext.test.tsx`, `apps/web/src/features/team/components/voice/VoiceApprovalContext.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-textarea-controller.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:48] - [ARCH]
What: Moved the chat turn-change divider to shared chat boundaries.
Why: Phase 3-A/B is removing Studio-owned chat UI imports from Spaces while preserving existing turn-divider behavior.
Impact: No behavior changed. Added shared helper/component coverage, kept the old Studio helper/component paths as compatibility re-exports, and rewired `SpaceVibeyChatPanel` to the shared divider. Focused tests, focused ESLint, full web typecheck, import scans, style scan, and LOC checks passed.
Files: `apps/web/src/lib/chat/chat-turn-change-divider.ts`, `apps/web/src/lib/chat/chat-turn-change-divider.test.ts`, `apps/web/src/components/chat/ChatTurnChangeDivider.tsx`, `apps/web/src/components/chat/ChatTurnChangeDivider.test.tsx`, `apps/web/src/features/studio/components/chat/ChatTurnChangeDivider.tsx`, `apps/web/src/features/studio/components/chat/chat-turn-change-divider.utils.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:53] - [ARCH]
What: Moved the chat message queue to shared chat.
Why: Phase 3-A/B is removing Studio-owned chat UI imports from Spaces while preserving queue edit/send/remove behavior.
Impact: No behavior changed. Added shared queue coverage, kept the old Studio queue path as a compatibility re-export, rewired `SpaceVibeyChatPanel` to the shared queue, and cleaned the moved queue classes to existing globals utilities. Focused tests, focused ESLint, full web typecheck, import scans, style scan, and LOC checks passed.
Files: `apps/web/src/components/chat/MessageQueue.tsx`, `apps/web/src/components/chat/MessageQueue.test.tsx`, `apps/web/src/features/studio/components/chat/MessageQueue.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:57] - [ARCH]
What: Moved the chat plan sticky tracker to shared chat.
Why: Phase 3-A/B is removing Studio-owned chat UI imports from Spaces while preserving active plan tracking behavior.
Impact: No behavior changed. Added shared active-plan selection coverage, kept the old Studio tracker path as a compatibility re-export, rewired `SpaceVibeyChatPanel` to the shared tracker, and cleaned moved tracker classes to existing globals utilities. Focused tests, focused ESLint, full web typecheck, import scans, style scan, and LOC checks passed.
Files: `apps/web/src/components/chat/PlanStickyTracker.tsx`, `apps/web/src/components/chat/PlanStickyTracker.test.ts`, `apps/web/src/features/studio/components/chat/PlanStickyTracker.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 20:59] - [ARCH]
What: Moved chat stream error handling config to shared chat.
Why: Phase 3-A is removing Studio-owned config imports from Spaces while preserving stream failure classification and send-toast copy.
Impact: No behavior changed. Added shared config coverage, kept the old Studio config path as a compatibility re-export, and rewired `SpaceVibeyChatPanel` to the shared config. Shared and compatibility config tests, focused chat tests, focused ESLint, full web typecheck, import scans, and LOC checks passed.
Files: `apps/web/src/lib/chat/chat-stream-errors.config.ts`, `apps/web/src/lib/chat/chat-stream-errors.config.test.ts`, `apps/web/src/features/studio/config/chat-stream-errors.config.ts`, `apps/web/src/features/studio/config/chat-stream-errors.config.test.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 21:02] - [ARCH]
What: Moved the active artifact selection signal to shared chat.
Why: Phase 3-A is removing Studio-owned hook/type imports from Spaces while preserving artifact selection context sent with chat messages.
Impact: No behavior changed. Added shared hook coverage, kept the old Studio hook path as a compatibility re-export, moved the selected-artifact contract to shared chat, updated Studio types to re-export it, and rewired `SpaceVibeyChatPanel` to the shared hook. Focused tests, focused ESLint, full web typecheck, import scans, and LOC checks passed.
Files: `apps/web/src/lib/chat/ui-selected-artifact.ts`, `apps/web/src/lib/chat/use-active-artifact-selection-signal.ts`, `apps/web/src/lib/chat/use-active-artifact-selection-signal.test.tsx`, `apps/web/src/features/studio/hooks/useActiveArtifactSelectionSignal.ts`, `apps/web/src/features/studio/types/index.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 21:05] - [ARCH]
What: Moved the composer active-run tip card to shared chat.
Why: Phase 3-A/B is removing Studio-owned chat UI imports from Spaces without pulling Studio store access into shared components.
Impact: No behavior changed. Added shared component coverage, split the shared tip card to accept `isStreaming`, kept the old Studio path as a store-backed wrapper, moved the typewriter/tip config to shared paths, and rewired `SpaceVibeyChatPanel` to pass its existing streaming state. Focused tests, focused ESLint, full web typecheck, import scans, style scan, and LOC checks passed.
Files: `apps/web/src/components/chat/ComposerActiveRunTipCard.tsx`, `apps/web/src/components/chat/ComposerActiveRunTipCard.test.tsx`, `apps/web/src/components/chat/TypewriterTipReveal.tsx`, `apps/web/src/lib/chat/composer-active-run-tips.ts`, `apps/web/src/features/studio/components/chat/ComposerActiveRunTipCard.tsx`, `apps/web/src/features/studio/components/chat/TypewriterTipReveal.tsx`, `apps/web/src/features/studio/config/composer-active-run-tips.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 21:12] - [DOCS]
What: Updated the architecture remediation skill with a frontend runtime verification guard.
Why: Phase 3 apps/web cleanup needs mounted React coverage and render-stability/browser checks for state, effect, store, context, chat, router, and provider changes; typecheck, ESLint, and pure helper tests alone do not catch render loops.
Impact: No app behavior changed. Future Phase 3 batches now require mounted Testing Library characterization, render-stability assertions where relevant, and browser/dev-server smoke verification for risky frontend surfaces or an explicit verification gap.
Files: `.agents/skills/architecture-compliance-remediation/SKILL.md`, `.agents/skills/architecture-compliance-remediation/agents/openai.yaml`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 22:02] - [FIX]

What: Stopped ChatInput floating-menu layout effects from clearing `@floating-ui` references on every composer keystroke while slash/@ menus are closed, and guarded slash-item state updates against no-op array churn.
Why: Runtime probes showed 1.5k–7k renders/sec (`CI-RR`), `FM-A`/`FM-B` firing continuously with menus closed, and React #185 when opening the model picker; closed-menu layout effects were calling `setReference(null)` on every `value`/`slashItems` change and re-triggering `useFloating`.
Impact: Slash/@ positioning only runs while menus are open; reference clearing runs only on close; slash fetch/sync no longer replaces stable item arrays unnecessarily. Debug instrumentation kept for verification.
Files: `apps/web/src/features/studio/components/ChatInput/use-chat-input-floating-menus.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-slash-data.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 22:08] - [UTIL]

What: Added triangulation render/effect storm probes across all ChatInput hooks, sub-components, and related providers (`RS-*` render storms, `RE-*` effect storms).
Why: Repeated freeze on model dropdown needed one-shot instrumentation to identify the exact hook/effect driving the loop instead of guessing.
Impact: No product behavior change. Reproducing the freeze now emits `render_storm` / `effect_storm` log lines with a unique `probe_id` pointing at the culprit file.
Files: `apps/web/src/lib/debug/chat-input-debug-probes.ts`, `apps/web/src/features/studio/components/ChatInput/**`, `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/hooks/useLiveContextEstimate.ts`, `apps/web/src/features/composer/pasted-text/use-pasted-text-blocks.ts`, `apps/web/src/lib/settings/workspace-settings-modal-context.tsx`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 22:24] - [FIX]

What: Restored eager ChatInput model loading while keeping the render-loop guards.
Why: Lazy-loading made the model picker open with only strategy rows, and an empty cached model response could keep the picker stuck without standard model rows.
Impact: ChatInput now starts loading models on mount, uses a ChatInput-specific model cache key, treats empty model results as retryable, and retries on dropdown open after an empty or failed eager load. Focused model hook tests, web typecheck, and production build passed.
Files: `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-options.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-options.test.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 22:27] - [FIX]

What: Restored measured ChatInput model dropdown placement.
Why: The freeze mitigation replaced live measurement with the max dropdown height, which overestimated the menu size and pushed the model menu far above its trigger.
Impact: The menu now positions from its rendered height while the removed ResizeObserver feedback loop stays removed.
Files: `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-menu.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-menu.test.ts`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 23:23] - [FIX]

What: Taught Loop's `/flows` context to include backend-derived build continuation state and corrected the stale direct Flow draft trigger example.
Why: A UI-started Flow build session can be active before a `FlowBuildPlan` exists; Loop only saw a generic active-session signal and could skip to validate/compile instead of drafting the plan.
Impact: Loop now receives `flow_build_required_next_action`, session status, plan presence, and inspector stage, so intake sessions route to `create_flow_plan` while validated sessions route to `compile_flow_plan`. Generated Flow docs no longer teach `task_status_changed`.
Files: `apps/web/src/features/flows/lib/flows-loop-awareness-context.ts`, `apps/web/src/features/flows/lib/flows-loop-awareness-context.test.ts`, `apps/web/src/features/flows/containers/FlowsPage.tsx`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-action-exposure.tdd.test.ts`, `documentation/features/flows-custom-workflows-v2-plan.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-22.md`

## [2026-06-22 22:40] - [FIX]

What: Fixed ChatInput model rows not applying after the models API returned data.
Why: React dev StrictMode can run effect cleanup and setup again on the same hook instance; the model loader cleanup set `mountedRef` to `false` but setup never restored it to `true`, so resolved model responses could be ignored as if the component was unmounted.
Impact: ChatInput now restores the mounted flag during effect setup, allowing the 14 returned models to apply to the picker after dev restarts and StrictMode effect reruns. Added regression coverage for StrictMode model loading; focused model hook tests and web typecheck passed.
Files: `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-options.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-model-options.test.ts`, `.docs/logs/changelog2026-06-22.md`
