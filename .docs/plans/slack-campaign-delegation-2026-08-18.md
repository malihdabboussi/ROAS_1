# Slack “I need this done” → campaign-linked Portal tasks

**Status:** Spec only. Not implemented.  
**Date:** 2026-08-18  
**Canonical repos (do not use worktrees/clones unless the user says so):**

- Portal: `/Users/dylanvanas/Projects/page-grader` (`dylanvanas1/page-grader`)
- Platform: `/Users/dylanvanas/Projects/roas-platform` (`dylanvanas1/roas-platform`)

**Copy of this spec also lives at** `roas-platform/.docs/plans/slack-campaign-delegation-2026-08-18.md`.

This is a **ROAS Platform Slack Pixel feature**, with Portal as the fulfillment sink. Do not revive Page Grader as the Slack conversation owner.

---

## 1. Product

An operator pastes or types a plain-English ask to **Pixel in Slack**, for example:

> Reset ads for Yasir’s webinar. QC the funnel at &lt;url&gt;. Confirm GHL automations are still firing.

Pixel should:

1. Resolve **client + campaign** from the message, thread, Slack channel stamp, or **one** clarifying question.
2. Split the ask into **3–5 typed fulfillment tasks** (funnel / ghl / ad / copy / design / video).
3. Reply with **one confirm link**. No silent create.
4. The operator reviews in Portal Pixel: answer leftover questions, dismiss rows, Confirm.
5. Confirm creates real Portal + ClickUp work **under that campaign**. If the campaign has `client_campaigns.clickup_task_id`, ClickUp tasks get `parent` set to that id.

v1 input is the Slack message (and its thread). Full client-channel archaeology is later.

### Acceptance — Yasir webinar (prod shape)

Ask in Slack as above, for Yasir Khan Coaching LTD + the current webinar campaign.

**Pass**

- One Slack reply with one Portal URL (`https://portal.roas.io/?delegation=<uuid>` is enough; any pathname works).
- Opening it loads Pixel with a 3-row preview (funnel QC, GHL check, ads reset).
- After Confirm, three tasks exist on that webinar campaign, not as unlinked All Requests rows.
- ClickUp subtasks nest under the campaign parent when `clickup_task_id` is set.

**Fail**

- Silent MCP/createWork with no confirm.
- One Mahnoor “Webinar Reactivation” row (`WebinarResetPanel`) unless the user explicitly asked for that panel flow.
- Campaign `event_date` / budget mutated in the same breath.
- `PAGE_GRADER_SLACK_CONVERSATIONS_ENABLED=true` as the primary path.
- `request_type === "campaign"` rows auto-creating a **new** campaign. We want **tasks under** a campaign.

---

## 2. Ownership

| Side | Owns |
|---|---|
| **ROAS Slack Pixel** | Detect “get this done” intent. Resolve Portal `client_id` + `campaign_id`. Optional thread text. Call Portal parse. Reply with **one** confirm URL. Ask at most one clarifying question. |
| **Page Grader** | `pixel-delegate` parse / preview / confirm. Persist `campaign_id`. Confirm creates typed requests **linked to that campaign** (ClickUp parent). Deep link `?delegation=`. |

Silent create is out. Confirm is the commit.

User-facing Slack copy must say **The ROAS Portal**, never “Page Grader”. See `roas-platform/packages/agent-policy/src/platform-tools-template.ts` and `docker/agents/vibey/skills/page-grader-operator/SKILL.md`.

---

## 3. What already exists — do not rebuild

### 3.1 Portal parse → preview → confirm (the right sink)

`supabase/functions/pixel-delegate/index.ts`

| Action | Behavior |
|---|---|
| `parse` | LLM extracts up to 20 tasks. Persists `pixel_delegations` (`status: pending`). Returns `tasks` + `delegation_id`. |
| `confirm` | Atomic `pending → confirming`. Fans out to `clickup-service-requests`. |
| `cancel` | Marks cancelled. |
| `load` | Returns the row for `?delegation=`. |
| `slack-toggle-dismiss` / `slack-set-message-ts` | Legacy Portal Slack Block Kit. Do not use as the v1 ROAS UX. |

Parse body today:

```ts
{
  action: "parse",
  raw_text: string,           // required, max 12000
  client_id?: string,
  client_name?: string,       // LLM hint
  source: "portal" | "slack", // check constraint — only these two
  user_id?: string,
  slack_channel_id?: string,
  slack_thread_ts?: string
}
```

**There is no `campaign_id` on parse, persist, or confirm.** That is the main Portal gap.

Confirm `createOneTask` **skips** `request_type === "campaign" | "unclear"` (`pixel-delegate/index.ts` ~523–536). Funnel / ghl / ad are already routable. Do not treat “work under a campaign” as `request_type: "campaign"`.

Confirm does **not** pass `campaignId` into `clickup-service-requests`, even though that function already parents ClickUp tasks when `campaignId` is present (`loadCampaignContext`, `taskPayload.parent = campaign.clickup_task_id` around 1824–1831).

### 3.2 Portal confirm UI + deep link

- Preview: `src/components/pixel/DelegationPreview.tsx`
- Chat host: `src/components/pixel/PixelChat.tsx` (`action: "load"` / `confirm` / `cancel`)
- Deep link: `src/contexts/GlobalAskBrainContext.tsx` reads `?delegation=<uuid>` on **any pathname**, opens Pixel, strips the param.
- Confirm URL to post in Slack: `https://portal.roas.io/?delegation=<id>` (or `/launcher?delegation=<id>`). Do not invent a new route.

### 3.3 Portal Slack Block Kit (retired)

`supabase/functions/slack-bot-commands/index.ts` `tryProcessDelegation` (~7313) already:

- Detects a “delegation block”
- Resolves client from `clients.slack_channel_id` or a unique name mention
- Calls `pixel-delegate` parse with `source: "slack"`
- Posts Block Kit with a portal URL

**This path is off.** `PAGE_GRADER_SLACK_CONVERSATIONS_ENABLED` must be `"true"` or the function returns 200 and ignores events (~324–336). ROAS owns Slack conversations. Do not turn this flag on as the product path. Copy the parse + URL pattern into the **ROAS** Slack agent instead.

### 3.4 Campaign nesting on create (already works if you pass the id)

`supabase/functions/clickup-service-requests/index.ts`

- `create-service-request-task` and `create-design-request-task` accept `campaignId` / `campaignTag`.
- `loadCampaignContext` loads `client_campaigns.clickup_task_id`.
- If set, ClickUp POST gets `parent`.

Portal tables/routing for campaign subtasks: `src/lib/campaign-subtask-routing.ts` (wizard path, not Pixel). Pixel confirm uses `clickup-service-requests` directly.

### 3.5 ROAS Slack Pixel (the right conversation owner)

- Events: `apps/api/src/modules/slack/services/slack-service-events.base.ts`
- Thread history: `slack-service-conversation.base.ts` (`conversationsRepliesAll`, `getChannelHistorySince`)
- Channel search: `slack-channel-history-search.ts` (v1: use thread + current message; do not skim the whole client channel)
- Channel → client stamps: tests in `apps/api/src/modules/slack/services/__tests__/slack-pixel-scenario-matrix.test.ts` (`LIVE_CHANNEL_STAMPS`)
- Policy: Pixel may `ask_agent` / `delegate_to_agent` for **other ROAS agents**, not Portal `pixel-delegate`. Fulfillment goes through Page Grader MCP / send-work today.

### 3.6 ROAS → Portal work create (wrong for this feature)

`PageGraderSendWorkService` (`apps/api/src/modules/integrations/page-grader/services/page-grader-send-work.service.ts`)

- Requires existing Space items (`space_id` + `space_item_ids`).
- Calls Portal `POST /work` (`PageGraderIntegration.createWork`).
- Payload `source.system: 'roas'`. **Does not send `campaign_id` or `source.origin: "page_grader"`** on the current tree.
- Creates immediately. No parse preview.

Used by Spaces bulk send (`apps/web/src/features/spaces/components/PageGraderBulkSendPanel.tsx`) and post-call auto-delegation (`apps/api/src/modules/spaces/services/meeting-follow-up-page-grader-delegation.ts`) **after** a meeting confirm.

Portal `POST /work` is the finalized native-task mirror. Documented in `page-grader/docs/ROAS_SEND_TASKS_API.md`. It is **not** the Pixel parse/confirm path.

### 3.7 Page Grader MCP (wrong for this feature)

`page_grader_create_fulfillment_request` (`supabase/functions/page-grader-mcp/index.ts` `createFulfillmentRequest`)

- Inserts a `workload_tasks` row immediately (idempotent on `external_id`).
- Skill: `docker/agents/vibey/skills/page-grader-operator/SKILL.md` — one request per call, then report the created record.
- No batch preview. No confirm link.

`page_grader_list_clients` / `page_grader_list_campaigns` **are** the right read tools for resolving ids before parse.

### 3.8 Adjacent features that look similar — leave them alone

| Feature | Path | Why not this |
|---|---|---|
| Webinar Reset | `src/components/clients/WebinarResetPanel.tsx` | One “Webinar Reactivation” `workload_tasks` row assigned to Mahnoor. Does not update `event_date` / budget. Copy says previous campaign stays untouched. |
| Campaign Pixel intake plan | `docs/CAMPAIGN_PIXEL_INTAKE_PLAN.md` | Creates/fills a **campaign** from a brief. Different product. |
| Launcher Bulk Request | `BulkRequestTab` + `bulk-service-request` | Structured AM spreadsheet. |
| Delegation Desk | `documentation/features/page-grader-mcp-bridge.md` | Space intake → Pixel creates Space work. Not Portal Pixel confirm. |
| From Pagegrader assignees | `team_member_assignments` | Do not change JA/AM/NT/NB identity map. |

---

## 4. Recommended architecture

```
Slack message / thread
        │
        ▼
ROAS Pixel (classify → client/campaign resolve)
        │  one question if client XOR campaign missing
        ▼
Portal  POST  pixel-delegate  action=parse
        { raw_text, client_id, campaign_id, source: "slack", … }
        │
        ▼
pixel_delegations row (pending) + campaign_id
        │
        ▼
Slack reply:  Review in The ROAS Portal: https://portal.roas.io/?delegation=<id>
        │
        ▼
Operator opens link → PixelChat load → DelegationPreview
        │  edit / dismiss / pick client if needed
        ▼
pixel-delegate action=confirm
        │  campaign_id on every clickup-service-requests call
        ▼
Typed ClickUp + Portal rows nested under campaign
```

Do **not** create Space items first and then `sendWork`. Do **not** loop MCP create. Do **not** enable Portal Slack conversations.

### Why pixel-delegate rather than POST /work or MCP

- Already splits one paste into many typed tasks.
- Already has a confirm UI and `?delegation=` deep link.
- Already idempotent (`pending → confirming`).
- Missing piece is **campaign stamp + ROAS-owned Slack entry**.

`POST /work` and MCP writes skip the human confirm the product requires.

---

## 5. Portal implementation

Branch from current `main`. Small, testable PR.

### 5.1 Schema

`pixel_delegations` today (`supabase/migrations/20260506201356_*.sql` + `types.ts` ~15454): `client_id`, `source` (`portal` \| `slack`), Slack ids, `raw_text`, `parsed_tasks`, `confirmed_tasks`, `status`. **No `campaign_id`.**

Add migration `YYYYMMDDHHMMSS_pixel_delegations_campaign_id.sql`:

```sql
ALTER TABLE pixel_delegations
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES client_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pixel_delegations_campaign
  ON pixel_delegations (campaign_id)
  WHERE campaign_id IS NOT NULL;
```

Regenerate or hand-update `src/integrations/supabase/types.ts` `pixel_delegations` Row/Insert/Update.

Keep `source` as `portal` | `slack`. ROAS Slack uses `source: "slack"`. Do not add `roas_slack` unless you also migrate the check constraint; it is not needed.

### 5.2 `pixel-delegate` parse

Accept optional `campaign_id` (UUID). Validate it belongs to `client_id` when both are set (`client_campaigns.client_id`). Persist on insert (~954–967). Return it on the parse JSON.

If `campaign_id` is set, include campaign **name + type + event_date** in the LLM user prompt so titles mention the webinar, not a generic “ads task”.

Prompt guidance: when a campaign is already chosen, **do not** emit `request_type: "campaign"`. Emit `funnel` / `ghl` / `ad` / etc. Keep `campaign` only for “create a new campaign” with no parent id.

### 5.3 `pixel-delegate` confirm

- Load `campaign_id` from the `pixel_delegations` row; allow body override (preview picker).
- Persist override like today’s `client_id` override (~338–345).
- Pass `campaignId` into both `create-design-request-task` and `create-service-request-task` payloads in `createOneTask`.
- **Do not** skip funnel/ghl/ad because a campaign is set.
- Still skip `request_type === "campaign"` (create-campaign) and `unclear`.

Confirm forwards the caller `Authorization` to `clickup-service-requests` so ClickUp shows the human as creator. ROAS Slack parse can use service role; **confirm from the Portal UI** still uses the logged-in user JWT. That is correct — the operator who clicks Confirm is the submitter.

### 5.4 Preview UI

`DelegationPreview.tsx` / `PixelChat.tsx`:

- Show resolved campaign name when `delegation.campaign_id` is set (load via existing campaign hooks or include `campaign_name` on `load`).
- Optional: campaign picker when `client_id` is set and `campaign_id` is null. Not required for Yasir if Slack resolved it.
- Do not auto-dismiss funnel/ghl/ad rows.

### 5.5 Optional: `POST /roas-api/delegations`

If you do not want ROAS calling `pixel-delegate` with the service-role/anon key, add a thin `roas-api` route (same auth as `POST /work`: `ROAS_API_KEY` / `agent_api_keys`):

`POST /delegations`

```json
{
  "client_id": "uuid",
  "campaign_id": "uuid",
  "raw_text": "...",
  "source": "slack",
  "slack_channel_id": "...",
  "slack_thread_ts": "...",
  "user_id": "optional portal user uuid"
}
```

Handler: call the same `parse()` used by `pixel-delegate` (extract a shared module if the copy is more than ~20 lines). Return `{ ok, delegation_id, tasks, confirm_url }`.

`confirm_url` = `https://portal.roas.io/?delegation=<id>` (`APP_URL` env, same pattern as `sendblue-webhook`).

This is the preferred machine contract. `PageGraderIntegration` already speaks `roas-api`.

### 5.6 Tests (Portal)

- Parse with `campaign_id` persists it; mismatched client/campaign → 400.
- Confirm payload to `clickup-service-requests` includes `campaignId`.
- `request_type: "funnel"` is **not** skipped when `campaign_id` is set.
- `request_type: "campaign"` still skipped.
- Deep link: `?delegation=` still captured in `GlobalAskBrainContext` (existing behavior — add a regression test if none).

---

## 6. Platform implementation

Branch from **`origin/main`** (or the team’s current default). Current local branch may be dirty WIP (`codex/meetings-agenda-canonicalization`). Do not implement in `.worktrees/`.

### 6.1 New capability (keep it small)

Add a dedicated path so Pixel does not “forget” and MCP-create instead.

**Preferred:** a vibey/backend action or small Nest service, not a 2k-line skill-only prompt.

Suggested files:

- `apps/api/src/modules/integrations/page-grader/services/page-grader-delegation.service.ts`
  - `parsePortalDelegation({ clientId, campaignId, rawText, slackChannelId, slackThreadTs })`
  - Uses existing vault creds + `PageGraderIntegration` HTTP helper (add `createDelegation` next to `createWork`).
- `apps/api/src/modules/integrations/page-grader/integrations/page-grader.integration.ts`
  - `POST ${baseUrl}/delegations` (if 5.5 lands) **or** `POST ${functionsUrl}/pixel-delegate`.
- Wire from Slack agent tool catalog (same place other Page Grader writes are exposed to Pixel).

Return to the model: `{ confirm_url, delegation_id, task_titles[], client_name, campaign_name }`.

### 6.2 Slack Pixel behavior

Update, do not replace, `docker/agents/vibey/skills/page-grader-operator/SKILL.md` **and** Atlas counterpart:

**New rule (v1):** When the user asks to get fulfillment work done (funnel QC, GHL check, reset ads, “I need this done”, a paste of several jobs) for a named/stamped client:

1. Resolve Portal client (`page_grader_list_clients` or channel stamp → `client_scope_map`).
2. Resolve Portal campaign (`page_grader_list_campaigns`). Prefer the campaign named in the message (e.g. webinar). If the Slack channel maps 1:1 via `client_scope_map`, use that. If 0 or many, **one** question: “Which campaign — {A} or {B}?”
3. Collect `raw_text` = current message + quoted thread (already available via `conversationsRepliesAll`). Do not crawl the whole channel.
4. Call the new parse/delegation action once. Idempotency: Slack event `ts` → stable key so retries do not create a second `pixel_delegations` row (Portal parse always inserts today — **add optional `idempotency_key` / `slack_thread_ts` uniqueness** if double-posts are likely).
5. Reply with the `confirm_url` as a real https link. Do not claim tasks were created.
6. Do **not** call `page_grader_create_fulfillment_request` or `sendWork` for this intent.
7. Do **not** call `delegate_to_agent` for Portal fulfillment.

Keep existing single-item MCP create for “have Rafay build this one funnel” if you must, but the multi-job “I need this done” path must be parse + link.

Also add a short bullet to `packages/agent-policy/src/platform-tools-template.ts` Default Work Routing so it survives skill drift.

### 6.3 Client / campaign resolve (reuse, don’t invent)

| Signal | Where |
|---|---|
| Slack channel stamp | Pixel scenario matrix / slack observation stamps |
| `client_scope_map` | `page-grader-api.helpers.ts` `parseClientScopeMap`; Settings “Map clients” |
| Named client | MCP `page_grader_list_clients` |
| Named campaign | MCP `page_grader_list_campaigns` (`client_ref`) |
| Thread | `slack-service-conversation.base.ts` |

Portal campaign id is `client_campaigns.id`, **not** the ROAS `campaigns.id`. `client_scope_map` entries are `{ client_id, campaign_id, campaign_name, space_id }` where `campaign_id` is the **ROAS** campaign. You still need Portal `page_grader_list_campaigns` to get the Portal campaign UUID unless you add an explicit Portal campaign id to the map (out of scope unless already present — check `PageGraderClientScopeMappingSchema`; today it is ROAS campaign_id).

**Implementer note:** `UpsertPageGraderClientScopeMapSchema` uses `campaign_id` as the ROAS campaign. Resolve Portal campaign by listing Portal campaigns for the mapped `client_id` and matching name / latest webinar / user reply.

### 6.4 Tests (Platform)

- Delegation service posts `client_id`, `campaign_id`, `raw_text`, `source: "slack"` and returns `confirm_url`.
- Skill/policy tests: fulfillment multi-ask must mention confirm URL / must not mention `page_grader_create_fulfillment_request` as the first step (extend `page-grader-human-fulfillment-routing.test.ts` carefully — that file currently **requires** the MCP tool name for single-item funnel create; add a separate case for multi-task “I need this done”).
- Slack formatting: URL is a real `https://portal.roas.io/?delegation=` link.

---

## 7. Exact contracts

### 7.1 Portal parse (extended)

```json
{
  "action": "parse",
  "raw_text": "Reset ads for Yasir webinar. QC funnel https://…. Check GHL workflows.",
  "client_id": "<portal clients.id>",
  "campaign_id": "<portal client_campaigns.id>",
  "client_name": "Yasir Khan Coaching LTD",
  "source": "slack",
  "slack_channel_id": "C…",
  "slack_thread_ts": "123.456"
}
```

Response:

```json
{
  "ok": true,
  "delegation_id": "uuid",
  "tasks": [ { "draft_id": "…", "title": "…", "request_type": "funnel|ghl|ad|…", "…": "…" } ],
  "campaign_id": "uuid",
  "confirm_url": "https://portal.roas.io/?delegation=uuid"
}
```

`confirm_url` may be computed by ROAS if parse does not return it: `` `${PORTAL_APP_URL}/?delegation=${id}` ``.

### 7.2 Portal confirm fan-out payload (per task)

`create-service-request-task` body must include:

```ts
{
  clientId,
  clientName,
  title,
  description,
  priority,
  tagPrefix,      // [Funnel] | [GHL] | [Ad] | …
  serviceType,
  submitterName: "Pixel",
  campaignId,     // NEW — from pixel_delegations.campaign_id
  assignedMemberClickupId? 
}
```

Same `campaignId` on `create-design-request-task`.

### 7.3 ClickUp parent

Already implemented. No ClickUp API changes. If `clickup_task_id` is null on the campaign, tasks still get `campaign_id` on the Portal row; they just won’t nest in ClickUp. That is acceptable; do not invent a campaign ClickUp task.

---

## 8. Out of scope (v1)

- Webinar date / budget / Meta spend reset.
- Full Slack channel skim for outstanding work.
- Changing From Pagegrader assignee identity (Anees `81449732`, JA/AM/NT/NB).
- Enabling `PAGE_GRADER_SLACK_CONVERSATIONS_ENABLED`.
- Building a second confirm UI on `app.roas.io`.
- Auto-creating a Portal campaign (`request_type: "campaign"`).
- Recreating the Yasir tasks unless Link still fails **after** Portal UI + `roas-api` deploy of the earlier campaign_id / Link fix (PR page-grader #729, merged `eba2a9f80`).

---

## 9. Related shipped work (do not redo)

Portal `main` PR https://github.com/dylanvanas1/page-grader/pull/729 — ROAS-sourced All Requests rows can Link campaign + From Pagegrader assignees. **Merged ≠ live** until Portal UI + `roas-api` are deployed.

ROAS send-work still may omit `campaign_id` on `POST /work`. That is a **separate** follow-up (platform PR #284 class work). This spec’s confirm path uses `clickup-service-requests`, not `POST /work`. If you also want Slack-confirmed tasks to appear as `source=roas` workload rows, say so in the PR — default is Pixel’s existing ClickUp service-request create, plus `campaignId`.

---

## 10. Deploy order

1. Portal migration + `pixel-delegate` + preview + (optional) `roas-api` `/delegations`.
2. Deploy those functions (`pixel-delegate`, `roas-api` if touched, `clickup-service-requests` only if you changed it — parent already works).
3. Platform API + skill/policy.
4. Smoke Yasir (or a staging client) from Slack: parse → link → confirm → three campaign-linked tasks.

Preflight before any `git push` on Portal: see `.cursor/rules/preflight-before-push.mdc` (fetch, `tsc`, vitest, lint, schema-ref, migration timestamp).

---

## 11. Implementer checklist

Portal

- [ ] Migration `campaign_id` on `pixel_delegations`
- [ ] Parse/confirm/load persist and return `campaign_id`
- [ ] Validate campaign belongs to client
- [ ] `createOneTask` sends `campaignId`
- [ ] Prompt: don’t emit `request_type: campaign` when parent campaign is known
- [ ] Tests
- [ ] Optional `POST /roas-api/delegations`

Platform

- [ ] HTTP client method + service
- [ ] Slack/Pixel tool + skill + policy routing for multi-task “I need this done”
- [ ] Resolve Portal campaign UUID (not ROAS campaign id)
- [ ] Slack reply is one Portal confirm URL; never “created”
- [ ] Tests
- [ ] Do not implement inside `.worktrees/`

Done when Yasir’s Slack paste yields one link and, after Confirm, three tasks on the webinar campaign.
