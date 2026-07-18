
## [2026-07-18 07:14] - [REFACTOR]

What: Split `TeamHrSideChatPanel.tsx` into sibling hooks and subcomponents (`useTeamHrChatMessaging`, `useTeamHrConversationActions`, `TeamHrChatHeader`, `TeamHrChatMessageTurns`, `TeamHrChatCreditsBanner`, plus constants/types/helpers) to bring the main panel back under its allowlisted 1437 LOC baseline.
Why: The panel had grown to ~1587 lines and failed the architecture LOC gate.
Impact: Main panel is now 708 LOC with no behavior change; messaging, conversation actions, header, message turns, and credits UI live in focused sibling files under `hr-side-chat/`.
Files: `apps/web/src/features/team-2/components/hr-side-chat/TeamHrSideChatPanel.tsx`, `useTeamHrChatMessaging.ts`, `useTeamHrConversationActions.ts`, `TeamHrChatHeader.tsx`, `TeamHrChatMessageTurns.tsx`, `TeamHrChatCreditsBanner.tsx`, `team-hr-side-chat.constants.ts`, `team-hr-side-chat.types.ts`, `group-messages-into-turns.ts`


What: Finished the app-cleanup accessibility sweep for manual contact creation, CSV contact import, property deletion confirmations, Brain call imports, Agent Brain activation, and Mission board cards. Added dialog descriptions, named close controls, correctly associated every contact label with its field, exposed hidden file inputs by name, made Fathom meeting rows and Mission cards native keyboard-operable buttons, replaced raw/inline colors in the touched surfaces with role-based token utilities, and removed the unreferenced `SegmentViewDialog` left behind since the initial repository snapshot.
Why: These working surfaces were visually understandable but incomplete for keyboard and assistive-technology users; their labels, destructive or billing context, meeting/card actions, and icon-only close controls were not programmatically connected.
Impact: Contact, property-management, Brain, and Mission board flows now announce their purpose and target, expose controls by name, support keyboard interaction, and retain the same visual and submission behavior.
Files: `apps/web/src/features/studio/components/preview/AllContactsAddManualDialog.tsx`, `AllContactsImportCsvDialog.tsx`, property delete dialogs under `apps/web/src/features/settings/components/settings-content/properties`, Brain import dialogs under `apps/web/src/features/brain/components/user-add-info-panel`, `apps/web/src/features/brain/components/AddAgentBrainModals.tsx`, `apps/web/src/features/mission-control/components/board/MissionCard.tsx`, removed `apps/web/src/features/settings/components/settings-content/properties/segments/SegmentViewDialog.tsx`, and focused regression tests

## [2026-07-18 07:10] - [FIX]

What: Re-applied Fathom OAuth `triggered_for` typing and removed auto-enabled WhatsApp plugin from OpenClaw config before production ship.
Why: These two regressions blocked Nest/Vercel builds and crashed the Fly gateway (`plugin not found: whatsapp`).
Impact: Clears known deploy blockers so local branch tip can ship to production.
Files: `apps/api/src/modules/integrations/fathom/services/fathom-oauth.service.ts`, `docker/openclaw.json`

## [2026-07-18 07:15] - [REFACTOR]

What: Split `SidebarHqHubMenuContent.tsx` into `SidebarHqHubMenuNavRow.tsx` and `SidebarHqHubMenuDockFlyouts.tsx` to satisfy the 400 LOC component limit.
Why: The hub menu content file was 471 LOC and blocked architecture compliance.
Impact: Public `SidebarHqHubMenuContent` export unchanged; consumers need no import updates.
Files: `SidebarHqHubMenuContent.tsx`, `SidebarHqHubMenuNavRow.tsx`, `SidebarHqHubMenuDockFlyouts.tsx`

## [2026-07-18 07:11] - [REFACTOR]

What: Extracted navigation/event hooks, pure helpers, and sibling modules from `SpaceItemsContainer.tsx` and trimmed related doc/chat/doc-menu LOC overages.
Why: Architecture LOC gates blocked merge (`SpaceItemsContainer` 1940/1750; several doc/chat files slightly over).
Impact: Behavior unchanged; container and secondary files now under allowlisted baselines.
Files: `apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx`, new hooks under `apps/web/src/features/spaces/hooks/`, new libs under `apps/web/src/features/spaces/lib/`, `DocEditorPanel.tsx`, `DocEditorPanelInner.tsx`, `DocMenuDropdown.tsx`, `SpaceVibeyChatPanel.tsx`, and extracted sibling modules listed in those folders

## [2026-07-18 07:25] - [ARCH]

What: Split oversized shell/sidebar, spaces container/docs/chat, and Team HR chat panels; moved chat-turn-completion into `@/lib/chat`; shrunk LOC allowlist baselines.
Why: Pre-commit architecture gate blocked shipping the local production-parity tree.
Impact: Commit can proceed; behavior unchanged, LOC/import gates green.
Files: sidebar hub menu splits, spaces hooks/libs, team-2 hr-side-chat splits, `apps/web/src/lib/chat/chat-turn-completion.ts`, `scripts/arch/loc-allowlist.json`

## [2026-07-18 07:45] - [FIX]

What: Corrected relative imports in extracted DocEditor panel helpers after the LOC split.
Why: Vercel `roas-web` failed with Module not found for DocPropertiesSection, space-schema, and markdown-to-html.
Impact: Unblocks web production build for the parity ship.
Files: `use-doc-editor-panel-properties.tsx`, `resolve-initial-doc-body.ts`

## [2026-07-18 07:50] - [FIX]

What: Exported `RestorableChangeSet` from funnel-history.service for Nest public controller return typing.
Why: Vercel `roas-api` failed TS4053 (type cannot be named).
Impact: Unblocks API production build.
Files: `apps/api/src/modules/funnels/services/funnel-history.service.ts`
