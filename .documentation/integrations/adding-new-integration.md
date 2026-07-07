# Adding a New Integration

Standard process for adding any new integration to Vibey (Composio or legacy).

---

## Prerequisites

- Access to Supabase MCP (project: `qfrvykscoymiwwgysvsr`)
- Access to Composio dashboard (for Composio-backed integrations)
- API backend running locally (`pnpm dev:back`)

---

## Step 1 — Determine Execution Mode

| Mode       | When to use                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `composio` | Provider is available in Composio toolkit catalog. OAuth and tool execution managed by Composio.                 |
| `legacy`   | Provider has a custom backend module in `apps/api/src/modules/integrations/`. OAuth and API calls managed by us. |

---

## Step 2 — Register in `project_composio_toolkit_config` (Composio only)

Create an auth config in Composio dashboard, then insert a row:

```sql
INSERT INTO project_composio_toolkit_config (
  integration_id, toolkit_slug, auth_config_id, auth_mode, enabled, metadata
) VALUES (
  'notion',                    -- our internal integration_id
  'notion',                    -- Composio toolkit slug
  'ac_XXXXXXXXXXXXX',          -- auth config ID from Composio
  'managed',                   -- 'managed' (Composio OAuth) or 'custom' (our own OAuth app)
  true,
  jsonb_build_object('execution_mode', 'composio')
);
```

---

## Step 3 — Register in `integrations_available`

Ensures FK constraints pass when users connect:

```sql
INSERT INTO integrations_available (id, provider, name, description, auth_type, is_available, metadata)
VALUES (
  'notion', 'notion', 'Notion',
  'Connect Notion to manage pages, databases, and workspace content.',
  'oauth2', true,
  jsonb_build_object('managed_by', 'composio')
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata,
  updated_at = now();
```

---

## Step 4 — Assign Domain(s)

Add the integration to `INTEGRATION_DOMAIN_MAP` in:

**`apps/api/src/modules/composio/composio.service.ts`**

```typescript
const INTEGRATION_DOMAIN_MAP: Record<string, string[]> = {
  // ... existing entries
  notion: ['shared'], // available to all agent domains
}
```

Domain options:

- `shared` — all agent domains can use (calendly, google_drive, etc.)
- `marketing` — marketing agents only (instagram, linkedin, meta, etc.)
- `analyst` — analyst agents (stripe analytics, etc.)
- `developer` — developer agents (github, etc.)
- Multiple domains: `['marketing', 'analyst']` (e.g. stripe)

---

## Step 5 — Run Capabilities Sync

Run the CLI script from the `apps/api` directory:

```bash
# Sync only NEW integrations (skips already-synced ones)
cd apps/api && pnpm sync:capabilities

# Sync a specific integration
cd apps/api && pnpm sync:capabilities -- --only notion

# Sync multiple specific integrations
cd apps/api && pnpm sync:capabilities -- --only notion,slack

# Full re-sync of everything (same as old behavior)
cd apps/api && pnpm sync:capabilities -- --force
```

Or from the monorepo root:

```bash
pnpm --filter @vibey/api sync:capabilities              # new only
pnpm --filter @vibey/api sync:capabilities -- --only notion   # specific
pnpm --filter @vibey/api sync:capabilities -- --force         # full re-sync
```

**Default behavior (no flags):** Only syncs integrations that don't already have rows in `integration_capabilities`. This is the mode you want when adding a new integration — fast, skips everything already in the DB.

**`--only <slugs>`:** Syncs only the listed integration(s), regardless of whether they already exist. Use comma-separated slugs for multiple.

**`--force`:** Full re-sync of all enabled toolkits + all legacy entries. Use when you need to refresh embeddings or update descriptions across the board (~10-15 min for ~1,200+ actions).

This builds the backend, then for each synced toolkit:

- Fetches all tools from Composio (up to 500 per toolkit)
- Parses each tool into: `action_slug`, `display_name`, `description`, `parameters`
- Generates a vector embedding for each action
- Writes domain tags from `INTEGRATION_DOMAIN_MAP`
- Upserts into `integration_capabilities`

---

## Step 6 — Add to UI

### Settings Library

Add the integration to `availableIntegrations` in:

**`apps/web/src/features/settings/components/settings-content/useIntegrations.ts`**

```typescript
{
  id: 'notion',
  provider: 'notion',
  name: 'Notion',
  description: 'Connect Notion to manage pages, databases, and workspace content.',
  category: 'productivity',
  is_active: true,
},
```

### Integration Icons

Add logo to `apps/web/public/Integrations/Notion.png` and register in:

- `apps/web/src/features/studio/components/ChatInput.tsx` → `INTEGRATION_ICONS` + `INTEGRATION_NAMES`
- `apps/web/src/features/settings/components/settings-content/IntegrationCard.tsx` → `getLogoPath`
- `apps/web/src/features/settings/components/settings-content/ConnectedIntegrationCard.tsx` → logo switch
- `apps/web/src/features/studio/components/StudioHome.tsx` → `INTEGRATION_ICONS`

### Composio Pre-Connect Modal

If this is a Composio integration, the `IntegrationCard` automatically shows the Composio pre-connect modal based on the `providerModes` from the backend. No extra work needed.

---

## Step 7 — Verify

1. Connect the integration from Settings -> Library
2. Open a new conversation, ask the agent about the integration
3. Verify: agent calls `get_integration("notion")` -> gets action list -> executes correctly
4. Verify: a developer agent does NOT see marketing-only integrations
5. Verify: integration appears in composer dropdown when connected

---

## For Legacy Integrations (non-Composio)

If the provider is not in Composio:

1. Skip Step 2 (no `project_composio_toolkit_config` row needed)
2. Build the backend module in `apps/api/src/modules/integrations/<provider>/`
3. Add `route_config` for each action in `@vibey/api-shared` `legacy-integration-routes.ts` (`LEGACY_INTEGRATION_ROUTE_MAP`) so `integration_capabilities.route_config` is populated on sync
4. Add capability rows to `LEGACY_INTEGRATION_CAPABILITIES` in `apps/api/src/modules/composio/composio.service.ts`
5. Run capabilities sync
6. Add UI entries (same as Step 6)

---

## Summary Checklist

- [ ] Execution mode determined (composio / legacy)
- [ ] `project_composio_toolkit_config` row (Composio only)
- [ ] `integrations_available` row
- [ ] Domain assigned in `INTEGRATION_DOMAIN_MAP`
- [ ] Capabilities sync run
- [ ] UI: `availableIntegrations` entry
- [ ] UI: logo + icon mappings
- [ ] Verified: agent discovery works (`get_integration`)
- [ ] Verified: domain masking works (correct agents see it)
- [ ] Verified: connect/disconnect works from Settings
