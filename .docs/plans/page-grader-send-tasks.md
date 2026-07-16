# Page Grader → Send Space Tasks (API Contract + Plan)

**Status:** Implemented (pending deploy of Page Grader `roas-api` + ROAS api/web)  
**Date:** 2026-07-16  
**Scope:** Native ROAS ↔ Page Grader work handoff from Space task multi-select  
**Related:** Locked product decisions (chat 2026-07-16); brain ingest already exists reverse direction via `scripts/roas/ingest-roas-brain-package.py`

**Physical Page Grader base URL:**  
`https://mjaxhuehopzbsuhmseeg.supabase.co/functions/v1/roas-api`  
(logical contract paths `/clients`, `/work`, `/me` are relative to that base — not Nest `/api/v1/roas/*`)

---

## Architect Summary

ROAS Spaces already own meeting follow-ups and action items. Page Grader already owns client work (tasks / task requests). This feature connects them: multi-select Space tasks → bulk action **Send to Page Grader** → pick a Page Grader **client** → create one Page Grader task/request per Space task with an outline payload → write Page Grader ids back onto each Space item so the link is durable and re-sends are idempotent.

This is a **native** integration (code on both products), not Composio. ROAS stores connection credentials in `user_integrations` like Fathom/Slack. Page Grader exposes HTTPS list/create APIs that ROAS calls with that credential. Sync-back is required in v1 (not optional).

UX entry point: the existing Spaces bulk bar (`BulkActionBar.tsx`) — same surface as Move / Convert / Duplicate.

---

## Locked Decisions

| Decision | Choice |
|---|---|
| Type | Native (ROAS + Page Grader code) |
| Bulk UX | **Send to Page Grader** on task multi-select |
| Create | One Page Grader task/request **per** selected Space task, with outline details |
| Sync back | **Required** — store Page Grader ids on Space items |
| Destination | **Pick client** from Page Grader client list |
| Work type | Multi-step: client → **service request type** → **assignee** → **preview** → Send |
| Assignee | Prefer Space assignee email/name match to Page Grader profiles; else Attendees label match; else pick from `GET /assignees` or Unassigned |
| Preview | Show title, description/notes (+ optional operator note), priority, due, client, type, assignee before Send |
| Client ↔ tag | First send creates/reuses a Space tag named like the client; map stored on integration metadata; later sends default that client from task tags (override allowed) |
| Client ↔ campaign/space | Settings **Map clients** (or “Map this campaign” on send) stores `metadata.client_scope_map`; default order: space map → campaign map → tags → name match (Impact → Impact Elite Coaching) |
| Assignees | Map where email/identity matches; otherwise create unassigned / assign in Page Grader |

**Out of scope for v1**

- Chat/agent tool to send tasks (bulk bar only)
- Bidirectional status sync (Page Grader → ROAS status updates)
- Brain package ingest changes (already separate path)
- Creating new Page Grader clients from ROAS
- Docs / media bulk send (`bulkItemKind === 'doc'`)

---

## Evidence Pack

| Path | Evidence |
|---|---|
| `apps/web/src/features/spaces/components/BulkActionBar.tsx` | Bottom portal bar; `PanelKey` + `FloatingPanel`; Move/Convert/Duplicate/Delete patterns; `bulkApply` / `toastResult` |
| `apps/web/src/features/spaces/components/ListView.tsx` | Primary consumer; wires selection → `BulkActionBar` |
| `apps/web/src/lib/spaces/space-item-types.ts` | `SpaceItem.custom_data: Record<string, unknown>` |
| `apps/api/src/modules/spaces/repositories/space-items.repository.ts` | `custom_data` shallow-merge on update |
| `apps/api/src/modules/spaces/services/space-automation-service-06.base.ts` | Fathom sync-back pattern: `custom_data.external_automation` + provider keys |
| `apps/api/src/modules/integrations/fathom/repositories/fathom.repository.ts` | Native `user_integrations` row (`integration_id`, tokens, `metadata`, `scope_mode`, `org_id`) |
| `apps/web/src/features/settings/components/settings-content/IntegrationCard.tsx` | Catalog connect UI (`auth_type` branches, including `api_key`) |
| `apps/web/src/features/settings/components/settings-content/FacebookPagePickerModal.tsx` | Post-connect external resource picker (closest client-picker pattern) |
| `scripts/roas/ingest-roas-brain-package.py` | Existing Page Grader → ROAS brain path; stamps `campaigns.context.page_grader_client_id` — **not** Space item sync |

**Missing evidence (blocks final wire shapes on Page Grader side only)**

- No Page Grader OpenAPI / route code lives in this repo.
- Contract below is the **shared proposal** both products implement. Confirm/adjust field names against Page Grader’s real task + client models before coding the Page Grader receiver.

---

## Recommended Approach

1. **Page Grader** ships authenticated HTTPS endpoints: list clients, create task/request (idempotent by ROAS `space_item_id`).
2. **ROAS** adds `page_grader` as a native integration (API key + base URL in `user_integrations`).
3. **ROAS API** owns the send orchestration: resolve credential → call Page Grader → patch Space item `custom_data`.
4. **ROAS web** adds bulk bar panel: client picker + optional note → call ROAS send endpoint → refresh list.

Do not invent a second task system in either product. Do not store Page Grader tokens only in the browser.

---

## API Contract (shared)

Base URL: configured per connection (e.g. `https://pagegrader.example.com`).  
Auth: `Authorization: Bearer <api_key>` (or `X-Api-Key`) — exact header name is a Page Grader implementation choice; ROAS will send whatever the connection config defines. Default proposal: `Authorization: Bearer`.

All request/response bodies are JSON. Timestamps ISO-8601 UTC.

### 1. List clients

`GET /api/v1/roas/clients`

**Query (optional)**

| Param | Type | Notes |
|---|---|---|
| `q` | string | Name search |
| `limit` | number | Default 50, max 100 |

**Response `200`**

```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "Impact Elite",
      "status": "active"
    }
  ]
}
```

Used by the Send dialog and (optionally) Settings post-connect default-client picker.

### 2. Create work from ROAS Space task

`POST /api/v1/roas/work`

**Idempotency:** Page Grader MUST treat `(source = "roas", space_item_id)` as unique. Re-POST with the same `space_item_id` returns the existing work object (`200`) instead of creating a duplicate (`201` on first create).

**Request**

```json
{
  "client_id": "uuid",
  "note": "optional operator note from bulk dialog",
  "source": {
    "system": "roas",
    "org_id": "uuid",
    "space_id": "uuid",
    "space_item_id": "uuid",
    "space_url": "https://app.roas.io/..."
  },
  "work": {
    "kind": "task",
    "title": "Draft 90-day inner circle offer page; send to current cohort",
    "description": "Markdown or plain text outline from Space item + parent context",
    "priority": "normal",
    "due_at": "2026-07-20T00:00:00.000Z",
    "tags": ["webinar", "offer-page"],
    "assignees": [
      {
        "email": "dylan@example.com",
        "name": "Dylan Vanas",
        "roas_user_id": "uuid"
      }
    ],
    "context": {
      "parent_meeting_title": "Webinar debrief — Yasir Khan",
      "parent_space_item_id": "uuid",
      "fathom_url": "https://...",
      "recording_url": "https://...",
      "call_kind": null
    }
  }
}
```

**`work.kind`:** `"task"` | `"task_request"` — Page Grader maps to its internal model. v1 ROAS always sends `"task"` unless Settings later expose a default kind.

**Response `201` / `200`**

```json
{
  "work": {
    "id": "uuid",
    "kind": "task",
    "client_id": "uuid",
    "url": "https://pagegrader.example.com/clients/.../tasks/...",
    "assignee_resolution": [
      {
        "email": "dylan@example.com",
        "status": "mapped",
        "page_grader_user_id": "uuid"
      },
      {
        "email": "unknown@example.com",
        "status": "unmapped"
      }
    ]
  }
}
```

**Errors**

| HTTP | Meaning |
|---|---|
| `400` | Invalid payload / missing `client_id` |
| `401` | Bad API key |
| `404` | Unknown `client_id` |
| `409` | Conflict (only if idempotency key collides with different payload — prefer overwrite-or-ignore; document choice) |
| `422` | Client exists but cannot accept work |

### 3. (Optional v1.1) Health / whoami

`GET /api/v1/roas/me` → `{ "ok": true, "workspace_name": "..." }` for Settings connect validation.

---

## ROAS storage contract (sync-back)

On successful create, shallow-merge into `space_items.custom_data`:

```json
{
  "external_automation": {
    "provider": "page_grader",
    "client_id": "uuid",
    "work_id": "uuid",
    "work_kind": "task",
    "work_url": "https://...",
    "sent_at": "2026-07-16T18:00:00.000Z",
    "sent_by_user_id": "uuid"
  }
}
```

Mirrors Fathom’s `custom_data.external_automation` nesting. Dedup / “already sent” UI reads `external_automation.provider === 'page_grader' && work_id`.

Re-send behavior (v1): if `work_id` present, skip create and toast “Already in Page Grader” (or offer Open link). Server still may call Page Grader idempotent POST; prefer client-side skip for speed.

---

## ROAS API (internal)

All under org-scoped auth (`RequestScope`), same as other Spaces/integrations routes.

### Connect / disconnect

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/integrations/page-grader/connect` | Body: `{ base_url, api_key }` → upsert `user_integrations` (`integration_id: 'page_grader'`, encrypt/store key like other API-key integrations) |
| `POST` | `/api/integrations/page-grader/disconnect` | Mark disconnected / delete row per existing pattern |
| `GET` | `/api/integrations/page-grader/status` | `{ connected, base_url_host, connected_at }` |

### Proxy / orchestration

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/integrations/page-grader/clients?q=` | Proxy to Page Grader list clients |
| `POST` | `/api/integrations/page-grader/send` | Body below → create work + sync-back |

**`POST /api/integrations/page-grader/send`**

```json
{
  "client_id": "uuid",
  "note": "optional",
  "space_id": "uuid",
  "space_item_ids": ["uuid", "uuid"]
}
```

**Server steps (per item)**

1. Load Space item (+ parent meeting title / Fathom URLs from `custom_data` when present).
2. If already has `external_automation.provider === 'page_grader'`, mark result `skipped_already_sent`.
3. Build Page Grader payload from item fields (`title`, description/notes, assignees, due, tags, links).
4. `POST` Page Grader `/api/v1/roas/work`.
5. Merge sync-back into `custom_data`.
6. Collect per-item results.

**Response**

```json
{
  "success": true,
  "results": [
    {
      "space_item_id": "uuid",
      "status": "created",
      "work_id": "uuid",
      "work_url": "https://..."
    },
    {
      "space_item_id": "uuid",
      "status": "skipped_already_sent",
      "work_id": "uuid",
      "work_url": "https://..."
    },
    {
      "space_item_id": "uuid",
      "status": "failed",
      "error": "client_not_found"
    }
  ]
}
```

---

## UI plan

### Settings

- Catalog card **Page Grader** (`auth_type: 'api_key'` + base URL field).
- Files: `useIntegrations.ts` catalog entry; connect handler → `/api/integrations/page-grader/connect`.
- Optional after connect: default client id into `user_integrations.metadata.default_client_id` (Facebook page picker pattern).

### Spaces bulk bar

- File: `BulkActionBar.tsx`
  - Extend `PanelKey` with `'pageGrader'`.
  - Toolbar button **Send to Page Grader** (tasks only; hide for `bulkItemKind === 'doc'`).
  - `FloatingPanel` → client searchable list + optional note + Send.
  - Call `POST /api/integrations/page-grader/send` with selected ids.
  - Toast created / skipped / failed counts; `onRefresh` + clear selection on full success.
- Wire props through `ListView.tsx` (and subtask bar only if product wants subtasks sendable — **v1: top-level + subtasks both allowed** if selected).

### Item affordance (small)

- If `custom_data.external_automation.provider === 'page_grader'`, show a subtle “In Page Grader” link using `work_url` (row or task detail). Can ship in same PR or immediate follow-up.

---

## Step-by-step implementation

### Phase A — Page Grader (other repo)

1. Implement auth for ROAS API keys.
2. Implement `GET /api/v1/roas/clients`.
3. Implement `POST /api/v1/roas/work` with idempotency on `source.space_item_id`.
4. Assignee mapping: match by email; leave unmapped when no user.
5. Smoke test with curl using a real client id.

### Phase B — ROAS backend

1. New module under `apps/api/src/modules/integrations/page-grader/` (controller / service / repository), following Fathom layout lightly (API-key, not OAuth).
2. `user_integrations` rows: `integration_id: 'page_grader'`, `provider: 'page_grader'`, store API key via existing vault/encryption path used by other API-key integrations.
3. Routes: connect, disconnect, status, clients, send.
4. Send service builds outline from Space item + parent context; writes `custom_data.external_automation`.
5. Tests: connect validation; send happy path (mocked Page Grader HTTP); idempotent skip; partial failure aggregation.
6. Register catalog metadata so Integrations overview / status recognize `page_grader`.
7. Changelog entry; feature doc under `documentation/features/` when behavior ships (ask before new doc if none exists).

### Phase C — ROAS web

1. Settings catalog + connect modal fields (`base_url`, `api_key`).
2. `BulkActionBar` panel + API client helper in spaces services.
3. Messages/toasts via feature messages config if Spaces already has one; else local sonner strings matching Vibey tone, log config gap in follow-up work.
4. Manual test: Meetings space → select 3 follow-ups → pick client → verify Page Grader work + Space item `custom_data`.

### Phase D — Hardening (same release if cheap)

1. Respect org scope / personal connection visibility (same class of bug as Slack personal→org).
2. Rate-limit send endpoint.
3. Don’t send deleted / archived items.

---

## Data And Contract Map

| Concern | Detail |
|---|---|
| Input | Selected `space_item_ids`, `client_id`, optional `note` |
| Validation | Connected integration; items belong to `space_id` + org; non-empty titles |
| AuthN/Z | Session user + org scope; only that user’s (or org-shared) Page Grader credential |
| Storage | `user_integrations` (credential); `space_items.custom_data.external_automation` (sync-back) |
| Output | Per-item create/skip/fail + Page Grader URLs |
| Side effects | HTTPS create on Page Grader |
| Idempotency | Page Grader unique on `space_item_id`; ROAS skip if `work_id` already present |

---

## Test Plan

- **Unit:** payload builder (title, parent meeting, Fathom URLs); custom_data merge shape; skip-already-sent.
- **Integration:** send endpoint with mocked Page Grader HTTP (nock/msw); repository update merge.
- **Manual:** Settings connect → Meetings multi-select → Send → open Page Grader URL → re-send shows skipped.
- **Regression:** Bulk Move/Convert/Duplicate unchanged; Fathom `external_automation` keys not clobbered (shallow merge must nest-merge `external_automation` carefully — **implement nested merge for that key** so Fathom metadata is not wiped).

**Nested merge note:** Space item updates today shallow-merge top-level `custom_data`. Writing `external_automation: { provider: 'page_grader', ... }` would replace an existing Fathom `external_automation` object. Send service must read existing `external_automation`, and if `provider === 'fathom'`, store Page Grader under a sibling key instead:

```json
{
  "page_grader": {
    "client_id": "...",
    "work_id": "...",
    "work_kind": "task",
    "work_url": "...",
    "sent_at": "...",
    "sent_by_user_id": "..."
  }
}
```

**Amended sync-back (preferred):** use top-level `custom_data.page_grader` object (not nested inside `external_automation`) to avoid colliding with Fathom. UI/dedup reads `custom_data.page_grader.work_id`.

---

## Rollout

1. Deploy Page Grader API endpoints first (or behind flag).
2. Deploy `roas-api` with connect + send.
3. Deploy `roas` web with Settings + bulk bar.
4. Connect with a non-prod API key; send 1 task; verify DB `custom_data.page_grader` and Page Grader UI.
5. Rollback: disconnect integration; hide bulk button behind env/feature flag if needed (`NEXT_PUBLIC_PAGE_GRADER_SEND=1`).

---

## File-level change map (ROAS)

| File (existing or new) | Change |
|---|---|
| `apps/api/src/modules/integrations/page-grader/` **(new)** | Module: controller, service, repository, DTOs, HTTP client |
| `apps/api/src/modules/integrations/` module registry | Import Page Grader module |
| `apps/api/src/modules/spaces/...` (send service only) | Load items + update `custom_data.page_grader` via existing space items repo |
| `apps/web/.../useIntegrations.ts` | Catalog + connect/disconnect |
| `apps/web/.../BulkActionBar.tsx` | `pageGrader` panel + button |
| `apps/web/.../ListView.tsx` | Pass-through if new props required |
| `apps/web/.../spaces.service.ts` (or sibling) | `sendToPageGrader()`, `listPageGraderClients()` |
| `.docs/logs/changelogYYYY-MM-DD.md` | On ship |
| `documentation/features/page-grader-send.md` | On ship (create after confirm) |

---

## Acceptance criteria

- [ ] User connects Page Grader in Workspace Settings with base URL + API key.
- [ ] Multi-select ≥1 Space task → **Send to Page Grader** appears.
- [ ] Dialog lists Page Grader clients; user picks one; optional note.
- [ ] Each selected task creates (or idempotently returns) Page Grader work with title + outline context.
- [ ] Space item gains `custom_data.page_grader.work_id` + `work_url`.
- [ ] Task Activity shows “sent this to Page Grader” with clickable **Open in Page Grader** (`work_url`).
- [ ] Send panel Deadline + note write to Page Grader and back to the ROAS Space task.
- [ ] New create pushes ClickUp via `clickup-push-workload-task` (Slack launch posts still typed-path only).
- [ ] Re-send does not duplicate work; re-send retries ClickUp when still missing.
- [ ] Assignees mapped by email when possible; otherwise work still created.
- [ ] Fathom meeting metadata on the same item is not wiped.

---

## Open items (non-blocking for ROAS scaffolding)

1. Exact Page Grader route prefix / auth header name (confirm with Page Grader repo).
2. Whether Page Grader prefers `task` vs `task_request` for funnel-page builds (default `task` until confirmed).
3. Whether default client should be sticky per Space or per org integration metadata.
4. Feature flag name / whether web ships gated.

Once Page Grader confirms §API Contract field names, implementation can start on both sides in parallel (Phase A ∥ Phase B).
