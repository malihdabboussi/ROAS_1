---
name: customer-call-routing
description: Route customer interaction knowledge into Customer Brain by using backend actions. Use when receiving a /customer-call-routing command or when Atlas is dispatched on a customer_interaction_route brain-ops job after a Fathom, widget, or Telegram source emits an interaction envelope.
---

# Customer Call Routing

You decide which non-host people or source identities deserve Customer Brain memories, then you save those memories by calling `save_customer_memory`.

Do not return a routing JSON object. The worker does not parse your final text for writes. The durable result of this job is the backend action call.

## Why Actions, Not JSON

Customer Brain writes use the same architecture as the other Brain families: Atlas decides, calls a backend action, and the backend validates scope, contact ownership, permissions, embeddings, and persistence.

This keeps Customer Brain consistent with User Brain, Agent Brain, and Company Brain. It also makes future channels reusable: Fathom, Slack, Gmail, widgets, and Telegram should all write through the same Customer Brain action surface.

## Role Taxonomy

Classify each non-host attendee into exactly one role:

| Role | Meaning | Action |
|---|---|---|
| `customer` | Has paid the host or is in an active customer relationship | Call `save_customer_memory` if confidence >= 0.75 |
| `lead` | Discussing buying, evaluating, onboarding, pricing, or next steps | Call `save_customer_memory` if confidence >= 0.75 |
| `team_of_customer` | Works with or supports a customer relationship | Call `save_customer_memory` if confidence >= 0.75 |
| `cofounder` | Host's business partner | Do not save to Customer Brain |
| `team_member` | Host's own employee or contractor | Do not save to Customer Brain |
| `vendor` | Supplier or service provider the host pays | Do not save to Customer Brain |
| `investor` | Investor or potential investor | Do not save to Customer Brain |
| `peer` | Operator/founder peer, no customer relationship | Do not save to Customer Brain |
| `friend` | Personal friend | Do not save to Customer Brain |
| `family` | Family member | Do not save to Customer Brain |
| `unknown` | Insufficient evidence | Do not save to Customer Brain |

If two roles fit, pick the role that drives the call's purpose. Customer relationships dominate when the call is about the offer; personal/internal context dominates when it is not.

## Inputs

The worker provides:

1. **Customer Brain target** — `brain_id` for the only Customer Brain you may write to.
2. **Allowed customer contacts** — contact rows with real `contact_id` values.
3. **Allowed customer source identities** — durable source anchors for customers without a known contact.
4. **Host** — name, email, and aliases to exclude from customer routing.
5. **Offers** — declared offer names/prices when available.
6. **Existing contacts** — current type/source/confidence.
7. **Recent User Brain context** — who is cofounder, team, family, vendor, etc.
8. **Interaction** — source id, title, date, attendees, transcript.

Use `contact_id` only when the id appears in **ALLOWED_CUSTOMER_CONTACTS**. If a real customer or lead has no allowed contact id, omit `contact_id` and include a durable source anchor from **ALLOWED_CUSTOMER_SOURCE_IDENTITIES** or the interaction Source ID. Do not invent contact ids or source identity values.

## Workflow

1. Identify the host and exclude the host from per-attendee Customer Brain saves.
2. Review each allowed non-host contact and source identity.
3. Decide whether the interaction contains customer-side knowledge for that contact or source identity.
4. For `customer`, `lead`, or `team_of_customer` with confidence >= 0.75, call `save_customer_memory`.
5. For all other roles, make no Customer Brain write.
6. Finish with a short plain-text summary for trace readability only.

Internal/team-only calls are successful when you make zero `save_customer_memory` calls.

## Action Contract

Call `save_customer_memory` with this shape:

```json
{
  "action": "save_customer_memory",
  "data": {
    "brain_id": "<customer_brain_id>",
    "contact_id": "<allowed_contact_id or omit when unknown>",
    "source_identity": "<allowed source identity value when contact_id is absent>",
    "content": "<2-4 paragraph customer memory grounded in this call>",
    "memory_type": "insight",
    "source_type": "fathom_call",
    "source_id": "<meeting_id>",
    "source_title": "<meeting_title>",
    "occurred_at": "<recording_start_time_or_scheduled_start_time>",
    "occurred_until": "<recording_end_time_or_scheduled_end_time_or_null>",
    "asserted_at": "<ingestion_or_processing_time>",
    "temporal_source": "fathom_call",
    "significance": 0.6,
    "tags": ["fathom", "customer_call_routing"],
    "speaker": "<attendee name or email>",
    "metadata": {
      "meeting_id": "<meeting_id>",
      "source_identity_kind": "<identity kind or null>",
      "source_identity_value": "<identity value or null>",
      "attendee_email": "<attendee_email>",
      "attendee_name": "<attendee_name or null>",
      "routing_confidence": 0.85,
      "routing_rationale": "<short reason>"
    }
  }
}
```

The call window belongs in temporal fields, not just metadata. If the recording was imported today but happened in the past, `occurred_at` stays the past call time and `asserted_at` is when Atlas processed it.

## Memory Content Standard

Write the Customer Brain memory from the customer's side of the relationship:

- what they care about
- what they are trying to solve
- what they resisted or questioned
- what they committed to
- how they describe their situation
- any useful buying, onboarding, product, or success signal

Do not save generic meeting summaries. Save durable customer intelligence.

## Privacy Rule

Never save friend or family details into Customer Brain. If a friend/family member appears on a business call, omit their personal details from Customer Brain entirely.

## Examples

### Clear Customer Call

If Maria is an allowed contact and the transcript shows onboarding for a paid accelerator, call:

```json
{
  "action": "save_customer_memory",
  "data": {
    "brain_id": "customer-brain-id",
    "contact_id": "maria-contact-id",
    "content": "Maria runs a four-trainer gym in Austin and is joining the accelerator to systematize operations before opening a second location. Her main concern is delegating client communication without losing the personal touch members expect.\n\nShe is open to scripts and async voice messages but resistant to chatbots. The first 30 days should focus on team training rather than technical setup. She committed to a September 12 start date with 50/50 payment terms.",
    "memory_type": "insight",
    "source_type": "fathom_call",
    "source_id": "meeting-123",
    "source_title": "Maria Accelerator Onboarding",
    "significance": 0.75,
    "tags": ["fathom", "customer_call_routing"],
    "speaker": "Maria Lopez",
    "metadata": {
      "meeting_id": "meeting-123",
      "attendee_email": "maria@gymownerco.com",
      "attendee_name": "Maria Lopez",
      "routing_confidence": 0.92,
      "routing_rationale": "Onboarding call for a paid accelerator customer."
    }
  }
}
```

### Internal Call

If the call is only the host and internal collaborators planning a webinar, make no `save_customer_memory` calls. Final text can say:

```text
Internal planning call. No Customer Brain memories saved.
```

### Mixed Call

If a cofounder joins a sales call with a lead:

- Do not save a Customer Brain memory for the cofounder.
- Save one Customer Brain memory for the lead if confidence >= 0.75 and the lead has an allowed `contact_id` or durable source identity.

## Final Response

After action calls, return a short summary:

- how many Customer Brain memories you saved
- which contacts they belonged to
- why no memories were saved, if none were appropriate

Do not include JSON unless you are calling a backend action.
