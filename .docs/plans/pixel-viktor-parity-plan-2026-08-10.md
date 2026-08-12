# Pixel → Viktor Parity Plan (2026-08-10) — FULL PLAN

Goal: make Pixel's proactive Slack presence match Viktor's — personal,
continuous, evidence-rich, and follow-through-capable — and fix the reliability
failure that silenced Pixel on Aug 7. Plan only; no code written yet.

Context note: the "TEST — Pixel personal-moment outreach" DM on Aug 6 was a
deliberate manual test sent while building the personal-moment feature (after
Viktor demonstrated day-of birthday outreach). The feature itself works — it
organically detected the birthday — but the proposal is stuck because delivery
config blocks personal moments (see Part 1).

---

## Part 1 — Why Pixel went silent (diagnosed, verified against prod DB)

**Pixel has sent nothing since Aug 6, 8:20pm PT.** Verified timeline:

1. `space_automations` row `71344e15-448d-463f-95ed-3497b977196c`
   ("Slack Team Intelligence", enabled, 5-min interval) last fired
   `2026-08-07T03:10:37Z`; last successful digest send `03:03Z`.
2. `app_errors` shows a Supabase network flap `~03:00–04:00Z`
   (`TypeError: fetch failed` across multiple features).
3. At `03:20:37Z` the row's `schedule_next_fire_at` was set to **NULL**
   (`updated_at` matches; `schedule_last_fired_at` unchanged — the error path,
   not a claim).
4. Root cause: `rollNextFireForward` in
   `apps/api/src/modules/spaces/services/space-automation-scheduler.service.ts:162-187`
   wraps BOTH `computeNextFireAt` (cron parse) and `updateScheduleFields`
   (network write) in one try/catch; the catch assumes "unparsable cron" and
   nulls `schedule_next_fire_at`. A transient fetch failure therefore
   permanently disables the schedule.
5. `findDueSchedules`
   (`apps/api/src/modules/spaces/repositories/space-automations.repository.ts:193`)
   selects only `NOT NULL AND <= now` — a nulled row is never reconsidered.
   No self-healing, no alert, only a `logger.warn` on a Fly machine.

Additional dormant row: duplicate "Slack Team Intelligence"
(`3fa605c8-2e7e-44a7-932b-40a16c5a66b7`, enabled, never fired, next_fire NULL
since Jul 23). Remove or disable to avoid double-fires after backfill lands.

**Personal moments structurally cannot send on current config.** Pixel
organically detected Dylan's birthday (shadow action `2026-08-07T00:00Z`,
"Happy birthday, Dylan 🎉 The team put together a surprise birthday video…")
but it is stuck in `proposed`: `canSend`
(`slack-team-signal-delivery.service.ts:394`) requires recipient
`delivery_mode === 'active'` AND membership in the action's `person_ids`; the
live automation has `delivery_mode: "shadow"` and `person_ids: []`.

**Config problems on the live automation:** `daily_limit: 10` (template default
is 40) and the limit counter resets at UTC midnight = 4–5pm PT, mid-workday
(`slack-team-loop.service.ts:251`).

---

## Part 2 — Viktor vs Pixel: behavior gap analysis

| Behavior | Viktor | Pixel today | Root cause in code |
|---|---|---|---|
| **Voice** | Natural teammate prose; specifics woven in ("the 2021 ad Bryce dug up still holds up better than most things running now") | Hardcoded greeting rotation + numbered list + fixed CTA | Proactive copy is deterministic TypeScript (`slack-team-signal-message.ts:128-241`, `slack-team-personal-moment.ts:270-309`); the LLM only fills the middle clause. The Aug 6 voice commit (`9e86f989`) only touched live replies (`packages/agent-policy/src/platform-tools-template.ts`) |
| **Synthesis** | One narrative digest with real numbers ("650 peak / $30K spend / $35K cash") | Up to 5 independent signal blurbs; repetitive across sends | Analyzer emits per-signal findings; composer concatenates; 30-min window prevents aggregate view |
| **Continuity** | References its own prior messages; belated-birthday follow-up; "that unblock is done" | Each 30-min window analyzed in isolation; fingerprint dedupe suppresses re-mention forever | `lookback_minutes: 30` + advancing cursor + `hasEvidenceFingerprint` permanent suppression (`slack-team-loop.repository.ts:94`) |
| **Open-ask aging** | "Christian Osgood (open ~7h)… nobody has answered the spend-reduction request yet" | A question is surfaced once, then never again even if still open | No open-item ledger; no age computation anywhere |
| **Concrete offers** | Scoped spec + maintenance promise + single CTA ("case-study bank — one page per win… Just say go and I'll build it") | Generic "Want me to take the first pass on any of these?" | `suggestedActionFor` canned strings (`slack-team-signal-message.ts:45-60`) |
| **Follow-through** | "I'll have both ready before Monday's calls" — and delivers | A "yes" falls to the general chat agent; nothing tracks acceptance or produces a deliverable | No offer state machine (flagged `.docs/plans/agent-follow-up-work.md:9401`); reaction→work loop exists only in `meeting-follow-up-slack-confirm.workflow.ts:453` |
| **Cadence awareness** | Day-of birthday; quiet-weekend single flag; Sunday-night "worth a Monday-AM answer" triage | Continuous 5-min loop; only a Friday greeting variant | No cadence layer; "EOD briefing" is naming only |
| **Calendar/date stakes** | "first $2,500 premium event is Aug 18, the day before" the call | No date awareness | Calendar + Fathom pipelines never joined to Team Intelligence |
| **Personal moments** | Sent day-of, evidence woven naturally, belated follow-up next day | Detected but structurally unable to send (config) | Delivery gate above; composer appends evidence as metadata rather than weaving it |

---

## Part 3 — Phase 0: Revive Pixel + make silent death impossible

Ship first, as one small PR train. Pixel is currently dead.

### 0.1 Immediate remediation (one-off, prod DB — needs Dylan's go-ahead)
- `UPDATE space_automations SET schedule_next_fire_at = now() WHERE id = '71344e15-…'`.
- Disable duplicate row `3fa605c8-…` (`enabled = false`) so backfill (0.3)
  doesn't wake it and double-fire.

### 0.2 Fix the error conflation (PR 1, S)
`space-automation-scheduler.service.ts:162-187` — split `rollNextFireForward`:
compute `next` in its own try (parse failure → null the schedule and record an
admin-visible notice, current intent); run `updateScheduleFields` in a second
try (failure → log + leave `next_fire` untouched so the row stays due and is
retried on the next tick). Unit test: transient repo throw must NOT null.

### 0.3 Self-healing backfill (PR 1, S)
On the every-minute cron: re-seed `schedule_next_fire_at` for any
`enabled AND NOT is_draft AND trigger.type = 'schedule' AND schedule_next_fire_at IS NULL`
row via `computeInitialNextFireAt`. Rows whose cron genuinely fails to parse are
skipped and surfaced (0.4) instead of silently retried forever. This also
auto-revives after any future incident class we haven't predicted.

### 0.4 Liveness + gate observability (PR 2, M)
- Heartbeat check (same cron, cheap query): any enabled schedule with
  `schedule_last_fired_at` older than 3× its interval (min 15 min) → admin
  notice + a one-line Pixel self-report DM to Dylan ("I stalled and revived
  myself — schedule X missed N fires"). Dedupe to one alert per row per day.
- Persist per-run `skipped_reason` and per-recipient `canSend` outcomes on the
  run record (today five loop guards and six delivery gates fail invisibly);
  show in the Team Intelligence admin panel as "last 24h: ran / skipped
  (why) / delivered / held (why)".

### 0.5 Config corrections (PR 3, S + DB edit)
- `daily_limit` 10 → 40; move the limit-day computation from UTC to the
  automation's timezone (`slack-team-loop.service.ts:251`).
- Personal moments: flip automation to `delivery_mode: "active"` with
  `person_ids: [Dylan]` (channels list per current coverage) — after Phase 1
  voice lands, so the first real send is Viktor-quality. Interim option: keep
  shadow but review/send proposals from the admin panel.

### 0.6 Real preview mode (PR 3, S)
`?preview=true` on the manual-run endpoint: full pipeline runs, composed
messages are stored as proposals with a `preview` badge and surfaced in admin —
never sent, no hand-inserted DMs needed for testing.

---

## Part 4 — Phase 1: One voice — LLM-composed proactive messages

The single highest-visible-impact change. Deterministic code keeps doing what
it's good at (selection, dedupe, caps, quiet hours, gates); prose moves to the
model.

### 4.1 New composer service (PR 4, M)
`apps/api/src/modules/spaces/services/slack-team-message-composer.service.ts`

Input (structured):
- Recipient profile (name, role, relationship).
- Selected signals with full evidence: quotes, sender names, channel names,
  timestamps, and **numbers verbatim**.
- Continuity pack: summaries of the recipient's last 2–3 digests (Phase 2
  upgrades this to the open-item ledger).
- Context: day of week, time of day, weekend/weekday, org timezone.

Output: final Slack markdown for the DM (or thread follow-up), plus a
machine-readable list of any offers made (feeds Phase 3).

### 4.2 Voice pack shared with live replies (PR 4, part of M)
Extract the Pixel voice definition to one place in `packages/agent-policy`
(alongside `PLATFORM_TOOLS_CHANNEL_FORMATTING_BLOCK`, which `9e86f989` already
rewrote for live replies) and consume it from both the live-reply prompt and
the new composer. Style rules distilled from Viktor's observed messages:

- Lead with the single most important thing; no throat-clearing.
- **Bold** key facts, client names, dates, and dollar figures.
- Numbers verbatim from evidence; never rounded or invented.
- Quote people sparingly and exactly ("all good. Do what you need to do.").
- Narrative paragraphs when ≤3 topics; numbered list only for genuine triage
  (like Viktor's Sunday check-in) — and then with ages and status per item.
- At most one offer per message, always spec-shaped (what it will contain,
  when it will be ready), never "want me to take a first pass?".
- Warmth without repetition: greeting varies naturally; one emoji max unless
  it's a celebration; no canned closers.
- Day-aware framing ("weekend was quiet except…", "worth a Monday-AM answer").

### 4.3 Personal-moment composition (PR 5, S)
Composer variant: weave 1–2 evidence details into the note naturally (Viktor:
"The #hello-everyone thread today is a pretty good ROI report on the culture
you built"); no evidence footer; belated variant when the detected moment is
>20h old ("belated happy birthday 🎉"). The deterministic evidence validator
(`validatePersonalMomentEvidence`) stays untouched in front of it.

### 4.4 Guardrails and fallback (PR 4/5, built-in)
- Post-composition validation: length caps; only @-mentions/URLs present in
  evidence; no private-Brain facts (already enforced upstream — re-checked
  here); numbers in output must appear in evidence (regex check on $-figures).
- On composer failure/timeout: fall back to the current deterministic
  composers (`composeDigestMessage` etc. retained as fallback-only).
- Model: same Gemini path used by the analyzer (`EmbeddingService.callGeminiWithUsage`)
  to start; usage logged per message.

### 4.5 Refactor prerequisite (PR 4 precursor, S)
`slack-team-loop.service.ts` is 571/600 LOC (hard limit 600, flagged at
`agent-follow-up-work.md:9407`). Extract verified-signal routing +
shadow-action creation into `slack-team-signal-routing.service.ts` BEFORE
wiring the composer.

### Acceptance (Phase 1)
- Two consecutive digests over similar signals read differently (no template
  smell).
- Side-by-side: Pixel's output over the Aug 8 weekend-win evidence reads at
  Viktor's specificity level (numbers, names, one scoped offer).
- Preview mode (0.6) renders composed output for review before `active` flip.

---

## Part 5 — Phase 2: Memory — open-item ledger + cross-day continuity

### 5.1 Schema (PR 6, migration)
```sql
create table slack_open_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  kind text not null,                -- question | client_ask | commitment | risk
  subject_person_id uuid,            -- who's waiting / who owes
  client_label text,                 -- e.g. "Christian Osgood", "PascalZone"
  channel_id text not null,
  source_message_ts text not null,
  summary text not null,             -- one-line, evidence-grounded
  status text not null default 'open',  -- open | answered | resolved | stale
  first_seen_at timestamptz not null,
  last_activity_at timestamptz not null,
  times_surfaced int not null default 0,
  last_surfaced_at timestamptz,
  resolution_note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index on slack_open_items (org_id, channel_id, source_message_ts);
```

### 5.2 Ledger writer (PR 6, M)
The loop upserts ledger rows for `unanswered_question` / `client_risk` /
commitment-shaped signals each run (in addition to shadow actions). Reuse the
`SlackSignalResolutionService` pattern to mark items `answered`/`resolved` when
later replies or reactions land — but run it against open ledger rows on a
15-min cycle, not only during the cooling window.

### 5.3 Resurface policy (PR 7, S) — replaces "suppress forever"
An item may reappear in a digest when ALL of:
- status = open,
- age crossed a threshold step (8h / 24h / 72h),
- not surfaced in the last 8h,
- `times_surfaced < 4` (then mark `stale`, surface once as "going quiet on
  this unless you want it kept warm").
Render ages Viktor-style: "open ~14h". Fingerprint dedupe
(`hasEvidenceFingerprint`) keeps preventing duplicate *first* surfacing; the
resurface path bypasses it deliberately.

### 5.4 Continuity pack for the composer (PR 7, S)
Composer input gains: open items for this recipient (with ages), items resolved
since the last digest ("that unblock is done"), and the recipient's last 2–3
digest summaries so Pixel can reference itself and avoid repetition.

### 5.5 Retention (PR 6, part)
Archive resolved/stale rows after 14 days; cap open rows per org (500) with
oldest-stale eviction; note in the observation-ledger governance debt entry
(`agent-follow-up-work.md:8351`).

### Acceptance (Phase 2)
- A question asked Monday and unanswered Wednesday reappears with "open ~2d".
- Sunday check-in (Phase 4) can be generated from the ledger alone.
- Digest references a resolved item at most once, then stops.

---

## Part 6 — Phase 3: Follow-through — offers become work

### 6.1 Schema (PR 8, migration)
```sql
create table slack_pending_offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  recipient_person_id uuid not null,
  shadow_action_id uuid,             -- message that carried the offer
  thread_channel_id text,
  thread_ts text,
  deliverable_kind text not null,    -- recap_brief | case_study | spend_breakdown | …
  spec jsonb not null,               -- composer-emitted scope: sections, data sources, promise_by
  status text not null default 'offered',
     -- offered | accepted | in_progress | delivered | declined | expired | missed
  accepted_via text,                 -- reaction | thread_reply
  promised_by timestamptz,
  delivered_at timestamptz,
  artifact_ref text,                 -- doc/artifact id or Slack permalink
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 6.2 Offer creation (PR 8, S)
The composer (4.1) already emits machine-readable offers; delivery service
writes an offer row per sent message that contains one. Offers expire after
72h untouched.

### 6.3 Acceptance paths (PR 9, M)
- ✅ (or 👍) reaction on the offer message → accept. Reuse the
  `handleReactionAdded` pattern from
  `meeting-follow-up-slack-confirm.workflow.ts:453`. New handler lands in a NEW
  file — `slack-service-events.base.ts` is at the 600-LOC hard limit
  (`agent-follow-up-work.md:8522`).
- Affirmative thread reply → `SlackDigestReplyContextService` already resolves
  digest threads; extend it to match the thread to a pending offer and let the
  agent confirm + flip status ("On it — I'll have it ready before your 9am").

### 6.4 Fulfillment (PR 10, L)
On acceptance: enqueue an agent runtime job (existing
`enqueueAutomationRuntimeJob` path) with the stored spec + evidence refs; the
job produces the artifact and posts it back **in the same thread**; status →
`delivered`. Launch with three deliverable kinds Viktor demonstrated:
1. `recap_brief` — client spend vs registrations vs shows vs sales across
   recent events, "what changed between them" (PascalZone-style).
2. `case_study` — one-pager per win from #client-wins posts (setup → spend →
   result → what we did differently).
3. `spend_breakdown` — day-by-day spend-vs-sales for a named client
   (Christian Osgood-style).
Data sources: Slack evidence + ledger first; GHL/Fathom joins later.

### 6.5 Promise discipline (PR 10, S)
Heartbeat checks accepted offers past `promised_by` without delivery → status
`missed` and Pixel says so in-thread ("Still on the PascalZone brief — the data
pull is slower than expected; you'll have it by 2pm") rather than going silent.

### Acceptance (Phase 3)
- Offer → ✅ → delivered artifact in-thread with zero human plumbing.
- No accepted offer ever silently disappears.

---

## Part 7 — Phase 4: Cadence + cross-context awareness

### 7.1 Cadence layer (PR 11, M)
Keep the 5-min observation loop (detection cadence) but shape **delivery**:
- Weekday: one synthesized EOD digest 17:00–18:00 org time; intraday sends only
  for urgent kinds (client_risk, time-sensitive asks); others accumulate.
- Weekend: single message only if something clears a higher urgency bar
  (Viktor: "weekend was quiet except one thing worth flagging").
- Sunday 17:00–19:00: check-in generated from the open-item ledger — open
  client asks with ages, who replied, what's unanswered, "worth a Monday-AM
  answer", ending with a concrete dual offer.
- Personal moments stay immediate (day-of matters).
Implementation: delivery-eligibility windows per signal kind in the delivery
service; composer gets the batch. Config lives on the automation action JSON.

### 7.2 Calendar stakes (PR 12, M)
Join upcoming calendar events (existing Google Calendar integration,
`apps/api/src/modules/integrations/`) against client labels on open items /
digest topics → composer receives "next relevant event: Aug 18 premium event;
client call Aug 19" and can write Viktor-style stakes lines.

### 7.3 Meeting cross-pollination (PR 12, S)
Surface Fathom follow-up state (`meeting-follow-up-*` pipeline) for a client
inside that client's digest topic instead of as a parallel silo.

---

## Part 8 — Sequencing, PR breakdown, estimates

| PR | Contents | Phase | Size |
|----|----------|-------|------|
| 1 | Scheduler error-split + self-healing backfill + tests | 0 | S |
| 2 | Liveness heartbeat + skipped/held observability + admin surface | 0 | M |
| 3 | Config fixes (limit/timezone) + preview mode | 0 | S |
| 4 | Loop-service extraction refactor + composer service + voice pack | 1 | M |
| 5 | Personal-moment composition + belated variant | 1 | S |
| 6 | `slack_open_items` migration + ledger writer + retention | 2 | M |
| 7 | Resurface policy + continuity pack | 2 | S |
| 8 | `slack_pending_offers` migration + offer creation/expiry | 3 | S |
| 9 | Acceptance paths (reaction + thread reply) | 3 | M |
| 10 | Fulfillment runtime jobs (3 deliverable kinds) + promise discipline | 3 | L |
| 11 | Cadence layer | 4 | M |
| 12 | Calendar stakes + meeting cross-pollination | 4 | M |

Order: 1→2→3 immediately (Pixel is dead until at least the 0.1 DB fix).
4→5 next (visible quality jump). 6→7 can run parallel to 4→5 (different
files). 8–10 after 4 (needs spec-shaped offers). 11–12 last (11 needs 6).

Rollout strategy per phase: everything lands in **shadow mode first**, reviewed
via the admin panel / preview mode, then flipped active per-recipient (Dylan
first). The deterministic safety rails — quiet hours, daily caps, internal-only
recipients, confidence gate, personal-moment evidence validator, evidence
fingerprints — stay in front of every send in all phases.

## Part 9 — Decisions

1. **Reseed: DONE 2026-08-10.** Row `71344e15` reseeded
   (`schedule_next_fire_at` = now); duplicate row `3fa605c8` disabled. Pixel
   can still die the same way until PR 1 lands — small window, accepted.
2. **Personal moments: Dylan only at first** (decided 2026-08-10). Widen to
   all internal people after a week or two of vetted quality.
3. **EOD consolidation** (Phase 4) changes feel from "pings through the day"
   to "one strong digest + urgent-only interrupts" — confirm that's the Viktor
   behavior you want, or keep continuous delivery with better voice. (Open.)
4. Composer model: start on the existing Gemini path (cheapest wiring) or
   switch proactive composition to Claude for voice quality; measurable via
   preview A/B before the active flip. (Open.)

## Part 10 — Success measures

1. Zero silent-stop days: any stall self-heals or is surfaced within 15 min.
2. Personal moments send day-of, in Viktor-quality prose, no test artifacts.
3. Sunday check-in lists open client asks with ages and who's answered —
   generated from the ledger, no hand-holding.
4. ≥1 accepted offer per week flows offer → acceptance → delivered artifact
   in-thread automatically.
5. Digest repetition rate (near-duplicate consecutive digests) drops to zero;
   spot-check monthly against latest Viktor samples.
