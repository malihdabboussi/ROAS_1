# Delegation Desk

Capture outstanding work in one private holding tank before it becomes an assignment. Use this skill when work arrives from the Delegation Desk, when a call or chat produces commitments, when the user asks Pixel to organize a brain dump, or when selected Space tasks need planning before delegation.

## Goal

Give the user a complete, reviewable list of work that still needs to happen. Preserve the source and deadline, clarify what done means, and keep each item unassigned until its owner and destination are known.

## Work model

- A **work item** is one trackable outcome.
- A **work group** is an optional parent for related work items that should stay together.
- A work group is not an opaque document. Its executable parts are subtasks with their own owner, due date, status, and completion record.
- Work may remain in the holding tank without an assignee or client Space. That is expected planning state, not an error.

Read the current task and its `custom_data.delegation` metadata:

- `mode`: `batch`, `review`, or `urgent`
- `source_space_id` and `source_item_ids`: source work to read before planning
- `source_fingerprint`: stable identity for duplicate detection
- `note`: additional user context

Raw intake is private evidence. Do not assign it directly, copy rough language into a team brief, or notify the team merely because it was captured.

## Processing method

1. Move new intake from Holding tank to Organizing.
2. Read every referenced source item and relevant call, chat, client, campaign, and Person Brain context.
3. Search for open Desk work and destination tasks with the same fingerprint, source ids, or outcome. Update existing work instead of duplicating it.
4. Create the smallest clear set of work items. Use a work group only when subtasks share one outcome or delivery sequence.
5. Give every work item:
   - desired outcome
   - why it matters
   - source links or evidence
   - scope
   - done-when criteria
   - due date or urgency when known
   - client or campaign when resolved
   - one focused open question only when it blocks delegation
6. Preserve source ids and the intake id in `custom_data.delegation`.
7. Leave unassigned planning work in Ready to delegate. Route it only after the owner and destination are resolved.

## Dispatch modes

### Batch

Look for other unprocessed intake in this Delegation Desk that belongs to the same client, campaign, outcome, or workstream. Consolidate only when that makes the work easier to execute. Create or update work items and leave them Ready to delegate.

### Review

Process only the current intake and directly referenced work. Create or update finished work items and leave them Ready to delegate. Do not delegate until the user approves them.

### Urgent

Check identity, duplicates, client or campaign, destination, and required context without waiting for a batch window. Delegate coherent work in the same run. Stop only when a required selector is unresolved or delegation would create material ambiguity. Leave a blocked work item with one focused question when that happens.

Urgent mode authorizes internal work routing. It does not authorize publishing, spending money, contacting an external person, or bypassing an existing approval gate.

## Destination routing

- Human teammate: create or update a durable task with `assignee_type:"human"` and the resolved human owner.
- Managed AI agent: use `delegate_to_agent` with the complete work brief. Use `ask_agent` only for read-only help.
- Funnel, landing page, campaign page, or fulfillment work: follow the `page-grader-operator` skill and create confirmed work in The ROAS Portal.
- Ambiguous, sensitive, or externally impactful work: leave the work item Ready to delegate or Blocked.

Do not report Delegated until the destination tool returns a durable task, delegation, or fulfillment record. Store that receipt on the Desk item and source intake. Keep delegated work in progress until completion is verified; then mark it Done.

## Completion

Update the intake task:

- `dispatched` when every authorized work item has a confirmed destination receipt
- `ready_review` when work is prepared but approval or an owner is required
- `blocked` when a required selector is unresolved
- `dismissed` when every source was already completed, duplicated, or intentionally declined

Return one concise receipt in the intake activity:

`Captured {source count} sources → {work item count} work items. {delegated count} delegated, {review count} ready to delegate, {blocked count} blocked.`

Name owners or destinations only when resolved.

## Examples

**Selected tasks, review first**

Input: Five selected tasks include two website fixes for one client, two email revisions for the same campaign, and one reporting question. Mode is `review`.

Result: Create three work items, preserve all five source ids, and leave them Ready to delegate. If two website fixes share one outcome, use one work group with two subtasks. Do not assign the five raw tasks or send five notifications.

**Urgent website replacement**

Input: “The current site is outdated. We already have the webinar landing page. Replace it today.” Mode is `urgent`, and the client plus source page are resolved.

Result: Check for existing website work, create one clear fulfillment work item, send the confirmed request to The ROAS Portal, store its receipt, and respond with one short confirmation. Do not expose internal Page Grader terminology.

**Unmapped promise from a call**

Input: A meeting recap says, “We will send the revised budget by Friday,” but no owner or client Space is resolved.

Result: Create an unassigned work item in Ready to delegate with Friday as its due date, the recording as evidence, and one focused owner question. Keep it visible in the Desk until it is delegated or dismissed.
