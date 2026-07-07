# Changelog - June 23, 2026

## [2026-06-23 20:56] - [FIX]

What: Made the Flows manage editor step map and step editor panels scroll when a flow has many steps.
Why: The two-column editor grid expanded with content instead of constraining height, so steps beyond ~4 were clipped with no scroll.
Impact: Flow editor columns now use bounded grid rows and `overflow-y-auto`, so both the Flow step list and the selected-step editor scroll independently.
Files: `AutomationRuleEditor.tsx`, `FlowsShell.tsx`

## [2026-06-23 18:30] - [FIX]

What: Formatted Loop build Plan intent text and tightened create_flow_plan so workflow detail belongs in Steps, not intent prose.
Why: Plan intent rendered as a wall of text and Loop could save narrative-only plans with empty trigger/actions.
Impact: Build inspector renders intent with markdown/paragraph breaks; warns on narrative-only plans; new plans get validation_errors when intent is overloaded or steps are missing; Loop schema/docs/instructions require short intent plus trigger/actions.
Files: `FlowBuildInspector.tsx`, `FlowBuildPlanIntent.tsx`, `flow-build-plan-intent.utils.ts`, `errors.config.ts`, `artifact-flow-builder-plan.util.ts`, `artifact-action-schemas.ts`, `vibey-api-action-docs.ts`, `agent-instruction-contracts.ts`, `flows-loop-awareness-context.ts`

## [2026-06-23 18:10] - [FIX]

What: Repaired broken `@vibey/website` dev startup after stale `next` symlink in `node_modules`.
Why: `apps/website/node_modules/next` pointed to a removed pnpm store path, so `next dev` could not resolve `dist/bin/next`.
Impact: `pnpm dev:website` starts again after `pnpm install`; Next.js 15.5.12 serves on port 3010.
Files: dependency link repair (no code change)

## [2026-06-23 18:07] - [FIX]

What: Locked protected system-agent access edits and added Loop ownership for space-alignment actions.
Why: Loop is platform-managed like Vibey, Atlas, and HR, so users should not be able to change its policy access, while Loop still needs to create/update space fields and task items for flow setup.
Impact: Protected system-agent policy overrides and skill overrides are rejected server-side; composer/team access switches render read-only for protected agents; Loop can search space context and create/update space fields and task items without delete/comment task permissions.
Files: `AgentTeamPolicyWorkflowService`, `ChatInputPlusMenuView`, `useChatInputComposerAccess`, `AgentInfoAccessTab`, `agent-policy action-contracts`, `artifact-capability.policy`, focused policy/RBAC tests

## [2026-06-23 18:05] - [FIX]

What: Routed agent-facing `transcribe_audio` calls through the legacy `analyze_video` backend payload.
Why: Some running artifact backends still reject `transcribe_audio` as an unknown action even after the OpenClaw tool schema accepts it.
Impact: Agents can keep calling `transcribe_audio(media_url)` while the plugin sends `analyze_video` with `extract_frames:false` and `transcribe:true` to the backend transcription path.
Files: `docker/tools/vibey-backend/index.ts`, `vibey-backend-plugin.test.ts`

## [2026-06-23 17:59] - [ARCH]

What: Refreshed Loop's production guidance around the current Flow capability graph.
Why: Loop still had stale version-framed identity and role text that taught it to reject platform-capable workflow requests as old catalog misses.
Impact: Loop now loads build context first, distinguishes compile-ready `space_automation` steps from `agent_action.*` runtime-bridge candidates, and handles Brain crystallization as a bridge/blueprint case instead of an unsupported version case.
Files: `docker/agents/.../loop`, `supabase/migrations/20260623145349_loop_production_flow_guidance.sql`, `documentation/features/spaces-automation.md`

## [2026-06-23 17:57] - [FIX]

What: Backfilled `transcribe_audio` into scoped backend tool allowlists when an agent already has `analyze_video`.
Why: Existing per-agent `ALLOWED_ACTIONS.json` files were generated before `transcribe_audio`, so `campaign_capability` rejected valid audio transcription calls at JSON-schema validation.
Impact: Stale agent workspaces with media analysis permission now expose `transcribe_audio` in the tool enum without broadening unrelated agents; focused plugin/OpenClaw schema tests pass.
Files: `docker/tools/vibey-backend/index.ts`, `vibey-backend-plugin.test.ts`

## [2026-06-23 17:44] - [ARCH]

What: Moved Studio chat deliverable preview contracts and resend toast config to shared frontend boundaries.
Why: Type 3-E cleanup should use `@/lib/missions` and `@/lib/chat` instead of importing Mission Control or Studio compatibility config paths.
Impact: Studio chat/message-bubble files no longer import Mission Control types directly; Mission Control keeps compatibility re-exports; focused tests pass and only the existing `ChatInterface.tsx` max-lines debt remains in targeted lint.
Files: `mission-types.ts`, `apps/web/src/lib/missions/index.ts`, `ChatInterface.tsx`, `message-bubble.types.ts`, `MessageBubbleOrderedBlocks.tsx`, `chat-toast-errors.config.test.ts`, `frontend-shared-surfaces.md`, `architecture-compliance-remediation.md`, `agent-follow-up-work.md`

## [2026-06-23 17:35] - [FEATURE]

What: Loop composer space selector tray now hides after the first message is sent in a conversation.
Why: Space picking is only needed when starting a new Loop chat; ongoing conversations should not show the gray accessory strip.
Impact: `composerTopAccessory` (space dropdown + tray) shows only while the active conversation has zero messages; reappears on new conversation.
Files: `TeamHrSideChatPanel.tsx`

## [2026-06-23 17:32] - [STYLE]

What: Added horizontal inset to Flows campaign/space dropdown menus so the purple glass selected row is not flush to the panel edges.
Why: Selected items looked cramped edge-to-edge; a little left/right breathing room reads cleaner.
Impact: Campaign breadcrumb, space breadcrumb, and Loop composer space dropdowns use `px-spacing-1` on the menu content area.
Files: `FlowsCampaignBreadcrumbDropdown.tsx`, `FlowsSpaceFilterBreadcrumbDropdown.tsx`, `FlowComposerSpaceSelector.tsx`

## [2026-06-23 17:30] - [FEATURE]

What: Added a search bar to the Loop composer Space dropdown with auto-focus on open.
Why: Users should be able to type immediately to find a space instead of scrolling grouped lists.
Impact: Dropdown opens with cursor in search; filters spaces and campaign groups; matching groups auto-expand; shows empty state when nothing matches.
Files: `FlowComposerSpaceSelector.tsx`, `FlowComposerSpaceSelector.test.tsx`

## [2026-06-23 17:29] - [STYLE]

What: Removed uppercase styling from Flows space breadcrumb dropdown category headers.
Why: Campaign/category labels should use natural title casing, matching the Loop Space composer dropdown.
Impact: "All spaces" filter and space breadcrumb dropdowns show campaign names and "Other" in normal case.
Files: `FlowsSpaceFilterBreadcrumbDropdown.tsx`, `FlowsSpaceBreadcrumbDropdown.tsx`

## [2026-06-23 17:27] - [FEATURE]

What: Loop Space dropdown trigger now shows the active space title instead of the generic "Space" label.
Why: When viewing a space (e.g. Development), the composer should reflect which space Loop is scoped to.
Impact: Selected space name appears in the dropdown trigger; falls back to "Space" when none is selected.
Files: `FlowComposerSpaceSelector.tsx`, `FlowComposerSpaceSelector.test.tsx`

## [2026-06-23 17:30] - [STYLE]

What: Centered the brain scope dropdown tree-line under its chevron and added campaign-grouped chevron sections with the centered tree-line to the Flows "All spaces" breadcrumb dropdown.
Why: User wants the connecting line directly below the chevron (90deg) in the brain dropdown, and the same grouped-by-campaign tree treatment in the Flows space breadcrumb. The campaigns breadcrumb stays flat (campaigns have no sub-groups).
Impact: Brain dropdown line now uses `ml-spacing-3-5` (14px, chevron center). Flows space breadcrumb groups spaces by campaign with collapsible uppercase headers + centered `border-l` line, matching the Loop Space selector.
Files: `BrainScopeBreadcrumbDropdown.tsx`, `FlowsSpaceFilterBreadcrumbDropdown.tsx`

## [2026-06-23 17:26] - [ARCH]

What: Moved remaining ChatInput hook toast-config imports to the shared chat config.
Why: Type 3-E frontend shared surfaces should use `@/lib/chat` contracts directly instead of Studio compatibility config paths.
Impact: File upload, external attachment, composer access, and cloud attach hooks keep the same toast messages and limits while clearing the old Studio config import from the ChatInput folder.
Files: `use-chat-input-file-upload.ts`, `use-chat-input-external-attachments.ts`, `use-chat-input-external-attachments.test.ts`, `use-chat-input-composer-access.ts`, `use-chat-input-cloud-attach.ts`, `use-chat-input-cloud-attach.test.ts`, `architecture-compliance-remediation.md`, `agent-follow-up-work.md`, `frontend-shared-surfaces.md`

## [2026-06-23 17:25] - [STYLE]

What: Removed uppercase styling from Loop Space dropdown category headers.
Why: Campaign/category labels were forced to all caps; user wants normal title casing.
Impact: Category headers (campaign names, "Other spaces") render in their natural case.
Files: `FlowComposerSpaceSelector.tsx`

## [2026-06-23 17:21] - [STYLE]

What: Matched Loop Space dropdown category label size to the brain dropdown (10px).
Why: Category headers used `typo-caption` (12px) while the brain scope dropdown uses 10px, so the text looked larger.
Impact: Category headers now use `typo-xs font-medium` (10px) to match the brain dropdown.
Files: `FlowComposerSpaceSelector.tsx`

## [2026-06-23 17:06] - [STYLE]

What: Added the brain-dropdown tree-line to the Loop Space dropdown, centered on the category chevron.
Why: User wants the same collapsible category + left connecting line as the brain scope dropdown, with the line aligned to the chevron center (90deg).
Impact: Expanded space groups now show a `border-l` guide line at 14px (chevron center = 8px header padding + half of the 12px icon-xs). Added `ml-spacing-3-5` utility (token `--spacing-3-5` already existed) to apps/web globals.
Files: `FlowComposerSpaceSelector.tsx`, `globals.css`

## [2026-06-23 16:59] - [FIX]

What: Loop Space dropdown now opens upward from the trigger.
Why: The selector sits at the top of the input, so a downward-opening menu overlapped the input; it should expand above the trigger.
Impact: Panel is anchored by its bottom edge just above the trigger and grows upward.
Files: `FlowComposerSpaceSelector.tsx`

## [2026-06-23 16:57] - [REFACTOR]

What: Replaced the fused composer-shell approach with a plain gray tray behind the untouched Spaces ChatInput in the Loop chat.
Why: The fused shell altered the ChatInput chrome (padding/borders/rounding) so it no longer matched the Spaces input; the reference is the standard input card with a gray tray peeking at the top holding one inline Space dropdown.
Impact: Loop composer now renders the identical Spaces ChatInput (same mic, context meter, send, model picker, classes, tokens, gaps, paddings) inside a `bg-secondary rounded-2xl` tray; the Space dropdown is a flat inline control on the gray strip. Removed `composerHeaderSlot` from ChatInput/shell/types, the `input-glass-composer-fused` utility, and its test.
Files: `chat-input-shell.tsx`, `ChatInput.tsx`, `chat-input.types.ts`, `chat-input-shell.test.tsx`, `globals.css`, `TeamHrSideChatPanel.tsx`, `FlowComposerSpaceSelector.tsx`

## [2026-06-23 16:47] - [FIX]

What: Restored Spaces-equivalent inner padding on the fused Loop composer body.
Why: `input-glass-composer-fused` zeroed shell padding so the gray bar could be full-bleed, but that also jammed the textarea/footer against the edges, making Flows look broken next to the Spaces input.
Impact: Flows input body now uses the same px-spacing-4/py-spacing-3 padding as the Spaces input-glass, while the gray Space bar stays full-width.
Files: `chat-input-shell.tsx`

## [2026-06-23 16:41] - [STYLE]

What: Matched Loop space bar to reference — chevron pinned far-right across the full bar width and a thin divider line above the input.
Why: Trigger bunched icon+label+chevron on the left and had no divider, not matching the sent reference.
Impact: Gray bar now shows icon + "Space" on the left, chevron on the far right, with a subtle border-b divider to the input.
Files: `FlowComposerSpaceSelector.tsx`, `chat-input-shell.tsx`

## [2026-06-23 16:13] - [FIX]

What: Moved Loop space strip into the ChatInput shell via `composerHeaderSlot`.
Why: Wrapping ChatInput in a separate `input-glass-flush` container zeroed border-radius via `inherit` and stripped the normal input chrome, breaking corners and side borders.
Impact: Flows composer matches Spaces input-glass (rounded corners, border, shadow) with a flat gray `bg-secondary` header strip inside; Spaces and other chats unchanged.
Files: `chat-input-shell.tsx`, `ChatInput.tsx`, `chat-input.types.ts`, `TeamHrSideChatPanel.tsx`, `globals.css`, `chat-input-shell.test.tsx`

## [2026-06-23 16:12] - [FIX]

What: Restored Flow History to a fixed-column horizontally scrollable grid.
Why: Content-sized grid columns let long flow names push later run cells under the wrong headers.
Impact: History rows and headers align again, while the run timestamp keeps its full nowrap width inside the side-scroll table.
Files: `AutomationRunsLog.tsx`

## [2026-06-23 16:09] - [FIX]

What: Fixed fused Loop composer chrome so it uses one input-glass shell instead of stacked borders.
Why: A separate outer border plus stripped inner input left side lines without matching background and a visible divider between the space bar and input.
Impact: Flows chat input now shares the same glass border, shadow, and padding model as Spaces, with the gray space strip sitting inside the shell.
Files: `TeamHrSideChatPanel.tsx`

## [2026-06-23 16:06] - [FIX]

What: Replaced the custom Flow History date select with the shared Spaces reporting date-range selector.
Why: Flow History should use the existing date-range control with presets and custom start/end selection instead of a separate simplified dropdown.
Impact: History run filtering now uses the same `time_range`, `custom_start`, and `custom_end` behavior as Spaces reporting while keeping the default scope at all time.
Files: `AutomationRunsToolbar.tsx`, `AutomationRunsLog.tsx`, `AutomationRunsLog.test.tsx`, `spaces-automation.md`

## [2026-06-23 16:06] - [FIX]

What: Simplified Loop space selector label and fixed fused composer side borders.
Why: The trigger showed an extra subtitle line and the accessory bar side borders stopped above the input instead of wrapping both sections.
Impact: Trigger shows icon + Space + chevron only; one outer border wraps the gray bar and chat input as a single unit.
Files: `FlowComposerSpaceSelector.tsx`, `TeamHrSideChatPanel.tsx`, `FlowComposerSpaceSelector.test.tsx`

## [2026-06-23 16:03] - [FIX]

What: Made Flow History rows keep a horizontally scrollable table width instead of truncating the run timestamp.
Why: The `Ran at` column was compressed in the grid, hiding the actual date behind an ellipsis.
Impact: Flow History can scroll sideways when needed, and run timestamps render at their natural width.
Files: `AutomationRunsLog.tsx`

## [2026-06-23 16:02] - [STYLE]

What: Fused Loop space selector into a full-width gray composer bar above the chat input.
Why: The floating glass pill did not match the Codex-style reference; the bar should span input width with flat bottom corners while the dropdown stays inline.
Impact: Space selector sits on a flat `bg-secondary` strip with rounded top only; chat input connects below with flat top corners. Dropdown trigger is plain inline text, not a glass pill.
Files: `TeamHrSideChatPanel.tsx`, `FlowComposerSpaceSelector.tsx`

## [2026-06-23 15:59] - [FIX]

What: Switched Flow History grouping to the existing Manage group-by button and popover.
Why: History should not introduce a separate dropdown treatment when Manage already defines the Flow toolbar grouping pattern.
Impact: History keeps campaign, Space, flow, status, and time grouping while matching the Manage toolbar look and behavior.
Files: `AutomationRunsToolbar.tsx`, `AutomationRunsLog.tsx`, `FlowsGroupByButton.tsx`, `FlowsGroupByToolbarPopover.tsx`

## [2026-06-23 15:50] - [FEATURE]

What: Added Manage-style controls and context columns to Flow History.
Why: History needed to browse org-wide runs like Manage, not behave like a template picker or space-only empty state.
Impact: Flow History now shows flow, campaign, Space, status, trigger, action count, error, and run time, with search plus status/date filters and grouping by campaign, Space, flow, status, or time.
Files: `AutomationRunsLog.tsx`, `AutomationRunsToolbar.tsx`, `AutomationRunsLog.test.tsx`, `FlowsHistoryView.tsx`, `FlowsPage.tsx`, `flows-ui-labels.ts`, `spaces-automation.md`

## [2026-06-23 14:35] - [FEATURE]

What: Added a first-class `transcribe_audio` agent action for uploaded audio and voice notes.
Why: Audio-only OGG/Opus files were being routed through the video-named `analyze_video` action, which worked but gave agents the wrong contract.
Impact: Agents now see/use `transcribe_audio(media_url)` for audio files; runtime still reuses the existing ffmpeg-to-MP3 and Deepgram Nova-3 transcription path with transcript segments and usage tracking.
Files: `artifact-missions-media-video.service.ts`, `artifact-missions-media.service.ts`, `artifact-action-*.ts`, `artifact-action.dto.ts`, `vibey-api-action-docs.ts`, `chat-document-context.service.ts`, `channel-agent-input.service.ts`, `packages/agent-policy`, `docker/tools/vibey-backend/index.ts`

## [2026-06-23 14:15] - [UTIL]

What: Upgraded `@composio/core` from `^0.10.0` to `^0.11.0` in `@vibey/api`.
Why: Composio SDK reported 0.10.0 behind latest 0.11.0 at dev startup.
Impact: Removes upgrade nag; composio service tests pass.
Files: `apps/api/package.json`, `pnpm-lock.yaml`

## [2026-06-23 15:59] - [STYLE]

What: Redesigned Loop chat space selector as a compact inline pill with collapsible campaign categories.
Why: Full-width attached bar did not match the Codex-inspired inline dropdown pattern requested for composer controls.
Impact: Space picker sits inline above chat; menu opens downward with uppercase category headers and chevron expand/collapse.
Files: `FlowComposerSpaceSelector.tsx`, `TeamHrSideChatPanel.tsx`, `FlowComposerSpaceSelector.test.tsx`

## [2026-06-23 14:48] - [FEATURE]

What: Added validation attention alert on incomplete flow manage cards with a detail modal.
Why: Users couldn't see publish blockers from the card grid without opening each flow.
Impact: Bottom-left alert on incomplete draft/published cards opens validation errors with Go back or Ask Loop to fix.
Files: `flow-needs-attention.ts`, `FlowCardAttentionAlert.tsx`, `FlowValidationAttentionModal.tsx`, `FlowsManageGridView.tsx`, `FlowsPage.tsx`, `errors.config.ts`

## [2026-06-23 14:25] - [STYLE]

What: Capitalized the empty flow description prompt to "+ Add description".
Why: Match requested label casing.
Impact: Empty description placeholder copy only.
Files: `flows-ui-labels.ts`

## [2026-06-23 14:24] - [FEATURE]

What: Added inline flow description editing below the title in the flow editor header.
Why: Users need a lightweight way to add context without leaving the editor.
Impact: Empty flows show "+ add description"; clicking opens a small popover; saved text displays as one truncated line.
Files: `FlowsInlineDescriptionField.tsx`, `FlowsEditorPanel.tsx`, `FlowsPage.tsx`, `flows-ui-labels.ts`

## [2026-06-23 14:15] - [STYLE]

What: Replaced manage flow status chips with a colored dot beside the title and hover tooltip.
Why: Status badges were visually heavy; a dot next to the name reads cleaner while staying discoverable.
Impact: Published, paused, and draft flows in grid/list manage views show Draft/Published/Paused on dot hover.
Files: `FlowStatusDot.tsx`, `FlowsManageGridView.tsx`, `FlowsManageListView.tsx`

## [2026-06-23 14:14] - [FEATURE]

What: Added hover tooltips to draft card plan, draft, and session icon buttons.
Why: Native title attributes were easy to miss; other flows toolbar controls already use the shared Tooltip.
Impact: Each action shows Plan/Draft/Session on hover, or the existing unavailable reason when disabled.
Files: `FlowDraftCardActions.tsx`

## [2026-06-23 14:13] - [FIX]

What: Group-by toolbar chip now shows Space and Campaign labels when those modes are active.
Why: `FlowsGroupByButton` label map omitted the newer group-by options, so the chip stayed on generic "Group by".
Impact: Campaign and space grouping show the purple active chip like status/trigger/on-off.
Files: `FlowsGroupByButton.tsx`

## [2026-06-23 14:12] - [FIX]

What: Draft flows and orphan loop builds now respect campaign/space group-by in flows manage.
Why: Grouping only applied to published flows, leaving drafts in a separate Drafts section.
Impact: Campaign and space grouping merges drafts into their matching groups; status grouping still keeps the dedicated Drafts section.
Files: `flows-grouping.ts`, `flows-grouping.test.ts`, `flows-page.types.ts`, `FlowsPage.tsx`, `FlowsManagePanel.tsx`, `FlowsManageGridView.tsx`, `FlowsManageListView.tsx`

## [2026-06-23 14:11] - [STYLE]

What: Removed the top border divider above draft card action buttons in flows manage grid.
Why: Divider was unnecessary after switching those controls to bare icon buttons.
Impact: Plan, draft, and session buttons sit flush below card content with no separator line.
Files: `FlowsManageGridView.tsx`

## [2026-06-23 14:10] - [STYLE]

What: Removed glass styling from flows manage card hover menu and draft action icon buttons.
Why: The glass background on the three-dots menu and plan/draft/session buttons was visually heavy on cards.
Impact: Those controls now use bare icon buttons with hover color only.
Files: `FlowsManageGridView.tsx`, `FlowDraftCardActions.tsx`

## [2026-06-23 14:06] - [FIX]

What: Added native Contacts actions to the OpenClaw `vibey_backend` supported action filter.
Why: Agent API and policy knew about Contacts, but the runtime plugin filtered materialized `ALLOWED_ACTIONS.json` entries against its own hardcoded supported list.
Impact: Regenerated agent `vibey-api` skills can now expose `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `add_contact_note`, `update_contact_note`, `get_contact_activity`, and `list_contact_communications` through `vibey_backend`.
Files: `docker/tools/vibey-backend/index.ts`, `vibey-backend-plugin.test.ts`

## [2026-06-23 13:53] - [STYLE]

What: Shortened reconnect-required chat copy to exactly "This integration needs to be reconnected".
Why: The banner already has a Reconnect action, so the body copy should not repeat instructions.
Impact: Reconnect-required chat failures show the shorter banner text in shared chat and public-agent fallbacks.
Files: `chat-stream-errors.config.ts`, `errors.config.ts`

## [2026-06-23 13:52] - [STYLE]

What: Tightened the reconnect chat banner controls.
Why: The dismiss X should not render as a glass button, and the Reconnect action needed less vertical padding.
Impact: Reconnect uses the compact primary button size, and dismiss uses the bare icon button treatment.
Files: `StreamInterruptedBar.tsx`

## [2026-06-23 13:48] - [FIX]

What: Chat stream auth-token failures now surface as reconnect-required instead of temporary unavailable.
Why: Invalidated Codex/integration tokens do not self-heal with retry; the user must reconnect the integration.
Impact: Backend emits `reconnect_required`; shared chat failure handling shows the existing small banner with a Reconnect action that opens Settings > Integrations and suppresses the generic send-error toast for that case.
Files: `chat-stream-errors.ts`, `chat-stream-errors.config.ts`, `chat.service.ts`, `StreamInterruptedBar.tsx`, `errors.config.ts`

## [2026-06-23 13:20] - [FIX]

What: Removed full conversation token recounting from chat composer draft-only renders.
Why: Space chat typing still spent main-thread time recounting every message for the context meter after each keystroke.
Impact: Conversation token counts are cached per message and recomputed only when token-affecting message data changes; draft typing keeps the meter responsive without blocking the composer. Temporary debug fetch instrumentation was removed from the composer hot path.
Files: `useLiveContextEstimate.ts`, `context-token-counter.ts`, `context-token-counter.test.ts`, `useLiveContextEstimate.test.ts`, `use-chat-input-textarea-controller.ts`

## [2026-06-23 13:17] - [FEATURE]

What: Added agent contact note actions and preflight confirmation guardrails.
Why: Agents need to add/update internal CRM notes, and contact array replacement needs an explicit confirmation signal.
Impact: `add_contact_note` and `update_contact_note` are active agent actions with schema, preflight, docs, RBAC, policy, MCP catalog exposure, and tests. `update_contact` now requires `confirm_replace_arrays: true` when replacing `tags` or `custom_fields`.
Files: `artifact-contact-notes.repository.ts`, `artifact-contacts.service.ts`, `artifact-action-schemas.ts`, `artifact-action-preflight.ts`, `artifact-action-data-normalizer.ts`, `artifact-action.registry.ts`, `artifact-capability.policy.ts`, `artifacts.module.ts`, `artifact-action.dto.ts`, `vibey-api-action-docs.ts`, `packages/agent-policy`

## [2026-06-23 13:12] - [FIX]

What: Fixed API compile errors in org flows controller and spaces module.
Why: `scope.orgId` is `string | null` but `listOrgFlows` requires `string`; `SpaceNotificationsService` was listed in providers without an import.
Impact: `@vibey/api:dev` incremental compile succeeds; org flows endpoint rejects personal context with 403.
Files: `org-automation-flows.controller.ts`, `spaces.module.ts`

## [2026-06-23 13:10] - [FEATURE]

What: Flows opens org-wide by default with breadcrumb filters for campaign and space; Manage lists all flows with group-by space/campaign.
Why: Operators need a single Flows entry point across campaigns/spaces instead of landing in one space.
Impact: `GET /api/automations/flows`; breadcrumbs `Flows / All campaigns / All spaces`; Manage shows cross-space cards with campaign·space labels; Loop/build/browse still require a space filter.
Files: `org-automation-flows.*`, `FlowsPage.tsx`, `FlowsBreadcrumbHeader.tsx`, `FlowsCampaignBreadcrumbDropdown.tsx`, `FlowsSpaceFilterBreadcrumbDropdown.tsx`, `flows-grouping.ts`, `flows.service.ts`, `FlowsManageGridView.tsx`, `FlowsManageListView.tsx`

## [2026-06-23 13:09] - [FEATURE]

What: Added v2 Contacts read actions: `get_contact_activity` and `list_contact_communications`.
Why: Agents need to see a contact's CRM history and communication context across email, widget, Telegram, and app conversations.
Impact: Agents can read contact timelines, email summaries/bodies when requested, linked conversations, and suggested conversations with hard schemas, docs, RBAC, policy, MCP catalog exposure, and focused tests.
Files: `artifact-contact-timeline.repository.ts`, `artifact-contacts.service.ts`, `artifact-contacts.service.test.ts`, `artifact-action-schemas.ts`, `artifact-action-schemas.test.ts`, `artifact-action.registry.ts`, `artifact-capability.policy.ts`, `artifacts.service.rbac.test.ts`, `vibey-api-action-docs.ts`, `packages/agent-policy`

## [2026-06-23 13:02] - [FIX]

What: Manage Drafts section now includes in-progress Loop build sessions, not only compiled `space_automation` drafts.
Why: Hadassah had a Loop build at intake with zero automation rows, so Manage showed "No flows yet" despite an active build.
Impact: Orphan build sessions render in Drafts with Plan enabled; Draft/Session disabled until compiled or linked to a conversation.
Files: `map-flow-draft-build-links.ts`, `FlowsPage.tsx`, `FlowsManagePanel.tsx`, `FlowsManageGridView.tsx`, `FlowsManageListView.tsx`, `FlowDraftCardActions.tsx`, `flows-ui-labels.ts`, `flows-page.types.ts`, `FlowsGroupSectionHeader.tsx`

## [2026-06-23 12:55] - [FEATURE]

What: Added native agent Contacts actions: `list_contacts`, `get_contact`, `create_contact`, and `update_contact`.
Why: Contacts are org-scoped CRM records and need a dedicated action family instead of being routed through Tasks, Spaces, or Customer Brain.
Impact: Agents can list/read/create/update CRM contacts with hard schemas, create-time email preflight, lifecycle/preflight coverage, RBAC policy, MCP catalog exposure, and action docs. `create_contact` is intentionally limited to `email`, `first_name`, `last_name`, and `phone`; richer CRM fields belong on `update_contact`.
Files: `artifact-contacts.service.ts`, `artifact-contacts.repository.ts`, `artifact-action-schemas.ts`, `artifact-action-preflight.ts`, `artifact-action.registry.ts`, `artifact-capability.policy.ts`, `artifacts.service.ts`, `artifacts.module.ts`, `artifact-action.dto.ts`, `vibey-api-action-docs.ts`, `packages/agent-policy`

## [2026-06-23 12:51] - [FEATURE]

What: Manage tab shows drafts in a dedicated Drafts section with Plan, Draft, and Session actions per card.
Why: Operators need to jump from draft inventory to Loop build plan, flow editor, or originating conversation without hunting sessions.
Impact: `GET .../build-sessions` lists session links; draft cards open Build inspector, editor, or Loop chat via `loop-chat:select-conversation`.
Files: `space-flow-builder.repository.ts`, `space-flow-builder.service.ts`, `space-flow-build-sessions.controller.ts`, `FlowsPage.tsx`, `FlowsManagePanel.tsx`, `FlowsManageGridView.tsx`, `FlowsManageListView.tsx`, `FlowDraftCardActions.tsx`, `use-flow-build-sessions-list.ts`, `map-flow-draft-build-links.ts`, `loop-chat-conversation.ts`, `TeamHrSideChatPanel.tsx`, `flows-ui-labels.ts`, `FlowBuildInspector.tsx`

## [2026-06-23 13:10] - [FIX]

What: Chat composer lag — stop recounting all conversation tokens on every keystroke; defer context meter draft updates.
Why: Space chat input re-ran full message token counting on each key and menu interaction inside the composer, blocking the main thread (delay grew with longer drafts / busy threads).
Impact: Typing and composer menus (+ / model picker) should feel instant; context meter updates slightly behind while typing.
Files: `useLiveContextEstimate.ts`, `use-chat-input-context-meter-data.ts`, `use-chat-input-textarea-controller.ts`

## [2026-06-23 13:05] - [FIX]

What: Toolbar search uses local draft + debounced filter; QuickAdd title input isolated in memo child so keystrokes don't re-render composer.
Why: Post-fix logs showed no cell/updateItem activity — lag matched parent-controlled toolbar search and heavy QuickAdd re-renders.
Impact: Instant keystrokes in dock search and Add task composer; list filter updates after 150ms debounce.
Files: `SpaceQuickFilterDock.tsx`, `SpaceQuickAdd.tsx`

## [2026-06-23 12:55] - [FIX]

What: Spaces typing lag — TextCell commits on blur with local draft; SpaceQuickAdd memoizes composer toolbar cells; SpaceItemRow memoized.
Why: Keystrokes re-rendered heavy list rows / composer cells before input updated; inline text fields synced to store on every key.
Impact: Faster Add task composer and inline text field editing in Spaces list.
Files: `TextCell.tsx`, `SpaceQuickAdd.tsx`, `SpaceItemRow.tsx`

## [2026-06-23 12:50] - [DOCS]

What: Added debug instrumentation for Spaces input typing lag (TextCell, updateItem, ListView, PromptTemplateEditor).
Why: User reports delayed character appearance while typing in Spaces; need runtime evidence before fixing.
Impact: Temporary fetch logs to `.cursor/debug-9bfce5.log` during reproduction; no behavior change.
Files: `TextCell.tsx`, `use-spaces-store.ts`, `ListView.tsx`, `PromptTemplateEditor.tsx`

## [2026-06-23 11:35] - [FIX]

What: Flow Build tab/inspector resolves build session by active Loop conversation, not latest space session.
Why: Starting a new build replaced the inspector with the new empty session; switching back to a prior Loop thread lost draft/plan state.
Impact: `conversation_id` on `project_flow_build_session`; latest API accepts `conversation_id`; UI listens to Loop conversation changes; Loop tools link sessions to conversations.
Files: `supabase/migrations/20260623113000_flow_build_session_conversation_id.sql`, `space-flow-builder.*`, `artifact-flow-builder-*`, `use-flow-build-session.ts`, `FlowsPage.tsx`, `TeamHrSideChatPanel.tsx`, `loop-chat-conversation.ts`

## [2026-06-23 11:10] - [STYLE]

What: "Ask Loop to fix" vertically centered against title + error description block.
Why: Button should sit mid-height of the full validation message, not only beside the description.
Impact: Editor footer and build inspector validation sections.
Files: `FlowsEditorPanel.tsx`, `FlowBuildInspector.tsx`

## [2026-06-23 15:54] - [FEATURE]

What: Added an attached Loop space selector above the Flow chat composer.
Why: Users need to choose a Space from the chat itself before starting Loop, instead of relying on the breadcrumb.
Impact: The Flow composer now shows a compact Space card above the input, grouped by campaign and attached to the input chrome; selecting a Space unlocks the existing Loop build flow.
Files: `FlowComposerSpaceSelector.tsx`, `FlowComposerSpaceSelector.test.tsx`, `FlowsPage.tsx`, `TeamHrSideChatLayout.tsx`, `TeamHrSideChatPanel.tsx`, `flows-ui-labels.ts`

## [2026-06-23 11:06] - [STYLE]

What: "Ask Loop to fix" sits on the same row as validation error text, right-aligned.
Why: Button should align with the description, not on a separate row beneath it.
Impact: Editor footer and build inspector validation sections.
Files: `FlowsEditorPanel.tsx`, `FlowBuildInspector.tsx`

## [2026-06-23 11:02] - [STYLE]

What: "Ask Loop to fix" moved below validation errors, aligned bottom-right.
Why: Button should sit under the error list, not beside the banner title.
Impact: Editor footer and build inspector validation sections.
Files: `FlowsEditorPanel.tsx`, `FlowBuildInspector.tsx`

## [2026-06-23 10:58] - [FIX]

What: "Ask Loop to fix" uses button-glass-neutral (button-glass class does not exist).
Why: Button rendered as unstyled inline text without a glass color variant.
Impact: Validation action shows as a proper glass button in editor and build inspector.
Files: `FlowsEditorPanel.tsx`, `FlowBuildInspector.tsx`

## [2026-06-23 10:52] - [STYLE]

What: "Ask Loop to fix" validation button is text-only glass (no Sparkles icon).
Why: Match glass button pattern without decorative icon.
Impact: Editor and build inspector validation actions use button-default button-glass.
Files: `FlowsEditorPanel.tsx`, `FlowBuildInspector.tsx`

## [2026-06-23 10:46] - [FEATURE]

What: Flow validation errors use friendly messages from errors.config; "Ask Loop to fix" sends the issue to Loop chat.
Why: Raw Zod paths like actions.3.assignee_type are unreadable; users need one-click help from Loop.
Impact: Editor/build banners show plain-language errors (e.g. Step 4 assignee must be human or agent); button auto-submits a fix prompt to Loop.
Files: `apps/web/src/features/flows/config/errors.config.ts`, `FlowsEditorPanel.tsx`, `FlowBuildInspector.tsx`, `FlowsPage.tsx`

## [2026-06-23 10:18] - [FIX]

What: Removed top padding from prompt insert menu scroll area so sticky section headers sit flush.
Why: Scroll padding left a gap above headers where prior step rows showed through while scrolling.
Impact: Sticky Trigger/Step/Current task headers clip scrolled content correctly.
Files: `PromptTemplateEditor.tsx`

## [2026-06-23 10:12] - [STYLE]

What: Removed source icons from prompt insert menu section headers (Trigger, Step N, Current task).
Why: Cleaner accordion headers; chevron + label + count only.
Impact: Group headline rows no longer show Bot/Mail/etc. icons; item rows unchanged.
Files: `apps/web/src/features/spaces/components/automations/PromptTemplateVarMenu.tsx`

## [2026-06-23 10:05] - [FEATURE]

What: Search input at top of prompt template variable insert dropdown (+ menu and @ mention).
Why: Grouped step menus need quick filtering as variable lists grow.
Impact: Sticky search bar filters accordion groups and flat sections; autofocus on + open; arrow/Enter/Esc from search; clears on close.
Files: `apps/web/src/features/spaces/components/automations/PromptTemplateEditor.tsx`

## [2026-06-23 09:38] - [FEATURE]

What: Flow prompt insert menu groups variables per trigger/step with collapsible sticky headers (Zapier-style accordion).
Why: Flat Suggested list mixed step outputs with task fields and hid step context.
Impact: + menu shows Trigger, Step 1 · Run task with agent, Step 2 · …, Current task; chevron collapses; headers stick while scrolling.
Files: `PromptTemplateVarMenu.tsx`, `PromptTemplateEditor.tsx`, `automation-catalog.ts`, `ActionBuilder.tsx`, `AutomationTaskFieldsEditor.tsx`

## [2026-06-23 09:27] - [FIX]

What: Flow comment prompts show friendly step output labels (e.g. Step 1 agent output); prior-step output appears in the + menu; runtime resolves steps.0/steps.1 output.
Why: Loop inserted raw `steps.0.output` tokens with no menu entry and demo-style preview text.
Impact: Add comment after Run agent offers Step N agent output under From this run; chips read as labels; agent output falls back to mission output at runtime.
Files: `PromptTemplateEditor.tsx`, `automation-catalog.ts`, `space-automation-template.ts`, `space-automation-template.test.ts`, `packages/api-shared/src/types/flow-builder.ts`

## [2026-06-23 09:24] - [FIX]

What: Flow/automation prompt token chips show prefixed field labels (Task Name, Task Status, Task Priority) instead of fake sample text or bare field names.
Why: Task tokens should read as task-scoped fields in create/run task prompts.
Impact: `{{task.title}}` displays as Task Name (from Space schema); other task tokens use `Task {field}`.
Files: `apps/web/src/features/spaces/components/automations/PromptTemplateEditor.tsx`

## [2026-06-23 09:22] - [STYLE]

What: Flow build inspector moves Open draft to the top header; next-action chip (e.g. Ready for review) moves to Plan meta row beside steps/traces/status.
Why: Primary CTA belongs with build title; next-action reads as plan-level state.
Impact: Header shows draft button; Plan row shows compact next-action badge with tooltip.
Files: `apps/web/src/features/flows/components/FlowBuildInspector.tsx`

## [2026-06-23 09:16] - [STYLE]

What: Plan header in Flow build inspector shows steps/traces as icon + count (tooltips) and status as a colored dot (tooltip) top-right.
Why: Compact Plan meta row aligned with evaluation/status layout.
Impact: Steps, traces, and status no longer use text chips in the Plan body.
Files: `apps/web/src/features/flows/components/FlowBuildInspector.tsx`

## [2026-06-23 09:11] - [STYLE]

What: Evaluation strengths/risks and validation errors in Flow build inspector render as bulleted lists with capitalized first letter.
Why: Build tab evaluation copy should read as proper list items.
Impact: Strengths, risks, and validation errors use `list-card-compact` bullets and sentence case.
Files: `apps/web/src/features/flows/components/FlowBuildInspector.tsx`

## [2026-06-23 09:10] - [STYLE]

What: Evaluation score in Flow build inspector moved to top-right as plain text (`Score: A · 85`).
Why: Match Plan status layout in Build tab.
Impact: Evaluation section no longer uses a score chip beside the title.
Files: `apps/web/src/features/flows/components/FlowBuildInspector.tsx`

## [2026-06-23 09:15] - [FIX]

What: Model picker Edit panel now anchors to the right of the OpenAI Subscription submenu instead of the main dropdown.
Why: Opening Edit from subscription models placed the panel on top of the submenu Edit button.
Impact: Context/reasoning controls open further right and stay usable for `openai-codex/*` models.
Files: `apps/web/src/features/studio/utils/model-picker-edit-panel-position.ts`, `use-chat-input-model-menu.ts`, `use-composer-model-picker-positioning.ts`, tests

## [2026-06-23 09:08] - [STYLE]

What: Plan status in Flow build inspector is plain text top-right (`Status: compiled`) instead of a chip beside the title.
Why: Build tab Plan section UI cleanup.
Impact: Status remains visible without badge styling.
Files: `apps/web/src/features/flows/components/FlowBuildInspector.tsx`

## [2026-06-23 09:07] - [STYLE]

What: Removed down arrows between step boxes in Flow build inspector.
Why: Build tab steps UI cleanup.
Impact: Steps list is plain stacked boxes again.
Files: `apps/web/src/features/flows/components/FlowBuildInspector.tsx`

## [2026-06-23 09:06] - [STYLE]

What: Removed source chip (Premade / Custom blueprint) from Flow build inspector step rows.
Why: Build tab steps UI cleanup.
Impact: Step rows show number, title, and description only.
Files: `apps/web/src/features/flows/components/FlowBuildInspector.tsx`

## [2026-06-23 09:05] - [STYLE]

What: Added down arrows between step boxes in Flow build inspector to show execution order.
Why: Build tab steps should read as a sequential flow.
Impact: Each step is followed by a small arrow to the next step (except the last).
Files: `apps/web/src/features/flows/components/FlowBuildInspector.tsx`

## [2026-06-23 09:04] - [STYLE]

What: Removed background from step index numbers in Flow build inspector.
Why: Build tab steps UI cleanup.
Impact: Step numbers render as plain muted text without secondary fill.
Files: `apps/web/src/features/flows/components/FlowBuildInspector.tsx`

## [2026-06-23 09:03] - [STYLE]

What: Flow build inspector step rows no longer show trigger/action kind chip; source chip shows human labels (e.g. Premade).
Why: Build tab steps UI cleanup per product request.
Impact: Steps list shows title + source badge only.
Files: `apps/web/src/features/flows/components/FlowBuildInspector.tsx`

## [2026-06-23 09:02] - [FEATURE]

What: OpenAI Codex subscription models in the model picker now show the same Edit panel as standard models (context tier, thinking toggle, reasoning levels).
Why: Subscription models inherited capability data but the submenu only allowed plain selection with no settings UI.
Impact: Admins with a connected Codex subscription can choose reasoning effort and context size for `openai-codex/*` models in studio chat and composer pickers.
Files: `apps/web/src/features/studio/components/ComposerSubscriptionModelsSubmenu.tsx`, `composer-model-picker-dropdown.tsx`, `ComposerModelPicker.tsx`, `ChatInput/chat-input-model-picker-view.tsx`, `ComposerModelPicker.test.tsx`

## [2026-06-23 08:49] - [FIX]

What: Removed 20% credit discount from PT DOM and Viralish orgs and their owner user profiles in production (`credit_discount_percent` set to 0).
Why: Operator request to clear the commercial credit discount on both accounts.
Impact: PT DOM and Viralish org billing and owner personal billing now charge full credit rates going forward.
Files: Supabase production — `organizations` (pt-dom, viralish), `user_profiles` (brianmark@teamaenation.com, adley@viralish.com)

## [2026-06-23 13:10] - [FEATURE]

What: Added automation support for agent collaboration control and a parallel `send_to_agents` action.
Why: Flow authors need to choose whether task-agent runs can use agent-to-agent tools, and need one flow step that fans work out to multiple agents in parallel.
Impact: `send_to_agent` can disable `ask_agent`, `delegate_to_agent`, and `brainstorm_agents`; `send_to_agents` invokes multiple agents with shared batch metadata and resumes wait-based automations only after all batch agents finish.
Files: `space-automation-action.dto.ts`, `space-automation-service-14.base.ts`, `task-agent.service.ts`, `task-agent-progress.service.ts`, `ActionBuilder.tsx`, `automation-catalog.ts`, `AutomationFlowMap.tsx`, `spaces-automation.md`, tests

## [2026-06-23 13:14] - [STYLE]

What: Renamed the multi-agent automation action label to "Run task with multiple agents".
Why: Product wording should be explicit that the action targets multiple agents.
Impact: The action picker and shared flow capability catalog use the updated label.
Files: `apps/web/src/features/spaces/components/automations/automation-catalog.ts`, `packages/api-shared/src/types/flow-capabilities.ts`

## [2026-06-23 13:15] - [STYLE]

What: Moved "Send to Cursor" from the Run agent action group into an Integrations action group.
Why: Cursor is an external integration workflow, not an in-app agent handoff.
Impact: The automation action picker and shared flow capability catalog categorize Cursor under Integrations.
Files: `apps/web/src/features/spaces/components/automations/automation-catalog.ts`, `packages/api-shared/src/types/flow-capabilities.ts`

## [2026-06-23 13:16] - [STYLE]

What: Changed the automation agent collaboration setting from a select menu to a checkbox row beside its tooltip, matching Extended Brain Knowledge.
Why: Product requested the collaboration toggle to use the same position and interaction pattern as the existing knowledge checkbox.
Impact: `send_to_agent` and `send_to_agents` editors now expose Agent Collaboration as an inline checkbox while preserving their existing default states.
Files: `apps/web/src/features/spaces/components/automations/ActionBuilder.tsx`

## [2026-06-23 13:44] - [FIX]

What: Synced the chat composer Access dropdown with actual agent policy defaults.
Why: The dropdown only read team grants and explicit overrides, so role-default/system access could render off even when the agent could use it.
Impact: Policy responses include role-default action domains, scoped runtime agent IDs resolve to canonical policy keys, and both the main Access UI helper and chat dropdown helper render default access as enabled.
Files: `agent-policy.service.ts`, `agent-team-policy-workflow.service.ts`, `agent-teams.service.ts`, `agent-teams.types.ts`, `agent-access-policy.logic.ts`, `chat-input-policy.ts`, tests

## [2026-06-23 13:45] - [FEATURE]

What: Added Doc-style dropdown menus to Flow Manage grid cards, icon footer controls for draft/build cards, flow descriptions, deep links, and build discard support.
Why: Flow cards needed the same card action affordance as documents while keeping Plan/Draft/Session actions aligned at the bottom of draft/build cards.
Impact: Manage cards now support copy link/ID, new tab, open, rename, duplicate/copy to space, validate, enable/pause/publish, Loop plan/session/update actions, space/campaign/history navigation, delete, and discard build. `space_automations.description` is available in staging and production.
Files: `FlowMenuDropdown.tsx`, `FlowsManageGridView.tsx`, `FlowDraftCardActions.tsx`, `FlowsPage.tsx`, Flow services/types, Space automation DTO, Flow build session API, `spaces-automation.md`, Supabase migration

## [2026-06-23 13:56] - [FIX]

What: Locked protected system-agent access in the Studio chat composer Access dropdown, applied system defaults when fetched policy is empty or unavailable, and moved web system-agent helper consumers to the shared contract.
Why: Vibey, Atlas, Jaime/HR, and Loop access is platform-managed, so their composer access rows should not appear user-editable or off because of missing explicit grants.
Impact: Protected system agents render their matching system action domains as checked and disabled in the chat composer dropdown, including scoped runtime IDs that resolve to canonical agent keys.
Files: `system-agent-contracts.ts`, `system-agent-keys.ts`, `team-system-agent-keys.ts`, `chat-input-policy.ts`, `use-chat-input-composer-access.ts`, `chat-input-plus-menu-view.tsx`, system-agent helper consumers, tests

## [2026-06-23 14:04] - [FIX]

What: Repositioned the Studio chat plus-menu submenus after their content height changes and used measured root-menu height when available.
Why: The Access submenu could first position from a short loading body, then expand downward after policy rows loaded instead of staying aligned above the composer.
Impact: First-open Access, Skills, and integration submenus recalculate when their rendered size changes, so they stay clamped in the available viewport space.
Files: `use-chat-input-plus-menu.ts`, `use-chat-input-plus-menu.test.ts`

## [2026-06-23 14:02] - [FIX]

What: Changed the reconnect-required chat banner button to start OpenAI Codex OAuth directly.
Why: Reconnect-required subscription failures should begin the reconnect flow from the chat banner instead of opening Settings.
Impact: The compact Reconnect button calls `/api/integrations/openai-codex/connect`, opens the returned authorization URL, and no longer dispatches the settings modal event.
Files: `StreamInterruptedBar.tsx`, `StreamInterruptedBar.test.tsx`, `openai-codex-oauth.ts`, `openai-codex-oauth.test.ts`, `chat-stream-errors.config.ts`

## [2026-06-23 14:07] - [FIX]

What: Added early chat context-meter updates before the model stream begins.
Why: The context popover only received system/tools/skills/Brain/artifact slices from the final `done` event, so it showed mostly Conversation while the turn was running.
Impact: Studio streams now emit and consume a `context_update` event with an estimated breakdown, then keep the final `done` breakdown as the authoritative run total.
Files: `chat-context-accounting.service.ts`, `chat-turn-terminal.service.ts`, `chat-service-collaborators.ts`, `stream-events.ts`, `chat.service.ts`, `context-breakdown-panel.md`, tests

## [2026-06-23 14:12] - [FIX]

What: Removed the fixed queued resend delay after stopping a Studio chat stream and targeted stop requests to the active run.
Why: Sending a queued/resend message after Stop waited before optimistic chat rendering, while conversation-scoped stop requests could race with the next run.
Impact: Queued resend now starts the optimistic send immediately, retries transient active-run conflicts briefly, and backend stop ignores stale run-targeted requests instead of cancelling the newer stream.
Files: `ChatInterface.tsx`, `chat.service.ts`, `chat-stream-http.service.ts`, `chat-stream.controller.ts`, `stream-registry.service.ts`, tests

## [2026-06-23 14:30] - [FIX]

What: Repositioned the assistant message action menu to open above the three-dot trigger.
Why: The final message menu could extend downward into the chat composer and increase the scrollable conversation height.
Impact: Assistant message actions now stay above the trigger near the composer, with a focused regression test covering the upward anchor.
Files: `AssistantActions.tsx`, `AssistantActions.test.tsx`

## [2026-06-23 14:38] - [FIX]

What: Cleared the composer model picker hover card when moving from strategy rows to subscription model rows.
Why: Hovering Power opened a details card that stayed visible over rows with no hover details.
Impact: Agents-page and chat model pickers now close the stale strategy card before opening the subscription model submenu.
Files: `ComposerModelPicker.tsx`, `composer-model-picker-dropdown.tsx`, `ComposerSubscriptionModelsSubmenu.tsx`, `chat-input-model-picker-view.tsx`, `ComposerModelPicker.test.tsx`

## [2026-06-23 14:42] - [FIX]

What: Closed the composer model picker after model selection and consumed the first outside click.
Why: Selecting editable models left the menu open, and dismissing it by clicking an agent row also opened that agent.
Impact: Agents-page model selection now closes immediately, while the first outside click only dismisses the dropdown; a second click opens the agent row.
Files: `ComposerModelPicker.tsx`, `use-composer-model-picker-positioning.ts`, `chat-input-model-picker-view.tsx`, `ComposerModelPicker.test.tsx`

## [2026-06-23 14:52] - [FIX]

What: Split Flow Browse and History no-space empty states, added Flow-specific mockups, and gave Browse’s empty template category the same mockup treatment.
Why: History reused the Browse template copy, so the Flow shell told users to browse templates when they were trying to review run history.
Impact: Browse now presents a template mockup and template-specific guidance, while History presents a run-history mockup and history-specific guidance.
Files: `FlowEmptyMockups.tsx`, `FlowEmptyMockups.test.tsx`, `FlowsBrowseView.tsx`, `FlowsBrowseView.test.tsx`, `FlowsPage.tsx`, `flows-ui-labels.ts`

## [2026-06-23 15:33] - [STYLE]

What: Simplified the Flow Browse and History empty-state mockups to one large card each and added a matching Manage empty-state mockup.
Why: The small surrounding cards made the empty states busier than the requested Flow shell treatment.
Impact: Browse, Manage, and History now share the same large-card mockup style, with Manage replacing the previous icon-only empty state.
Files: `FlowEmptyMockups.tsx`, `FlowEmptyMockups.test.tsx`, `FlowsManagePanel.tsx`, `FlowsManagePanel.test.tsx`, `flows-ui-labels.ts`

## [2026-06-23 15:01] - [FIX]

What: Made social research account refresh failures non-fatal after successful account mutations and split People/Topic sidebar title selection from chevron collapse.
Why: A tracked account could be added and shown locally while a later refresh hiccup still surfaced as a failed-add toast, and section titles could only collapse instead of showing the full People or Topic view.
Impact: Account add/sync/remove schema persistence now uses resilient backend retries, refresh failures are logged as warnings after successful persistence, duplicate handles are upserted, People can show all tracked-account content, and Topic search can show all saved searches without collapsing the section.
Files: `use-space-social-account-actions.ts`, `use-all-social-research-account-actions.ts`, `AccordionSection.tsx`, `ResearchSidebar.tsx`, `InstagramResearchView.tsx`, social research tests

## [2026-06-23 15:40] - [DOCS]

What: Added Phase 3-E shared frontend surface registry and public index work to the architecture remediation plan.
Why: Humans and agents need a fast way to discover reusable shared components, contracts, hooks, helpers, and API clients before creating duplicates or importing private feature internals.
Impact: No app behavior changed. Phase 3 now includes a queued structure/discoverability step for `documentation/frontend-shared-surfaces.md`, domain-level shared `index.ts` barrels, and an AGENTS.md pointer after the registry exists.
Files: `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-23.md`

## [2026-06-23 15:42] - [FIX]

What: Made Flow Browse load the full template catalog without a selected space and made Flow History load runs for the selected campaign/space scope.
Why: Browse should show templates from all scopes, and History should show all runs when the breadcrumb is All campaigns / All spaces instead of asking users to select a space.
Impact: Browse now renders templates at all scopes while install/create actions stay disabled until a space is selected. History now calls the org-scoped run API for all-space or campaign scope and preserves the existing space-only run API for the Spaces automation panel.
Files: `org-automation-flows.controller.ts`, `org-automation-flows.service.ts`, `space-automation-read.repository.ts`, `automation-template-api.ts`, `automation-runs-api.ts`, `AutomationRunsLog.tsx`, `FlowsBrowseView.tsx`, `FlowsHistoryView.tsx`, `FlowsPage.tsx`, `spaces-automation.md`, tests

## [2026-06-23 15:50] - [DOCS]

What: Added the Phase 3-E frontend shared surface registry and curated domain public indexes.
Why: Humans and agents need a fast, explicit map of reusable web components, contracts, API clients, helpers, and transitional boundaries before creating duplicates or importing private feature internals.
Impact: No app behavior changed. Stable shared surfaces now have domain-scoped public barrels; transitional modules with private feature imports are documented and excluded until cleaned in their own runtime-guard loops.
Files: `documentation/frontend-shared-surfaces.md`, `AGENTS.md`, `apps/web/src/components/*/index.ts`, `apps/web/src/lib/*/index.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-23.md`

## [2026-06-23 16:00] - [ARCH]

What: Promoted the shared media picker modal after moving its settings dependency to the shared settings context.
Why: `MediaPickerModal` was excluded from `@/components/media` only because it imported the Settings feature compatibility context.
Impact: The modal now imports `@/lib/settings/workspace-settings-modal-context`, has mounted coverage for opening Workspace Settings Integrations, and is available through the media domain barrel.
Files: `MediaPickerModal.tsx`, `MediaPickerModal.test.tsx`, `apps/web/src/components/media/index.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 16:04] - [ARCH]

What: Moved media picker Meta image loading behind the shared artifact API.
Why: The media picker metadata hook still dynamically imported the Studio artifact preview service, keeping a private feature dependency inside the shared media surface.
Impact: `use-media-picker-meta` now calls `@/lib/artifacts/artifact-preview-api`, the Studio service keeps a compatibility re-export, and focused hook/API tests cover loading, failure fallback, and endpoint mapping.
Files: `use-media-picker-meta.ts`, `use-media-picker-meta.test.tsx`, `artifact-preview-api.ts`, `artifact-preview-api.test.ts`, `artifact-preview.service.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 16:09] - [ARCH]

What: Promoted the presigned media upload helper into the shared media barrel.
Why: The helper was excluded from `@/lib/media` because it imported document intelligence metadata through the Studio feature re-export.
Impact: Upload result contracts now use the shared chat document metadata contract directly, and focused helper tests cover uploaded-asset fetch fallback plus concurrent settled-result ordering.
Files: `presigned-client-upload.ts`, `presigned-client-upload.test.ts`, `apps/web/src/lib/media/index.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 16:16] - [ARCH]

What: Promoted shared chat credit exhaustion state into the chat barrel.
Why: `chat-credit-state.ts` no longer imports the Studio store, so it is not a transitional shared boundary anymore.
Impact: Studio still syncs credits-exhausted state through the shared subscription, Team can keep using the shared setter, and the Phase 3-E registry/follow-up log now track only the remaining transitional files.
Files: `chat-credit-state.ts`, `chat-credit-state.test.ts`, `apps/web/src/lib/chat/index.ts`, `use-chat-store.ts`, `use-chat-store.test.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 16:24] - [FIX]

What: Routed non-chat subscription model requests through the same gateway model IDs and runtime credential contract used by chat.
Why: Mission, brain, and automation OpenClaw requests could read saved `openai-codex/*` or `anthropic-subscription/*` agent model IDs but then send them through the OpenRouter namespace without subscription credentials.
Impact: Worker requests now keep Codex subscription IDs off OpenRouter, map Claude subscription IDs to OpenClaw Anthropic IDs, and the artifact OpenClaw proxy attaches admin subscription runtime credentials before forwarding.
Files: `mission-openclaw.gateway.ts`, `mission-tool-access-smoke.test.ts`, `artifact-openclaw-proxy.controller.ts`, `artifacts.controller.test.ts`, `chat.module.ts`

## [2026-06-23 16:24] - [ARCH]

What: Promoted the clarification card into shared chat UI and removed its adapter.
Why: `ClarificationCardAdapter.tsx` was a shared-path wrapper that still re-exported a Studio-owned component.
Impact: Flow clarifications now import `ClarificationCard` from `@/components/chat`, Studio keeps a compatibility re-export, and the shared card is split below the 400-line component cap with focused mounted coverage.
Files: `ClarificationCard.tsx`, `clarification-card-question-step.tsx`, `ClarificationCard.test.tsx`, `FlowClarificationsView.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 16:41] - [ARCH]

What: Split and promoted the Dropbox file browser shared media surface.
Why: `DropboxFileBrowserModal.tsx` was 1031 LOC and excluded from the media barrel until it had focused runtime coverage and subcomponent boundaries.
Impact: The public Dropbox modal wrapper now delegates to media-local panel/table/gallery/toolbar/footer/hooks below frontend limits, mounted coverage locks listing/search/navigation/batch import behavior, and the modal is exported from `@/components/media`.
Files: `DropboxFileBrowserModal.tsx`, `DropboxFileBrowserPanel.tsx`, `DropboxFileBrowserModal.test.tsx`, `DropboxFileBrowser*`, `dropbox-file-browser-*`, `use-dropbox-file-browser-*`, `apps/web/src/components/media/index.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 16:55] - [ARCH]

What: Cleaned the Team side-chat layout boundary under the transitional shared adapter.
Why: The shared `AgentSideChatLayout` adapter still points to Team-2, and the Team layout beneath it had avoidable Mission Control and Studio private imports for shared agent and resize contracts.
Impact: `TeamHrSideChatLayout` now imports shared agent/resize boundaries directly, touched mobile color classes use token utilities, and mounted coverage locks desktop, collapsed rail, mobile tab, and render-stability behavior before the remaining adapter promotion work.
Files: `TeamHrSideChatLayout.tsx`, `TeamHrSideChatLayout.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 16:59] - [ARCH]

What: Routed MessageBubble voice approval through the shared chat context directly.
Why: `MessageBubble` still imported the Team feature compatibility path even though `VoiceApprovalContext` already lives in shared chat UI.
Impact: The old Team voice-context import is gone from `MessageBubble`, mounted coverage locks assistant message rendering under the shared provider, and the remaining `MessageBubbleAdapter` work is narrowed to Studio store/service/rendering dependencies.
Files: `MessageBubble.tsx`, `MessageBubble.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 17:09] - [ARCH]

What: Routed ChatInput workspace settings access through the shared settings context directly.
Why: `ChatInput` still imported the Settings feature compatibility context even though the workspace settings modal context already lives in shared lib.
Impact: The old Settings context import is gone from `ChatInput`, mounted coverage locks the model-settings open path under the shared provider, and the remaining `ChatInputAdapter` work is narrowed to Composer pasted-text plus Studio service/config dependencies.
Files: `ChatInput.tsx`, `ChatInput.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 17:11] - [ARCH]

What: Routed ChatInput shell file-accept config through shared chat config directly.
Why: `chat-input-shell.tsx` still imported the Studio chat-toast compatibility config even though `CHAT_FILE_INPUT_ACCEPT` already lives in shared chat lib.
Impact: The old Studio config import is gone from the shell, existing shell/config coverage still passes, and the remaining `ChatInputAdapter` work is narrowed to the larger Composer pasted-text and Studio service/config dependencies.
Files: `chat-input-shell.tsx`, `chat-input-shell.test.tsx`, `chat-toast-errors.config.ts`, `chat-toast-errors.config.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 17:28] - [FIX]

What: Made middleware org access detection existence-based for onboarded users with multiple active organizations.
Why: `maybeSingle()` on active `org_members` treated valid multi-org users as an unavailable access check, which could route a fully onboarded user with a canceled personal subscription back to onboarding.
Impact: Users with any active org membership now satisfy middleware access routing even when they belong to more than one organization.
Files: `apps/web/src/middleware.ts`, `apps/web/src/middleware.test.ts`, `.docs/logs/changelog2026-06-23.md`

## [2026-06-23 17:46] - [FIX]

What: Enriched admin agent traces with safe per-tool action, call id, input, and result summaries.
Why: Ledger investigation traces only showed compact tool names and labels, which hid the action payload/result contract needed to debug agent mistakes.
Impact: OpenClaw tool completions now persist summarized `tool_steps` data after trace redaction, admin trace detail renders the new per-step JSON, and the trace list shows `tool:action` summaries for faster triage.
Files: `openclaw-tool-trace-summary.ts`, `openclaw-stream-tool.service.ts`, `openclaw-proxy.types.ts`, `tracing.service.ts`, `chat-completion-side-effects.service.ts`, `TraceDetail.tsx`, `TracesList.tsx`, `agent-trace.types.ts`, `openclaw-tool-trace-summary.test.ts`, `openclaw-proxy.service.test.ts`, `tracing.service.test.ts`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 18:09] - [FIX]

What: Prioritized OpenClaw agent identity bootstrap files before tools and restored missing-file markers.
Why: Large `TOOLS.md` files could consume the shared bootstrap cap before `ROLE.md`, truncating Vibey and other agent roles even when the role file was under the per-file limit.
Impact: `ROLE.md` now gets injected before `TOOLS.md`, total-cap truncation is reported correctly in context breakdowns, and missing bootstrap markers match the existing helper contract.
Files: `workspace.ts`, `bootstrap.ts`, `system-prompt-report.ts`, `workspace.e2e.test.ts`, `pi-embedded-helpers.buildbootstrapcontextfiles.e2e.test.ts`, `system-prompt-report.test.ts`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 18:12] - [FIX]

What: Added document-first retrieval guidance to generated Vibey API instructions and Brain action contracts.
Why: Agents could treat "I already gave you that data" as Brain memory instead of active Space/document evidence when uploaded files or generated docs were the likely source.
Impact: Generated `vibey-api` skills now teach document retrieval before Brain in the Documents quick patterns, and `search_brain_context` docs/contract now defer to Space/document sources for uploaded or previously provided file data.
Files: `vibey-api-skill-generator.ts`, `vibey-api-action-docs.ts`, `artifact-action-schemas.ts`, `vibey-api-skill-generator.test.ts`, `artifact-action-schemas.test.ts`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 18:07] - [FIX]

What: Cleared the Phase 3 web typecheck gate after the Studio chat boundary batch.
Why: Full `@vibey/web` typecheck was blocked by stale Flow typing issues and then by ChatInput plus-menu test fixtures missing the newer access read-only prop.
Impact: Flow validation/status/action contracts now typecheck without behavior changes, ChatInput footer/portal fixtures match the production prop contract, and full web typecheck is green again.
Files: `FlowComposerSpaceSelector.test.tsx`, `FlowStatusDot.tsx`, `errors.config.ts`, `flow-needs-attention.ts`, `describe-flow-trigger.ts`, `flow-automation.types.ts`, `automation-publishable.ts`, `chat-input-normal-footer.test.tsx`, `chat-input-plus-menu-portal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 18:12] - [ARCH]

What: Moved shared agent side-chat storage ownership into `@/lib/agents`.
Why: Flows and Settings still reached through Team-2 side-chat utility paths for Loop conversation storage and compose dispatch.
Impact: Side-chat storage now has shared tests, the old Team-2 storage path is a compatibility export, Flows/Settings use shared agent utility imports, and the remaining side-chat adapter debt is narrowed to the smart Team-2 panel/layout runtime boundary.
Files: `side-chat-storage.ts`, `side-chat-storage.test.ts`, `team-hr-chat-storage.ts`, `apps/web/src/lib/agents/index.ts`, `FlowsPage.tsx`, `use-skills-create-flow.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 18:20] - [ARCH]

What: Routed the Team side-chat panel through existing shared chat and agent utilities.
Why: `TeamHrSideChatPanel.tsx` still imported Studio, Mission Control, and Team-2 compatibility paths for UI/config/contracts that already had shared homes.
Impact: The panel now imports shared chat UI/config/contracts and side-chat compose/storage utilities directly; focused tests, panel ESLint, and full web typecheck pass, while the oversized smart panel remains tracked for later decomposition.
Files: `TeamHrSideChatPanel.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 18:29] - [FIX]

What: Added explicit Deepgram language support for agent audio transcription.
Why: A non-English WhatsApp OGG voice note returned an empty Deepgram transcript unless the request passed the correct explicit language code, and empty transcripts were previously reported as successful analysis.
Impact: `transcribe_audio` now accepts `language`, `lang`, and `language_code`, forwards the language to Deepgram, returns a retryable failure when Deepgram produces no transcript, and teaches agents to keep the original audio URL while passing an explicit provider language code only when the spoken language is known.
Files: `artifact-missions-media-deepgram.client.ts`, `artifact-missions-media-deepgram.client.test.ts`, `artifact-missions-media-video.service.ts`, `artifact-missions-media.service.test.ts`, `artifact-action-additional-schemas.ts`, `artifact-action-schemas.test.ts`, `vibey-api-action-docs.ts`, `chat-document-context.service.ts`, `channel-agent-input.service.ts`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 18:35] - [FIX]

What: Generalized agent audio transcription language-hint instructions.
Why: The first instruction pass overfit the guidance to one language instead of teaching the reusable condition for explicit language hints.
Impact: `transcribe_audio` docs, uploaded-audio context, and empty-transcript retry hints now explain when to pass a provider language code without priming agents toward a single language.
Files: `vibey-api-action-docs.ts`, `chat-document-context.service.ts`, `channel-agent-input.service.ts`, `artifact-missions-media-video.service.ts`

## [2026-06-23 18:33] - [FIX]

What: Clarified generated Loop/Vibey API guidance for Space schema alignment during Flow builds.
Why: Loop could treat a missing status/category/tag needed by a Flow as a Flow Builder limitation instead of first creating the real Space schema option.
Impact: The Space Schema Mutation Protocol now teaches status additions as `update_space_field` on the existing `status` field with a full options replacement, Flow Building points to schema alignment before planning, and generated Flow-domain API skill tests cover field-action exposure.
Files: `agent-instruction-contracts.ts`, `agent-instruction-contracts.test.ts`, `agent-sync-action-exposure.tdd.test.ts`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 18:35] - [ARCH]

What: Moved the Flow Loop side-chat conversation event contract into shared Flow lib.
Why: `TeamHrSideChatPanel.tsx` imported a Flow feature-local browser-event helper even though the contract synchronizes Flow page state with the shared side-chat runtime.
Impact: Loop conversation event constants, payload types, and dispatchers now live in `@/lib/flows`, the Flow feature path remains a compatibility export, and the Team panel no longer imports the Flow feature helper directly.
Files: `loop-chat-conversation.ts`, `loop-chat-conversation.test.ts`, `apps/web/src/lib/flows/index.ts`, `TeamHrSideChatPanel.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 18:41] - [FIX]

What: Added a DB-backed Loop Flow Builder reference for Space schema alignment.
Why: Loop needed the `claude-skills` style source of truth in `agent_skills` and `agent_skill_resources`, not only generated local Vibey API instructions, so missing Flow statuses can be treated as schema alignment work.
Impact: The system `flow-builder` skill now points to `references/space-schema-alignment.md`, the reference teaches `update_space_field` on `field_id: "status"` with a full status option list, and staging Supabase has the same migration applied and verified.
Files: `20260623154041_loop_flow_builder_space_schema_alignment.sql`, `.docs/logs/changelog2026-06-23.md`

## [2026-06-23 18:45] - [ARCH]

What: Routed Team side-chat Org context and roster access through shared frontend libs.
Why: `TeamHrSideChatPanel.tsx` and its side-chat identity pieces still imported Org feature service/store/type compatibility paths for shared org context and team roster contracts.
Impact: The side-chat panel now uses `@/lib/org` and `@/lib/team`, mounted coverage locks org-context roster loading without render churn, and touched fallback avatar colors use token utilities.
Files: `TeamHrSideChatPanel.tsx`, `TeamHrSideChatPanel.test.tsx`, `TeamHrChatAgentIdentity.tsx`, `TeamHrChatEmptyState.tsx`, `apps/web/src/lib/org/index.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 18:53] - [ARCH]

What: Routed Team side-chat ChatInput and MessageBubble usage through shared chat adapters.
Why: `TeamHrSideChatPanel.tsx` still imported Studio chat UI components directly even though shared transitional adapter paths already exist for non-Studio consumers.
Impact: The panel and its mounted test now use `@/components/chat/ChatInputAdapter` and `@/components/chat/MessageBubbleAdapter`, reducing the panel's remaining direct feature imports from 13 to 11 without changing chat behavior.
Files: `TeamHrSideChatPanel.tsx`, `TeamHrSideChatPanel.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 19:04] - [ARCH]

What: Promoted the chat slide stack and legacy conversation-title cleanup to shared frontend surfaces.
Why: `TeamHrSideChatPanel.tsx` still imported Spaces-owned slide/title helpers even though both are cross-feature chat/conversation behavior.
Impact: `ChatPanelSlideStack` now lives in `@/components/chat` with mounted coverage, the Spaces path is a compatibility export, touched slide-stack styles no longer use inline pointer events or `z-[1]`, and the Team panel's remaining direct feature imports dropped from 11 to 9.
Files: `ChatPanelSlideStack.tsx`, `ChatPanelSlideStack.test.tsx`, `ChatPanelSlideTransition.tsx`, `index.ts`, `TeamHrSideChatPanel.tsx`, `TeamHrSideChatPanel.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 19:13] - [ARCH]

What: Moved shared conversation action toast config into `@/lib/conversations`.
Why: `TeamHrSideChatPanel.tsx` still imported the Spaces toast config for generic conversation rename, pin, move, and copy messages.
Impact: Conversation action toast messages now have shared coverage, Spaces keeps compatibility constants by composing the shared config, and the Team panel's remaining direct feature imports dropped from 9 to 8 without changing toast text.
Files: `conversation-toast-errors.config.ts`, `conversation-toast-errors.config.test.ts`, `spaces-toast-errors.config.ts`, `spaces-toast-errors.config.test.ts`, `index.ts`, `TeamHrSideChatPanel.tsx`, `TeamHrSideChatPanel.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 19:20] - [ARCH]

What: Routed Team side-chat rate-limit, status, and stream-interruption UI through shared chat adapters.
Why: `TeamHrSideChatPanel.tsx` still imported Studio chat status components directly.
Impact: Shared transitional adapters now centralize the Studio-backed smart status UI, the Team panel imports those adapter paths, and its remaining direct feature imports dropped from 8 to 5 without changing chat behavior.
Files: `RateLimitCardAdapter.tsx`, `StatusIndicatorAdapter.tsx`, `StreamInterruptedBarAdapter.tsx`, `TeamHrSideChatPanel.tsx`, `TeamHrSideChatPanel.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 19:24] - [ARCH]

What: Routed Team-2 Spaces conversation-list usage through a shared conversations adapter.
Why: Team-2 chat surfaces imported the Spaces-owned conversation list directly even though the list is shared rail UI from the consumer perspective.
Impact: `TeamHrSideChatPanel.tsx` and `Team2AgentChatWithConversations.tsx` now import the transitional adapter path, while the true 801 LOC Spaces conversation rail extraction remains tracked as follow-up work.
Files: `SpaceConversationsListAdapter.tsx`, `TeamHrSideChatPanel.tsx`, `TeamHrSideChatPanel.test.tsx`, `Team2AgentChatWithConversations.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 19:30] - [ARCH]

What: Routed Team side-chat Studio runtime imports through shared conversation APIs and a transitional chat runtime adapter.
Why: `TeamHrSideChatPanel.tsx` still imported Studio chat service, stream resilience, store, and rich message types directly.
Impact: The panel now uses existing shared conversation/model-setting imports where behavior is already shared, the remaining Studio streaming/store/runtime pieces are centralized behind `studio-chat-runtime-adapter.ts`, and the stale HR panel cross-feature allowlist entry was removed.
Files: `studio-chat-runtime-adapter.ts`, `TeamHrSideChatPanel.tsx`, `TeamHrSideChatPanel.test.tsx`, `loc-allowlist.json`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 20:00] - [ARCH]

What: Split the Spaces conversation list and moved reusable list sectioning into shared conversation lib.
Why: `SpaceConversationsList.tsx` was an oversized smart rail with direct Studio store/type imports and shared consumer adapter debt.
Impact: The main list is now 319 LOC, extracted header/row/section/actions files are below the 400 LOC component cap, pure sectioning helpers have shared tests, and the Spaces list slice no longer imports Studio store/type paths directly.
Files: `SpaceConversationsList.tsx`, `SpaceConversationsHeader.tsx`, `SpaceConversationRows.tsx`, `SpaceConversationSections.tsx`, `SpaceConversationActionsSurface.tsx`, `SpaceConversationsList.test.tsx`, `conversation-list-sections.ts`, `conversation-list-sections.test.ts`, `apps/web/src/lib/conversations/index.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 20:10] - [ARCH]

What: Promoted the split conversation rail into the shared conversations surface.
Why: `SpaceConversationsListAdapter.tsx` still pointed at a deleted Spaces feature path after the ownership move started.
Impact: The shared rail files now live in `@/components/conversations`, the old Spaces list path is a compatibility re-export, the adapter no longer imports a feature path, and focused mounted tests still cover grouping, streaming row state, all-agent search, selection, and render stability.
Files: `SpaceConversationsList.tsx`, `SpaceConversationsHeader.tsx`, `SpaceConversationRows.tsx`, `SpaceConversationSections.tsx`, `SpaceConversationActionsSurface.tsx`, `SpaceConversationsListAdapter.tsx`, `SpaceConversationsList.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 20:19] - [ARCH]

What: Isolated conversation rail row runtime state behind the conversations adapter.
Why: The shared `SpaceConversationsList` rail still read Studio streaming state, blocking it from the public conversations barrel.
Impact: The public rail is now props-only and exported from `@/components/conversations`, legacy Spaces and Team consumers keep streaming row behavior through the non-barrel adapter, and mounted adapter coverage locks the runtime bridge without render churn.
Files: `apps/web/src/components/conversations/SpaceConversationRows.tsx`, `apps/web/src/components/conversations/SpaceConversationsList.tsx`, `apps/web/src/components/conversations/SpaceConversationsListAdapter.tsx`, `apps/web/src/components/conversations/SpaceConversationsListAdapter.test.tsx`, `apps/web/src/components/conversations/SpaceConversationsList.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceConversationsList.tsx`, `apps/web/src/components/conversations/index.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 20:30] - [ARCH]

What: Moved the shared docs API wrapper off Studio artifact types.
Why: `apps/web/src/lib/services/docs-api.ts` imported `ConversationDocument` from the Studio feature even though the same contract already exists under shared artifact types.
Impact: `updateConvDoc` now depends on `@/lib/artifacts/artifact-types`, and focused tests lock the existing PATCH routes and payload forwarding for conversation documents and mission deliverables.
Files: `apps/web/src/lib/services/docs-api.ts`, `apps/web/src/lib/services/__tests__/docs-api.test.ts`, `.docs/plans/architecture-compliance-remediation.md`

## [2026-06-23 20:37] - [FIX]

What: Applied Loop Space schema alignment guidance and default authority to production DB.
Why: The active runtime uses the production Supabase database, but the Loop Flow Builder skill/resource and every-turn definition updates had only been verified outside production.
Impact: Production Loop now has the `flow-builder` schema-alignment reference, ROLE/SOUL/IDENTITY no longer frame missing statuses as manual setup blockers, and the refreshed local production-backed runtime exposes `create_space_field` and `update_space_field`.
Files: `20260623154041_loop_flow_builder_space_schema_alignment.sql`, `20260623172937_loop_schema_alignment_default_authority.sql`, `.docs/logs/changelog2026-06-23.md`

## [2026-06-23 20:39] - [ARCH]

What: Moved reporting date range resolution into shared reporting lib.
Why: Shared flow run-history UI imported the Spaces reporting date helper for generic date filtering.
Impact: `resolveReportingDates` and its range types now live in `@/lib/reporting`, the old Spaces helper path remains a compatibility re-export, and focused tests lock the existing preset/custom-date behavior.
Files: `apps/web/src/lib/reporting/resolve-reporting-dates.ts`, `apps/web/src/lib/reporting/resolve-reporting-dates.test.ts`, `apps/web/src/lib/reporting/index.ts`, `apps/web/src/features/spaces/components/reporting/shared/resolve-reporting-dates.ts`, `apps/web/src/features/spaces/components/reporting/shared/resolve-reporting-dates.test.ts`, `apps/web/src/components/flows/AutomationRunsLog.tsx`, `apps/web/src/components/flows/AutomationRunsToolbar.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `documentation/frontend-shared-surfaces.md`

## [2026-06-23 20:59] - [ARCH]

What: Moved flow group-by toolbar controls into shared flow UI.
Why: Shared run-history toolbar still imported Flows feature group-by components and grouping types.
Impact: `AutomationRunsToolbar` now uses `@/components/flows` group-by controls and shared `@/lib/flows` grouping types, old Flows feature paths remain compatibility re-exports, and mounted toolbar coverage locks group/sort behavior without render churn.
Files: `apps/web/src/components/flows/AutomationRunsToolbar.tsx`, `apps/web/src/components/flows/AutomationRunsToolbar.test.tsx`, `apps/web/src/components/flows/FlowsGroupByButton.tsx`, `apps/web/src/components/flows/FlowsGroupByToolbarPopover.tsx`, `apps/web/src/components/flows/index.ts`, `apps/web/src/features/flows/components/FlowsGroupByButton.tsx`, `apps/web/src/features/flows/components/FlowsGroupByToolbarPopover.tsx`, `apps/web/src/features/flows/types/flows-page.types.ts`, `apps/web/src/lib/flows/flow-grouping-types.ts`, `apps/web/src/lib/flows/index.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `documentation/frontend-shared-surfaces.md`

## [2026-06-23 21:18] - [ARCH]

What: Promoted the reporting time-range selector into shared reporting UI.
Why: Shared flow run-history UI still imported the Spaces-owned reporting selector for generic date filtering.
Impact: `ReportingTimeRangeSelector` is split below the frontend component cap under `@/components/reporting`, the old Spaces selector path is a compatibility re-export, and mounted selector/toolbar coverage locks preset, custom-date, portal cleanup, and render-stability behavior.
Files: `apps/web/src/components/reporting/ReportingTimeRangeSelector.tsx`, `apps/web/src/components/reporting/ReportingTimeRangeDropdown.tsx`, `apps/web/src/components/reporting/ReportingTimeRangeTrigger.tsx`, `apps/web/src/components/reporting/reporting-time-range-selector-utils.ts`, `apps/web/src/components/reporting/ReportingTimeRangeSelector.test.tsx`, `apps/web/src/components/reporting/index.ts`, `apps/web/src/features/spaces/components/reporting/shared/ReportingTimeRangeSelector.tsx`, `apps/web/src/components/flows/AutomationRunsToolbar.tsx`, `apps/web/src/components/flows/AutomationRunsToolbar.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `documentation/frontend-shared-surfaces.md`

## [2026-06-23 21:33] - [ARCH]

What: Rewired the Team detail toolbar to shared reporting and campaign boundaries.
Why: `TeamDetailToolbar.tsx` still imported Spaces reporting UI/helpers plus Spaces and Studio feature types for generic toolbar filtering.
Impact: The toolbar now imports reporting UI from `@/components/reporting`, date-range and campaign contracts from shared libs, uses a local minimal space-option contract, and has mounted render-stability coverage for its filter/time-range interactions.
Files: `apps/web/src/features/team-2/components/teams/TeamDetailToolbar.tsx`, `apps/web/src/features/team-2/components/teams/TeamDetailToolbar.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 21:40] - [ARCH]

What: Split the Properties segment filter builder and moved it to shared reporting imports.
Why: `SegmentFilterBuilder.tsx` was 599 LOC and still imported the Spaces-owned reporting selector/helper paths.
Impact: The builder is now below the component cap, its dropdown and section UI are extracted into focused feature-local components, it imports reporting UI/helpers from shared boundaries, and mounted coverage locks option loading, filtering, date range, preview, and render stability.
Files: `apps/web/src/features/properties/components/segments/SegmentFilterBuilder.tsx`, `apps/web/src/features/properties/components/segments/SegmentSearchableMultiSelect.tsx`, `apps/web/src/features/properties/components/segments/SegmentFilterSection.tsx`, `apps/web/src/features/properties/components/segments/SegmentFilterBuilder.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 23:21] - [FIX]

What: Applied the `media_asset_document_intelligence` Supabase migration to staging and production.
Why: The deployed media indexer writes `media_assets.document_intelligence`, but both remote databases were missing the column and PostgREST rejected PDF indexing updates.
Impact: `media_assets.document_intelligence` now exists as `jsonb not null default '{}'::jsonb` on staging and production, with migration history recorded and the PostgREST schema cache notified to reload.
Files: `supabase/migrations/20260617123000_media_asset_document_intelligence.sql`, `.docs/logs/changelog2026-06-23.md`

## [2026-06-23 23:28] - [FIX]

What: Added org auto-recharge triggering after agent-api org credit deductions.
Why: Agent runtime deductions updated org credit usage locally but only called the main API auto-recharge bridge for user balances, so org balances could pass the auto-recharge threshold without charging.
Impact: `deductOrgCredits` now asks the main API to evaluate `org_id` auto-recharge after deduction, and the internal billing endpoint can trigger either user or org auto-recharge through the existing main API billing service.
Files: `apps/agent-api/src/modules/billing/services/credits-balance.service.ts`, `apps/agent-api/src/modules/billing/services/credits.service.test.ts`, `apps/api/src/modules/internal/controllers/internal-media-billing.controller.ts`, `apps/api/src/modules/billing/services/credits-service-balance.base.ts`, `.docs/logs/changelog2026-06-23.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-23 23:32] - [ARCH]

What: Split Team analytics and moved its data contracts to shared lib boundaries.
Why: `TeamAnalyticsView.tsx` was 700 LOC and imported agent, mission, settings billing, org, and Spaces reporting contracts through feature-owned paths.
Impact: The Team analytics parent is now 233 LOC, render-heavy cards/tables live in focused local components, human spending reads through `@/lib/org`, and mounted coverage locks spend loading without render churn.
Files: `apps/web/src/features/team-2/components/teams/TeamAnalyticsView.tsx`, `apps/web/src/features/team-2/components/teams/TeamAnalyticsView.test.tsx`, `apps/web/src/features/team-2/components/teams/TeamAnalyticsSpendSummary.tsx`, `apps/web/src/features/team-2/components/teams/TeamAnalyticsBreakdownTables.tsx`, `apps/web/src/features/team-2/components/teams/team-analytics-formatting.ts`, `apps/web/src/lib/org/org-billing-api.ts`, `apps/web/src/lib/org/org-billing-api.test.ts`, `apps/web/src/lib/org/index.ts`, `apps/web/src/features/org/services/org.service.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `documentation/frontend-shared-surfaces.md`

## [2026-06-23 23:47] - [ARCH]

What: Split Team overview and moved its direct mission/org/reporting imports to shared boundaries.
Why: `TeamOverviewView.tsx` was 1,451 LOC and directly imported Mission Control, Org, and Spaces reporting feature paths.
Impact: The Team overview parent is now 252 LOC, render-heavy cards/feed sections live in focused local components, mission reads use shared `@/lib/missions`, the Mission Control modal is behind a transitional shared adapter, and mounted coverage locks mission/chat opening without render churn.
Files: `apps/web/src/features/team-2/components/teams/TeamOverviewView.tsx`, `apps/web/src/features/team-2/components/teams/TeamOverviewView.test.tsx`, `apps/web/src/features/team-2/components/teams/TeamOverviewStatusCards.tsx`, `apps/web/src/features/team-2/components/teams/TeamOverviewActivityCards.tsx`, `apps/web/src/features/team-2/components/teams/TeamOverviewWorkloadCards.tsx`, `apps/web/src/features/team-2/components/teams/TeamOverviewFeedSections.tsx`, `apps/web/src/features/team-2/components/teams/TeamOverviewShared.tsx`, `apps/web/src/features/team-2/components/teams/team-overview-utils.ts`, `apps/web/src/lib/missions/missions-api.ts`, `apps/web/src/lib/missions/missions-api.test.ts`, `apps/web/src/lib/missions/index.ts`, `apps/web/src/components/missions/MissionDetailModalAdapter.tsx`, `apps/web/src/features/mission-control/services/missions.service.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `documentation/frontend-shared-surfaces.md`
