# Meeting Note-Taker System (ROA-40) — Implementation Plan

**Linear:** [ROA-40 Create a meeting moduler system](https://linear.app/1dscollective/issue/ROA-40/create-a-meeting-moduler-system) — High, assigned to Malih
**Status:** Draft for review (no code written)
**Created:** 2026-09-11
**Prepared with:** `plan-creator` protocol. Every path below was read in this worktree on 2026-09-11; line numbers are from that read.

---

## Architect Summary

Today ROAS already ingests meetings from two note takers, but through two unrelated paths. Fathom is deep: OAuth, a webhook receiver, a brain import job, a customer-brain envelope, a Meetings-space call row, Page Grader and Campaign Brain routing. Fireflies is shallow: API key, manual "sync last 20", and a brain import job whose payload carries only a transcript id, so Atlas never receives the transcript text. Read.ai does not exist. Nothing in the code says "this is a meeting provider"; the closest thing is the Fathom-shaped normalizer `FathomMeetingSource` that the meetings domain already consumes.

The plan turns that Fathom-shaped seam into the product's one meeting contract and puts every note taker behind it:

1. **One contract.** `TranscriptSourceEvent` (the existing `FathomMeetingSource` fields, with `provider` widened and a `kind` field so meetings are the first kind, not the only one) plus a `TranscriptProvider` adapter made of optional capability groups: `identity`, `push` (verify and parse a webhook), `pull` (list recent, fetch one, poll since a cursor), `normalize`. A provider implements the groups it has; the intake only ever sees the normalized event.
2. **One inbound door.** `POST /api/integrations/meetings/webhooks/:provider/:connectionKey`. The URL identifies the connection, the adapter verifies the provider's HMAC, one replay table drops duplicates, and one `MeetingIntakeService` fans the normalized meeting out to the brain door, the customer-brain outbox, and the Meetings space.
3. **One brain door.** A provider-agnostic `meeting_transcript_import` job whose payload already contains the transcript, replacing `fathom_meeting_import` and the broken `fireflies_transcript_import`.
4. **Three adapters.** Fathom (moves onto the rail; gains real signature verification), Fireflies (gains a webhook and a working brain import), Read.ai (new; webhook-only, signing key pasted by the user).

What changes for the user: Settings shows Read.ai next to Fathom and Fireflies; connecting any of the three means "meetings land in my brain and my Meetings space automatically"; the brain training panel offers one "Meetings" source that lists any connected provider. Adding a fourth note taker later is one adapter class, one catalog row, and one seed migration.

---

## Evidence Pack

Existing provider code:

- `apps/api/src/modules/integrations/fathom/` (24 files, ~3.5k LOC): `controllers/fathom-webhooks.controller.ts:67-95` receives `POST integrations/fathom/webhook`, reads `x-fathom-signature`/`x-webhook-signature` and always returns 200. `services/fathom-webhook.service.ts:31-155` is the fan-out (brain import `:116`, customer envelope `:127`, alias capture `:136`, action-item refetch `:138`, Space route `:141`, Page Grader `:142`, Campaign Brain `:146`). `services/fathom-api.service.ts:138-157` `resolveUserByWebhookSecret` compares the header string to `user_integrations.metadata.webhook_secret` — a lookup key, not an HMAC. `:412-474` falls back to attributing unsigned events by parsing invitee emails from the body.
- `apps/api/src/modules/integrations/fireflies/` (8 files): `controllers/fireflies.controller.ts` — `connect` (`:35`, API key to vault), `transcripts/:id/import` (`:87`), `sync` (`:95`, hard limit 20, no cursor). No webhook route. `integrations/fireflies.integration.ts:66-82` already runs the GraphQL `transcript(id)` query with `sentences { speaker_name text start_time }` and `summary { overview action_items ... }`.
- `apps/api/src/modules/integrations/cursor/` — the precedent for "user pastes API key + webhook secret" and an idempotent inbound webhook: `controllers/cursor.controller.ts:122-145` (`@Req() RawBodyRequest`, `x-webhook-id`), `services/cursor-webhook.service.ts:63-77` (`insertWebhookEvent`, `23505` = duplicate) and `:95-101` (`verifyWebhookSignature` with the stored secret). `apps/api/src/main.ts:34` has `rawBody: true`.

Meetings domain seam:

- `apps/api/src/modules/meetings/providers/fathom-meeting-source.ts:29-46` `FathomMeetingSource` (`provider: 'fathom'`, `externalRecordingId`, `providerMeetingId`, `calendarEventId`, `title`, `recordingUrl`, `scheduledStart/End`, `recordingStart/End`, `durationSeconds`, `participantEmails`, `providerSummary`, `actions`, `transcript: FathomTranscriptTurn[]`, `raw`); `:51-105` `normalizeFathomMeetingSource`; `:234-269` `renderFathomTranscriptDocument`.
- `apps/api/src/modules/meetings/services/meeting-source-ingestion.service.ts:162-283` `ingestFathomSource(supabase, { meetingItemId, spaceId, userId, orgId, calendarEventId, event })` normalizes at `:172` and uses only the normalized `source` afterwards. `:94-160` `findMatchingMeetingItem` likewise.
- `apps/api/src/modules/meetings/providers/build-fathom-event-from-call-item.ts` — precedent for constructing a Fathom-shaped raw event from other data so the Fathom pipeline can consume it.
- `apps/api/src/modules/meetings/domain/meeting-recording-reconciliation.ts:13` `provider: 'fathom' | 'fireflies' | (string & {})` — the domain already tolerates other providers.
- `supabase/migrations/20260728200000_meeting_workspace_foundation.sql:64-94` `meeting_recordings` (`provider TEXT NOT NULL`, unique `(user_id, provider, external_recording_id)`).
- `apps/api/src/modules/spaces/services/space-automation-service-06.base.ts:294-...` `processFathomRecordingEvent(supabase, userId, event)` (835-line file, 59 "fathom" mentions): claims `space_external_automation_events` with `provider: 'fathom'`, `trigger_slug: 'FATHOM_RECORDING_READY'` (`:311-318`), resolves routes, then calls `meetingSourceIngestion.findMatchingMeetingItem` / `ingestFathomSource` (`:376-393`). Trigger type `external_fathom_recording_ready` has 63 references across api, web and `packages/api-shared/src/types/flow-capabilities.ts:346`.
- `supabase/migrations/20260510091200_space_external_automation_fathom.sql:16-20` — `space_external_automation_events.provider` CHECK is `('gmail','outlook','fathom')`.

Brain import door:

- `apps/api/src/modules/brain/services/brain-import-jobs.types.ts:1-14` `BrainImportJobType` union (free TEXT in the DB, `supabase/migrations/20260303120000_brain_import_jobs.sql:4`).
- `apps/api/src/modules/brain/services/brain-import-jobs-enqueue.base.ts:72-98` `enqueueFathomMeetingImport` (payload `{ meeting, brainId?, targetBrainOverride? }`, dedupe `fathom:{externalId}`); `:151-169` `enqueueFirefliesTranscriptImport` (payload `{ transcriptId, ... }`).
- `apps/api/src/modules/brain/services/brain-import-jobs-input.base.ts:31-99` builds the Atlas input; the Fireflies case (`:81-99`) spreads `{ transcriptId }` and nothing else.
- `apps/api/src/modules/brain/services/brain-import-jobs-execution.base.ts:42-43` lazy-fetches transcripts only for `fathom_meeting_import`/`campaign_fathom_import` (`ensureFathomTranscript` `:410-441`); `:304-321` `extractContentText` reads `transcript` as string or as `[{ speaker: { display_name | name }, text }]`, else `content`/`text`/`url`, else `JSON.stringify(input)`. **Consequence: a Fireflies job sends Atlas `{"transcriptId": "...", "target_brain": ..., "skill": ...}` as its whole content.** No code in `apps/api` fetches the Fireflies transcript before dispatch (grep `getTranscriptWithSentences` — only campaigns services import `FirefliesApiService`).
- `apps/api/src/modules/brain/repositories/brain-import-job-status.repository.ts:54-79`, `memory-stats.repository.ts:392-393`, `brain-import-jobs-runtime.base.ts:362-363` (cross-pollination trigger), `brain-cross-suggestions.service.ts:28-29` — hardcoded job-type lists that a new type must join.
- `apps/api/src/modules/brain/controllers/import-jobs.controller.ts:39-72,96-117` — `fathom-meeting`, `fireflies-transcript`, `campaign-fathom`, `campaign-fireflies` routes; `services/brain-import-job-requests.service.ts:106-169` handlers with `assertCanTrainBrain` when `brainId` is present.
- `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts:635-636` `ingest_fathom_meeting`, `ingest_fireflies_transcript`; `artifact-brain-ingestion-actions.service.ts:475` `ingestFirefliesTranscript()` is a no-arg stub (agent-facing, documented in `agent-sync/data/vibey-api-action-docs.ts:2667`).

Connections and catalog:

- `user_integrations` row per connection (`fathom/repositories/fathom.repository.ts` all access; `metadata.webhook_secret`, `metadata.auto_ingest*`). `vault_secrets` for API keys (`supabase/migrations/20260224170000_vault_and_fireflies.sql:5-17`; `apps/api/src/modules/vault/services/vault.service.ts` `storeSecret/getSecret/hasSecret/deleteSecret`).
- Provider lists to extend: `supabase/migrations/20260224160000_fathom_integration.sql` (seed pattern for `integrations_available`), `apps/api/src/modules/integrations/services/integrations-overview.service.ts:17-60` `INTEGRATION_IDS_FOR_OVERVIEW` (+ `:457-468` Fireflies vault check), `services/personal-cross-context-providers.ts:11-19`, `services/integrations-composio.service.ts:48` `PERSONAL_ONLY`, `apps/api/src/modules/integrations/integrations.module.ts:50-77`.
- Web: `apps/web/src/lib/integrations/integration-catalog.ts:406-422` (Fathom/Fireflies rows), `:431-446` (Cursor row with `connection_fields` and `buildPlatformWebhookUrl`), `integration-logo.ts:28-31`; `apps/web/src/features/settings/components/settings-content/useIntegrations.ts:423-439` `LEGACY_OAUTH_PROVIDERS` + `shouldUseComposio`, `:513-540` connect chain, `:657-662` disconnect chain (file is 872 lines vs 300 hook limit); `integration-connection-label.ts:55-64`.
- Web brain training: `apps/web/src/features/brain/components/training/types.ts:13-14,42-43`, `use-training-modal-integrations.ts:72-100`, `training-queue-dispatch.ts:127-140`, `apps/web/src/lib/brain/brain-import-api.ts:87,111`, `user-add-info-panel/use-user-add-info-fathom-fireflies.ts`.
- Customer signal: `apps/api/src/modules/integrations/fathom/services/fathom-envelope.adapter.ts:112-135` `buildFathomEnvelope`; `packages/api-shared/src/types/customer-interaction.ts:9` `INTERACTION_CHANNELS = ['telegram','widget','fathom']`.

Provider documentation (read 2026-09-11):

- **Read.ai** — [Getting Started with Webhooks](https://support.read.ai/hc/en-us/articles/16352415827219-Getting-Started-with-Webhooks): user or workspace webhooks, Pro/Enterprise only, up to 20 per user; triggers `meeting_end` (and `meeting_start` for workspace webhooks); header `X-Read-Signature` = hex HMAC-SHA256 of the raw body with the base64-decoded signing key; body `request_id` for replay detection; top-level fields `session_id`, `trigger`, `title`, `start_time`, `end_time`, `participants[{name,first_name,last_name,email}]`, `owner{...}`, `summary`, `action_items[{text}]`, `key_questions[{text}]`, `topics[{text}]`, `report_url`, `chapter_summaries[{title,description,topics}]`, `transcript{ speaker_blocks[{start_time,end_time,speaker{name},words}], speakers[{name}] }`, `platform_meeting_id`, `platform`. Retries on non-2xx (FAQ says up to 5 retries; body text says exponential backoff and "stopped" after 25 failures). No pull needed: the payload is complete.
- **Fireflies** — [Webhooks](https://docs.fireflies.ai/graphql-api/webhooks): one webhook URL per user set in Developer settings; event `Transcription completed`; payload `{ meetingId, eventType, clientReferenceId }`; header `x-hub-signature` = SHA-256 HMAC of the payload with a user-defined 16–32 char secret; GraphQL at `https://api.fireflies.ai/graphql`, `Authorization: Bearer <api_key>`. Webhooks fire only for the meeting owner.
- **Fathom** — [Webhooks](https://developers.fathom.ai/webhooks), [Create a webhook](https://developers.fathom.ai/api-reference/webhooks/create-a-webhook.md), [API overview](https://developers.fathom.ai/api-overview.md): Standard Webhooks headers `webhook-id`, `webhook-timestamp`, `webhook-signature`; signed content `${id}.${timestamp}.${rawBody}`; HMAC-SHA256 with the base64 secret after the `whsec_` prefix; 5-minute tolerance. `createWebhook` takes `destination_url`, `triggered_for` (`my_recordings`, `shared_external_recordings`, `my_shared_with_team_recordings`, `shared_team_recordings`) and `include_*` flags, returns `secret`. Heavy calls (transcript/summary) are limited to 30 per minute.

---

## ADR

**Decision.** Introduce a provider-agnostic meeting contract (`MeetingSourceEvent` + `MeetingNoteTakerProvider`) owned by the meetings domain, a single connection-keyed webhook endpoint, a single intake fan-out service, and a single `meeting_transcript_import` brain job. Fathom, Fireflies and Read.ai become adapters. Provider-specific job types, routes and the Fathom-only envelope adapter are removed once callers move.

**Drivers.** ROA-40 asks for one system that any note taker can join. Fireflies brain import ships no content today. Fathom's webhook path accepts unsigned or mis-signed deliveries. The meetings domain already normalizes to one shape, so the contract exists in all but name. Guideline §7 file limits (controller 200, service 600, integration 400) forbid growing `fathom-webhook.service.ts` and `useIntegrations.ts` further.

**Alternatives.**
1. *Clone the Fathom module per provider.* Fast for Read.ai, but triples the fan-out code, leaves the Fireflies defect and the Fathom verification gap in place, and each new provider re-touches ten hardcoded lists.
2. *Route everything through Composio triggers.* Read.ai and Fireflies are not Composio toolkits with meeting triggers in this repo (`PERSONAL_ONLY = ['fathom','fireflies']` are legacy-mode), so this would be a new dependency for no gain.
3. *Contract + adapters (chosen).*

**Why chosen.** Smallest complete path that satisfies "any note taker": the normalized shape, the ingestion service and the `provider` column already exist; the work is naming the seam, adding two adapters, and moving three callers.

**Consequences.** One new NestJS module and one new controller; two small migrations (Read.ai catalog seed, webhook replay table + provider CHECK widening); Fathom webhooks must be re-registered to the new URL (their `destination_url` is stored at Fathom); `external_fathom_recording_ready` keeps its name this pass (63 references, Flow builder contract), gaining a `provider` field instead.

**Follow-ups.** Rename the Flow trigger to `external_meeting_recording_ready` with a flow-capabilities migration; decompose `space-automation-service-06.base.ts` (835 lines) and `useIntegrations.ts` (872 lines); move Fathom OAuth tokens from plaintext `user_integrations` columns to `vault_secrets`; wire Read.ai "import past meetings" once its REST API auth is confirmed.

---

## Extensibility Model

The design separates *what a transcript is* from *how it arrives*. Only the first is fixed.

**Four entry triggers, one intake.** Every path ends in `MeetingIntakeService.intake(source)`:

| Trigger | Who starts it | Adapter group used | Examples |
|---|---|---|---|
| Push | Provider calls our per-connection webhook URL | `push` + `normalize` (+ `pull.fetch` when the ping has no body) | Fathom, Read.ai, Fireflies ping |
| Poll | Our repeatable sweep asks the provider | `pull.pollSince` + `normalize` | Zoom cloud recordings, any MCP-only server |
| User click | Training panel "import past meetings" | `pull.listRecent` + `pull.fetch` | Fathom, Fireflies lists |
| Agent action | Vibey fetches through a tool and hands over the result | `normalize` on an already-fetched payload | `ingest_meeting_transcript` (Phase 4) |

**Adapter = optional capability groups.** `TranscriptProvider = { identity: { id, name, auth: 'oauth2' | 'api_key' | 'signing_key' | 'mcp', manifest }, push?: { verify, parse }, pull?: { listRecent?, fetch, pollSince? }, normalize }`. The registry exposes `capabilities(id)` so the UI can show "import past meetings", "auto-ingest is on", or both. Read.ai implements `push` + `normalize`; Fireflies `push` + `pull` + `normalize`; Fathom all three; an MCP-only provider `pull` + `normalize`.

**Transports are the adapter's business.** REST, GraphQL, or an MCP session are all valid ways to implement `pull.fetch`. MCP is a pull transport: the server never calls us, so an MCP-backed provider joins through poll, user click, or agent action. Both Fathom and Read.ai publish MCP servers.

**Poll sweep (ships with the first pull-only provider).** One BullMQ repeatable `meeting-provider-poll-sweep` registered in `MeetingIntakeModule`, following the pattern at `apps/api/src/modules/brain/services/brain-import-jobs-runtime.base.ts:167-188`; it iterates connections whose provider exposes `pull.pollSince`, stores the cursor in `user_integrations.metadata.poll_cursor`, and hands each result to intake. Not needed for Fathom, Fireflies, or Read.ai.

**Registration lists read the manifest.** `identity.manifest` carries display name, personal-only flag, and auth style; `INTEGRATION_IDS_FOR_OVERVIEW`, `PERSONAL_CROSS_CONTEXT_PROVIDERS`, `PERSONAL_ONLY`, and the brain `SourceType` union derive their meeting-provider entries from the registry instead of being edited per provider. The web catalog stays static, so the web side is two edits: catalog row and logo.

**Media without text.** The contract accepts `mediaUrl` with an empty `transcript`. Transcription is a separate feature; when it exists it slots in before `normalize` without changing the contract.

**Still out of reach by design.** A push we cannot verify (no signature and no per-connection URL) is never accepted as push; it can only enter through user click or agent action.

## Recommended Approach

Build in six phases. Each phase ships alone, and no phase depends on a later one.

- **Phase 0 — Contract, registry, intake, Fathom on the rail.** Behavior-neutral for Fathom except that unsigned or mis-signed deliveries are now rejected.
- **Phase 1 — Generic brain door + Fireflies adapter and webhook.** Fixes the empty Fireflies import.
- **Phase 2 — Read.ai module and adapter.** New provider end to end.
- **Phase 3 — Meetings space landing for all providers.** Fireflies and Read.ai recordings become call rows.
- **Phase 4 — Removal and agent-action consolidation.** Delete provider-specific brain job types, routes, web callers and the stub agent action.
- **Phase 5 — End-to-end flow test: UI, backend, agents.** One real meeting recorded by all three providers, verified across Settings, Meetings space, brain, training panel, Vibey chat and the post-call Slack flow.

---

## Step-By-Step Implementation Plan

### Phase 0 — Contract, registry, intake, Fathom on the rail

1. `apps/api/src/modules/meetings/providers/meeting-source.types.ts` (new)
   - Change: move `FathomTranscriptTurn`, `FathomSourceAction`, `FathomMeetingSource` out of `fathom-meeting-source.ts:1-46` as `MeetingTranscriptTurn`, `MeetingSourceAction`, `MeetingSourceEvent` with `provider: MeetingProviderId` (`'fathom' | 'fireflies' | 'read_ai'`), and add `sourceUrl: string | null` (Read.ai `report_url`, Fireflies `transcript_url`; Fathom keeps `recordingUrl`). Re-export the old names from `fathom-meeting-source.ts` until Phase 4.
   - Why: the meetings domain (`meeting-source-ingestion.service.ts:23-28`, `meeting-recording-reconciliation.ts:13`) already consumes this shape; naming it makes it the contract.
   - Contract: pure types, no I/O.
   - Tests: type-level only; existing `fathom-meeting-source.test.ts` must still pass unchanged.

2. `apps/api/src/modules/meetings/providers/meeting-provider.contract.ts` (new)
   - Change: `interface TranscriptProvider { identity: { id: MeetingProviderId; name: string; auth: 'oauth2' | 'api_key' | 'signing_key' | 'mcp'; manifest: { personalOnly: boolean; logoKey: string } }; push?: { verify(input: { rawBody: Buffer; headers: Record<string, string | undefined>; secret: string }): boolean; parse(rawBody: Buffer): { externalId: string; deliveryId: string | null; eventType: string; inlineEvent: Record<string, unknown> | null } | null }; pull?: { fetch(ctx: ProviderContext, externalId: string, inline: Record<string, unknown> | null): Promise<TranscriptSourceEvent>; listRecent?(ctx: ProviderContext, cursor?: string): Promise<{ items: MeetingListItem[]; nextCursor?: string }>; pollSince?(ctx: ProviderContext, cursor: string | null): Promise<{ events: TranscriptSourceEvent[]; nextCursor: string | null }> }; normalize(raw: Record<string, unknown>): TranscriptSourceEvent }` plus `ProviderContext = { supabase; userId: string; connection: { id: string; userId: string; orgId: string | null; metadata: Record<string, unknown> } }`. `MeetingSourceEvent` in step 1 is named `TranscriptSourceEvent` and gains `kind: 'meeting' | 'call' | 'recording' | 'upload'` and `mediaUrl: string | null`; attendee, action-item and calendar fields become optional.
   - Why: one place that says what a provider must provide, without forcing a webhook on pull-only or MCP-only providers (see Extensibility Model).
   - Tests: none directly; each adapter's tests exercise it.

3. `apps/api/src/modules/meetings/providers/meeting-provider.registry.ts` + `meeting-providers.module.ts` (new)
   - Change: `@Injectable() MeetingProviderRegistry { register(p); get(id): MeetingNoteTakerProvider; list() }`, exported by a dependency-free `MeetingProvidersModule`. Provider modules import it and call `register` in `onModuleInit`.
   - Why: `FathomModule` already imports `MeetingsModule` (`fathom.module.ts:22-28`); putting the registry in a leaf module avoids an import cycle.
   - Tests: `meeting-provider.registry.test.ts` — register twice throws, unknown id returns undefined.

4. `apps/api/src/modules/integrations/fathom/providers/fathom-meeting-provider.ts` (new, ≤400 lines)
   - Change: implement the contract for Fathom. `verifyWebhook` = Standard Webhooks (`webhook-id`, `webhook-timestamp`, `webhook-signature`; HMAC-SHA256 over `${id}.${timestamp}.${body}` with the base64 secret after `whsec_`; reject if `|now - timestamp| > 300s`; `timingSafeEqual`). `parseWebhook` reads `recording_id | id | call_id` and `webhook-id` as `deliveryId`. `fetchMeeting` reuses `FathomApiService.getRecordingTranscript`/`getRecordingSummary` when the inline event lacks `transcript`/`default_summary` (the `ensureTranscriptOnEvent` logic at `fathom-webhook.service.ts:226-263`), then `normalizeFathomMeetingSource`. `listRecent` = `FathomApiService.listMeetings`.
   - Why: replaces secret-as-header lookup (`fathom-api.service.ts:138-157`) with real verification.
   - Tests: `__tests__/fathom-meeting-provider.test.ts` — valid signature, wrong secret, stale timestamp, missing headers, transcript-missing → fetch path.

5. `supabase/migrations/<ts>_meeting_webhook_deliveries.sql` (new)
   - Change: `CREATE TABLE meeting_webhook_deliveries (id uuid pk, provider text not null, connection_id uuid not null references user_integrations(id) on delete cascade, delivery_id text not null, external_id text, received_at timestamptz default now(), unique (provider, connection_id, delivery_id))`; RLS service-role only. Also `ALTER TABLE space_external_automation_events DROP CONSTRAINT space_external_automation_events_provider_check; ADD CONSTRAINT ... CHECK (provider IN ('gmail','outlook','fathom','fireflies','read_ai'))` and the same for `space_external_automation_triggers`.
   - Why: replay protection per Cursor precedent (`cursor_webhook_events`, `cursor-webhook.service.ts:63-77`); Read.ai supplies `request_id`, Fathom `webhook-id`, Fireflies falls back to `meetingId`. The CHECK widening is required before Phase 3 can claim non-Fathom events.
   - Tests: migration applied on the local Supabase stack; unique-violation returns `23505`.

6. `apps/api/src/modules/meetings/intake/meeting-intake.module.ts`, `services/meeting-intake.service.ts`, `repositories/meeting-connections.repository.ts`, `repositories/meeting-webhook-deliveries.repository.ts`, `controllers/meeting-webhooks.controller.ts` (new)
   - Change: `MeetingIntakeModule` imports `BrainModule`, `SpacesModule`, `MeetingsModule`, `MeetingProvidersModule`, `PageGraderModule` (mirrors `fathom.module.ts:21-28`). Controller: `@Post('integrations/meetings/webhooks/:provider/:connectionKey')` with `@Req() RawBodyRequest`, no auth guard; returns 404 for unknown provider/key, 401 for bad signature, 200 for duplicate, 202 on accepted. Repository resolves the connection by `user_integrations.metadata.webhook_key` (new random 32-byte urlsafe token written on connect) and `provider`. Service: `intake({ provider, connection, source })` → (a) `BrainImportJobsService.enqueueMeetingTranscriptImport` (Phase 1; Phase 0 calls `enqueueFathomMeetingImport` for Fathom only), (b) customer-brain outbox rows via a generic `buildMeetingEnvelope(source)` (moved from `fathom-envelope.adapter.ts:112-135`, reading `source.transcript`/`participantEmails`), (c) `SpaceAutomationService.processFathomRecordingEvent` for Fathom only in Phase 0 (all providers in Phase 3), (d) Page Grader + Campaign Brain routes provider-gated to Fathom. Honors `metadata.auto_ingest` and `auto_ingest_billing_*` exactly as `fathom-api.service.ts:121-136`.
   - Why: one chokepoint per AGENTS.md §8.6; the URL carries identity so the payload-email fallback (`fathom-webhook.service.ts:412-474`) is no longer needed.
   - Contract: input raw body + headers; side effects = jobs, outbox rows, space rows; idempotent by `meeting_webhook_deliveries`.
   - Tests: `meeting-intake.service.test.ts` (fan-out with mocked collaborators; auto-ingest off short-circuits; org billing scope forwarded), `meeting-webhooks.controller.test.ts` (404/401/200-duplicate/202).

7. `apps/api/src/modules/integrations/fathom/services/fathom-oauth.service.ts:92-140` and `fathom-api.service.ts:97-114`
   - Change: on connect/reconnect generate `metadata.webhook_key`, register the Fathom webhook with `destination_url = <API_URL>/api/integrations/meetings/webhooks/fathom/<webhook_key>`, keep storing `metadata.webhook_secret` (`fathom.repository.ts:207-232`). Add `scripts/roas/reregister-fathom-webhooks.mjs` that, for every connected Fathom row, deletes the old webhook (`FathomIntegration.deleteWebhook`) and creates the new one. Remove `resolveUserByWebhookSecret` (`fathom-api.service.ts:138-157`) and `resolveUserFromPayload` (`fathom-webhook.service.ts:412-474`).
   - Why: Fathom stores our URL; existing connections keep posting to the old path until re-registered.
   - Tests: update `__tests__/fathom-oauth.service.test.ts` for the destination URL; script dry-run mode prints row count only.

8. `apps/api/src/modules/integrations/fathom/controllers/fathom-webhooks.controller.ts:67-95` and `services/fathom-webhook.service.ts`
   - Change: keep `POST integrations/fathom/webhook` only until the re-registration script has run in production, delegating to `MeetingIntakeService` after resolving the connection by the legacy `metadata.webhook_secret` header match. Delete the route, `FathomWebhookService.processWebhookAsync`, `enqueueCustomerBrainRoute`, `ensureTranscriptOnEvent`, `ensureActionItemsOnEvent` (moved into the adapter) and the `[FATHOM-DEBUG]` logging in the same PR that confirms re-registration. `captureFathomAlias` (`:321-364`) and `matchesFathomAgendaExclusion` (`:91-95`) move into `FathomMeetingProvider` as provider hooks (`beforeIntake(source)`).
   - Why: AGENTS.md §2 — replace, do not accumulate.
   - Tests: `controllers/__tests__/fathom.controller.test.ts` (716 lines) — drop webhook cases that assert payload-based attribution; add one delegation case.

### Phase 1 — Generic brain door + Fireflies adapter and webhook

9. `apps/api/src/modules/brain/services/brain-import-jobs.types.ts:1-14`
   - Change: add `'meeting_transcript_import' | 'campaign_meeting_import'`.
   - Tests: none (type).

10. `apps/api/src/modules/brain/services/brain-import-jobs-enqueue.base.ts`
    - Change: add `enqueueMeetingTranscriptImport(userId, { source: MeetingSourceEvent; brainId?; targetBrain?; contactId? }, orgId)` with dedupe `meeting:${source.provider}:${source.externalRecordingId}` and title `source.title`; add `enqueueCampaignMeetingImport(userId, { campaignId, source, domain? }, orgId)` with dedupe `campaign-meeting:${campaignId}:${provider}:${externalId}`. Payload stores the full normalized source (transcript included; `MAX_PAYLOAD_BYTES` is 5 MB, `brain-import-jobs.base.ts:15`).
    - Why: the adapter fetches text before enqueue, so execution never needs a provider client; this is what fixes Fireflies.
    - Tests: `brain-import-jobs-enqueue.test.ts` — dedupe key, payload shape, active-dedupe conflict returns existing job.

11. `apps/api/src/modules/brain/services/brain-import-jobs-meeting-input.ts` (new helper) and `brain-import-jobs-input.base.ts:30`
    - Change: new `buildMeetingMissionInput(job, payload)` returning `{ targetBrain, contentType: 'meeting_transcript', title: 'Analyze meeting: <title>', campaignId?, input: { target_brain, content_type, skill: 'knowledge-intake', sessionKey: '<provider>:<externalId>', meetingTitle, provider, transcript: turns.map(t => ({ speaker: { display_name: t.speakerName }, text: t.text, timestamp: t.timestamp })), summary: source.providerSummary, actionItems: source.actions.map(a => a.sourceText), participants: source.participantEmails, occurred_at: recordingStart ?? scheduledStart, occurred_until: recordingEnd ?? scheduledEnd, asserted_at, temporal_source: '<provider>_payload', temporal_confidence, brainId?, contact_id? } }`. Two new `case` lines in `buildMissionInput` call it. The `transcript` shape matches `extractContentText` (`execution.base.ts:306-316`).
    - Why: `brain-import-jobs-input.base.ts` is 497 lines; the helper keeps it under 600.
    - Tests: `brain-import-jobs-meeting-input.test.ts` — user target default, campaign target with `campaignId`, customer target requires `contact_id` (else throw, matching the Atlas rule at `execution.base.ts:234`).

12. `apps/api/src/modules/brain/repositories/brain-import-job-status.repository.ts:54-79`, `repositories/memory-stats.repository.ts:392-393`, `services/brain-import-jobs-runtime.base.ts:362-363`, `services/brain-cross-suggestions.service.ts:28-29`
    - Change: add `meeting_transcript_import` (and `campaign_meeting_import` to the campaign list) beside the existing Fathom/Fireflies entries.
    - Why: otherwise the job runs but is invisible in the brain queue UI and skips cross-pollination.
    - Tests: existing repository tests extended with the new type.

13. `apps/api/src/modules/brain/controllers/import-jobs.controller.ts` and `services/brain-import-job-requests.service.ts`
    - Change: add `@Post('meeting-transcript')` body `{ provider, externalId, brainId?, targetBrain?, contactId? }` and `@Post('campaign-meeting')` body `{ campaignId, provider, externalId, domain? }`. The handler resolves the adapter from `MeetingProviderRegistry`, loads the caller's connection, calls `fetchMeeting`, asserts `assertCanTrainBrain` when `brainId` is set (`:116`), then enqueues. The web stops posting whole Fathom meeting objects.
    - Why: the server owns provider access; clients pass ids only.
    - Contract: guards `BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard, CreditsGuard`, 202.
    - Tests: `import-jobs.controller.test.ts` — unknown provider 400, not connected 400, happy path 202.

14. `apps/api/src/modules/integrations/fireflies/providers/fireflies-meeting-provider.ts` (new) and `apps/api/src/modules/meetings/providers/fireflies-meeting-source.ts` (new)
    - Change: `normalizeFirefliesMeetingSource(t: FirefliesTranscript): MeetingSourceEvent` — `externalRecordingId = t.id`, `title`, `recordingUrl = t.video_url ?? t.audio_url`, `sourceUrl = t.transcript_url`, `recordingStart = new Date(t.date).toISOString()`, `recordingEnd = start + duration`, `participantEmails` from `meeting_attendees[].email` ∪ `participants` ∪ `host_email`/`organizer_email`, `providerSummary = summary.overview` (append `short_summary`), `actions` from `summary.action_items` with `sourceKey fireflies:<id>:action:<i>`, `transcript` from `sentences[]` (`speaker_name`, `text`, `start_time` seconds → ISO offset). Adapter: `auth: 'api_key'`; `verifyWebhook` = HMAC-SHA256 of raw body with the stored secret compared to `x-hub-signature` (accept hex with or without `sha256=` prefix — see Missing Evidence); `parseWebhook` = `{ externalId: meetingId, deliveryId: meetingId, eventType }`; `fetchMeeting` = `FirefliesApiService.getTranscript(userId, id)` then normalize; `listRecent` = `listTranscripts` with `skip` cursor.
    - Why: gives Fireflies real content and a push path.
    - Tests: normalizer fixture test (sentences → turns, attendees → emails), signature valid/invalid.

15. `apps/api/src/modules/integrations/fireflies/controllers/fireflies.controller.ts`, `services/fireflies-api.service.ts`, `dto/fireflies.dto.ts`, `fireflies.module.ts`
    - Change: `connect` body gains optional `webhookSecret`; store it in `vault_secrets` with label `webhook_secret`; on connect write `metadata.webhook_key` to the `user_integrations` row and return `webhookUrl` for the UI to display. `status` returns `webhookUrl` and `webhookConfigured`. `transcripts/:id/import` (`:87-93`) and `sync` (`:95-119`) call `enqueueMeetingTranscriptImport` via the adapter's `fetchMeeting`; `sync` gains `skip` paging. Module imports `MeetingProvidersModule` and registers the adapter.
    - Why: same pattern as Cursor's `connection_fields`.
    - Tests: `fireflies.controller.test.ts` (new) — connect stores two secrets, status shape.

16. `apps/web/src/lib/integrations/integration-catalog.ts:414-422`
    - Change: Fireflies row gains `connection_fields: [{ name: 'api_key', ... required: true }, { name: 'webhook_secret', label: 'Webhook signing secret', required: false }]` and a description sentence "Paste your ROAS webhook URL from the Fireflies card into Fireflies → Settings → Developer".
    - `useIntegrations.ts:536-540`: send `connectionData.webhook_secret`; disconnect unchanged.
    - Why: users must paste our URL into Fireflies; we cannot register it via API.
    - Tests: catalog snapshot test; `useIntegrations` connect test for Fireflies payload.

### Phase 2 — Read.ai module and adapter

17. `supabase/migrations/<ts>_read_ai_integration.sql` (new)
    - Change: `INSERT INTO integrations_available (id, provider, name, description, auth_type, is_available, metadata) VALUES ('read_ai','read_ai','Read AI','Connect Read AI so meeting reports, transcripts and action items flow into your brain.','api_key',true,'{}') ON CONFLICT (id) DO UPDATE ...` (pattern `20260224160000_fathom_integration.sql`).
    - Why: `user_integrations.integration_id` FK (`.documentation/integrations/adding-new-integration.md` Step 3).

18. `apps/api/src/modules/integrations/read-ai/` (new module): `read-ai.module.ts`, `controllers/read-ai.controller.ts` (`GET status`, `POST connect { signingKey }`, `POST disconnect`, `POST rotate-webhook-key`), `services/read-ai-api.service.ts`, `repositories/read-ai.repository.ts`, `dto/read-ai.dto.ts` (Zod), `types/read-ai.types.ts` (payload types from the docs above), `providers/read-ai-meeting-provider.ts`
    - Change: connect stores the signing key in `vault_secrets` (`provider 'read_ai'`, label `signing_key`, `secret_type 'custom'`), upserts `user_integrations` (`integration_id 'read_ai'`, `status 'connected'`, `scope_mode 'personal'`, `org_id null`, `metadata.webhook_key`). Adapter: `auth: 'webhook_only'`; `verifyWebhook` = hex HMAC-SHA256 of raw body with `Buffer.from(signingKey,'base64')` vs `X-Read-Signature` (`timingSafeEqual`); `parseWebhook` = `{ externalId: session_id, deliveryId: request_id, eventType: trigger, inlineEvent: body }`, ignoring `meeting_start`; `fetchMeeting` = `normalizeReadAiMeetingSource(inlineEvent)` (no network); `listRecent` omitted.
    - `apps/api/src/modules/meetings/providers/read-ai-meeting-source.ts` (new): `title`, `externalRecordingId = session_id`, `providerMeetingId = platform_meeting_id`, `recordingStart/End = start_time/end_time`, `sourceUrl = report_url`, `participantEmails` from `participants[].email` (skip null) ∪ `owner.email`, `providerSummary` = `summary` + rendered `chapter_summaries` + `key_questions`, `actions` from `action_items[].text` (`sourceKey read_ai:<session>:action:<i>`), `transcript` from `transcript.speaker_blocks` (`speaker.name`, `words`, `start_time` ms epoch → ISO).
    - Why: Read.ai pushes complete reports; no API client is needed for ingest.
    - Tests: fixture = the example payload from the Read.ai article; signature test with a generated base64 key; `meeting_start` returns `null`.

19. Registration lists: `apps/api/src/modules/integrations/integrations.module.ts:50-77` (import `ReadAiModule`), `services/integrations-overview.service.ts:17-60` (add `'read_ai'`; extend the vault check at `:457-468` to `read_ai`/`signing_key`), `services/personal-cross-context-providers.ts:11-19` (add `'read_ai'`), `services/integrations-composio.service.ts:48` (`PERSONAL_ONLY` add `'read_ai'`), `apps/api/src/modules/brain/types/brain.types.ts:21-28` (`SourceType` add `'read_ai'`).
    - Why: each list is a gate the provider must pass (overview visibility, personal-in-org access, scope rules).
    - Tests: `personal-cross-context-providers.test.ts` add case.

20. Web: `apps/web/src/lib/integrations/integration-catalog.ts` (new row `read_ai`, `category 'productivity'`, `auth_type 'api_key'`, `connection_fields: [{ name: 'signing_key', label: 'Webhook signing key', required: true }]`, description tells the user to create a webhook in Read AI → Integrations pointing at the URL shown on the card); `integration-logo.ts` (`case 'read_ai': return '/Integrations/ReadAI.png'`, asset added under `apps/web/public/Integrations/`); `integration-connection-label.ts` (`read_ai` → `metadata.owner_email ?? 'Read AI'`); `useIntegrations.ts` connect/disconnect branches (`/api/integrations/read-ai/connect|disconnect`).
    - `apps/web/src/features/settings/components/settings-content/IntegrationCard.tsx`: show `webhookUrl` with a copy button when the status payload carries it (Fireflies and Read.ai).
    - Why: the card is where the user copies the URL from and pastes the key into.
    - Tests: catalog test; card renders the URL when present.

### Phase 3 — Meetings space landing for all providers

21. `apps/api/src/modules/meetings/services/meeting-source-ingestion.service.ts:162-172`
    - Change: rename `ingestFathomSource` → `ingestMeetingSource` and accept `{ ...scope, source: MeetingSourceEvent, rawEvent?: Record<string, unknown> }`; drop the internal `normalizeFathomMeetingSource` call. `findMatchingMeetingItem` takes `source`. `syncAutomaticCallKind`/`syncCallItemFathomRecording` read `recordedBy` from `source.raw` via a provider-neutral `resolveRecordedBy(source)` helper. Callers to update: `space-automation-service-06.base.ts:376-393`, `fathom-meeting-workspace-attach.service.ts:12`, `fathom-meeting-workspace-backfill.service.ts:26`, `meeting-workspace.service.ts:34`.
    - Why: the service already works on the normalized object after line 172.
    - Tests: `meeting-source-ingestion.service.test.ts` — Fireflies and Read.ai sources produce `meeting_recordings.provider` of the right value.

22. `apps/api/src/modules/meetings/providers/meeting-source-to-recording-event.ts` (new)
    - Change: `toRecordingEvent(source): Record<string, unknown>` producing the field names `processFathomRecordingEvent` and `extractFathomSummary` read (`recording_id`, `title`, `url`, `transcript[{ speaker:{ display_name }, text, timestamp }]`, `default_summary.markdown_formatted`, `action_items[{ description }]`, `calendar_invitees[{ email, name }]`, `recorded_by{ email }`, `recording_start_time`, `recording_end_time`, `provider`). Precedent: `build-fathom-event-from-call-item.ts:26-42`.
    - `space-automation-service-06.base.ts:294-320`: `eventId = \`${event.provider ?? 'fathom'}:${meetingId}\``, `provider: String(event.provider ?? 'fathom')`, `connected_account_id: \`${provider}:${userId}\``; the `TriggerEvent` gains `provider`. `MeetingIntakeService` calls `processFathomRecordingEvent(admin, userId, toRecordingEvent(source))` for every provider.
    - Why: lands non-Fathom calls in the one-room Meetings space without rewriting an 835-line file; the rename of the trigger is deferred (ADR follow-up).
    - Tests: `meeting-source-to-recording-event.test.ts`; automation route test asserting a Read.ai event claims with `read_ai:` prefix.

23. `apps/web/src/features/brain/components/training/*` and `apps/web/src/lib/brain/brain-import-api.ts`
    - Change: `types.ts:13-14,42-43` → single kind `'meeting'` with `{ provider; item: MeetingListItem }`; `use-training-modal-integrations.ts:72-100` → one call `GET /api/integrations/meetings/providers` (new route in `MeetingWebhooksController`'s sibling `MeetingProvidersController`: returns `[{ id, name, connected, supportsListRecent }]`); `training-queue-dispatch.ts:127-140` → `importMeetingTranscript(provider, externalId, opts)` posting to `brain/import-jobs/meeting-transcript`; `brain-import-api.ts:87,111` replaced by `importMeetingTranscript` and `listRecentMeetings(provider, cursor)`. `user-add-info-panel/use-user-add-info-fathom-fireflies.ts` → `use-user-add-info-meetings.ts` parameterized by provider; the two modals become one `meeting-import-modal.tsx` (providers without `supportsListRecent` show "Auto-ingest via webhook is on" instead of a list). `CampaignAddInfo*` dialogs follow the same swap.
    - Why: the panel currently hardcodes two providers; a third would triple it.
    - Tests: update `TrainingPanel.test.tsx`, `CampaignAddInfoPanel.calls.test.tsx`.

### Phase 4 — Removal and agent-action consolidation

24. Delete after callers are moved (grep before each delete): `enqueueFathomMeetingImport`, `enqueueFirefliesTranscriptImport`, `enqueueCampaignFathomImport`, `enqueueCampaignFirefliesImport` (`brain-import-jobs-enqueue.base.ts:72-98,151-169,221-265`); `fathom-meeting`, `fireflies-transcript`, `campaign-fathom`, `campaign-fireflies` routes (`import-jobs.controller.ts:39-72,96-117`) and their request handlers; the `fathom_meeting_import`/`fireflies_transcript_import`/`campaign_*` cases in `brain-import-jobs-input.base.ts:31-99,178-208` and `ensureFathomTranscript` (`execution.base.ts:42-43,410-441`); `fathom-envelope.adapter.ts`; `internal-fathom-import-jobs.controller.ts` (replace with `POST internal/brain/import-jobs/meeting-transcript`); `campaign-knowledge-imports.controller.ts:51,93,120` callers; `fathom-campaign-brain-route.service.ts:137,180` → `enqueueCampaignMeetingImport`. Keep the four legacy type strings in `BrainImportJobType` and the status-list arrays only while `SELECT count(*) FROM brain_import_jobs WHERE job_type IN (...) AND status IN ('queued','processing','retry')` is non-zero, then remove them too.
    - `packages/api-shared/src/types/customer-interaction.ts:9`: `INTERACTION_CHANNELS` add `'fireflies'`, `'read_ai'` (consumers: `apps/mission-worker/src/modules/brain-ops/customer-interaction-envelope.ts`).
    - Why: AGENTS.md §2.
    - Tests: drift check — grep for the removed symbols returns zero; existing brain tests updated.

25. Agent action consolidation (AGENTS.md §8.5 applies; all in one change)
    - `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts:635-636`: replace `ingest_fathom_meeting`/`ingest_fireflies_transcript` with `ingest_meeting_transcript: 'ingestMeetingTranscript'`.
    - `artifact-brain-ingestion-actions.service.ts:434-475`: one handler taking `{ provider, external_id, target_brain?, brain_id?, campaign_id? }` that calls the api's `POST brain/import-jobs/meeting-transcript` (or the internal route) — deletes the stub at `:475`.
    - Schema `artifact-action-schemas.ts:3892` and `artifact-action-additional-schemas.ts:450` → one schema; `dtos/artifact-action.dto.ts:317-318`; `artifact-action-preflight.ts` (coverage + validator: provider ∈ registry ids, `external_id` non-empty); `artifact-action-lifecycle.ts` (active); `artifact-capability.policy.ts:787-788`; `packages/agent-policy/src/actions.ts:295-296`, `registry.ts:304-305` (`write_brain`); `agent-sync/data/vibey-api-action-docs.ts:2660,2667`; `docker/tools/vibey-backend/index.ts:295-296`; `artifact-agent-delegation-task.service.ts:9` regex gains `read\.?ai`.
    - Drift tests to update: `artifact-action-schemas.test.ts:84` (`onHoldActions` count), `agent-capability-source-drift.test.ts`, `creation-output-capability-drift.test.ts`, `vibey-backend-plugin.test.ts:394`, `artifact-action.registry.test.ts`.
    - Error contract (§8.6): route through the existing artifact executor; failures return the structured `error_code`/`user_explanation` fields; `workflow_class: 'brain_import'`.
    - Why: the Fireflies action is a live no-op today; one action per contract matches the rest of the design.
    - Tests: schema/preflight tests for the new action; regression: repeated same-payload call trips the circuit breaker.

### Phase 5 — End-to-end flow test: UI, backend, agents

26. Live acceptance run (app-runner checkout only, per `.claude/rules/testing.md`; never against production data)
    - Setup: one ROAS test user connects Fathom (OAuth), Fireflies (API key + webhook secret, URL pasted into Fireflies Developer settings), and Read.ai (signing key, URL pasted into Read AI Integrations). All three record the same scheduled calendar meeting with at least two attendees and a spoken action item.
    - Checks, each with its evidence:
      1. Settings shows all three as connected with the right account label; each card shows its webhook URL where applicable.
      2. `meeting_webhook_deliveries` holds one row per provider delivery; a replayed delivery adds no row and returns 200.
      3. `brain_import_jobs` holds one `meeting_transcript_import` per provider, each `succeeded`, each payload containing transcript turns.
      4. `ns_memories` holds memories with `source_type` in `fathom|fireflies|read_ai` and `source_id` of `<provider>:<externalId>`; brain search for the action item returns them.
      5. The Meetings space shows **one** call row (not three) with three `meeting_recordings` rows, one primary, a transcript document, and the follow-up under Action items.
      6. Brain training panel lists the meeting under the single "Meetings" source for providers that support `listRecent`; Read.ai shows the auto-ingest state.
      7. Vibey chat answers "what did we agree in <meeting title>" from brain context; the post-call Slack flow (`request_slack_follow_up_confirm`) fires once in Shadow mode with a recap.
      8. Disconnecting Fireflies deletes its vault secrets; its next webhook returns 404.
    - Exit: every check passes or has a linked fix ticket; results recorded in `documentation/features/meeting-note-takers.md` and the wiki Tests page.

27. Docs and logs (every phase)
    - `documentation/features/integration-connections.md` (Data Flow + Decision Log), `documentation/features/meeting-follow-up-slack.md` (webhook path section), new `documentation/features/meeting-note-takers.md` (ask before creating per §7 — the plan proposes it), `.docs/logs/changelog<date>.md`, `.docs/plans/agent-follow-up-work.md` for the deferred trigger rename and the two over-limit files. Wiki: add `documentation/wiki/integrations/meeting-note-takers.html` and a Decisions entry once the wiki branch (`claude/assigned-linear-tasks-a99b12`) is merged.

---

## Data And Contract Map

- **Input:** provider webhook POST (raw body + headers) at `/api/integrations/meetings/webhooks/:provider/:connectionKey`; or authenticated `POST /api/brain/import-jobs/meeting-transcript { provider, externalId, brainId?, targetBrain?, contactId? }`.
- **Validation:** Zod DTOs per controller (backend guideline "Zod on all inputs"); adapter `parseWebhook` returns `null` for unusable bodies → 400; unknown provider → 404.
- **AuthN/AuthZ:** webhook = connection key in URL + provider HMAC over raw body (Fathom Standard Webhooks with 5-min window; Fireflies `x-hub-signature`; Read.ai `X-Read-Signature`), all `timingSafeEqual`; authenticated routes keep `BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard, CreditsGuard`; `assertCanTrainBrain` when `brainId` is given; org billing scope from `metadata.auto_ingest_billing_*` with the role check at `fathom-api.service.ts:169-181` generalized.
- **Storage:** `user_integrations` (connection, `metadata.webhook_key`, `auto_ingest*`), `vault_secrets` (Fireflies `api_key` + `webhook_secret`, Read.ai `signing_key`), `meeting_webhook_deliveries` (replay), `brain_import_jobs` (`meeting_transcript_import` payload = normalized source), `brain_ops_outbox` (customer envelope), `space_external_automation_events`/`meeting_recordings`/`space_items` (Meetings space), `ns_memories` via Atlas (`source_type` = provider id, `source_id` = `<provider>:<externalId>`, `source_title`, temporal fields).
- **Output:** webhook 202/200/401/404 JSON; import routes 202 `{ success, jobId, deduped }` as today.
- **Side effects:** brain job, outbox rows, call row + transcript doc + follow-ups in the Meetings space, Slack post-call automation (existing), Page Grader/Campaign Brain (Fathom-gated until those services accept a source).
- **Idempotency:** `meeting_webhook_deliveries` unique `(provider, connection_id, delivery_id)`; `brain_import_jobs` active dedupe key; `space_external_automation_events.composio_event_id` unique; `meeting_recordings` unique `(user_id, provider, external_recording_id)`.

---

## Test Plan

- **Unit:** three normalizers with fixture payloads (Fathom existing test, Fireflies GraphQL shape, Read.ai example payload); three `verifyWebhook` suites (valid, wrong key, missing header, Fathom stale timestamp, tampered body); registry; `buildMeetingMissionInput` (user/campaign/customer targets; customer without `contact_id` rejected); `toRecordingEvent`; `buildMeetingEnvelope` parity with the current `buildFathomEnvelope` test (`__tests__/fathom-envelope.adapter.test.ts`).
- **Integration (vitest, mocked Supabase):** `MeetingWebhooksController` status codes; `MeetingIntakeService` fan-out counts; duplicate delivery → no second job; auto-ingest off → nothing enqueued; Fireflies webhook → GraphQL fetch → job payload contains `transcript` turns (the regression for today's empty import).
- **E2E / manual (app-runner checkout only, per `.claude/rules/testing.md`):** connect Read.ai with a real signing key, use Read AI "Send test request" → expect 202, a `brain_import_jobs` row with `job_type = meeting_transcript_import`, a call row in the Meetings space; Fireflies: set webhook URL + secret, upload a short audio via the Fireflies dashboard → same expectations; Fathom: reconnect → new webhook visible in `GET integrations/fathom/webhooks`, next recording arrives at the new URL and the old route logs zero hits.
- **Regression:** full `pnpm --filter @vibey/api test` and `pnpm --filter @vibey/web test`; agent-api drift tests after Phase 4; `apps/api` LOC check on every touched file (600 service / 200 controller / 400 integration).

---

## Rollout And Verification

- **Commands:** `pnpm --filter @vibey/api typecheck && pnpm --filter @vibey/api test`, `pnpm --filter @vibey/web typecheck && pnpm --filter @vibey/web test`, `pnpm --filter @vibey/agent-api test` (Phase 4). Migrations via Supabase MCP against `lhfgtsjetcardinpgouq` only, after review.
- **Deploy:** api and web deploy on merge to `main` (Vercel). After the Phase 0 merge, run `node scripts/roas/reregister-fathom-webhooks.mjs --dry-run`, then live; confirm in Vercel logs that `integrations/meetings/webhooks/fathom/*` receives the next recording. Delete the legacy Fathom route in the following PR.
- **Logs to inspect:** `MeetingWebhooksController` 401 counts (should be zero for legitimate traffic), `meeting_webhook_deliveries` growth, `brain_import_jobs` rows by `job_type`, `ns_memories.source_type` distribution for `fireflies`/`read_ai`.
- **Flags:** none required; new providers only affect users who connect them. Fathom verification tightening is the one behavior change for existing users and is gated by re-registration.
- **Rollback:** revert the PR; legacy Fathom route remains until Phase 0's follow-up PR, so Fathom traffic is unaffected by a Phase 0 rollback. Read.ai/Fireflies webhooks simply return 404 until redeployed.

---

## Missing Evidence

- **Fireflies `x-hub-signature` encoding** (hex vs base64, `sha256=` prefix). Smallest experiment: set a webhook URL + secret on a test Fireflies account, upload a short audio, capture one delivery's headers on a local tunnel. Risk if skipped: every Fireflies webhook rejected with 401.
- **Fireflies webhook retry policy** — undocumented. Experiment: return 500 once during the test above and observe redelivery. Risk: a transient failure loses a meeting (mitigation: the existing manual `sync`).
- **Read.ai retry count** — the article says both "up to 5 retries" and "stopped after 25 consecutive failures". Experiment: same as above. Risk: low (idempotent intake).
- **Read.ai REST API auth and endpoints** (support article 49381161088659 returned HTTP 403 to automated fetch). Needed only for "import past meetings"; the webhook path does not need it. Risk if skipped: Read.ai has no manual import list in Phase 2 (UI shows webhook-only state).
- **Fathom `destination_url` accepting a path with a token segment.** Experiment: create one webhook on a test account with the new URL and observe a delivery. Risk: re-registration script fails; fallback is a query-string key.
- **Read.ai brand asset** for `/Integrations/ReadAI.png` — confirm licensing/source before adding.
- **Where an MCP-backed `pull.fetch` runs.** MCP client code exists in `apps/agent-api/src/modules/mcp/` (`mcp.repository.ts` reads `user_integrations` and `vault_secrets`); `apps/api` has no MCP client. Experiment: check whether `apps/api` can import an MCP client without pulling agent-api runtime, else route MCP fetches through an internal agent-api endpoint. Risk if skipped: the first MCP provider lands in the wrong app.
- **Active legacy job rows** at Phase 4 time: `SELECT job_type, count(*) FROM brain_import_jobs WHERE status IN ('queued','processing','retry') GROUP BY 1` before deleting type strings.

---

## Findings surfaced while planning (not part of ROA-40 scope)

1. `fireflies_transcript_import` sends Atlas only the transcript id (`brain-import-jobs-input.base.ts:81-99` + `execution.base.ts:320`); Phase 1 fixes it, but it is a live defect today.
2. Fathom webhook verification compares the header to the stored secret string and falls back to invitee-email attribution for unsigned deliveries (`fathom-api.service.ts:138-157`, `fathom-webhook.service.ts:412-474`); Phase 0 fixes it.
3. `ingest_fireflies_transcript` agent action is a no-arg stub (`artifact-brain-ingestion-actions.service.ts:475`) exposed to agents; Phase 4 replaces it.
4. Over-limit files touched by this plan: `useIntegrations.ts` (872 lines, hook limit 300), `space-automation-service-06.base.ts` (835 lines, limit 600), `integrations-core.service.ts` (620). Logged in `.docs/plans/agent-follow-up-work.md`.
5. Fathom OAuth tokens live in plaintext `user_integrations` columns while API keys are encrypted in `vault_secrets` (`fathom.repository.ts:43-44,197-198`).
