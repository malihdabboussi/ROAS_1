# Cost Problems - Problems To Solve

## 1) Runaway CEO awareness execution loop (core incident)

- Signal intelligence is firing continuously and creating awareness sessions at extreme frequency.
- Synthetic `all_workers_idle` signals are emitted repeatedly without cooldown/dedup, which keeps weight above threshold.
- Scheduler polling interval can be very aggressive (`MISSIONS_POLL_MS=2000`), amplifying loop pressure.
- Result: nonstop OpenClaw/OpenRouter calls and rapid API spend.

## 2) OpenRouter traffic path not fully represented in ai_usage_events

- Mission-worker traffic goes through `POST /api/artifacts/openclaw/chat-completions` proxy path.
- That path forwards to gateway/OpenClaw and does not persist usage/cost events in the same way as chat billing flow.
- Result: real OpenRouter usage can happen without matching rows in `ai_usage_events`.

## 3) Cost-source mismatch (expected OpenRouter API cost vs recorded calc cost)

- Recorded events are mostly `openrouter_calc` and not `openrouter_api`.
- `openrouter_api` remains effectively zero in observed data despite retry logic existing in code.
- Result: dashboard cost diverges from OpenRouter billed reality.

## Core Focus Now - Awareness Loop

### Why the loop happened

- Poll cycle repeatedly runs signal intelligence for every c-level user.
- `all_workers_idle` synthetic signal was emitted every poll cycle without dedup.
- Threshold check (`weight >= 4`) kept passing due to rapid accumulation.
- In-progress protection is not a strict DB uniqueness lock, so concurrent workers could race.

### What we already fixed

1. Time-bounded dedup (10 min) on `all_workers_idle` and `user_deviation` signals.
2. Per-user 10-minute cooldown on awareness session evaluation in `shouldFireForUser`.

---

## Refined Awareness Signal Design

### Core principle: signals are either STATE or EVENT

**State signals** represent an ongoing condition (e.g. workers are idle, user is absent).
They should emit on **state transition** only — when the condition becomes true, not while it remains true.

**Event signals** represent something that just happened (e.g. a mission completed, a mission got blocked).
They emit once per occurrence and are naturally unique.

### Signal types (updated)

| Signal                   | Category    | Weight | Trigger                                                                      | Re-emit rule                                                |
| ------------------------ | ----------- | ------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `all_workers_idle`       | STATE       | 2.0    | Workers went from "at least one busy" → "all idle"                           | Only on next busy→idle transition                           |
| `user_deviation`         | STATE       | 1.2    | User hasn't interacted in >24h                                               | Once. Replaced by `user_unresponsive` after we contact them |
| `user_unresponsive`      | STATE (new) | 2.0    | We sent an awareness point AND user hasn't interacted since, gap > threshold | Once per outreach attempt                                   |
| `strategy_undefined`     | STATE       | 3.0    | Active campaign missing North Star                                           | Once per campaign (existing dedup works)                    |
| `team_skill_gap_pattern` | STATE       | 2.5    | 3+ missions with capability gap in 7 days                                    | Once per 7-day window (existing dedup works)                |
| `mission_completed`      | EVENT       | 0.3    | A mission execution completed                                                | Each occurrence                                             |
| `mission_blocked`        | EVENT       | 1.5    | A mission planning got blocked                                               | Each occurrence                                             |

### `all_workers_idle` — state transition model

Current: checks "are all workers idle right now?" every poll cycle.
New: track previous state. Only emit when transitioning from busy→idle.

- Workers busy → some finish → all idle → **emit signal (2.0)**
- Workers still idle next poll → **no emit** (state unchanged)
- CEO acts, assigns tasks → workers busy → tasks complete → all idle again → **emit signal** (new transition)
- COO notifies user → workers still idle → **no emit** (COO can't change the state, notification already sent)

This makes CEO loops self-regulating: each "act" decision changes state (workers get busy), so the next signal only fires after real work completes. COO loops naturally stop because notifying doesn't change worker state.

### `user_deviation` → `user_unresponsive` upgrade

Current: "user hasn't initiated contact in 24h" — weak signal, user might just not need anything.

New two-phase model:

1. `user_deviation` (1.2): user hasn't interacted in >24h. Fires once. Contributes to threshold.
2. `user_unresponsive` (2.0): we sent an awareness point (checked via `agent_awareness_points.created_at`) AND `profiles.last_interaction_at` is still before that point AND gap exceeds threshold. This means: "we reached out and they didn't answer." Much stronger signal.

This makes follow-ups justified — the CEO/COO isn't nagging about silence, it's following up on an unanswered message.

### Session cooldown

- Minimum 10 minutes between awareness sessions per user.
- Prevents rapid re-evaluation even when weight legitimately crosses threshold.
- Combined with state-transition signals, the natural rhythm becomes:
  - CEO: ~20-40 min cycles (assign → execute → complete → idle → evaluate → assign)
  - COO: notify once per state change, follow up only if user doesn't respond

### Model for awareness evaluation

Awareness sessions are a 3-option triage (notify / act / wait). This does not require Opus 4.6.
Use a cheaper reasoning model to reduce per-session cost significantly.
