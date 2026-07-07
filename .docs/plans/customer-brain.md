# Customer Brain — Plan

**Date:** 2026-05-07
**Status:** Design — Ready for review
**Owner:** Sefy

---

## 1. The Vision (in one paragraph)

When a user onboards to Vibey, they plug in their intelligence layers — Fathom, Slack,
Gmail, Drive, Instagram, LinkedIn, Meta Ads, Google Analytics. Atlas reads everything
and decides, per artifact, whether it belongs in the **User brain**, a **Campaign
brain**, or the **Customer brain**. The Customer brain is the new piece: a single brain
per org that accumulates everything we know about *the people we sell to and support*.
Inside it, the system surfaces **avatars** — emergent customer worldviews that draw
themselves from real conversations, real beliefs, and real emotional patterns, and
get continuously refreshed as embedded agents (widgets, Telegram, Slack bots) keep
talking to those customers.

---

## 2. Mental Model (corrected)

The customer brain mirrors the user brain, with one new cognitive layer on top:

| User Brain | Customer Brain |
|---|---|
| **Belief** — one conviction the user holds | **Customer belief** — one conviction one customer holds |
| **Perspective** — user's lens on one aspect of the world | **Customer perspective** — a lens on one aspect, shared across a cluster of customers (e.g. *"paid ads are dying"*) |
| **Worldview** — synthesis of all the user's perspectives | **Avatar** — a customer-side worldview, synthesized from their shared perspectives |

> **Avatar = a customer-side worldview, built by clustering customer perspectives,
> the same way the user's worldview is built by clustering their perspectives.**

The customer Cortex therefore has **both layers**:
- **Customer Perspectives** = the individual shared lenses (*"organic is the only
  honest channel"*, *"agencies should be productized"*, *"AI is hype"*).
- **Avatars** = the full identities that emerge when several perspectives consistently
  co-occur in the same group of people.

### What we are NOT building

- We are **not** building a brain per customer. One thousand contacts ≠ one thousand
  brains.
- We are **not** building top-down personas (*"Don, 35, married, 2 kids, $200K/yr"*).
  Avatars are emergent, bottom-up clusters from real signal.
- We are **not** forking a new schema for the customer brain. We reuse `ns_brains`,
  `ns_memories`, `ns_belief_patterns`, `ns_perspectives`, `ns_narrative_pages`,
  Cortex Max, Spotlight, the Night Janitor — all of it.

---

## 3. The Hard Problem: How Avatars Actually Separate

This is the central new cognitive challenge.

Pure belief-similarity clustering will *not* separate two real avatars (a content
creator vs. a gym owner can both say "I want to grow", "I'm overwhelmed", "I need
a system"). The trick is that **avatars don't emerge from similarity — they emerge
from where customers fork**.

### Three layers of signal

**Layer 1 — Hard anchors (when present, use them).**
Purchase records, deal pipeline stage, course/cohort enrollment, funnel attribution,
Slack channel name (`#cohort-2-accelerator`), Zoom meeting title, Calendar event tag.
Cheapest, strongest signals. We currently don't extract these but they sit in
Stripe / HubSpot / Slack channel names / Calendar.

**Layer 2 — Soft anchors: the discriminator dimensions.**
The new cognitive job. Even without hard anchors, two avatars separate by *which
dimensions of the world they live in*, not what they say:

| Dimension | $3K Instagram student | $20K Accelerator owner |
|---|---|---|
| Stakes vocabulary | views, reach, posts, algorithm | revenue, team, ops, retention |
| Time horizon | this week | this quarter |
| Money relationship | cautious, *"is this worth it?"* | ROI-confident, *"what's the multiplier?"* |
| Reference frame | other creators | other businesses |
| Identity self-talk | *"I'm a creator"* | *"I run a business"* |
| Pain vocabulary | shadowban, burnout, plateau | hiring, churn, P&L |

When Atlas reads two customers' memories, it should ask **"where do these fork?"**,
not "are these similar?". Same beliefs about *growth* + completely different stakes
vocabulary + completely different time horizon = two avatars, not one.

**Layer 3 — Belief overlap inside a discriminator-bucket.**
*Now* belief similarity becomes meaningful. Customers in the high-stakes /
business-owner bucket who all share *"team is the bottleneck"* + *"systems beat
creativity"* + *"organic is the only honest channel"* = the Accelerator avatar.

### The order of operations

Anchor → Fork → Cluster. Not: Cluster → Name. The latter is exactly what fails.

### The user's role: light supervision, not top-down

The user already knows what they sell. Letting them tell us up front —
*"I sell offer A ($3K Instagram course) and offer B ($20K accelerator)"* — turns
the fork pass from fully unsupervised into *biased*: "use these as candidate
discriminator labels and figure out which customer fits which".

That is still bottom-up. We are not handing Atlas the persona. We are handing it
**the offers as known forks** and letting it discover what kind of person actually
answers each one.

### Multi-membership is a feature

A customer can be a member of multiple avatars at varying strengths (the gym owner
who also runs Instagram for the gym = both avatars at moderate strength). When the
user targets them with the $3K offer, the *Content Creator* avatar's spotlight
loads. When targeting with the $20K offer, the *Accelerator Owner* avatar's
spotlight loads. Same human, different worldview lenses active depending on which
offer is in play.

---

## 4. Architecture

### 4.1 Identity layer — extend what exists, don't recreate

**The DB already has the customer profile layer.** We do not need
`customer_profiles`, `customer_relationships`, or a separate offer-anchor table.

Existing tables we will reuse as-is:

| Need | Existing table | Notes |
|---|---|---|
| Customer profile | **`contacts`** | `id`, `user_id`, `org_id`, `email`, `phone`, `first_name`/`last_name`, `business_name`, `website`, `tags`, `source`, `source_id`, `custom_fields`, `is_archived`, `contact_type`, `contact_source`. **Person-only model** — we don't model companies as separate entities (every contact is a human, even in B2B). `business_name` / `website` stay as columns on the human row when relevant. |
| Anonymous / funnel-captured leads (ghost customers) | **`leads`** | `funnel_id`, `campaign_id`, `utm`, `visitor_id`, ad attribution. Lead → `contacts` promotion path already exists. |
| Activity timeline per customer | **`contact_activity`** | `contact_id`, `event_type`, `payload jsonb`, `created_at`. Already shaped right. |
| Campaign / funnel attribution | **`contact_campaign_memberships`** + **`contact_funnel_memberships`** | Soft offer anchors already in place. |
| User-declared segments | **`audiences`** + **`segments`** | Filter-rule based, declarative. Coexist with emergent avatars. |
| Notes per contact | **`contact_notes`** | Existing. |

**The only genuinely new table** for the identity layer is the multi-handle
identifier table:

```
contact_identifiers              -- many-to-one resolution table
  id, contact_id, kind, value, confidence, source, first_seen_at, last_seen_at
  -- kind ∈ email | phone | slack_user_id | telegram_chat_id |
  --        ig_handle | linkedin_url | fathom_attendee_id |
  --        gmail_thread_participant | x_handle | website_visitor_id
  -- UNIQUE (kind, value)
```

`contacts` only stores one `email` and one `phone`. Real customers have many
handles (alt emails, Slack ID, Telegram chat, IG, LinkedIn, Fathom attendee, etc.).
This is the resolution table that lets every adapter call
`resolveContact(kind, value)` before writing. New value with no match → new
contact (or promote a `lead` row). Match found → write to that contact.

**Hard offer anchors** (Stripe purchase, cohort enrollment, etc.) extend an
existing table rather than create a new one:

```
ALTER TABLE contact_campaign_memberships
  ADD COLUMN offer_id uuid REFERENCES offers(id),
  ADD COLUMN anchor_type text,    -- 'purchase' | 'cohort' | 'enrollment' | 'free-signup'
  ADD COLUMN anchor_source text,  -- 'stripe' | 'manual' | 'webhook' | etc.
  ADD COLUMN observed_at timestamptz DEFAULT now();
```

This piggybacks on the join we already have between contacts and campaigns —
adding the offer + anchor type makes it a hard avatar fork signal.

### 4.2 The Customer Brain itself

One row in `ns_brains` per org, scoped via a new discriminator:

```
ALTER TABLE ns_brains
  ADD COLUMN scope text NOT NULL DEFAULT 'user';
  -- scope ∈ 'user' | 'agent' | 'campaign' | 'customer'
```

All customer-derived memories land in this brain. Known contacts are attached
when available, but contact is metadata, not the write gate. A durable customer
memory can be linked to any combination of `contact_id`, `customer_entity_id`,
and `customer_source_identity_id`:

```
ALTER TABLE ns_memories
  ADD COLUMN contact_id uuid REFERENCES contacts(id),
  ADD COLUMN customer_entity_id uuid REFERENCES customer_entities(id),
  ADD COLUMN customer_source_identity_id uuid REFERENCES customer_source_identities(id),
  ADD COLUMN customer_resolution_status text NOT NULL DEFAULT 'unresolved';
  -- indexes: contact, customer entity, source identity, resolution status
```

No per-customer brains. No new memory tables. The Customer Brain is a collective
workspace brain with first-class customer units for people, accounts, known
contacts, and source-backed unknown customers. Beliefs/perspectives/narrative
pages all reuse `ns_belief_patterns`, `ns_perspectives`, `ns_narrative_pages`
unchanged -- they just live in a brain with `scope='customer'`.

### 4.3 The new cognitive primitive: Customer Avatars

We keep `customer_avatars` as a **separate, dedicated table** — distinct from
the existing `avatars` table.

**Why split, not merge:**

The existing `avatars` table is **AI-generated declared avatars** — what the
funnel / offer wizard produces today (`persona_data jsonb`, `avatar_type`,
linked to `offer_id` + `campaign_id`). Top-down, user-built or wizard-emitted,
one per offer. Stays unchanged. This is a *marketing artifact*: how the user
*thinks* about their customer.

The new `customer_avatars` table is **brain-emergent avatars** — bottom-up
worldview clusters Atlas builds from real customer signal. Different table
because it has a different lifecycle (emerging/active/shifting/transformed),
different provenance (memories → beliefs → perspectives → avatar), different
audience (used by Cortex Max + Spotlight, not by funnel/wizard UI), and a much
richer schema.

The two coexist. When a `customer_avatar` (emergent) and an `avatar` (declared)
share the same offer and diverge, that *gap* is the diagnostic signal —
surfaced as a tension in the customer Cortex.

```
customer_avatars
  id uuid PRIMARY KEY,
  brain_id uuid REFERENCES ns_brains(id),
  name text NOT NULL,
  summary text,
  narrative_md text,                       -- McAdams arc (§12.5)
  status text,                             -- emerging | active | shifting | transformed
  strength numeric,
  confidence numeric,
  member_contact_ids uuid[],               -- which real contacts fit
  member_strength jsonb,                   -- per-contact membership weight
  dominant_perspective_ids uuid[],         -- shared customer-side perspectives
  dominant_belief_ids uuid[],
  dominant_pain_points text[],
  emotional_signature jsonb,
  blind_spots text,
  discriminator_profile jsonb,             -- fork dimensions: stakes, horizon,
                                           -- money relationship, etc.
  offer_ids uuid[],                        -- offers this avatar buys
  declared_avatar_id uuid REFERENCES avatars(id),  -- optional link to the
                                                   -- declared counterpart
  created_at, updated_at
```

Same lifecycle as beliefs/perspectives:
`emerging → active → shifting → transformed`.

Customer-side beliefs and perspectives reuse `ns_belief_patterns` and
`ns_perspectives` exactly as they exist — they just live in the customer brain
and carry a `contact_id` (or, for clusters, multiple `contact_id`s).

### 4.4 Discriminator axes — canonical + extension registry

The "find the seams" pass (§5 step 4) uses **stable axis IDs**, not free-text
dimensions. Pure freestyle would destabilize cross-avatar contrast, drift
metrics, and UI comparability. Pure enum would miss industry-specific seams.
The right model is **canonical core + org-specific extension**.

**Canonical seed set (org-agnostic, always present):**

| ID | Name | High-end signature | Low-end signature |
|---|---|---|---|
| `stakes` | Stakes vocabulary | revenue, team, ops, P&L | views, reach, algorithm |
| `horizon` | Time horizon | this quarter, this year | this week, this post |
| `money` | Money relationship | ROI-confident, multiplier-thinking | cautious, "is it worth it" |
| `reference_frame` | Reference frame | other businesses | other creators |
| `identity` | Identity self-talk | "I run a business" | "I'm a creator" |
| `pain` | Pain vocabulary | hiring, churn, P&L | shadowban, burnout, plateau |
| `risk` | Risk posture | high appetite for change | resistant, status-quo bias |

**How extension works:**

When Atlas detects a meaningful fork the canonical set doesn't cover, it
proposes a new axis with `status='proposed'`. After it shows up in 3+
consecutive passes (or recurs across 3+ avatar pairs), it auto-promotes to
`'active'` and becomes a queryable axis for that org. Until then, proposed
axes live in a separate slot and are not used in `contrast_profile` or
`discriminator_questions`.

**Schema:**

```
avatar_discriminator_axes
  id                text PRIMARY KEY,      -- 'stakes' | 'horizon' | 'money' | …
  name              text,
  description       text,
  high_end_signature text,                  -- example words / behaviors
  low_end_signature  text,
  scope             text,                   -- 'canonical' | 'org-specific'
  org_id            uuid NULL,              -- NULL for canonical
  status            text,                   -- 'active' | 'proposed' | 'archived'
  recurrence_count  integer DEFAULT 0,      -- proposed → active after N passes
  first_seen_at     timestamptz,
  last_seen_at      timestamptz,
  created_at, updated_at,
  UNIQUE (org_id, id)                       -- canonical (org_id NULL) cannot collide with org-specific
```

**Atlas contract:**

- `customer_avatars.discriminator_profile` is keyed by axis ID, never free text:

  ```json
  { "stakes": 8, "horizon": 3, "money": 7, "risk": 9 }
  ```

- New axis names go to a separate `proposed_axes` block on the synthesis output,
  not into `discriminator_profile`. They go through the registration step
  before becoming queryable.

- `contrast_profile` and `discriminator_questions` reference axis IDs so they
  stay consistent across passes.

This keeps the cognitive layer *stable enough to compare avatars over time*
while still allowing real discovery for industries we haven't anticipated.

### 4.5 Contact roles, judgment, and override

The customer brain only contains memories for participants whose **role**
indicates a commercial relationship. Roles are how we keep the brain clean
without ever asking the user upfront questions.

**Role taxonomy** (multi-value; a contact can hold multiple, evolves over time):

| Role | Contributes to customer brain? |
|---|---|
| `customer` | yes |
| `lead` / `prospect` | yes |
| `team_of_customer` | yes (a person who works at a customer org — still a human contact, just associated to the same `business_name`) |
| `cofounder` / `team_member` / `vendor` / `investor` / `peer` | no — user brain only |
| `friend` / `family` | **never write at all** (privacy carve-out) |
| `unknown` | no — user brain only, flagged for later review |

**Storage:**

```
contacts (extend with)
  + role text                       -- canonical primary role
                                    -- (extends existing contact_type)
  + role_source text                -- 'atlas' | 'user' | 'integration' | 'inferred'
  + role_confidence numeric         -- 0.0 - 1.0 (Atlas-set), 1.0 when user-set
  + role_set_at timestamptz
```

(If multi-role is needed later, promote to a `contact_roles` join table — for
v1 a single primary role is enough.)

**Who decides the role:**

- **Atlas, per-call** — the routing skill (§6) judges each attendee from the
  Fathom call + user context bundle. Sets `role_source='atlas'` with
  confidence. Only updates `contacts.role` if confidence ≥ 0.75 *and* the
  current source isn't `'user'` (user overrides are sticky).
- **The user, anytime** — overrides on the contact page or the Fathom call
  detail. Sets `role_source='user'`, confidence 1.0. Locks the role until
  the user changes it.
- **Integration sync** — if a contact arrives from a CRM/funnel/Stripe with
  a clear role signal (paid customer, lead-stage), set
  `role_source='integration'` with high confidence.

No upfront classification UX. No domain-match rules. No batched onboarding
prompts. Roles attach silently as Atlas judges or signals arrive; the user
only sees role UX when they want to change something.

**The 1-click cleanup primitive:**

```
reclassify_contact(contact_id, new_role)
  - update contacts.role + role_source='user' + role_confidence=1.0

  - decide cleanup based on role transition:
    customer/lead/team_of_customer → cofounder/team/vendor/investor/peer
        → delete this contact's memories from customer brain
        → leave user brain memories intact

    customer/lead/team_of_customer → friend/family
        → delete from customer brain AND from user brain
        → privacy carve-out applies retroactively

    cofounder/team/vendor/etc → customer/lead/team_of_customer
        → backfill: copy this contact's already-ingested user-brain slices
          into the customer brain (if they exist)

  - clear customer_avatars.member_contact_ids references for this contact

  - flag dependent customer beliefs / perspectives / avatars for
    recomputation on the next synthesis pass

  - return summary: "X memories moved, Y removed, Z avatars affected"
```

**Confirmation gate:** any role transition that *deletes* memories (e.g.
customer → vendor, customer → friend) must show an *"Are you sure you
want to delete X memories from Y brain(s)?"* modal before executing.
Backfills (additive transitions like vendor → customer) execute without
confirmation.

This is the surgical fix for any misjudgment. One click, retroactive,
clean. Because of this primitive, we can afford to let Atlas judge freely
without worrying about being wrong sometimes.

**Override surfaces (where the user clicks):**

- **Fathom call detail view** — per-attendee role chip + *"Mark as customer"* / *"Not a customer"* shortcuts.
- **Contact detail page** — full role chip with all options.
- **Customer Cortex sidebar** — under "Customers", inline correction shortcut.

**Privacy carve-out for friend / family:**

If Atlas judges an attendee as `friend` or `family`, the call slice for that
person is never written — not to the customer brain, not even to the user
brain. The call as a whole still gets a memory in the user brain (Sefy's-side
insights), but the friend/family attendee is excluded from per-participant
extraction. The user can override per-contact if they want personal context
captured.

---

## 5. The New Skill: Avatar Synthesis

Peer of `brain-pattern-analysis`. New file:
`agent_skills` row, `skill_key = customer-avatar-synthesis`, `agent_key = atlas`.

### Skill workflow

```
1. Pull all customer-tagged memories + customer-side beliefs + customer-side
   perspectives from the customer brain.

2. Pull hard anchors per customer (purchases, cohort membership, channel,
   funnel attribution).

3. Pull declared offers from the org (the user-provided fork candidates).

4. Find the seams (the new pass):
   Ask: "what dimensions does this population split on?"
   Output candidate discriminator axes: stakes vocabulary, time horizon,
   money relationship, reference frame, identity self-talk, pain vocabulary.
   Bias the search by the declared offers when present.

5. For each customer, locate them on the discriminator axes.

6. Cluster: group customers by where they fall.

7. For each cluster, synthesize:
   - the avatar's discriminator_profile (what makes them this avatar)
   - the dominant perspectives (the shared lenses)
   - the dominant beliefs (the converged convictions)
   - the narrative_md (the story of who this avatar is)
   - the emotional_signature

8. Lifecycle ops:
   - new cluster with ≥3 members + ≥3 aligned perspectives → create_avatar
   - existing avatar with shifted membership → update_avatar
   - cluster bifurcates (one avatar splits into two) → split avatar
   - two avatars now identical → merge avatars
   - cluster no longer holds → archive avatar (status='transformed')

9. Update CAPSULE.md for the customer brain (per avatar).

10. Log via log_brain_event.
```

The new verb in step 4 — **find the seams / discriminators** — is the only piece
of cognition we are genuinely inventing. Everything else reuses existing skills.

### Trigger

- Counter-driven: `customer_memories_since_last_avatar_pass >= 25` on the customer
  brain (avatars need more signal than user perspectives).
- Time-driven: Night Janitor (extended) sweeps customer brains weekly when a
  pattern analysis pass has happened in the prior 24h.

---

## 6. Atlas Routing Skill

**Atlas decides who's who. We do not algorithmically pre-classify.**

The only auto-trigger today is the **Fathom webhook**. Other channels (Slack,
Gmail, Drive, etc.) are user-pushed and out of scope for this skill — we
revisit per-channel when those ingest paths get built.

New skill: `customer-call-routing` (peer of `knowledge-intake` / `knowledge-extraction`).

### Skill contract

```
Inputs (the bundle Atlas reads):
  - the Fathom call (transcript + attendees with email/name)
  - host identity from the Fathom integration handshake
    (the user's Fathom-side email + any aliases on their Vibey profile)
  - the user's Vibey profile (name, role, org context)
  - existing contacts for this org (with their current roles, if any)
  - the user's recent user-brain summary (so Atlas knows who Dylan, Maria,
    the cofounder, the wife, etc. are in the user's world)
  - the user's declared offers and active campaigns

Per-attendee judgment:
  Atlas judges each non-host attendee:
    role        : customer | lead | team_of_customer | cofounder | team_member |
                  vendor | investor | peer | friend | family | unknown
    rationale   : one short sentence explaining the call
    confidence  : 0.0 - 1.0
    contact_id  : resolved via contact_identifiers, or new contact created
                  with source='fathom'

Per-target writes (driven by the per-attendee role):
  - User brain slice — always. Sefy's-side insights from the call.
  - Customer brain slice — per attendee judged customer / lead /
    team_of_customer. Tagged with that contact_id.
  - Campaign brain slice — if the artifact clearly mentions a known offer
    or campaign.
  - friend / family / unknown — never write to customer brain. Privacy
    carve-out is structural, not a heuristic.

Side effects:
  - If Atlas's confidence on a previously-unknown contact is high
    (≥ 0.75), update contacts.role with the new judgment.
  - If Atlas's confidence is low, leave role='unknown' and skip
    customer-brain writes for that attendee.
  - Log the judgment + rationale on the artifact for the override UX.
```

### Host identification

The host (the Vibey user) is captured at **Fathom integration handshake**, not
inferred from the call. When the user connects Fathom via OAuth, Vibey stores
the Fathom-side email as a known alias on the user's profile. Multiple aliases
are supported (the user may have signed up to Fathom with one email and Vibey
with another). The host is always excluded from routing.

### Override flow (the part that handles misjudgments)

Atlas will get some judgments wrong. The system is designed to make those
trivial to fix retroactively — that's why no upfront classification UX exists.

- **On the Fathom call detail view**, per attendee:
  - *"Mark as customer"* → set role → backfill: copy that contact's already-ingested call slices into the customer brain.
  - *"Not a customer"* → set role to vendor / friend / cofounder / etc. → cleanup: delete that contact's memories from the customer brain.
- **On the contact detail page**, role chip → full role override + same backfill / cleanup.

The 1-click `reclassify_contact(contact_id, new_role)` action is the surgical primitive — see §4.5.

### Why we don't pre-classify with rules

Email-domain matching is brittle (cross-email signups, free domains, dual
roles). NLP-only classification on call content alone misroutes friends and
cofounders as customers. The only signal that's actually reliable is *the
combination of all available context, judged by an intelligent reader* —
i.e. Atlas. We give Atlas enough context (existing contacts + user's world +
the call itself) and trust the judgment, with cheap retroactive correction
when wrong.

### Robustness to misjudgment

Three structural protections (already designed in §12) absorb routing errors:

1. **Threshold rules** — a customer-side belief needs ≥3 supporting memories
   with emotional consistency. A single mis-routed call doesn't form a belief.
2. **Avatar membership thresholds** — an avatar needs ≥3 customers + ≥3
   aligned perspectives. Single misjudgments don't form avatars.
3. **§12.1 surprise-weighted memory** — a misjudged contact whose behavior
   diverges from the avatar generates prediction errors that flag for review.

The brain is robust to noise by construction. We don't need to be perfect at
the routing layer.

---

## 7. Customer Cortex Max (UI shape)

The Cortex Max view we shipped maps almost 1:1. New labels, same components.

| User Cortex | Customer Cortex |
|---|---|
| Identity | **Avatars** *(headline)* |
| Perspectives | **Customer Perspectives** *(the lens-tier underneath avatars)* |
| Beliefs | **Customer Beliefs** |
| Tensions | **Avatar Tensions** *(when a member's behavior diverges from the avatar)* |
| Patterns | **Pain Patterns** |
| People & Places | **Customers** *(the individual roster — secondary)* |
| Topics | **Conversation Themes** |

### Avatar detail panel

Click an avatar → reuse the existing detail-panel pattern:
- Avatar name + meter (member count + strength + status)
- `narrative_md` — the story of who this avatar is
- **Discriminator profile** — the fork dimensions (vocabulary, horizon, money,
  reference frame) shown as small chip groups
- Dominant perspectives → list of the shared lenses
- Dominant beliefs → list of the convictions
- Emotional signature → existing colored bars (heart/valence/intensity/intent)
- Tensions → if any
- **Members** → collapsible list of the actual customers in this avatar (link to
  each customer profile)

### Avatar Capsule (per-avatar)

Same template as the user CAPSULE.md, second person flipped to "*you are talking
to someone in this avatar*":

> You are talking to a burned-out agency owner who built a 5-person shop on
> founder-led services and is hitting a ceiling. **Worldview:** systems are the
> only honest path to scale; creativity without process is unprofessional.
> **Core beliefs:** team is the bottleneck. Organic is the only honest channel.
> **Voice:** direct, ROI-aware, allergic to hype. **Tensions:** wants to scale
> but resists hiring before systems are documented.

This capsule is what gets injected as Spotlight when an embedded agent (widget,
Telegram, Slack bot) is talking to a customer who matches this avatar.

---

## 8. Loop Closure — Embedded Agents Feed Back

Once avatars exist:

1. **Customer Success / Coaching agents** can be configured per offer or per
   avatar. The widget on the user's website / Telegram / Slack bot routes turns
   to the right agent.
2. Every turn the embedded agent has → memory written to the **customer brain**,
   tagged with `customer_id`, contributing to that customer's beliefs and
   perspectives.
3. At runtime, Spotlight injects the avatar capsule + that customer's *individual*
   active beliefs/perspectives. The agent now answers as if it knows them.
4. As the customer's beliefs evolve, their avatar membership recomputes
   automatically on the next avatar synthesis pass. They drift.

This is what closes the loop. The brain doesn't go stale because every
conversation writes back into it.

---

## 9. Cross-Pollination Upward

Once N customers' beliefs share the same theme (`"pricing is opaque"`), surface it
*upward*:
- To the **user brain** as a learning ("3 customers said your pricing is opaque")
- To the **campaign brain** as an insight to act on
- To the **avatar's `tensions`** if it contradicts an existing avatar belief

We already have `brain-cross-pollinator.service.ts`. Extend it to cover
customer→user/campaign, not just inter-campaign.

---

## 10. Phasing

| Phase | What | Why this order |
|---|---|---|
| **1.** Identity layer | `customer_profiles`, `customer_identifiers`, `customer_offer_anchors`, `resolveCustomer()`. No UI. | Everything depends on this. Wrong now = duplicates forever. |
| **2.** Customer brain row | One row per org. Add `customer_id` to `ns_memories`. Backfill nothing. | Unlocks all existing brain machinery for free. |
| **3.** One adapter end-to-end (Fathom) | Backfill 90d → Atlas routing skill (basic) → user + customer brain writes. | Highest signal, lowest volume, cleanest identity. Proves the routing model. |
| **4.** Customer-side belief + perspective extraction | Run existing `brain-pattern-analysis` on the customer brain, scoped to per-customer. No avatars yet. | Get the customer cognition layer alive before clustering. |
| **5.** Avatar synthesis skill | Build the new "find the seams" skill. Run on the populated customer brain. | The new cognitive primitive. The differentiator. |
| **6.** Customer Cortex UI | Add the customer brain view. Reuse all components. New labels. Avatar detail panel. | Most of this is reuse — small UI lift. |
| **7.** Live channels | Embedded agent (widget) / Telegram / Slack bot writes back. | Closes the loop. |
| **8.** More adapters | Slack DMs → Gmail (with strict counterparty filtering) → LinkedIn → IG → Meta Ads (segment-level). | Each one a small PR ordered by signal-to-noise. |
| **9.** Cross-pollination upward | Customer-level patterns surface in user/campaign brains. | Higher-order insight. Only useful once enough customer data exists. |

### Smallest first slice that proves the idea

Phases **1 + 2 + 3 + 5**, with Fathom only. We can skip Phase 4 (per-customer
belief extraction) initially because Phase 5 will run on raw memories anyway —
clusters can form before per-customer beliefs are clean. Phase 4 makes them
sharper but is not blocking.

That's the minimum to demonstrate avatars emerging from real customer conversations
without any UI investment yet.

---

## 11. Decisions and Open Questions

### Locked decisions

1. **Customer brain enablement** — opt-in per workspace, **same UX pattern as
   Cortex Max**. Off by default. Org owners enable for their org; personal
   accounts enable for themselves. No one is auto-enrolled.
2. **Anonymous / source-backed customers** — in scope. Do not create fake
   contacts. Store durable source identities such as widget visitor id,
   Telegram chat id, Fathom meeting id, or conversation/source id. Merge or
   attach later when identity becomes knowable.
3. **Companies/accounts as customer units** — in scope as `customer_entities`.
   Contacts remain human records, but B2B accounts can have consolidated
   customer knowledge and linked contacts/source identities.
4. **Where in Vibey UX** — Customer Brain appears as **another scope in the
   existing brain selector dropdown**, alongside User / Agent / Campaign brains.
   Same dropdown UI, same Cortex Max layout, just a new entry. **No** dedicated
   top-level "Customers" tab in the global app shell. Inside Cortex Max,
   Customer Brain uses persistent sections for Collective, Avatars,
   Customers / Accounts, and Unlinked Signals.
5. **Avatar count ceiling** — **≤3 active avatars per offer.** Avatars should
   be decisive — three discrete worldview clusters per offer is the cap.
   Beyond three, Atlas must merge or transform.
6. **User edit rights on avatars** — **Atlas-owned.** User can rename and nudge
   ("these two are the same") but cannot hand-build an avatar from scratch.
   Preserves bottom-up.
7. **Per-offer scoping** — `customer_avatars` carry `offer_ids[]`; same avatar
   can apply to multiple offers; new offers auto-inherit relevant avatars.
   Integration UX details deferred.
8. **What counts as a customer-side belief** — **Open-ended, no closed
   taxonomy.** Customer beliefs can be about themselves, about our space,
   about our offer, about the world, or anything else. The richness *is* the
   value — a constrained `domain` field would make the brain closed-minded
   and may also surface long-tail signals that help define new offers later.
   Drop the proposed `domain` field; let beliefs carry whatever Atlas
   identifies.
9. **`avatars` (declared) vs `customer_avatars` (emergent)** — **Split.** Two
   tables, paired via `customer_avatars.declared_avatar_id`. When they diverge
   on the same offer, the gap surfaces as a tension in the customer Cortex
   (diagnostic signal: what the user *thinks* their customer is vs. what
   the data shows).
10. **Atlas system-agent migration as Phase 0** — **Deferred. Not a blocker.**
    The Customer Brain ships against Atlas in his current state. Skill
    updates needed by the customer brain (`customer-call-routing`,
    `customer-avatar-synthesis`, scope-aware updates) get applied later as
    part of [atlas-system-agent.md](./atlas-system-agent.md). The customer
    brain plan does *not* depend on that cleanup completing first.
11. **Friend / family carve-out** — **Skill-level note, not infrastructure.**
    The `customer-call-routing` skill carries an explicit instruction:
    *"if you judge an attendee as `friend` or `family`, do not write any
    per-participant extraction for that person — neither to customer brain
    nor to user brain. The call as a whole still produces a user-brain
    memory from the host's side."* No special schema, no separate code
    path — Atlas honors the rule because the skill says so.
12. **Multi-role contacts** — **Single primary role for v1.** `contacts.role`
    is single-valued. Promote to a `contact_roles` join table only if real
    cases force it. Avoids over-engineering.
13. **McAdams + Robbins as imposed frames** — **Baked in as required
    structure.** Every `customer_avatar.narrative_md` follows the McAdams
    arc (origin / fear / aspiration / anti-self). Every avatar carries a
    `needs_profile` scoring 1–10 on Robbins' six needs with top-2 ranked.
    Not optional, not deviatable. They're cheap to compute and dramatically
    improve the avatar's usefulness as a sales/CS brief.
14. **Discriminator axis canonical seed** — **7 axes locked, ship with these.**
    Stakes vocabulary, time horizon, money relationship, reference frame,
    identity self-talk, pain vocabulary, risk posture. Extension mechanism
    (§4.4 — Atlas proposes, auto-promotes after 3+ recurrences) handles
    industry-specific seams over time.
15. **`reclassify_contact` cleanup transition matrix** — **As written in §4.5,
    plus a confirmation modal.** Any role transition that triggers a
    *delete* (customer → vendor/cofounder/etc., customer → friend/family)
    must show an *"Are you sure you want to delete X memories from Y
    brain(s)?"* modal before executing. Backfills (vendor → customer)
    do not require confirmation — they're additive.
16. **Customer-side belief decay timing** — **Same defaults as user-brain
    beliefs.** N weeks → reduced strength, 2N weeks → archived. The decay
    function lives in the Night Janitor, scoped to the customer brain. Tune
    later if customer-side cadence proves different from user-side cadence.

### Still open

A. **Privacy / deletion** — hard delete + tombstone, or soft archive?
   *Leave open for now.* Decide closer to launch when we know the privacy
   posture for the org.

---

## 12. Neuroscience-Grounded Refinements

The plan above is solid in shape but has a few cognitive failure modes if we don't
address them up front. The following are grounded in predictive processing
(Friston), schema theory, narrative identity (McAdams), Robbins' Six Human Needs,
and active inference. They are *additive* to the plan; nothing above changes.

### 12.1 Surprise-weighted memory + the anomaly pass (predictive coding)

**The risk:** schema lock-in. Once an avatar exists, Atlas reads it before
classifying new signal, and incoming memories drift toward the existing schema.
After 6 months avatars freeze and the brain stops learning. This is well-
documented in human cognition and will happen here too.

**The fix:** prediction errors get *stronger* encoding, not weaker. Every
incoming customer memory is scored on **how much it violated the existing
avatar's predictions**. High-violation memories get boosted significance.

```
ns_memories (in customer brain)
  + surprise_score numeric        -- prediction-error magnitude vs current avatar
```

Avatar synthesis gets a new pass: **the anomaly pass** runs *before* clustering.
It explicitly reads the high-surprise memory stack and weights them heavier in
the cluster recomputation. The brain naturally encodes surprise more deeply on
purpose — we mirror that.

### 12.2 Evidence-typed beliefs (stated / revealed / behavioral)

**The risk:** stated-vs-revealed asymmetry. Customers say things they wish were
true; what they *do* is the honest signal. If avatars are built only from
language, agents will mis-predict behavior.

**The fix:** evidence-backing lives at the **belief level**, not the memory level.
Memories are raw signal — their evidence type is given by the source. Beliefs
are where the interpretation matters.

```
ns_belief_patterns (in customer brain)
  + evidence_type  'stated' | 'revealed' | 'behavioral'

ns_perspectives (auto-derived)
  + evidence_distribution jsonb   -- { stated: 0.6, revealed: 0.3, behavioral: 0.1 }

customer_avatars (auto-derived)
  + evidence_distribution jsonb
```

Beliefs derived from behavioral evidence get a confidence multiplier. Avatars
heavily weighted toward `stated` evidence are flagged as lower-confidence until
behavioral signal accumulates.

Evidence tiers are an upgrade path for the same belief row. When later memories
reveal action behind an existing `stated` belief, Atlas reinforces that belief
and promotes `evidence_type`; it must not create a parallel `revealed` row with
the same concept. The worker also treats exact name/description matches from
`new_beliefs` as reinforcements to prevent duplicate rows.

**Phasing note:** start the field now, on beliefs, with `'stated'` as default.
Behavioral telemetry adapters (Stripe events, engagement decay, deal-stage
velocity) are a separate future workstream — too complex to bundle into the
first slice. The schema field is the seed; the evidence sources catch up over
time.

### 12.3 Avatar drift detection (efficient at scale)

**The risk:** centroid clustering only describes the past. The customers who
matter most are usually the *edge* ones — drifting away from the centroid
because they're the leading indicator of an avatar about to split.

**The fix:** track avatar drift, but cheaply. Five gates of efficiency:

1. **Incremental, not exhaustive.** Only recompute drift for customers with new
   signal since the last pass. Most customers are quiet on any given day.
2. **Track avatar variance, not per-customer drift.** Single statistic per
   avatar per pass — the spread of member embeddings around the centroid.
3. **Embeddings, not LLM calls.** Drift = cosine distance in embedding space.
   Cheap vector math.
4. **Threshold-triggered Atlas analysis.** Only when an avatar's variance
   crosses a threshold (e.g. +20% since last pass) does Atlas inspect drifters
   and decide if it's split-worthy. Most avatars stay quiet most passes.
5. **Sample, don't enumerate.** For >200-member avatars, sample 30 members
   for drift computation. Statistically robust without scaling linearly.

```
customer_avatars
  + drift_metrics jsonb            -- { variance, centroid_embedding,
                                    --   variance_delta_last_pass,
                                    --   sample_size, last_drift_at }
```

Net cost ≈ O(active avatars × constant) per pass, with rare LLM bursts only on
moving avatars. Same algorithm scales 100 → 10,000 customers.

### 12.4 Contrastive avatar definitions

**The fix:** every avatar carries a `contrast_profile` describing what
differentiates it from each *other* active avatar. One line per peer avatar.

```
customer_avatars
  + contrast_profile jsonb    -- { other_avatar_id: "unlike X, this avatar..." }
```

Effect: avatars become genuinely sharp. The Spotlight injection becomes
*"you're talking to A, not B"* instead of just *"you're talking to A"* —
dramatically improves disambiguation on borderline customers.

Computed once per pass after avatar synthesis, refreshed when avatars change.

### 12.5 Avatar identity = narrative + needs (McAdams + Robbins)

**The risk:** avatars defined as feature lists are useless for sales / CS
language. Identity is a *story* with drivers, not a profile.

**The fix:** every avatar's identity is two layers:

**Layer 1 — McAdams narrative structure** (the story):
- **Origin** — where this person came from (the world they built themselves out of)
- **Fear** — what they're trying not to become / lose
- **Aspiration** — what they hope to become
- **Anti-self** — what they reject; the version of themselves they refuse

This is the structure of `narrative_md` for avatars. Not bullet points — actual
prose, in the McAdams arc.

**Layer 2 — Tony Robbins Six Human Needs profile** (the engine):

Score each avatar 1–10 on the six fundamental human drives, with the top two
flagged as primary drivers:

```
customer_avatars
  + needs_profile jsonb
    {
      certainty:     { score: 8, rank: 'primary' },     -- security, comfort
      variety:       { score: 4, rank: null },          -- novelty, change
      significance:  { score: 9, rank: 'primary' },     -- importance, uniqueness
      connection:    { score: 6, rank: null },          -- belonging, love
      growth:        { score: 7, rank: 'secondary' },   -- expansion, learning
      contribution:  { score: 5, rank: null }           -- giving beyond self
    }
```

Together these form the complete identity model:

> *"You are talking to a burned-out agency owner [origin: built a 5-person shop on
> founder-led services; fear: becoming a commodity service provider; aspiration:
> running a productized, recognized authority business; anti-self: the burned-out
> generalist taking any client to keep the lights on]. Their dominant drivers are
> Significance (9/10) and Certainty (8/10) — they want to be the recognized leader
> in their niche, but only on a path that feels safe. Frame the offer as
> 'become the recognized authority without betting the business'."*

This becomes the runtime Spotlight payload for embedded agents *and* a sales-rep
brief format. Same structure powers both.

### 12.6 Active inference: discriminator questions for embedded agents

**The fix:** when an avatar pair is similar on multiple axes, Atlas emits the
question that cleanly separates them. Embedded agents have access to these.
When uncertain about a customer's avatar, they ask one. This is Friston's
active inference: *agents act to reduce their own uncertainty*.

```
customer_avatars
  + discriminator_questions text[]
    [
      "Are you trying to scale a team or scale your reach?",
      "If you had one quarter to grow, would you focus on revenue or audience?",
      ...
    ]
```

Generated during avatar synthesis (same pass that emits `contrast_profile`).
Used at runtime: when Spotlight detects an ambiguous customer (membership
strength is split across two avatars), the embedded agent picks the best
discriminator question and asks it as a natural part of the conversation. The
answer feeds back into the brain.

This is a Phase 7 runtime upgrade — design the field in now, use it later.

### 12.7 Cognitive lineage / provenance

**The fix:** every avatar should be traceable through the chain that produced it:
`avatar ← perspectives ← beliefs ← memories`. Add the explicit lineage edges
and a query that returns the full chain.

```
customer_avatars
  + lineage jsonb    -- { perspective_ids[], belief_ids[],
                     --   key_memory_ids[], key_customer_ids[] }
```

UI: an "Evidence" tab on the avatar detail panel showing the chain. When a user
disagrees with an avatar, they can drill in, point at a specific memory, and
mark it as an outlier — that becomes feedback signal for the next synthesis pass.
Without this, the avatar is a black box and trust collapses on first disagreement.

### 12.8 Belief decay (hippocampal consolidation analog)

**The fix:** every customer belief carries `last_reinforced_at` and a decay
function. After N weeks without reinforcement, confidence drops. After 2N weeks,
it's archived. Mirrors hippocampal consolidation: unreinforced traces fade.

```
ns_belief_patterns (in customer brain)
  + last_reinforced_at timestamptz
  + reinforcement_count integer
  + decayed_at timestamptz NULL    -- set when archived by decay
```

Decay logic runs in the Night Janitor on the customer brain. Without this, the
customer brain just accumulates stale beliefs forever and gets noisier over time.

### 12.9 Dunbar-scale active Spotlight

**The fix:** don't try to keep all customers spotlight-ready. **Active Spotlight =
top ~50 customers** (recently active + high-value + in-pipeline). Everyone else
collapses to avatar-level only. Mirrors the human social brain (Dunbar number
≈ 150 stable relationships, with active tracking on a much smaller subset).
Operationally caps memory cost at runtime.

```
spotlight resolution rules:
  - if customer is in top-50 active set: load full per-customer cognition
                                          (their beliefs, perspectives, memories)
  - else: load avatar-level cognition only (their avatar membership +
                                            avatar identity + needs profile)
```

The "top 50" set is recomputed nightly based on:
- recent activity (memories created in last 14d)
- pipeline value (active deal stage)
- explicit pin (user-marked priority customer)

### 12.10 Schema delta summary (consolidated)

The full set of schema changes the customer brain needs — both the §4 baseline
and the §12 neuroscience refinements. Every other piece reuses an existing
table.

**New tables (3):**

```
contact_identifiers              -- §4.1 multi-handle identity resolution
  id, contact_id, kind, value, confidence, source,
  first_seen_at, last_seen_at,
  UNIQUE (kind, value)

avatar_discriminator_axes        -- §4.4 stable axis registry (canonical + org-specific)
  id text PRIMARY KEY,           -- 'stakes' | 'horizon' | 'money' | …
  name, description,
  high_end_signature, low_end_signature,
  scope text,                    -- 'canonical' | 'org-specific'
  org_id uuid NULL,              -- NULL for canonical
  status text,                   -- 'active' | 'proposed' | 'archived'
  recurrence_count integer,
  first_seen_at, last_seen_at,
  UNIQUE (org_id, id)

customer_avatars                 -- §4.3 brain-emergent avatars
                                 --      (separate from existing `avatars`)
  id, brain_id, name, summary,
  narrative_md,                              -- §12.5 McAdams arc
  status, strength, confidence,
  member_contact_ids uuid[],
  member_strength jsonb,
  dominant_perspective_ids uuid[],
  dominant_belief_ids uuid[],
  dominant_pain_points text[],
  emotional_signature jsonb,
  blind_spots text,
  discriminator_profile jsonb,
  offer_ids uuid[],
  declared_avatar_id uuid REFERENCES avatars(id),  -- optional pairing
  contrast_profile         jsonb,             -- §12.4
  needs_profile            jsonb,             -- §12.5 Robbins 6 Needs (1-10)
  discriminator_questions  text[],            -- §12.6
  drift_metrics            jsonb,             -- §12.3
  lineage                  jsonb,             -- §12.7
  evidence_distribution    jsonb,             -- §12.2 derived
  created_at, updated_at
```

**Column additions on existing tables:**

```
ns_brains
  + scope text NOT NULL DEFAULT 'user'   -- §4.2 'user' | 'agent' | 'campaign' | 'customer'

ns_memories (when brain has scope='customer')
  + contact_id     uuid REFERENCES contacts(id)   -- §4.2 customer tag
  + surprise_score numeric                        -- §12.1 prediction-error

ns_belief_patterns (when scoped to customer brain)
  + evidence_type        text         -- §12.2 stated | revealed | behavioral
  + last_reinforced_at   timestamptz  -- §12.8 decay
  + reinforcement_count  integer      -- §12.8 decay
  + decayed_at           timestamptz  -- §12.8 decay (NULL = active)

ns_perspectives (when scoped to customer brain)
  + evidence_distribution jsonb       -- §12.2 derived

contact_campaign_memberships
  + offer_id        uuid REFERENCES offers(id)   -- §4.1 hard offer anchor
  + anchor_type     text                         -- 'purchase' | 'cohort' | etc.
  + anchor_source   text                         -- 'stripe' | 'manual' | etc.
  + observed_at     timestamptz

contacts
  + role            text                         -- §4.5 customer | lead |
                                                 -- team_of_customer | cofounder |
                                                 -- team_member | vendor | investor |
                                                 -- peer | friend | family | unknown
                                                 -- (extends contact_type)
  + role_source     text                         -- §4.5 'atlas' | 'user' | 'integration' | 'inferred'
  + role_confidence numeric                      -- §4.5 0.0 - 1.0
  + role_set_at     timestamptz                  -- §4.5

users (or user_profiles — wherever Vibey users live)
  + fathom_aliases  text[]                       -- §6 host identity:
                                                 -- emails captured at Fathom
                                                 -- integration handshake
```

**Existing tables reused as-is (no changes):**

`contacts`, `leads`, `contact_activity`, `contact_notes`,
`contact_funnel_memberships`, `audiences`, `segments`, `avatars` (declared
top-down — distinct from `customer_avatars`), `offers`, `org_subscriptions`,
`user_subscriptions`, `credit_purchases`.

**Avatar synthesis skill (workflow additions):**

```
+ step 0:   anomaly pass        — read high-surprise memories, weight heavier
+ step 7+:  drift pass          — variance per avatar, threshold-triggered
+ step 8+:  contrast pass       — emit contrast_profile per avatar
+ step 9+:  discriminator pass  — emit discriminator_questions per pair
+ step 10+: needs pass          — score avatar on Robbins 6 Needs (1-10)
```

### 12.11 What we are still NOT building (scope cuts after refinement)

- **Behavioral telemetry adapters** (Stripe events, engagement decay, deal-stage
  velocity) — designed for in §12.2 via `evidence_type`, but the actual adapter
  work is a future workstream. Default `evidence_type = 'stated'` for now.
- **Per-customer simulation models** ("if I send this email, what will Maria do?").
  Tempting but premature. Avatars + Spotlight already give us reasonable answers;
  full simulation can come later.
- **Real-time avatar recomputation on every memory.** Avatars are recomputed on
  the synthesis pass (counter or schedule triggered), not on every write. The
  drift metric is what makes "near-real-time" feel real-time without the cost.

---

## 13. Summary in Six Lines

1. **One customer brain per org.** Reuse all existing brain tables. Add
   `customer_profiles` + `customer_identifiers` + `customer_offer_anchors` for
   identity resolution.
2. **Customers are tags on memories, not brains.** A memory carries `customer_id`.
3. **Avatars are emergent worldviews** for clusters of customers. Same
   relationship to perspectives as the user's worldview is to their perspectives.
4. **The one new cognitive primitive is "find the seams"** — Atlas needs to
   detect *where the population forks*, not just where it converges. Biased by
   the user's declared offers when present.
5. **Cortex Max for the customer brain reuses every component we already shipped.**
   Different labels, same shapes. Avatars become the headline category. Their
   capsules become the runtime Spotlight for embedded agents talking to those
   customers — closing the loop.
6. **The brain is cognitively honest by design.** Surprise-weighted memory
   (§12.1), evidence-typed beliefs (§12.2), drift-aware avatars (§12.3),
   contrastive identity (§12.4), McAdams + Robbins identity model (§12.5),
   active inference probes (§12.6), full lineage (§12.7), belief decay (§12.8),
   and Dunbar-scale Spotlight (§12.9) prevent schema lock-in, hallucinated
   personas, and stale clusters.
