# Changelog - July 22, 2026

## [2026-07-22 00:25] - [FEATURE]

What: Extended the shell top-right work-area collapse control (PanelRight) from Spaces-only to Team, Brain, Flows, and Artifacts. Collapsing hides the page surface and shows full chat; expanding restores the screen without remounting.
Why: Spaces already had this; the other primary workspace screens needed the same way to focus chat.
Impact: On Team/Brain/Flows/Artifacts, use the top-right collapse control like Spaces.
Files: `shell-route-policy.ts`, `ShellTopBar.tsx`, `ShellWorkspace.tsx`, `shell-chat-breadcrumb.ts`, related unit tests
