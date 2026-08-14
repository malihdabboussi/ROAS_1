# Visual Campaign Orchestrator Plan

Date: 2026-08-13
Branch: `codex/visual-campaign-orchestrator`
Base: current `main` at `9b98d762`

## Product outcome

A user can open a Campaign or its Canvas and tell Pixel something like:

> Map this client's webinar funnel. The webinar is at `https://example.com/webinar`, the ads are in this Drive folder, and we still need the reminder sequence.

Pixel gathers existing Campaign assets and supplied URLs, asks only the questions required to avoid inventing campaign facts, opens Canvas, and visibly builds a connected campaign map. Existing assets remain linked to their canonical ROAS records or source URLs. Missing assets appear as actionable placeholders. A user can create, attach, assign, or dismiss each placeholder, and creation progress is reflected on the board.

## Foundation already present on current main

The closed PR #129 is not the source of truth, but its core work was subsequently incorporated into `main`:

- Campaign, Program, and Space can open a shared Campaign-owned Canvas.
- Canvas stores normalized items and connectors with revisions and operation history.
- Human changes and Pixel changes use the same `apply_canvas_operations` contract.
- Canvas supports editable notes, text, cards, shapes, frames, connectors, selection, resizing, pan/zoom, minimap, Undo/Redo, and realtime refresh.
- Campaign resources can be placed as linked resource cards.
- Pixel receives campaign, board, revision, viewport, and selection context.
- Pixel has governed `get_canvas_board` and `apply_canvas_operations` actions with schema, preflight, policy, and drift coverage.
- Campaign and Program use the shared hierarchy view strip already used by Spaces.

This project extends that foundation; it does not create a second Canvas, workflow graph, chat runtime, resource store, or persistence model.

## Experience contract

### 1. Intake and discovery

Pixel accepts free-form campaign intent, URLs, Drive folders/files, and references to existing Campaign/Space resources. It resolves:

- campaign goal, offer, audience, traffic source, dates, and primary conversion;
- current funnels/pages, emails/sequences, ads, presentations/webinars, offers, docs, media, and tasks;
- supplied external URLs and connected Drive references;
- gaps between the intended journey and existing assets.

Discovery output must cite its source for every existing asset. Unknown facts remain unknown.

### 2. Clarification

Pixel returns a structured discovery summary with `blocking_questions`. It asks only questions whose answers materially change the map or the assets to create. The Canvas may show a temporary discovery frame while clarification is in progress, but it must not label assumptions as confirmed assets.

### 3. Blueprint generation

Pixel creates a versioned `campaign_blueprint` on the existing Canvas using staged columns such as:

`Traffic → Registration → Confirmation → Reminder → Event → Offer → Follow-up → Retargeting`

The exact stages are derived from the campaign type. Existing resources become linked cards. External references become URL cards. Missing requirements become typed placeholder cards. Connectors describe the customer journey or operational dependency.

### 4. Live construction

Canvas opens as soon as blueprint generation begins. Pixel applies small, ordered operation batches by stage so the user can watch the map appear. Each batch uses the latest revision and is undoable. The viewport follows affected bounds without preventing the user from taking control.

### 5. Missing-asset actions

Placeholder cards expose:

- **Create** — starts the canonical asset workflow for the placeholder type;
- **Attach existing** — searches/selects a compatible Campaign resource;
- **Assign** — creates or links a task for a person/agent;
- **Dismiss** — records that the gap is intentionally excluded.

State is explicit: `missing`, `planned`, `creating`, `review`, `ready`, `live`, `dismissed`, or `blocked`.

### 6. Operational synchronization

When a workflow creates an asset, the placeholder is replaced or linked to the canonical resource without duplicating it. Task and workflow status updates the Canvas card. Later reporting can attach metrics to the same resource nodes.

## Data model

Extend Canvas item content rather than adding a parallel board table.

### Item content additions

- `semantic_type`: `campaign_stage | existing_asset | external_url | asset_placeholder | campaign_note`
- `blueprint_id`: stable UUID shared by one generated campaign map
- `stage_key` and `stage_order`
- `status`: lifecycle value above
- `source`: canonical resource, URL, Drive reference, or user input
- `placeholder`: required asset type, brief, suggested workflow/action, and missing fields
- `provenance`: actor, source references, and creation timestamp

The database remains generic JSON content; strict TypeScript/action schemas govern the semantic payload.

### Blueprint orchestration

Reuse governed discovery actions instead of creating a parallel discovery repository:

- `search_campaign_brain` for client evidence;
- canonical list/get actions for Campaign assets;
- existing connected-source actions for supplied Drive references and URLs.

After blocking questions are resolved, use `build_campaign_blueprint`. It calculates valid UUIDs,
stage positions, nested cards, and customer-journey connectors on the server, then commits frames,
cards, and connectors as three revisioned operation batches through the existing Canvas operation
repository. Pixel supplies semantic membership and confirmed facts, not arbitrary coordinates.
Later edits still use `get_canvas_board` followed by `apply_canvas_operations`.

### Placeholder execution

Use a server-owned registry mapping placeholder asset types to existing governed actions/workflows. The browser never invents arbitrary action names. The first supported types are:

- funnel/page;
- email sequence/email;
- ad/ad set;
- presentation/webinar asset;
- document/brief;
- task/mission.

Unsupported types remain assignable placeholders rather than failing silently.

## UI design

### Canvas node presentation

- Stage frames use compact headers and contain their asset/placeholder cards.
- Existing assets show type, title, source, open action, and live status.
- URL cards show domain, title when resolved, and an external-link action.
- Placeholder cards use a visibly incomplete treatment and primary `Create` action.
- Creating/review/blocked states are visible without relying on color alone.

### Pixel panel

- Add a campaign-map starter prompt when the board is empty.
- Show discovery progress: Campaign assets, supplied URLs, connected files, and gaps.
- Show blocking questions as normal chat, preserving the ongoing campaign-scoped conversation.
- When generation starts, emit a client event that opens/focuses Canvas and shows a non-blocking “Pixel is building” indicator.

### Placement and layout

- Deterministic stage-column layout avoids model-generated arbitrary coordinates.
- Pixel supplies stage membership and ordering; a pure layout helper calculates frames, cards, and connectors.
- Regeneration updates the existing `blueprint_id` rather than stacking duplicate maps.

## Implementation phases

### Phase 1 — Semantic Canvas contracts and deterministic layout

Files:

- `apps/web/src/components/canvas/types/whiteboard.types.ts`
- `apps/web/src/components/canvas/lib/campaign-blueprint.ts`
- `apps/web/src/components/canvas/lib/campaign-blueprint.test.ts`
- `apps/web/src/components/canvas/components/WhiteboardNode.tsx`
- `apps/web/src/components/canvas/components/CanvasPlaceholderActions.tsx`
- Canvas message config and barrel exports

Acceptance:

- typed existing-asset, URL, stage, and placeholder content;
- deterministic staged layout produces valid Canvas operations;
- nodes render semantic metadata and placeholder actions;
- no new persistence path.

### Phase 2 — Governed campaign blueprint action

Files:

- focused pure blueprint operation builder under `apps/agent-api/src/modules/artifacts/`;
- agent action schema, registry, lifecycle, preflight, action contract, generated docs, policy, and capability drift tests;
- existing Brain and Campaign asset actions reused for discovery rather than duplicated.

Acceptance:

- `build_campaign_blueprint` accepts only confirmed existing assets, URLs, and typed gaps;
- discovery remains read-only and evidence-backed through existing actions;
- invoking-user Campaign access is enforced;
- deterministic UUID-safe operations render in ordered live batches;
- URLs are preserved as references and never represented as fetched evidence unless actually inspected.

### Phase 3 — Pixel orchestration and live build

Files:

- `CanvasPixelPanel.tsx` and focused tests;
- Canvas operation hook/realtime integration;
- Pixel action documentation/instructions;
- client event or shared Canvas store for build progress/focus.

Acceptance:

- Pixel instructions require Brain/asset discovery and clarification before commit;
- Canvas opens/focuses when building starts;
- map appears in ordered frame, card, and connector batches;
- retries use current revision and do not duplicate an existing blueprint.

### Phase 4 — Placeholder creation handoffs

Files:

- placeholder action registry in the canonical artifact/action layer;
- Canvas placeholder action API/client;
- `CanvasPlaceholderActions.tsx` and creation-status hook;
- canonical workflow/task integrations and tests.

Acceptance:

- Create launches only an approved workflow for the asset type;
- Attach existing links a canonical resource;
- Assign creates/links a canonical task;
- completion replaces or links the placeholder and preserves provenance.

### Phase 5 — Connected-source enrichment and readiness

- Drive folder/file selection and evidence references;
- URL metadata and safe page inspection through an existing browser/research route;
- campaign completeness review;
- optional reporting/status badges;
- mobile/read-only behavior and large-board performance.

## Test matrix

- Pure layout: stage ordering, bounds, empty stages, many assets, stable IDs, duplicate regeneration.
- Contract: semantic content parsing, placeholder lifecycle, allowed resource/action mappings.
- Agent: access, schema, preflight, lifecycle, policy, generated docs, tool error contract, circuit breaker.
- Repository: Campaign isolation and evidence-source correctness.
- UI: existing resource, URL, placeholder, creating/blocked states, keyboard access, Create/Attach/Assign/Dismiss.
- Integration: prompt → clarification → blueprint → live operations → placeholder creation → linked finished asset.
- Visual: light/dark, zoom levels, empty/new/existing boards, Program and Space entry points.

## Rollout

1. Ship semantic rendering and deterministic layout behind no new persistence.
2. Enable read-only discovery for Pixel.
3. Enable blueprint mutation for internal campaigns.
4. Enable placeholder creation one asset family at a time.
5. Add connected Drive/URL enrichment and launch-readiness reporting.

Every AI batch remains reversible through existing Canvas Undo/Redo. If orchestration is disabled, the underlying Canvas remains fully usable.

## Implemented vertical slice and proof

The branch now implements the full first vertical slice:

- `build_campaign_blueprint` supports webinar, VSL call-booking, and free Skool community maps;
- `complete_canvas_placeholder` replaces an exact missing node in place with its canonical resource,
  preserving layout, stage membership, style, semantic provenance, and operation history;
- Pixel's Canvas prompt includes the board revision, viewport, selection, evidence-first discovery
  requirements, webinar playbook routing, and completion handoff contract;
- URL cards render a browser-style label and safe lazy visual preview;
- placeholder Create, Attach, Assign, and Dismiss actions hand a precise confirmation request to Pixel.

Live proof used the existing Yasir Khan Coaching LTD campaign and its 464-memory Campaign Brain.
Brain discovery returned sufficient context, after which the governed agent endpoint created three
maps, three funnels, six sequences with 19 emails, nine ads, and a webinar-fulfillment mission. The
final board reached revision 29 with 42 items, 22 stage frames, 19 connectors, six URL embeds,
14 linked ready resources, and zero unresolved placeholders. Browser verification confirmed the
shared Campaign view strip and Miro-style board rendering. Local mission-worker execution could not
be expanded because Redis is not running in this checkout; the same webinar playbook's 10 focused
tests pass and the live mission retains `playbook_id=webinar-fulfillment` for a configured worker.

## First vertical slice

The first build slice will support a webinar funnel blueprint from explicit user-provided facts plus existing Campaign resources:

- stages: Traffic, Registration, Confirmation, Reminder, Webinar, Offer, Follow-up, Retargeting;
- existing Campaign resources become linked cards;
- supplied URLs become URL cards;
- missing email sequence, page, ad, presentation, document, or task becomes a typed placeholder;
- placeholders render Create/Attach/Assign/Dismiss controls; those controls open Pixel with a typed,
  user-confirmable creation/linking request that names the placeholder brief and canonical suggested action.

This slice proves the visual and contract model before adding broad connected-source discovery or autonomous creation.
