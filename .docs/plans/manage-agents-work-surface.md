# Manage Agents Work Surface — Plan

Date: 2026-07-16  
Status: **Phases complete** (Ops Desk → Talk to Vibey sidebar attach; Work desks; Autopilot; roster realtime status)  
Owner surface: `/team` (Manage Agents)

## Architect Summary

Today Manage Agents (`/team`) is a **roster + optional agent DM**. Jaime (HR side chat) helps hire/edit agents. Vibey can already `create_mission` and manage work in chat — but landing on `/team` does not feel like walking into an office where your CEO briefs you and takes orders.

Autonomous work already runs through missions, task-agent runs, Flows, and org Autopilot — but humans cannot easily:

1. Land on `/team` and immediately know **what’s happening**
2. Talk to **Vibey** about what’s on their mind and have Vibey **deploy** the team
3. See who is idle vs working
4. Open an agent desk: focus, queue, recent deliverables
5. Manually assign work when they want direct control

**Goal:** Manage Agents becomes the **ops floor**:

1. **Default landing = Vibey briefing desk** — greeting by name, live team summary, composer to talk to Vibey
2. **Roster = employees** — idle/working + focus; open desk or assign
3. **Vibey deploys** — user messages intent; Vibey creates/assigns missions (and related work) via existing tools

**Design principle:** Do not invent a second work system. **Missions + running Space tasks + live traces** remain the harness. Vibey is the **orchestrator UI**; the roster is the **visibility + override** UI.

**Role split (keep clear):**

| Agent | Job on this surface |
|-------|---------------------|
| **Vibey** | CEO ops: brief what’s happening, take intent, deploy missions across the team |
| **Jaime** | HR: hire, skills, edit agents (existing side rail — do not replace with Vibey) |
| **Specialists** | Do assigned missions/tasks; desks show focus + output |

**Recommended slices:**

- **V1:** Vibey briefing landing + live summary + chat that can deploy (`create_mission` etc.)
- **V1.5:** Roster focus + Working/Idle + Assign work modal
- **V2:** Per-agent Work desk (Now / Queue / Recent)
- **V3:** Autopilot toggle on Vibey desk (org `awareness_loop_enabled`)

---

## User mental model (target)

| Human thought | UI answer |
|---------------|-----------|
| “I opened Team — what’s going on?” | Vibey: “Hey {name}. Here’s what’s happening…” + live summary |
| “Here’s what’s on my mind” | **Talk to Vibey** → sidebar chat with Ops Desk context attached; Vibey plans and deploys work |
| “Who’s sitting around?” | Roster (below/beside briefing): Idle / Working + focus lines |
| “I want to push one person myself” | Card/desk **Assign work** (manual override) |
| “What did Lux ship?” | Open Lux → Work → Recent deliverables |
| “Keep them busy without me” | V3: Autopilot on Vibey + awareness/CEO loop |

Agents feel like **employees with a desk**. Vibey feels like **your operator**, not another employee card you have to open first.

---

## Evidence Pack

- `apps/web/src/app/(dashboard)/team/page.tsx` → `Team2Container`: Manage Agents shell; `?agent=` opens one agent; no agent = roster
- `apps/web/src/features/team-2/containers/TeamHrSideChatLayout.tsx` + `TeamHrSideChatPanel.tsx`: **Jaime** HR rail (hire/edit) — separate from Vibey ops
- `apps/web/src/features/team-2/components/hr-side-chat/build-team-hr-awareness-context.ts`: injects Manage Agents visible roster into Jaime chat — pattern to mirror for Vibey ops context
- `apps/web/src/features/team-2/components/AgentsGrid.tsx` / `AgentGridCard.tsx`: roster cards; status filter is active/deactivated only today
- `apps/web/src/features/team-2/components/Team2DetailView.tsx`: left = `ChatTab` only; right = info — **no Work tab**; opening Vibey today is just another agent DM
- `apps/web/src/lib/agents/mission-agents-api.ts`: `MissionAgent.status`; list cached 60s
- `apps/web/src/features/team-2/services/team-overview.service.ts`: live missions/tasks/traces/delegations + KPIs
- `apps/web/src/features/team-2/components/teams/TeamOverviewFeedSections.tsx`: Live work / Recent activity copy + rows
- `apps/web/src/features/team-2/hooks/use-team-overview-realtime.ts`: realtime for registry + missions
- `apps/web/src/features/mission-control/components/MissionQuickCapture.tsx` + `CampaignDashboardTab.tsx`: manual mission create
- `apps/agent-api/.../artifact-missions.service.ts` + chat profile context: Vibey can `create_mission` from chat
- `apps/mission-worker/.../ceo-operational-loop.service.ts` / awareness: background deploy path (Autopilot)
- `documentation/features/missions.md`: mission harness is the durable work model

---

## Recommended Approach

**`/team` with no `?agent=` opens the Vibey Ops Desk first; roster is the floor under/ beside it.**

1. **Vibey briefing landing** — greeting + synthesized “what’s happening” from live overview/mission stats + **Talk to Vibey** opens sidebar chat with **team ops awareness context** attached (idle/working counts, live focus list, blocked work).
2. User messages intent → Vibey uses existing tools (`create_mission`, assign agents, etc.) to deploy.
3. Roster cards show live focus; manual **Assign work** remains for direct control.
4. Specialist desks add Work tab (Now / Queue / Recent).
5. Jaime stays HR-only in the side rail.

**Why this shape:** The missing piece is not “smarter chat” — it is making Vibey the **default operator surface** on Manage Agents, with live team state in context so deploy-from-chat is grounded.

---

## UX Spec

### A. Default landing (`/team`, no agent) — “Vibey Ops Desk”

**First paint (required):**

1. **Greeting** — “Hey {firstName}.” (from profile/auth display name)
2. **Briefing message from Vibey** — short summary of live team state, not empty chat. Examples of content (data-backed, not invented fluff):
   - N agents working / M idle
   - Top live missions/tasks (titles + agent)
   - Blocked / needs-you items if any
   - One clear next prompt: “Tell me what’s on your mind, or pick someone below.”
3. **Talk to Vibey** — button opens the sidebar/global chat as Vibey with Ops Desk context attached (same idea as Spaces task → ROAS attach)
4. **Team floor** — roster grid/list below or in a secondary pane (desktop: briefing left/top, roster right/bottom)

**Layout sketch (desktop):**

```
┌──────────────────────────────────────────────┬─────────────┐
│ Vibey Ops Desk                               │ Jaime (HR)  │
│ “Hey Dylan.”                                 │ rail        │
│ Here’s what’s happening:                     │ (existing)  │
│  • 3 working · 2 idle                        │             │
│  • Lux → Q3 offer brief                      │             │
│  • Copywriter idle                           │             │
│ [ composer: tell Vibey what’s on your mind ] │             │
├──────────────────────────────────────────────┤             │
│ Team floor — Working / Idle filters          │             │
│ [agent cards with focus + Assign]            │             │
└──────────────────────────────────────────────┴─────────────┘
```

**Briefing generation (implementation options, pick in Phase 0):**

| Option | How | Pros |
|--------|-----|------|
| **A. Template briefing (V1)** | Client builds markdown/cards from overview KPIs + live items; show as system/assistant intro bubble | Deterministic, fast, no extra LLM call |
| **B. Vibey-authored briefing** | On land, start/reuse ops conversation; seed a hidden/system turn with live context; Vibey replies once | Feels more “alive”; costs a run |
| **C. Hybrid** | Template cards always; Vibey one-liner optional when Autopilot/credits allow | Best UX control |

**Recommend V1 = Option A (template) + live cards**, with composer ready. Upgrade to B/C later if the greeting feels too static.

**Ops awareness context injected into Vibey chat** (mirror Jaime’s `buildTeamHrAwarenessContext`, new builder e.g. `build-team-ops-awareness-context.ts`):

- Page: Manage Agents / Ops Desk
- Counts: working / idle / blocked missions
- Live focus list (agent → title)
- Idle agent keys/names (candidates to assign)
- Instruction: user intent should be turned into missions/assignments; prefer `create_mission` with `assigned_agent_key` when deploying specialists
- Instruction: if campaign is unclear from the message or active context, **ask which campaign** before `create_mission` — never silently default to General

### B. Roster — “the floor” (under briefing)

Each `AgentGridCard` shows:

1. **Presence** — Working / Idle / Online / Offline
2. **Current focus** (one line) or “Nothing assigned”
3. **Assign work** + **Chat** / open desk

Toolbar: Working / Idle filters. Counts strip: `N working · M idle`.

Opening a specialist → their desk. Opening Vibey from roster → same Ops Desk (or Vibey’s Work + Chat), not a disconnected empty DM.

### C. Agent desk (`/team?agent=…`) — specialists

```
┌─────────────────────────────┬──────────────────┐
│ Work | Chat                 │ Info (existing)  │
│ Now · Queue · Recent        │ Skills/Comms/…   │
└─────────────────────────────┴──────────────────┘
```

### D. Assign work (manual override)

Same as before: modal + `MissionQuickCapture` + `assigned_agent_key`. Complements Vibey deploy — does not replace it.

### E. Product voice (briefing)

- Greeting uses real user name.
- Summary is factual from live data.
- Empty floor: “Nobody’s on a mission. Tell me what you want to move, or assign someone below.”
- Idle callout: “{Name} is free.”

---

## Step-By-Step Implementation Plan

### Phase 0 — Contract / evidence

1. Confirm org-scoped live data available without forcing a teamId (overview is team-scoped today). If Manage Agents is org-wide, either:
   - Aggregate live items across teams / missions list for org, or
   - Add lightweight `GET /api/agents/ops-summary` → `{ greeting_name, counts, live_focus[], idle_agents[], blocked[] }`
2. Confirm Vibey chat on Team can receive injected awareness context (same path as Jaime / Loop side chats).
3. Confirm `create_mission` from Vibey chat works with `assigned_agent_key`. **Campaign rule (locked):** if campaign is clear from user message or context, use it; if unclear, Vibey must ask before creating the mission — do not silently default to General.

### Phase 1 — Vibey Ops Desk landing (ship first)

4. `Team2ManageContent` / `Team2Container`
   - When `manageSection === 'agents'` and no `?agent=` → render **Ops Desk** shell, not bare grid only
5. New `VibeyOpsDesk.tsx` (team-2)
   - Greeting with user display name
   - Template briefing from live summary (Option A)
   - Composer → Vibey conversation (reuse `ChatTab` / agent chat panel patterns with `agent_key=vibey`)
6. New `build-team-ops-awareness-context.ts`
   - Inject working/idle/live focus/idle candidates + deploy instructions
   - Tests: builder includes idle agents and live titles; truncates safely
7. `apps/web/src/features/team-2/config/messages.config.ts` (create if missing)
   - Greeting / empty-floor / idle copy (Vibey persona)
8. Tests: landing shows greeting + summary without selecting an agent; composer targets Vibey

### Phase 2 — Roster visibility + manual assign

9. Status filters Working/Idle; realtime `agents_registry`; focus lines on `AgentGridCard`
10. `AgentAssignWorkModal` + `createMission` with `assigned_agent_key`
11. Tests: idle/working card; assign payload

### Phase 3 — Specialist Work desks

12. `AgentWorkTab` Now / Queue / Recent on `Team2DetailView`
13. Opening Vibey from roster returns to Ops Desk (or Vibey Work+Chat with same ops context) — avoid a blank DM

### Phase 4 — Autopilot on Ops Desk (later)

14. Surface org `AwarenessToggle` on Ops Desk header for Vibey
15. No per-specialist autopilot runtime

### Docs / changelog

16. Update Team/Missions docs when shipped; changelog per change

---

## Data And Contract Map

### Ops Desk briefing

| Concern | V1 |
|---------|----|
| Input | Auth user display name; agents list; live missions/tasks (org or team aggregate) |
| Output | Greeting + summary cards/bubbles + Vibey chat thread |
| Side effects | User messages → Vibey tools → `create_mission` / updates; roster refreshes via realtime |
| Campaign | Clear from message/context → use it; unclear → Vibey asks before create (no silent General) |

### Manual assign

| Concern | V1 |
|---------|----|
| Input | Agent key; campaign_id; mission brief |
| Storage | `missions`, outbox, `agents_registry.status` |
| Side effects | Worker execute → Working |

**Focus resolution order:** current mission → assigned open mission → running Space task → streaming trace → idle

---

## Test Plan

- Unit: ops awareness builder; status filters; focus helper
- Component: Ops Desk greeting + empty/full summary; AgentGridCard; Assign modal
- Integration: message path has ops context; createMission from modal
- Manual: land `/team` → see “Hey {name}” + live summary → tell Vibey to deploy → specialist shows Working; idle agent Assign works without Vibey

---

## Rollout And Verification

- Phase 1 can ship alone (Ops Desk + template briefing + Vibey chat)
- Verify Jaime HR rail still works for hire/edit
- Rollback: feature gate Ops Desk → previous AgentsGrid-only landing

---

## Out of scope (explicit)

- Replacing Jaime with Vibey for HR/hiring
- New per-agent Autopilot runtime
- Rebuilding Mission Control route
- Requiring LLM briefing on every page load (V1 uses template summary)

---

## Open Product Questions

1. ~~**Campaign for Vibey-deployed missions**~~ **Locked:** if campaign is clear from message/context, use it; if unclear, **Vibey asks** before creating the mission. No silent General default.
2. ~~**Ops Desk vs full-bleed chat**~~ **Locked:** roster always visible under Vibey.
3. ~~Manual Assign~~ **Locked:** keep Assign work as override path.
4. ~~Autopilot on Ops Desk~~ **Locked:** surface org Autopilot toggle on Ops Desk (done via `AwarenessToggle`).

## Implementation status (2026-07-16)

Shipped in web:

- `VibeyOpsDesk` briefing + **Talk to Vibey** CTA → opens sidebar global chat, attaches Ops Desk awareness, and **auto-sends a check-in kickoff** so Vibey greets with floor context and asks what to focus on
- Roster focus lines, Working/Idle filters, Assign work modal
- Autopilot toggle on Ops Desk header (with clear “what this means” copy)
- Specialist desks: Work | Chat tabs with Now / Queue / Recent
- Roster realtime: `agents_registry` status patched live; missions refetch for focus labels

Still open:

- (none for V1–V3 plan slices)

---

## Success Criteria

- Open `/team` → within seconds see **Vibey greeting by name** + **what’s happening**
- Can open sidebar Vibey from Ops Desk with team context attached; Vibey can create/assign missions
- Can still see idle vs working on the floor and assign manually
- Opening a specialist shows what they’re on / recently shipped
- Jaime remains HR; Vibey remains ops
- Roster working/idle updates without waiting on the 60s agents list cache
