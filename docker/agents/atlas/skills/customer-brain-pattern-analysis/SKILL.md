---
name: customer-brain-pattern-analysis
description: Detect cross-customer belief patterns and synthesize cross-customer perspectives from a customer brain's memory pool. Use when receiving a /customer-brain-pattern-analysis slash command, or when Atlas is dispatched on a brain_pattern_analysis brain-ops job for a brain whose scope is customer. Triggered by the worker after enough new customer-brain memories accumulate.
---

# Customer Brain Pattern Analysis

You read a customer brain's accumulated memories and emit two things: belief patterns that recur across multiple customers, and perspectives that cluster those beliefs into shared worldviews. The worker takes your structured JSON and writes the database rows — your job is the synthesis judgment, not the persistence.

This is the cross-customer cognition layer. There is no per-customer rollup here — `customer_unit_id` is the grouping key for known contacts, accounts, and source-backed unknown customers. `contact_id` is present only when known. Beliefs and perspectives are themes that emerge across the population. A pattern that only one customer unit holds is not yet a customer-brain belief.

## Why this skill is separate from `brain-pattern-analysis`

The user-brain version reads organized narrative pages and synthesizes the user's own evolving worldview. The customer brain has different inputs (raw conversation memories tagged with `customer_unit_id`, no narrative-page layer), a different cognitive task (find themes that recur across people, not within one person), and a different downstream consumer (avatars synthesized later from these perspectives, not a single capsule). Same write primitives, different upstream judgment.

## What counts as a customer-side belief

A *customer-side belief* is a conviction that recurs across **at least 3 distinct customer units** (different `customer_unit_id`s on supporting memories), with consistent emotional signature. The bar is structural — single mentions, however vivid, are not yet beliefs. They are signal for next time.

Beliefs can be about anything: themselves, the host's offer, the host's category, the world, what's possible for them. Don't constrain by topic — let the data decide. Limiting the taxonomy here would close off the long-tail signals that later define new offers.

## What counts as a customer-side perspective

A *customer-side perspective* is a coherent worldview formed when **at least 3 aligned customer-side beliefs** cluster around a shared frame (*"organic is the only honest channel"*, *"hiring before systems is reckless"*). One belief is a fact; three aligned beliefs are a lens.

Perspectives explain *why* the beliefs cluster. Not "these three beliefs are similar" — that's restating. The narrative names the frame: what's the underlying story the population is telling itself?

## Evidence types

Every belief carries an `evidence_type` reflecting how the conviction shows up in the memories:

| Type | When to use |
|---|---|
| `stated` | Customers said this in words. They might be performing or aspirational. |
| `revealed` | Customers acted as if this were true (purchasing decisions, what they prioritized when forced to choose). Stronger than stated. |
| `behavioral` | Pattern of repeated behaviors, not just one action. Strongest. |

Default to `stated` when the only signal is language. Promote to `revealed` when at least one customer's behavior corroborates. `behavioral` is reserved for patterns visible in three or more customers' actions.

Evidence type is a property of the belief, not a separate insight. If a current `stated` belief is later corroborated by action, reinforce the existing belief with `evidence_type: "revealed"` in `belief_updates`; do not create a second belief with the same name or description.

The downstream consumer (avatar synthesis) weights `revealed` and `behavioral` higher than `stated` — overconfident `behavioral` tags poison avatar quality. Calibrate honestly.

## Lifecycle states

Beliefs and perspectives both move through `emerging → active → challenged → resolved`:

- `emerging` — first detection or strength below 0.6.
- `active` — strength ≥ 0.6, multiple supporting memories, no contradicting signal.
- `challenged` — new evidence contradicts the belief. Don't delete; surface the tension. The "challenged" state is the leading indicator of a worldview shift.
- `resolved` — the contradiction has settled. Either the belief is gone (archived) or it has *transformed* into a new belief. Resolved beliefs are read-only history.

Surface tensions deliberately. A belief under contradiction is not noise — it is the most informative signal you can output, because it reveals where the customer population is moving.

## Inputs you receive

The worker hands you these labeled blocks:

1. **BRAIN** — the customer brain's id, the org name, and (when populated) declared offers. Used to give beliefs an offer-relevant frame.
2. **DISCRIMINATOR_AXES** — the canonical seven axes (`stakes`, `horizon`, `money`, `reference_frame`, `identity`, `pain`, `risk`) plus any org-specific axes already promoted. When a belief maps cleanly onto an axis, tag it; the avatar-synthesis pass downstream uses these tags to find seams.
3. **EXISTING_BELIEFS** — current `ns_belief_patterns` rows for this brain, with their status, strength, supporting_memories, last_reinforced_at, evidence_type. Your output references these by id when reinforcing or challenging.
4. **EXISTING_PERSPECTIVES** — current `ns_perspectives` rows, same shape.
5. **MEMORIES** — the new customer-brain memories since the last analysis pass. Each carries `id`, `content`, `customer_unit_id`, optional `contact_id`, optional `source_identity_id`, `source_type`, `created_at`, temporal fields such as `occurred_at` / `occurred_until`, and any prior `emotional_valence` / `emotional_intensity` scores. Group by `customer_unit_id` to find the cross-customer themes — you need at least 3 distinct customer units on the supporting set for any new belief.

## The workflow

1. **Cluster memories by theme**, ignoring identity for semantic clustering but tracking which `customer_unit_id`s contribute to each cluster. Use `occurred_at` for sequence and recency when present; fall back to `created_at` only when the event time is unknown. Skip clusters with fewer than 3 distinct customer units — the bar exists for a reason.

2. **For each qualifying cluster, decide:**
   - Reinforces an existing belief → `belief_updates` entry with `op: "reinforce"`, the belief's id, the new supporting memory ids, and `evidence_type` when the new evidence should promote the existing tier. Don't restate the belief description; the worker keeps existing wording and just appends.
   - Contradicts an existing belief → `belief_updates` entry with `op: "challenge"`, the id, and the contradicting memory ids. The worker flips status to `challenged`.
   - The belief is fully resolved (the population has moved on; no more memories support it and the contradicting evidence has settled) → `op: "resolve"` with rationale. Use sparingly.
   - New belief → `new_beliefs` entry with `pattern_name`, `description`, `emotional_signature`, `supporting_memory_ids`, `supporting_customer_unit_ids`, optional `supporting_contact_ids`, `evidence_type`, `discriminator_axis` if it maps to one.

3. **Synthesize perspectives** when 3+ active beliefs in this brain align into a coherent frame:
   - New cluster → `new_perspectives` with `name`, `description`, `narrative_md` (prose, not bullet points — this is the *story* of the worldview), `belief_ids`, `blind_spots`, `evidence_distribution` summarizing the stated/revealed/behavioral mix of supporting beliefs.
   - Existing perspective shifts → `perspective_updates` with `op: "update"` or `"archive"` and rationale.

When belief or perspective evidence shows a formation, shift, contradiction, or resolution over time, make that explicit in `narrative_md` and log it as timeline-worthy. Do not treat late-imported old calls as fresh customer movement.

4. **Don't pre-compute decay or archival timestamps.** The Night Janitor handles `last_reinforced_at` and `decayed_at`. Your job is to write today's signal honestly; decay is bookkeeping.

## Output schema

Wrap the entire response in a single fenced ` ```json ... ``` ` block. The worker parses with a regex on the first such block.

```json
{
  "brain_id": "uuid (echo from BRAIN block)",
  "new_beliefs": [
    {
      "pattern_name": "string (3-8 words)",
      "description": "string (one paragraph)",
      "emotional_signature": {
        "dominant_emotion": "string",
        "valence": -1.0,
        "intensity": 0.0,
        "speaker_intent": "string or null"
      },
      "supporting_memory_ids": ["uuid", "..."],
      "supporting_customer_unit_ids": ["uuid", "..."],
      "supporting_contact_ids": ["uuid", "..."],
      "evidence_type": "stated | revealed | behavioral",
      "discriminator_axis": "stakes | horizon | money | reference_frame | identity | pain | risk | null"
    }
  ],
  "belief_updates": [
    {
      "id": "uuid",
      "op": "reinforce | challenge | resolve",
      "supporting_memory_ids": ["uuid", "..."],
      "evidence_type": "stated | revealed | behavioral | null",
      "rationale": "one short sentence"
    }
  ],
  "new_perspectives": [
    {
      "name": "string (3-6 words)",
      "description": "string (one paragraph)",
      "narrative_md": "string (multi-paragraph prose; the story of this worldview)",
      "belief_ids": ["uuid", "..."],
      "blind_spots": "string (what this lens hides)",
      "evidence_distribution": { "stated": 0.0, "revealed": 0.0, "behavioral": 0.0 }
    }
  ],
  "perspective_updates": [
    {
      "id": "uuid",
      "op": "update | archive",
      "rationale": "one short sentence",
      "narrative_md": "string or null (only when op=update and the narrative shifted)"
    }
  ],
  "log_event": {
    "summary": "one short sentence describing this pass"
  }
}
```

## Examples

### Example 1 — first qualifying cluster forms a new belief

**Inputs (abridged):**
- BRAIN: 8 memories from 4 distinct customer units. Three of them mention being burnt out on hiring; the fourth has not talked about hiring at all.
- EXISTING_BELIEFS: empty.

**Output:**

```json
{
  "brain_id": "<brain-id>",
  "new_beliefs": [
    {
      "pattern_name": "Hiring is a tax, not leverage",
      "description": "Customers in the small-team segment treat hiring as a drag on the founder's time and quality, not as multiplied capacity. The dominant emotional tone is reluctant resignation: they hire when forced to, not when they planned to.",
      "emotional_signature": {
        "dominant_emotion": "reluctance",
        "valence": -0.4,
        "intensity": 0.7,
        "speaker_intent": "venting"
      },
      "supporting_memory_ids": ["mem_1", "mem_3", "mem_5"],
      "supporting_customer_unit_ids": ["cu_a", "cu_b", "cu_c"],
      "supporting_contact_ids": ["c_a", "c_b", "c_c"],
      "evidence_type": "stated",
      "discriminator_axis": "stakes"
    }
  ],
  "belief_updates": [],
  "new_perspectives": [],
  "perspective_updates": [],
  "log_event": {
    "summary": "First customer-side belief formed: 'Hiring is a tax' from 3 distinct customer units."
  }
}
```

### Example 2 — three active beliefs cluster into a new perspective

**Inputs (abridged):**
- EXISTING_BELIEFS includes three active beliefs: *"Hiring is a tax, not leverage"*, *"Systems beat creativity"*, *"Organic is the only honest channel"*. Each has supporting customer units overlapping by 4–6 customers.

**Output:**

```json
{
  "brain_id": "<brain-id>",
  "new_beliefs": [],
  "belief_updates": [],
  "new_perspectives": [
    {
      "name": "The Operator's Lens",
      "description": "A worldview held by a cluster of agency owners and small-team operators who frame growth as systems work, not creative work.",
      "narrative_md": "These customers came up through service work and hit a wall when their personal output stopped scaling. The shift, in their telling, was when they realized the work itself was repeatable — that the founder's intuition could be encoded into a checklist if they were honest about how they actually decided things. From there, hiring became a mechanism for reproducing a system rather than for finding more talent. Organic channels feel honest to this group because organic is the channel where the system shows up; paid is where polish hides absence.\n\nThis lens has a compounding logic: every belief reinforces the others. If hiring is a tax (because untrained hires erode the system), and systems beat creativity (because creativity is unrepeatable), and organic is the only honest channel (because organic exposes whether the system works), the conclusion is the same — *build the operating system first, then add humans*.",
      "belief_ids": ["b_1", "b_2", "b_3"],
      "blind_spots": "Underrates the role of brand and unpredictable creative bets that don't compound but unlock category-defining moments. The lens sees creativity as a leak; it can't see creativity as an option.",
      "evidence_distribution": { "stated": 0.6, "revealed": 0.3, "behavioral": 0.1 }
    }
  ],
  "perspective_updates": [],
  "log_event": {
    "summary": "Synthesized 'The Operator's Lens' from 3 aligned active beliefs."
  }
}
```

### Example 3 — challenge an existing belief without resolving it

**Inputs (abridged):**
- EXISTING_BELIEFS: *"Customers always want more 1:1 access"* (active, strength 0.7, supported by 5 customer units).
- New memories: 3 memories from 3 different customer units saying they'd actually prefer async / cohort over 1:1.

**Output:**

```json
{
  "brain_id": "<brain-id>",
  "new_beliefs": [],
  "belief_updates": [
    {
      "id": "b_existing",
      "op": "challenge",
      "supporting_memory_ids": ["mem_new_1", "mem_new_2", "mem_new_3"],
      "rationale": "Three customer units in this batch volunteered they prefer async/cohort over 1:1 — direct contradiction of the active belief."
    }
  ],
  "new_perspectives": [],
  "perspective_updates": [],
  "log_event": {
    "summary": "Marked '1:1 access' belief as challenged based on 3 new contradicting memories."
  }
}
```

## Output contract

The worker parses the first fenced ` ```json ... ``` ` block via regex. These rules exist because of the parser, not stylistic preference:

- Wrap the entire response in a single fenced ` ```json ... ``` ` block. Anything outside is dropped before parsing.
- Echo the `brain_id` from the BRAIN input block. The worker uses it to scope writes; an empty or missing field fails validation.
- `supporting_memory_ids`, `supporting_customer_unit_ids`, and optional `supporting_contact_ids` reference real ids from the MEMORIES block. Inventing ids creates orphan rows.
- `belief_updates[].id` and `perspective_updates[].id` reference real ids from EXISTING_BELIEFS / EXISTING_PERSPECTIVES. The worker rejects unknown ids.
- `new_beliefs[].evidence_type` and `belief_updates[].evidence_type` are one of the three enum values exactly. Other strings are dropped.
- Use `belief_updates[].evidence_type` only to preserve or promote an existing belief's evidence tier. Never downgrade `behavioral` to `revealed` or `revealed` to `stated`.
- `discriminator_axis` is one of the seven canonical axes or `null`. Free-text axis names are dropped — the avatar-synthesis pass owns axis registration.
- New beliefs need `supporting_customer_unit_ids.length >= 3` with distinct values. The worker drops new beliefs that don't meet this bar; emit them only when the cross-customer threshold is genuinely met. `supporting_contact_ids` is a compatibility projection for known contacts, not the threshold.
- New perspectives need `belief_ids.length >= 3`. Same reason.
