# Customer Brain — Cognition + Skills

> Sequel to `customer-brain.md`. The infrastructure is shipped. This plan adds
> the cognition layer: the Atlas skills that actually populate the customer
> brain, the read-side wiring so the cognition appears in the UI, and the
> Spotlight extension so embedded agents use it at runtime.

---

## 0. Pre-conditions (already done, do not redo)

- **Customer Brain infrastructure** (changelog 2026-05-07 14:19): schema
  migration, `CustomerBrainService`, `ContactIdentifierService`, Fathom outbox
  branch (`customer_call_route` event enqueued), `customer_avatars` +
  `avatar_discriminator_axes` + `contact_identifiers` tables live, customer
  scope in the brain visualization scope picker, Night Janitor belief-decay
  sweep, contact reclassification endpoint + UI.
- **Atlas system-agent cleanup** (changelog 2026-05-07 14:05): single
  canonical row per skill / definition / resource for atlas / vibey / hr /
  viktor. `is_system=true` flag. RLS `deny_user_writes_to_system_agents` on
  `agent_skills`, `agent_definitions`, `agent_skill_resources`. `pnpm
  seed:system-agents` reads from `docker/agents/templates/...` and
  `docker/agents/vibey/`. Zero clones, zero `agent_template_skills` rows for
  system agents.
- **Two outbox events are enqueued but stubbed**: `customer_call_route` and
  `brain_avatar_synthesis`. They currently land in
  `processDeferredAtlasSkill` in `apps/mission-worker/src/modules/brain-ops/
  brain-ops.processor.ts`, which logs and marks the job as skipped. This plan
  replaces the placeholder with real dispatch.

---

## 1. Goal

Make the customer brain produce signal:

1. Memories from Fathom calls, widgets, Telegram, Slack, and future customer
   sources are routed to the right brain(s) by Atlas judgment -- not by
   rule-based heuristics -- and linked to a known contact, customer entity, or
   durable source identity.
2. Customer-side belief patterns and perspectives form from those memories
   the same way they do in user brains.
3. **Customer avatars emerge** from clustered customer-side perspectives via
   the new `customer-avatar-synthesis` skill — the only genuinely new
   cognitive primitive in this plan.
4. Cognition reads correctly through the Legend / BrainStats / Cortex Max for
   `scope='customer'` brains.
5. Embedded agents (widget / Telegram / Slack) get **Dunbar-scale Spotlight**:
   per-customer cognition for the top ~50 active customers, avatar-level
   cognition for everyone else.

Out of this plan: cross-channel ingestion (Slack, Gmail, Drive). Fathom is
the only source. Other channels are tracked separately.

---

## 2. Skills to create / extend

All skills are written into `docker/agents/templates/atlas/skills/<key>.md`
and seeded via `pnpm seed:system-agents`. Per the cleanup, there is **one
canonical row per skill** in `agent_skills` (`user_id IS NULL` + `org_id IS
NULL` + `is_system=true`). User toggles via `agent_overrides`.

### Authoring constraints (apply to every skill in this plan)

Two house references are non-negotiable when writing skill markdown:

1. **`/.cursor/skills/claude-skills/SKILL.md`** — the lifecycle truth. Skills
   live in the database; the filesystem is a runtime artifact wiped on every
   restart. Edit `docker/agents/templates/atlas/skills/<key>.md` → run
   `pnpm seed:system-agents`. Never insert directly into `agent_skills` for
   system agents — RLS blocks it anyway. Resources (templates, fixtures,
   long references) go in `agent_skill_resources` rows, not in the SKILL.md
   body.
2. **`/.cursor/skills/context_eng/SKILL.md`** — the writing quality bar.
   - Explain *why* before *what*. No shouty `ALWAYS` / `NEVER` /
     `CRITICAL` without a reason attached.
   - Description must include **WHAT and WHEN** so it triggers reliably.
   - Imperative form. One term per concept. Generalize, don't overfit.
   - 2–3 concrete examples per skill (one common case, one edge case).
   - Progressive disclosure: SKILL.md body < 500 lines; deep refs go to
     `agent_skill_resources`.
   - Defaults with escape hatches over option lists.
   - Match degree of freedom to fragility: routing = medium (Atlas judges
     within a template); avatar synthesis = low–medium for structured
     output, high for the McAdams prose; existing skill extensions =
     additive only, don't rewrite working behavior.

### 2.1 New: `customer-call-routing` (replaces the placeholder)

Peer of `knowledge-intake` / `knowledge-extraction`.

Trigger: `customer_call_route` event from `brain_ops_outbox` (already
enqueued by `apps/api/src/modules/integrations/fathom/controllers/
fathom.controller.ts`).

Skill contract is already specced in `customer-brain.md` §6. Concretely:

**Inputs the skill receives** (built by the worker before invoking Atlas):
- The Fathom call (transcript + attendees with email/name).
- Host identity (the user's Fathom alias from `profiles.fathom_aliases` —
  already migrated).
- The user's Vibey profile (name, role, org context).
- Existing contacts for this org + their current `contact_type` +
  `contact_identifiers`.
- Recent user-brain summary (so Atlas knows who the cofounder, the wife, the
  vendor are).
- The user's declared `offers` and active campaigns.

**Per-attendee judgment** (Atlas writes this back):
```
{
  attendee_email,
  resolved_contact_id,    // via ContactIdentifierService.findOrCreateContact
  contact_type,           // customer | lead | team_of_customer | cofounder |
                          // team_member | vendor | investor | peer |
                          // friend | family | unknown
  rationale,
  confidence              // 0..1
}
```

**Per-target writes** (driven by the role):
- **User brain slice** — always. Sefy's-side insights from the call.
- **Customer brain slice** — per attendee or source judged
  `customer | lead | team_of_customer`. Attach `contact_id` when known; when
  unknown, write with `customer_source_identity_id` / durable source anchor.
- **Campaign brain slice** — only if the artifact clearly mentions a known
  offer or campaign.
- **friend / family / internal** → never written to the customer brain.
  Privacy carve-out is structural.

**Side effects:**
- If `confidence ≥ 0.75` and the contact had a softer source (`source='heuristic'`
  or `'integration'`), update `contacts.contact_type` with
  `contact_type_source='atlas'` + `contact_type_confidence=<value>` +
  `contact_type_set_at=now()`. (Columns already exist from the infra
  migration.)
- If `confidence < 0.75`, leave role unchanged and skip customer-brain writes
  for that attendee.
- Log judgment + rationale on the source artifact for the override UX
  (`reclassify_contact` already implemented end-to-end).

**Existing primitives the skill calls** (no new tools needed):
- `create_memory(brain_id, content, ...)` — already used by user-brain Atlas
  flows. We pass `brain_id` of the customer brain and add `contact_id` to
  the payload.
- `create_belief_pattern`, `create_perspective` — only fire downstream via
  `brain-pattern-analysis` and `brain-perspective-synthesis` (next section).
  Routing skill doesn't call them directly.

### 2.2 New: `customer-avatar-synthesis`

Peer of `brain-pattern-analysis` and `brain-perspective-synthesis`.

Trigger:
- Counter: `ns_brains.customer_memories_since_last_avatar_pass >= 25` (column
  already exists).
- Time: Night Janitor weekly, but only when a pattern-analysis pass landed
  in the prior 24h on the same customer brain.

The single new cognitive verb: **find the seams**. Step 4 of the workflow
specced in `customer-brain.md` §5. Output is one or more `customer_avatars`
rows, each carrying:

- `discriminator_profile jsonb` — keyed by axis ID from
  `avatar_discriminator_axes`. Free text never lands here. New axes go to a
  separate `proposed_axes` block on the synthesis output and pass through
  the registration step (§4.4). Auto-promote to `status='active'` after 3+
  consecutive passes.
- `narrative_md` — McAdams arc (origin / fear / aspiration / anti-self).
  Prose, not bullet points. (Customer-brain plan §12.5.)
- `needs_profile jsonb` — Tony Robbins six human needs scored 1–10 with
  primary / secondary flags. (§12.5.)
- `contrast_profile jsonb` — one line per peer avatar describing the
  delta. (§12.4.)
- `discriminator_questions text[]` — questions that cleanly separate this
  avatar from each peer; embedded agents use these for active inference.
  (§12.6.)
- `lineage jsonb` — `{ perspective_ids[], belief_ids[], key_memory_ids[],
  key_customer_ids[] }`. Powers the Evidence tab. (§12.7.)
- `drift_metrics jsonb` — variance + centroid embedding + sample size +
  variance delta since last pass. Computed only for customers with new signal
  since the last pass. (§12.3.)
- `member_customer_unit_ids uuid[]` + `member_strength jsonb` —
  multi-membership is a feature; one customer unit can be a partial member of
  multiple avatars. `member_contact_ids` remains a compatibility projection for
  known contacts.

**Lifecycle ops** (mirror of belief / perspective lifecycle):
- New cluster with ≥3 members + ≥3 aligned perspectives → `create_avatar`.
- Existing avatar with shifted membership → `update_avatar`.
- Cluster bifurcates → `split_avatar`.
- Two avatars become identical → `merge_avatars`.
- Cluster no longer holds → `archive_avatar` (`status='transformed'`).

**Avatar Capsule** (per avatar): same template as the user CAPSULE.md, second
person flipped to *"you are talking to someone in this avatar"*. Stored as
an `ns_narrative_pages` row of `page_type='capsule'` in the customer brain
with `subject_id=<avatar_id>` (or a new `subject_kind='avatar'` discriminator —
decision needed; see §7).

### 2.3 Extend: `brain-pattern-analysis`

Already exists. Today: takes `subject_id` (user), runs against user-brain
memories, writes `ns_belief_patterns` rows.

Make it scope-aware:
- Accept either `subject_id` (user mode, unchanged) **or** `brain_id` (any
  brain, including customer).
- When invoked with `brain_id` of a customer brain, group memories by customer
  unit (`customer_entity_id` -> `contact_id` -> `customer_source_identity_id`)
  and look for *cross-customer-unit* belief themes.
- Persist:
  - `ns_belief_patterns.evidence_type` — `direct_quote | inferred_pattern |
    behavioral_signal | declarative`. Already added to schema by the infra
    migration.
  - `ns_belief_patterns.reinforcement_count` — incremented every time the
    pattern is re-confirmed by a new memory. Powers decay (§12.8).
  - `ns_belief_patterns.last_reinforced_at` — set on every reinforcement.

### 2.4 Extend: `brain-perspective-synthesis`

Already exists for user brains.

Make it scope-aware the same way as 2.3:
- Accept `brain_id`.
- For customer brains, perspectives are *shared lenses across multiple
  customer units*. The skill clusters customer-side beliefs by topic +
  emotional signature and produces `ns_perspectives` rows whose `subject_id`
  is the brain owner (org owner) but whose `evidence_distribution jsonb`
  records which customer units contributed and how strongly.
- Persist `ns_perspectives.evidence_distribution` (column already added).

These customer perspectives are the **lens-tier underneath avatars**. They
feed `customer-avatar-synthesis` step 7 ("dominant perspectives").

### 2.5 Extend: `brain-cross-pollinator`

Already exists for cross-campaign and brain-to-brain pattern surfacing.

Add the customer→user and customer→campaign direction (`customer-brain.md`
§9):
- When N (default: 3) customer-brain perspectives or beliefs converge on the
  same theme → emit a learning memory in the user brain (*"3 customers said
  your pricing is opaque"*) and a tension on the matching campaign brain if
  one exists.
- When a `customer_avatar` (emergent) and an `avatar` (declared) on the same
  offer materially diverge, write that gap as a tension on the customer
  brain.

---

## 3. Worker dispatch

### 3.1 Replace `processDeferredAtlasSkill`

`apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts` — current
placeholder logs + marks job as skipped. Replace with real dispatch:

```
case 'customer_call_route':
  → invoke Atlas with skill_key='customer-call-routing'
  → input bundle assembled by a new helper buildCustomerCallRoutingInput()
  → on success: write per-attendee judgments to artifacts log + update
    contacts.contact_type (with confidence gate)
  → on failure: bubble error, no fallback
case 'brain_avatar_synthesis':
  → invoke Atlas with skill_key='customer-avatar-synthesis'
  → input: customer brain memories, customer-side beliefs, customer-side
    perspectives, declared offers, existing customer_avatars rows,
    avatar_discriminator_axes registry
  → on success: avatar lifecycle ops as emitted by Atlas
  → on failure: bubble
```

The Atlas invocation uses the **existing** agent runtime (`agent-api`) — no
new transport, no new auth path. The worker calls `agent-api`'s internal
skill-runner endpoint with `agent_key='atlas'` + `skill_key=...` + the input
bundle.

### 3.2 Avatar synthesis trigger wiring

`apps/api/src/modules/brain/services/brain-ops-hook.service.ts` already
exists. Add:
- After every customer-brain memory write, increment
  `ns_brains.customer_memories_since_last_avatar_pass` for that brain.
- When the counter crosses 25, enqueue `brain_avatar_synthesis` with that
  `brain_id`.
- On successful synthesis pass, reset counter to 0 and stamp
  `ns_brains.last_avatar_synthesis_at`.

`apps/mission-worker/src/modules/brain-ops/brain-ops-night-janitor.service.
ts` already has the customer-brain belief-decay sweep. Extend the same sweep
to enqueue `brain_avatar_synthesis` weekly when:
- A pattern-analysis pass landed in the prior 24h, AND
- The counter is between 1 and 24 (i.e. there's signal, just below the
  trigger threshold).

---

## 4. Read-side wiring

### 4.1 Backend endpoints

`apps/api/src/modules/brain/controllers/emotional.controller.ts`:

- `GET /api/brain/patterns` — accept optional `brainId` query param.
  - Without `brainId`: current behavior (filter by `subject_id = user.id`).
  - With `brainId`: filter by `brain_id` (and require the caller has access
    via `BrainAuthGuard`, which already supports brain-scoped checks).
- `GET /api/brain/perspectives` — same shape.

`emotional-intelligence.service.ts`:
- Add `getPatternsForBrain(supabase, brainId)` and
  `getPerspectivesForBrain(supabase, brainId)`. Existing user-scoped methods
  stay.

This is intentionally minimal. We do **not** rewire user-scope to also use
`brain_id` — keeping the user-mode path stable preserves backward
compatibility with everything that already works.

### 4.2 Avatars endpoint

New: `GET /api/brain/avatars?brainId=<id>` — returns `customer_avatars` rows
for that brain, ordered by `strength desc, status priority`. Required for the
customer Cortex Max UI.

### 4.3 Frontend store

`apps/web/src/features/brain/services/brain.service.ts`:
- `fetchBeliefPatterns(brainId?: string)` — pass through to query param.
- `fetchPerspectives(brainId?: string)` — same.
- New: `fetchCustomerAvatars(brainId: string)` for the avatars endpoint.

`apps/web/src/features/brain/store/use-brain-store.ts`:
- `loadCognition(brainId?: string)` — accepts optional brainId.
- New: `customerAvatars: CustomerAvatar[]`, `loadCustomerAvatars(brainId)`.

### 4.4 Visualization gating

`apps/web/src/features/brain/components/BrainVisualization.tsx`:
- Drop the `scopeType === 'user'` gate on `beliefCount` /
  `perspectiveCount` for the Legend and BrainStats. Pass them for both
  `'user'` and `'customer'` scopes.
- Trigger `loadCognition(selectedScope.brainId)` for customer scope (the
  existing effect at line ~520 only calls it for user scope today).
- Fetch `customerAvatars` for customer scope.

`apps/web/src/features/brain/components/LegendPanel.tsx`:
- Cognition section already renders for user scope when counts are
  defined — no change needed there once the gate above is dropped. For
  customer scope, the section header reads *"Cognition"* with Customer
  Beliefs + Customer Perspectives counts, plus a new Avatars row.

`ForceGraph.tsx`:
- Already renders belief / perspective nodes for any brain. Add `avatar` as
  a third cognition node type with a distinct gradient color
  (`--brain-avatar-rgb`, new token). Avatars are drawn slightly larger than
  perspectives (radius +2px) and pulse at a slower frequency.

### 4.5 Customer Cortex Max UI

`apps/web/src/features/brain/components/CortexMaxBrainView.tsx` — extend the
section model (`customer-brain.md` §7):

```
GROUP_ORDER (customer scope) = [
  'avatars',              // standalone category; one page per avatar
                          // (Avatar X, Avatar Y, …) read from
                          // customer_avatars rows directly
  'customer_perspectives',
  'customer_beliefs',
  'avatar_tensions',
  'pain_patterns',        // patterns relabel
  'customers',            // people & places relabel — list of contacts
                          // with role ∈ {customer | lead | team_of_customer}
  'conversation_themes',  // topics relabel
]
```

**Avatars section data source (per locked decision §7.3):** read directly
from `customer_avatars` rows. No `ns_narrative_pages` rows for avatars.
Each `customer_avatars` row is rendered as one Cortex Max page, keyed by
its `id`, titled by `name`, body = `narrative_md`.

User scope keeps its current section labels. Section labels switch on
`scopeType` prop already threaded through `CortexMaxModal` and the team-2
`BrainTab`.

`CortexMaxDetailPanel.tsx` — new panel variant for `kind='avatar'`:
- Header: avatar name + meter (member count + strength + status).
- `narrative_md` rendered as prose (the McAdams arc).
- Discriminator profile as small chip groups, one per active axis from
  `avatar_discriminator_axes`.
- Six Human Needs scored 1–10 as horizontal bars; primary / secondary
  drivers highlighted.
- Dominant perspectives, dominant beliefs, dominant pain points as lists.
- Emotional signature using existing `BeliefMeter` / `PerspectiveMeter`
  primitives.
- Tensions when present (gap between `customer_avatar` and `declared
  avatar`, or drift breaches).
- **Members** — collapsible list of mixed customer-unit members. Known contacts
  render as contacts, account/customer entities render by name, and unresolved
  source identities render by source label until they are attached or merged.
- **Evidence tab** (§12.7) — read from `lineage` jsonb; render the avatar
  ← perspectives ← beliefs ← memories chain. Each memory has an *"Mark as
  outlier"* control that writes feedback for the next synthesis pass.

`CortexMaxModal.tsx` already fetches `pages` + `beliefs` + `perspectives` on
open. Add `avatars` to the parallel fetch when `scope='customer'`.

`team-2 BrainTab.tsx` — passes only `pages` to `CortexMaxBrainView` today.
Update to fetch and pass `beliefs` + `perspectives` for any agent brain too,
so cognition appears there as well (closing the second part of the gap the
user found).

---

## 5. Spotlight extension (Dunbar-scale)

`apps/agent-api/src/modules/brain/services/brain-spotlight.service.ts` —
already has the customer-brain hook from Stage I of the infra plan. Wire it:

### 5.1 Active customer set (top ~50)

Computed nightly by Night Janitor and stored on the customer brain.

```
ns_brains.spotlight_active_contact_ids uuid[]   -- new column
ns_brains.spotlight_computed_at timestamptz     -- new column
```

Computation:
- Score every customer-tagged contact:
  - Recent activity weight: count of customer-brain memories in last 14d.
  - Pipeline value weight: from `contact_campaign_memberships.anchor_type`
    (`purchase` > `enrollment` > `cohort` > `free-signup`).
  - Pin weight: `contacts.is_pinned_for_spotlight` (new boolean).
- Top 50 by combined score → `spotlight_active_contact_ids`.

### 5.2 Spotlight resolution rules

When an embedded agent (widget / Telegram / Slack) handles a turn for a
customer:

```
resolveSpotlight(contact_id, brain_id):
  always inject (when contact_id is known):
    - avatar capsule for the customer's primary avatar
      (narrative_md + needs_profile + dominant beliefs/perspectives +
       contrast vs peer avatar)
    - 1 discriminator question if avatar membership confidence < 0.7

  if contact_id IN spotlight_active_contact_ids:
    additionally inject:
      - this customer's own memory excerpts from the customer brain
        (filtered by ns_memories.contact_id = this contact)
        — top-N by recency + significance, capped to keep payload small
      - any open tensions tagged to this contact

  if contact_id is unknown / not yet resolved:
    inject avatar-level cognition only (no per-contact memories), based
    on a best-guess avatar match if Atlas has one — otherwise nothing.
```

Note: per locked decision §7.4, beliefs and perspectives in the customer
brain are cross-contact themes — they live at the avatar level, not the
per-contact level. Per-customer detail in Spotlight is delivered through
their *own raw memory excerpts*, not through per-customer beliefs.

### 5.3 Discriminator question runtime use (§12.6)

When `avatar membership confidence < 0.7` for the customer:
- Spotlight picks the discriminator question that best separates the top-2
  candidate avatars.
- Embedded agent receives it as a *"recommended next probe"* hint.
- The customer's answer feeds back as a memory; next synthesis pass
  re-evaluates membership.

---

## 6. Stages (executable order)

| Stage | What | Dependencies | Output |
|---|---|---|---|
| **A** | `customer-call-routing` skill markdown + agent runtime invocation path. Replace `processDeferredAtlasSkill` for `customer_call_route`. | Atlas system-agent cleanup (done). Infra outbox (done). | Real Fathom calls with customer attendees produce customer-brain memories tagged with `contact_id`. |
| **B** | Extend `brain-pattern-analysis` to accept `brain_id`. Run a one-time backfill pass against any populated customer brain. | Stage A produced memories. | Customer-side beliefs exist with `evidence_type` + `reinforcement_count`. |
| **C** | Extend `brain-perspective-synthesis` to accept `brain_id`. | Stage B. | Customer perspectives exist with `evidence_distribution`. |
| **D** | `customer-avatar-synthesis` skill. Counter wiring + Night Janitor avatar sweep. Replace `processDeferredAtlasSkill` for `brain_avatar_synthesis`. | Stages A–C. | First avatars appear for orgs with sufficient signal. |
| **E** | Read-side endpoints + frontend store + Legend / BrainStats / ForceGraph for customer scope. | Stage D (or earlier — can ship in parallel with B once routing produces beliefs). | Cognition section renders in customer brain Legend, customer beliefs / perspectives appear as graph nodes. |
| **F** | Customer Cortex Max UI (avatar headline + relabeled sections + avatar detail panel + Evidence tab). team-2 BrainTab gap fix. | Stage E. | Avatars visible and inspectable in Cortex Max. |
| **G** | Spotlight: active set computation, Dunbar-scale resolution rules in `brain-spotlight.service.ts`, embedded-agent integration. | Stage F. | Embedded agents inject avatar capsule + per-customer cognition at runtime. |
| **H** | `brain-cross-pollinator` customer→user / customer→campaign direction. | Stage F. | Cross-pollination loop closed (customer-level patterns surface upward). |

Smallest first slice that proves value: **A + B + C + E**. That's enough to
show *"customer-side beliefs and perspectives are forming from real Fathom
calls"* before investing in avatars or runtime injection. Stage D is the
high-conviction differentiator but it depends on B and C having signal.

---

## 7. Locked decisions (2026-05-08)

1. **Memory-write confidence floor** — `0.75`. Atlas writes a customer-brain
   memory for an attendee only when its judgment confidence on
   `customer | lead | team_of_customer` is ≥ 0.75. Below that, no customer-
   brain write; user-brain slice still happens.
2. **Stage A backfill** — **forward-only.** No re-processing of historical
   Fathom calls when routing ships. First synthesis pass runs on whatever
   accumulates from launch onward.
3. **Avatar capsule storage** — **`customer_avatars.narrative_md` is the
   source of truth.** Avatars render as a standalone Cortex Max category;
   each avatar is its own page in the sidebar (Avatar X, Avatar Y, …)
   with the McAdams arc + needs profile + discriminator chips read directly
   off the `customer_avatars` row. **No** corresponding rows in
   `ns_narrative_pages`. Keeps the avatar lifecycle in one table.
4. **Per-customer-unit vs collective beliefs** — **collective first.**
   `contact_id`, `customer_entity_id`, and `customer_source_identity_id` live
   on `ns_memories` as identity/resolution metadata. Beyond that, the brain is
   a single shared substrate: beliefs and perspectives are cross-customer-unit
   themes synthesized from the whole memory pool. `ns_belief_patterns` and
   `ns_perspectives` in the customer brain do **not** carry `contact_id`.
   Per-customer/account rollups are derived from customer units rather than
   modeled as separate brains.

## 8. Open questions (non-blocking, lock during the relevant stage)

1. **Avatar capsule storage shape.** Reuse `ns_narrative_pages` with
   `page_type='capsule'` + a new `subject_kind='avatar'` column, or write
   the capsule into `customer_avatars.narrative_md` directly and skip the
   pages table for avatars? Decision affects the Cortex Max read path and
   Spotlight injection cost.
2. **Per-contact vs per-cluster belief patterns.** Stage B writes per-contact
   first then surfaces cross-contact themes — but the schema today doesn't
   distinguish them. Add `ns_belief_patterns.scope` (`per_contact` |
   `cross_contact`) or model cross-contact themes as `ns_perspectives` only?
3. **Confidence floor for `customer-call-routing` writes.** Plan §6 says ≥
   0.75 to update `contacts.contact_type`. What about the confidence floor
   to write a customer-brain memory in the first place? Options: (a) write
   only when ≥ 0.6, (b) always write but tag with the confidence so low-
   confidence memories carry less reinforcement weight downstream.
4. **Discriminator question delivery channel.** Stage G assumes the embedded
   agent surfaces the question as a "recommended next probe" hint. Is that
   a system-prompt addition only, or do we also surface it in the operator
   UI as a sales-rep brief?
5. **Stage A backfill.** Do we re-process the user's last 90 days of Fathom
   calls through the new routing skill once it's live, or only forward-only
   from Stage A ship date? (Backfill = stronger first avatar pass; forward-
   only = simpler, safer.)
6. **Six Human Needs scoring source.** Atlas inferring from text only, or
   should we surface a small operator-side rating UI for high-confidence
   manual corrections per avatar?
7. **Outlier feedback loop.** Stage F's "Mark as outlier" control on the
   Evidence tab — does it write to a new `customer_avatar_feedback` table,
   or attach to the memory row directly via `ns_memories.feedback jsonb`?

These are not blocking the plan structure — they're locks the executor needs
before writing migrations or skill markdown.

---

## 8. Out of scope

- Slack / Gmail / Drive / IG / LinkedIn / Meta Ads ingestion. Per
  `customer-brain.md` §10 phasing, those land per-channel after Fathom
  proves the model. Each is its own small PR.
- Per-customer brains (we explicitly chose one customer brain per org with
  emergent avatars instead).
- New top-level cognitive primitives beyond avatars. Beliefs, perspectives,
  and avatars are the full hierarchy for v1.
- Sales-rep brief format as a separate page. The avatar detail panel is the
  brief format for v1 (§12.5). Dedicated rep-brief pages can come later.
- Hard delete vs soft archive policy for `reclassify_contact`. Open
  decision from `customer-brain.md`. Revisit at launch.

---

## 9. Files we expect to touch

**New:**
- `docker/agents/templates/atlas/skills/customer-call-routing.md`
- `docker/agents/templates/atlas/skills/customer-avatar-synthesis.md`
- `apps/api/src/modules/brain/controllers/customer-avatars.controller.ts`
  *(or extend `cortex-max.controller.ts`)*
- `apps/api/src/modules/brain/services/customer-avatars.service.ts`
- `apps/web/src/features/brain/types/customer-avatar.types.ts`
- `apps/web/src/features/brain/components/CortexMaxAvatarPanel.tsx`
- `supabase/migrations/<ts>_spotlight_active_set.sql`
  (`ns_brains.spotlight_active_contact_ids` + `spotlight_computed_at` +
  `contacts.is_pinned_for_spotlight`)

**Extended:**
- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts`
  (replace `processDeferredAtlasSkill`)
- `apps/mission-worker/src/modules/brain-ops/brain-ops-night-janitor.service.ts`
  (avatar synthesis sweep + active-set computation)
- `apps/api/src/modules/brain/services/brain-ops-hook.service.ts`
  (counter increment + avatar trigger)
- `apps/api/src/modules/brain/controllers/emotional.controller.ts`
  (`brainId` query param)
- `apps/api/src/modules/brain/services/emotional-intelligence.service.ts`
  (`getPatternsForBrain` / `getPerspectivesForBrain`)
- `apps/agent-api/src/modules/brain/services/brain-spotlight.service.ts`
  (Dunbar-scale resolution + avatar capsule injection)
- `apps/web/src/features/brain/services/brain.service.ts`
- `apps/web/src/features/brain/store/use-brain-store.ts`
- `apps/web/src/features/brain/components/BrainVisualization.tsx`
- `apps/web/src/features/brain/components/LegendPanel.tsx`
- `apps/web/src/features/brain/components/BrainStats.tsx`
- `apps/web/src/features/brain/components/ForceGraph.tsx`
  (avatar node type + `--brain-avatar-rgb` token)
- `apps/web/src/features/brain/components/CortexMaxBrainView.tsx`
  (scope-aware section model)
- `apps/web/src/features/brain/components/CortexMaxModal.tsx`
  (fetch avatars on customer scope)
- `apps/web/src/features/brain/components/CortexMaxDetailPanel.tsx`
  (avatar variant + Evidence tab)
- `apps/web/src/features/team-2/components/tabs/BrainTab.tsx`
  (also fetch + pass beliefs / perspectives)
- `apps/web/src/app/globals.css` (`--brain-avatar-rgb`)
- (Existing) `brain-pattern-analysis.md`, `brain-perspective-synthesis.md`,
  `brain-cross-pollinator.md` — extended in `docker/agents/templates/atlas/
  skills/`.

---

## 10. Done definition

- A real Fathom call with a known customer attendee produces a memory in the
  customer brain tagged with the right `contact_id` within one outbox cycle.
- After 25+ customer-brain memories, an avatar synthesis pass runs and
  produces ≥ 1 `customer_avatars` row with non-empty `discriminator_profile`,
  `narrative_md`, and `needs_profile`.
- The customer brain's Legend renders the Cognition section with non-zero
  Beliefs / Perspectives / Avatars counts.
- The customer Cortex Max view renders the Avatars headline + at least one
  expandable avatar with discriminator chips, six-needs bars, members list,
  and Evidence tab.
- An embedded widget conversation with a known customer in the active set
  loads per-customer cognition; with a customer outside the active set, it
  loads avatar-level cognition only. Both cases respond differently from
  one another in a measurable way (different system-prompt content).

When all five hold on Sefy's account using real data, this plan is done.
