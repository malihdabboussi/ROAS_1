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

## 2026-08-27 17:45 - [FIX]

What: Updated Pixel's post-call delivery skill and guided-review prompt to produce a conversational Slack recap with a central takeaway, status-led hit list, and short forward-looking close.

Why: The generic owner-based “Next steps” draft did not match the natural follow-up style used with clients and could carry a stale task count into the final message.

Impact: The editable follow-up now includes exactly the grounded meeting actions, preserves their real `(DONE)`, `(IN PROGRESS)`, or `(TO-DO)` states, and remains copy-only with no automatic send.

Files: `docker/agents/vibey/skills/post-call-delivery/SKILL.md`, `supabase/migrations/20260827174500_improve_post_call_follow_up_voice.sql`, `apps/web/src/features/home/config/meeting-post-call-actions.config.ts`, its test, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-27 17:25 - [FIX]

What: Added the canonical call date/time and mapped Client Workspace directly below the meeting title in Pixel's post-call review DM.

Why: A client-name-only request could make a recap look plausible even when the wrong provider meeting was selected, and a recording link did not identify or open the ROAS delegation-review flow.

Impact: Every normal Pixel post-call review now makes the selected meeting identity visible before the summary and retains the ROAS **Review meeting follow-ups** action.

Files: `apps/api/src/modules/spaces/services/meeting-follow-up-slack-message.ts`, its focused tests, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-27 17:28 - [FIX]

What: Completed the post-call review card and replaced its authenticated Meetings deep link with an expiring public meeting-review link.

Why: Client Workspace was free text, attendee option IDs were not resolved, follow-ups could not be dismissed, the prepared message could be blank or disappear, and incognito reviewers were redirected to login.

Impact: Pixel's link now opens one token-scoped review in signed-out browsers; reviewers can map the real client workspace, see and edit attendees, dismiss irrelevant follow-ups, continue into the existing Portal delegation instructions, and retain the prepared message through the editable final chat draft.

Files: `apps/api/src/modules/meetings/`, `apps/api/src/modules/spaces/services/meeting-follow-up-slack-confirm.workflow.ts`, `apps/web/src/app/meeting-review/`, `apps/web/src/components/global-chat/`, `apps/web/src/features/home/`, `apps/web/src/middleware.test.ts`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-27 18:15 - [FIX]

What: Rebuilt the public post-call review as a canonical meeting context step, a direct ROAS Portal bulk-delegation handoff, and a final editable follow-up-message step.

Why: The former transition sent a long Pixel chat prompt with a 15-minute timeout, leaving the page on **Preparing task review** instead of opening the existing delegation preview. The public context also used disconnected form values and exposed the follow-up message too early.

Impact: Call Kind, Call status, Client Workspace, and attendees now reuse Meetings field controls; tasks can be edited or removed and require WHO, WHAT, and WHEN; the Portal confirmation link is created directly with a 30-second browser timeout; and the copy-only client message appears only after task review.

Files: `apps/api/src/modules/integrations/page-grader/services/page-grader-api.service.ts`, `apps/api/src/modules/meetings/`, `apps/web/src/components/global-chat/`, `apps/web/src/components/spaces/cells/ClientCampaignCell.tsx`, `apps/web/src/features/home/`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-27 19:05 - [FIX]

What: Made the public post-call context form preserve its mapped client/campaign and task dates through failed retries, send the Portal's required client identifier, and reuse the standard Meetings selectors and task date picker.

Why: A client-only picker result dropped the campaign mapping, the direct Portal request omitted `client_id`, and replacing the saved payload before preview success reset the operator's due dates after an error.

Impact: The context form keeps WHO, WHAT, WHEN, and Client Workspace edits intact, opens full-container call selectors, shows a readable uncollapsed summary without Slack heading markers, and can continue into the existing Portal task review with the canonical client and campaign.

Files: `apps/api/src/modules/meetings/services/meeting-follow-up-review.service.ts`, `apps/api/src/modules/meetings/services/meeting-follow-up-review.service.test.ts`, `apps/web/src/components/global-chat/components/MeetingPostCallReviewCard.tsx`, `apps/web/src/components/global-chat/components/MeetingPostCallReviewCard.test.tsx`, `apps/web/src/features/home/components/PublicMeetingFollowUpReviewPage.tsx`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-27 20:33 - [FIX]

What: Replaced the authenticated meeting-chat post-call prompt with a direct delegation-preview request and shared task-review and follow-up-message stages.

Why: Continuing from **Run post-call flow** still handed the confirmed meeting tasks back to Pixel, which could reinterpret the task list, ask another question, or fail to return the Portal review link.

Impact: The public Slack link and meeting-chat button now deterministically submit the same confirmed meeting, client mapping, and WHO/WHAT/WHEN tasks to the existing Portal bulk-delegation preview. The client message remains hidden until task review is marked complete.

Files: `apps/api/src/modules/meetings/controllers/meeting-follow-up-review.controller.ts`, `apps/api/src/modules/meetings/services/meeting-follow-up-review.service.ts`, `apps/api/src/modules/meetings/services/meeting-follow-up-review.service.test.ts`, `apps/web/src/components/global-chat/components/MeetingPostCallReviewStages.tsx`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.test.tsx`, `apps/web/src/features/home/components/PublicMeetingFollowUpReviewPage.tsx`, `apps/web/src/features/home/services/meeting-follow-up-review-api.ts`, `documentation/features/meeting-follow-up-slack.md`
