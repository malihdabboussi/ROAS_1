---
name: customer-avatar-synthesis
description: Cluster a customer brain's perspectives + beliefs into emergent customer avatars — bottom-up worldview clusters with McAdams narrative arcs, Robbins six-needs profiles, discriminator profiles on canonical axes, and contrast profiles versus peer avatars. Use when receiving a /customer-avatar-synthesis slash command, or when Atlas is dispatched on a brain_avatar_synthesis brain-ops job. Triggered after enough customer-brain memories accumulate (25+ since last pass) or weekly via the Night Janitor.
---

# Customer Avatar Synthesis

Avatars are bottom-up worldview clusters that emerge from the customer brain. You read the brain's accumulated cognition (memories, beliefs, perspectives) and decide which clusters of customers share enough of the same lens to be one avatar.

You are not building personas top-down. The host already has declared offers — those are biasing signals, not labels. Your job is to find what *actually* separates the customer population, name the clusters honestly, and emit the structured JSON the worker uses to write `customer_avatars` rows.

## Why this is the only genuinely new cognitive verb

Belief synthesis and perspective synthesis already cluster signal within one person's worldview. Avatar synthesis clusters *across* people, but with a twist that simple similarity won't capture: two avatars don't separate by what they *say* — they separate by where they *fork*. A creator and a gym owner can both say *"I want to grow."* What differentiates them is the dimensions they live in: stakes vocabulary, time horizon, money relationship, identity self-talk, pain vocabulary. That's what the discriminator axes capture, and that's what makes "find the seams" the central pass here.

The order is: **anchor → fork → cluster**. Not cluster → name. Hard anchors (purchase, cohort enrollment) are strongest when present. Soft anchors (the discriminator axes) handle the rest. Belief overlap *inside* a discriminator bucket is what tightens the cluster into an avatar — not what creates it.

## What you receive

The worker hands you these labeled blocks, in this order:

1. **BRAIN** — the customer brain's id, the org name, the host's declared offers.
2. **DISCRIMINATOR_AXES** — the canonical seven (`stakes`, `horizon`, `money`, `reference_frame`, `identity`, `pain`, `risk`) plus any org-specific axes already promoted to `status='active'`. You score each avatar on these.
3. **EXISTING_AVATARS** — current `customer_avatars` rows for this brain, with their `name`, `member_customer_unit_ids`, compatibility `member_contact_ids`, `discriminator_profile`, `status`. Your output references these by id when updating, splitting, merging, or archiving.
4. **PERSPECTIVES** — the brain's active customer perspectives, with `name`, `narrative_md`, `beliefs[]`. These are the lenses you cluster *into* avatars.
5. **BELIEFS** — the brain's active belief patterns, with `pattern_name`, `description`, `evidence_type`, `discriminator_axis` (when tagged), `status`. These tighten cluster definitions inside a discriminator bucket.
6. **CONTACTS** — known contacts referenced by customer units, with their `id`, `email`, `business_name`, `contact_type`. Used only to populate compatibility `member_contact_ids`.
7. **CUSTOMER_UNITS** — the real customer units in this brain: known contacts, accounts, and source-backed unknown customers. Used to populate `member_customer_unit_ids`.
8. **MEMORIES_SAMPLE** — a representative slice of recent customer-brain memories (capped) with their `customer_unit_id`, optional `contact_id`, content, temporal fields such as `occurred_at`, and `surprise_score` when present. Use these to ground avatar narratives in actual conversation tone — not to reverse-engineer beliefs.

## The workflow

### 1. Find the seams

For each canonical (and active org-specific) discriminator axis, ask: *"does the customer population fork along this axis?"* — does any subset of customer units cluster at the high end, and another at the low end?

A meaningful fork needs **≥3 customers on each side** of the seam. Single-customer extremes are noise. If no axis splits the population that cleanly yet, return zero new avatars and surface this in `log_event.summary` — that's a useful signal too.

### 2. Map customers onto axes

For each customer who has at least one supporting memory or belief, locate them on the axes that fork. Express the location as a 1–10 score per axis. A customer who never used hiring vocabulary, never mentioned revenue, only talked about views and posts, scores low on `stakes`. Be conservative — when the signal isn't there, leave the axis unscored.

### 3. Cluster

Group customers whose axis scores cluster together. **A cluster needs ≥3 members and at least 2 axes where the cluster's signature is distinct from any other cluster.** One axis is too narrow; >7 is overfitting. If a cluster only has 1–2 distinguishing axes, treat it as `emerging` until more signal arrives — emit it with low strength rather than over-confident.

### 4. Name and characterize each cluster

For each qualifying cluster, build the avatar:

- **`name`** — short, recognizable label (3–6 words). Use the host's vocabulary when it matches the cluster, not a generic title. *"Cohort Studio Owners"* beats *"Avatar 2"*.
- **`summary`** — one short paragraph capturing the lens this avatar holds.
- **`narrative_md`** (McAdams arc, prose, not bullets):
  - **Origin** — where this person came from; the world they built themselves out of.
  - **Fear** — what they're trying not to become or lose.
  - **Aspiration** — what they hope to become.
  - **Anti-self** — the version of themselves they refuse.

  Don't label these sections inside the prose — *write* the arc. The McAdams structure is the load-bearing skeleton; the reader should feel the story, not see the headings.
- **`needs_profile`** (Robbins six human needs, 1–10 each):
  - `certainty`, `variety`, `significance`, `connection`, `growth`, `contribution`.
  - Mark the top two as `rank: "primary"`. Optionally mark a third as `rank: "secondary"`. The rest stay `rank: null`.
  - Anchor the scores in *behavior*, not language. A customer who keeps testing new offers scores high on `variety` even if they say they value `certainty`.
- **`discriminator_profile`** — keyed by axis ID, integer scores 1–10. *Only* axes from the DISCRIMINATOR_AXES block. Free-text axis names go to `proposed_axes` (see step 7), not here.
- **`dominant_perspective_ids`** — the perspectives this avatar holds, in priority order.
- **`dominant_belief_ids`** — the converged convictions.
- **`dominant_pain_points`** — short phrases (3–8 words each) describing the pain this avatar wakes up with.
- **`emotional_signature`** — `{ dominant_emotion, valence, intensity, speaker_intent }` summarizing the tone of this avatar's memories.
- **`blind_spots`** — what this lens *can't see*. Every worldview has blind spots; name them explicitly.
- **`offer_ids`** — the host offers this avatar buys (or would buy). Use the BRAIN block's offer list.
- **`member_customer_unit_ids`** — the actual customers/source-backed units in this cluster (at least 3).
- **`member_contact_ids`** — known-contact compatibility projection. Include only contacts from CONTACTS that correspond to the selected units.
- **`member_strength`** — per-unit membership weight as `{ customer_unit_id: 0.0..1.0 }`. A partial fit scores 0.5; a textbook member scores 0.9+.
- **`evidence_distribution`** — `{ stated, revealed, behavioral }` summing to roughly 1.0. Avatars heavily weighted on `stated` are flagged as lower-confidence downstream.
- **`lineage`** — `{ perspective_ids, belief_ids, key_memory_ids, key_customer_ids }` — the traceable chain from raw signal to avatar.

### 5. Contrast and discriminate

Once you have a complete avatar set (existing + new), compute for each avatar:

- **`contrast_profile`** — `{ peer_avatar_id: "unlike X, this avatar..." }`. One line per other active avatar in this brain. The contrast names the seam, not just the difference: *"unlike The Operator's Lens, this avatar treats hiring as the act of multiplying brand presence, not as the act of reproducing systems."*
- **`discriminator_questions`** — 2–4 questions that cleanly separate this avatar from each peer. These are runtime probes embedded agents will use when an incoming customer is ambiguous between two avatars. Frame them as conversational, not interview-style: *"Are you trying to scale a team or scale your reach?"* — not *"Please rate your priorities…"*

### 6. Lifecycle ops on existing avatars

- **Reinforce** — an existing avatar's membership grew or its profile is well-supported. Emit an entry in `avatar_updates` with `op: "update"` and the refreshed fields. Don't rewrite `narrative_md` unless the story actually shifted.
- **Shift** — the avatar's profile is moving. Update with `status: "shifting"` and updated discriminator_profile / member set.
- **Split** — one cluster has bifurcated into two coherent sub-clusters. Emit an entry with `op: "split"` referencing the old avatar's id, plus two `new_avatars` entries representing the children. The worker archives the old avatar and creates the children.
- **Merge** — two existing avatars are now indistinguishable. Emit `op: "merge"` referencing both ids, plus a `new_avatars` entry representing the combined avatar. The worker archives the originals.
- **Archive** — the cluster no longer holds (members drifted away or the perspective transformed). `op: "archive"`, status moves to `transformed`.

Use these sparingly. Most passes should produce small updates, occasional new avatars, rare splits/merges.

Avatar shifts, splits, merges, and transformations are timeline-worthy. Use the evidence's `occurred_at` and supporting windows to explain when the customer worldview moved, not when Atlas ran synthesis.

### 7. Propose new discriminator axes (when needed)

If you found a seam the canonical seven don't cover, emit it in `proposed_axes`. The worker writes it to `avatar_discriminator_axes` with `status='proposed'`; after 3+ consecutive passes recur it auto-promotes to `'active'` and becomes queryable. Don't slot proposed axes into `discriminator_profile` of the avatars you're emitting *this* pass — the registry catches up first.

A proposed axis needs a stable id (snake_case), a name, a description, and high/low end signatures (example phrases or behaviors).

### 8. Cap the active avatar count

**No more than 3 active avatars per offer.** Avatars should be decisive. If a fourth cluster qualifies, prefer to merge two existing ones first, or downgrade the weakest to `archived`. Surface the merge/archive in your output.

## Output schema

Wrap the entire response in a single fenced ` ```json ... ``` ` block. The worker parses the first such block.

```json
{
  "brain_id": "uuid (echo from BRAIN)",
  "new_avatars": [
    {
      "name": "string (3-6 words)",
      "summary": "string (one paragraph)",
      "narrative_md": "string (multi-paragraph prose, McAdams arc)",
      "status": "emerging | active",
      "strength": 0.0,
      "confidence": 0.0,
      "member_customer_unit_ids": ["uuid", "..."],
      "member_contact_ids": ["uuid", "..."],
      "member_strength": { "uuid": 0.0 },
      "dominant_perspective_ids": ["uuid", "..."],
      "dominant_belief_ids": ["uuid", "..."],
      "dominant_pain_points": ["string", "..."],
      "emotional_signature": {
        "dominant_emotion": "string",
        "valence": 0.0,
        "intensity": 0.0,
        "speaker_intent": "string or null"
      },
      "blind_spots": "string",
      "discriminator_profile": { "axis_id": 0 },
      "needs_profile": {
        "certainty":     { "score": 0, "rank": "primary | secondary | null" },
        "variety":       { "score": 0, "rank": "primary | secondary | null" },
        "significance":  { "score": 0, "rank": "primary | secondary | null" },
        "connection":    { "score": 0, "rank": "primary | secondary | null" },
        "growth":        { "score": 0, "rank": "primary | secondary | null" },
        "contribution":  { "score": 0, "rank": "primary | secondary | null" }
      },
      "evidence_distribution": { "stated": 0.0, "revealed": 0.0, "behavioral": 0.0 },
      "lineage": {
        "perspective_ids": ["uuid", "..."],
        "belief_ids": ["uuid", "..."],
        "key_memory_ids": ["uuid", "..."],
        "key_customer_ids": ["uuid", "..."]
      },
      "contrast_profile": { "peer_avatar_id_or_name": "string" },
      "discriminator_questions": ["string", "..."],
      "offer_ids": ["uuid", "..."],
      "declared_avatar_id": "uuid or null"
    }
  ],
  "avatar_updates": [
    {
      "id": "uuid",
      "op": "update | split | merge | archive | shift",
      "patch": {
        "name": "string or omit",
        "narrative_md": "string or omit",
        "needs_profile": { "...": "..." },
        "discriminator_profile": { "...": "..." },
        "member_customer_unit_ids": ["uuid", "..."],
        "member_contact_ids": ["uuid", "..."],
        "status": "emerging | active | shifting | transformed",
        "contrast_profile": { "...": "..." },
        "discriminator_questions": ["string", "..."]
      },
      "merged_with": ["uuid", "..."],
      "rationale": "one short sentence"
    }
  ],
  "proposed_axes": [
    {
      "id": "snake_case_id",
      "name": "string",
      "description": "string",
      "high_end_signature": "string",
      "low_end_signature": "string"
    }
  ],
  "log_event": {
    "summary": "one short sentence describing this pass"
  }
}
```

## Examples

### Example 1 — first synthesis pass produces two avatars

**Inputs (abridged):** 18 active customer-brain perspectives, 41 active beliefs, 12 customer contacts. The host's offers are *Vibey Accelerator ($20K)* and *Instagram Growth Course ($3K)*. Two clear seams emerge on `stakes` and `horizon`.

**Output:**

```json
{
  "brain_id": "<brain-id>",
  "new_avatars": [
    {
      "name": "The Operator's Lens",
      "summary": "Agency owners and small-team operators framing growth as systems work, not creative work — they buy the Accelerator to systematize, not to grow audience.",
      "narrative_md": "These customers came up through service work — they hit a wall when their personal output stopped scaling. The shift, in their telling, was when they realized the work itself was repeatable; that the founder's intuition could be encoded into a checklist if they were honest about how they actually decided things. From there, hiring became a mechanism for reproducing a system rather than for finding more talent. They are afraid of becoming a commodity — of looking like every other agency on a ranked list. They want to be the recognized authority in their niche, but only on a path that feels structurally safe. They reject the version of themselves who keeps taking any client to keep the lights on; they refuse to be the burnt-out generalist again.",
      "status": "active",
      "strength": 0.78,
      "confidence": 0.82,
      "member_customer_unit_ids": ["cu_1", "cu_3", "cu_4", "cu_7"],
      "member_contact_ids": ["c_1", "c_3", "c_4", "c_7"],
      "member_strength": { "cu_1": 0.92, "cu_3": 0.88, "cu_4": 0.74, "cu_7": 0.70 },
      "dominant_perspective_ids": ["p_1", "p_2"],
      "dominant_belief_ids": ["b_3", "b_5", "b_9"],
      "dominant_pain_points": [
        "Founder bottleneck on quality",
        "Hiring without systems is reckless",
        "Selling time, not productized work"
      ],
      "emotional_signature": {
        "dominant_emotion": "determined frustration",
        "valence": -0.2,
        "intensity": 0.7,
        "speaker_intent": "problem-solving"
      },
      "blind_spots": "Underrates the role of brand and unpredictable creative bets that don't compound but unlock category-defining moments. The lens sees creativity as a leak; it can't see creativity as an option.",
      "discriminator_profile": { "stakes": 8, "horizon": 8, "money": 7, "reference_frame": 8, "identity": 8, "pain": 8, "risk": 4 },
      "needs_profile": {
        "certainty":     { "score": 8, "rank": "primary" },
        "variety":       { "score": 4, "rank": null },
        "significance":  { "score": 9, "rank": "primary" },
        "connection":    { "score": 6, "rank": null },
        "growth":        { "score": 7, "rank": "secondary" },
        "contribution":  { "score": 5, "rank": null }
      },
      "evidence_distribution": { "stated": 0.5, "revealed": 0.4, "behavioral": 0.1 },
      "lineage": {
        "perspective_ids": ["p_1", "p_2"],
        "belief_ids": ["b_3", "b_5", "b_9"],
        "key_memory_ids": ["m_12", "m_28", "m_31"],
        "key_customer_ids": ["cu_1", "cu_3"]
      },
      "contrast_profile": {
        "creative_studio_owners": "unlike the Creative Studio Owners avatar, this group treats system-building as the path to brand recognition, not as commoditizing the craft."
      },
      "discriminator_questions": [
        "Are you trying to scale your output or scale your reputation?",
        "If you had one quarter to grow, would you focus on systems or on a flagship piece of work?"
      ],
      "offer_ids": ["offer_accelerator"],
      "declared_avatar_id": null
    },
    {
      "name": "Creative Studio Owners",
      "summary": "Creative-led studio operators who frame growth as flagship work, not throughput — they evaluate the Accelerator suspiciously because 'systems' reads as 'commoditization' to them.",
      "narrative_md": "These customers came up making one-of-one creative work — they take pride in the fact that no two deliverables look the same. They are afraid of becoming a templated factory; the version of themselves they refuse is the one that builds a system because the system makes the work indistinguishable. They want to be the operator that big brands call when nothing else will do. The accelerator pitch lands awkwardly here because the language of 'ops' implies the very flattening they came up to escape.",
      "status": "active",
      "strength": 0.72,
      "confidence": 0.75,
      "member_customer_unit_ids": ["cu_2", "cu_5", "cu_8"],
      "member_contact_ids": ["c_2", "c_5", "c_8"],
      "member_strength": { "cu_2": 0.85, "cu_5": 0.79, "cu_8": 0.69 },
      "dominant_perspective_ids": ["p_5"],
      "dominant_belief_ids": ["b_11", "b_13"],
      "dominant_pain_points": [
        "Time commitment to deeply-crafted work",
        "Resistance to systematizing what feels intuitive",
        "Fear of brand commoditization"
      ],
      "emotional_signature": {
        "dominant_emotion": "guarded curiosity",
        "valence": 0.0,
        "intensity": 0.6,
        "speaker_intent": "evaluating"
      },
      "blind_spots": "Underrates how much brand authority comes from consistency over time, which is exactly what systems unlock. The lens sees systems as flattening; it can't see systems as a moat.",
      "discriminator_profile": { "stakes": 5, "horizon": 6, "money": 5, "reference_frame": 5, "identity": 4, "pain": 5, "risk": 6 },
      "needs_profile": {
        "certainty":     { "score": 4, "rank": null },
        "variety":       { "score": 8, "rank": "primary" },
        "significance":  { "score": 9, "rank": "primary" },
        "connection":    { "score": 7, "rank": "secondary" },
        "growth":        { "score": 6, "rank": null },
        "contribution":  { "score": 6, "rank": null }
      },
      "evidence_distribution": { "stated": 0.7, "revealed": 0.2, "behavioral": 0.1 },
      "lineage": {
        "perspective_ids": ["p_5"],
        "belief_ids": ["b_11", "b_13"],
        "key_memory_ids": ["m_18", "m_22"],
        "key_customer_ids": ["cu_2", "cu_5"]
      },
      "contrast_profile": {
        "the_operators_lens": "unlike The Operator's Lens, this avatar treats systems as a threat to brand distinctiveness rather than as a path to it."
      },
      "discriminator_questions": [
        "Would you rather scale by repeating a process or by doing one piece of work no one else can?",
        "If a system made your output indistinguishable from competitors but doubled your revenue, would you take it?"
      ],
      "offer_ids": [],
      "declared_avatar_id": null
    }
  ],
  "avatar_updates": [],
  "proposed_axes": [],
  "log_event": {
    "summary": "First synthesis pass: 2 avatars formed (Operator's Lens, Creative Studio Owners) along stakes + identity seams from 7 contacts."
  }
}
```

### Example 2 — split a previously-merged avatar

**Inputs (abridged):** EXISTING_AVATARS includes one active avatar *"Solo Coaches"* with 12 members. New memories reveal two distinct sub-clusters within: those building information products and those running 1:1 coaching practices. They diverge cleanly on `horizon` (info-product side: this quarter; 1:1 side: this week) and `risk` (info-product: high tolerance; 1:1: low).

**Output:**

```json
{
  "brain_id": "<brain-id>",
  "new_avatars": [
    {
      "name": "Info-Product Coaches",
      "summary": "Coaches building scalable information products — willing to bet on quarter-long cycles and treat audience growth as the primary lever.",
      "narrative_md": "...",
      "status": "active",
      "strength": 0.7, "confidence": 0.75,
      "member_customer_unit_ids": ["cu_a", "cu_b", "cu_c", "cu_d", "cu_e"],
      "member_contact_ids": ["c_a", "c_b", "c_c", "c_d", "c_e"],
      "member_strength": { "cu_a": 0.9, "cu_b": 0.85, "cu_c": 0.8, "cu_d": 0.75, "cu_e": 0.7 },
      "dominant_perspective_ids": ["p_x"],
      "dominant_belief_ids": ["b_y"],
      "dominant_pain_points": ["..."],
      "emotional_signature": { "dominant_emotion": "ambitious", "valence": 0.4, "intensity": 0.7, "speaker_intent": "investing" },
      "blind_spots": "...",
      "discriminator_profile": { "horizon": 7, "risk": 8, "stakes": 6 },
      "needs_profile": {
        "certainty":     { "score": 4, "rank": null },
        "variety":       { "score": 8, "rank": "primary" },
        "significance":  { "score": 7, "rank": "secondary" },
        "connection":    { "score": 5, "rank": null },
        "growth":        { "score": 9, "rank": "primary" },
        "contribution":  { "score": 6, "rank": null }
      },
      "evidence_distribution": { "stated": 0.5, "revealed": 0.4, "behavioral": 0.1 },
      "lineage": { "perspective_ids": ["p_x"], "belief_ids": ["b_y"], "key_memory_ids": ["..."], "key_customer_ids": ["cu_a", "cu_b"] },
      "contrast_profile": { "<other-avatar-id>": "..." },
      "discriminator_questions": ["..."],
      "offer_ids": [],
      "declared_avatar_id": null
    },
    {
      "name": "1:1 Coaching Practitioners",
      "summary": "Coaches running 1:1 practices — short horizon, low risk tolerance, identity tightly coupled to the personal relationship with each client.",
      "narrative_md": "...",
      "status": "active",
      "strength": 0.65, "confidence": 0.7,
      "member_customer_unit_ids": ["cu_f", "cu_g", "cu_h", "cu_i"],
      "member_contact_ids": ["c_f", "c_g", "c_h", "c_i"],
      "member_strength": { "cu_f": 0.8, "cu_g": 0.78, "cu_h": 0.7, "cu_i": 0.65 },
      "dominant_perspective_ids": ["p_z"],
      "dominant_belief_ids": ["b_w"],
      "dominant_pain_points": ["..."],
      "emotional_signature": { "dominant_emotion": "protective", "valence": 0.0, "intensity": 0.6, "speaker_intent": "stabilizing" },
      "blind_spots": "...",
      "discriminator_profile": { "horizon": 3, "risk": 3, "stakes": 4 },
      "needs_profile": {
        "certainty":     { "score": 9, "rank": "primary" },
        "variety":       { "score": 3, "rank": null },
        "significance":  { "score": 6, "rank": null },
        "connection":    { "score": 9, "rank": "primary" },
        "growth":        { "score": 4, "rank": null },
        "contribution":  { "score": 7, "rank": "secondary" }
      },
      "evidence_distribution": { "stated": 0.6, "revealed": 0.3, "behavioral": 0.1 },
      "lineage": { "perspective_ids": ["p_z"], "belief_ids": ["b_w"], "key_memory_ids": ["..."], "key_customer_ids": ["cu_f", "cu_g"] },
      "contrast_profile": { "<other-avatar-id>": "..." },
      "discriminator_questions": ["..."],
      "offer_ids": [],
      "declared_avatar_id": null
    }
  ],
  "avatar_updates": [
    {
      "id": "<solo-coaches-avatar-id>",
      "op": "split",
      "patch": { "status": "transformed" },
      "merged_with": [],
      "rationale": "Solo Coaches bifurcated cleanly along horizon + risk into Info-Product Coaches and 1:1 Coaching Practitioners — same group, different operating systems."
    }
  ],
  "proposed_axes": [],
  "log_event": {
    "summary": "Split Solo Coaches into Info-Product Coaches and 1:1 Coaching Practitioners along horizon + risk seams."
  }
}
```

### Example 3 — propose a new discriminator axis

**Inputs (abridged):** Customers in this brain repeatedly distinguish themselves by whether they build their business *around their own face* (creator-led) or *behind a brand name* (brand-led). The canonical seven axes don't cover this seam.

**Output (only the proposed axes block — empty avatar arrays elided):**

```json
{
  "brain_id": "<brain-id>",
  "new_avatars": [],
  "avatar_updates": [],
  "proposed_axes": [
    {
      "id": "presence",
      "name": "Public presence model",
      "description": "Whether the customer builds their business as a personality (creator-led) or as a brand entity behind which they operate (brand-led).",
      "high_end_signature": "founder face on every asset, my-name-as-domain, 'I built this so it sounds like me'",
      "low_end_signature": "brand-as-entity, neutral domain, 'the company should outlive me'"
    }
  ],
  "log_event": {
    "summary": "Proposed new axis 'presence' (creator-led vs brand-led) — recurred across 6 customers this pass."
  }
}
```

## Output contract

The worker parses the first fenced ` ```json ... ``` ` block via regex and validates each avatar before writing. These rules exist because the parser and writer enforce them — emitting non-conformant content wastes tokens:

- Wrap the entire response in a single fenced ` ```json ... ``` ` block.
- Echo `brain_id` from the BRAIN block. Mismatches are logged but writes still scope to the correct brain.
- `member_customer_unit_ids` references real ids from the CUSTOMER_UNITS block. Inventing ids creates phantom memberships.
- `member_contact_ids` references real ids from the CONTACTS block and is only a compatibility projection for known contacts.
- Each new avatar needs `member_customer_unit_ids.length >= 3` distinct values. The worker drops new avatars below this bar — emit only when the cluster genuinely exists.
- `discriminator_profile` keys must match active axis ids from DISCRIMINATOR_AXES. Free-text axis names are dropped; use `proposed_axes` instead.
- `needs_profile` keys are exactly `certainty | variety | significance | connection | growth | contribution`. Other keys are ignored.
- `avatar_updates[].id` references real ids from EXISTING_AVATARS. Unknown ids are dropped silently.
- Cap active avatars at **3 per offer.** When this would be exceeded, emit a merge or archive in the same pass — the worker enforces the cap and otherwise rejects the new avatar.
