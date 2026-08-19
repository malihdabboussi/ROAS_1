# Changelog - August 19, 2026

## [2026-08-19 04:22] - [FIX]
What: Merged Client Context Bundle (#318) onto N0 ask-kind (#317) without dropping either path. `handleMessageEvent` still resolves the channel stamp and records `slack_pixel_turns`; it also loads the §11.11 bundle and `buildInboundSlackTurnPrompt` injects `[Client context]` after identity on client/unclear asks (skipped on general). Named-DM client ids stamp telemetry as `named`.
Why: Both PRs edited `slack-service-events.base.ts`. Taking only #318's prepend would overwrite the N0 prompt; taking only #317's stamp would drop the Yasir channel bundle.
Impact: Slack Pixel DMs that name a client get the channel list in the prompt and still write a turn row. Pre-existing slack-media / sender-resolver test failures unchanged.
Files: `slack-service-events.base.ts`, `slack-turn-prompt.ts`, `slack-turn-prompt.test.ts`

## [2026-08-19 04:30] - [FIX]
What: Merged Service Request direct-asset links (#320) onto main without dropping N0 stamp, Client Context Bundle, or quote inherit. `handleMessageEvent` still builds the N0 prompt, then appends the `[Assets]` block; forwarded unfurl files still feed `collectInboundSlackFiles`.
Why: #320 also edited `slack-service-events.base.ts`. Taking only the old prepend path would overwrite N0; taking only main would drop the MFS Elite asset rule.
Impact: Slack asks still classify/log turns and now carry openable asset URLs into the Pixel prompt for SR creation.
Files: `slack-service-events.base.ts`

## [2026-08-19 04:35] - [FIX]
What: Merged CONNECTIONS bind + Campaign Brain preload (#321) onto main without dropping N0, Client Context Bundle, quote inherit, or SR assets. Slack still classifies/logs the turn and appends `[Assets]`; `routeToAgent` also sends `campaign_id` on `/api/channel-chat`.
Why: #321 edited `slack-service-events.base.ts` (campaignId on the channel-chat payload) which #317/#318/#320 also own.
Impact: Slack client asks bind CONNECTIONS at turn start and still write `slack_pixel_turns`.
Files: `slack-service-events.base.ts`

## [2026-08-19 05:20] - [FIX]
What: Meeting workspace status is now the All Meetings task Status field (branded SelectCell: To action / Processing / Following up / Waiting / Done). Continue in chat moved onto the same row as Start/End call and Recap / Clean up / Follow-up. Removed the native Live / Completed / No Show / Rescheduled select from that page.
Why: Calendar/meeting workspace showed a generic call-status dropdown that did not match the main task card, and Continue in chat sat in the header away from the post-call actions.
Impact: Changing status on the meeting page updates the same `space_items.status` as All Meetings / the task card. Recording-driven `custom_data.call_status` is unchanged for related-call scoring.
Files: `MeetingCallStatusSection.tsx`, `MeetingWorkspaceStatusSelect.tsx`, `MeetingWorkspaceDialog.tsx`, `use-meeting-space-status-field.ts`, tests, `meeting-follow-up-slack.md`
