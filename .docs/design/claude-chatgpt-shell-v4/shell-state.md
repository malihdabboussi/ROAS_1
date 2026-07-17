# Shell state contract (Claude/ChatGPT shell v4)

Source: `.docs/design/claude-chatgpt-shell-v4/README.md` + interactive prototype.

## Fields

| Field | Type | Notes |
| --- | --- | --- |
| `sidebarPinned` | `boolean` | Expanded sidebar in-flow when true |
| `sidebarPeek` | `boolean` | Overlay expand on top-bar hover (fixed under top bar; does not push layout) |
| `menuMode` | `'home' \| 'chat'` | Sidebar menu only — never navigates |
| `flyout` | `{ key, pinned, anchorRect } \| null` | Section flyouts (Team/Campaigns/Brain/More) |
| `chatDrawer` | `{ open, conversationId, width, minimized }` | Persistent left drawer in section routes |
| `spaceWorkOpen` | `boolean` | Space working area visible (false = chat full-width) |
| `rightPanel` | `{ open, tab: 'tasks' \| 'files' \| 'sources' }` | Summary panel |

## Invariants

1. Home/Chat toggle never navigates and never closes the chat drawer.
2. Minimize keeps `conversationId`; Chat menu restores the same conversation.
3. Collapsing the space working area forces chat open (never an empty main area).
4. **New** resets the drawer and routes to the new-chat screen.
5. Opening the chat drawer auto-collapses the right panel.
6. Rail icon clicks navigate; only the top-bar sidebar button pins/peeks the expanded panel.
7. Clicking main content closes open flyouts.

## Persistence

- `sidebarPinned`, `chatDrawer.width`, `rightPanel.open`/`tab`, `menuMode` may persist in `localStorage` under `vibey.shell.*`.
- `sidebarPeek` is ephemeral (hover only).
