# Org-Mode Fathom Sharing — Implementation Plan

**Status:** Draft, pending review
**Owner:** Sefy + agent
**Created:** 2026-05-13
**Prereq shipped:** Personal multi-rule fan-out (`processFathomRecordingEvent` loop)

---

## Locked decisions

These are decided. No further debate without product input.

| # | Decision | Locked answer |
|---|---|---|
| 1 | How does an automation pick whose Fathom to listen to? | (A) **specific user** + (C) **team of users**. Pick one or the other per rule. Reuse existing team primitive. |
| 2 | Privacy of synthetic Space item + transcript | Inherits Space access. If sales team is in the sales space, sales team sees the items. Admin can carve out a private "management" space with sales view if they want segregated analysis. |
| 3 | Who creates rules using shared Fathom | Personal rules: only the Fathom owner. Org-shared rules: **only org owner/admin**. A regular org member CANNOT build a rule pointing at another member's Fathom. |
| 4 | Billing | Personal Fathom rule fires → **rule creator's personal credits**. Org-shared Fathom rule fires (in org context) → **org credits**. No cross-charging. |
| 5 | Revocation lifecycle | Sales rep disconnects Fathom OR un-shares it → all rules pointing at that Fathom auto-disable + notification dispatched to each rule's creator. |

---

## Locked answers to design questions

All answered 2026-05-13. No further debate without product input.

### A1 — Team primitive

**`agent_teams` + `agent_team_members`** (migrations `20260504170000_agent_teams_and_grants.sql` and `20260505100000_agent_team_members_and_policy_rls.sql`).

This is the same primitive that powers the **Teams** section in the Team-2 sidebar (verified in `SidebarTeam2Flyout.tsx` line 8: `import { useTeams } from '@/features/agent-teams/hooks/use-teams'`). Despite the misleading "agent_teams" name, the schema supports BOTH agents (via `agents_registry.team_id`, single FK — agent belongs to one team) AND humans (via `agent_team_members(team_id, user_id)`, many-to-many).

For Fathom routing we use **only the human side**: `agent_team_members.user_id` is the list of humans in a team.

### A2 — Rules point at `user_integrations.id`

The Fathom trigger source stores the `user_integrations.id` UUID, not the user_id. This naturally distinguishes a user's personal Fathom (org_id NULL, scope_mode=personal) from an org-shared connection.

### A3 — Team filter is rule-side

The `user_integrations` row stays simple (`personal` or `org_shared`). The rule's `trigger.source.mode = 'team'` carries the team_id. At webhook time the engine resolves the team's human members and checks if the Fathom owner is one of them.

---

## Step-by-step plan

The plan is split into 5 ordered phases. Each phase is independently shippable.

### Phase 0 — Prereq (DONE)

- [x] Personal multi-rule fan-out fix shipped today
- [x] Schedule double-fire fix shipped today
- [x] Composio silent-failure fix shipped today
- [x] Contact-route scalability fix shipped today

### Phase 1 — Make Fathom integration shareable

**Goal:** A Fathom owner can flip their connection from `personal` to `org_shared` from the integrations settings UI. Org admins can see all org-shared Fathoms.

**Backend:**
- Update `FathomOAuthService.upsertUserIntegration` to accept an `org_id` and `scope_mode` parameter (currently hard-codes `org_id: null`).
- Add `FathomOAuthService.setScopeMode(userId, integrationId, mode: 'personal' | 'org_shared')` — leverages existing `user_integrations.scope_mode` column.
- New endpoint: `PATCH /api/integrations/fathom/share { mode: 'personal' | 'org_shared' }`.

**Frontend:**
- In `IntegrationsManage.tsx` Fathom card, add a "Share with org" toggle (only visible when in org context AND user is an admin/owner OR the connection's owner).
- When toggled on: call the new endpoint.

**Validation:**
- Existing `user_integrations` RLS policies already cover this. Verified via `20260422140000_integration_scope_modes.sql`.

**Estimated effort:** 1 day. Mostly UI wiring; the DB primitive exists.

### Phase 2 — Rule builder picks a Fathom source

**Goal:** When building a Fathom-triggered rule, the user picks WHICH Fathom to listen to: their own, a specific shared person's, or a team.

**Backend:**
- New endpoint: `GET /api/spaces/:id/automations/fathom-sources` — returns:
  - The current user's own connected Fathom (if any).
  - All `org_shared` Fathom integrations in the active org.
  - The list of teams in the active org (depends on Q1 answer).
- Extend the automation `trigger` JSONB schema to include:
  ```ts
  {
    type: 'external_fathom_recording_ready',
    source: { mode: 'self' } | { mode: 'user', user_id: UUID } | { mode: 'team', team_id: UUID },
    title_contains?: string,
    recorded_by_contains?: string
  }
  ```
- Permission check at save time: if `source.mode === 'user'` or `'team'` AND the rule creator is NOT an org admin/owner → reject (per locked decision #3).

**Frontend:**
- Update `AutomationRuleEditor` Fathom trigger UI:
  - Step 1: pick source mode (radio: "My Fathom" / "Specific person" / "Team").
  - Step 2: depending on choice, show person picker or team picker.
- Use existing roster/team-pickers (the `roster: TeamRosterEntry[]` prop is already plumbed into `AutomationsPanel`).

**Estimated effort:** 2–3 days. The picker UX is the most work.

### Phase 3 — Webhook routing fan-out

**Goal:** When Fathom recording arrives from User X, fire every rule that should listen to X's recordings — across personal rules, org-shared rules with `mode: 'user', user_id: X`, and org-shared rules with `mode: 'team'` where X is a member.

**Backend:**
- Update `processFathomRecordingEvent`:
  - Identify the Fathom-owning user (already done).
  - Look up routes in three buckets:
    1. Personal: `user_id = ownerUserId AND scope: 'personal'`
    2. Specific-user: `source.user_id = ownerUserId` (any rule in any org)
    3. Team: `source.team_id IN (teams where ownerUserId is a member)`
  - Union, dedupe by `(automation_id)`, loop through and fire each (already loop-shaped after today's fix).
- Apply `fathomRouteFiltersMatch` per route as today.
- Per-rule execution context (`ctx.userId`, `ctx.orgId`):
  - For personal rules: `ctx.userId = ownerUserId`, `ctx.orgId = null`.
  - For org-shared rules: `ctx.userId = rule.created_by`, `ctx.orgId = rule.org_id`. **(This is the billing routing per locked decision #4.)**

**Schema:**
- The existing `space_external_automation_triggers` row needs to know what source-mode it represents. Two options:
  - (a) Store `source` JSONB on the row (mirror of trigger.source).
  - (b) Look up the rule's `trigger.source` at webhook time.
- **Recommend (a)** — denormalized for performance. The webhook lookup becomes index-friendly.

**Migration:**
- `ALTER TABLE space_external_automation_triggers ADD COLUMN source JSONB;`
- Backfill existing Fathom rows with `source = '{"mode":"self"}'` (matches today's behavior).

**Estimated effort:** 2–3 days. Mostly query construction + tests.

### Phase 4 — Revocation + auto-disable

**Goal:** When a Fathom owner disconnects OR un-shares, every dependent rule auto-disables and the rule's creator gets notified.

**Backend:**
- Hook into `FathomOAuthService.disconnect()`: after marking integration disconnected, query all rules pointing at that user's Fathom (across all three modes), set `enabled=false`, `last_error='Fathom owner disconnected'`, dispatch notification to each rule's `created_by`.
- Same for `setScopeMode('personal')`: any rule pointing at this Fathom as `org_shared` (i.e., another user's rule) gets disabled.
- Re-use existing notification dispatch (`notifications.dispatch` in spaces module — I noticed it referenced in the test failure earlier).

**Frontend:**
- In settings, when toggling Fathom off, show a confirmation: "X automations will be disabled. Continue?"
- In `AutomationsPanel`, render `last_error` next to disabled rules so the user sees WHY it's off.

**Estimated effort:** 1–2 days.

### Phase 5 — Visibility surface for org admin

**Goal:** Admin can see all connected accounts (Fathom + Composio) across everyone in the org, in one place.

**Backend:**
- New endpoint: `GET /api/orgs/:id/integrations/connected` — returns all `user_integrations` rows where `org_id = :id`, joined with profile info, grouped by integration.
- Permission: org admin/owner only.

**Frontend:**
- New section in org settings: "Org Connected Accounts" table with columns (Person, Integration, Scope, Connected At, Status).

**Estimated effort:** 1 day. Mostly read-side.

---

## What I am NOT doing in this plan

- Cross-org Fathom sharing (org A shares with org B). Out of scope.
- Multi-Fathom-account-per-user. Today the OAuth flow assumes 1 Fathom = 1 user. If a user has multiple Fathom accounts (rare), they get one connection at a time.
- Auto-tagging of recordings by team membership (smart routing). Out of scope.
- A Fathom-specific quota or rate limit. Existing credits gating handles it.

---

## Risks

| Risk | Mitigation |
|---|---|
| Backfill of existing Fathom rules to `source = {"mode":"self"}` could miss rules being edited concurrently | Migration runs in single transaction; rules table has `updated_at` for optimistic locking already. |
| User shares Fathom, admin builds 10 rules, user immediately revokes → cascade of 10 disable events | Batch the disable + notification. Single notification listing all 10 rules. |
| Privacy leak: shared Fathom transcript ends up in a Space the user thought was private | Decision #2 punts this to UX. Surface a "this Space inherits from shared Fathom — anyone with Space access can see transcripts" warning at rule save time. |
| Composio scope_mode and Fathom scope_mode diverge in behavior | Reuse the same `user_integrations.scope_mode` column for both. Same RLS, same UI patterns. |

---

## Estimated total

**Phases 1–5 sequentially: ~7–10 working days** (roughly 1 sprint).

No new team table needed (decision A1 — reuse `agent_teams`).
No new integration scope concept needed (decision A2/A3 — reuse `user_integrations.scope_mode`).

---

## Ready to start Phase 1

All three locked. Awaiting "go" to implement Phase 1 (Make Fathom integration shareable).
