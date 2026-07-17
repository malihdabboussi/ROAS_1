# Handoff: ROAS Platform UI Redesign (Claude/ChatGPT-inspired shell)

**Target repo:** `dylanvanas1/roas-platform` (Next.js 14 + Tailwind, `apps/web`)
**Prototype:** `Claude-ChatGPT Inspired UI v4.dc.html` (open in a browser; `support.js` must sit next to it)

## About the design files

The bundled HTML file is a **design reference / interactive prototype**, not production code. The task is to **recreate the behaviors and layout in the existing Next.js app** using its established patterns (Tailwind classes, the existing glass utility classes, lucide-react icons, existing components). Do not port the prototype's inline styles or its mini state machine verbatim — map each behavior onto the real components listed below.

## Fidelity

**High-fidelity for layout, spacing, and behavior; token-faithful for color/type.** All colors, fonts, radii, and glass treatments in the prototype were lifted from `apps/web/src/app/globals.css` — when implementing, use the existing CSS variables and utility classes (`--background`, `--card`, `--primary`, `chip-glass-green`, `nav-glass-selected-purple`, `input-glass`, `card-glass`, `surface-card`, shadow tokens), never hard-coded hex. **Keep the app's existing lucide-react icons** — the prototype's hand-drawn SVGs are placeholders for the icons already in the codebase.

## ⚠ Wired vs. phantom — read first

The prototype contains UI that has **no backing in the app today**. Implement the wired parts first; treat phantom parts as new features needing data plumbing (flag in PR, don't fake):

| Element | Status | Notes |
| --- | --- | --- |
| Sidebar nav (Home, Team, Campaigns/Spaces, Brain, Projects, Flows) | Wired | Existing routes under `app/(dashboard)/` |
| Home dashboard cards (Agenda, My tasks, Approval queue, Notification feed, Recent conversations) | Wired | Existing `features/home` components (HomeCardsGrid, AgendaCard, MyTasksPanel, RecentAgentConversationsCard) |
| Chat / conversations / space chat | Wired | `GlobalChatLayout`, studio chat components |
| "Open in ▾" button (top right) | **Phantom** | No export/open-in targets exist. Either omit or stub behind a feature flag until targets exist |
| Right panel: Tasks / Files / Sources tabs | **Phantom (partially)** | Tasks can bind to the existing my-tasks feed; Files could bind to space deliverables/artifacts; **Sources has no data source** — implement the panel shell + Tasks first, add Files/Sources when data exists |
| Agent selector in composer ("Vibey · CEO ▾") | Wired-ish | Agents exist (`features/team`); composer needs a selector control that sets the target agent for a NEW chat only |
| Drag-to-resize chat drawer | New | Pure frontend; see `usePanelResize.ts` — the codebase already has a resize hook + `ResizableDivider.tsx`, reuse them |

## 1. Top bar (new component)

A slim 52px top bar replaces the current `TopBar.tsx` content. Left → right:

1. **Sidebar button** (`PanelLeft` icon): hover = peek the expanded sidebar as an overlay; click = pin it open (in-flow); click again = unpin. Hover-out grace period ~350ms so the pointer can travel into the panel. The button shows a pressed/active background when pinned or while the overlay is open.
2. **Back / forward** navigation arrows (router history).
3. **New chat pencil** — visible **only when the sidebar is collapsed** (the expanded sidebar already has the "New" button). Navigates to the new-chat view.
4. Vertical divider.
5. **Breadcrumb**: section icon + current location (e.g. `Spaces / General / Meetings`, a conversation title, or `Home`) + a `⋯` button for section settings (menu content TBD — wire to existing campaign/space menus).

Right side (only three things — no avatar, no search, no theme/mode switcher here):
1. "Open in ▾" pill — **phantom, see table**.
2. **Summary panel toggle** (list icon) — shows/hides the right panel.
3. **Space drawer icon** (panel-with-arrow) — **contextual: rendered only inside a space**. Expands/collapses the space working area (see §5).

Search lives in the left sidebar, not the top bar. The avatar lives in the sidebar footer (existing `AvatarDropdown` — keep all its current functionality: credits, settings, theme, what's new, feedback, logout).

## 2. Left sidebar

Files: `components/layout/Sidebar.tsx`, `sidebar/SidebarStudioHeader.tsx`, `sidebar/SidebarStudioFooter.tsx`, `sidebar/useSidebarController.ts`, layout in `app/(dashboard)/layout.tsx`.

### Collapsed rail (default) — 72px
- ROAS icon (`/Logos/roas/icon-black.png` / `icon-white.png` for dark) at top.
- Icon + 10px label stacks: Home, Team, Spaces, Brain, Projects, Flows (keep existing icons + `Campaigns` where the product renames). Active item = `nav-glass-selected-purple` rounded square + purple label.
- Avatar at bottom. Scrollbar hidden (`scrollbar-width:none`).
- **Hovering rail items does NOT expand the sidebar** — only the top-bar sidebar button does. Rail items are directly clickable.
- Hovering a rail item that has a submenu (Team, Spaces, Brain) opens its **section flyout** (see below).

### Expanded panel — 272px
Top to bottom: ROAS wordmark (`/Logos/roas/wordmark-black.png`) → **Home / Chat segmented toggle** → green "New" button (`chip-glass-green`) → Search row → menu content → footer (avatar + name + plan, existing `AvatarDropdown`).

Two menu states driven by the segmented toggle (the toggle **only swaps the menu, it never navigates**):
- **Home menu**: nav items (Home, Team, Campaigns, Brain) + a **"More"** row (chevron + label) containing Projects and Flows in a flyout (hover shows, click pins). Below: Pinned campaigns, then nothing else (recents live in the chat menu).
- **Chat menu**: Pinned conversations + Recents list. Clicking a conversation opens it (see §4).
- **Home / Chat active states are mutually exclusive.**

### Section flyouts (Team / Spaces / Brain / More)
- Trigger: hover on the row (expanded menu) or rail icon; click pins.
- Anchored to the right edge of the trigger (fixed positioning, escapes overflow clipping), `card` background, 12px radius, shadow, ~220px min width, uppercase section title.
- Content mirrors the app's existing submenu content: Team → Manage Agents, Manage Skills, Direct messages (agent list + unread dots, "See more"); Spaces → campaign list with counts + "New campaign"; Brain → Manage Brains, Train Brain, User/Customer/Agent brains, Campaign Knowledge.
- **Any click in the main content area closes open flyouts** (this was a bug in an earlier iteration — don't regress it).
- User request: match the existing app's flyout colors/padding and its in/out animation. Keep existing icons.

## 3. Home / Chat model

- **Home** (view): the dashboard — "Your dashboard" header with Reorder/Customize, Agenda card (week nav, highlighted next meeting with Open meeting/Start prep, Tomorrow divider, event rows), then 2-col grids: My tasks + Mission Approval queue, Notification feed + Recent conversations. All bind to existing `features/home` components. Grids must use `minmax(0,1fr)` columns so truncation works.
- **Chat greeting screen** (new-chat view): MuseoModerno greeting "Good {daypart}, {firstName}" (no icon next to it), composer card (placeholder "What are we working on?"; row: `+`, **agent selector pill** (purple glass, only on new chats), "All Campaigns ▾" scope pill, mic, emerald send), then the **Active** list (running automations with Review buttons).
- **"New" is the only way to the new-chat screen.** It also closes any open space chat.
- An **individual conversation page**: centered 740px thread — small agent label at top ("Vibey · CEO", not a selector), user bubble (right, `--secondary` bg, 16px radius), "Worked for Xm Ys" divider, muted trace rows, assistant paragraphs, reply composer (plain: `+` and send).

## 4. Chat drawer (the core interaction)

One chat, everywhere:
- From the **chat menu**, clicking a conversation while inside any section (space, Brain, Flows, Team, Projects) opens it in a **left-docked chat drawer** (default 280px) beside the section content — never navigates away. From Home or the chat screen it opens the full conversation page.
- The drawer is **persistent across navigation** until explicitly closed/minimized.
- **Drag-to-resize** via right edge (240–560px). Reuse `usePanelResize` / `ResizableDivider`.
- **Minimize** button (« icon, top-right of drawer): tucks the chat away, conversation retained; the Chat tab restores the same conversation in place.
- Empty drawer = exactly the new-chat greeting screen (greeting + composer + Active list). At <360px width: greeting scales to ~19px, hide the All Campaigns pill and mic.
- When the drawer opens, **auto-collapse the right summary panel** to keep the work area legible.

## 5. Space detail layout

- Space screen (e.g. Meetings): header breadcrumb `General / Meetings ▾` + description + Share; view tabs (All Meetings, Prep, Follow-ups, Action items, Agenda, Calendar, Meeting Logs, People, Missions, + View — first active with underline); toolbar (Group by … Completed chip, + Task); table Name / Call Kind / Attendees (colored pills) / Call Date; "+ Add task". Table sits in a hidden-scrollbar horizontal scroller with ~680px min-width.
- The top-bar **space drawer icon** collapses/expands the working area. Collapsed = chat fills the space full-width (identical to the main chat screen). The collapsed working area must be fully removed from layout (not a zero-width flex sibling).

## 6. Right summary panel — 300px

Toggle via the list icon in the top bar. Tabs: **Tasks / Files / Sources** (segmented). Defaults: Tasks on Home, Files in work contexts. See phantom table: ship the shell + Tasks binding first.

## State management (per prototype)

`menuChat` (which sidebar menu), `sidebarPinned`, `sidebarPeek` (hover overlay), `flyout {key, pinned, anchorRect}`, `chatDrawer {open, conversationId|null, width}`, `spaceWorkOpen`, `rightPanel {open, tab}`, current route/view. Notable invariants:
- Home/Chat toggle never navigates; never closes the chat drawer.
- Minimize keeps `conversationId`; Chat tab restores.
- Collapsing the space working area forces the chat open (never an empty main area).
- "New" resets the drawer and routes to the new-chat screen.

## Design tokens (from `globals.css` — use the variables, not hex)

- Background `#faf9f6` / card `#fffdf8` / foreground `#1a1a1a` / border `rgba(0,0,0,0.08)`
- Primary emerald `#10b981` (hover `rgb(52,211,153)`), secondary `#f3f4f6`, muted-fg `#4b5563`, hover-subtle `#e8e5df`
- Purple selected-nav glass: gradient `rgba(147,51,234,0.15) → rgba(199,126,255,0.25) → rgba(147,51,234,0.12)`, border `rgba(199,126,255,0.35)` (= `.nav-glass-selected-purple`)
- Green chip: `.chip-glass-green`
- Fonts: Inter (body), MuseoModerno (wordmark, greetings, screen titles)
- Shadows: `--shadow-1/2/3`; radii 8–16px per component

## Assets

- `/Logos/roas/icon-black.png`, `icon-white.png`, `wordmark-black.png`, `wordmark-white.png` (already in `apps/web/public`)
- Icons: existing lucide-react set — do not redraw

## Files in this bundle

- `Claude-ChatGPT Inspired UI v4.dc.html` — the interactive prototype (final agreed direction). Open it, click everything: sidebar button hover/pin, Home/Chat toggle, section flyouts, More, spaces → space detail, chat drawer open/resize/minimize, right panel, space drawer collapse.
- `support.js` — runtime the prototype needs (reference only).

## Suggested implementation order (Cursor)

1. Top bar + sidebar rail/expanded/pin-peek behavior (pure frontend, no new data)
2. Section flyouts + More (reuse existing submenu data/components)
3. Home/Chat menu toggle + chat greeting screen + conversation page
4. Persistent chat drawer in sections (resize, minimize, space full-width mode)
5. Right summary panel shell + Tasks binding; leave Open-in/Files/Sources stubs flagged
