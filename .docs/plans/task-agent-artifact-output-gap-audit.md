# Task-Agent Artifact Output Gap Audit

Generated: 2026-06-24

## Purpose

Audit whether artifacts or Space items created by agents while running inside a task reliably appear in both places users expect:

- inline task activity as the same preview card style used in chat
- the task detail Deliverables & media carousel

This audit covers the task-agent path, the OpenClaw tool stream bridge, backend artifact action results, frontend content-block-to-deliverable mapping, and the reported production task `d6a1b64a-ab00-4bab-87a3-06cb521b3fbb`.

## Result Summary

- The production test only created documents plus one follow-up task item. No funnels, presentations, ads, media, forms, or posts were created in that run.
- 2026-06-25 update: task completion now reconciles scoped persisted outputs after the stream merge. The readback covers Space Docs, created Space items/tasks, offers, avatars, sequences, renderable presentations, renderable funnels/websites, social posts, ads/ad sets/ad campaigns, forms, flows, task-linked emails, and media assets.
- Remaining fallback gaps are output families that either do not persist a safely task-scoped row, do not have a stable previewable row shape, or still need producer-side block work.
- The frontend can convert `artifact_preview`, `document_card`, `media_asset`, `pdf_file`, `docx_file`, `project_preview`, `widget_preview`, and `browser_screenshot` blocks into task deliverables, but not every backend output emits or persists enough scope to reconstruct one.

Critical conclusion: the old document-only fallback has been replaced with a scoped generic readback for the main persisted artifact families; unsupported or unscoped producer actions still need targeted cleanup before the platform can claim every possible durable output has a DB fallback.

## Current Data Flow

1. Backend artifact action executes through `ArtifactActionExecutionService`.
2. If the action result includes `ui_blocks`, `OpenClawStreamToolService` emits each as `ui_block`.
3. `TaskAgentProgressService` appends `ui_block` events to task activity `payload.content_blocks_ordered`.
4. `TaskAgentService` completes the activity with the final blocks.
5. `TaskAgentArtifactOutputsService` adds missing scoped persisted output blocks for supported artifact tables, task-linked emails, media assets, Space Docs, and created Space items.
6. `collectTaskDeliverablesFromActivity` converts final blocks into `MissionDeliverable` rows for the task carousel using `missionDeliverableFromContentBlock`.

## Covered Today

| Output family | Producer block | Deliverable mapping | Task fallback | Current status |
| --- | --- | --- | --- | --- |
| Space Docs via `save_document` | `document_card` | `doc` | Yes | Covered |
| PDF via `create_pdf` | `document_card` from service | `doc` | Yes, if mirrored as Space Doc | Mostly covered |
| DOCX via `create_docx` | `document_card` from service | `doc` | Yes, if mirrored as Space Doc | Mostly covered |
| Offer via `create_offer` | `artifact_preview: offer` | `offer` | Yes, scoped row readback | Covered |
| Ad via `create_ad` | `artifact_preview: ad` | `ad` or `image` if image URL exists | Yes, scoped row readback | Covered |
| Ad campaign via `create_ad_campaign` | `artifact_preview: ad-campaign` | `ad_campaign` | Yes, scoped row readback | Covered |
| Funnel via `create_funnel` | `artifact_preview: funnel` | `funnel` | Yes, when renderable by home page/pages/files | Covered for renderable rows |
| Funnel page via `add_funnel_page` | `artifact_preview: funnel` with `funnelPageId` | `funnel` | Yes, via parent funnel renderability | Covered |
| Presentation via `create_presentation` | `artifact_preview: presentation` | `presentation` | Yes, when generated HTML or files exist | Covered for renderable rows |
| Sequence via `create_sequence` | `artifact_preview: sequence` | `sequence` | Yes, scoped row readback | Covered |
| Avatar via `create_avatar` | `artifact_preview: avatar` | `avatar` or `image` if image URL exists | Yes, scoped row readback | Covered |
| Email via `save_email` | `artifact_preview: email` | `email` | Yes, when linked to the task `source_item_id` | Covered |
| Social post via `create_social_post` | `artifact_preview: social-post` | `social_post` or media if image/video URL exists | Yes, scoped row readback | Covered |
| Blog post via `create_blog_post` | `artifact_preview: blog-post` | `blog_post` or `image` if cover exists | No | Stream-dependent |

## Gaps

| Output family | Gap | Impact | Priority |
| --- | --- | --- | --- |
| Out-of-catalog or unscoped artifact previews | No safe task completion reconciliation when the durable row lacks task Space scope or the output has no stable previewable persisted row. | A successfully created artifact can still be absent if the stream block is missed and DB readback cannot safely identify it. | P0 |
| Generated images and videos | `generate_image` / `generate_video` fallback emits a text markdown link, not a structured media block. | It may look visible in chat text but the task carousel ignores it. | P0 |
| Processed media | `process_media` returns `url` and `media_asset_id` but no `ui_blocks`; extractor does not synthesize one. | Processed images/videos/audio are not task deliverables unless another path attaches them. | P0 |
| Forms | `create_form`, `publish_form`, and `attach_form_asset` return form data/URL only; task readback now covers scoped created form rows. | Producer-side blocks are still missing, but task completion can recover created forms. | P1 |
| Tasks / generic Space items | `create_task` creates `space_items` but returns raw task data only; task readback now covers non-doc Space items created in the same scoped run. | Producer-side blocks are still missing, but task completion can recover created task/custom item rows. | P1 |
| Missions | `create_mission` creates/ensures Mission view and indexes the source but returns raw mission data only. No block or mapper support. | Chat-created missions can exist without a task output card. | P1 |
| Contacts | `create_contact` returns raw contact data only; no block or mapper support. | Created contacts do not appear as task deliverables. | P1 |
| Flows | `create_flow_draft` and `publish_flow` return raw `space_automations`; task readback now covers scoped rows created by the task actor. | Producer-side blocks are still missing, but task completion can recover created flow rows. | P1 |
| Projects/code artifacts | Frontend supports `project_preview`, but `create_project` returns the main API result and does not synthesize `project_preview`. | Code/project outputs are not guaranteed in task deliverables. | P1 |
| Websites | `create_website` is implemented through the funnel path and emits `artifact_preview: funnel`; frontend has a `website` deliverable type but the block contract does not expose `website`. | Website outputs are typed as funnels in task deliverables. | P2 |
| Visual docs | `generate_visual_html` emits `artifact_preview: visual-doc`; frontend block union accepts it, but deliverable mapper does not map it. | Visual docs can render in chat but not become typed task deliverables. | P2 |
| Email sequence emails | `add_sequence_email` emits an `artifact_preview` with `artifactType: sequence` and the parent sequence id, not the sequence email id/type. | Individual email outputs inside a sequence are attributed to the sequence, not the email draft. | P2 |
| Ad sets and bulk ads | `create_ad_set` and `bulk_create_ads` return raw data without `artifact_preview` blocks. | Created ad-set/bulk ad output is not guaranteed in task deliverables. | P2 |
| Branding themes | `create_theme` returns raw theme data only; no deliverable type or block mapping. | Agent-created themes are not task output cards. | P2 |
| Custom objects | `define_object_type` and `create_object` return raw rows only. | Custom Space/customer objects are invisible in task output cards. | P2 |

## Recommended Fix Order

1. Replace the document-only fallback with a generic `TaskAgentArtifactBlocksService`.
   - Keep the existing Space Doc logic.
   - Add table-backed reconciliation for `artifact_preview`, media, tasks/Space items, missions, forms, flows, contacts, projects, themes, and custom objects.
   - Deduplicate against existing streamed blocks by entity table/id.

2. Extend the shared block and deliverable contracts.
   - Add or map `form`, `website`, `visual-doc`, `media_asset`, `task`, `mission`, `contact`, `flow`, `theme`, and `custom_object`.
   - Add a structured media block instead of using markdown `text` for generated images/videos.

3. Fix producer actions that create durable outputs without blocks.
   - `create_form`, `publish_form`, `create_task`, `create_mission`, `create_contact`, `create_flow_draft`, `publish_flow`, `create_project`, `create_theme`, `create_object`, `process_media`, `create_ad_set`, `bulk_create_ads`.

4. Add guardrail tests.
   - Backend: every durable create/save/generate action either returns a deliverable-capable block or is explicitly classified as not a deliverable.
   - Task agent: reconciliation adds missing blocks for each supported table.
   - Frontend: every supported block maps to a task deliverable and category.
   - Stream bridge: `ui_blocks` from direct, nested, and text-envelope tool results are persisted into task activity.

## Acceptance Criteria

- A task-agent run that creates each supported output type ends with a matching block in `space_item_activity.payload.content_blocks_ordered`.
- The task detail Deliverables & media carousel shows each output without depending on a perfect live stream.
- Chat and task activity use the same block contracts for preview cards.
- Each durable create/save/generate action is classified as one of:
  - previewable deliverable
  - non-deliverable side effect
  - confirmation/clarification/status-only UI
- Production verification can query recent task-run entities and match them to task activity blocks by entity table/id.

## Production Evidence

For task `d6a1b64a-ab00-4bab-87a3-06cb521b3fbb`, production rows in the task run window show:

- two `conversation_documents`
- two mirrored `space_items` with `_view_type = doc` and `_conversation_document_id`
- one additional `space_items` task titled `Crystallize approved strategy to Brain: Hadassha Limassol`
- zero matching rows for offers, ads, ad campaigns, ad sets, funnels, forms, presentations, sequences, social posts, emails, media assets, missions, or flows in the audited window

This confirms the reported test only exercised documents plus a follow-up task item. It does not prove other artifact types are safe.
