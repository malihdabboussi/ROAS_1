# Customer Brain Product Architecture Drift Audit

Date: 2026-06-24

## Audit Boundary

This audit compares the current repo and production Supabase state against the product architecture clarified by the user on 2026-06-24:

- Customer Brain is the collective customer consciousness for a workspace, not one brain per customer.
- Known contact/account identity should be attached when available.
- Unknown customer signals should still become durable Customer Brain memory when the source, scope, and permission are valid.
- Contact is metadata and resolution, not the write gate.
- The brain must support both population-level synthesis and per-customer/account rollups.

## Executive Summary

The database foundation is closer than the runtime contract. `ns_memories.contact_id` is nullable in both repo migrations and production, and the manual Add Information UX already allows contactless Customer Brain memory.

The main drift is everywhere around that table: agent schemas, Atlas routing, DB-backed skills, worker prompts, customer-source envelopes, pattern analysis, avatar synthesis, docs, tests, and Cortex Max still model `contact_id` as the identity backbone. In production, this shows up clearly: all 797 Customer Brain memories have `contact_id`; zero are contactless, even though the column allows it.

The best long-term solution is not to fake contacts for anonymous sources. It is to introduce a Customer Identity Graph:

- `contacts`: known human records.
- `customer_entities`: first-class customer/account/person/anonymous-source nodes inside the Customer Brain.
- `customer_source_identities`: stable unresolved identities from widget visitor IDs, Telegram chat IDs, Fathom attendees, domains, or future channels.
- Customer memories can link to any known combination of `contact_id`, `customer_entity_id`, and `customer_source_identity_id`.
- UX exposes unresolved customer signals so users can merge, attach, or leave them as collective evidence.

## What Is Already Aligned

### A1. Storage can hold contactless Customer Brain memories

Evidence:

- `supabase/migrations/20260507142000_customer_brain_infra.sql:46` adds `ns_memories.contact_id uuid ... ON DELETE SET NULL`.
- Production schema query on project `qfrvykscoymiwwgysvsr` confirms `public.ns_memories.contact_id` is nullable.

Why this matters:

- The core `ns_memories` table does not need a contact to store a customer memory.
- The drift is in contracts and processing, not in the base memory table.

### A2. Manual Add Information already supports optional contact

Evidence:

- `apps/api/src/modules/brain/controllers/customer-brain.controller.ts:51-68` describes direct text memory writes as optionally tied to a contact.
- `apps/api/src/modules/brain/services/customer-brain-memory-write.service.ts:138-151` returns `null` when no contact is supplied, and `154-178` inserts that nullable value.
- `apps/web/src/features/brain/components/CustomerAddInfoPanel.tsx:206-210` says the contact picker is optional.

Why this matters:

- The desired product behavior already exists in one manual path.
- The long-term work should turn this into the shared Customer Brain contract, not leave it as a special UI exception.

### A3. Scope and permission gates already exist

Evidence:

- `apps/api/src/modules/brain/services/customer-brain-memory-write.service.ts:109-135` validates write permission and target Customer Brain.
- `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.ts:43-99` resolves the Customer Brain and verifies access.

Why this matters:

- The product correction is not "save anything anywhere."
- Scope and Customer Brain permission must remain hard gates. Contact should not be a hard gate.

## Production Snapshot

Production query on project `qfrvykscoymiwwgysvsr`:

```text
customer_memory_total: 797
customer_memory_with_contact: 797
customer_memory_without_contact: 0
source_types_without_contact: []
```

Interpretation:

- Production behavior is effectively contact-bound.
- There is no live evidence that the contactless path is being used outside manual code support.
- This matches the runtime contracts that still reject or skip unknown customer signals.

## Drift Gaps And Long-Term UX Solutions

### CB-01. Product model drift: Customer Brain is treated as contact cognition, not collective customer cognition

Current state:

- The older docs and runtime language repeatedly define Customer Brain memories as tied to contacts.
- The current system can synthesize cross-customer avatars, but "customer" means `contact_id`.

Evidence:

- `.docs/plans/customer-brain.md:179-185` says every customer-derived memory is tagged with `contact_id`.
- `.docs/plans/customer-brain.md:678-684` says anonymous customers are out of scope and companies are not first-class.
- `docker/agents/atlas/skills/knowledge-intake/SKILL.md:16-18` describes Customer Brain as customer cognition tied to contacts.

Product impact:

- A real customer signal without a known contact is treated as unusable.
- The brain cannot represent the 10,000-customer population model the user described.

Best long-term UX solution:

- Make Customer Brain UI start from "Collective" as the default view.
- Add second-level views for "Avatars", "Customers", "Accounts", and "Unlinked Signals".
- Use language like "Attach to customer" rather than "required contact".

Engineering solution:

- Update the canonical Customer Brain docs and all Atlas/runtime instructions to state: contact is optional metadata; source/scope/permission are required.
- Replace contact-only wording with "customer signal identity" wording.

Acceptance:

- A user, agent, or channel can save a valid Customer Brain memory without a contact.
- The saved memory remains searchable and eligible for synthesis.

### CB-02. Agent action schemas require `contact_id`

Current state:

- Agent-facing Customer Brain actions reject payloads without `contact_id`.

Evidence:

- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts:2782-2808` requires `contact_id` for `save_customer_memory`.
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts:2822-2858` requires `contact_id` for text and link ingestion.
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts:756-774` locks this as expected behavior.

Product impact:

- Atlas and other agents cannot save valid customer knowledge unless they already know a CRM contact.
- Agents are pushed toward asking for a contact or skipping the memory.

Best long-term UX solution:

- Agent tool descriptions should say: "Save to collective Customer Brain. Add contact/customer/account identity when known."
- Tool correction messages should ask for source/scope only when those are missing, not for a contact when source context is enough.

Engineering solution:

- Change `save_customer_memory` required fields to `content` and `memory_type`.
- Add optional fields: `contact_id`, `customer_entity_id`, `customer_source_identity_id`, `source_actor_label`, `source_identity`, `resolution_status`, `identity_confidence`.
- Add a preflight validator requiring at least one durable source anchor when contact/entity is missing: `source_type + source_id`, `conversation_id`, `visitor_id`, `telegram_chat_id`, or `meeting_id`.

Acceptance:

- `validateActionData('save_customer_memory', { content, memory_type, source_type, source_id })` passes.
- Missing source/scope still fails.
- Invalid supplied contact still fails.

### CB-03. The agent service rejects contactless Customer Brain writes

Current state:

- The service validates Customer Brain access, then explicitly rejects missing `contact_id`.

Evidence:

- `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.ts:119-175` inserts `contact_id` as a required service input.
- `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.ts:194-202` returns `contact_id is required` before insert.

Product impact:

- Even if the schema changes, runtime writes fail until the service accepts contactless saves.

Best long-term UX solution:

- When contact is unknown, return a successful save with `resolution_status: "unlinked"` and show it in an Unlinked Signals queue.
- Do not ask the user to create a CRM contact just to preserve a useful collective signal.

Engineering solution:

- Make service input `contactId: string | null`.
- Validate contact only when supplied.
- Preserve `source_type`, `source_id`, `speaker`, `metadata`, and identity hints for contactless writes.
- Return `contact_id: null`, `customer_source_identity_id`, and `resolution_status`.

Acceptance:

- Agent API can save a Customer Brain memory with `contact_id: null`.
- The result includes enough identity/source metadata for later resolution.

### CB-04. `atlas_save_brain_context` also requires `contact_id` for Customer Brain routing

Current state:

- The higher-level brain routing action still blocks Customer Brain saves without a contact.

Evidence:

- `apps/agent-api/src/modules/artifacts/services/artifact-atlas-brain-context.service.ts:49-72` returns `contact_id is required to save customer brain context`.

Product impact:

- Even if Atlas chooses the right brain family, its preferred router can fail on the contact gate.

Best long-term UX solution:

- Atlas should be able to say: "This is customer-population knowledge; save it to Customer Brain now; attach identity later if possible."

Engineering solution:

- Make `atlas_save_brain_context` pass optional contact/entity/source identity fields to `save_customer_memory`.
- For `target_brain = customer`, require Customer Brain permission and a source anchor, not a contact.

Acceptance:

- `atlas_save_brain_context` can route a customer insight into Customer Brain with an unlinked source identity.

### CB-05. DB-backed and generated skills still teach the old contact rule

Current state:

- Both checked-in Atlas skills and production `agent_skills` rows tell agents that Customer Brain writes require contact.

Evidence:

- `docker/agents/atlas/skills/knowledge-intake/SKILL.md:36-38` says ask for contact or skip.
- Production `agent_skills` query shows Atlas `knowledge-intake` contains the same contact rule.
- `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts:1302-1328` says customer memory/text/link saves are tied to a contact and require `contact_id`.
- `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts:261-265` generates examples saying `save_customer_memory` requires `contact_id`.

Product impact:

- Source edits alone are not enough. Agents will continue old behavior if DB-backed skills or generated runtime docs are stale.

Best long-term UX solution:

- The agent-facing language should reflect the same UX contract the user sees: save to the collective brain, optionally attach identity.

Engineering solution:

- Update checked-in Atlas skills.
- Update generated `vibey-api` docs.
- Update DB-backed `agent_skills` rows through the supported sync/backfill path.
- Verify the materialized runtime skill content after sync.

Acceptance:

- Production `agent_skills` no longer contains "Customer Brain memories require a contact_id."
- Generated action docs show contact optional and source identity required when contact is absent.

### CB-06. Anonymous widget conversations are deliberately skipped

Current state:

- Widget conversations without visitor email are not converted into customer interaction envelopes.

Evidence:

- `apps/mission-worker/src/modules/brain-ops/customer-interaction-envelope.ts:94-103` returns `null` for widget visitors without email.
- `apps/mission-worker/src/modules/brain-ops/customer-signal-sweeper.service.ts:171-176` only sweeps public widget conversations with `visitor_email` or `extracted_email`.
- `apps/mission-worker/src/modules/brain-ops/customer-interaction-envelope.test.ts:143-149` and `customer-signal-sweeper.contract.test.ts:285-292` lock anonymous skips.

Product impact:

- This is the exact customer-source durability gap the user found.
- Anonymous or not-yet-identified customer behavior disappears before Customer Brain can learn from it.

Best long-term UX solution:

- Add "Anonymous visitor signals" to Customer Brain.
- Show them as collective evidence with source chips like "Widget visitor", "Conversation", "No contact yet".
- Let users later attach to a contact/account or leave them as population signal.

Engineering solution:

- Change widget envelope creation to use `visitor_id` as a stable `customer_source_identity`.
- Change sweeper eligibility to include public widget conversations with `visitor_id`, even without email.
- Mark the resulting memory `resolution_status = 'unlinked'`.

Acceptance:

- A public widget chat with no email creates a Customer Brain memory when Customer Brain scope and permission are valid.
- It appears in Unlinked Signals and contributes to aggregate synthesis.

### CB-07. Mixed/ambiguous interaction routing treats zero customer writes as a valid completed route

Current state:

- The worker sends ambiguous interactions to Atlas but marks the route done even when zero memories are written.

Evidence:

- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts:1399-1404` says unknown or multiple participants go through Atlas using the same `save_customer_memory` action contract.
- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts:1503-1512` counts tool actions.
- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts:1524-1529` marks outbox done and logs zero writes as completion.
- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts:1777-1783` tells Atlas not to write for unknown and to use only allowed contact IDs.

Product impact:

- A valid customer source can become a no-op because identity is unresolved.
- The user has no durable pending artifact to review.

Best long-term UX solution:

- Add a "Needs identity review" lane inside Unlinked Signals.
- For customer-facing sources, zero-write should create a reviewable candidate or an unlinked collective memory, not silently vanish.

Engineering solution:

- Add `customer_signal_routes` or reuse outbox metadata to record route outcome: saved, unlinked_saved, needs_review, rejected_internal, skipped_empty.
- For eligible customer sources, route unknown identity to unlinked memory or review candidate.
- Keep internal/team-only calls as no-op, but make the reason explicit.

Acceptance:

- Zero-write outcomes are queryable by reason.
- Customer-facing unknowns do not disappear silently.

### CB-08. Pattern analysis ignores contactless memories

Current state:

- Customer pattern analysis filters out memories without `contact_id` and requires at least 3 distinct contacts.

Evidence:

- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts:2000-2023` skips if fewer than 3 distinct contact IDs.
- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts:2105-2120` filters memories with `!!m.contact_id`.
- `docker/agents/atlas/skills/customer-brain-pattern-analysis/SKILL.md:18` says beliefs require 3 distinct `contact_id`s.
- `docker/agents/atlas/skills/customer-brain-pattern-analysis/SKILL.md:63-73` groups and emits support by `contact_id`.
- `docker/agents/atlas/skills/customer-brain-pattern-analysis/SKILL.md:240-245` requires `supporting_contact_ids.length >= 3`.

Product impact:

- Even if contactless memories are saved, they cannot become beliefs or perspectives.

Best long-term UX solution:

- In Cortex Max, belief evidence should be grouped by "customer units", not only contacts.
- Evidence chips should show "linked contact", "account", "anonymous visitor", or "source identity".

Engineering solution:

- Replace distinct-contact threshold with distinct-customer-unit threshold.
- Define customer unit priority: `customer_entity_id` -> `contact_id` -> `customer_source_identity_id`.
- Rename output contract from `supporting_contact_ids` to `supporting_customer_unit_ids`, keeping a compatibility field during migration.

Acceptance:

- Three distinct unresolved widget visitor identities can form a stated/revealed belief when evidence supports it.
- The worker no longer filters out contactless Customer Brain memories.

### CB-09. Avatar synthesis is contact-member only

Current state:

- Customer avatars require contact members and ignore contactless memories.

Evidence:

- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts:656-677` builds synthesis contacts from `memory.contact_id` and skips below 3 contacts.
- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts:798-810` filters out contactless memories.
- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts:1178-1183` accepts avatar updates only when member contact IDs are valid.
- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts:1225-1262` inserts avatars only with at least 3 valid `member_contact_ids`.
- `docker/agents/atlas/skills/customer-avatar-synthesis/SKILL.md:22-28` inputs are contact-based.
- `docker/agents/atlas/skills/customer-avatar-synthesis/SKILL.md:70-73` outputs `member_contact_ids`.
- `docker/agents/atlas/skills/customer-avatar-synthesis/SKILL.md:422-423` requires at least 3 `member_contact_ids`.

Product impact:

- Avatars cannot emerge from the full customer population.
- Anonymous or source-level behavior cannot shape avatar worldview.

Best long-term UX solution:

- Avatar detail should show "Members and evidence" as mixed units: contacts, accounts, anonymous source identities, and memory clusters.
- Users should not see raw IDs as the main representation.

Engineering solution:

- Add avatar membership table or fields based on `customer_unit_id`, not only `member_contact_ids`.
- Keep `member_contact_ids` as a derived compatibility projection for known contacts.
- Change Atlas avatar skill and worker validation to use mixed membership.

Acceptance:

- Avatar synthesis can use contactless but source-anchored memories.
- Known contacts still render as people; unknown units render as source identities until resolved.

### CB-10. There is no first-class customer/account node layer

Current state:

- Contacts are human CRM rows. Companies/accounts are not first-class Customer Brain nodes.

Evidence:

- `.docs/plans/customer-brain.md:681-684` explicitly rejects companies as separate entities.
- `supabase/migrations/20260507142000_customer_brain_infra.sql:195-205` stores avatar membership as `member_contact_ids`.

Product impact:

- The brain cannot show "10,000 customers" as customer/account nodes with rollups.
- B2B accounts like a cleaning company cannot own consolidated knowledge separate from one human contact.

Best long-term UX solution:

- Add a Customer Library in Cortex Max:
  - Accounts
  - People
  - Anonymous sources
  - Segments/avatars
- A customer/account detail page should show memories, beliefs, conversations, linked contacts, unresolved sources, avatar memberships, and latest recommendations.

Engineering solution:

- Add `customer_entities`:
  - `id`
  - `brain_id`
  - `entity_type`: `account`, `person`, `anonymous_source`, `segment`
  - `display_name`
  - `resolution_status`
  - `metadata`
- Add `customer_entity_members` for contacts/source identities.
- Add nullable `customer_entity_id` to Customer Brain memories.

Acceptance:

- A memory can belong to an account/entity without a specific contact.
- A contact can later be linked into the entity without rewriting the memory content.

### CB-11. Cortex Max UI is avatar/contact-centric

Current state:

- The detail panel renders Customer Avatar membership from `member_contact_ids`.

Evidence:

- `apps/web/src/features/brain/types/brain.types.ts:244-254` defines `CustomerAvatar.member_contact_ids`.
- `apps/web/src/features/brain/components/CortexMaxDetailPanel.tsx:573-740` calculates member count from `member_contact_ids` and renders an avatar member section from those IDs.

Product impact:

- The UI cannot express collective customer signals, unresolved sources, or account/customer nodes.
- Users see the synthesized avatar object but not the full customer population brain.

Best long-term UX solution:

- Cortex Max Customer Brain should have four persistent tabs:
  - Collective
  - Avatars
  - Customers/Accounts
  - Unlinked Signals
- Avatar member sections should display resolved names and unresolved source identities, not raw IDs.
- Add source/provenance chips: "contact", "account", "widget visitor", "Telegram", "Fathom", "manual".

Engineering solution:

- Extend Customer Brain API types with customer entity and source identity summaries.
- Add Customer Brain read models for unlinked memories and entity rollups.
- Update detail panel to render mixed membership units.

Acceptance:

- A contactless memory is visible and actionable in Cortex Max.
- Users can attach it to a contact/account without losing its collective-brain meaning.

### CB-12. Search and list APIs lack identity-resolution semantics

Current state:

- Customer Brain search/list returns memories with `contact_id`, but no resolution status, source identity summary, or entity rollup.

Evidence:

- `apps/agent-api/src/modules/artifacts/repositories/artifact-customer-brain.repository.ts:63-92` selects `contact_id` but no broader customer identity fields.

Product impact:

- Even if contactless memories exist, readers cannot distinguish "collective only", "unlinked", "account-level", and "contact-linked" evidence.

Best long-term UX solution:

- Search results should show a small identity pill:
  - Linked contact
  - Account
  - Anonymous visitor
  - Source-only
  - Needs review

Engineering solution:

- Extend read models to include `customer_entity`, `source_identity`, and `resolution_status`.
- Add filters for `linked`, `unlinked`, `account`, `contact`, `source_type`.

Acceptance:

- Customer Brain search can return and filter contactless memories cleanly.

### CB-13. Tests currently protect the old behavior

Current state:

- Tests enforce `contact_id` as required and anonymous widget conversations as skipped.
- The manual optional path has duplicate-contact coverage but no contactless success coverage.

Evidence:

- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts:756-774` expects missing `contact_id` to fail.
- `apps/mission-worker/src/modules/brain-ops/customer-interaction-envelope.test.ts:143-149` expects anonymous widget envelope to be null.
- `apps/mission-worker/src/modules/brain-ops/customer-signal-sweeper.contract.test.ts:285-292` expects anonymous widget conversations to be skipped.
- `apps/api/src/modules/brain/services/__tests__/customer-brain-memory-write.service.test.ts:51-83` tests duplicate manual write only with `contactId: 'contact-1'`.

Product impact:

- Future changes will be pulled back toward the old model unless tests change first.

Best long-term UX solution:

- Encode the desired UX in tests: save now, resolve later.

Engineering solution:

- Add failing tests before implementation:
  - contactless manual memory save succeeds;
  - `save_customer_memory` accepts source-anchored contactless saves;
  - anonymous widget envelope creates source identity;
  - worker writes unlinked customer memory;
  - pattern analysis counts distinct customer units;
  - avatar synthesis supports mixed members;
  - Cortex Max renders unlinked signals.

Acceptance:

- Contactless Customer Brain behavior is protected across API, agent, worker, and UI.

### CB-14. Legacy/team brain memory path still blocks Customer Brain contactless writes

Current state:

- The legacy team brain memory service has a customer-brain branch that requires `contact_id`.

Evidence:

- `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain-memory.service.ts:113-122` rejects customer-brain memories without `contact_id`.

Product impact:

- Older or compatibility paths can preserve the old behavior after the main service is fixed.

Best long-term UX solution:

- Users should not need to know which runtime path saved the memory. Customer Brain behavior must be consistent everywhere.

Engineering solution:

- Either route this branch through the new shared Customer Brain write service or update it to the same optional-contact contract.

Acceptance:

- Grep for `contact_id is required` in Customer Brain write paths no longer finds active blockers except CRM-specific contact tools.

### CB-15. Source/channel UX copy overpromises automatic routing

Current state:

- Slack recurring UI copy says sender resolution routes customer messages automatically, but the underlying architecture still depends on contact/source resolution.

Evidence:

- `apps/web/src/features/brain/components/training/recurring/rule-cards/SlackRuleCard.tsx:284-288` says Customer Brain routing happens automatically.

Product impact:

- Users may believe all customer signals are captured, while unresolved sources can still be skipped or zero-written.

Best long-term UX solution:

- Channel setup should show routing health:
  - Customer Brain enabled
  - Source identity captured
  - Contact matching active
  - Unlinked signal capture active
  - Review queue count

Engineering solution:

- Add source health/status to recurring-source cards.
- Use backend counters from the new route outcomes.

Acceptance:

- The UI can show when a channel is saving linked memories, unlinked memories, or review candidates.

## Target Data Model

### Memory identity fields

Keep:

- `ns_memories.contact_id` nullable.

Add:

- `ns_memories.customer_entity_id uuid null`
- `ns_memories.customer_source_identity_id uuid null`
- `ns_memories.resolution_status text not null default 'linked_or_not_required'`

Recommended `resolution_status` values:

- `linked_contact`
- `linked_entity`
- `unlinked_source`
- `needs_review`
- `rejected_internal`

### Customer entities

Create `customer_entities`:

```sql
id uuid primary key
brain_id uuid not null references ns_brains(id) on delete cascade
entity_type text not null -- account | person | anonymous_source | segment
display_name text not null
resolution_status text not null
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### Customer source identities

Create `customer_source_identities`:

```sql
id uuid primary key
brain_id uuid not null references ns_brains(id) on delete cascade
source_type text not null -- widget | telegram | fathom | slack | manual | future
source_identity_kind text not null -- visitor_id | telegram_chat_id | email | attendee | channel_user
source_identity_value text not null
contact_id uuid null references contacts(id) on delete set null
customer_entity_id uuid null references customer_entities(id) on delete set null
confidence numeric not null default 0.5
first_seen_at timestamptz not null default now()
last_seen_at timestamptz not null default now()
metadata jsonb not null default '{}'
unique (brain_id, source_type, source_identity_kind, source_identity_value)
```

### Avatar memberships

Add a mixed membership model instead of storing only `member_contact_ids`:

```sql
customer_avatar_members
  id uuid primary key
  avatar_id uuid not null references customer_avatars(id) on delete cascade
  member_kind text not null -- contact | customer_entity | source_identity
  member_id uuid not null
  strength numeric not null default 0.5
  evidence_memory_ids uuid[] not null default '{}'
```

Keep `customer_avatars.member_contact_ids` temporarily as a derived compatibility field.

## UX Plan To Reach Full Alignment

### Phase 1. Contract reset

Goal:

- Make the product contract explicit before code starts changing behavior.

Work:

- Update `.docs/plans/customer-brain.md`, `.docs/plans/customer-brain-cognition.md`, and `.docs/plans/customer-signal-loop.md`.
- Update Atlas checked-in skills.
- Update generated action docs and DB-backed `agent_skills`.

UX result:

- Agents and humans share one mental model: save valid customer signal now, attach identity when known.

### Phase 2. Identity graph and source identity storage

Goal:

- Give unknown customer signals a durable identity without creating fake contacts.

Work:

- Add `customer_entities`, `customer_source_identities`, and nullable memory links.
- Backfill existing 797 contact-linked memories into customer entities.
- Add uniqueness and indexes by brain/source identity.

UX result:

- Customer Brain can show account/person/source nodes.

### Phase 3. Write path alignment

Goal:

- All write paths accept contactless, source-anchored Customer Brain memories.

Work:

- Update `save_customer_memory`, `ingest_customer_brain_text`, `ingest_customer_brain_link`, and `atlas_save_brain_context`.
- Update legacy customer-brain branch or route it through the shared writer.
- Keep contact validation when contact is supplied.
- Add preflight validation for missing source anchors.

UX result:

- "No contact yet" becomes a supported state, not a failed action.

### Phase 4. Source ingestion alignment

Goal:

- Every valid customer source becomes either linked memory, unlinked memory, or review candidate.

Work:

- Let widget conversations with only `visitor_id` produce envelopes.
- Extend interaction participants with source identity fields.
- Update Atlas routing prompts to allow unlinked saves for customer-facing sources.
- Add route outcome tracking.

UX result:

- The user sees what was saved, what needs review, and what was rejected as non-customer/internal.

### Phase 5. Synthesis alignment

Goal:

- Pattern analysis and avatar synthesis use customer units, not only contacts.

Work:

- Replace contact filters with customer-unit logic.
- Update pattern-analysis output contract.
- Add mixed avatar membership.
- Keep compatibility projection for known contacts.

UX result:

- Avatars and beliefs emerge from the whole customer population, including anonymous and account-level signals.

### Phase 6. Cortex Max UX alignment

Goal:

- Make the Customer Brain visibly match the architecture.

Work:

- Add Customer Brain tabs: Collective, Avatars, Customers/Accounts, Unlinked Signals.
- Add entity detail pages and unlinked signal review.
- Add merge/attach actions.
- Add identity/provenance chips on memories and search results.

UX result:

- Customer Brain becomes a collective map plus drill-downs, not just avatar cards and contact-tagged memory.

### Phase 7. Verification and rollout

Goal:

- Prove the new architecture is live in code, DB, runtime skills, and production behavior.

Work:

- Add tests first for every changed contract.
- Run targeted package tests.
- Verify generated/runtime `vibey-api` docs.
- Verify production `agent_skills` after sync.
- Run production SQL checks after rollout.

UX result:

- There is no hidden contact gate left in the customer-memory path.

## Definition Of 100% Alignment

The architecture is aligned when all of these are true:

1. A valid customer-facing source with Customer Brain permission can create durable memory without a contact.
2. Known contacts are still attached and validated when available.
3. Unknown customer signals are stored with source identity and visible review state.
4. Unknown customer signals can contribute to beliefs, perspectives, and avatars.
5. Cortex Max shows collective intelligence, avatars, customer/account nodes, and unlinked signals.
6. Agents, generated docs, DB-backed skills, and checked-in skills all describe the same contract.
7. Production has nonzero contactless or source-identity Customer Brain memories after a real customer-facing anonymous source test.
8. Tests fail if a future change reintroduces `contact_id` as a Customer Brain write gate.

## Priority Order

P0:

- Update canonical docs and skills so future work stops reinforcing the old model.
- Add failing tests for contactless writes and anonymous widget ingestion.

P1:

- Add customer identity graph schema.
- Update write contracts and services.
- Update interaction envelope and sweeper.

P2:

- Update pattern analysis and avatar synthesis.
- Add Cortex Max unlinked signal and customer/account UX.

P3:

- Backfill, materialize DB-backed skills, verify production, and remove compatibility fields when usage is clean.

## Key Principle

Do not solve this by inventing contacts for unknown people. That would pollute CRM and make identity resolution worse. The durable product fix is: Customer Brain memory is allowed to be collective and unlinked; contact/account identity is attached when known and resolved later when it becomes knowable.
