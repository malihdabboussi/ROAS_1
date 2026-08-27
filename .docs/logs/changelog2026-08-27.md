# Changelog - August 27, 2026

## 2026-08-27 16:20 - [FIX]

What: Made the Meetings surface deterministically select the active organization Meetings space when a legacy personal duplicate is present.

Why: Equal-ranked duplicate spaces let stale and refreshed space lists switch the visible call dataset, causing new calls to appear and disappear.

Impact: Meetings remains on one canonical dataset; production history was consolidated and the latest Yasir call was mapped to Yasir Khan Coaching LTD.

Files: `apps/web/src/app/(dashboard)/home/meetings/MeetingsUnifiedSurface.tsx`, `apps/web/src/app/(dashboard)/home/meetings/MeetingsUnifiedSurface.test.tsx`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-27 16:35 - [FIX]

What: Replaced the meeting workspace's recap-only shortcut with **Run post-call flow**.

Why: The meeting workspace should launch the same guided context, task delegation review, and editable follow-up-message cycle as Pixel's Slack review link.

Impact: Operators can start the complete human-controlled post-call workflow directly from a completed meeting.

Files: `apps/web/src/features/home/config/meeting-post-call-actions.config.ts`, related meeting tests, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-27 16:55 - [FIX]

What: Corrected the Run post-call flow delegation stage to use the connected MCP server and `use_mcp_tool` contract.

Why: The prior prompt omitted the required MCP server identifier and treated a remote Page Grader tool like a native action, allowing Pixel to fall back to an invalid Delegation Desk write.

Impact: Post-call reviews request the existing Portal bulk-delegation confirmation link from any meeting Space without creating tasks or writing to Delegation Desk.

Files: `apps/web/src/features/home/config/meeting-post-call-actions.config.ts`, its contract test, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-27 17:25 - [FIX]

What: Replaced the prompt-generated post-call context stage with an inline editable review card populated from Pixel's persisted Slack recap and prepared message, mapped meeting details, and the live non-dismissed follow-up list.

Why: Re-generating Stage 1 changed seven proposed follow-ups into ten meeting actions, hid the prepared message, and let Pixel fall back to native `create_task` writes in the Delegation Desk.

Impact: Slack links and the meeting **Run post-call flow** button now enter the same review state; Continue uses the existing Page Grader bulk-delegation preview and preserves the final editable message without sending it.

Files: `apps/api/src/modules/spaces/services/meeting-follow-up-slack-confirm.workflow.ts`, `apps/web/src/components/global-chat/`, `apps/web/src/features/home/`, `documentation/features/meeting-follow-up-slack.md`
