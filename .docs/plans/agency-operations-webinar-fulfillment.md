# Agency Operations — Webinar Client Fulfillment

**Status:** Phase 1–2 spine implemented (2026-07-16) — template + Start playbook + Phase A + Gate 1. Phase B/C skills still open.  
**Owner ask:** Agency ops with human gates; agents autonomous; one consistent work UI; webinar-first.

---

## Architect Summary

**Runtime spine = Mission Playbook**  
Same Mission worker + Mission Control / Space Missions UI (subtasks, comments → Vibey directives, `awaiting_human`). Planning is **guided by a playbook framework**, not freeform invention.

**v1 (ship now):** One canned **Agency Client (Webinar)** Space template that includes the Webinar Fulfillment playbook. User starts via **Start playbook** (kickoff fields → create/start mission). No new Flow-builder playbook UI yet.

**Future:** Flows → **Add Flow** → choose **Standard flow** vs **Mission playbook**; configure playbooks in the Flow surface. v1 does not build that chooser.

**Feedback:** On the **mission** (comment / approve gate / `awaiting_human`). Space, not chat-as-orchestrator and not bare task “Send to agent.”

**Artifacts:** Land in the client Space (Docs, Deliverables, funnels, presentations).

---

## Evidence Pack

- Mission UI: subtasks, comments → `mission.comment.directive`, `awaiting_human` / plan `pending_approval` (`documentation/features/missions.md`, `packages/api-shared/src/types/mission-status.ts`).
- Flow presets (Ad Kit `human_gate`) prove durable agent chains — used as **inspiration for playbook phases**, not as the day-to-day ops UI for v1.
- `client-account-workspace` + CEO HQ templates exist; client statuses lack Ad Kit gate ids (`CLIENT_STATUSES` = brief/in_progress/review/delivered/paid).
- Strategist skills 1–3 exist; **auto-skill-4 missing**; webinar production skills missing.

---

## Product Model

| Concept | Where | User sees |
|---------|--------|-----------|
| **Playbook definition** | v1: seeded with Space template / code catalog. Future: Flow “Mission playbook” type | v1: invisible recipe. Future: Flows library |
| **Running job** | **Mission** in client Space | Missions tab + Mission detail |
| **Client home** | Space (Docs, Deliverables, Channel) | Same Space |
| **Needs me** | Your Turn + CEO HQ Missions | Cross-client inbox |
| **Kickoff** | **Start playbook** modal | Collects required inputs, starts mission |

### Future Flows UX (not v1)

When creating a flow:

1. Popup: **Standard flow** vs **Mission playbook** (short explainer each).
2. Mission playbook editor configures phases / gates / skills (Flow stream as config surface).
3. Installing a playbook on a Space (or starting from Missions) creates missions that follow that framework.

### v1 UX (locked)

1. Instantiate **Agency Client (Webinar)** Space (or start playbook from an existing client Space that has the playbook installed).
2. **Missions → Start playbook → Webinar Fulfillment**.
3. Kickoff modal: whatever is required (client/campaign context, transcript or “skip to post-call,” links, notes).
4. Mission runs phases; user returns only for gates / comments.
5. Artifacts appear in Space Docs / Deliverables.

---

## Playbook phases (webinar)

```text
Start playbook (kickoff inputs)
  → Phase A: Strategy (skills 1→2→3 as guided subtasks)
  → Gate 1: awaiting_human / human subtask — approve or comment feedback
  → Phase B: Copy package (topics, emails, Meta ads, scripts, LP copy)
  → Gate 2: human gate
  → Phase C: Creative (static ads, theme images, LP, deck)
  → Optional Gate 3 / done
```

Mission planner **expands** this framework into concrete `mission_subtasks` (agents, deps, output contracts). It does not invent a different lifecycle.

---

## Recommended Approach (v1)

### Hybrid: Space template + Mission Playbook runtime

| Layer | Owns |
|-------|------|
| **Agency Client (Webinar) Space template** | Views, Docs seeds, Missions tab, playbook available to start |
| **Webinar Fulfillment playbook** | Phase skeleton + gate points + skill keys (code/catalog seed) |
| **Mission** | Living job UI; worker execute/review; comments |
| **Kickoff modal** | Required fields → `create_mission` with `playbook_id` (or equivalent) |
| **Flow builder playbook type** | **Out of scope for v1** |

### Explicit non-goals for v1

- Add Flow → “standard vs mission playbook” chooser / editor.
- Customizing playbooks in the Flow canvas.
- Mission-free Flow-as-ops-spine for day-to-day agency work.
- Every campaign type — webinar only.
- Replacing CEO HQ (stays cockpit; client work is per-client Space + missions).

---

## Step-By-Step Implementation Plan (v1)

### Phase 0 — Spec freeze

1. Kickoff field list (minimum): campaign/client context, optional transcript / Drive links, “start at pre-call vs post-call vs launch brief,” notes.
2. Gate UX: human subtask vs mission `awaiting_human` — pick one primary; comments always work on mission.
3. Confirm playbook storage shape (JSON in catalog vs DB table) — smallest path that `create_mission` can read.

### Phase 1 — Space template

1. New template (e.g. `agency-client-webinar`) from `client-account-workspace` + Missions + Docs seeds (Pre-Call, Strategy v2, THE PLAN, Copy Package, Creative Pack).
2. Register in space-template catalog (+ DB seed if CEO pattern requires it).
3. Tests: catalog slug.

### Phase 2 — Playbook + mission start

1. Define playbook `webinar-fulfillment` (phases, skills, gate markers).
2. Mission create API / UI: **Start playbook** with kickoff payload; plan phase uses playbook as framework (guided plan, not free invent).
3. Wire strategist skills 1–3 into Phase A subtasks; human gate after Phase A.
4. Tests: create with playbook produces expected phase skeleton / gate subtask.

### Phase 3 — Copy + creative skills

1. Implement `auto-skill-4` if still needed for Space-side task trees, **or** fold production fan-out into playbook Phase B/C subtasks (prefer playbook subtasks as source of truth).
2. `roas-webinar-copy-package` + Gate 2.
3. Creative pack (ad design, theme images, deck) + optional Gate 3.

### Phase 4 — Polish

1. Your Turn for gate missions.
2. CEO HQ visibility of in-flight client missions.
3. Docs: playbook vs standard flow (future), how to start.

### Phase 5 — Future (explicitly deferred)

1. Flows **Add Flow** chooser: Standard vs Mission playbook.
2. Playbook editor in Flow stream.
3. Post-call / Slack auto-start of the same playbook.

---

## Data And Contract Map

- **Input:** Kickoff modal fields + Space/campaign scope  
- **Storage:** Mission + subtasks + plan/harness; artifacts in Space; playbook definition in catalog (v1)  
- **Output:** Mission detail + Space Docs/Deliverables  
- **Side effects:** Mission worker; notifications / Your Turn on gates  
- **Idempotency:** One active webinar-fulfillment mission per client Space unless user starts another  

---

## Test Plan

- Unit: playbook expand → subtask skeleton; kickoff validation  
- Integration: start playbook → Phase A runs → gate pauses → comment/approve resumes  
- Manual: one client Space, full webinar path  
- Regression: existing freeform missions and standard Flows unchanged  

---

## Rollout

1. Ship template + playbook + Start playbook (draft/featured as appropriate).  
2. Deploy api + web + agent runtime if skills change.  
3. No Flow-builder playbook UI in v1.  

---

## Missing Evidence

1. Smallest hook to pass a **playbook id / framework** into mission plan generation (prompt injection vs structured plan seed) — inspect `mission-openclaw.gateway` plan prompt path.  
2. Space template instantiate path (code vs DB seed) — mirror CEO HQ.  
3. Skill seeding for strategist (disk vs DB).  

---

## Suggested Build Order

1. Agency Client Webinar Space template  
2. Playbook definition + Start playbook (kickoff) → guided Phase A + Gate 1  
3. Phase B copy package + Gate 2  
4. Phase C creative  
5. (Later) Flows Add Flow → Mission playbook type  

---

## Decision Log

| Decision | Choice | Why |
|----------|--------|-----|
| Day-to-day entity | **Mission** | One UI: subtasks, comments, human gates |
| Playbook config long-term | **Flows** (mission playbook type) | Familiar config surface; deferred |
| v1 shipping shape | **Canned Space template + one playbook** | Avoid building Flow playbook editor now |
| Start | **Start playbook** + kickoff fields | Clear user action; agents start without Send-to-agent |
| Feedback | Mission comment / gate | Matches existing directive + awaiting_human |
| First playbook | Webinar fulfillment | User scope; skills 1–3 already webinar-oriented |
| Standard Flow spine for ops | Not v1 | User preferred mission as living object |
