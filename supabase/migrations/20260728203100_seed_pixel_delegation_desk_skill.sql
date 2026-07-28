-- Seed Pixel's system-level Delegation Desk processing skill.
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
  'delegation-desk',
  'Delegation Desk',
  'Consolidates brain dumps and selected Space tasks into concise Delegation Packets, then routes approved or urgent work to humans, managed agents, or The ROAS Portal. Use for Delegation Desk intake, bulk delegation, urgent routing, task consolidation, and review-first assignment.',
  $skillbody$# Delegation Desk

Turn rough ideas and selected Space tasks into a small number of clear Delegation Packets. Use this skill when work arrives from the Delegation Desk, when the user asks Pixel to organize a brain dump for delegation, or when several existing tasks should be routed without creating assignment noise.

## Goal

Protect the team from raw intake while moving authorized work forward. Preserve the user’s original thought as evidence, but give owners a concise brief that sounds like a capable operator wrote it.

## Intake contract

Read the current intake task and its `custom_data.delegation` metadata. Treat these fields as routing evidence:

- `mode`: `batch`, `review`, or `urgent`
- `source_space_id` and `source_item_ids`: the work that must be read before routing
- `source_fingerprint`: the stable identity used to avoid duplicate packets
- `note`: the user’s added context

Raw intake is private working material. Do not assign it directly to a teammate, copy rough language into a team brief, or notify the team merely because an intake task exists.

## Processing method

1. Move the intake task from Inbox to Processing.
2. Read every referenced source item, including description, notes, owner, status, subtasks, links, and relevant client or campaign context.
3. Search for existing open Delegation Packets and destination tasks with the same source fingerprint, source ids, or outcome. Update existing work instead of creating a duplicate.
4. Consolidate work by client or campaign, desired outcome, workstream, and destination. Prefer one accountable packet with subtasks over several disconnected assignments.
5. Write each Delegation Packet with:
   - Outcome
   - Why now
   - Context and source links
   - Scope
   - Done when
   - One accountable owner or destination
   - Due date or urgency when supplied
   - Open questions only when they block execution
6. Preserve source ids and the intake id in the packet’s `custom_data.delegation`.
7. Route only after the packet is coherent and the destination is resolved.

## Dispatch modes

### Batch

Look for other unprocessed batch intake in this Delegation Desk that belongs to the same client, campaign, outcome, or workstream. Consolidate it when doing so reduces noise. Create or update Delegation Packets and leave them Ready for review.

### Review

Process only the current intake and directly referenced work. Create or update finished Delegation Packets and leave them Ready for review. Do not dispatch until the user approves them.

### Urgent

Check identity, duplicates, client or campaign, destination, and required context without waiting for a batch window. Dispatch coherent work in the same run. Stop only when a required selector is unresolved or dispatch would create material ambiguity. Leave a blocked packet with one focused question when that happens.

Urgent mode authorizes internal work routing. It does not authorize publishing, spending money, contacting an external person, or bypassing an existing approval gate.

## Destination routing

- Human teammate: create or update a durable task with `assignee_type:"human"` and the resolved human owner.
- Managed AI agent: use `delegate_to_agent` with the complete packet. Use `ask_agent` only for read-only help.
- Funnel, landing page, campaign page, or fulfillment work: follow the `page-grader-operator` skill and create confirmed work in The ROAS Portal.
- Ambiguous, sensitive, or externally impactful work: leave the packet Ready for review or Blocked.

Do not report Dispatched until the destination tool returns a durable task, delegation, or fulfillment record. Store that receipt on the packet and source intake.

## Completion

Update the intake task:

- `dispatched` when every authorized packet has a confirmed destination receipt
- `ready_review` when packets are prepared but approval is required
- `blocked` when a required selector is unresolved
- `dismissed` when every source was already completed, duplicated, or intentionally declined

Return one concise receipt in the intake activity:

`Captured {source count} items → {packet count} packets. {dispatched count} dispatched, {review count} ready for review, {blocked count} blocked.`

Name owners or destinations only when resolved.

## Examples

**Selected tasks, review first**

Input: Five selected tasks include two website fixes for one client, two email revisions for the same campaign, and one reporting question. Mode is `review`.

Result: Create three Delegation Packets, preserve all five source ids, and leave the packets Ready for review. Do not assign the five raw tasks or send five notifications.

**Urgent website replacement**

Input: “The current site is outdated. We already have the webinar landing page. Replace it today.” Mode is `urgent`, and the client plus source page are resolved.

Result: Check for existing website work, consolidate the replacement scope into one fulfillment packet, send the confirmed request to The ROAS Portal, store its receipt, and respond with one short confirmation. Do not expose internal Page Grader terminology.
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
