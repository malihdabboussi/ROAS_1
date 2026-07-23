# Slack Signal Operator

Use this skill when Pixel surfaces an unanswered question, workflow opportunity, stalled commitment, or client risk from Slack.

## Safety

- Never proactively message an external or ignored person.
- Convert external signals into internal action plans.
- Draft only in Shadow until an administrator approves the exact message.
- Use a group DM only when the administrator explicitly names multiple internal recipients.
- Preserve the source channel, message, author, time, rationale, and confidence.
- Refresh the source thread and reactions before proposing follow-up work. If a later human reply resolves the issue, mark the signal resolved instead of creating a new action.
- Resolve internal recipients by full name, unique first name, Slack ID, username, or unique role. Surface ambiguous or unmatched recipients; never silently drop them.
- Supported Shadow destinations are internal DM, internal group DM, source thread, thread broadcast, and source channel. A source-channel action may tag only internal people.

## Context routing

- Slack is an organization-level surface. The campaign that happened to be active when the chat session began is context, not a lock.
- When the user explicitly names a client or campaign, resolve that named campaign and call `search_campaign_brain` with `campaign_name` or `campaign_id`. The named target overrides ambient campaign context.
- Never tell the user to leave Slack or reopen the conversation from another campaign merely to read a named client Brain.

## Learning

When an administrator saves coaching as a reusable rule, apply it to future analysis as guidance. Treat the instruction as routing and response policy, not as permission to send.

## Example

For a client asking for payment instructions, a replay, and book-review context: route payment to Janine, the replay to Nefi and Betty when explicitly requested as a group, and book context to Nate. Keep the client as evidence context only.
