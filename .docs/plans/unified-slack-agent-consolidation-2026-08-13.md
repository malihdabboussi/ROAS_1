# Unified Slack Agent Consolidation

Date: 2026-08-13  
Status: ROAS foundation deployed; bounded Brain recovery validation in progress

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

The Wholesale Universe channel audit on 2026-08-13 found:

- 39 captured Slack observations;
- the correct mapping, client campaign container, and Campaign Brain;
- zero channel-specific Slack memories in that Brain;
- six jobs marked successful without a required terminal receipt;
- 38 older failed jobs, sampled failures caused by exhausted credits;
- six exact false-success jobs eligible for bounded replay after the fixed runtime deploy.

Historical Slack-derived Campaign Brain memories are embedded and a prior real
semantic probe returned relevant historical Bonnie context. The newer Bonnie
message is not retrievable because its import never produced a Campaign Brain
memory, not because capture or vector search is broken.

The first bounded replay exposed two additional runtime contract gaps. Platform
agents receive `campaign_capability` as the backend action tool, with
`atlas_save_brain_context` supplied in its `action` field; the original import
prompt named the action as if it were a standalone tool. The runtime response
also JSON-encoded its OpenResponses envelope inside a string field. Recovery is
paused until both runtimes explicitly decode that bounded nested shape and the
campaign prompt names the exposed wrapper. No broader replay should proceed on
database success state alone.

## Rollout sequence

1. Merge and deploy the ROAS importer and unified ledger branch. **Complete.**
2. Apply `20260813170000_unified_agent_cases.sql` through the normal migration path. **Complete.**
3. Deploy and verify the JSON-envelope decoder and explicit platform capability-wrapper instructions.
4. Run `audit_slack_brain_pipeline.py` read-only for the Wholesale Universe mapping.
5. Replay only the six identified false-success jobs with the explicit fixed-runtime assertion, in a bounded batch.
6. Wait for the import worker, then rerun the audit and require capture, terminal receipt, Campaign Brain memory, embedding coverage, and retrieval health.
7. Confirm Bonnie's exact source period created both an `unanswered_ask` case and retrievable Campaign Brain context.
8. Observe EOD refresh and one 24-hour breach cycle before expanding replay to other mappings.
9. Merge and deploy the Page Grader structured QC producer branch after Brain recovery passes.
10. Keep `slack_open_items` as rollback state until one stable retention window; remove it in a later migration after parity checks.

The audit continues to report older credit-exhaustion failures as historical
backlog, but live health fails only on a new failure within 48 hours. This keeps
old, explicitly visible debt from masking whether the repaired pipeline is
currently healthy.

## Rollback

- Stop recovery by leaving all jobs untouched; audit is read-only by default.
- Disable the relevant Slack Brain mapping to halt new imports without deleting observations.
- Revert application readers to the retained `slack_open_items` table if the unified case ledger fails validation.
- Do not delete `agent_cases`, observations, or Brain memories during rollback; preserve evidence for reconciliation.
