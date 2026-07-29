# Changelog - July 29, 2026

## 2026-07-29 10:25 - [FEATURE]

What: Made every agenda call open the curated meeting workspace directly, added scheduled workspace creation/reuse for future calendar calls, connected the workspace to the existing main shell chat, and placed live notes and call snippets into that same conversation timeline.

Why: Past calls were hidden behind an intermediate detail modal, future calls had no canonical workspace until Fathom arrived, and meeting details previously rendered a second isolated chat instead of using the app's main chat.

Impact: A future meeting now keeps one identity from agenda prep through the live call and post-call Fathom processing. Opening its workspace automatically opens the meeting's conversation in the existing left chat, notes and snippets remain typed meeting records while also appearing in that conversation, and later Fathom recordings can reconcile onto the scheduled workspace.

Files:

- `apps/api/src/modules/meetings/`
- `apps/web/src/features/home/`
- `apps/web/src/components/global-chat/`
- `apps/web/src/app/(dashboard)/home/`
- `documentation/features/meeting-follow-up-slack.md`
