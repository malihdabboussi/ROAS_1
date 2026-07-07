# Brain Integration — NeuralSnap Systems to Add

> Source: Full analysis of `apps/nexus/apps/neuralsnap` vs current Vibey brain implementation.
> Date: 2026-02-22

---

## Brain Architecture — Two Types of Brain

### User Brain (1 per user, free, included in every plan)

The user's personal brain. Central knowledge store for everything about the user and their business.

**Contains:**
- **Memories** — Raw knowledge auto-extracted from ALL agent conversations + meetings. Types: facts, decisions, insights, stories, frameworks, preferences, events. Emotional tagging (valence, intensity, speaker intent). Auto-connected to related memories.
- **Neural Snapshots** — Crystallized, structured knowledge (16-field format). Types: Belief, Model, Rule, Conviction, Principle. Come from crystallizing conversations, meeting transcripts (Fathom/Fireflies), or manual input.

**Limits:** Unlimited entries, all 6 search modes, no SK. No restrictions on the user brain.

**What it does NOT have:** Specific Knowledge ingestion. The user brain grows organically from conversations and meetings — it's reactive, not curated.

### Agent Brain ($10/mo each, add-on per agent)

A Specific Knowledge brain attached to ONE specific agent. Not shared between agents.

**Contains:**
- **SK Entries** — Structured knowledge units extracted from curated sources the user feeds it. Types: concept, framework, protocol, principle, technique, quote, case_study, definition. Each with mastery score, domain, complexity, prerequisites.

**Purpose:** The user ingests domain-specific sources (books, articles, frameworks, URLs) into an agent's brain. That agent becomes a domain expert.

**Examples:**
- Copywriter agent → ingest 20 copywriting books, Gary Halbert letters, best-performing emails → agent has deep copywriting expertise
- Sales agent → ingest sales playbooks, objection handling frameworks, industry pricing data → domain expert in sales
- Strategy agent → ingest business strategy books, market research, competitor analyses → strategic advisor

**Not shared.** Each agent gets its own brain. No sharing between agents.

### User Brain Access Toggle (per agent)

In the team page, each agent has a switch: **"Give access to my brain"**

- **ON** = Agent reads from its own SK brain + the user brain (knows your preferences, past decisions, brand voice, personal context)
- **OFF** = Agent reads from its own SK brain only (pure domain expertise, no personal context)

### Architecture Diagram

```
USER BRAIN (free, 1 per user)
  ├── Memories (auto-extracted from all conversations + meetings)
  ├── Neural Snapshots (crystallized knowledge)
  ├── Graph (connections between memories + snapshots)
  └── All 6 search modes, unlimited entries

AGENT BRAINS ($10/mo each)
  ├── Agent A Brain ──→ SK Entries (curated domain expertise)
  ├── Agent B Brain ──→ SK Entries (curated domain expertise)
  └── Agent C Brain ──→ SK Entries (curated domain expertise)

TOGGLE PER AGENT:
  Agent A: [ON]  reads own SK brain + user brain
  Agent B: [OFF] reads own SK brain only
  Agent C: [ON]  reads own SK brain + user brain
```

---

## Priority 1 — Specific Knowledge (SK) System

**What:** A system where users feed an agent's brain curated sources — books, articles, transcripts, URLs — and the brain extracts structured knowledge units with mastery tracking.

**Why:** Right now agents only have access to raw memories from conversations. That's reactive. SK is proactive — the user deliberately teaches an agent's brain. It tracks how well the brain "knows" something (mastery score) and what it doesn't know yet (gap detection). Knowledge decays if not used (spaced repetition).

**Value:** Agents become true domain experts. A copywriter agent with 20 ingested copywriting books will produce fundamentally better work than one relying only on its base model training.

**What's needed:**

- DB tables: `ns_sk_sources`, `ns_sk_entries`, `ns_sk_gaps`, `ns_sk_evolution`, `ns_sk_curriculum`
- Backend: SK ingestion service (text → Gemini extraction → embed → store), SK service (search, gap detection, mastery tracking, decay, curriculum, evolution, graph, stats)
- Controller: `/specific-knowledge` — ingest, search, sources, gaps, stats, graph, curriculum, mastery update, decay
- Entry types: concept, framework, protocol, principle, technique, quote, case_study, definition
- Complexity levels: foundational, intermediate, advanced, expert
- Mastery decay: -0.05 every 30 days if not recalled (cron)
- Gap detection: auto-creates gap when search returns 0 results
- Curriculum: group sources into learning paths, auto-track progress
- **Agent assignment:** Each SK brain is linked to a specific agent via `agent_id` on the brain record

**Reference:** `apps/nexus/apps/neuralsnap/apps/app-backend/src/modules/specific-knowledge/`

---

## Priority 2 — Multi-Mode Search

**What:** Instead of one search mode (semantic), give the brain 6 ways to find knowledge.

**Why:** Semantic search alone misses a lot. Complex questions need chain mode. Exploratory questions need graph traversal. Quick lookups need keyword mode.

**Value:** Search actually returns useful results for every type of question. Users and agents find what they need more often.

**Modes:**

1. **semantic** — Pure vector similarity (already have this)
2. **graph** — Seeds with semantic results, then traverses edges 2 hops deep with hop-decay scoring
3. **hybrid** — 70% semantic + 30% graph scores merged (DEFAULT mode)
4. **summary** — Full-text search (FTS), no AI, fast for exact keyword lookups
5. **chain** — Decomposes complex queries into 2-3 sub-questions via Gemini, runs parallel searches, boosts snapshots appearing in multiple sub-results
6. **auto** — Gemini picks the best mode based on query analysis

**Applies to:** Both user brain and agent brains. All 6 modes available on all plans (including free).

**What's needed:**

- DB functions: `search_snapshots_fts` (FTS), `traverse_edges` (graph traversal RPC)
- Backend: Search service with mode dispatcher, per-mode implementations
- Controller: `/search` with `mode` parameter
- Deduplication logic (keep highest score per snapshot)
- Result merging for hybrid mode

**Reference:** `apps/nexus/apps/neuralsnap/apps/app-backend/src/modules/search/services/search.service.ts`

---

## Priority 3 — Cron Jobs (Edge Backfill + Validate)

**What:** Background jobs that: (a) find snapshots that should be connected but aren't, create edges via AI; (b) validate old auto-generated edges and prune bad ones.

**Why:** Without this, the knowledge graph only grows connections when new memories are stored. Most snapshots sit isolated. The brain needs to self-organize — like synaptic pruning during sleep.

**Value:** The knowledge graph becomes self-organizing. Connections grow richer over time without user effort. Bad connections get cleaned up automatically.

**What's needed:**

- **Backfill Edges Cron:**
  - Find brains with >1 snapshot, get snapshots with embeddings
  - For each snapshot, find similar ones via vector search (min similarity 0.7)
  - Ask Gemini to classify the relationship type + strength
  - Insert edge with `auto_generated: true`
  - Resume-safe via cursor in `ns_kv` table
  - Max 5 brains per run, max 20 Gemini calls per brain

- **Validate Edges Cron:**
  - Find auto-generated edges older than 30 days with no user interaction
  - Ask Gemini: "Are these two snapshots still meaningfully related?"
  - If not valid: reduce strength by 0.1, delete if below 0.2
  - If valid with different strength: update
  - Max 10 edges per run

- **Suggest Connections Cron:**
  - Find brains with >5 snapshots
  - Random sample, vector similarity, exclude existing edges
  - Return unlinked pairs as suggestions (min similarity 0.7)

- DB table: `ns_kv` (key-value for cron state)
- Controller: `/cron` with guard (cron secret auth)

**Reference:** `apps/nexus/apps/neuralsnap/apps/app-backend/src/modules/cron/`

---

## Priority 4 — Pending Captures (Review Queue)

**What:** When agents capture knowledge from conversations, it goes to a "pending" queue. Users review, accept, or reject. Auto-accepts after a timer (e.g., 24h).

**Why:** Right now agents write directly to the user brain with no oversight. Users don't know what's being stored or if it's accurate.

**Value:** Trust. Users trust the brain because nothing gets in without their approval (or at least their window to reject).

**What's needed:**

- DB table: `ns_pending_captures` (brain_id, profile_id, snapshots JSONB, embeddings, agent_id, session_id, context, source_type, status, auto_accept_at, tokens_used, reviewed_at)
- Backend: Pending service (list, accept, reject)
- Cron: Auto-accept pending captures past `auto_accept_at`
- Agent integration: Agents submit to pending instead of direct save to user brain
- Frontend: Review queue UI (list pending, preview snapshots, accept/reject buttons)

**Reference:** `apps/nexus/apps/neuralsnap/apps/app-backend/src/modules/v1/services/v1-pending.service.ts`

---

## Priority 5 — Agent Brains + Add-On Billing

**What:** Users can purchase a brain ($10/mo) for any agent in their team. The brain holds Specific Knowledge for that agent's domain.

**Why:** This is the core monetization of the brain system. Agents with curated SK brains are dramatically better at their jobs. Users will pay to make their agents smarter.

**Value:** Recurring add-on revenue at ~85% margin. Makes agents stickier. Natural expansion as users add more agents.

**What's needed:**

- Backend: Agent brain service (create, delete, list, assign to agent)
- Stripe: "Agent Brain" add-on product ($10/mo recurring), subscription item per brain, proration on mid-cycle add/remove
- Frontend: In team page, per-agent "Add a brain" button + "Give access to my brain" toggle
- DB: `brains` table needs `agent_id` column (nullable — null = user brain, set = agent brain)
- Enforce: Free plan cannot add agent brains. Paid plans can add unlimited at $10/mo each.
- Credit margin: brain operations at 2x (not 4x) to encourage usage

**Reference:** `apps/nexus/apps/neuralsnap/apps/app-backend/src/modules/spaces/`

---

## Priority 6 — Search Feedback

**What:** Thumbs up/down on search results. Brain aggregates into per-snapshot boost scores for future re-ranking.

**Why:** Search quality improves with use. Frequently useful snapshots rank higher.

**Value:** Personalized search that gets better the more you use it.

**What's needed:**

- DB table: `ns_search_feedback` (profile_id, query, snapshot_id, rating, search_mode, position, comment)
- Backend: Feedback service (submit, list, aggregate boosts)
- Controller: `/search/feedback`
- Integration: Search service uses boost scores to re-rank results

**Reference:** `apps/nexus/apps/neuralsnap/apps/app-backend/src/modules/search/services/feedback.service.ts`

---

## Priority 7 — Meeting Sync (Cron)

**What:** Background job that polls Fathom/Fireflies for new meetings, auto-crystallizes transcripts into Neural Snapshots in the user brain.

**Why:** Right now meeting knowledge only enters the brain if someone manually triggers it. Most meetings get forgotten.

**Value:** Zero-effort knowledge capture. Every meeting gets distilled into the user brain automatically.

**What's needed:**

- Cron: Sync meetings service — fetch active connections, get new meetings, crystallize, save to user brain
- DB table: `ns_meeting_imports` (profile_id, connection_id, provider, external_id, title, meeting_date, duration, participants, status, snapshot_count, tokens_used, raw_text_length, error_message)
- Token refresh for Fathom OAuth
- Max 3 meetings per sync to avoid timeouts
- Track imports to prevent duplicates

**Reference:** `apps/nexus/apps/neuralsnap/apps/app-backend/src/modules/cron/services/cron-sync.service.ts`

---

## Priority 8 — Usage Tracking

**What:** Track every brain AI operation — tokens used, model, operation type, per-user.

**Why:** Needed for billing, spending caps, and cost visibility.

**Value:** Enables fair billing. Lets users see their usage. Prevents accidental API credit burn.

**What's needed:**

- Brain operations log into existing `ai_usage_events` table with `feature: 'brain'`
- `action` values: 'memory_store', 'crystallize', 'sk_ingest', 'search_chain', 'search_auto'
- `provider`: 'google' (Gemini)
- `BRAIN_MARGIN = 2` in credits service
- Credits deducted from same pool (base → rollover → purchased)
- Frontend: Usage sidebar/stats showing brain operations separately

**Reference:** Usage inserts throughout all NeuralSnap services

---

## Lower Priority — Nice to Have

### Edges CRUD Module

- Dedicated controller for create, update, delete, query edges
- `auto_generated` flag
- Currently edges are managed inline in graph/snapshot services

### Jobs System

- DB table: `ns_jobs` — async job tracking for long-running operations
- Job status monitoring (queued, processing, completed, failed)

### Structured Error Logging

- DB table: `ns_errors` — structured error records with feature codes
- Dedicated errors controller

### Notifications (Frontend)

- NotificationBell + NotificationPanel components
- In-app notifications for captures, sync events, etc.

### Spending Caps (Billing)

- SpendingCapModal, UsageSidebar, UsageBar components
- Users set spending limits

### V1 Public REST API

- Separate API key authentication
- Public endpoints: ingest, crystallize, pending, snapshots, profile
- CORS middleware
- DB tables: `ns_api_keys`, `ns_api_usage`

---

## Pricing Strategy — Supabase Add-On Model

> Model: Like Supabase — base plan includes the user brain, add-ons for agent brains.

### Core Principle

- **User brain:** Free, included in every plan. Unlimited entries, all search modes, no SK.
- **Agent brains:** $10/agent/month add-on. Contains SK only. Prorated mid-cycle.
- **Brain operations:** 2x margin on credits (not 4x like chat) to encourage heavy usage.

### Why This Model

- An agent brain costs ~$0 in infrastructure (it's a DB row). The $10/mo is nearly pure margin.
- Users who want to make 3-4 agents domain experts = $30-40/mo in add-on revenue on top of their plan.
- Lower credit margin (2x vs 4x) makes brain operations feel cheap — users ingest more sources, agents get smarter, platform gets stickier.
- Same model Supabase uses: base plan + $10/project, $10/custom domain, etc.

### Plan Tiers

| Feature | Free | Basic ($20) | Pro ($40) | Ultra ($200) |
|---------|------|-------------|-----------|--------------|
| User Brain | No | 1 (unlimited entries, all search modes) | 1 (same) | 1 (same) |
| Agent Brains | — | $10/agent/mo | $10/agent/mo | $10/agent/mo |
| User Brain Access toggle | — | Yes | Yes | Yes |
| Pending capture queue | — | Yes | Yes | Yes |
| Cron jobs (auto-sync, backfill) | — | Yes | Yes | Yes |
| Search feedback | — | Yes | Yes | Yes |
| Meeting sync connections | — | 1 | 3 | Unlimited |

### Credit Cost Per Brain Operation (2x margin)

Brain uses Gemini (much cheaper than Claude). At 2x margin with 200 credits/$1:

| Operation | API cost | Credits charged (2x) |
|-----------|----------|---------------------|
| Store memory (embed + emotional tag + connections) | ~$0.001 | ~0.4 credits |
| Crystallize transcript (3-4 phases + embeds) | ~$0.005 | ~2 credits |
| SK ingest source (extraction + domain + embeds) | ~$0.01 | ~4 credits |
| Search — semantic/summary/graph/hybrid | ~$0.00001 | 0 credits (free) |
| Search — chain/auto (uses Gemini) | ~$0.001 | ~0.4 credits |
| Edge backfill/validate (cron, system cost) | ~$0.0005 | 0 credits (system) |

### Revenue Math

**Scenario: Pro user ($40/mo) with 3 agent brains**
- Plan: $40/mo
- 3 agent brains: $30/mo
- Total: **$70/mo** (75% revenue increase from add-ons)
- Brain operations cost you ~$3-5/mo in API
- Net margin on brain add-ons: **~85%**

**Scenario: Ultra user ($200/mo) with 6 agent brains**
- Plan: $200/mo
- 6 agent brains: $60/mo
- Total: **$260/mo**
- Brain API cost: ~$10-15/mo
- Net margin on brain add-ons: **~80%**

---

## Stripe Implementation — Detailed

### Current Billing Infrastructure

**DB Tables (already exist):**
- `subscription_plans` — has `stripe_price_id` + `stripe_test_price_id`, `max_brain_entries`
- `user_subscriptions` — tracks `stripe_customer_id`, `stripe_subscription_id`, `plan_id`, `status`, periods
- `ai_usage_events` — tracks per-operation: tokens, cost, credits charged, model, provider, feature, action, `cost_source`
- `monthly_credit_usage` — monthly aggregates: base/rollover/purchased credits used
- `credit_purchases` — one-time credit top-ups
- `credit_packs` — has `stripe_price_id` + `stripe_test_price_id`
- `brains` — exists but no `agent_id` or billing columns yet

**Existing Stripe accounts:**
- **LIVE:** Products under `AmY2Dy43Cs` account (prod_Txuu...)
- **TEST:** Products under `I08CkoZlhA` account (prod_Txv...)

**Current Credits Service:**
- `TEXT_MARGIN = 4`, `IMAGE_MARGIN = 3`, `CREDITS_PER_DOLLAR = 200`
- Deduction priority: base → rollover → purchased
- Calculation: `credits = ceil(apiCost * margin * CREDITS_PER_DOLLAR)`

**Webhook events handled:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `payment_intent.succeeded`

**GAP:** No support for adding subscription items (add-ons) to existing subscriptions. Current code only replaces items (for plan switching).

### Step 1: Create Stripe Products (BOTH Live + Test)

**Product: "Agent Brain"**
- Name: `Agent Brain`
- Price: $10/month, recurring
- Metadata: `{ type: "agent_brain_addon" }`
- Create in BOTH accounts:
  - **TEST:** Create product + price via Stripe dashboard/API on test account
  - **LIVE:** Create product + price via Stripe dashboard/API on live account

**After creation, store in DB:**

```sql
CREATE TABLE addon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price_amount integer NOT NULL,
  interval text NOT NULL DEFAULT 'month',
  stripe_price_id text,
  stripe_test_price_id text,
  stripe_product_id text,
  stripe_test_product_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO addon_products (slug, name, price_amount, stripe_price_id, stripe_test_price_id)
VALUES ('agent-brain', 'Agent Brain', 1000, '<LIVE_PRICE_ID>', '<TEST_PRICE_ID>');
```

### Step 2: Track Agent Brain Add-Ons Per User

```sql
CREATE TABLE user_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  addon_slug text NOT NULL,
  stripe_subscription_item_id text,
  brain_id uuid REFERENCES brains(id),
  agent_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  canceled_at timestamptz
);

-- Add agent_id to brains table (null = user brain, set = agent brain)
ALTER TABLE brains ADD COLUMN agent_id text;
-- Add user_brain_access toggle to agent configs
ALTER TABLE agent_configs ADD COLUMN user_brain_access boolean DEFAULT false;
```

### Step 3: Stripe Add-On Flow (How Mid-Month Works)

**When user adds a brain to an agent:**

1. **Check:** User must be on a paid plan (Basic+). Free plan cannot add agent brains.
2. **Add subscription item to existing subscription:**

```typescript
const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

const updatedSub = await stripe.subscriptions.update(stripeSubscriptionId, {
  items: [
    ...subscription.items.data.map(item => ({ id: item.id })),
    { price: agentBrainPriceId, quantity: 1 },
  ],
  proration_behavior: 'always_invoice',
});
```

3. **Proration (mid-month):**
   - Stripe automatically calculates the prorated amount
   - Example: User adds brain on day 15 of 30-day cycle → charged $5 immediately
   - Next billing cycle: full $10/mo added to their recurring invoice
   - This is exactly how Supabase does it

4. **Record in DB:**
   - Create brain in `brains` table with `agent_id` set
   - Insert into `user_addons` with `stripe_subscription_item_id` + `agent_id`

**When user removes a brain from an agent:**

```typescript
await stripe.subscriptionItems.del(stripeSubscriptionItemId, {
  proration_behavior: 'always_invoice',
});
```

### Step 4: Webhook Handling (New Events)

Add to existing webhook handler:

```typescript
case 'customer.subscription.updated':
  // EXISTING: update plan/periods
  // NEW: sync add-on items — count agent brain items, update user_addons table

case 'invoice.paid':
  // NEW: confirm add-on charges went through

case 'customer.subscription.deleted':
  // EXISTING: cancel subscription
  // NEW: cancel all agent brain add-ons, freeze agent brains (read-only, no new ingestion)
```

### Step 5: Brain Credits (2x Margin)

Add `BRAIN_MARGIN = 2` to credits service alongside `TEXT_MARGIN = 4`:

```typescript
const BRAIN_MARGIN = 2;

calculateBrainCredits(apiCost: number): number {
  return Math.ceil(apiCost * BRAIN_MARGIN * CREDITS_PER_DOLLAR);
}
```

**Integration with `ai_usage_events`:**
- Brain operations use `feature: 'brain'` in ai_usage_events
- `action`: 'memory_store', 'crystallize', 'sk_ingest', 'search_chain', 'search_auto'
- `provider`: 'google' (Gemini)
- Credits deducted from same pool (base → rollover → purchased)

### Existing Stripe IDs Reference

**LIVE Account (AmY2Dy43Cs):**
| Product | Price ID |
|---------|----------|
| Basic Monthly | `price_1Szz4qAmY2Dy43Cs6v32h5gq` |
| Basic Annual | `price_1Szz4qAmY2Dy43CsT5lbIoea` |
| Pro Monthly | `price_1Szz4wAmY2Dy43Cs7Kj8iz6K` |
| Pro Annual | `price_1Szz4wAmY2Dy43Csr6FRiu71` |
| Ultra Monthly | `price_1Szz53AmY2Dy43Cs5Kxg5Wj4` |
| Ultra Annual | `price_1Szz53AmY2Dy43CsvJPKN9zs` |
| Agent Brain Add-On | **TODO: CREATE** |

**TEST Account (I08CkoZlhA):**
| Product | Price ID |
|---------|----------|
| Basic Monthly | `price_1SzzQUI08CkoZlhAOrByO0AS` |
| Basic Annual | `price_1SzzQVI08CkoZlhAfFkQXvxZ` |
| Pro Monthly | `price_1SzzQVI08CkoZlhATTwT9c18` |
| Pro Annual | `price_1SzzQVI08CkoZlhA6vkAkawx` |
| Ultra Monthly | `price_1SzzQWI08CkoZlhAja95QPhn` |
| Ultra Annual | `price_1SzzQWI08CkoZlhAn0Nfbra6` |
| Agent Brain Add-On | **TODO: CREATE** |

---

## DB Consolidation — Move Brain to Vibey Supabase

### Decision

Consolidate all brain data into Vibey's Supabase (`qfrvykscoymiwwgysvsr`). Stop using the separate NeuralSnap Supabase instance. No data migration — fresh schema only.

### Why

- One DB = one auth system. Users already exist in Vibey. RLS works with `auth.uid()` out of the box. Zero user sync.
- FKs work natively — `user_addons.brain_id` → `ns_brains(id)` directly.
- No cross-DB problems. No JWT signing hacks. No separate service keys.
- Vibey already has `pgvector` extension enabled.
- Simpler codebase — one Supabase client, no `NEURALSNAP_*` env vars.

### Step 1: Create `ns_*` Tables in Vibey DB

Copy schema definitions from NeuralSnap (all 25 `ns_*` tables) into a Vibey migration. Keep `ns_` prefix. Tables:

- `ns_profiles`, `ns_brains`
- `ns_memories`, `ns_memory_connections`, `ns_memory_sessions`, `ns_memory_versions`
- `ns_snapshots`, `ns_snapshot_edges`
- `ns_sk_sources`, `ns_sk_entries`, `ns_sk_gaps`, `ns_sk_evolution`, `ns_sk_curriculum`
- `ns_emotional_responses`, `ns_belief_patterns`, `ns_perspectives`
- `ns_pending_captures`, `ns_meeting_imports`
- `ns_connections`, `ns_content_hashes`
- `ns_search_feedback`, `ns_usage`, `ns_errors`, `ns_jobs`, `ns_api_usage`

Also copy RPC functions: `search_ns_memories`, `find_similar_snapshots`, `traverse_edges`, `search_snapshots_fts`, `search_sk_entries`.

**No data migration.** Fresh start. NeuralSnap DB data is dev/test only.

### Step 2: Add RLS Policies

```sql
CREATE POLICY "own_brains" ON ns_brains
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "own_memories" ON ns_memories
  FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

CREATE POLICY "own_snapshots" ON ns_snapshots
  FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

CREATE POLICY "own_sk_entries" ON ns_sk_entries
  FOR ALL USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- Same pattern for all ns_* tables that reference brain_id
```

### Step 3: Update Backend

- Delete `neuralsnap-client.factory.ts` from `apps/api` and `apps/agent-api`
- Brain services use the existing Vibey Supabase client
- `apps/api`: user JWT → RLS enforced automatically
- `apps/agent-api`: service role with strict `brain_id` filtering (internal, not user-facing)
- Cron jobs: service role for cross-user operations

### Step 4: Clean Up Env Files

Remove from `apps/api/.env`, `apps/agent-api/.env`, `.env.example`:

```bash
# REMOVE these:
NEURALSNAP_SUPABASE_URL
NEURALSNAP_SUPABASE_SERVICE_KEY
BRAIN_AGENT_TOKEN
BRAIN_AGENT_USER_ID
```

No new env vars needed. Brain uses existing `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

### Step 5: Remove Legacy Brain Tables

After `ns_*` tables are in place and verified, drop the old legacy tables: `brains`, `snapshots`, `memories`, `memory_connections`, `memory_sessions`, `memory_versions`, `brain_connections`, `brain_emotional_responses`, `brain_belief_patterns`, `brain_perspectives`, `neural_snapshots`.

---

## Corrections From Discussion

### Free Plan — No User Brain

Free plan does **not** get a user brain. The brain is a paid feature (Basic+). Free users can chat with agents but no knowledge is captured or stored.

### Memory Capture — User Conversations Only

Memories are auto-extracted **only from direct user conversations** with agents. NOT from background work/mission agents running autonomously. If there's no user in the conversation, nothing goes to the brain.

### Agent Brain Cancellation — Lock Out

When subscription is canceled or agent brain add-on is removed, the agent **loses access entirely**. No read-only mode. Brain data kept for 14 days (grace period), then deleted. User notified about the 14-day window.

### Agent Deletion — 14-Day Grace Then Delete

When a user deletes an agent that has a brain:
1. Cancel Stripe add-on immediately (prorated credit)
2. Mark brain as `pending_deletion`
3. Agent loses access immediately
4. After 14 days, delete all brain data (SK entries, sources, gaps, evolution)
5. Notify user about the 14-day window at deletion time

---

## Implementation Order

1. **DB Consolidation** — Create `ns_*` tables in Vibey DB, add RLS policies, update backend to use Vibey Supabase client, remove NeuralSnap env vars, drop legacy tables. **Foundation — do first.**
2. **SK System** — Backend + DB first, frontend later
3. **Multi-Mode Search** — Backend + DB functions
4. **Cron Jobs** — Edge backfill + validate + suggest
5. **Pending Captures** — Backend + agent integration + frontend
6. **Agent Brains + Billing** — Backend + Stripe add-on (create products in BOTH live + test) + subscription item support + team page UI (per-agent "Add brain" + "User brain access" toggle)
7. **Search Feedback** — Backend + frontend integration
8. **Meeting Sync** — Cron + connection integration
