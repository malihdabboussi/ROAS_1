# Customer Signal Loop — Telegram/Widget/Fathom → Customer Brain (Outcome-driven TDD)

## Context

PT DOM's customer brain is enabled but empty: Telegram (139 convos) and widget (~66 convos) chats have **no ingestion path** to the brain, and the Fathom→customer-brain route was failing (contact constraint bug — already fixed). Agreed architecture: every channel produces a normalized **interaction envelope**; one shared loop (outbox → route → extract → ns_memories → synthesis) consumes it. Trigger policy locked: **per-org token accumulator, flush at 50k tokens or daily at midnight**, per-conversation envelopes, cursor-based idempotency. Scope: phases 1+2+3 (incl. Fathom migration + legacy removal), strictly TDD, ending with a production-like smoke test on the YC Demo account (Foundry Creative / yc-demo@vibey.im) covering all three channels. Also: port the `plan-creator` skill to Claude Code skills.

---

## STEP 1 — Define the outcomes (the contract of "done")

These are the observable end states we are building toward. Every one maps to a test written in Step 2 **before any implementation code**. The feature is done when ALL outcome tests pass.

| # | Outcome (observable end state) | Proven by |
|---|---|---|
| O1 | A telegram conversation with unprocessed messages, in an org with an enabled customer brain (`cortex_max=true`), produces after a flush: ≥1 `ns_memories` row with `source_type='telegram_chat'`, `contact_id` set (resolved via `telegram_chat_id` identifier), `brain_id` = that customer brain | Smoke T1 + sweeper/extraction unit tests |
| O2 | Same for a widget conversation with captured email or only `visitor_id` → `source_type='widget_chat'`. Known contacts set `contact_id`; unknown visitors save with `customer_source_identity_id` / `customer_resolution_status='unlinked_source'`. | Smoke T2 + envelope unit tests |
| O3 | A Fathom webhook produces memories through the SAME envelope pipeline (`source_type='fathom_call'`), and the legacy `customer_call_route` code no longer exists in the repo | Smoke T3 + adapter tests + grep gate |
| O4 | **50k gate**: when an org's accumulated unprocessed tokens (across all its chat conversations) reach the threshold, a flush fires mid-day. Below threshold, same UTC day → nothing happens | Sweeper contract tests |
| O5 | **Daily gate**: at UTC midnight, any org with >0 unprocessed tokens gets flushed, even far below 50k | Sweeper contract tests |
| O6 | **Idempotency**: running the sweep twice over the same messages produces zero duplicate outbox rows and zero duplicate memories (cursor + dedupe_key + content_hash) | Sweeper + extraction tests + smoke re-run assertion |
| O7 | **Cost paths**: a single-known-contact chat is processed WITHOUT an Atlas agentic run (one Gemini extraction call); a multi-participant/ambiguous interaction goes through Atlas routing | Route-handler tests (assert `callOpenClawRaw` not/called) |
| O8 | **Quality gate**: only extracted items with significance ≥ 0.6 are saved; trivial-content conversations produce zero memories without erroring | Extraction tests |
| O9 | A conversation in a scope with NO enabled customer brain is left untouched (cursor not advanced), so enabling the brain later ingests the backlog | Sweeper contract tests |
| O10 | Memories written by this loop feed the existing synthesis chain (customer memory counter bumps → avatar pass enqueue at threshold), same as Fathom memories do today | Route-handler tests (counter bump asserted) |

**Out of scope (explicitly):** org-local timezones (UTC midnight only — no org timezone column exists), credit billing for worker-side Gemini calls (worker has no CreditsService; existing worker Gemini embedding calls are also unbilled — flagged product decision), backfill of historical conversations (separate decision).

---

## STEP 2 — Write ALL outcome tests first (RED)

Written and committed **before implementation**; all fail initially. The smoke script is the top-level outcome test and is also written now.

### 2a. End-to-end outcome test (the definition of done)
`scripts/smoke/customer-signal-loop-smoke.ts` + root script `"smoke:customer-signal"` (pattern: `scripts/smoke/runtime-queue-mixed-smoke.ts` — env-driven, poll/timeout, non-zero exit):
- Pre: `pnpm seed:yc-demo` (with `--enable-integrations`); api + agent-api + mission-worker running with `CUSTOMER_SIGNAL_SWEEP_MS=10000 CUSTOMER_SIGNAL_FLUSH_TOKENS=500 CUSTOMER_SIGNAL_GRACE_MINUTES=0`.
- **T1 (O1)**: seed telegram contact + `contact_identifiers(kind='telegram_chat_id')` + conversation (`metadata {telegram_chat_id, source:'telegram'}`, `contact_id`) + ~10 meaningful messages (service-role, mirroring `telegram.service.ts:1363-1380` writes) → poll outbox dedupe key to `done` → assert `ns_memories` row: `source_type='telegram_chat'`, `contact_id` set, demo brain id.
- **T2 (O2)**: widget conversation `metadata {public:true, visitor_id, visitor_email}` + messages → same assertions with `widget_chat` and linked contact when email resolves. Plus source-backed case: widget conversation with `visitor_id` and no email creates a source-anchored Customer Brain memory instead of being skipped.
- **T3 (O3)**: POST Fathom fixture event (transcript + `calendar_invitees` + `recorded_by.email` = demo user; fixture shape from `fathom.controller.test.ts:56-93`) to `/integrations/fathom/webhook` (ensure demo `user_integrations` fathom row exists; create via service role if absent) → assert memory with `source_type='fathom_call'`.
- **T6 (O6)**: after T1 passes, trigger a second sweep cycle → assert memory count unchanged.
- `--keep` flag skips cleanup; non-zero exit on any failure.

### 2b. Unit/contract tests (vitest, mission-worker + api)
All follow existing patterns: mock supabase chains (`company-cortex-formation-scheduler.contract.test.ts`), processor with `vi.fn()` deps (`brain-ops.customer-call-route.actions.test.ts`), mocked `global.fetch` for Gemini.

1. `apps/mission-worker/src/modules/brain-ops/customer-interaction-envelope.test.ts` (O1, O2):
   - `buildTelegramEnvelope`: telegram_chat_id identifier, `Customer:`/`Assistant:` transcript from `role`, system/tool excluded, window from first/last `created_at`.
   - `buildWidgetEnvelope`: email identifier from `visitor_email ?? extracted_email`; if email is absent, use `visitor_id` as the durable source identity; if both are absent, preserve the source envelope and let the downstream source id act as the anchor.
   - `estimateEnvelopeTokens` (delegates to `countTextTokens`), `buildInteractionDedupeKey` = `interaction-{brainId}-{convId}-{lastMsgId}`, `parseInteractionEnvelope` accept/reject (wrong `v`, missing channel, bad participants).
2. `apps/mission-worker/src/modules/brain-ops/customer-signal-sweeper.contract.test.ts` (O4, O5, O6, O9):
   - Below 50k + same UTC day → zero outbox inserts, cursors untouched (O4 negative).
   - ≥ threshold → one outbox row **per conversation per enabled customer brain**, `event_type='customer_interaction_route'`, `user_id = brain.owner_id` (required by `assertBrainJobScope`, processor:413-439), correct dedupe_key, payload `{envelope}` parseable; cursor advanced to last message (O4 positive).
   - Tokens below threshold but oldest unprocessed message on previous UTC day → flush (O5).
   - 30-min grace: conversation with a message < 30 min old skipped while siblings flush.
   - Dedupe collision (existing dedupe_key) → no error, cursor still advanced (O6).
   - No enabled brain in scope → nothing emitted, cursor NOT advanced (O9).
   - `sweepInFlight` guard: concurrent run no-ops.
3. `apps/mission-worker/src/modules/brain-ops/customer-interaction-extraction.service.test.ts` (O8, O6, O1-shape):
   - Significance ≥0.6 gate; items below dropped; all-below → `{memories_created: 0}`, no error.
   - Insert shape mirrors the Customer Brain contract: `brain_id, contact_id` when known, `customer_entity_id`, `customer_source_identity_id`, `customer_resolution_status`, `content_hash` sha256, `source_type 'telegram_chat'|'widget_chat'`, `source_id`, tags incl `'customer_brain'`, `agent_id:'atlas'`, `metadata.user_id`.
   - `content_hash` duplicate exists → skip (O6); invalid Gemini JSON → error result, no throw; `memory_type` coerced into `CUSTOMER_MEMORY_TYPES`; missing `GEMINI_API_KEY` → clean error.
4. `apps/mission-worker/src/modules/brain-ops/brain-ops.customer-interaction-route.actions.test.ts` (O7, O10):
   - Cheap path: exactly one `role:'customer'` participant with contact or durable source identifier → extraction service called with `contact_id` when resolvable, otherwise `contact_id:null` plus source identity; **`callOpenClawRaw` NOT called**; `bumpCustomerMemoryCounterAndMaybeEnqueue` called (O10); outbox done.
   - Atlas path: 2+ participants → `callOpenClawRaw` called, prompt contains allowed contacts + transcript; `save_customer_memory` failures throw.
   - Invalid envelope → `markOutboxFailed`; empty transcript → done with `skipped`; scope assertion enforced. Port the generic scope-mismatch/action-failure cases from the legacy customer-call-route test here.
5. `apps/api/src/modules/integrations/fathom/services/__tests__/fathom-envelope.adapter.test.ts` (O3): event → envelope (host = `role:'team'` via recorded_by/aliases, attendees `kind:'email'`, transcript join, title/started_at fallbacks, no transcript → null).
6. Extend `apps/api/src/modules/integrations/fathom/controllers/__tests__/fathom.controller.test.ts` (O3): outbox upserts now `customer_interaction_route` with envelope payload; no-transcript → no rows.

**Gate: all of the above written, reviewed against the outcome table, failing for the right reason (missing implementation, not test bugs) before Step 3 begins.**

---

## STEP 3 — Implement until green

### Phase 0 — Port plan-creator skill (standalone, no tests)
Copy `.cursor/skills/plan-creator/SKILL.md` → `.claude/skills/plan-creator/SKILL.md`; make description slightly pushier for triggering (implementation plan, feature plan, build plan, meticulous plan) per skill-creator guidance. No eval loop — port of a proven skill.

### Phase 1 — Contract + cursor + sweeper (makes tests 1, 2 green)
1. Migration `supabase/migrations/2026MMDDHHMMSS_customer_signal_cursor.sql` (sort after `20260611130000`): `conversations.last_extracted_message_id uuid` + `last_extracted_message_at timestamptz` (precedent: `20260217073229` summary columns); composite index `idx_messages_conversation_created (conversation_id, created_at)` (only single-column exists). `brain_ops_outbox.event_type` is unconstrained text — no outbox migration.
2. `packages/api-shared/src/types/customer-interaction.ts` (+ index export): `InteractionEnvelopeV1` (`v:1, channel:'telegram'|'widget'|'fathom', source_id, title, window{from,to}, participants[{role:'customer'|'team'|'unknown', name, identifiers[{kind,value}]}], content{format:'transcript', text, message_count}`), `CUSTOMER_INTERACTION_ROUTE_EVENT`, `parseInteractionEnvelope`, `buildInteractionDedupeKey`. Dependency-free guard. (api-shared is the only package both apps/api and mission-worker depend on — verified.)
3. `apps/mission-worker/src/modules/brain-ops/customer-interaction-envelope.ts`: pure adapters (`buildTelegramEnvelope`, `buildWidgetEnvelope`, `estimateEnvelopeTokens`). Add `"@vibey/context-breakdown": "workspace:*"` to mission-worker package.json.
4. `customer-signal-sweeper.service.ts` (template: `brain-ops-night-janitor.service.ts` — setInterval, `sweepInFlight`, onModuleInit/Destroy):
   - Accumulator SQL grouped by scope (`org_id ?? 'personal:'+user_id`): `SUM(CEIL(LENGTH(content)/4.0))` over `user|assistant` messages newer than cursor, in conversations with `metadata ? 'telegram_chat_id'` OR (`metadata->>'public'='true'` AND visitor/extracted email present). pgQuery fast path + Supabase fallback (dispatcher pattern).
   - Flush when tokens ≥ `brainOps.customerSignalFlushTokens` OR oldest unprocessed < UTC midnight today.
   - Per conversation: load unprocessed messages (cap 500), skip if newest < graceMinutes, build envelope, resolve brains (`ns_brains scope='customer' AND cortex_max=true`, org or personal match), dedupe-check-then-insert outbox rows, THEN advance cursor (crash re-emits same dedupe_key → idempotent).
   - Config (`apps/mission-worker/src/config/configuration.ts`, `brainOps` namespace): `customerSignalSweepMs` (env `CUSTOMER_SIGNAL_SWEEP_MS`, default 900000, `<=0` disables), `customerSignalFlushTokens` (50000), `customerSignalGraceMinutes` (30).
5. `brain-ops/types.ts`: add `'customer_interaction_route'` (keep legacy until Phase 3). Register sweeper in `brain-ops.module.ts`.

### Phase 2 — Route handler + cheap extraction (makes tests 3, 4 green; ships WITH Phase 1)
1. `customer-interaction-extraction.service.ts`: prompt ported from `conversation-processing.service.ts:298-343` reframed for customer signal; direct Gemini `gemini-3.5-flash:generateContent` fetch (pattern `embedding.service.ts:189-214`; worker already direct-fetches Gemini for embeddings in `company-cortex-formation.service.ts:276-300`); optional 768-dim embedding; select-before-insert content_hash dedupe. Register in module; inject into processor (update the 2 existing processor tests' constructor mocks).
2. `brain-ops.processor.ts`: switch arm + `processCustomerInteractionRoute` (parse envelope; cheap iff exactly one customer participant with contact-resolvable identifier, else Atlas via new `buildInteractionRoutingBundle` — generalization of `buildRoutingInputBundle:1523-1633` — and channel-parameterized `buildRoutingPrompt`; reuse `summarizeCustomerMemoryActions` + `bumpCustomerMemoryCounterAndMaybeEnqueue` unchanged).
3. Generalize + **replace** `resolveOrCreateContactByEmail` → `resolveOrCreateContactByIdentifier({kind, value, email?, name?, channel})`: `(kind,value)` identifier lookup; legacy email-column fallback only for `kind='email'`; creation sets `contact_source_detail` = channel. Delete old function same change (single caller at processor:1591 — verified).

### Phase 3 — Fathom on the envelope + legacy removal (makes tests 5, 6 + smoke T3 green)
1. `apps/api/src/modules/integrations/fathom/services/fathom-envelope.adapter.ts`: pure `buildFathomEnvelope(event, meetingId)` — transcript/attendee/title extraction moves here from worker.
2. `fathom.controller.ts` `enqueueCustomerBrainRoute` (409-452): emit `customer_interaction_route` envelopes; stop shipping raw event.
3. Dead code removal — **gated on outbox drain** (`customer_call_route` pending/processing = 0 after API switch live): delete from processor `processCustomerCallRoute`, `extractTranscript`, `extractMeetingTitle`, `extractMeetingStartedAt`, `extractAttendees`, `buildRoutingInputBundle`, Fathom branches of `buildRoutingPrompt`, `FathomAttendee`, switch arm; remove `'customer_call_route'` from types union; delete legacy actions test (generic cases ported in Step 2b.4). Changelog entry listing removals (CLAUDE.md §0.5/§5). Verify via grep: zero references to `customer_call_route` outside migrations/changelogs (O3).

---

## STEP 4 — Verify outcomes (GREEN)

1. Unit: `pnpm -C apps/mission-worker test`, `pnpm -C apps/api test`, `pnpm -C apps/agent-api test` (regression), `pnpm -C packages/api-shared build`. All outcome tests from Step 2 pass.
2. Migration applied via Supabase MCP — **staging project first**, production with approval.
3. Smoke (the definition of done): `pnpm seed:yc-demo` → start services with low-threshold env → `pnpm smoke:customer-signal` → T1/T2/T3/T6 all pass on the YC Demo account with real tokens.
4. DB spot checks: outbox rows by event_type/status; `ns_memories` by source_type; cursor columns populated; re-run smoke → no duplicates (O6).
5. Rollback: `CUSTOMER_SIGNAL_SWEEP_MS=0` stops emission; delete pending `customer_interaction_route` rows; cursor columns inert; Phase 3 rollback = revert fathom.controller commit (worker keeps both handlers until the drain-gated deletion commit).

## Execution conventions

- Copy this plan to `.docs/plans/customer-signal-loop.md` at execution start (repo convention).
- Changelog entries per change day in `.docs/logs/changelog[date].md`.
- No automatic builds; vitest only. Strict order per phase: tests exist + fail → implement → tests pass.
