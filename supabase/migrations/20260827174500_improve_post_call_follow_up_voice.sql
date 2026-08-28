-- Keep Pixel's client follow-up conversational while preserving the meeting's
-- actual follow-up count and evidence-backed status for every action.
UPDATE public.agent_skills
SET
  markdown_content = $skillbody$# Post-call delivery

Turn completed meeting context into a friendly, shareable Slack recap and a clear set of owned follow-ups. Use this skill after a recorded meeting or call when the user wants a recap, approval draft, follow-up message, or post-call delivery loop.

## Goal

Write the message a thoughtful operator would actually send after the call. The reader should understand why the group met, what changed, what happens next, and who owns each commitment without reading the transcript.

## Working method

1. Ground every claim in the supplied meeting summary, transcript excerpt, recording link, or follow-up records. Do not invent decisions, owners, dates, or commitments.
2. Open like a real Slack follow-up: “Hey @channel, good call today. Here’s a quick recap of what we covered.” Use `@channel` only when the destination is a shared client channel; omit it for a DM or when the destination is unknown.
3. Follow with one short “As discussed…” paragraph that states the central focus or outcome in plain language. Add supporting context only when it helps the client understand the direction.
4. Introduce the work with “Here’s our hit list of actions on our end:” and list every supplied follow-up that belongs in the client recap. Do not target a fixed number of bullets; the records for this meeting determine the count.
5. Start each bullet with the supplied status normalized to `(DONE)`, `(IN PROGRESS)`, or `(TO-DO)`. Preserve owners, deadlines, useful links, and the concrete result. Never mark work done unless the source says it is done. Keep client-owned asks separate from “our end” rather than presenting them as team commitments.
6. Close with one brief, forward-looking line that fits the actual work. Keep it warm and specific without promising an update, campaign result, or delivery date that was not supplied.
7. Write only the client-ready recap in `message`. The review formatter owns the internal `Call Recording` link, so do not add a recording link or internal section headings to the client message.
8. If a Fathom jump link includes `timestamp=`, make the clickable label the clock time (`M:SS` / `H:MM:SS`) and put it first, then the plain takeaway text.
9. Keep the draft easy to forward into a Slack channel. Use short paragraphs and Slack-compatible bullets. Avoid tables, long transcript extracts, robotic owner summaries, and internal implementation language.
10. Treat the output as a Shadow proposal. Drafting never authorizes delivery. The exact approved draft must be sent without regeneration.
11. When `known_names` is supplied (`campaigns`, `page_grader_clients`, `slack_people`), prefer those canonical spellings for clients and teammates over transcript misspellings. Do not invent names that are not in the meeting context or `known_names`.

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

Input: The team agreed to improve webinar show rate. The audience exclusions and retargeting setup are confirmed done. Nefi is cleaning up the reminder sequence. Dylan still needs to map a YouTube training into a lead-magnet funnel. A Fathom link is supplied.

Output:

```json
{
  "message": "Hey @channel, good call today. Here’s a quick recap of what we covered.\n\nAs discussed, the core focus is improving webinar show rate and tightening the follow-up journey.\n\nHere’s our hit list of actions on our end:\n\n- (DONE) Confirm the attendee and buyer exclusions for new webinar campaigns\n- (DONE) Confirm the registrant retargeting setup\n- (IN PROGRESS) Clean up the webinar reminder sequence\n- (TO-DO) Map the YouTube training into a lead-magnet funnel\n\nLooking forward to a strong week. I’ll keep you posted as these move forward.",
  "rationale": "The recap sounds natural in Slack while making the verified progress and remaining work easy to scan.",
  "context_sources": ["meeting summary", "follow-up records", "recording link"]
}
```

**Example: internal call with an unknown owner**

Input: The group decided to simplify onboarding. The owner and deadline for the implementation task were not supplied.

Output:

```json
{
  "message": "Good call today. Here’s a quick recap of what we covered.\n\nAs discussed, the core focus is simplifying onboarding so new clients reach the first useful step faster.\n\nHere’s our hit list of actions on our end:\n\n- (TO-DO) Define the simplified onboarding flow; owner and deadline still need confirmation\n\nLooking forward to getting the simplified path mapped out.",
  "rationale": "The recap records the decision while keeping the unresolved owner visible for review.",
  "context_sources": ["meeting summary", "follow-up records"]
}
```
$skillbody$,
  updated_at = now()
WHERE agent_key = 'vibey'
  AND skill_key = 'post-call-delivery'
  AND user_id IS NULL
  AND org_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_skills
    WHERE agent_key = 'vibey'
      AND skill_key = 'post-call-delivery'
      AND user_id IS NULL
      AND org_id IS NULL
  ) THEN
    RAISE EXCEPTION 'System post-call-delivery skill was not found';
  END IF;
END $$;
