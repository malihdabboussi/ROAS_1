# Adding a CRM source to background contact sync

This guide extends the **CRM background sync** pipeline (queue-worker `crm-sync` BullMQ queue, `crm_sync_jobs` table, Studio import dialogs). It is separate from [adding-new-integration.md](./adding-new-integration.md), which covers Composio/Settings/agent discovery.

## What already exists

- **DB:** `public.crm_sync_jobs` — one row per user request; `source` is constrained by a CHECK (today: `activecampaign`, `gohighlevel`).
- **Worker:** [apps/queue-worker/src/modules/crm-sync/](apps/queue-worker/src/modules/crm-sync/) — scheduler polls `queued` rows, processor runs `CrmSyncService.processJob`.
- **API:** `POST /api/leads/crm-sync`, `GET /api/leads/crm-sync/:id` — see [leads.controller.ts](apps/api/src/modules/leads/controllers/leads.controller.ts) and [leads.service.ts](apps/api/src/modules/leads/services/leads.service.ts).
- **Web:** `startCrmSync` / `getCrmSyncStatus` in [leads.service.ts](apps/web/src/features/studio/services/leads.service.ts); “Sync entire account” in AC/GHL import dialogs.

## Steps to add e.g. Mailchimp or HubSpot

### 1. Database

Allow the new source value on `crm_sync_jobs.source`:

- Add a migration that drops and recreates the CHECK constraint, or replaces it with an updated list including your slug (e.g. `mailchimp`).
- Keep slugs **lowercase**, stable, and aligned with API + worker (same string everywhere).

### 2. API validation

In `LeadsService.assertCrmIntegrationConnected` and `LeadsService.startCrmSync`:

- Accept the new `source` in the validation branch (replace the two-way check with a whitelist or switch).
- Verify the integration is connected for that user (vault row, `user_integrations`, or your own table).

### 3. Worker: paginator + credentials

In [crm-sync.service.ts](apps/queue-worker/src/modules/crm-sync/services/crm-sync.service.ts) (or a dedicated helper file per provider):

1. Resolve credentials (pattern A or B below).
2. Loop the provider’s **pagination** until exhausted (offset, cursor, or `next` token).
3. Map each remote contact to rows compatible with `importContactsBatchForUser` / `contacts` insert:
   - `email` (required, valid format),
   - `first_name`, `last_name`, `phone`, `contact_source` (string shown in CRM).

**Pattern A — Vault (like ActiveCampaign)**  
Provider `active_campaign` uses `vault_secrets` labels `api_url` and `api_key`. Decrypt with [vault-decrypt.ts](apps/queue-worker/src/lib/services/vault-decrypt.ts) and `VAULT_ENCRYPTION_KEY` (same format as API `VaultService`).

**Pattern B — OAuth on `user_integrations` (like GoHighLevel)**  
Use [GhlEmailHelper.listContactsPageForCrmSync](apps/queue-worker/src/modules/shared/helpers/ghl-email.helper.ts) as a reference: load integration, refresh token if needed, call REST with version headers as required.

Wire the new source in `processJob` → `runXxxSync` (mirror `runActiveCampaignSync` / `runGhlSync`).

### 4. Progress fields

After each page, update `crm_sync_jobs`:

- `fetched` — cumulative contacts read from the provider.
- `imported` / `skipped` — cumulative from `importContactsBatchForUser`.
- `total_remote` — set when the API exposes a total (AC); optional for cursor-only APIs (leave `null`).

### 5. Frontend

- Extend `CrmSyncSource` and `startCrmSync` typing in [apps/web/.../leads.service.ts](apps/web/src/features/studio/services/leads.service.ts).
- In the import dialog for that CRM, add **Sync entire account** calling `startCrmSync('your_source')` and poll `getCrmSyncStatus` (copy AC/GHL dialog pattern).

### 6. Ops

- Deploy migration; ensure **queue-worker** has `VAULT_ENCRYPTION_KEY` if the new source uses vault.
- Monitor the new queue in Bull Board (`/admin/queues` on the worker).

## Checklist

- [ ] Migration: extend `crm_sync_jobs.source` CHECK
- [ ] API: `startCrmSync` + `assertCrmIntegrationConnected` for new source
- [ ] Worker: credential resolution + paginated fetch + map to import rows
- [ ] Worker: branch in `CrmSyncService.processJob`
- [ ] Web: types + dialog button + polling UI
- [ ] Manual test: small account, then large (rate limits / runtime)
