-- Keep Pixel's database-backed post-call delivery skill aligned with its
-- checked-in runtime copy.
INSERT INTO public.agent_skills (
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source,
  user_id,
  org_id
)
VALUES (
  'vibey',
  'post-call-delivery',
  'Post-call delivery',
  'Turns completed meeting context into a friendly, shareable Slack recap with owned follow-ups. Use after recorded meetings or calls for recap drafts, approval messages, follow-up delivery, and post-call Slack loops.',
  $skillbody$# Post-call delivery

Turn completed meeting context into a friendly, shareable Slack recap and a clear set of owned follow-ups. Use this skill after a recorded meeting or call when the user wants a recap, approval draft, follow-up message, or post-call delivery loop.

## Goal

Write the message a thoughtful operator would actually send after the call. The reader should understand why the group met, what changed, what happens next, and who owns each commitment without reading the transcript.

## Working method

1. Ground every claim in the supplied meeting summary, transcript excerpt, recording link, or follow-up records. Do not invent decisions, owners, dates, or commitments.
2. Open naturally. Prefer a short human line such as “Good connecting today” over a report title.
3. Summarize the purpose and the two to five decisions or takeaways that matter after the meeting.
4. List action items by owner. Preserve supplied owner names and deadlines. Mark genuinely unassigned work as unassigned instead of guessing.
5. Put the recording link at the **top** as a short Slack link labeled `Call report` (not “Open the call recording” at the bottom).
6. If a Fathom jump link includes `timestamp=`, make the clickable label the clock time (`M:SS` / `H:MM:SS`) and put it first, then the plain takeaway text.
7. Keep the draft easy to forward into a Slack channel. Use short paragraphs and Slack-compatible bullets. Avoid tables, long transcript extracts, and internal implementation language.
8. Treat the output as a Shadow proposal. Drafting never authorizes delivery. The exact approved draft must be sent without regeneration.
9. When `known_names` is supplied (`campaigns`, `page_grader_clients`, `slack_people`), prefer those canonical spellings for clients and teammates over transcript misspellings. Do not invent names that are not in the meeting context or `known_names`.

## Internal review and revision

Treat the first Slack message as an internal review brief, not as the client message itself. Clearly separate meeting context and approval instructions from the proposed client-facing draft.

When `current_draft` and `revision_feedback` are supplied, revise the client-facing draft using that feedback while preserving grounded decisions, owners, and links. Return a complete replacement draft. Do not describe the edit, answer conversationally, or retain wording the reviewer asked to remove. The replacement becomes a new Shadow version and requires approval before delivery.

## Output contract

Return JSON only:

```json
{
  "message": "Slack-ready recap",
  "rationale": "One sentence explaining why this recap and these follow-ups matter",
  "context_sources": ["meeting summary", "follow-up records", "recording link"]
}
```

## Examples

**Example: client call with owners**

Input: The team agreed to revise the webinar hook. Nefi owns three new concepts by Thursday. Dylan will review reporting. A Fathom link is supplied.

Output:

```json
{
  "message": "<https://fathom.video/example|Call report>\n\nGood connecting today. We aligned on tightening the webinar hook before the next traffic push.\n\n*Next steps*\n• *Nefi* — deliver three revised hook concepts by Thursday\n• *Dylan* — review reporting and confirm the next test",
  "rationale": "The recap keeps the agreed direction and named ownership visible without repeating the transcript.",
  "context_sources": ["meeting summary", "follow-up records", "recording link"]
}
```

**Example: internal call with an unknown owner**

Input: The group decided to simplify onboarding. The owner and deadline for the implementation task were not supplied.

Output:

```json
{
  "message": "Good sync today. We agreed to simplify onboarding so new clients can reach the first useful step faster.\n\n*Next step*\n• *Unassigned* — define the simplified onboarding flow and confirm a deadline",
  "rationale": "The recap records the decision while keeping the unresolved owner visible for review.",
  "context_sources": ["meeting summary", "follow-up records"]
}
```
$skillbody$,
  true,
  'system',
  NULL,
  NULL
)
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = EXCLUDED.is_enabled,
  source = EXCLUDED.source,
  updated_at = now();
