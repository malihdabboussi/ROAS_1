# Personal Integrations In Org (Private To You) — Implementation Plan

**Status:** Implemented 2026-07-20  
**Created:** 2026-07-19  
**Owner:** Dylan + agent  
**Related:** `.docs/plans/fathom-org-sharing.md` (share-with-org is a different model); `documentation/features/integration-connections.md`

---

## Architect Summary

Today, switching into an organization workspace hides most personal-account integrations. A small allowlist (Slack, Fathom, Fireflies, Page Grader, OpenAI Codex, Anthropic Claude) intentionally reappears in org Integrations Manage / status by merging the caller’s personal `user_integrations` rows (`org_id IS NULL`). **Google Calendar is not on that list**, so Agenda / calendar APIs resolve no connection in org even though the same user is connected in Personal Account.

Product intent locked by Dylan (2026-07-19):

1. **Personal tools should remain available to you inside an org** (you are still you).
2. **Other org members must not see or use your personal calendar** (or other private personal connections).
3. Org Integrations Manage currently showing Slack / Fathom / Codex / Page Grader as connected is **not a bug** for those allowlisted providers — but it feels inconsistent next to missing calendar, and Page Grader client mapping while in org needs clear rules so testing does not “screw things up.”

This plan makes calendar (and other personal-use tools we choose) follow the **existing private cross-context pattern**: visible and usable **only for the owning user** in org context; never listed to teammates; never treated as `org_shared` unless the user explicitly shares.

Page Grader stays on the allowlist. The plan adds clarity + guardrails so Map clients / send-work while in ROAS org uses **org campaigns/spaces** with **personal credentials**, without inventing a second Page Grader connection.

---

## Evidence Pack

- `apps/api/src/modules/integrations/services/integrations-status.service.ts`  
  - `PERSONAL_CROSS_CONTEXT_PROVIDERS` = `fathom`, `fireflies`, `slack`, `page_grader`, `openai_codex`, `anthropic_claude` (no `google_calendar`).  
  - In org scope, after loading `org_id = scope.orgId` rows, merges the user’s personal row (`user_id = me`, `org_id IS NULL`) for allowlisted ids only.

- `apps/api/src/modules/integrations/services/integrations-overview.service.ts`  
  - Same allowlist (inline array ~lines 110–117). Powers Workspace Settings → Integrations → Manage.  
  - Explains why Dylan sees Slack / Fathom / Codex / Page Grader connected in ROAS org: personal rows are merged into the overview for **that user only**.

- `packages/api-shared/src/services/org-scope.service.ts`  
  - `applyOwnerScope`: org context → `eq('org_id', orgId)` only; personal-account rows (`org_id null`) are excluded unless a service merges them separately.

- `apps/api/src/modules/integrations/services/integrations-calendar.service.ts`  
  - `listScopedIntegrationRows` uses `orgScope.applyScope` then filters `org_shared` (all members) / `personal` (owner only) **within the org’s rows**.  
  - Does **not** merge personal-account (`org_id null`) calendar rows → Agenda empty in org.

- `apps/docs/content/organization/how-organizations-work.mdx`  
  - Docs currently say integrations are “personal vs org’s shared” and describe org-context Personal vs All Org scopes for **new** connections in org — they do **not** document personal-account cross-context allowlist behavior.

- `apps/api/src/modules/integrations/page-grader/services/page-grader-api.service.ts`  
  - Connection + vault secrets + `client_scope_map` live on **personal** `user_integrations` (`org_id IS NULL`).  
  - `sendWork` / brain import accept `orgId` from active request scope so created Spaces/missions land in the **active org**, while credentials stay personal.

- `documentation/features/integration-connections.md`  
  - Agents already have a “personal fallback with approval” doctor pattern for some providers (e.g. Drive). Calendar Agenda path does not use that; it simply finds no connection.

- Screenshot / UX (2026-07-19): In ROAS org → Workspace Settings → Integrations → Manage shows Slack, Fathom, OpenAI Codex, Page Grader connected (allowlist). Calendar absent. User concerned Page Grader Map clients will behave inconsistently.

---

## Recommended Approach

**Extend the existing private cross-context allowlist** rather than inventing a second scoping system.

1. Add `google_calendar` (and optionally `outlook` if Agenda supports it the same way) to the shared allowlist constant.
2. Teach **calendar resolution** (not only overview/status) to merge the caller’s personal-account calendar row when in org — same privacy filter: only `user_id === current user`.
3. Extract one shared constant/helper so overview, status, and calendar cannot drift again.
4. UI: mark cross-context personal-account rows as **Personal (your account)** in Manage so they are not mistaken for org-shared.
5. Page Grader: document + lightly clarify in UI that the connection is **your personal Page Grader**, maps target **current-workspace** campaigns/spaces, and teammates do not inherit your API key.

**Not in this plan:** flipping calendar to `org_shared`; auto-copying `user_integrations` rows into the org; making all integrations cross-context at once.

---

## Locked Product Rules

| # | Rule |
|---|---|
| 1 | Personal-account calendar is usable by **you** in org context (Agenda, calendar status, connect checks that drive Agenda). |
| 2 | Other org members **never** see your personal-account calendar connection in Manage, Org tab, or API list results. |
| 3 | Explicit **Share with org** / `scope_mode = org_shared` remains a separate action; this plan does not auto-share. |
| 4 | Page Grader remains personal-cross-context: one personal credential set; Map clients while in ROAS writes mappings that point at **ROAS org** campaigns/spaces when those are selected. |
| 5 | Teammates do not receive your Page Grader vault secrets; they only see org artifacts (Spaces/missions) created in the shared workspace. |

---

## Step-By-Step Implementation Plan

### 1. Shared allowlist module

**New file:** `apps/api/src/modules/integrations/services/personal-cross-context-providers.ts`

- Change: Export `PERSONAL_CROSS_CONTEXT_PROVIDERS: ReadonlySet<string>` including existing providers **plus** `google_calendar` (and `outlook` only if calendar service already treats Outlook as a first-class Agenda provider — verify in `integrations-calendar.service.ts` before adding).
- Why: Overview and status currently duplicate the list; calendar has none → drift (Slack yes, calendar no).
- Contract: Pure constant; no DB reads.
- Tests: Small unit test that the set includes `google_calendar` and existing ids.
- Replace: Delete inline copies in overview + status; import the shared set.

### 2. Overview + status (Manage UI source of truth)

**Files:**
- `apps/api/src/modules/integrations/services/integrations-overview.service.ts`
- `apps/api/src/modules/integrations/services/integrations-status.service.ts`
- Matching tests under `apps/api/src/modules/integrations/services/__tests__/`

- Change: Import shared set; keep merge logic (org rows + my `org_id null` rows for allowlisted providers only).
- Why: Manage tab is where Dylan sees Slack/Fathom/Page Grader; calendar must appear the same way for consistency.
- Contract: In org overview, calendar personal row appears only for the requesting user; other members’ queries do not include it (`eq('user_id', user.id)` already enforces this).
- Tests: Org-context overview includes caller’s personal `google_calendar` and excludes another user’s personal calendar (add fixture with second user_id).

### 3. Calendar runtime resolution (Agenda actually works)

**File:** `apps/api/src/modules/integrations/services/integrations-calendar.service.ts`

- Change: In `listScopedIntegrationRows`, when `scope.orgId` is set and provider is allowlisted (calendar providers), also fetch the caller’s personal-account row (`user_id = userId`, `org_id IS NULL`, `integration_id = …`) and append if not already present — mirror status service merge.
- Why: Overview-only fix would show “connected” in settings while Agenda still empty (false consistency).
- Contract: `resolveConnection` / `resolveAllConnections` can use personal-account Composio connection id while `x-org-id` is the ROAS org.
- Tests: Unit/integration test that org-scoped agenda connection resolution returns the personal-account connection id for the owner and returns empty for a different user with no org calendar.

### 4. UI labeling (reduce “will this screw things up?”)

**Files (exact symbols after grep during implement):**
- `apps/web/src/features/settings/components/settings-content/ConnectedIntegrationCard.tsx`
- `apps/web/src/features/settings/components/settings-content/IntegrationAccountsGroup.tsx`
- `apps/web/src/lib/integrations/use-integration-overview.ts` (if needed to pass a flag)

- Change: When a Manage row’s source is personal-account cross-context (`org_id` null while active org is set — overview may need to expose `org_id` or a `source: 'personal_account'` field), show a clear pill: **Personal (only you)** vs **Shared with org**.
- Why: Dylan’s screenshot concern — connections look like org integrations; they are personal credentials projected into org UI.
- Contract: No change to who can connect/disconnect; label only + optional helper text on Page Grader: “Maps use this workspace’s campaigns; credentials stay on your account.”
- Tests: Component test for pill rendering when `org_id` is null in org context.

### 5. Page Grader consistency notes (no behavior rewrite in v1)

**Files:**
- `apps/web/src/features/settings/components/settings-content/PageGraderClientScopeMapModal.tsx` (copy only if a one-line helper exists / is easy)
- `documentation/features/integration-connections.md`
- `apps/docs/content/organization/how-organizations-work.mdx` (Integrations row + short callout)

- Change: Document that Page Grader is personal-cross-context; Map clients in org targets org campaigns/spaces; vault stays user-scoped; teammates do not see your Page Grader Manage card.
- Why: User will test Page Grader from ROAS org; they need confidence it will not silently overwrite personal-account Space mappings unless they pick personal destinations.
- **Implementation check during build:** Confirm Map clients campaign picker is filtered to **active org** when `x-org-id` is set (if it currently lists personal campaigns too, tighten filter — that is in-scope as a consistency fix).
- Tests: If campaign list API is org-scoped already, add/extend a test proving org header scopes destinations; if not, fix + test.

### 6. Docs + changelog

- Update `documentation/features/integration-connections.md` Decision Log: personal-account cross-context for calendar; privacy rule.
- Update org docs table so Integrations is not only “org’s shared” — mention private personal carry-over allowlist.
- Append `.docs/logs/changelogYYYY-MM-DD.md` on ship.

---

## Data And Contract Map

| Concern | Behavior |
|---|---|
| **Input** | Active org via `x-org-id`; user auth; existing personal `user_integrations` row for calendar |
| **Validation** | Allowlist membership; merge only `user_id === caller` and `org_id IS NULL` |
| **AuthZ** | No new roles. Teammates never receive another user’s personal-account rows |
| **Storage** | No migration. Do **not** duplicate calendar into an org row for this feature |
| **Output** | Overview/status include calendar for caller; Agenda uses same connection; Manage shows Personal pill |
| **Side effects** | Composio calls still keyed by user OAuth account (existing pattern) |
| **Idempotency** | Merge by integration row id; no duplicate cards |

---

## Page Grader Testing Guidance (for Dylan now)

Safe to use Page Grader from ROAS org **if**:

1. You understand the green “connected” card is **your personal** Page Grader projected into org Manage (allowlist), not an org-owned credential.
2. **Map clients** should point at **ROAS org** campaigns/spaces you intend to use for ROAS work.
3. Teammates will not see your Page Grader connection in their Manage list; they may see Spaces/missions created in the org if you send work into shared Spaces.
4. Disconnecting Page Grader in personal account removes the cross-context card in org too (same row).

Risk to avoid: mapping a client to a **personal-account** campaign while you think you are only touching ROAS — verify the destination picker during implement (step 5).

---

## Test Plan

- **Unit:** Shared allowlist; overview merge includes calendar for caller only; calendar `listScopedIntegrationRows` merge.
- **Unit:** Status `getIntegrationStatus('google_calendar')` in org returns connected when personal row exists.
- **Component:** Personal pill on Manage card for cross-context rows.
- **Manual:** Personal Account → confirm calendar works → switch to ROAS → Agenda shows events; second browser/user in same org does not see that calendar in Integrations; Page Grader Map clients only lists ROAS destinations.

---

## Rollout And Verification

1. Ship `roas-api` then `roas-web` (API first so Agenda works before UI pills).
2. Verify as Dylan on ROAS org: calendar appears under Manage with Personal pill; Agenda populates.
3. Verify as a second org member (or service-role query simulating their user id): no Dylan calendar row in their overview.
4. Rollback: remove `google_calendar` from allowlist + revert calendar merge (no DB cleanup needed).

---

## Out Of Scope

- Auto-sharing calendar with the org
- Migrating all Google connectors (Drive/Docs/Gmail) in the same PR unless explicitly expanded
- Redesigning Home feed scope (tasks/approvals) — already merges personal∪org via workspace feed
- Full Fathom org-sharing phases in `.docs/plans/fathom-org-sharing.md`

---

## Missing Evidence / Implement-Time Checks

1. **Outlook:** Confirm whether Agenda uses `outlook` with the same `listScopedIntegrationRows` path before adding it to the allowlist.  
   - Experiment: read calendar provider union in `integrations-calendar.service.ts`.  
   - Risk if skipped: Outlook still broken while Google works.

2. **Campaign picker org filter for Page Grader Map clients:** Confirm frontend list uses active org.  
   - Experiment: trace `PageGraderClientScopeMapModal` campaign fetch.  
   - Risk if skipped: accidental personal-campaign mappings while testing in ROAS.

3. **Agent tool path for calendar:** Confirm agents resolving `google_calendar` in org use status/overview merge or a separate resolver — if separate, apply the same allowlist merge there too.  
   - Experiment: grep agent connection resolver for `PERSONAL_CROSS_CONTEXT` / `google_calendar`.  
   - Risk if skipped: UI connected, agent still says disconnected.

---

## Acceptance Criteria

- [ ] In ROAS org, Dylan sees Google Calendar under Integrations Manage labeled personal-only.
- [ ] In ROAS org, Dylan’s Agenda/calendar features work using the personal-account connection.
- [ ] Another ROAS member does not see Dylan’s calendar connection.
- [ ] Page Grader remains usable from org Manage; docs/UI make “personal credential, workspace destinations” explicit.
- [ ] Allowlist lives in one shared module; overview/status/calendar cannot diverge.
