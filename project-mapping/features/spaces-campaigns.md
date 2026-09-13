# Feature: Spaces, Campaigns & Programs

> Read-only reverse-engineering, 2026-09-05. Evidence tags: **CONFIRMED** (read in code),
> **LIKELY** (one inference hop), **UNKNOWN**.
> This is the largest feature in the product: **946 files / ~155,900 lines** under
> `apps/web/src/features/spaces`, plus 42 controllers and **128 service files** under
> `apps/api/src/modules/spaces`.

## Status

**WORKING, but structurally overloaded** — the core (spaces → items → views → automations) is live,
realtime, and well covered by the UI; two named sub-features are deliberately switched off
(public space sharing hard-throws `'External sharing is paused'` at
`apps/api/src/modules/spaces/controllers/space-public-sharing.controller.ts:37`; the automation
queue path is disabled on Vercel at `space-automation-service-01.base.ts:510-516`), and the automation
engine is a **20-class inheritance chain across 20 files totalling 11,375 lines**, which is the
single worst architectural artefact in the repo.

## Purpose

A **Space** is the universal work container: a row-store (`space_items`) plus a JSONB `schema` that
declares its **fields** and its **views**. Every product surface that shows a list, board,
calendar, doc set, contact table, research grid, media library or report is _the same Space
rendered through a different view type_.

**Campaigns** and **Programs** sit _above_ Spaces as grouping layers, and **Projects** — despite
the similar name — is a completely different feature.

### The three-module question, resolved

**CONFIRMED. They are not three models of the same thing. They are a three-level hierarchy plus one
unrelated feature.**

```text
Program  (apps/api/src/modules/programs)      ← optional grouping label
   └─ Campaign  (apps/api/src/modules/campaigns)  ← campaigns.program_id
        └─ Space  (apps/api/src/modules/spaces)    ← spaces.campaign_id (nullable)
             └─ space_items                        ← the actual rows

Project  (apps/api/src/modules/projects)  ← UNRELATED: an AI app-builder
```

Evidence:

- **Space → Campaign** is a nullable FK. `spaces.campaign_id` is nullable, so a Space may be
  standalone ([`../06-database-map.md`](../06-database-map.md) §Spaces & campaigns).
- **Campaign → Program** is `campaigns.program_id`, grouped client-side by
  `apps/web/src/app/(dashboard)/campaigns/_lib/group-campaigns-by-program.ts:22`; a null or orphan
  `program_id` falls into a "General" bucket.
- **The Campaign detail page is a shell over Spaces.** `/campaigns/[id]` has nine toggleable tabs
  (`overview`, `dashboard`, `list`, `board`, `calendar`, `canvas`, `assets`, `knowledge`,
  `reporting` — `campaigns/[id]/_lib/campaign-nav-tabs.ts:2`), and its tab components import
  directly from the spaces feature: `CampaignReportingTab.tsx:6-10` renders
  `@/features/spaces/components/reporting/{CampaignOverviewView,EmailAnalyticsView,FunnelAnalyticsView}`,
  and `CampaignOverviewTab.tsx:19-21` calls `createSpace`/`fetchSpaces` and reads
  `useSpacesStore`. `CampaignTaskTab.tsx:24` rolls tasks up with
  `useTaskRollup({ scope: 'all', campaignId })`.
- **`campaigns` the _module_ is mostly not about campaigns.** 28 of its 31 controllers are
  **artifact** controllers — ads, ad sets, presentations, documents, blog posts, sequences, avatars,
  offers, social posts. Only `campaigns.controller.ts`, `campaign-agents`, `campaign-analytics` and
  the three `campaign-knowledge-*` controllers are campaign-scoped. `campaigns` is where generated
  content lives, not a second Spaces.
- **`projects` is an app builder.** Its repository touches `projects`, `project_repos` and
  `domains` (`apps/api/src/modules/projects/repositories/projects.repository.ts`), and the frontend
  is a code editor: `ProjectCodeView.tsx`, `ProjectAppPreview.tsx`, `RepoImportModal.tsx`,
  `ProjectSupabasePanel.tsx`, `database/DatabaseBrowser.tsx`, plus a Sandpack theme
  (`apps/web/src/features/projects/lib/sandpack-theme.ts`). `POST /api/projects/import/github`
  confirms it. It shares only the word "project".
- **`/lists` is the pre-rename URL** and now `permanentRedirect('/spaces')`
  (`apps/web/src/app/(dashboard)/lists/page.tsx:3`), matching the `lists`→`spaces` /
  `list_items`→`space_items` table rename.

## User Capabilities

- **Create, rename and delete Spaces**, with three system-provisioned variants —
  `ensure-default`, `ensure-general`, `ensure-flows-concept` (`spaces.controller.ts:76,87,98`).
- **Add / edit / delete / batch-edit / duplicate items**, drag to reorder, and create subtasks
  (`space-items.controller.ts:45-182`).
- **Undo agent edits to a task** — `POST /api/spaces/:id/items/undo` (`space-undo.controller.ts:28`).
- **Cancel a running agent on an item** — `POST /api/spaces/:id/items/:itemId/cancel-agent`
  (`space-item-agent-actions.controller.ts:24`).
- **Switch views.** 20+ view types declared in `ViewDef['type']`
  (`apps/web/src/features/spaces/types/space-schema.ts:662-682`): `list`, `table`, `kanban`,
  `missions`, `docs`, `contacts`, `channels`, `channel`, `calendar`, `canvas`, `media`,
  `form_responses`, plus the `SocialResearchViewType` family (instagram / tiktok / youtube /
  twitter / all_social), `ads_research`, the `ReportingViewType` set and the `ArtifactViewType` set.
- **Customise a view per user or for everyone** — personal overrides plus
  `POST /api/spaces/:id/views/:viewId/save-for-everyone` (`space-view-overrides.controller.ts:108`).
- **Define custom fields.** 19 field types — `text`, `number`, `select`, `multi_select`, `date`,
  `url`, `media`, `assignee`, `contact`, `checkbox`, `currency`, `email`, `phone`, `rating`,
  `progress`, `duration`, `created_at`, `updated_at`, `mission`
  (`apps/web/src/lib/spaces/space-schema-types.ts:1-20`). `duration` is hidden from the UI by
  `FIELD_TYPES_HIDDEN_FROM_UI` (`space-schema.ts:25-29`); the default field catalog a new Space
  gets is `NEW_SPACE_SCHEMA` (`space-schema.ts:~1300-1356`).
- **Share a Space with org members or teams** — `space_shares` with a `level` and an optional
  `allowed_view_ids` allow-list (`space-share-management.repository.ts:31-49`).
- **Share a single _view_** — `space_view_shares` (same repository, lines 66-117).
- **Share a single _item_**, optionally inheriting to children, and **invite by email** with a
  token (`space_item_shares`, lines 150-290).
- **Flip a Space between `private` and `team`** — `POST /api/spaces/:id/{make-private,make-team}`
  (`space-sharing.controller.ts:105,130`).
- **Generate a public share link** — `POST/DELETE /api/spaces/:id/share-link`
  (`space-sharing.controller.ts:155,174`). ⚠️ The **read** side of space share links is disabled;
  see [Known Problems](#known-problems) #2.
- **Instantiate a Space from a template** — browse the catalog and
  `POST /api/space-templates/:slug/instantiate` (`space-templates.controller.ts:43`).
- **Build automations** — a trigger/action rule builder with ~25 trigger types and ~35 action
  types (enumerated below), draft/publish lifecycle, a visual flow map, a runs log, and webhook
  endpoints with rotatable secrets.
- **Run social research** — track accounts across Instagram / TikTok / YouTube / X, score
  "outliers", run topic searches, save favourites into folders, and enrich items with caption /
  hook / transcript (`social-research.controller.ts`, `social-research-topic-searches.controller.ts`).
- **Run ads research** — search an ad library by platform, get an ad breakdown and details,
  browse advertisers, save results, and launch static-ad or IG-organic-video production
  (`ads-research.controller.ts:43-126`; `components/ads-research/*ProductionLauncher.tsx`).
- **View reporting** — campaign overview, email analytics, funnel analytics, social reporting,
  ads performance, finance overview, plus a customisable widget grid
  (`components/reporting/`, `ReportingCustomizePanel.tsx` at 1,788 lines).
- **Manage contacts inside a Space** — a contacts view with an info panel and an activity timeline
  (`components/contacts/`).
- **Edit rich documents** — a TipTap docs view (`DocsView.tsx`, 2,447 lines).
- **Chat with the space-scoped agent** — `SpaceVibeyChatPanel.tsx` (2,664 lines); see
  [`agent-runtime-chat.md`](./agent-runtime-chat.md).
- **See a "Your Turn" inbox** — items needing the user, backed by the `your_turn_items` view
  ([`../06-database-map.md`](../06-database-map.md) §Views).

## Entry Points

### Frontend

| Path / component                                           | File                                                                                                | Role                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/spaces`                                                  | `apps/web/src/app/(dashboard)/spaces/page.tsx` → `spaces-page-entry.tsx` → `spaces-page-client.tsx` | Space list + active space                                                           |
| `/spaces/[spaceId]`                                        | `apps/web/src/app/(dashboard)/spaces/[spaceId]/page.tsx`                                            | Deep link                                                                           |
| `/lists`                                                   | `apps/web/src/app/(dashboard)/lists/page.tsx`                                                       | `permanentRedirect('/spaces')`                                                      |
| `/campaigns`                                               | `apps/web/src/app/(dashboard)/campaigns/page.tsx` → `_components/CampaignsHub.tsx`                  | Campaign hub, grouped by Program                                                    |
| `/campaigns/[id]`                                          | `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`                                              | Campaign HQ, 9 tabs                                                                 |
| `/campaigns/[id]/finance`                                  | `finance/CampaignFinanceTabContainer.tsx`                                                           | Products, coupons, payment links, revenue                                           |
| `/programs`, `/programs/[id]`                              | `apps/web/src/app/(dashboard)/programs/`                                                            | Program hub                                                                         |
| `/clients`, `/client-campaigns`, `/launches`, `/all-tasks` | `apps/web/src/app/(dashboard)/`                                                                     | Agency-flavoured entry points over the same data                                    |
| container                                                  | `apps/web/src/features/spaces/containers/SpacesContainer.tsx`                                       | Loads spaces + roster, sets global-chat work context, `ensureDefaultSpace` on empty |
| container                                                  | `apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx` (1,488 lines)                     | The workhorse: renders the active view                                              |
| container                                                  | `apps/web/src/features/spaces/containers/YourTurnContainer.tsx`, `DelegationDeskWorkspace.tsx`      | Inbox and delegation surfaces                                                       |

### Backend

`apps/api/src/modules/spaces` — 42 controllers. Base paths observed in code:

- `@Controller('spaces')` — CRUD, items, sharing, view overrides, state, undo, agent actions
- `@Controller('spaces/:id/automations')` and `…/automations/flows`, `…/automations/webhooks`
- `@Controller('spaces/:id/ads-research')`, `@Controller('spaces/:id/social-research')`
- `@Controller('space-templates')` (separate `space-templates` module)
- `@Controller('programs')`, `@Controller('tasks')` (the `programs` module)
- `@Controller('campaigns')` and 28 artifact controllers (the `campaigns` module)
- internal / public: `space-automation-scheduler-internal`, `space-automations-internal`,
  `space-webhook-receiver`, `space-public-sharing`

**Route-count caveat.** [`../03-architecture.md`](../03-architecture.md) reports spaces **151** and
campaigns **61** (counted by path group); [`../05-api-map.md`](../05-api-map.md) reports spaces
**141** and campaigns **137** (counted by module directory, so every artifact controller lands
under `campaigns`). Both are right about different things — reconcile against
[`../05-api-map.md`](../05-api-map.md) before quoting a number.

## API Endpoints

The significant ones. For the complete inventory see [`../05-api-map.md`](../05-api-map.md).

| Method                | Route                                                                                                | Handler                                                                            | Purpose                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET                   | `/api/spaces`                                                                                        | `spaces.controller.ts:51` (`@RequireOrgRole('viewer')`)                            | Cursor-paginated space list                                                                |
| POST                  | `/api/spaces`                                                                                        | `spaces.controller.ts:65` (`editor`)                                               | Create                                                                                     |
| POST                  | `/api/spaces/ensure-default` · `…/ensure-general` · `…/ensure-flows-concept`                         | `spaces.controller.ts:76,87,98`                                                    | Idempotent system-space provisioning                                                       |
| POST                  | `/api/spaces/ensure-view`                                                                            | `spaces.controller.ts:112`                                                         | Idempotently add a view to a schema                                                        |
| GET/PATCH/DELETE      | `/api/spaces/:id`                                                                                    | `spaces.controller.ts:124,135,147`                                                 | Read / update schema / delete                                                              |
| GET/POST              | `/api/spaces/:id/items`                                                                              | `space-items.controller.ts:45,64`                                                  | List / create rows                                                                         |
| GET                   | `/api/spaces/:id/items/:itemId`                                                                      | `space-items.controller.ts:83`                                                     | Single row                                                                                 |
| PATCH                 | `/api/spaces/:id/items/batch`                                                                        | `space-items.controller.ts:102`                                                    | Bulk edit — note it precedes `:itemId`                                                     |
| PATCH/DELETE          | `/api/spaces/:id/items/:itemId`                                                                      | `space-items.controller.ts:121,163`                                                | Update / delete                                                                            |
| GET                   | `/api/spaces/:id/items/:itemId/subtasks`                                                             | `space-items.controller.ts:182`                                                    | Subtask tree                                                                               |
| POST                  | `/api/spaces/:id/items/undo`                                                                         | `space-undo.controller.ts:28`                                                      | Revert agent edits                                                                         |
| POST                  | `/api/spaces/:id/items/:itemId/cancel-agent`                                                         | `space-item-agent-actions.controller.ts:24`                                        | Abort an agent working an item                                                             |
| GET                   | `/api/spaces/items/:itemId`                                                                          | `spaces-state.controller.ts:52`                                                    | Space-less item lookup (second read path)                                                  |
| GET                   | `/api/spaces/recent-automation-runs`                                                                 | `spaces-state.controller.ts:30`                                                    | Runs log feed                                                                              |
| GET/PATCH             | `/api/spaces/user-state` · `/api/spaces/:id/user-state`                                              | `spaces-state.controller.ts:46,69`                                                 | Per-user nav/view state                                                                    |
| GET/POST/DELETE       | `/api/spaces/:id/shares[/:shareId]`                                                                  | `space-sharing.controller.ts:39,59,79`                                             | `space_shares` CRUD                                                                        |
| POST                  | `/api/spaces/:id/make-private` · `…/make-team`                                                       | `space-sharing.controller.ts:105,130`                                              | `spaces.visibility`                                                                        |
| POST/DELETE           | `/api/spaces/:id/share-link`                                                                         | `space-sharing.controller.ts:155,174`                                              | Mint / revoke `spaces.share_token`                                                         |
| GET                   | `/api/spaces/shared/item/:token`                                                                     | `space-public-sharing.controller.ts:22` — **`@Public()`**                          | Public item view                                                                           |
| GET                   | `/api/spaces/shared/space/:token`                                                                    | `space-public-sharing.controller.ts:32` — **`@Public()`**                          | 🔴 **Unconditionally 404s** — `throw new NotFoundException('External sharing is paused')`  |
| GET/PATCH/DELETE      | `/api/spaces/:id/view-overrides[/:viewId]`                                                           | `space-view-overrides.controller.ts:68,77,96`                                      | Personal view state                                                                        |
| POST                  | `/api/spaces/:id/views/:viewId/save-for-everyone`                                                    | `space-view-overrides.controller.ts:108`                                           | Promote an override to the shared schema                                                   |
| GET                   | `/api/spaces/:id/automations/flows[/:automationId]`                                                  | `space-automations.controller.ts:51,70`                                            | Read rules                                                                                 |
| POST                  | `/api/spaces/:id/automations/flows/drafts`                                                           | `space-automations.controller.ts:92`                                               | Draft a rule                                                                               |
| GET                   | `…/automations/flows/build-context` · POST `…/plans` · POST `…/build-sessions`                       | `space-flow-builder.controller.ts:29,41,60`                                        | Agent-assisted flow authoring                                                              |
| GET/POST/PATCH/DELETE | `/api/spaces/:id/automations/webhooks[/:endpointId]`                                                 | `space-webhooks.controller.ts:51,70,98,121`                                        | Webhook endpoints                                                                          |
| POST                  | `…/webhooks/:endpointId/rotate-secret` · GET `…/events`                                              | `space-webhooks.controller.ts:143,165`                                             | Secret rotation / delivery log                                                             |
| POST                  | `/api/flow-webhooks/:publicToken`                                                                    | `space-webhook-receiver.controller.ts:24` — `ThrottlerGuard` + `x-vibey-signature` | **Inbound** automation trigger                                                             |
| GET                   | `/api/internal/space-automations/process-due`                                                        | `space-automation-scheduler-internal.controller.ts:12` — inline `CRON_SECRET`      | Vercel-cron fan-out                                                                        |
| POST                  | `/api/internal/spaces/:id/automations/resume`                                                        | `space-automations-internal.controller.ts`                                         | Resume a paused run — ⚠️ [`../05-api-map.md`](../05-api-map.md) records **no guard found** |
| POST                  | `/api/spaces/:id/ads-research/:platform/{search,ad-breakdown,ad-details,save}` · GET `…/advertisers` | `ads-research.controller.ts:43,71,93,126,111`                                      | Ad-library research                                                                        |
| POST                  | `/api/spaces/:id/social-research/:platform/{topic-search,topic-search/score,topic-search/save}`      | `social-research.controller.ts:33,54,76`                                           | Topic research                                                                             |
| POST                  | `…/social-research/:platform/items/:itemId/{comments,breakdown,analyze}`                             | `social-research.controller.ts:103,128,152`                                        | Per-post enrichment                                                                        |
| GET/POST/PATCH/DELETE | `…/social-research/topic-searches[/:searchId]` (+ `refresh`, `load-more`)                            | `social-research-topic-searches.controller.ts:24-154`                              | Saved searches                                                                             |
| GET                   | `/api/space-templates` · `/:slug` · POST `/:slug/instantiate`                                        | `space-templates.controller.ts:28,34,43`                                           | Template catalog                                                                           |
| GET/POST/PATCH/DELETE | `/api/campaigns[/:id]`                                                                               | `campaigns.controller.ts:36,107,119,174`                                           | Campaign CRUD (soft delete + `PATCH :id/restore`)                                          |
| PATCH                 | `/api/campaigns/:id/context` · POST `…/generate-context`                                             | `campaigns.controller.ts:139,160` (+`CreditsGuard`)                                | Campaign brief; LLM-generated context                                                      |
| GET                   | `/api/campaigns/leaderboard` · `…/assignments/by-agent/:agentKey`                                    | `campaigns.controller.ts:67,80`                                                    | Agent workload views                                                                       |
| GET                   | `/api/tasks/**`                                                                                      | `apps/api/src/modules/programs/controllers/task-rollup.controller.ts:17`           | Cross-space task rollup used by Campaign HQ                                                |
| GET/POST              | `/api/programs/**`                                                                                   | `apps/api/src/modules/programs/controllers/programs.controller.ts:38`              | Program CRUD + sharing                                                                     |

## Main Files

### Frontend (`apps/web/src/features/spaces`)

| File                                                                                                                                                                        | Lines | Responsibility                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------- |
| `components/chat/SpaceVibeyChatPanel.tsx`                                                                                                                                   | 2,664 | Space-scoped agent chat panel                                                    |
| `components/DocsView.tsx`                                                                                                                                                   | 2,447 | TipTap docs view                                                                 |
| `components/automations/ActionBuilder.tsx`                                                                                                                                  | 2,121 | Editor for all ~35 automation action types                                       |
| `components/instagram-research/ContentAnalysisModal.tsx`                                                                                                                    | 1,940 | Per-post analysis                                                                |
| `components/reporting/ReportingCustomizePanel.tsx`                                                                                                                          | 1,788 | Reporting widget grid editor                                                     |
| `containers/SpaceItemsContainer.tsx`                                                                                                                                        | 1,488 | Active-view host                                                                 |
| `types/space-schema.ts`                                                                                                                                                     | 1,432 | `ViewDef`, `FieldDef`, `AutomationTrigger`, `AutomationAction`, all view configs |
| `components/ListView.tsx`                                                                                                                                                   | 1,336 | List / table view                                                                |
| `components/automations/automation-catalog.ts`                                                                                                                              | 1,326 | Trigger/action catalog metadata                                                  |
| `components/social-research/TopicSearchPanel.tsx`                                                                                                                           | 1,288 | Topic search UI                                                                  |
| `components/artifacts/ArtifactViews.tsx`                                                                                                                                    | 1,247 | Artifact view types                                                              |
| `store/use-spaces-store.ts`                                                                                                                                                 | 1,234 | Zustand store: spaces, items, view overrides, SWR caches, optimistic mutations   |
| `components/KanbanView.tsx`                                                                                                                                                 | 1,218 | Board view                                                                       |
| `components/automations/AutomationsPanel.tsx`                                                                                                                               | 1,110 | Rule list + lifecycle                                                            |
| `components/automations/TriggerBuilder.tsx`                                                                                                                                 | 1,084 | Editor for all ~25 trigger types                                                 |
| `components/ShareModal.tsx`                                                                                                                                                 | 827   | Space / view / item sharing UI                                                   |
| `views/registry.ts`                                                                                                                                                         | 61    | `resolveToolbar(viewType)` — the per-view toolbar registry                       |
| `hooks/use-space-items-realtime.ts`                                                                                                                                         | —     | Supabase Realtime on `space_items` **and** `spaces.schema`                       |
| `services/spaces.service.ts`                                                                                                                                                | —     | `/api/spaces*` fetch layer                                                       |
| `services/automations.service.ts`, `ads-research.service.ts`, `social-research.service.ts`, `space-templates.service.ts`, `your-turn.service.ts`, `delegation-*.service.ts` | —     | Per-domain fetch layers (16 services total)                                      |

### Backend (`apps/api/src/modules/spaces`)

| File                                                                                                                               | Lines            | Responsibility                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `services/space-automation-service-{01…19}.base.ts` + `space-automation.service.ts`                                                | **11,375 total** | The automation engine — a 20-level `extends` chain (see Business Logic)                                        |
| `services/space-automation-service-09.base.ts`                                                                                     | 802              | The action dispatch `switch` (`case 'create_task'`, `'send_to_agent'`, `'send_email'`, …)                      |
| `services/space-automation-service-06.base.ts`                                                                                     | 835              | Largest single link in the chain                                                                               |
| `services/space-automation-runtime.processor.ts`                                                                                   | —                | BullMQ `@Processor` for `agent-runtime-queue-automation` — 🔴 registered inside the Vercel function            |
| `services/space-automation-scheduler.service.ts`, `space-automation-reconciler.service.ts`, `space-automation-liveness.service.ts` | —                | Schedule triggers, mission-completion reconciliation, health                                                   |
| `services/org-automation-flows.service.ts`                                                                                         | —                | Org-level (space-less) flows                                                                                   |
| `repositories/space-share-management.repository.ts`                                                                                | 308              | `space_shares`, `space_view_shares`, `space_item_shares`, share links                                          |
| `repositories/space-permissions.repository.ts` + `services/space-permissions.service.ts`                                           | —                | Effective-permission resolution                                                                                |
| `modules/space-retrieval/services/space-retrieval-index.service.ts`                                                                | —                | Writes `space_semantic_chunks` / `space_semantic_objects` / `space_semantic_edges`                             |
| `modules/space-templates/data/space-template-catalog*.ts` (6 files)                                                                | —                | Template catalog: universal, specialized, personal-dashboard, delegation-desk, agency-client-webinar, builders |

## Database Tables

Cross-reference [`../06-database-map.md`](../06-database-map.md) §Spaces & campaigns.

| Table                                                                 | Columns that matter here                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spaces` (renamed from `lists`)                                       | `id`, `org_id` (**nullable = personal scope**), `user_id`, `title`, `campaign_id` (nullable), `is_template`, `visibility ∈ {private, team}`, `share_link_enabled`, `share_token`, **`schema` JSONB** (fields + views + legacy automations). 55 inbound FKs                                                                                                                                                                          |
| `space_items` (renamed from `list_items`)                             | `space_id`, `org_id`, `user_id`, `title`, `status ∈ {todo, in_progress, in_review, done}`, `priority ∈ {low, medium, high, urgent}`, `assignee_type ∈ {human, agent, unassigned}`, `assignee_id`, `source ∈ {manual, agent_suggested, template, fathom}`, `suggestion_state`, `linked_mission_id`, `parent_item_id`, `is_private`, `share_link_enabled`, `share_token`, `recurrence_parent_id`, `custom_data` JSONB. 24 inbound FKs |
| `space_automations`                                                   | `space_id`, `org_id`, `trigger` JSONB, `actions` JSONB, `enabled`, `is_draft`                                                                                                                                                                                                                                                                                                                                                       |
| `space_shares`                                                        | `space_id`, `org_id`, `entity_type`, `entity_id`, `level`, **`allowed_view_ids`**, `created_by`; unique on `(space_id, entity_type, entity_id)`                                                                                                                                                                                                                                                                                     |
| `space_view_shares`                                                   | same shape plus `view_id`; unique on `(space_id, view_id, entity_type, entity_id)`                                                                                                                                                                                                                                                                                                                                                  |
| `space_item_shares`                                                   | `item_id`, `space_id`, `entity_type`, `entity_id`, `level`, `inherit_to_children`, `invite_token`, `invited_email`, `invite_expires_at`                                                                                                                                                                                                                                                                                             |
| `space_semantic_chunks`                                               | `embedding vector(768)`, `scope_type`, `space_id`, `campaign_id`, `org_id` — the Space RAG index                                                                                                                                                                                                                                                                                                                                    |
| `space_semantic_objects`, `space_semantic_edges`                      | Structured retrieval graph over a Space                                                                                                                                                                                                                                                                                                                                                                                             |
| `space_ad_searches`, `space_topic_searches`                           | Saved ads / topic research runs                                                                                                                                                                                                                                                                                                                                                                                                     |
| `space_drive_folder_mappings`, `space_drive_push_channels`            | Google Drive sync (see [`../09-integrations.md`](../09-integrations.md))                                                                                                                                                                                                                                                                                                                                                            |
| `campaigns`                                                           | `user_id`, `program_id`, `name`, `campaign_type`, `status`, `goal`, `config` JSONB (holds `visible_campaign_tabs`, `system_kind`), `metrics`, `deleted_at`. 55 inbound FKs. ⚠️ **defined only in `supabase/schema.sql`**, not in the migration series                                                                                                                                                                               |
| `campaign_canvases`, `campaign_nodes` (`embedding`), `campaign_edges` | Campaign strategy graph                                                                                                                                                                                                                                                                                                                                                                                                             |
| `projects`, `project_repos`                                           | The **app builder** — unrelated. Note `projects` has **no RLS** ([`../06-database-map.md`](../06-database-map.md) §RLS)                                                                                                                                                                                                                                                                                                             |
| `missions`, `mission_subtasks`                                        | `space_items.linked_mission_id`; a DB trigger `sync_mission_status_to_space_item` writes mission status back into `space_items.status`                                                                                                                                                                                                                                                                                              |
| `your_turn_items` (view)                                              | 4-way `UNION ALL` over `mission_subtasks`, `space_items` ×2, `missions`; `security_invoker` + `auth.uid()`                                                                                                                                                                                                                                                                                                                          |
| `campaign_retention_cleanup_runs`                                     | Output of the `pg_cron` `campaign-retention-cleanup` job (30-day soft-delete retention)                                                                                                                                                                                                                                                                                                                                             |

**The `org_id IS NULL` trap.** `20260508123331_normalize_personal_org_scope.sql` made `org_id`
nullable on `spaces`, `space_items`, `space_drive_folder_mappings` and `space_drive_push_channels`,
and backfilled `org_id = NULL WHERE org_id = user_id` (the old "personal org" sentinel). Every
tenant filter here must handle the null branch — the repositories above do it with
`if (orgId) query = query.eq('org_id', orgId)`, which means **omitting `x-org-id` widens the
query** rather than narrowing it.

## Business Logic

**Split three ways, and one of the three is a problem.**

1. **Backend services — where most of it correctly lives.** 128 service files. Permission
   resolution (`space-permissions.service.ts`), template instantiation, retrieval indexing, and
   automation evaluation are all service-layer.

2. **🔴 The automation engine is a 20-class inheritance chain.** CONFIRMED:
   `SpaceAutomationService extends SpaceAutomationServiceBase19`
   (`space-automation.service.ts:288`), `…Base19 extends …Base18`
   (`space-automation-service-19.base.ts:279`), down to `…Base02 extends …Base01`
   (`space-automation-service-02.base.ts:276`). Nineteen `.base.ts` files of 407–835 lines each
   plus the 529-line concrete class = **11,375 lines in one class**. This is a per-file LOC limit
   being satisfied by splitting a single class across files — the opposite of what the limit is
   for. Any behaviour change requires knowing which of 20 files owns the method, and `protected`
   state is shared across all of them.

3. **Business logic in components.** Several 1,000–2,700-line view components hold real logic
   rather than just rendering — `ActionBuilder.tsx` (2,121) encodes the shape and validation of all
   ~35 action types, `DocsView.tsx` (2,447), `ReportingCustomizePanel.tsx` (1,788),
   `SpaceItemsContainer.tsx` (1,488).

4. **The Zustand store also holds logic.** `use-spaces-store.ts` (1,234 lines) owns optimistic
   mutation with a pending-mutation counter (`pendingItemMutationCounts`), stale-while-revalidate
   caches keyed `${spaceId}:${queryKey}`, a realtime-change merge queue
   (`queuedRealtimeItemChanges`) so realtime does not clobber in-flight optimistic writes, and
   `localStorage` nav persistence under `vibey.spaces.nav`. This is sophisticated and deliberate —
   it is the hand-rolled replacement for the react-query the app does not use.

### Automation triggers (~25) — `space-schema.ts:781-878`

Item/task: `status_change`, `task_created`, `mission_completed`, `mission_failed`,
`field_changed`, `priority_changed`, `assignee_changed`, `due_date_changed`,
`start_date_changed`, `tag_added`, `tag_removed`.
Contact: `contact_created`, `contact_updated`, `contact_tag_added`, `contact_tag_removed`,
`contact_type_changed`, `contact_source_changed`.
Other: `form_submitted`, `artifact_lifecycle`, `external_email_received` (Gmail/Outlook),
`external_slack_message_received`, `external_fathom_recording_ready`, `external_app_event`
(Google Calendar/Drive/Sheets, Salesforce, GitHub, Notion), `webhook_received`, `schedule`,
`choose_action`.

### Automation actions (~35) — `space-schema.ts:960` onward

Tasks: `create_task`, `create_subtask`, `assign_to`, `change_status`, `change_priority`,
`add_comment`, `human_gate`.
Agents: `send_to_agent`, `send_to_agents`, `send_to_cursor`, `agent_suggest_tasks`,
`add_brain_context_to_task`, `ask_agent_to_improve_artifact`.
Flow control: `flow_loop`, `flow_branch`, `choose_action`.
Messaging: `send_email`, `send_slack_message`, `request_slack_follow_up_confirm`,
`observe_slack_team`, `send_channel_message`.
Contacts: `create_contact`, `update_contact_field`, `add_contact_tag`, `remove_contact_tag`,
`attach_note_to_contact`, `link_item_to_contact`.
Artifacts: `create_artifact`, `publish_artifact`, `unpublish_artifact`, `attach_artifact_to_item`.
Research: `sync_social_research`, `select_social_outliers`, `enrich_social_research_items`,
`ingest_youtube_channel_to_agent_brain`, `meetings_precall_prep`.

`send_to_agent` carries a `SendToAgentOutputType` (13 values, `space-schema.ts:943`) which, when
set, "appends an OUTPUT CONTRACT to the prompt that tells the agent which `vibey_backend` save
tool to call" (`space-schema.ts:924`) — the seam between this feature and
[`agents-and-teams.md`](./agents-and-teams.md).

## Validation

- **Zod on params and bodies**, per controller, via `ZodValidationPipe` — e.g.
  `SpaceShareTokenParamSchema` (`space-public-sharing.controller.ts:24`). DTOs live in
  `apps/api/src/modules/spaces/dto/`.
- **`automation-context-validation.ts`** (`services/`) validates the automation trigger context.
- **`space-automation-publishable.ts`** gates draft → published: a rule cannot be enabled until it
  is complete.
- **Execution-time guards** in `space-automation-service-01.base.ts:500`:
  `if (!automation || automation.enabled !== true || automation.is_draft === true) return` — a
  disabled or draft rule is a silent no-op rather than an error.
- **`depth`** is threaded through every automation eval context (`EvalContext.depth`) as the
  cycle/recursion budget for automations that trigger automations.
- **Fathom trigger source** is server-enforced: the type comment states "Only org admin/owner can
  save `user` or `team` modes — enforced server-side" (`space-schema.ts:851-856`).
- **Type-level deprecation** is used as a soft validation channel: `IgTrackedAccount`,
  `IgResearchGroupBy`, `media_filter`, `date_display_format` and others are marked
  `@deprecated` but still read for backward compatibility.

## Permissions

Every non-public spaces controller carries
`@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)`; the automation and webhook
controllers add `RoleGuard`.

| Layer            | Mechanism                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Org role         | `@RequireOrgRole('viewer')` to read, `('editor')` to create/update/delete (`spaces.controller.ts:52,66,136,148`)                                              |
| Space visibility | `spaces.visibility ∈ {private, team}`                                                                                                                         |
| Space share      | `space_shares.level` + optional `allowed_view_ids` (a member may see a Space but only some views)                                                             |
| View share       | `space_view_shares`                                                                                                                                           |
| Item share       | `space_item_shares.level` + `inherit_to_children`; email invites carry `invite_token` + `invite_expires_at`                                                   |
| Item privacy     | `space_items.is_private`                                                                                                                                      |
| Public link      | `spaces.share_token` / `space_items.share_token` + `share_link_enabled`                                                                                       |
| Resolution       | `space-permissions.service.ts` + `space-permissions.repository.ts`; frontend mirror `hooks/use-space-permission.ts`                                           |
| Program privacy  | `hooks/use-space-program-privacy.ts`; `prevent_personal_dashboard_sharing` DB function                                                                        |
| RLS              | `spaces`/`space_items` have policies, but 75/239 `apps/api` repositories use the service-role client — see [`../08-auth-security.md`](../08-auth-security.md) |

⚠️ **`OrgRoleGuard` passes through when `x-org-id` is absent**
([`../08-auth-security.md`](../08-auth-security.md) finding #3). Combined with
`if (orgId) query = query.eq('org_id', orgId)` in these repositories, omitting the header both
skips the role check and drops the tenant filter. Whether that is exploitable depends on whether
the handler injects `@Supabase()` (RLS backstop) or a service-role repository — **NEEDS
VERIFICATION per endpoint**.

## External Dependencies

Detail in [`../09-integrations.md`](../09-integrations.md).

| Dependency                                                                                            | Used for                                                                                                 |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **ScrapeCreators** (70 routes) / **SearchAPI** / **Firecrawl**                                        | Social + ads research data                                                                               |
| **Meta Graph / Ads**                                                                                  | Ads research, ads performance reporting, ad publishing                                                   |
| **Deepgram**                                                                                          | Transcript enrichment (`enrich_social_research_items` → `transcript`)                                    |
| **Google Drive**                                                                                      | `space_drive_folder_mappings` + push channels; `drive-sync` queue                                        |
| **Google Calendar / Outlook**                                                                         | Calendar view external events (`useSpaceCalendarExternalEvents.ts`)                                      |
| **Gmail / Outlook**, **Slack**, **Fathom**, **Salesforce**, **GitHub**, **Notion**, **Google Sheets** | Automation triggers                                                                                      |
| **SendGrid**                                                                                          | `send_email` action                                                                                      |
| **Composio**                                                                                          | The `external_app_event` trigger bridge                                                                  |
| **Stripe**                                                                                            | Campaign finance tab (products, coupons, payment links, revenue)                                         |
| **Cursor**                                                                                            | `send_to_cursor` action                                                                                  |
| **LLM providers**                                                                                     | `POST /api/campaigns/:id/generate-context` (behind `CreditsGuard`), ad-copy generation, research scoring |
| **Supabase Realtime**                                                                                 | `space_items` + `spaces.schema` live updates                                                             |
| **TipTap**, **`@xyflow/react`**                                                                       | Docs view, canvas / `AutomationFlowMap`                                                                  |

## Background Jobs

See [`../10-background-processes.md`](../10-background-processes.md) for the full picture. Spaces is
the feature most affected by that document's findings.

| Job                                                                       | Trigger                                                                   | Status                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/cron/space-automations` → `/api/internal/space-automations/process-due` | Vercel cron, 48 of 60 minutes (mask deliberately avoids the `*/5` slots)  | ✅ Live — the only path by which schedule triggers fire in production                                                                                                                                                                                                 |
| `agent-runtime-queue-automation`                                          | `enqueueAutomationRuntimeJob` (`space-automation-service-01.base.ts:519`) | 🔴 **Dead in production.** `shouldUseAutomationQueue()` requires `AGENT_RUNTIME_AUTOMATION_QUEUE_ENABLED === '1'` **and** `VERCEL !== '1'`, and its only `@Processor` lives inside the same Vercel function. Automations therefore run **inline** in the request/cron |
| `SpaceAutomationRuntimeProcessor`                                         | BullMQ, concurrency 5                                                     | 🔴 Registered in `spaces.module.ts:253` — a BullMQ worker inside a serverless function                                                                                                                                                                                |
| `materializeRecurringSpaceItems`                                          | `@Cron` every minute (`apps/api/src/cron.service.ts:93`)                  | 🔴 **Never runs in production** and has no Vercel-cron mirror. **Recurring space items do not materialise.** `space_items.recurrence_parent_id` and the `try_acquire_space_items_recurrence_lock()` advisory-lock pair exist for a job that never fires               |
| `reconcileSpaceAutomations`                                               | `@Cron` every 30 s (`cron.service.ts:105`)                                | 🔴 Same — mission-completion reconciliation for automations never runs                                                                                                                                                                                                |
| `space_automation_notify` pg_notify                                       | `20260423200100_space_automation_notify.sql:31`                           | 🔴 **No listener.** `space-automation-reconciler.service.ts:11-13` comments that Vercel cannot hold a `LISTEN` connection                                                                                                                                             |
| `drive-sync` queue                                                        | `queue-worker`, 60 s scheduler                                            | ✅ Live                                                                                                                                                                                                                                                               |
| `campaign-retention-cleanup` (pg_cron)                                    | `0 3 * * *` → `cleanup_soft_deleted_campaigns()`                          | ✅ Registered twice under one name (idempotent upsert)                                                                                                                                                                                                                |
| `sync_mission_status_to_space_item`                                       | DB trigger `AFTER UPDATE ON missions`                                     | ✅ Live — Space item status is coupled to mission status at the database layer                                                                                                                                                                                        |

**Idempotency smell:** the automation producer builds
`jobId: automation-${automationId}-${spaceId}-${itemId}-${Date.now()}`
(`space-automation-service-01.base.ts:542`). The `Date.now()` suffix **defeats BullMQ dedupe by
construction**.

## Frontend Flow

```text
/spaces
 └─ SpacesContainer
     ├─ useSpacesStore.loadSpaces()      → GET /api/proxy/spaces (cursor-paginated)
     ├─ useGlobalChatStore.loadRoster()
     ├─ setWorkContext({surface:'spaces', spaceId, campaignId})   ← wires the chat panel
     ├─ if (no spaces && no ?space= param) → ensureDefaultSpace()
     └─ SpaceItemsContainer
         ├─ resolve active view from spaces.schema.views + personal view-overrides
         ├─ resolveToolbar(view.type)      views/registry.ts
         ├─ GET /api/proxy/spaces/:id/items      (SWR cache: itemsCacheBySpaceQuery)
         ├─ use-space-items-realtime      Supabase Realtime on space_items + spaces
         └─ render ListView | KanbanView | DocsView | SpaceCalendarView | ContactsSpaceList
                  | SpaceMediaView | InstagramResearchView | AdsResearchView
                  | reporting views | artifact views | missions views
```

Item edits are **optimistic**: the store patches local state, increments
`pendingItemMutationCounts[itemId]`, fires the PATCH, and queues any realtime event that arrives
mid-flight into `queuedRealtimeItemChanges` so the server echo cannot revert the user's typing.
Switching spaces repaints from `itemsCacheBySpaceQuery` before the refetch lands.

Campaign HQ is a different shell over the same data: `/campaigns/[id]` reads
`config.visible_campaign_tabs` (`readVisibleCampaignTabs`, defaulting to all nine), then each tab
renders spaces-feature components or `useTaskRollup({ scope:'all', campaignId })` against
`/api/tasks`.

## Backend Flow

An automation firing on an item status change:

```text
PATCH /api/spaces/:id/items/:itemId          space-items.controller.ts:121
  → SpaceItemsService.update                 (writes space_items, emits activity)
    → SpaceAutomationService.onTriggerEvent  (the 20-class chain)
      → automationsRepo.findById             space_automations
      → guard: enabled && !is_draft          space-automation-service-01.base.ts:500
      → shouldUseAutomationQueue()?          false on Vercel → INLINE execution
        → evaluate trigger match + depth budget
        → for each action: switch (action.type)   space-automation-service-09.base.ts:293
            create_task      → space_items insert
            send_to_agent    → agent invocation + OUTPUT CONTRACT prompt
            send_email       → email module → single-emails queue
            create_artifact  → campaigns module artifact controllers
            human_gate       → pause; resume via POST /api/internal/spaces/:id/automations/resume
      → write run record → GET /api/spaces/recent-automation-runs
    → space-retrieval indexes the change into space_semantic_chunks (vector(768))
    → Supabase Realtime pushes the row → use-space-items-realtime → store merge
```

Schedule triggers take a different route: Vercel cron → `/cron/space-automations` →
`/api/internal/space-automations/process-due` (`CRON_SECRET`) →
`SpaceAutomationSchedulerService` → the same inline execution.
Inbound webhooks arrive at `POST /api/flow-webhooks/:publicToken`, verified with
`x-vibey-signature` (`space-webhooks.service.ts:293` uses `timingSafeEqual`).

## Full Request Flow

Creating an item and having an automation hand it to an agent:

```mermaid
sequenceDiagram
    autonumber
    participant U as Browser
    participant ST as use-spaces-store.ts
    participant PX as api/proxy/[...path]/route.ts
    participant SIC as space-items.controller.ts
    participant SAS as space-automation.service.ts<br/>(+19 .base.ts files)
    participant AR as space-automation-service-09.base.ts
    participant AG as apps/agent-api
    participant SRI as space-retrieval-index.service.ts
    participant PG as Supabase Postgres
    participant RT as Supabase Realtime

    U->>ST: create item (SpaceQuickAdd.tsx)
    ST->>ST: optimistic insert + pendingItemMutationCounts++
    ST->>PX: POST /api/proxy/spaces/<id>/items
    PX->>SIC: POST /api/spaces/<id>/items
    Note over SIC: AuthGuard · ThrottlerGuard<br/>OrgContextGuard · OrgRoleGuard('editor')
    SIC->>PG: INSERT space_items
    SIC->>SAS: onTriggerEvent(task_created)
    SAS->>PG: SELECT space_automations WHERE space_id=?
    SAS->>SAS: enabled && !is_draft ? continue : return
    SAS->>SAS: shouldUseAutomationQueue() → false (VERCEL=1)
    SAS->>AR: executeActions(actions, depth)
    AR->>AG: send_to_agent → agent invocation + OUTPUT CONTRACT
    AR->>PG: INSERT automation run row
    SIC->>SRI: index item
    SRI->>PG: UPSERT space_semantic_chunks (vector(768))
    SIC-->>ST: 201 { item }
    ST->>ST: reconcile optimistic row; drain queuedRealtimeItemChanges
    PG->>RT: postgres_changes on space_items
    RT-->>U: use-space-items-realtime → store merge
    Note over AG,PG: agent writes back → space_items.linked_mission_id →<br/>trigger sync_mission_status_to_space_item updates status
```

## Error Handling

| Failure                                   | Behaviour                                                                                                                      | Evidence                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Item mutation rejected                    | Store reconciles from the server response; SWR cache repaints last-known rows rather than emptying                             | `use-spaces-store.ts:48-52`                                               |
| Realtime event during an in-flight write  | Queued in `queuedRealtimeItemChanges`, applied after the mutation settles                                                      | `use-spaces-store.ts:44`                                                  |
| Realtime outage                           | **No polling fallback** in most of ~43 realtime hooks — indistinguishable from a dead worker                                   | [`../10-background-processes.md`](../10-background-processes.md) risk #17 |
| Disabled / draft automation               | Silent `return`, no run record                                                                                                 | `space-automation-service-01.base.ts:500`                                 |
| Automation action throws                  | Run recorded as failed and surfaced in `AutomationRunsLog.tsx` / `GET /api/spaces/recent-automation-runs`                      | `spaces-state.controller.ts:30`                                           |
| Automation recursion                      | Bounded by the `depth` field threaded through `EvalContext`                                                                    | `space-automation-service-01.base.ts:506,519-543`                         |
| Public share token invalid/expired        | `NotFoundException('Shared item not found or expired')`                                                                        | `space-public-sharing.controller.ts:27`                                   |
| Public **space** share                    | Always `NotFoundException('External sharing is paused')`                                                                       | `space-public-sharing.controller.ts:37`                                   |
| Campaign task load failure                | `toast.error(CAMPAIGN_VIEW_MESSAGES.taskLoadFailed)`                                                                           | `CampaignTaskTab.tsx:20-22`                                               |
| Space deep link to a client-general space | Redirected via `clientOverviewHrefFromSpace` before render                                                                     | `SpacesContainer.tsx:25,34-36`                                            |
| Empty org + deep link race                | Guarded: `if (urlSpaceParam \|\| loading \|\| spaces.length > 0 \|\| creatingDefaultSpace) return` with an explanatory comment | `SpacesContainer.tsx:50-51`                                               |

User-facing copy is in `apps/web/src/features/spaces/config/` and, for campaigns,
`campaigns/[id]/_config/campaign-toast-errors.config.ts` + `campaign-view-messages.config.ts`.

## Test Scenarios

1. **The rename.** Visit `/lists`. It must `permanentRedirect` to `/spaces`. This is the fastest way
   to internalise that `lists`/`list_items` are the old names of `spaces`/`space_items`.
2. **Spaces vs Campaigns vs Projects.** Open `/spaces`, `/campaigns/<id>` and `/projects/<id>`
   side by side. Confirm the campaign page renders spaces components while the project page renders
   a code editor with a Sandpack preview. The three-module confusion dissolves immediately.
3. **The schema is the view system.** `GET /api/spaces/:id`, note `schema.views[]`, then add a view
   via `POST /api/spaces/:id/ensure-view` and watch `views/registry.ts:resolveToolbar` pick a
   different toolbar. Try `docs`, `kanban`, `calendar`, `ads_research`.
4. **Personal vs shared view state.** Change grouping on a view (writes a personal override via
   `PATCH /api/spaces/:id/view-overrides/:viewId`), confirm a second user is unaffected, then use
   **Save for everyone** and confirm it lands in `spaces.schema`.
5. **View-scoped sharing.** Create a `space_shares` row with `allowed_view_ids` limited to one
   view id, then sign in as that member and confirm only that view is reachable. This is the
   least-obvious permission in the feature.
6. **External sharing is off.** Enable a space share link
   (`POST /api/spaces/:id/share-link`), then `GET /api/spaces/shared/space/<token>`. It returns
   **404 "External sharing is paused"** — the UI can mint a link that can never be opened. Contrast
   with `GET /api/spaces/shared/item/<token>`, which does work.
7. **Automation, inline.** Build a `status_change → create_task` rule, leave it as a draft, and
   change an item's status: nothing happens (silent no-op). Publish it and repeat: the task appears
   **synchronously in the PATCH response path**, not via a queue.
8. **Recurring items don't recur.** Create an item with a recurrence, wait past its next occurrence,
   and confirm nothing materialises — `materializeRecurringSpaceItems` is an unmirrored `@Cron`.
9. **Schedule triggers do fire.** Create a `schedule` trigger, then call
   `GET /api/internal/space-automations/process-due` with `Authorization: Bearer $CRON_SECRET`
   (this is what the Vercel cron does) and watch the run appear in
   `GET /api/spaces/recent-automation-runs`.
10. **Inbound webhook.** Create a webhook endpoint, rotate its secret, then
    `POST /api/flow-webhooks/:publicToken` with a correct and then a corrupted `x-vibey-signature`.
11. **Optimistic + realtime.** Open the same Space in two tabs. Type into an item in tab A while
    tab B edits the same row. Confirm tab A's in-flight edit is not reverted by the realtime echo
    (`queuedRealtimeItemChanges`).
12. **Template instantiation.** `GET /api/space-templates`, then
    `POST /api/space-templates/<slug>/instantiate`, and diff the resulting `spaces.schema` against
    `apps/api/src/modules/space-templates/data/space-template-catalog-*.ts`.

## Known Problems

| #   | Problem                                                                                                                                                                                                                                               | Severity                                                           | Evidence                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`SpaceAutomationService` is one class spread across 20 files via a 20-level `extends` chain — 11,375 lines.** Per-file LOC limits are satisfied while the actual unit is enormous; `protected` state is shared across all 20 links                  | **CRITICAL (maintainability)**                                     | `space-automation.service.ts:288`; `space-automation-service-19.base.ts:279`; `…-02.base.ts:276`; `wc -l` = 11,375                              |
| 2   | **Public _space_ sharing is dead code with a live UI.** `getSharedSpace` unconditionally throws `'External sharing is paused'`, yet `POST /api/spaces/:id/share-link` still mints tokens and `ShareModal.tsx` (827 lines) still offers the control    | **HIGH (broken UX)**                                               | `space-public-sharing.controller.ts:32-38` vs `space-sharing.controller.ts:155`                                                                 |
| 3   | **Recurring space items never materialise in production.** The `@Cron` is disabled on Vercel with no mirror, while `recurrence_parent_id` and two advisory-lock DB functions exist to support it                                                      | **HIGH**                                                           | `apps/api/src/cron.service.ts:93`; [`../10-background-processes.md`](../10-background-processes.md) risk #2                                     |
| 4   | **Space-automation mission-completion reconciliation never runs** (`reconcileSpaceAutomations`, every 30 s, unmirrored), so `mission_completed` triggers depend entirely on the inline path                                                           | **HIGH**                                                           | `cron.service.ts:105`                                                                                                                           |
| 5   | **`agent-runtime-queue-automation` is dead on both ends**: producer gated on `VERCEL !== '1'`, and its only consumer is a BullMQ `@Processor` inside the same Vercel serverless function                                                              | **HIGH**                                                           | `space-automation-service-01.base.ts:510-521`; `spaces.module.ts:253`; [`../10-background-processes.md`](../10-background-processes.md) risk #3 |
| 6   | **Automations run synchronously inside the request.** Because the queue is off, a `send_to_agent` action executes in the PATCH/cron request path — a long agent call inside a serverless invocation                                                   | **HIGH (reliability)**                                             | `shouldUseAutomationQueue()` → `false`; `space-automation-service-09.base.ts:308`                                                               |
| 7   | **`space_automation_notify` fires into the void** — the trigger exists, nothing `LISTEN`s, and the code comments explain why                                                                                                                          | MEDIUM                                                             | `20260423200100_space_automation_notify.sql:31`; `space-automation-reconciler.service.ts:11-13`                                                 |
| 8   | **`POST /api/internal/spaces/:id/automations/resume` has no guard found** — the `human_gate` resume path                                                                                                                                              | MEDIUM — verify                                                    | [`../05-api-map.md`](../05-api-map.md) spaces table                                                                                             |
| 9   | **Automation `jobId` includes `Date.now()`**, defeating BullMQ dedupe by construction (latent: matters the moment the queue is enabled)                                                                                                               | MEDIUM                                                             | `space-automation-service-01.base.ts:542`                                                                                                       |
| 10  | **`campaigns` exists only in `supabase/schema.sql`**, not in the 937-file migration series, yet has 55 inbound FKs. A clean `db reset` over `migrations/` alone cannot build it                                                                       | MEDIUM                                                             | [`../06-database-map.md`](../06-database-map.md) §Where the Schema Lives                                                                        |
| 11  | **Tenant filters are conditional.** `if (orgId) query = query.eq('org_id', orgId)` throughout `space-share-management.repository.ts` means a missing `x-org-id` **widens** the query — and also silently skips `@RequireOrgRole`                      | MEDIUM — see [`../08-auth-security.md`](../08-auth-security.md) #3 | `space-share-management.repository.ts:25,61,80,142`                                                                                             |
| 12  | **Two read paths for one item.** `GET /api/spaces/:id/items/:itemId` (`space-items.controller.ts:83`) and `GET /api/spaces/items/:itemId` (`spaces-state.controller.ts:52`)                                                                           | MEDIUM                                                             | both files                                                                                                                                      |
| 13  | **The `campaigns` module is a misnomer**: 28 of 31 controllers are artifact controllers, so "campaigns has 137 routes" is misleading and the two mapping docs disagree (141/137 vs 151/61)                                                            | MEDIUM (documentation)                                             | `ls apps/api/src/modules/campaigns/controllers`; [`../05-api-map.md`](../05-api-map.md) vs [`../03-architecture.md`](../03-architecture.md)     |
| 14  | **Five components over 1,700 lines** carry real logic: `SpaceVibeyChatPanel` 2,664 · `DocsView` 2,447 · `ActionBuilder` 2,121 · `ContentAnalysisModal` 1,940 · `ReportingCustomizePanel` 1,788                                                        | MEDIUM                                                             | `wc -l`                                                                                                                                         |
| 15  | **Compiled artifacts committed into a source folder**: `components/automations/connected-app-flow-triggers.{js,js.map,d.ts}` sit next to the `.ts`                                                                                                    | LOW                                                                | `ls apps/web/src/features/spaces/components/automations`                                                                                        |
| 16  | **Legacy automations may live in `spaces.schema`.** The store imports `omitSchemaAutomations` and `normalizeSpaceLegacyViews`, implying two storage locations (schema JSONB vs the `space_automations` table)                                         | LOW — verify                                                       | `use-spaces-store.ts:11-14`                                                                                                                     |
| 17  | **Wide deprecated-alias surface** kept for compile compatibility: `IgTrackedAccount`, `IgResearchGroupBy`, `IgResearchDisplayMode`, `IG_RESEARCH_LIST_COLUMN_IDS`, `media_filter`, `date_display_format`, `type_filter`, `DEFAULT_IG_RESEARCH_CONFIG` | LOW                                                                | `space-schema.ts:61,99-106,127,698,571`                                                                                                         |
| 18  | **`projects` (the app-builder table) has no RLS**, and neither do `comments`, `orders`, `order_items`                                                                                                                                                 | LOW here, see [`../06-database-map.md`](../06-database-map.md) #3  | [`../06-database-map.md`](../06-database-map.md) §RLS                                                                                           |

## Related Features

- [`agent-runtime-chat.md`](./agent-runtime-chat.md) — `SpaceVibeyChatPanel.tsx` lives in this
  feature folder but belongs to the chat pipeline; `send_to_agent` is the automation→agent seam.
- [`brain-memory.md`](./brain-memory.md) — `space_semantic_chunks`/`_objects`/`_edges` are the
  Space RAG index; `add_brain_context_to_task` and
  `ingest_youtube_channel_to_agent_brain` write into the Brain.
- [`agents-and-teams.md`](./agents-and-teams.md) — `space_items.assignee_type = 'agent'`,
  `assigned_agent_key`, `GET /api/campaigns/assignments/by-agent/:agentKey`.
- [`authentication.md`](./authentication.md) — `/home` and `/spaces` are the post-onboarding
  destination; the middleware's four Supabase calls precede every Space navigation.
- **Missions** (no dedicated doc in this set) — `space_items.linked_mission_id` plus the
  `sync_mission_status_to_space_item` DB trigger couple Space items to the async agent engine.
  See [`../10-background-processes.md`](../10-background-processes.md) §Agent Run Lifecycle.
- [`../09-integrations.md`](../09-integrations.md) — the research and automation-trigger providers.
- [`../06-database-map.md`](../06-database-map.md) — the `org_id IS NULL` personal-scope trap and
  the `campaigns`-not-in-migrations problem.

## Open Questions

1. **Is `AGENT_RUNTIME_AUTOMATION_QUEUE_ENABLED` set anywhere?** If it is ever set on a persistent
   host, jobs land on a queue that no Railway worker consumes
   ([`../10-background-processes.md`](../10-background-processes.md) risk #3).
2. **Why is external space sharing paused, and is it coming back?** The item variant works, the
   space variant is a hard throw, and the link-minting UI is still shipped.
3. **Do legacy automations still live in `spaces.schema`?** `omitSchemaAutomations` suggests some
   spaces carry rules in JSONB rather than in `space_automations`. How many, and are they still
   evaluated?
4. **Was the 19-file `.base.ts` chain generated or hand-written?** The naming is perfectly regular,
   which suggests a script. Knowing which decides whether it can be mechanically re-split.
5. **What distinguishes `/clients`, `/client-campaigns`, `/launches` and `/campaigns`?** Four
   dashboard sections appear to view the same Program/Campaign/Space data with agency-specific
   framing. Which are current and which are legacy?
6. **How does `space-flow-builder` relate to `flow_definitions`?**
   [`../06-database-map.md`](../06-database-map.md) lists `flow_definitions` and
   `flow_definition_versions` as **built-but-unused** (no `.from()` access path), yet
   `space-flow-builder.controller.ts` and `apps/web/src/features/flows` exist. Is the flow builder
   writing to `space_automations` instead?
7. **Are `space_semantic_chunks` embeddings kept current?** The write path is
   `space-retrieval-index.service.ts`, but there is no re-embedding sweep in the cron inventory.
8. **Which of the 42 spaces controllers use service-role repositories?** That set is exactly the
   blast radius of the `OrgRoleGuard` pass-through for this feature.
