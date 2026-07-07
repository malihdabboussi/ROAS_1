# Viralish Carousel Incident Bug Investigation - June 21, 2026

## Scope

This report starts the bug file for the Viralish / Blake carousel incident seen in production on June 20, 2026.

Primary production identifiers:

- Production Supabase project: `qfrvykscoymiwwgysvsr`
- User: `bdb86350-7cae-4e9e-b6b8-c89becfe7d82` / `blake@viralish.com`
- Org: `f1343da8-3796-4278-91f6-b08b8f9140f8` / `Viralish`
- Main incident conversation: `943ff7be-f1d2-4c0b-b015-c4040a17baa1`
- Runtime source of truth: `agent_runtime_type = shared_railway`
- Runtime URL: `https://vibeyv2-production-1437.up.railway.app`
- Trace agent identity: `agent_key = vibey`, `gateway_agent_id = org-f1343da8-3796-4278-91f6-b08b8f9140f8-vibey`

## Executive TL;DR

The incident was not caused by Blake using "Q" instead of Vibey. Production traces show the failing conversation ran through Vibey.

The failure was a chain reaction: integration status was confusing, user media did not have one stable DB/storage-backed reference across agent actions, media/action schemas allowed bad calls through to runtime, and the agent kept trying workaround paths after the system already had enough evidence that the export pipeline was not stable.

## Implementation Update - 2026-06-21

The first integration-connection upgrades are now implemented in code:

- Composio shared OAuth links can request `accountType = SHARED` for org-shared connections.
- Connect flows first reuse an existing active Composio account instead of forcing a fresh OAuth round trip.
- Composio `connected_account.expired` webhooks now mark matching `user_integrations` rows as `needs_reconnect` instead of silently leaving stale `connected` rows.
- API status/overview and agent runtime checks now repair stale connected rows when Composio says the backing account is expired or inactive.
- Agent execution can reuse a valid personal connection in org scope when that is the best available connection, including legacy rows that predate `scope_mode`.
- Agent connection checks and Composio execution failures now return a structured `integration_doctor` payload with selected connection, scope, status, checks, and repair actions.
- Chat integration repair cards now render the doctor summary/checks and preserve connect, reconnect, settings, and personal-connection approval actions.
- The canonical feature contract is documented in `documentation/features/integration-connections.md`.

Still open:

- Monitor production traces for integration repair cards that still collapse to generic "not connected" messages.

## Implementation Update - 2026-06-22

The file-reference layer for agent/tool actions is now implemented in code:

- File-aware actions accept `asset_ref` / `asset_refs` as the stable user-media handle.
- The action normalizer keeps the ref and derives the legacy field the existing handler already understands, such as `asset_id`, `image_url`, `media_url`, `media_asset_id`, `input_image_url`, or `parent_image_asset_id`.
- Covered action families include `read_document`, `analyze_image`, `analyze_video`, `process_media`, `upload_skill_asset`, form/funnel/presentation asset attachment, `generate_image`, and `edit_image`.
- OpenClaw local file tools now reject URL-like paths before treating them as workspace files.
- The intended architecture is DB/storage-backed refs for user media, not saving uploaded or connected media into the agent local workspace. Local workspace paths are only for actual generated project/code files.

## Evidence Sources Read

- Production Supabase rows from `profiles`, `conversations`, `vb_agent_traces`, `app_errors`, `user_integrations`, and `machine_pool`.
- `apps/agent-api/src/modules/artifacts/services/artifact-legacy-integrations.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-integration-orchestrator.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-composio-runtime.service.ts`
- `apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-integrations.repository.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-media-processing.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-error-classifier.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-data-normalizer.ts`
- `packages/api-shared/src/services/machine-profile-env.ts`
- `apps/web/src/app/api/proxy/[...path]/route.ts`

## Bug 1 - Drive Connection Status Mismatch

Status: confirmed by production DB and traces; partially mitigated on 2026-06-21 by active-account reuse and stale connection repair.

Symptom:

The agent told Blake Google Drive was connected, then actual Google Drive actions failed as disconnected.

Evidence:

- Trace `0c62c6ad-6c06-4d93-b58e-95568fcbb5b4` response said Drive was connected, then tool steps failed with `ERROR [integration_disconnected]`.
- Production error rows show `use_integration` failures for `google_drive` actions:
  - `list_files_in_folder`: `Integration google_drive is not connected`
  - `GOOGLEDRIVE_LIST_FILES`: `Integration google_drive is not connected`
- Later production DB rows showed two relevant Google Drive integration rows:
  - Blake personal row `51dd88a3-addb-4e37-8495-4e58e87a958f`: `status = connected`, `scope_mode = personal`, `agent_enabled = true`
  - Viralish org-shared row `d53b92a8-0a18-4d37-a69a-4cf20445b2f9`: `status = disconnected`, `scope_mode = org_shared`, `is_default = true`, `agent_enabled = true`

Likely root cause:

The system has multiple notions of "connected": personal connection, org-shared default, agent-enabled connection, Composio active account, and action execution permission. A status check can appear green while the actual execution path selects or encounters a disconnected/unavailable row.

Code evidence:

- `ArtifactIntegrationOrchestratorService.getIntegration` computes `connected` from filtered `user_integrations` rows.
- `ArtifactComposioRuntimeService.ensureComposioExecutionAllowed` performs a stricter execution gate: org/user row filtering, team policy, `agent_enabled`, and active Composio accounts.
- `ArtifactLegacyIntegrationsRepository.listIntegrationStatusRows` filters by exact `integration_id`, user/org, and later service logic filters scope.

Best long-term UX solution:

TL;DR: Show one truth: "Can this agent use this Drive right now?" not "Drive connected."

Recommended product behavior:

- Replace generic connected badges with an execution-ready check per agent, org, and action.
- In the chat composer and integration panel, show: "Drive ready for Q/Vibey" or "Drive connected to Blake, but not usable by this workspace action."
- If the action cannot execute, show one repair button: "Reconnect Drive for this workspace."
- Before an agent says "Drive is connected," require a lightweight action-readiness probe for the exact action family it plans to use.

## Bug 2 - Integration Scope / Access Handling Is Ambiguous

Status: core UX/agent contract fixed on 2026-06-21; monitor production for any remaining generic integration errors.

Symptom:

The same user/org can have a connected personal Drive row and a disconnected org-shared default row. The tool error exposed "not connected," but not which row/scope/account failed.

Evidence:

- Production `user_integrations` showed the connected personal row and disconnected org-shared default row at the same time.
- Error message only said the integration was not connected; it did not identify whether the failing connection was personal, org-shared, default, or missing an active Composio account.
- `ArtifactComposioRuntimeService.pickPreferredIntegrationRow` has preference logic for requested row, personal connected, shared default connected, latest shared connected, personal any, shared default any, then first row.

Likely root cause:

The connection selector has multiple fallback paths, but the user-facing error collapses all failure modes into "integration not connected." That prevents the user and support team from knowing whether to reconnect, switch default connection, enable agent access, or fix team policy.

Best long-term UX solution:

TL;DR: Every integration error should say exactly which connection failed and why.

Recommended product behavior:

- Add an "Integration Doctor" result object for every integration action: selected connection, owner, scope, status, agent-enabled, active account found, policy allowed.
- In chat, surface human text like: "I found Blake's personal Drive, but this workspace is trying to use the disconnected org Drive. Use Blake's Drive or reconnect the org Drive?"
- In settings, show personal vs org-shared as separate rows with a clear default marker and health status.
- Never let the agent infer a connection is usable from a generic status check.

## Bug 3 - Remote Image URLs Treated as Local File Paths

Status: fixed on 2026-06-22 by the `asset_ref` action bridge and OpenClaw URL-path guard.

Symptom:

The `read` tool attempted to open remote signed URLs and uploaded screenshots as local files inside the agent workspace.

Evidence:

- Production errors include `ENOENT` paths such as:
  - `/app/agents/orgs/f1343da8-3796-4278-91f6-b08b8f9140f8/vibey/https:/qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/...`
  - `/app/agents/orgs/f1343da8-3796-4278-91f6-b08b8f9140f8/vibey/Screenshot 2026-06-20 at 3.42.13 PM.png`
  - `/app/agents/orgs/f1343da8-3796-4278-91f6-b08b8f9140f8/vibey/public/carousel.html`
- The failures occurred in the same conversation after the agent tried to inspect screenshots and live carousel assets.

Root cause:

The agent/tool layer had no reliable contract that said: "this is user media, use the DB/storage-backed file ref" versus "this is an actual generated workspace file path." As a result, cloud URLs were concatenated with the workspace directory and failed as local paths.

Best long-term UX solution:

TL;DR: Users and agents should deal in assets, not paths or URLs.

Recommended product behavior:

- Use one DB/storage-backed file handle for user media: `asset_ref`.
- Drive files, Supabase objects, R2/S3 objects, website image URLs, and uploaded screenshots should flow through `asset_ref` or the legacy fields derived from it.
- Media/document/render actions should accept stable refs, not raw local-path guesses.
- If the agent tries a URL where a local project file path is required, block before tool execution and route the file through `asset_ref` or the right media action.

## Bug 4 - Signed Media URL Handling Is Broken in Agent Workspace

Status: closed as part of the 2026-06-22 `asset_ref` fix. Any prior plan to save uploaded or connected user media into the agent workspace was removed because it does not match the Vibey architecture.

Symptom:

Signed Supabase/R2/Drive URLs were present, but the agent could not reliably use them for rendering or file inspection without guessing whether they were URLs, media ids, or local paths.

Evidence:

- `read` attempted to read signed Supabase and R2 URLs as local paths.
- The agent later claimed "Supabase permanent URLs are available" and tried to use them directly.
- The final workflow only improved once the agent created a native presentation and attached assets directly.

Root cause:

The system lacked one stable action input contract for cloud-backed user media. The correct contract is `asset_ref`, backed by DB/storage/integration metadata. User media should not be saved as local files inside the agent workspace.

Resolution:

- `asset_ref` / `asset_refs` are now accepted by file-aware artifact actions and normalized into the legacy handler fields they already understand.
- OpenClaw `read`, `write`, and `edit` now reject URL-like paths when they expect actual workspace files.
- The report should treat Bug 4 as resolved by the same DB/storage ref layer as Bug 3, not as a separate local-copy project.

## Bug 5 - Media Processing Contract Is Too Easy To Call Incorrectly

Status: confirmed by production errors and local schema/code.

Symptom:

`process_media` reached runtime with missing required fields.

Evidence:

- Production error: `process_media` failed with `resolution is required`.
- `ArtifactMediaProcessingService.processMedia` dispatches operation-specific handlers after validating only the `operation` enum.
- Action docs describe `resize{url,resolution}` and `compose{...,resolution?}`, but runtime errors still happened.

Likely root cause:

The action schema and model guidance did not prevent incomplete operation-specific payloads before execution.

Needed follow-up:

- Add preflight validation per operation before calling ffmpeg handlers.
- Make validation messages machine-readable enough for the agent to self-correct once.

## Bug 6 - Invalid Media Operation Reached Runtime

Status: confirmed.

Symptom:

`process_media` was called with an empty operation.

Evidence:

- Production error: `Invalid operation "". Supported: trim, concat, convert, ...`
- `ArtifactMediaProcessingService.processMedia` explicitly reads `String(input.operation ?? '').trim()`.

Likely root cause:

The action validator allowed the call to reach runtime instead of blocking missing `operation` at schema preflight.

Needed follow-up:

- Require `operation` in the action schema.
- Add tests that `process_media` with missing/empty operation fails at preflight with a concise correction path.

## Bug 7 - Video / Media Analyzer Cannot Handle Some Drive / Temp Inputs

Status: confirmed as a failing action; exact media URL type needs follow-up.

Symptom:

`analyze_video` failed with `Could not get input duration, please specify fixed timemarks`.

Evidence:

- Production `app_errors` for conversation `943ff7be-f1d2-4c0b-b015-c4040a17baa1` show `campaign_capability (analyze_video)` failure.

Likely root cause:

The analyzer/probe path could not derive duration from the provided input, likely because it received a temp URL, unsupported URL, expired URL, or non-video/media object.

Needed follow-up:

- Capture the exact `media_url` shape for failed analyze calls.
- Add a preflight "probe URL is readable and has duration" check with an actionable user-facing fallback.

## Bug 8 - Memory Save Schema Mismatch

Status: confirmed.

Symptom:

`save_user_memory` failed because the supplied `memory_type` was invalid or absent.

Evidence:

- Production error: `memory_type must be one of: decision, insight, preference, fact, story, framework, event`.
- Separate schema preflight warning: `content, memory_type are required for save_user_memory`.

Likely root cause:

The agent had enough permission to attempt memory save, but action schema guidance did not keep generated payloads inside the allowed enum.

Needed follow-up:

- Enforce enum values in preflight before runtime.
- Prefer a repairable schema error that maps invalid values to allowed values where obvious.

## Bug 9 - Agent Overpromised Export Capability

Status: confirmed by trace response.

Symptom:

The agent told Blake it would export slides as actual image files in chat using Canva, then admitted all paths failed.

Evidence:

- Trace `97da9f9f-28f6-4a1a-8ca7-de882ef340a9` response begins with: "I'm going to export each slide as an actual image file right here in chat using Canva."
- Same response ends with a failure summary and manual workaround options.

Likely root cause:

Agent prompting/tools made export capability appear available without a verified "can render/download N carousel images now" capability gate.

Needed follow-up:

- Add a capability readiness check for export/render workflows.
- Agents should not promise downloadable outputs until the platform has produced or reserved the actual files.

## Bug 10 - Failure Messaging Policy Conflicts With Transparency

Status: confirmed by code and trace.

Symptom:

Tool guidance says not to mention platform/internal issues, but the agent told Blake "platform bug."

Evidence:

- `artifact-error-classifier.ts` `system_fault` guidance says: "Do NOT tell the user something went wrong, do NOT mention a platform error or internal issue..."
- Screenshot/trace response says:
  - `Presentations view broken (platform bug)`
  - `Published URL not resolving (platform bug)`

Likely root cause:

The error policy optimizes for avoiding internal leakage, but the agent eventually improvised a blunt explanation after many failed workarounds.

Needed follow-up:

- Define an honest but non-internal incident message pattern: "This export path is not available from chat right now. I can do X or Y."

## Bug 11 - Published / Rendered Artifact Path Is Unreliable

Status: confirmed as user-facing failure; exact publishing subsystem needs follow-up.

Symptom:

The agent gave Blake a Vercel carousel URL, then later the workflow still failed visually or operationally.

Evidence:

- Trace `a8f9272e-726a-4bc7-a849-966580751ef3` told Blake to open `https://viralish-vision.vercel.app/carousel.html`.
- Later traces show the agent trying to inspect `public/carousel.html` locally and failing with `ENOENT`.
- The final screenshot included "Published URL not resolving."

Likely root cause:

The system did not verify the published artifact from the same execution environment before telling the user it was usable.

Needed follow-up:

- Require post-publish verification: fetch URL, verify 200, verify expected content, verify images render or are embedded.

## Bug 12 - CORS / Image Proxy Path Is Unreliable

Status: confirmed by trace response; exact proxy implementation needs follow-up.

Symptom:

The agent reported black slides / broken image icon and blamed image proxy/CORS.

Evidence:

- Trace `38dd415c-167d-4bd3-bd09-cf435f520a11` says: "the image proxy is failing. Black slide, broken image icon..."
- Same trace says it would avoid proxy/CORS by embedding or attaching assets.

Likely root cause:

The carousel path used external image URLs in a rendering context that was not guaranteed to load them.

Needed follow-up:

- Audit presentation renderer and app proxy image-loading behavior for Supabase signed URLs, Drive URLs, and R2 temp URLs.
- Add a render-safe image ingestion path that rewrites all external images to stable internal assets.

## Bug 13 - No Hard Stop After Repeated Tool Failures

Status: confirmed.

Symptom:

The agent kept trying broken alternatives after repeated non-retryable failures.

Evidence:

- The trace has dozens of tool calls in the same conversation.
- Error classifier has escalation logic after three identical failures.
- Production errors show repeated `add_presentation_slide` failures, repeated `read` failures, repeated integration failures, and final user frustration.

Likely root cause:

The error classifier can prepend `STOP RETRYING`, but the chat-level planner still continued with adjacent fragile paths instead of switching to a product-safe fallback.

Needed follow-up:

- Introduce a workflow-level circuit breaker: after N failures in the same deliverable class, stop tool use and present only verified alternatives.

## Bug 14 - Runtime Identity / Agent Name Confusion

Status: confirmed as debugability problem; not causal for this incident.

Symptom:

User-facing chats say "Chat with Q" while production execution uses `vibey`.

Evidence:

- Production conversations titled `Chat with Q` had `agent_id = vibey`.
- Incident trace agent identity was `agent_key = vibey` and `gateway_agent_id = org-f1343da8-3796-4278-91f6-b08b8f9140f8-vibey`.

Likely root cause:

Display name/persona and backend agent key are not clearly separated in support/debug views.

Needed follow-up:

- Show both values in admin/support surfaces: display name "Q", backend key `vibey`, gateway id.

## Bug 15 - Legacy Fly Fields Still Attached To Railway Users

Status: confirmed; not causal for this incident.

Symptom:

Blake is production Railway, but still has a claimed/suspended Fly machine.

Evidence:

- Profile row:
  - `agent_runtime_type = shared_railway`
  - `agent_runtime_url = https://vibeyv2-production-1437.up.railway.app`
  - `fly_machine_id = e7845025ae7e38`
  - `fly_runtime_status = suspended`
- `machine_pool` still has `machine_id = e7845025ae7e38`, `claimed_by = bdb86350-7cae-4e9e-b6b8-c89becfe7d82`.
- `apps/web/src/app/api/proxy/[...path]/route.ts` routes to shared Railway when `runtimeType === shared_railway` and `runtimeUrl` exists, but can fall back to Fly on shared runtime failure.

Likely root cause:

The runtime migration left legacy Fly assignment fields in place. They are not currently the primary route, but they create confusion and fallback ambiguity.

Needed follow-up:

- Add an admin/runtime view that labels Fly fields as "legacy fallback" when `agent_runtime_type = shared_railway`.
- Decide whether Railway users should retain Fly fallback machines or have them explicitly released/archived.

## Open Evidence Gaps

- Exact Composio account state at each failing timestamp, not just current `user_integrations` rows.
- Exact tool payloads for each failed `process_media`, `analyze_video`, and `read` call beyond the logged error envelopes.
- OpenClaw `read` tool implementation path and URL handling contract.
- Presentation renderer code path for slide section parsing, asset attachment, and preview/export behavior.
- Vercel/GitHub integration row state for Viralish, especially why the agent used service values like `adleyk`.

## Recommended Next Investigation Order

1. Fix or spec Bugs 1-3 first because they are the root of the user-visible "I connected Drive, why can't you use it?" and "why can't you see the file?" failures.
2. Then investigate presentation renderer/export reliability: Bugs 9, 11, 12, and 13.
3. Then harden action schemas: Bugs 5, 6, 7, and 8.
4. Clean up operational ambiguity: Bugs 14 and 15.
