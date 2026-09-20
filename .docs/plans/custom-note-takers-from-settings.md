# Custom note takers from Settings ("More integrations")

Parent: ROA-40 (meeting modular system). Branch: `claude/roa-40-modular-meeting-system`.
Written 2026-09-14 from the delivered code at commit `1aaf9f1d`.

## 1. Exact request

- **Goal.** A platform admin presses **More integrations** in Settings › Integrations, sees a row of
  integration-type cards, picks **Note taker**, fills in the configuration a new tool needs, saves it,
  and the tool appears in the Library for every user. No code change per tool.
- **In scope.** The dialog (type cards → note-taker form → save), a stored definition, a generic
  webhook plug-in that runs any definition through the existing door and intake, user connect and
  disconnect for a defined tool, listing in Library and Manage.
- **Out of scope.** Tools that need OAuth or polling (still a code plug-in), past-meeting lists for
  custom tools, Vibey importing from a custom tool by id, other integration types behind the other
  cards (shown, not functional).
- **Decisions already made by the user (2026-09-14).** No-code custom note taker; only platform
  admins define; everyone sees and connects.
- **Assumption to confirm.** Type cards other than Note taker are shown disabled with "Coming soon",
  because only note takers have a no-code backend.

## 2. Evidence pack (all verified in the checkout)

| Fact | Where |
|---|---|
| Provider ids are a closed union `['fathom','fireflies','read_ai']`; four places assume it | `apps/api/src/modules/meetings/providers/transcript-source.types.ts:9-15`, `intake/dto/meeting-import.dto.ts:4`, `internal/controllers/internal-meeting-import-jobs.controller.ts:20`, `providers/transcript-document.ts:3` |
| Registry is an in-memory map, sync `get`/`require`, `capabilities()` | `providers/meeting-provider.registry.ts:14-44` |
| Door: `isMeetingProviderId` → `registry.get` → connection by `integration_id` + `webhook_key` (status connected) → verify → parse → claim → intake | `intake/services/meeting-intake.service.ts:64-135`, `intake/repositories/meeting-intake.repository.ts:19-34` |
| Push-only plug-in template (verify, parse with ignore, resolveSecret from vault, normalize) | `integrations/read-ai/providers/read-ai-transcript-provider.ts:21-70` |
| Vault takes provider and label as free strings | `vault/services/vault.service.ts:68-121` |
| `user_integrations.integration_id` is a FK to `integrations_available(id)` | `supabase/migrations/20260218114336_ghl_integrations_schema.sql:4-19` |
| Overview lists only a fixed id array; personal-in-org ids also fixed | `integrations/services/integrations-overview.service.ts:17-64`, `personal-cross-context-providers.ts` |
| Pasted-webhook connect helpers (upsert, ensureWebhookKey, markDisconnected) | `intake/repositories/meeting-intake.repository.ts:69-160` |
| Platform admin = `profiles.role` in (`admin`,`superadmin`); API guard `@UseGuards(AuthGuard, RoleGuard) @Roles('admin')` | `packages/api-shared/src/guards/role.guard.ts:90-101`; web `useUserRole` maps superadmin → admin (`apps/web/src/hooks/use-user-role.ts:26-30`) |
| Web catalog is static; `getAvailableIntegrations(isPlatformAdmin)`; Library groups by `category` with fixed order and labels | `apps/web/src/lib/integrations/integration-catalog.ts:573`, `settings-content/IntegrationsLibrary.tsx:14-31,96-110` |
| Toolbar with Manage/Library tabs and "Add connection" | `settings-content/IntegrationsView.tsx:133-165` |
| Api-key connect dialog reads `integration.connection_fields`; card picks it when `auth_type === 'api_key'` | `IntegrationApiKeyConnectDialog.tsx`, `IntegrationCard.tsx:56-81` |
| Card logo: `getIntegrationLogoPath(provider)` or initials; `Integration.logo_url` exists in the type but the card does not read it | `IntegrationCard.tsx:152,182`, `lib/integrations/integrations.types.ts:7-11` |
| Webhook address on Manage row only for providers in a fixed set | `lib/integrations/meeting-webhook-url.ts:9-20` |
| Dialog rules: Radix Dialog + Portal, tokens only, 36 px inputs | `.docs/guidelines/design/design-guidelines.md` §8, §10 |
| LOC: `useIntegrations.ts` 885 (hook limit 300, pre-existing, logged); `IntegrationsView.tsx` 316; `integration-catalog.ts` 575 | `wc -l` |

## 3. Root design

Today a note taker exists only as a Nest class. The modular boundary already separates "how a
tool arrives" (plug-in) from "what happens next" (door, intake, brain job, Meetings space). A
**definition** is data that fully describes a push-only plug-in: how to verify, which event to
accept, and where in the JSON each field lives. One **generic plug-in class** instantiated from a
definition satisfies the existing `TranscriptProvider` contract, so nothing after the registry
changes.

Ownership:
- Definitions and the generic plug-in live in the meetings domain: `apps/api/src/modules/meetings/custom/`.
- Admin CRUD and the type cards live in Settings › Integrations (web) and the meetings intake module (API).
- The catalog row for a custom tool is synthesized from the definition on both sides
  (`integrations_available` row for the FK; `Integration` object for the Library).

## 4. ADR

- **Decision.** Store note-taker definitions in a new table; resolve provider ids with a `nt_` prefix
  through a dynamic resolver on the registry that builds a `CustomWebhookTranscriptProvider` per
  request from the definition; keep built-in plug-ins untouched.
- **Drivers.** No code per tool; reuse the door, replay table, intake, brain job and Meetings route;
  Vercel functions are ephemeral so in-process caches are unreliable across instances.
- **Alternatives.** (a) Boot-time load of definitions into the registry: stale across instances after
  an admin write. (b) Registry-driven Library only: still code per tool, rejected by the user.
  (c) Generic provider without a stored definition (config in connection metadata): every user would
  configure the mapping; admins should do it once.
- **Why chosen.** One DB read per webhook is cheap and always fresh; the contract stays closed for
  built-ins and open by prefix for definitions.
- **Consequences.** Provider id types widen to `BuiltIn | \`nt_${string}\``; three zod enums become
  refinements; overview id lists become dynamic for the `nt_` prefix. Custom tools are push-only in v1.
- **Follow-ups.** Standard-Webhooks signature scheme (id.timestamp.body) as a second option; pull
  capability (bearer + list endpoint) so custom tools can appear in Train; Vibey `ingest_meeting_transcript`
  accepting `nt_` ids once pull exists; migrate Read AI onto the generic connect route.

## 5. Data model

Migration `supabase/migrations/20260915090000_meeting_provider_definitions.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.meeting_provider_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^nt_[a-z0-9_]{2,40}$'),
  display_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  signature JSONB NOT NULL,      -- see NoteTakerSignatureConfig
  event JSONB NOT NULL,          -- see NoteTakerEventConfig
  field_map JSONB NOT NULL,      -- see NoteTakerFieldMap
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_provider_definitions ENABLE ROW LEVEL SECURITY;
-- service role only; the API enforces the admin role.
```

On create the service also upserts `integrations_available` (`id = slug`, `provider = slug`,
`auth_type = 'api_key'`, `metadata = { connection_mode: 'pasted_webhook', managed_by: 'roas', kind: 'note_taker' }`)
so `user_integrations` rows can reference it. Deactivate sets both `is_active` and `is_available` false.

Config shapes (zod in `meetings/custom/note-taker-definition.schema.ts`):

```ts
signature: { scheme: 'none' } | {
  scheme: 'hmac_sha256'; header: string; encoding: 'hex' | 'base64';
  prefix?: string; keyEncoding: 'utf8' | 'base64' }
event: { eventTypePath?: string; acceptValues?: string[]; deliveryIdPath?: string }
field_map: {
  externalId: string; title?: string; startTime?: string; endTime?: string; hostEmail?: string;
  sourceUrl?: string; summary?: string;
  participants?: { path: string; email?: string; name?: string };
  transcript: { path: string; speaker?: string; text: string; timestamp?: string };
  actions?: { path: string; text: string; assigneeName?: string; assigneeEmail?: string } }
```

Paths are dot paths; `[]` marks an array to iterate (`transcript.speaker_blocks[]`). Implemented in
`meetings/custom/json-path-lite.ts` (`readValue`, `readList`), no dependency.

## 6. Step-by-step change map

### Phase A: backend (tests first, one commit)

1. `meetings/providers/transcript-source.types.ts`: `BUILT_IN_MEETING_PROVIDER_IDS` (old array),
   `CUSTOM_PROVIDER_ID_PATTERN = /^nt_[a-z0-9_]{2,40}$/`, `MeetingProviderId = BuiltIn | \`nt_${string}\``,
   `isMeetingProviderId` accepts both. Add optional `providerDisplayName?: string` to `TranscriptSourceEvent`.
2. `providers/transcript-document.ts`: display name = `source.providerDisplayName ?? MEETING_PROVIDER_DISPLAY_NAMES[built-in] ?? provider`; the record becomes `Partial<Record<...>>`.
3. `intake/dto/meeting-import.dto.ts` and `internal/controllers/internal-meeting-import-jobs.controller.ts`: `z.string().refine(isMeetingProviderId)`.
4. `providers/meeting-provider.registry.ts`: add `registerResolver(fn: (id) => Promise<TranscriptProvider | null>)`,
   `async resolve(id)` (built-in map first, then resolver), `async listCapabilities()` (built-ins + resolver's `listAll()`).
   Keep `get`/`require` for built-ins. Update the three callers: `meeting-intake.service.ts:74` (`await resolve`),
   `:144` (`intakeForUser`), `meeting-imports.controller.ts:41,50`.
5. New `meetings/custom/`:
   - `note-taker-definition.schema.ts` (zod for create/update, slug derivation `nt_` + slugified name).
   - `json-path-lite.ts` + test.
   - `mapped-meeting-source.ts`: `normalizeMappedMeetingSource(raw, definition)` → `TranscriptSourceEvent` (reuses the helper style of `read-ai-meeting-source.ts`; sets `providerDisplayName`).
   - `custom-webhook-transcript-provider.ts`: class taking `(definition, vault)`; `push.verify` per scheme (`timingSafeEqual`), `push.parse` (JSON, externalId via map, deliveryId path, event filter → `ignore`), `push.resolveSecret` → vault `(slug, 'signing_key')` or `''` sentinel for `none` (verify returns true only when scheme is none), `normalize`.
   - `meeting-provider-definitions.repository.ts`: list active, find by slug, insert, update, deactivate, upsert `integrations_available`.
   - `meeting-provider-definitions.service.ts`: validate, slug uniqueness, create/update/deactivate, `preview(definition, samplePayload)` returning `{ title, turns, participants, actions, externalId }` or the normalizer error.
   - `custom-note-taker.resolver.ts`: implements the registry resolver (`resolve(id)` → build provider from active definition; `listAll()` → capabilities from definitions).
   - `custom-note-takers.module.ts`: imports `MeetingProvidersModule`, `VaultModule`; registers the resolver in `onModuleInit`; exports repository. Imported by `MeetingIntakeModule` and `IntegrationsModule`.
6. Admin routes, `intake/controllers/meeting-provider-definitions.controller.ts` (`@Controller('integrations/meetings/definitions')`):
   `GET /` (AuthGuard; any user; active definitions, used by the Library), `POST /`, `PATCH /:slug`, `DELETE /:slug` (deactivate), `POST /preview` — the writes and preview use `@UseGuards(AuthGuard, RoleGuard) @Roles('admin')`.
7. Generic connect, `intake/controllers/meeting-connections.controller.ts` (`@Controller('integrations/meetings/:provider')`, custom ids only):
   `GET status`, `GET webhook-address` (creates or reads a `pending` connection row with a key so the address shows before connecting; pending rows never receive deliveries because the door filters `status = connected`), `POST connect { secret? }` (secret required when scheme ≠ none; vault `(slug,'signing_key')`; status → connected; Meetings space bootstrap), `POST disconnect`. Service `intake/services/meeting-connections.service.ts`. Repository gains `upsertPendingWebhookConnection`.
8. Overview: `integrations-overview.service.ts` and `personal-cross-context-providers.ts` append active `nt_` slugs (injected repository); `integrations-composio.service.ts` `PERSONAL_ONLY` check becomes prefix-aware.
9. Tests (vitest, `__tests__` next to code): json-path-lite; mapped source with a Read-AI-shaped sample and a flat sample; provider verify hex/base64/prefix/none/wrong header; parse event filter + delivery id; definitions service slug + integrations_available upsert + preview; registry resolve built-in/custom/unknown; intake `handleWebhook` with `nt_` id (404 inactive slug, 401 bad signature, 200 duplicate, 202); connections service pending → connected → disconnected; overview includes `nt_` rows. Re-run the meetings, integrations, internal, brain suites.

### Phase B: web (tests first, one commit)

10. `lib/integrations/meeting-provider-definitions.ts`: types + `fetch/create/update/deactivate/preview` calls; `definitionToIntegration(def): Integration` (category `productivity`, `auth_type 'api_key'`, `connection_fields` = `[secret]` when scheme ≠ none, `logo_url`, description). Export from the domain barrel.
11. `settings-content/useIntegrations.ts`: load definitions with the overview (one added `Promise.all` entry), `availableIntegrations = [...static, ...definitions.map(definitionToIntegration)]`; connect/disconnect delegate to `settings-content/meeting-provider-connect.ts` for `nt_` ids (two lines each, keeps the 885-line hook from growing further; hook decomposition stays the logged follow-up).
12. `lib/integrations/meeting-webhook-url.ts`: providers in the set or matching `^nt_`; read `metadata.webhook_key` from a pending or connected row. `IntegrationAccountsGroup.tsx` already renders it; `IntegrationCard.tsx` shows the address for custom tools before connect by calling `GET webhook-address` when the connect dialog opens (small hook `useMeetingWebhookAddress`).
13. `integration-connection-label.ts`: `nt_` → connection label or definition name. `IntegrationCard.tsx`: prefer `integration.logo_url` when set, then `getIntegrationLogoPath`, then initials.
14. "More integrations": `IntegrationsView.tsx` gets a button next to Add connection, rendered only when `isPlatformAdmin` (new prop threaded from `useIntegrations`). New files in `settings-content/more-integrations/`:
    - `MoreIntegrationsDialog.tsx` (Radix Dialog per §10; step state; step 1 = type cards row built from `CATEGORY_LABELS` order plus a first card "Note taker"; only Note taker enabled, others carry a "Coming soon" tag).
    - `NoteTakerDefinitionForm.tsx` (name, description, logo URL, signature block, event block).
    - `NoteTakerFieldMapSection.tsx` (the field-map inputs with the path syntax hint).
    - `NoteTakerPreviewPanel.tsx` (sample payload textarea → preview call → result or error).
    - `use-note-taker-definition-form.ts` (state, validation messages from `config/messages.config.ts` of the settings feature if present, payload builder).
    On save: create → refresh definitions → toast → close. Each file under 400 LOC.
15. Tests: `definitionToIntegration`, `meeting-webhook-url` prefix, connection label, dialog step flow (render cards, disabled cards, open form, validation, submit calls create), form state builder.

### Phase C: docs and tracking

16. `documentation/features/integration-connections.md` item 66 + decision log; changelog; `.docs/plans/agent-follow-up-work.md` (pull for custom tools, Standard-Webhooks scheme, Vibey action ids, Read AI onto generic connect, hook decomposition).
17. Wiki (branch `claude/wiki-roa-9`): Features › Meeting note takers gets section "Add a new note taker without code"; Integrations page section 5 updated; home Recently changed; search index.
18. Linear: sub-issue under ROA-40, "Custom note takers from Settings (More integrations)", phases A to C as checklist; comments per phase in plain words.

## 7. Test plan summary

Automated as listed per phase. Manual on the app-runner: admin defines a tool from a Read AI sample
payload (proves the mapping with the preview), a non-admin does not see the button, the tool appears
in Library for both, a user copies the address before connecting, connects with a secret, a signed
test POST returns 202 and produces a Meetings call row and a brain job, an unsigned POST returns 401,
a repeat returns duplicate, disconnect makes the next POST 404.

## 8. Missing evidence and assumptions

- Whether the settings feature has `config/messages.config.ts`; if not, add it for the dialog's
  user-facing messages (AGENTS.md §7).
- Type cards other than Note taker: shown disabled with "Coming soon" (to confirm with the user).
- Estimated effort: Phase A 1.5 days, Phase B 1.5 days, Phase C 0.5 day.
