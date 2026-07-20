# Claude/ChatGPT shell (apps/web)

Last Modified: 2026-07-19

## Overview

Dashboard chrome inspired by Claude/ChatGPT: top bar, pin/peek sidebar, Home/Chat menus, persistent chat drawer on workspace routes, a Space work dock (no open-item tab strip), a shared artifact slide-out, and a right summary panel (Tasks / Files / Sources).

Design reference: `.docs/design/claude-chatgpt-shell-v4/` (HTML prototype + `shell-state.md`).

## Data Flow

1. `useShellStore` (`components/shell/use-shell-store.ts`) owns pin/peek, menu mode, chat drawer, space work collapse, the shared artifact viewer, right panel, and page breadcrumbs.
2. `DashboardFrame` renders a full-width `ShellTopBar`, then a row of HQ sidebar + `ShellWorkspace` (T-junction — sidebar under the top bar, never overlaying it). On `/spaces`, `ShellWorkspace` keeps the Space page mounted inside `SpaceWorkDock`; collapse hides the dock and shows full chat without unmounting Space.
3. Feature pages publish rich breadcrumbs with `ShellBreadcrumb`; `ShellTopBar` renders them in place of the path-label fallback. Publishers today: Team, Spaces, Flows, Skills.
4. HQ sidebar expand follows `sidebarPinned` / `sidebarPeek` (top-bar PanelLeft); peek overlays under the top bar (layout stays 72px); pin expands in-flow to 272px. Shared grace timer on peek leave.
   4b. Global Search lives in the top bar (opens `StudioSearchModal`); Chat menu keeps a Search row with the same control. Home menu does not list Search. Search is server-backed through `/api/entity-search`, progressively merges tasks, Space/conversation docs, mission deliverables, conversations, campaigns, and campaign artifacts, and cancels stale terms.
5. Chat menu opens conversations in the left drawer on workspace routes (`/spaces`, `/campaigns`, `/team`, …) or full conversation on Home (`/home?conv=`). Plain `/home` always shows the dashboard.
6. Sidebar **New** and Chat-menu New always start a fresh chat on workspace routes (`openFreshChatDrawer`); Home goes to `/home?chat=new`. Top-bar pencil on workspace: if the drawer is closed → `restoreChatDrawer()` (last chat); if open → fresh chat. Chat tab switches to the chat menu and, when the workspace drawer is closed, also restores it.
7. Open in ▾ resolves Drive / Google Docs / Canva targets from the focused space `?item=` (and optional media focus). Canva targets are lazy: the shell does not generate or import a design until the user selects Canva.
8. The right summary action is context-aware. With an active chat it exposes Tasks, Files, and Sources scoped to that conversation: completed agent tool activity, saved conversation artifacts/documents plus message attachments/media, and explicit references/links. Without an active chat, including generic Home, it exposes only the existing personal Tasks queue.
9. A Space chat header shows the conversation's saved campaign / Space scope. Selecting another Space atomically retargets the conversation and future agent work; selecting **General** clears the Space while leaving the visible workspace open.
10. Chat presentation is mode-aware: full chat mirrors the active conversation name into the shell breadcrumb and shows an inline-renamable title beside the agent; docked chat hides the title and uses a fixed-width Space-only scope label.
11. Submitting the Home new-chat composer clears any prior active conversation, queues the message with `railIntent: 'new'`, mounts the full chat at `/home?chat=starting`, then replaces that temporary URL with `/home?conv=` as soon as the new conversation is created.
12. Artifact chips, chat outputs, Space artifact/media cards, Brain source previews, Space document visuals, and the Files summary tab publish the shared `@/lib/artifacts` shell-viewer target. The shell opens one resizable right-side viewer, swaps content in place, and closes it on top-level navigation.
13. Space-backed document targets load the real Space item into the canonical document editor's inline mode, including the owning Space's fields, Doc/Visual views, fixed rich-text toolbar, grouped Copy/download actions, Google Docs export, settings/share controls, and autosave route. The shared viewer can expand that same editor to full screen without swapping renderers. Generic documents and files without a Space item continue to use the read-only deliverable renderer. **Open in Space** launches the same document in its full Space destination. Media targets add download, visual aspect-ratio choices, Space image history, and **Edit in chat**. Opening media never attaches it to the active conversation; edit and resize actions deliberately start a fresh chat, with resize prompts sent as a new image task.
14. `/artifacts` is the account-wide artifact library. It paginates through docs and media, merges every campaign-artifact family from the active organization plus personal legacy assets owned by the signed-in user, labels each row with its campaign or Space, and opens rows in the shared viewer. Uploaded assets are hidden by default and available through the source filter. Type filters include Docs, Images, Sheets, Presentations, Funnels, Campaign assets, and Files. More → Artifacts links here; Space-specific views remain inside their Space.

## Key files

- `apps/web/src/components/shell/*`
- `apps/web/src/components/spaces/SpaceDocEditorPanelAdapter.tsx`
- `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.tsx`
- `apps/web/src/lib/artifacts/shell-artifact-viewer.ts`
- `apps/web/src/lib/artifacts/global-artifacts-api.ts`
- `apps/web/src/features/artifacts/components/GlobalArtifactsPage.tsx`
- `apps/web/src/app/(dashboard)/dashboard-shell.tsx`
- `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx` (pin/peek sync)
- `apps/web/src/components/layout/sidebar/SidebarHqHubMenu.tsx` (Home/Chat chrome)

## Decision Log

- Space work collapse (`PanelRight`) hides the Space **dock** beside chat; Space stays mounted so selection/scroll survive expand. Docs/tasks open in normal Space UI — no shell open-item tab strip. Entering or switching `?space=` auto-opens the dock so a prior collapse does not stick. Artifact viewer stays a separate dock. List / summary panel is unrelated.
- Peek overlays as a fixed solid column under the top bar (does not push main); pin is in-flow 272px. Collapsed rail keeps inset `card-glass`.
- The right summary panel follows the active conversation instead of the visible Space. Chat Files includes conversation documents/artifacts and message attachments/media; Sources includes explicit message references and links; Tasks includes completed and failed agent actions persisted in the chat history. Generic Home shows Tasks only.
- Top-bar ⋯ omitted until real section/chat actions are wired.
- Home flyout rows (Team/Campaigns/Brain/More) have no trailing chevrons — hover still opens the docked flyout.
- Collapsed rail More (•••) hosts Projects + Flows + Artifacts (same `HubDockFlyout` as expanded More). Projects keeps a nested hover flyout; Flows and Artifacts are direct links (`/flows`, account-wide `/artifacts`). Space-level Docs, Media, and custom artifact views remain owned by the current Space.
- Campaigns flyout uses a nested spaces sub-flyout on campaign-row hover (400ms grace); not an inline accordion. No Favourite/Campaigns captions inside the flyout body. Campaign rows share the same `hub-dock-flyout-row` gap as nested space rows.
- Dock flyouts use a left hover bridge + tight offsets (primary 2px / nested 0) and ignore leave when the pointer moves into another `[data-hub-dock-flyout]`, so parent → nested paths stay reachable. Vertical position is clamped to the viewport after measure.
- Disabled Brain scopes show muted “Enable in Manage Brains” rows linking to Manage Brains.
- Top-bar pencil is a permanent action in expanded and collapsed shell states: Home → full new-chat (`/home?chat=new`); workspace → restore drawer if closed, fresh new chat only if drawer already open.
- Chat tab shows the chat menu. On workspace routes with a closed drawer it also restores the drawer (last conversation / empty) — it does not start a new chat.
- Sidebar New on workspace routes always docks a fresh chat (does not dismiss Space/work content). Chat-menu New uses the same rule.
- Chat menu conversation toolbar is plain left-aligned `Search` (no glass container) then all-agents + filter (defaults to current-agent conversations; Search filters the list only). Global Studio search is top-bar / Cmd-K only. Agent picker stays in the main chat header (`ShellNewChatAgentBar`). Chat panel keeps a single collapse control; shell drawer has no separate minimize bar.
- Global Search uses the shared entity-search boundary. Core entities paint independently from the heavier artifact lane; the retired `/api/studio/search` route must not be reintroduced.
- Home is dashboard-only (cards). New Chat (`+ New` on the Chat tab / top-bar pencil / `?chat=new`) is the full former Home hero: greeting, composer, templates, recommendations. The sidebar `+ New` control is Chat-tab only (Home already has the pencil when the rail is collapsed).
- Empty **docked** chat drawer is greeting + composer only — never Home template fan / “For you” extras (those stay on the full `/home?chat=new` surface).
- The new-chat agent bar shows only the agent picker; a separate “New chat” label is redundant on the dedicated new-chat surface.
- Home composer sends must enter `/home?chat=starting` so the chat panel is mounted to consume the queued seed. The created conversation then becomes the canonical `/home?conv=` route; queued sends must never wait for an unrelated chat surface to mount.
- Conversation scope is explicit and editable in the chat header. The saved conversation scope—not merely the currently visible route—drives new messages and agent tool context, so moving a chat does not require navigating away from the current Space.
- Conversation titles appear in the shell breadcrumb and beside the agent only when chat owns the full workspace. Clicking the full-header title renames it; the docked header omits it to protect the scope and collapse controls at narrow widths.
- The shell owns one artifact viewer instead of each feature inventing a modal. Opening an artifact collapses the Files/Tasks/Sources summary panel; opening chat or the summary panel closes the artifact viewer. File swaps preserve the surrounding page and chat.
- The existing Space document editor and Media surface remain authoritative editing/browsing destinations. The slide-out is a consistent read/edit-entry container layered onto those surfaces, not a stripped-down replacement shell.
- Space-backed documents must never be reconstructed as deliverable previews in the shell. The shell adapter resolves the real `space_items` row and mounts `DocEditorPanel` inline; saves use the document's owning Space even when the viewer was opened from chat or another Space.
- Space Media is a browsing surface, not a second chat composer. Its **New image** action opens a fresh docked chat with the current Space/campaign context. A single available viewer destination is rendered as a direct action; the **Open** dropdown is reserved for multiple destinations.
- Open-in provider resolution must remain read-only. Canva design creation starts only from the explicit **Open in Canva** action, avoiding duplicate or abandoned designs when a menu merely opens.
- The account-wide artifact library treats docs, campaign artifacts, media, campaigns, and Spaces as independent sources. A failed source does not blank successful results; the page reports failure only when every source is unavailable.
- The global library uses a bounded set of organization-scoped requests (docs, campaign artifacts, media, campaign labels, and Space labels), never one request per Space.
- The library source control defaults to **Created** so uploaded reference files do not overwhelm agency outputs. **Uploaded** isolates account uploads, while **Everything** combines both origins.
- Account-wide artifact scope combines active-organization records with legacy personal records owned by the signed-in user. Personal rows are always filtered by `user_id`; another member's unassigned records are never included.
