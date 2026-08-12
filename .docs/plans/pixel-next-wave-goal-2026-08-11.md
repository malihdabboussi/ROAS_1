# GOAL: Pixel speaks, delivers, and closes loops end-to-end (2026-08-11)

One sentence: **a call ends → Pixel drafts the recap in Dylan's structure →
Dylan edits on the card → it posts to the client Slack channel → and Pixel's
own proactive DMs are running, in a voice worth reading.**

Master tracking checklist (update as workstreams land):

- [x] W1 — Revive the pipeline — DONE 2026-08-11 (landed on main via parallel session; verified in prod: 5-min runs succeed, message sent, daily_limit 40, delivery active, Dylan allowlisted)
- [x] W2 — Draft card → Slack send — DONE 2026-08-11, branch `claude/draft-card-slack-send` (stacked on UI branch), tests green
- [x] W3 — Action-item intelligence — DONE 2026-08-11, branch `claude/action-item-intelligence` (off main), tests green
- [x] W4 — Phase 1 voice composer for proactive DMs — DONE, VERIFIED 2026-08-11: already landed on main via `codex/pixel-pr*` PRs the night of 2026-08-10 (780c385d routing extraction, d29b8d78 composer, 77f8e4ad belated personal moments; Phases 2–4 landed too: a98d822e/ad68666c open-item ledger, 4057b040 offer fulfillment, dafa51bf cadence). Verified at fe9ad3f6: composer + guardrails (`slack-team-message-composer.service.ts`), deterministic fallback wired (`slack-team-signal-delivery.service.ts`), voice pack `PIXEL_SLACK_VOICE_BLOCK` (`packages/agent-policy/src/pixel-slack-voice.ts`) consumed by BOTH live replies (`platform-tools-template.ts:46`) and the composer, belated >20h variant wired (`slack-team-signal-routing.service.ts:252`). Tests: 47/47 api slack-team suite + 45/45 agent-policy. No new code needed.
- [~] W5 — Clarification cards: ROOT GAP FOUND AND FIXED 2026-08-11, branch `claude/clarification-cards-e2e`, tests green. `ask_clarification` is plugin-local, so policy-derived `ALLOWED_ACTIONS.json` never contained it — every synced agent (Pixel included) had it stripped from the `vibey_backend` tool enum, and the generated vibey-api SKILL.md never documented it, so the card could never trigger. Fixed at the root: the plugin now always merges plugin-local actions into scoped enums (docker/tools/vibey-backend/index.ts `withPluginLocalActions`), and the vibey-api skill generator documents `ask_clarification` + a when-to-use pattern for all non-flows domains (guidance now lives in the synced skill, no longer dependent on the unmerged UI-branch TOOLS.md). Regression tests: plugin enum/local-execute, extractor message-shape → clarification block, generator docs, web block → card render + answer round-trip. REMAINING: live E2E (ambiguous prompt → tappable card in drawer + full-page chat) after this branch merges and agent workspaces re-sync.

Sequencing: W1 first and alone (everything agent-side is dead until it lands).
W2 + W3 are web-side and can run in parallel with each other and with W1.
W4 starts only after W1 proves jobs execute. W5 is a half-day check, anytime.
One branch per workstream (`claude/<workstream>`), PRs merged individually.

Context docs: `.docs/plans/pixel-viktor-parity-plan-2026-08-10.md` (full
Viktor parity plan; W1 = its Phase 0, W4 = its Phase 1).

---

## W1 — Revive the pipeline (BLOCKING; do first)

**Why:** `space_automations` fires every 5 min but jobs are enqueued to a
BullMQ queue whose consumer never executes them — zero run records since
Aug 7. Pixel is structurally mute; W4 and the whole parity plan are moot
until this lands.

**Diagnosis (verified against prod):**
- Producer: `enqueueAutomationRuntimeJob`
  (`apps/api/src/modules/spaces/services/space-automation-service-01.base.ts:514`)
  — `automationQueue.add(...)`; BullMQ `enableOfflineQueue` buffers in memory
  and "succeeds" when Redis is unreachable, so the DB claim advances while the
  work evaporates.
- Consumer: `SpaceAutomationRuntimeProcessor` registered in the SAME API app
  (`apps/api/src/modules/spaces/spaces.module.ts:231`). API both produces and
  consumes; a broken Redis connection kills execution invisibly.
- Redis URL resolution: `AGENT_RUNTIME_REDIS_URL_ENV_KEYS` in
  `packages/api-shared/src/services/agent-runtime-queues.ts` — local env has
  `REDIS_URL=redis://redis.railway.internal:6379` (Railway private network;
  check the Railway Redis service + the API's connection logs first).
- Caveat: `AGENT_RUNTIME_AUTOMATION_QUEUE_DISABLED=1` is NOT a reliable
  stopgap — the scheduler path calls `enqueueAutomationRuntimeJob` directly
  (`space-automation-scheduler.service.ts:144-147`), which only checks that
  the queue object exists, bypassing `shouldUseAutomationQueue()`.
- Second bug (already bit us Aug 7): `rollNextFireForward`
  (`space-automation-scheduler.service.ts:162-187`) conflates transient
  persistence errors with unparsable cron and permanently nulls
  `schedule_next_fire_at`.

**Build steps:**
1. Diagnose prod Redis connectivity (Railway service health, API logs). Fix
   the connection or point the queue at a reachable Redis.
2. Make enqueue failure impossible to silently swallow: disable offline
   queueing for the automation queue (fail fast) and fall back to inline
   `executeAutomationItemless` when the queue is unavailable — including on
   the scheduler path (fix the `shouldUseAutomationQueue` bypass).
3. Split `rollNextFireForward` error handling: cron-parse failure → null +
   admin notice (intended); persistence failure → log, leave `next_fire`
   untouched so the row retries next tick.
4. Self-healing backfill on the every-minute cron: reseed
   `schedule_next_fire_at` for enabled, non-draft schedule rows where it is
   NULL.
5. Liveness heartbeat: enabled schedule with `schedule_last_fired_at` older
   than 3× its interval (min 15 min) → admin notice + one-line Pixel DM to
   Dylan; dedupe one alert per row per day. Persist per-run `skipped_reason`
   and per-recipient `canSend` outcomes.
6. Config: `daily_limit` 10 → 40 on the live automation; compute the limit
   day in the automation's timezone, not UTC
   (`slack-team-loop.service.ts:251`).
7. Preview mode: `?preview=true` on the manual-run endpoint → full pipeline,
   proposals stored with a preview badge, nothing sent.

**Acceptance:** run records appear again for the live automation; killing
Redis mid-run degrades to inline execution (jobs still execute); a
transient DB error no longer nulls the schedule; a forced stall produces a
heartbeat DM within 15 min; a normal weekday produces a real digest DM.

---

## W2 — Draft card → Slack send

**Why:** the card now goes draft → click-to-edit → composer, but Dylan still
relays the text by hand. The loop should end with Pixel posting it.

**Current pieces:** `DraftVersionsCard.tsx` +
`draft-versions.utils.ts` (fence parser, `DRAFT_CARD_USE_EVENT`) in
`apps/web/src/features/studio/components/message-bubble/`; listener in
`SpaceVibeyChatPanel.tsx`; agent-side Slack send exists
(`send_slack_message` automation action / Slack MCP tools; Pixel's agent
workspace TOOLS.md already documents draft fences).

**Build steps:**
1. Add a "Send to Slack…" action on the draft card (next to Copy / ↑).
2. Channel picker: recent + searchable channels from the org's Slack
   integration (reuse existing channel-list API; add a thin endpoint if the
   web app lacks one).
3. Confirm step showing exactly what posts where (message preview +
   `#channel` name) — the send is one explicit click AFTER the picker, never
   implicit.
4. Post via the existing agent/API Slack send path with the card's current
   (possibly edited) text; thread receipt back into the conversation as a
   tool result ("Posted to #client-x — [permalink]").
5. Regression: card send with edited text, cancel path, failed-send surfaced
   with the structured tool-error contract (AGENTS.md §8.6).

**Acceptance:** from a post-call recap card, edited text lands in a test
channel with correct formatting, and the conversation shows the receipt.

---

## W3 — Action-item intelligence

**Why:** workspace action items are verbatim Fathom extractions
("Monitor ads Aug 15–16" as a task when it was conversational reassurance).
Dylan's hand-written team messages are the quality bar: real commitments
only, owner + date + why, DONE items marked.

**Current pieces:** items flow from Fathom via the meeting sync into
`meeting-workspace-api` / `MeetingActionItemsSection.tsx`; the post-call
recap prompt in `meeting-post-call-actions.config.ts` already encodes the
judgment rules — action extraction does not.

**Build steps:**
1. Add an LLM refinement pass over raw Fathom action items (at recording
   sync time, agent-api side): keep only real commitments; attach owner,
   date (resolve "by Friday" → absolute), and a one-line "why"; drop
   conversational reassurances; mark items already completed as DONE;
   preserve source-timestamp linkage.
2. Store both raw and refined; workspace renders refined, with "show
   original Fathom items" fallback.
3. Editable in the workspace (already partially true): rename, reassign,
   re-date, delete; edits win over refinement on re-sync.
4. Feed refined items (not raw) into the recap draft prompt and the
   follow-up email prompt.
5. Tests: refinement fixture from the Aug 11 client meeting transcript;
   assert the "monitor over the weekend" class is filtered and DONE
   detection works.

**Acceptance:** for the Aug 11 meeting, the workspace list reads like
Dylan's hand-written version (owners, dates, whys, no noise) without manual
editing.

---

## W4 — Phase 1 voice composer (proactive DMs)

**Why:** Pixel's digests/personal moments are hardcoded TypeScript prose
(`slack-team-signal-message.ts`, `slack-team-personal-moment.ts`) — the LLM
only fills a middle clause, which is why prompt tuning never changes them
and they sound templated next to Viktor.

**Scope:** exactly Phase 1 / PRs 4–5 of
`.docs/plans/pixel-viktor-parity-plan-2026-08-10.md`:
1. Extract `slack-team-loop.service.ts` routing first (571/600 LOC —
   §follow-up log).
2. New `slack-team-message-composer.service.ts`: structured input
   (recipient, signals with verbatim numbers/quotes, continuity pack,
   day/time context) → final Slack markdown + machine-readable offers.
3. Shared voice pack in `packages/agent-policy` consumed by BOTH live
   replies and proactive composition (style rules distilled from Viktor:
   lead with what matters, bold names/dates/dollars, verbatim numbers, one
   spec-shaped offer max, day-aware framing).
4. Personal-moment variant (evidence woven in, belated form >20h, validator
   untouched in front).
5. Guardrails: length caps, $-figures must appear in evidence, deterministic
   composers retained as fallback; preview mode (W1.7) for review.
6. Rollout: shadow first, then active for Dylan only (decided 2026-08-10).

**Acceptance:** two consecutive digests over similar signals read
differently; a preview render over the Aug 8 weekend evidence hits Viktor's
specificity bar; personal moments send day-of for Dylan.

---

## W5 — Clarification cards end-to-end verification

**Why:** the AskUserQuestion-style card exists in the web app and Pixel's
TOOLS.md now documents when to use it, but Dylan has never seen one fire in
real use.

**Steps:**
1. Trace the render path in the chat drawer for the clarification/question
   card component; confirm the message shape Pixel must emit.
2. Prompt Pixel with a deliberately ambiguous multi-option request; verify a
   card renders in BOTH the drawer and full-page chat.
3. If it never triggers: check whether the agent's tool/format registration
   actually reaches Pixel's runtime (workspace TOOLS.md vs. system prompt vs.
   tool definitions) and fix the gap.
4. Add a regression test for the message shape → card render.

**Acceptance:** an ambiguous request reliably produces a tappable
clarification card whose answer flows back into the conversation.

---

## Build prompts (paste one per fresh session)

**W1:** "Read `.docs/plans/pixel-next-wave-goal-2026-08-11.md` workstream W1
and `.docs/plans/pixel-viktor-parity-plan-2026-08-10.md` Phase 0. Work on
branch `claude/pixel-pipeline-revival`. Diagnose prod Redis for the
automation queue first (Railway), then implement steps 1–7 with tests.
Never push main."

**W2:** "Read `.docs/plans/pixel-next-wave-goal-2026-08-11.md` workstream W2.
Branch `claude/draft-card-slack-send`. Implement the card's Send-to-Slack
flow with channel picker + explicit confirm, using the existing Slack send
path and tool-error contract. Tests included. Never push main."

**W3:** "Read `.docs/plans/pixel-next-wave-goal-2026-08-11.md` workstream W3.
Branch `claude/action-item-intelligence`. Implement the refinement pass with
raw+refined storage and workspace rendering, with the Aug 11 meeting as the
quality fixture. Never push main."

**W4:** "Read `.docs/plans/pixel-next-wave-goal-2026-08-11.md` workstream W4
and the parity plan Phase 1. Branch `claude/pixel-voice-composer`. Extraction
refactor first, then composer + shared voice pack + guardrails, shadow-first
rollout. Never push main."

**W5:** "Read `.docs/plans/pixel-next-wave-goal-2026-08-11.md` workstream W5.
Branch `claude/clarification-cards-e2e`. Verify, fix if broken, add the
regression test. Never push main."
