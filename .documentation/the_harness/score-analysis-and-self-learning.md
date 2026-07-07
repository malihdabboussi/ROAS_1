# Score, analysis, and self-learning (roadmap + as-built)

This document separates **what Vibey does today** about scoring and quality signals from the **longer product vision** discussed for human–agent evaluation loops and prompt adaptation.

---

## 1. Vision (from product direction)

**Goal:** Close the loop between **outcomes**, **structured evaluation**, and **personalized agent configuration**.

Conceptual loop:

1. **Work completes** (mission / subtask reaches review or done).
2. **Automatic analysis** — e.g. a manager or dedicated “scorer” agent produces **scores with dimensions** (quality, spec adherence, tone, completeness).
3. **Human review** — the user rates the same work on their own rubric and leaves comments on tasks.
4. **Reconciliation** — large gaps (e.g. model score 9 vs user 2) become first-class signals.
5. **Aggregation** — daily or weekly rollups per agent, per campaign, per user.
6. **Adaptation** — suggestions or automated updates to **prompts, skills, or policy hints** stored in the database, compiled at runtime into filesystem definitions (same pipeline as `AgentSyncService`).

This is **not** fully implemented as an end-to-end “self-learning” product surface; sections below document **current code** and **intentional gaps**.

---

## 2. As-built today

### 2.1 Manager review and `qualityScore`

During **mission review**, the manager agent returns structured review output. On **approval**, the review phase may call **`scoreAgentAfterMission`** (`apps/mission-worker/src/modules/missions/services/phases/mission-review-phase.service.ts`).

That routine:

- Reads **`agents_registry.stats`** for the mission’s `assigned_agent_key`.
- Takes **`qualityScore`** from the review result (numeric, defaulting toward mid-scale if missing).
- Derives several **rolling stats** (quality, reliability from revision count, initiative, communication, spec adherence, learning rate, execution speed).
- Uses an exponential-style **smooth update** (lerp weighted by how many missions were already scored) so scores stabilize over time.
- Writes back **`agents_registry.stats`** including `missions_scored`, `last_scored_at`, and an **`overall`** aggregate.

**Evidence:** `scoreAgentAfterMission` and its call site after successful approval in the same file.

### 2.2 What this is not (yet)

- **No automatic prompt mutation** from `stats` — registry stats are **telemetry-like aggregates**, not wired in-repo (as of this writing) to rewrite `agent_definitions` or `agent_skills`.
- **No first-class user rubric** — task comments exist (`missions_logs` with `user.comment` per mission architecture doc), but there is no standardized **user scorecard** entity or weekly “diff my prompts” job described in code here.
- **No dedicated scorer agent** in the architecture docs — review is the **manager** agent’s phase, not a separate scoring service.

---

## 3. Target architecture (incremental path)

The following is a **roadmap shape** that matches the harness elsewhere: keep **source of truth in the database**, **enforce policy in agent-api**, **run long jobs in workers**, **sync to disk** for OpenClaw.

### 3.1 Data we would add or formalize

| Piece                                         | Purpose                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------- |
| **Per-task or per-mission evaluation record** | Store model scores, human scores, dimensions, free-text rationale, links to deliverables. |
| **Rubric versioning**                         | So scores are comparable over time when criteria change.                                  |
| **Drift flags**                               | When `                                                                                    | model_score - user_score | > threshold`, mark for review or training data. |

### 3.2 Processing

- **Batch job** (nightly/weekly): aggregate evaluations, produce **recommendations** (human-in-the-loop at first).
- Optional **second-pass LLM**: turn deltas + comments into **concrete prompt/skill edits** as diffs for approval.

### 3.3 Application

- Approved changes update **`agent_definitions` / `agent_skills`** (or a dedicated `prompt_variants` table keyed by user + agent).
- **`AgentSyncService`** (or successor) continues to **materialize** files for the gateway.
- **RBAC** unchanged: learning adjusts **instructions**, not **artifact allowlists**, unless product explicitly adds policy learning (high risk; separate design).

### 3.4 Safety boundaries

- **Fail closed on authorization** — never learn “user asked to bypass policy.”
- **Audit trail** — every auto-suggested prompt change should trace to **which evaluations** produced it.
- **Per-user personalization** — align with multi-tenant RLS already used for `agent_skills` and `agent_definitions`.

---

## 4. Relation to the rest of the harness

- **Policy** (`.documentation/agents/agent-rbac-and-team-architecture.md`) remains the hard gate.
- **Orchestration** (`.documentation/mission-control/task-subtask-architecture.md`) remains where **review** runs today and where richer scoring hooks would attach (same phase, or sub-phase).
- **Context** (compaction, campaign, graph) continues to feed **inputs** to any future scorer; it does not replace **evaluation storage**.

---

## 5. Quick reference — files touched by today’s scoring

| File                                                      | Role                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/mission-worker/.../mission-review-phase.service.ts` | Calls `scoreAgentAfterMission` on approval; updates `agents_registry.stats` |

For the full harness overview, see **`vibey-harness.md`** in this folder.
