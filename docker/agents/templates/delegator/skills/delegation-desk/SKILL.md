---
name: Delegation Desk
description: Capture, clarify, route, and track outstanding work through the Delegation Desk without assigning raw notes or claiming unconfirmed handoffs.
---

# Delegation Desk

Use this skill for every Delegator request and every Delegation Desk intake.

## Goal

Maintain one private, reviewable list of work that still needs to happen. Turn rough inputs into clear work, resolve the correct destination, delegate only when authorized, and track each handoff through completion.

## Intake protocol

1. Read the current Desk item and its delegation metadata.
2. Read every referenced source item plus relevant meeting, chat, person, client, campaign, and Brain context.
3. Search open Desk work and destination tasks for the same source or outcome.
4. Update existing work when found; do not duplicate it.
5. Create the smallest useful set of work items. Use a parent work group only when related subtasks share an outcome or sequence.
6. Give every work item an outcome, why it matters, source evidence, scope, done-when criteria, due date or urgency, client or campaign, and one owner.
7. Preserve source identifiers and the intake identifier on the work item.

## Resolve before asking

- Treat a named person as a human first.
- Resolve full names, first names, Slack identities, portal teammates, People records, job roles, and campaign ownership.
- If one person has multiple Slack accounts, resolve them to the durable person record and select the workspace identity appropriate to the destination.
- Use a managed AI agent only when the user explicitly identifies an agent or asks you to choose one.
- If several candidates remain, ask one focused question and recommend the strongest match.

## Dispatch modes

### Batch

Combine related intake only when it improves execution. Prepare the work and leave it Ready to delegate.

### Review

Prepare only the current intake and its referenced work. Leave it Ready to delegate until approved.

### Urgent

Resolve identity, duplicates, client or campaign, destination, and required context in the current run. Delegate immediately when those checks pass. Urgent mode never authorizes publishing, spending, contacting an external person, or bypassing another approval gate.

## Destination routing

- Human teammate: create or update a durable assigned task.
- Managed AI agent: delegate a complete execution brief. Use read-only consultation only when execution was not requested.
- Client Service Request / fulfillment work of any type (design, copy, funnel/landing page, GHL, ad creative, video, general): route through the existing ROAS Portal operator as a draft — never a silent native task.
- Sensitive, ambiguous, or externally impactful work: leave Ready to delegate or Blocked.

Never say “Page Grader,” “MCP,” or expose internal tool names to users. Say “The ROAS Portal.”

## State and receipts

- `ready_review`: prepared but awaiting approval or a resolved owner.
- `dispatched`: every authorized item has a confirmed destination receipt.
- `in_progress`: the destination has started the work.
- `done`: completion is verified and linked.
- `blocked`: one required decision remains unresolved.
- `dismissed`: the source is duplicate, completed, or intentionally declined.

Do not report Delegated until the destination returns a durable task, delegation, or fulfillment receipt. Store that receipt on the Desk item and source intake.

Return a concise summary:

`Captured {source count} sources → {work item count} work items. {delegated count} delegated, {review count} ready to delegate, {blocked count} blocked.`

## Examples

**“Have Rafay build a funnel like this for Asura Group.”**

Resolve Rafay as a human first, resolve Asura Group across the ROAS Portal, campaign Brain, Slack channel, and client records, inspect the reference page, then create a clear assigned fulfillment task. Ask only if multiple Rafays or campaigns remain after searching.

**Five selected tasks in Review mode**

Convert them into the smallest coherent work set, preserve all five source ids, and leave them Ready to delegate. Do not notify five teammates or assign the raw tasks.

**Urgent internal follow-up**

Confirm the internal owner and client, check whether the issue was already handled, create or update one task, dispatch it, and store the receipt. Do not message the client.
