# Unified Slack Agent Consolidation

Date: 2026-08-13  
Status: Unified ledger and fail-closed Campaign Brain pipeline deployed; Wholesale recovery healthy; all-sender Slack detection and post-call ledger producer awaiting merge/deploy and post-deploy EOD verification

## Product model

Pixel is one operating agent with multiple scheduled and event-driven senses. The
individual QC, launch, Slack, post-call, and offer processes remain specialized
producers, but they do not own separate client truth or separate human queues.

The scope hierarchy is:

1. Company and Company Brain — organization-wide standards, people, clients, and reusable knowledge.
2. Clients Program — the portfolio shell used to enter and roll up client work; not one Program per client.
3. Client ROAS campaign container and Campaign Brain — durable knowledge and work spanning one client.
4. Campaign Spaces — the actual campaigns and their deeper work. A client-wide item may relate to multiple Spaces or remain at the client container.

General Space is not a substitute for client scope. It is one workspace under a
client campaign container. Scope is stored explicitly and rolled upward for
views; the same case is never copied into every level.

## One intelligence loop

```text
Slack observation ledger ─┐
Page Grader QC ────────────┤
Proactive Launch ──────────┤
Campaign QC ───────────────┼─> normalize + resolve scope ─> agent_cases
Post-call follow-ups ──────┤                              │
Pixel offers ──────────────┘                              ├─> EOD review
                                                         ├─> 24h breach escalation
                                                         ├─> Slack briefing/actions
                                                         └─> client/campaign views

Slack mapped channels ─> Campaign Brain import ─> ns_memories + embeddings
                                             └─> hybrid/lexical retrieval
```

`agent_cases` is the operational source of truth. Brain memory is the knowledge
source of truth. A case answers “what needs attention?”; a Brain memory answers
“what do we know?” The two may reference the same Slack evidence without trying
to replace each other.

## Timing and behavior

- Slack capture is continuous through the durable observation ledger.
- Five-minute analysis detects up to 40 qualified signals independently of the human delivery cap.
- Cooling windows still govern non-critical notification timing.
- EOD first reconciles every open Slack ask against the source thread, then compiles only still-open client work.
- Every unanswered client ask gets a hard due time 24 hours after its source message.
- A breached ask produces one deduplicated owner escalation even if daily briefing capacity is exhausted.
- Page Grader and Slack action buttons acknowledge, snooze, or resolve the same case row.

## Data and retrieval guarantees

A Slack-to-Brain mapping is healthy only when all five stages have evidence:

1. capture — source messages exist in `slack_observation_events`;
2. import — the mapped period job has an exact `JOB_STATUS:completed` or intentional `JOB_STATUS:skipped` marker;
3. routing — the job resolves to the client campaign and its Campaign Brain;
4. indexing — Slack memories exist and every retrievable memory has an embedding;
5. retrieval — an approved test query returns expected evidence through a real Brain search RPC.

Database `succeeded` alone is not proof. Missing or nested failed Atlas terminal
markers fail closed and must not advance the mapping cursor.

## Production audit result

The Wholesale Universe channel audit on 2026-08-13 initially found:

- 39 captured Slack observations;
- the correct mapping, client campaign container, and Campaign Brain;
- zero channel-specific Slack memories in that Brain;
- three jobs marked successful with a nested failed terminal receipt and two intentional skips;
- 38 older failed jobs, sampled failures caused by exhausted credits;
- three canonical false-success periods eligible for bounded replay after duplicate and intentional-skip filtering.

The bounded replay completed on 2026-08-13. Two valid periods produced four
exact-source Campaign Brain memories with 100% embedding coverage. The third
period was confirmed to contain zero captured messages and was terminally
quarantined as an intentional skip. A Supabase-only semantic RPC returned the
new Slack memory as the top result with similarity 1.0, and the full audit
reported healthy with no false successes. Bonnie's operational booking ask
remains in the case ledger rather than being manufactured into durable Brain
knowledge; the same replay did persist the related durable decisions about
replay-webinar budget, show-rate remediation, and new-client workflow safeguards.

The first bounded replay exposed two additional runtime contract gaps. Platform
agents receive `campaign_capability` as the backend action tool, with
`atlas_save_brain_context` supplied in its `action` field; the original import
prompt named the action as if it were a standalone tool. The runtime response
also JSON-encoded its OpenResponses envelope inside a string field. Recovery is
paused until both runtimes explicitly decode that bounded nested shape and the
campaign prompt names the exposed wrapper. Those fixes deployed successfully,
but the four-period replay exposed the final storage defect: the campaign branch
inside `atlas_save_brain_context` routed to `save_document`. That route requires
conversation context, does not create `ns_memories`, and drops the Slack source
identity. The replacement writes the extracted insight directly to the mapped
Campaign Brain, preserves source and temporal fields, creates its retrieval
embedding before success, and rejects General as a target. The post-deploy
replay then exposed one final authorization mismatch: the active, Atlas-owned
`atlas_save_brain_context` action was present in the action contract, schema,
preflight, MCP catalog, and runtime handler but absent from Atlas's local system
Brain capability allowlist. The repair aligns that last allowlist with the
existing action contract; it does not broaden the action to other agents.

The first production replay after that policy deployment returned
`JOB_STATUS:completed`, but production logs proved Atlas had called the rejected
user-memory action and no Campaign Brain row existed. A model terminal marker is
therefore no longer sufficient for a campaign Slack import. Before success or
cursor advancement, the API must find at least one memory in the mapped
Campaign Brain with the exact Slack period source ID and require every matching
row to have a retrieval embedding. The prompt also forbids skill/describe/user
memory fallbacks and permits `completed` only after a successful routed-save
receipt.

The client-ask audit also found that the active five-minute Slack automation
allows 171 channels but has only Dylan in `person_ids`. The current loop treats
that list as a source-sender filter, advances its cursor past every other sender,
and therefore never created Bonnie's `unanswered_ask` case. Expanding analysis
to every non-Ignored sender in those client channels is approved and implemented.
Delivery, Person Brain compounding, and personal-moment outreach remain restricted
to the existing internal person allowlist. Bonnie's exact ask was backfilled as
campaign-scoped case `1ad98b3b-7e63-41a9-9248-1f3e664ec213`; its due time is
exactly 24 hours after the Slack source timestamp. The next five-minute run
rechecked the source, found no reply, emitted one deduplicated owner breach, and
marked it surfaced. The all-sender code still requires merge and deployment.

The cross-producer production audit found Slack and offer cases in the unified
ledger, but no post-call rows. The existing post-call workflow stamped only its
separate action ledger even though `post_call` was already a reserved case type.
The workflow now records each proposed follow-up as a Space-scoped `post_call`
case and resolves it only after human approval or explicit automatic delivery.
Focused workflow tests prove proposal and resolution behavior. Page Grader's
structured QC bridge is wired and tested, but no post-migration production QC,
launch, or campaign notification has yet arrived; no synthetic client alert was
created merely to manufacture production evidence.

## Rollout sequence

1. Merge and deploy the ROAS importer and unified ledger branch. **Complete.**
2. Apply `20260813170000_unified_agent_cases.sql` through the normal migration path. **Complete.**
3. Deploy and verify the JSON-envelope decoder and explicit platform capability-wrapper instructions. **Complete.**
4. Run `audit_slack_brain_pipeline.py` read-only for the Wholesale Universe mapping. **Complete.**
5. Replay only the four canonical false-success periods with the explicit fixed-runtime assertion. **Complete; exposed the document-route defect without creating memories.**
6. Deploy the direct, embedded Campaign Brain writer. **Complete.**
7. Align Atlas's system Brain capability allowlist with its existing routed-save contract and deploy it. **Complete.**
8. Require persisted, fully embedded source evidence before a claimed Campaign Brain completion can succeed or advance the Slack cursor; deploy through the main API. **Complete.**
9. Quarantine the verified empty-source period as non-retryable instead of manufacturing a memory or replaying it indefinitely. **Complete.**
10. Replay only valid periods, then rerun the audit and require capture, terminal receipt, Campaign Brain memory, embedding coverage, and retrieval health. **Complete: four memories, 100% embedded, semantic RPC healthy.**
11. Confirm the replay-webinar period created retrievable Campaign Brain context. **Complete for durable decisions; Bonnie's transient ask correctly remains an operational case.**
12. Analyze all non-Ignored senders in allowlisted client channels, backfill Bonnie's `unanswered_ask`, and verify its due time is exactly 24 hours after the source message. **Implemented and backfill verified; code deployment pending.**
13. Observe EOD refresh and one 24-hour breach cycle before expanding replay to other mappings. **24-hour breach complete; post-fix EOD cycle pending.**
14. Merge and deploy the Page Grader structured QC producer branch after Brain recovery passes. **Complete.**
15. Keep `slack_open_items` as rollback state until one stable retention window; remove it in a later migration after parity checks.
16. Record proposed post-call follow-ups in `agent_cases` and resolve them on approval or explicit automatic delivery. **Implemented and focused tests pass; deployment and first real production event pending.**

The audit continues to report older credit-exhaustion failures as historical
backlog, but live health fails only on a new failure within 48 hours. This keeps
old, explicitly visible debt from masking whether the repaired pipeline is
currently healthy.

## Rollback

- Stop recovery by leaving all jobs untouched; audit is read-only by default.
- Disable the relevant Slack Brain mapping to halt new imports without deleting observations.
- Revert application readers to the retained `slack_open_items` table if the unified case ledger fails validation.
- Do not delete `agent_cases`, observations, or Brain memories during rollback; preserve evidence for reconciliation.
