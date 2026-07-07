# How to Add New Actions

Two types of actions exist in Vibey. Pick the right section based on what you're adding.

| Type                   | When to use                                                                           | Agent calls it via                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Integration action** | Adding a new API endpoint to an existing integration (Fathom, Stripe, Calendly, etc.) | `use_integration { service: "fathom", integration_action: "get_transcript", params: {...} }` |
| **Artifact action**    | Adding a new first-party tool (save_document, create_pdf, generate_image, etc.)       | Direct action call: `{ action: "save_document", data: {...} }`                               |

---

## PART 1: Adding an Integration Action (e.g. Fathom `get_transcript`)

This is the most common case. An integration already exists, you're adding a new action to it.

### The 4 places you MUST update

Every integration action must exist in ALL 4 places. Miss one and it breaks silently.

| #   | Where                                                                          | What                                                                   | Why                                                                   |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | **Vercel backend controller**                                                  | HTTP route that handles the request                                    | The actual endpoint the proxy hits                                    |
| 2   | **`integration_capabilities` DB table**                                        | Row with `route_config`, `description`, `parameters`                   | Agent discovers available actions from this table                     |
| 3   | **`LEGACY_INTEGRATION_CAPABILITIES` array**                                    | Entry in `apps/api/src/modules/composio/composio.service.ts`           | Source of truth for the sync process that populates/refreshes DB rows |
| 4   | **`FATHOM_ROUTES` / `STRIPE_ROUTES` / etc. in `legacy-integration-routes.ts`** | Route config in `packages/api-shared/src/legacy-integration-routes.ts` | Hardcoded route map used by sync to populate `route_config` in DB     |

### Step-by-step

#### Step 1 — Backend controller route

File: `apps/api/src/modules/integrations/<provider>/controllers/<provider>.controller.ts`

Add a new `@Get` / `@Post` / etc. endpoint with `@UseGuards(AuthGuard)`:

```typescript
@Get('recordings/:recordingId/transcript')
@UseGuards(AuthGuard)
async getTranscript(
  @Supabase() supabase: SupabaseClient,
  @CurrentUser() user: { id: string },
  @Param('recordingId') recordingId: string,
) {
  if (!recordingId) throw new BadRequestException('recordingId is required')
  const result = await this.api.getRecordingTranscript(supabase, user.id, recordingId)
  return { success: true, ...result }
}
```

If the underlying API method doesn't exist yet, add it to:

- `integrations/<provider>/integrations/<provider>.integration.ts` — raw API call
- `integrations/<provider>/services/<provider>-api.service.ts` — service wrapper with token refresh

#### Step 2 — Route config in `legacy-integration-routes.ts`

File: `packages/api-shared/src/legacy-integration-routes.ts`

Add the route to the provider's routes object (e.g. `FATHOM_ROUTES`):

```typescript
const FATHOM_ROUTES: Record<string, IntegrationLegacyRouteConfig> = {
  // ... existing routes
  get_transcript: { method: 'GET', path: `${FATH}/recordings/:recordingId/transcript` },
}
```

Path params use `:paramName` syntax. They get substituted from the agent's `params` object at runtime by `buildLegacyIntegrationHttpRoute`.

Available config options:

- `method` — HTTP method
- `path` — URL path with `:param` placeholders
- `query_params` — `{ agentParamKey: "queryStringKey" }` mapping
- `query_remainder: true` — forward all unused params as query string (GET only)
- `alt_path` / `alt_when` — alternative path when a specific param is present

#### Step 3 — `LEGACY_INTEGRATION_CAPABILITIES` array

File: `apps/api/src/modules/composio/composio.service.ts`

Add an entry in the `LEGACY_INTEGRATION_CAPABILITIES` array under the integration's section:

```typescript
{
  integration_id: 'fathom',
  action_slug: 'get_transcript',
  execution_mode: 'legacy',
  display_name: 'Get Meeting Transcript',
  description: 'Retrieve the FULL word-for-word transcript of a Fathom recording. ...',
  parameters: { recordingId: { type: 'string', required: true } },
  examples: [],
  metadata: {},
  domains: [],
},
```

**Description matters.** This is what the agent reads to decide whether to call this action. Be explicit about:

- When to use it vs. other actions
- What it returns
- What params it needs and where to get them (e.g. "Requires recording_id from list_meetings")
- Any behavioral guardrails (e.g. "ONLY use when user explicitly asks for summary")

#### Step 4 — DB row in `integration_capabilities`

Insert directly via SQL or run the capabilities sync:

```sql
INSERT INTO integration_capabilities (
  integration_id, action_slug, execution_mode,
  display_name, description, parameters, route_config
) VALUES (
  'fathom', 'get_transcript', 'legacy',
  'Get Meeting Transcript',
  'Retrieve the FULL word-for-word transcript...',
  '{"recordingId": {"type": "string", "required": true}}',
  '{"path": "/api/integrations/fathom/recordings/:recordingId/transcript", "method": "GET"}'
);
```

Or run sync to populate from the code sources:

```bash
cd apps/api && pnpm sync:capabilities -- --only fathom
```

### How the runtime chain works

```
Agent calls: use_integration { service: "fathom", integration_action: "get_transcript", params: { recordingId: "123" } }
       ↓
ArtifactLegacyIntegrationsService.useIntegration()
       ↓
resolveIntegrationExecutionMode() → checks project_composio_toolkit_config → "legacy"
       ↓
resolveLegacyIntegrationHttpRoute() → queries integration_capabilities DB for route_config
       ↓
buildLegacyIntegrationHttpRoute() → substitutes :recordingId → GET /api/integrations/fathom/recordings/123/transcript
       ↓
target.mainApiCall("GET", "/api/integrations/fathom/recordings/123/transcript", sessionKey)
       ↓
Chat session: Bearer token → Vercel backend
Mission session: x-internal-token + x-user-id → Vercel backend
       ↓
FathomController.getTranscript() → FathomApiService → Fathom external API
       ↓
Response flows back to agent
```

### Verification checklist

- [ ] Controller route exists and typechecks (`pnpm exec tsc --noEmit` in `apps/api`)
- [ ] Service + integration methods exist (with token refresh pattern)
- [ ] Route added to `<PROVIDER>_ROUTES` in `legacy-integration-routes.ts`
- [ ] Entry added to `LEGACY_INTEGRATION_CAPABILITIES` array in `composio.service.ts`
- [ ] DB row exists in `integration_capabilities` (manual insert or sync)
- [ ] `route_config.path` matches the controller route exactly
- [ ] Path param names in `route_config` match what the agent sends in `params`
- [ ] Works in **chat** session (Bearer token auth)
- [ ] Works in **mission** session (internal token proxy)

---

## PART 2: Adding an Artifact Action (e.g. `create_pdf`, `save_document`)

Artifact actions are first-party tools — not integration proxies. They're called directly by the agent via the action name.

### The 4 places you MUST update

| #   | Where               | What                                                                      |
| --- | ------------------- | ------------------------------------------------------------------------- |
| 1   | **DTO validation**  | Action name in `VALID_ACTIONS` array                                      |
| 2   | **Action registry** | `ACTION_METHOD_MAP` entry mapping action → method name                    |
| 3   | **Service method**  | The actual implementation                                                 |
| 4   | **Agent tool docs** | Action description in `vibey-api-action-docs.ts` so agents know it exists |

### Step-by-step

#### Step 1 — Add to `VALID_ACTIONS`

File: `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`

Add the action name to the `VALID_ACTIONS` array:

```typescript
export const VALID_ACTIONS = [
  // ... existing actions
  'my_new_action',
] as const
```

#### Step 2 — Add to `ACTION_METHOD_MAP`

File: `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`

Map the action name to the method name on the service:

```typescript
export const ACTION_METHOD_MAP: Record<ArtifactAction, string> = {
  // ... existing mappings
  my_new_action: 'myNewAction',
}
```

#### Step 3 — Implement the method

Either add to an existing service file or create a new one. The method signature:

```typescript
async myNewAction(data: Record<string, unknown>, sessionKey?: string): Promise<unknown> {
  // implementation
}
```

If in a new service file:

- Create in `apps/agent-api/src/modules/artifacts/services/`
- Wire handlers in the service's `getHandlers()` method (same pattern as `ArtifactStateMetaIntegrationsGithubTeamBrainService`)
- Register as provider in `apps/agent-api/src/modules/artifacts/artifacts.module.ts`

#### Step 4 — Add agent-facing documentation

File: `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`

Add a description entry so agents know the action exists, what it does, and when to call it:

```typescript
{
  action: 'my_new_action',
  section: 'documents',
  description: 'What it does, when to use it, required params, what it returns.',
}
```

### RBAC (if needed)

If the action should be restricted to certain agent levels/domains, update:

File: `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`

Add the action to the appropriate capability set.

### Verification checklist

- [ ] Action in `VALID_ACTIONS` array
- [ ] Action in `ACTION_METHOD_MAP`
- [ ] Method implemented on service class
- [ ] Service registered in `artifacts.module.ts` (if new service)
- [ ] Handler wired in `getHandlers()` (if using extracted service pattern)
- [ ] Description in `vibey-api-action-docs.ts`
- [ ] RBAC policy updated (if restricted)
- [ ] Typechecks clean (`pnpm exec tsc --noEmit` in `apps/agent-api`)
- [ ] Works in both chat and mission sessions

---

## Common mistakes

| Mistake                                                                      | Symptom                                                       | Fix                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Added DB row but not `LEGACY_INTEGRATION_CAPABILITIES`                       | Next sync overwrites/misses the action                        | Always add to both                                           |
| Added to `LEGACY_INTEGRATION_CAPABILITIES` but not route map                 | DB row has `route_config: null` → agent gets "Unknown action" | Add to `<PROVIDER>_ROUTES` in `legacy-integration-routes.ts` |
| Controller route path doesn't match `route_config.path`                      | 404 from Vercel backend                                       | Paths must be identical                                      |
| Param name in `route_config` (`:recordingId`) doesn't match what agent sends | Empty string substituted in URL                               | Use same param name everywhere                               |
| Missing `@UseGuards(AuthGuard)` on controller                                | 500 or unauthenticated access                                 | Always add the guard                                         |
| Added action to DTO but not to registry                                      | "Action not found" at runtime                                 | Must be in both `VALID_ACTIONS` and `ACTION_METHOD_MAP`      |
| Description doesn't explain when to use                                      | Agent picks wrong action or never calls it                    | Be explicit about use cases and guardrails                   |
