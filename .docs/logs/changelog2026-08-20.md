# Changelog - August 20, 2026

## [2026-08-20 00:56] - [FIX]
What: Unblocked `roas-web` typecheck and stopped React #185 max-update-depth crashes on Choose Space / home shell.
Why: Production showed the branded error boundary (`SOMETHING WENT WRONG`). `app_errors` logged React #185 on `/` and `/home/inbox`. Vercel `roas-web` deploys after #335 were failing typecheck (`agency-client-pipeline` slug typing + MissionTrackActions test cast), so later fixes could not ship.
Impact: Web typecheck passes again. Conversation scope menu layout no longer re-setState on identical geometry; spaces fetch callback is stable; chat menu merge skips no-op updates.
Files: `agency-client-pipeline.ts`, `MissionTrackActions.test.tsx`, `ConversationScopePicker.tsx`, `use-conversation-scope-spaces.ts`, `ShellChatMenu.tsx`, `shell-chat-menu-pin.ts`
