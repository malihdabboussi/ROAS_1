# Changelog - August 17, 2026

## [2026-08-17 00:04] - [FIX]

What: Slack Recents seed from the first message again. Gemini still replaces that snippet with a short topic title when it returns; empty/placeholder `Slack Chat` rows fall back to the snippet instead of staying unlabeled.

Why: Seeding every Slack thread as `Slack Chat` until Gemini finished was harder to scan than the original first-message titles.

Impact: New Slack chats show the inbound text immediately. Generated topic titles still overwrite that snippet. Existing `Slack Chat` rows get the first-message title if Gemini does not return one.

Files: `apps/api/src/modules/slack/services/slack-service-conversation.base.ts`, `apps/api/src/modules/slack/services/slack-conversation-title.ts`, `apps/api/src/modules/conversations/utils/conversation-title.util.ts`, `apps/web/src/features/studio/services/conversation-title-scheduler.ts`, `documentation/features/claude-chatgpt-shell.md`
