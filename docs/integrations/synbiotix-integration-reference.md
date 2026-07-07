# Synbiotix Integration — Technical Reference

Internal reference for the Synbiotix (hospital CRM) integration proposal.
Direction 1: Vibey POSTs qualified leads to Synbiotix. Direction 2: Vibey GETs revenue/financial data from Synbiotix.

Everything below is derived from the actual codebase as of 2026-06-12. Where a capability does **not** exist, that is stated plainly together with the lightest viable approach.

---

## 1. Lead / Contact Data Model

The canonical lead entity is the **`contacts`** table. The legacy `leads` table still exists but its sync trigger was retired (`supabase/migrations/20260610160000_retire_sync_lead_to_contact.sql`); the app layer (`apps/api/src/modules/leads/`) now writes contacts directly.

### 1.1 `contacts` table

Base definition: `supabase/schema.sql:360-373`. TypeScript types: `packages/db/src/types.ts:962-1006`.

| Field | Type | Required | Description | External sharing |
|---|---|---|---|---|
| `id` | UUID | yes (default) | Primary key | **Safe** — use as external lead reference |
| `user_id` | UUID | yes | Owning Vibey user (`profiles.id`) | Internal only |
| `org_id` | UUID | no | Tenant org scope (`...20260327100001_add_org_id_to_existing_tables.sql:35`) | Internal only |
| `email` | TEXT | no | Contact email | **Safe** (PII — needs consent basis) |
| `first_name` | TEXT | no | First name | **Safe** (PII) |
| `last_name` | TEXT | no | Last name | **Safe** (PII) |
| `phone` | TEXT | no | Phone | **Safe** (PII) |
| `tags` | TEXT[] | yes (default `{}`) | Array of tag IDs referencing `contact_tags` | Safe after resolving IDs → names |
| `source` | TEXT | no | Legacy origin enum: `funnel` \| `import` \| `manual` | Safe |
| `source_id` | UUID | no | Originating resource (e.g. funnel id) | Internal only (opaque UUID) |
| `custom_fields` | JSONB | yes (default `{}`) | Custom field values keyed by `field_key` | Case-by-case (may hold PII) |
| `contact_type` | TEXT | yes (default `'lead'`) | `lead` \| `customer` \| `unknown` (`supabase/migrations/20260218*_022_contacts_crm_fields.sql:9`) | **Safe** |
| `contact_source` | TEXT | no | Normalized channel enum: `funnel` \| `form` \| `widget` \| `telegram` \| `import` \| `manual` \| `automation` \| `integration` (`supabase/migrations/20260610150500_contacts_source_channel_normalization.sql`) | **Safe** |
| `contact_source_detail` | TEXT | no | Channel variant, e.g. `csv`, `activecampaign` (same migration:4) | Safe |
| `contact_type_source` | TEXT | yes (default `'inferred'`) | How `contact_type` was set: `inferred` \| `manual` \| `integration` (`supabase/migrations/20260507142000_customer_brain_infra.sql:58`) | Internal only |
| `contact_type_confidence` | NUMERIC | yes (default 0.5) | 0–1 confidence of classification (same:59) | Internal only |
| `contact_type_set_at` | TIMESTAMPTZ | yes | When classification was set (same:60) | Internal only |
| `is_archived` / `archived_at` | BOOL / TIMESTAMPTZ | yes / no | Soft-delete flag (`022_contacts_crm_fields.sql:15-18`) | Internal only |
| `business_name`, `website`, `city`, `state`, `country` | TEXT | no | Optional firmographic/geo fields (`022_contacts_crm_fields.sql:22-34`) | **Safe** |
| `created_at`, `updated_at` | TIMESTAMPTZ | yes | Timestamps | Safe |

Unique constraint: one email per tenant — `(COALESCE(org_id, user_id), email)` (`supabase/migrations/20260610180000_contacts_owner_scoped_email_unique.sql`).

### 1.2 Custom fields

- Definitions: `contact_custom_field_definitions` (`supabase/migrations/20260218084131_create_contact_tags_custom_fields_segments.sql:2-17`) — `name`, `field_key`, `field_type` (default `'text'`), `options` JSONB, `default_value`, `is_required`, `display_order`. Unique on `(user_id, field_key)`.
- Values: stored in `contacts.custom_fields` JSONB keyed by `field_key`.

### 1.3 Tags

`contact_tags` table (same migration:26-42): `id`, `user_id`, `name`, `color` (default `#8B5CF6`). Contacts hold tag **IDs** in `contacts.tags TEXT[]` — any outbound payload must resolve IDs to names first.

### 1.4 Identifiers (multi-handle resolution)

`contact_identifiers` (`supabase/migrations/20260507142000_customer_brain_infra.sql:71-103`): `kind` (`email`, `phone`, `slack_user_id`, `telegram_chat_id`, `ig_handle`, `linkedin_url`, `fathom_attendee_id`, `gmail_thread_participant`, `x_handle`, `website_visitor_id`), `value`, `confidence`, `source`, `first_seen_at`/`last_seen_at`. Tenant-scoped unique `(owner_key, kind, value)` (`supabase/migrations/20260610150000_contact_identifiers_tenant_scope.sql:67-72`). Normalization (email lowercase, phone digits+plus): `apps/api/src/modules/leads/services/contact-identifier.service.ts:75-80`.

### 1.5 Source / attribution

What exists:

- `contact_source` + `contact_source_detail` (channel + variant, above).
- `contact_identifiers.source` (where each handle came from).
- Funnel/campaign membership tables `contact_funnel_memberships` / `contact_campaign_memberships` (`supabase/migrations/20260218154025_021_contact_memberships.sql:13-88`) with `source_funnel_id`, `last_source_domain` (referrer domain), `last_page_slug`, `first_seen_at`/`last_seen_at`, `offer_id`/`anchor_type`/`anchor_source` (`20260507142000_customer_brain_infra.sql:127-130`).

What does **not** exist: there are no UTM parameter columns and no first-touch UTM capture anywhere in schema or form-submission code. There is also no dedicated `form_id` column on contacts (form context is passed as `contact_source_detail` = form title; see `apps/api/src/modules/forms/services/forms.service.ts:484-570`). If Synbiotix needs UTM-level attribution, it would have to be added (lightest approach: capture into `custom_fields` or membership `metadata` JSONB at form-submit time).

### 1.6 Activity / journey timeline

- `contact_activity` (`supabase/migrations/20260429180000_contact_activity.sql`): currently a CHECK constraint allows **only `event_type = 'field_change'`**. There are no `form_submitted` / `email_opened` / `webinar_attended` / `call_booked` events on the contact timeline today.
- `contact_notes` (`supabase/migrations/20260427130000_create_contact_notes.sql`): free-text notes per contact.
- Conversations link: `conversations.contact_id` (`supabase/migrations/20260429193000_conversations_contact_link.sql:3`) plus a per-day message rollup function (`supabase/migrations/20260610170000_contact_conversation_message_rollup.sql:6-32`).
- Email engagement (`email_sends`, `email_events`, `email_suppressions` — SendGrid webhook handler at `apps/api/src/modules/email/controllers/webhooks.controller.ts`) is keyed to email sends, **not** joined into the contact timeline.

Implication for the proposal: a "journey summary" field in an outbound lead payload must be composed at send time (notes + activity + membership data); there is no precomputed journey object.

### 1.7 Internal-only fields (never share)

`user_id`, `org_id`, `owner_key`, `source_id`, `contact_type_source`, `contact_type_confidence`, `contact_type_set_at`, `is_archived`/`archived_at`, membership row UUIDs, and any `contact_identifiers` rows for third-party platforms (Slack/Telegram/Gmail handles reveal unrelated platform identity).

---

## 2. Outbound Integration Mechanism

### 2.1 What exists

**There is no user-configurable outbound webhook system.** No "send a webhook on form submit / contact created" capability exists anywhere in the codebase. Webhook infrastructure is inbound-only (Cursor: `apps/api/src/modules/integrations/cursor/services/cursor-webhook.service.ts`; SendGrid email events; Google Drive push; Telegram/Slack).

What Vibey does have for pushing data out:

1. **Per-provider server-to-server REST clients** (the relevant pattern):
   - **GoHighLevel lead push** — the only true outbound *lead* push today. `upsertLeadContactInGhl` (`apps/api/src/modules/integrations/gohighlevel/services/gohighlevel-oauth.service.ts:165-210`) finds a contact by email, then POST/PUT to `https://services.leadconnectorhq.com/contacts/` (`apps/api/src/modules/integrations/gohighlevel/integrations/gohighlevel.integration.ts:262-329`).
     - Auth: `Authorization: Bearer <OAuth access token>` (token refresh handled in the OAuth service).
     - Headers: `Content-Type: application/json`, `Accept: application/json`, provider `Version` header.
   - **ActiveCampaign client** — `apps/api/src/modules/integrations/activecampaign/integrations/activecampaign.integration.ts`. Auth: `Api-Token: <key>` header (line 32); bodies wrapped per AC convention `{ "contact": { ... } }` (lines 68-92); includes `/contact/sync` upsert (line 90-92).
   - Credentials are stored AES-256-GCM-encrypted in `vault_secrets` (`supabase/migrations/20260224170000_vault_and_fireflies.sql`); decryption at call time (`apps/queue-worker/src/modules/crm-sync/services/crm-sync.service.ts:138-169`).
2. **Queue-based job runner** (`crm_sync_jobs` table + `apps/queue-worker/src/modules/crm-sync/`) — note this currently runs **imports** (pulls contacts *from* AC/GHL *into* Vibey), but it is the established pattern for long-running CRM jobs: BullMQ worker, job rows with `status`/`fetched`/`imported`/`skipped`/`last_error`, unique partial index preventing duplicate active jobs per `(user_id, source)` (`supabase/migrations/20260324140000_crm_sync_jobs.sql:25-27`).
3. **Internal outbox** (`mission_outbox`, `apps/mission-worker/src/modules/missions/services/missions.outbox-dispatcher.service.ts`) — internal-only event delivery, but its reliability profile is the house standard: 8 attempts, exponential backoff 2 s base / 60 s cap, circuit breaker after 5 consecutive failures (30 s open), `dedupe_key` idempotency, dead-letter handling.

### 2.2 Honest gaps

- **No HMAC signing of outbound requests.** Inbound webhooks are signature-verified; outbound calls are not signed.
- **No idempotency keys / event IDs sent.** Idempotency is achieved only via provider-native upsert semantics (AC `/contact/sync`; GHL find-by-email-then-create-or-update).
- **No retry policy or explicit timeout** on the direct CRM HTTP calls — plain `fetch` with runtime defaults; a non-2xx throws immediately (`gohighlevel.integration.ts:288-290`, `activecampaign.integration.ts:39-42`).
- **No outbound rate limiting or payload size limits.**

### 2.3 Recommended mechanism for Synbiotix

Build a **Synbiotix integration module following the GHL pattern** (dedicated REST client + OAuth/API-key creds in `vault_secrets`), with delivery executed through a **queue-worker job** (the `crm_sync_jobs` pattern) rather than inline in the request path. This is recommended because it reuses the two patterns that already exist in production (typed per-provider client; job table with status/error tracking and duplicate-job protection), and the queue layer is where retry/backoff and an idempotency key (use `contacts.id` as `external_ref`) can be added without touching the request path. Lightest viable hardening to promise Synbiotix: `X-Vibey-Event-Id: <uuid>` header + `external_ref` in the body for dedupe, and optional HMAC-SHA256 of the body in an `X-Vibey-Signature` header — the HMAC helper pattern already exists in the codebase for OAuth state signing (`gohighlevel-oauth.service.ts:227-231`).

---

## 3. Sample Lead (Sanitized)

### 3.1 What the current serializer actually sends

The only lead-push serializer in production is the GHL upsert. Its exact body (`gohighlevel.integration.ts:277-284`) is **flat camelCase, identity fields only** — no tags, no attribution, no journey:

```json
{
  "locationId": "loc_abc123",
  "email": "jane.doe@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "name": "Jane Doe",
  "phone": "+447700900123"
}
```

### 3.2 Proposed Synbiotix payload (extension of the canonical record)

No richer serializer exists today — the following is the proposed shape, built 1:1 from real `contacts` columns (snake_case, as stored) plus composed-at-send-time blocks. Fields marked ⊕ require composition logic that exists as data but not yet as a serializer.

```json
{
  "external_ref": "5f0c2b1e-9d3a-4c87-b1f2-7a6e0d4c9e21",
  "event_id": "a3d9c4f0-1b2e-4f6a-8c7d-0e9f1a2b3c4d",
  "contact": {
    "email": "jane.doe@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "phone": "+447700900123",
    "business_name": null,
    "city": "Manchester",
    "state": null,
    "country": "GB",
    "contact_type": "lead",
    "contact_source": "funnel",
    "contact_source_detail": "knee-clinic-landing",
    "created_at": "2026-05-30T14:12:09Z"
  },
  "tags": ["hot-lead", "knee-consultation"],
  "custom_fields": {
    "preferred_clinic": "Manchester",
    "enquiry_type": "knee_replacement"
  },
  "attribution": {
    "source_funnel_id": "f7e6d5c4-...",
    "last_source_domain": "google.com",
    "last_page_slug": "book-consultation",
    "first_seen_at": "2026-05-30T14:10:51Z"
  },
  "journey_summary": "⊕ Composed from contact_notes + contact_activity + conversation rollup at send time"
}
```

Real-source mapping: `contact.*` → `contacts` columns; `tags` → `contact_tags.name` resolved from `contacts.tags` IDs; `custom_fields` → `contacts.custom_fields` JSONB verbatim; `attribution` → `contact_funnel_memberships` row; `journey_summary` ⊕; `event_id` ⊕ (Section 2.3). Do not present `journey_summary`, `event_id`, or HMAC signing to the client as existing capability.

---

## 4. Inbound Revenue Data Requirements

### 4.1 Existing ingestion patterns

- **Stripe (closest analogue):** OAuth-connected, **read-on-demand** REST client — `apps/api/src/modules/integrations/stripe/integrations/stripe.integration.ts`, analytics in `services/stripe-api.service.ts`. Revenue metrics (gross/refunds/fees/net, daily chart) are computed at query time from `GET /v1/balance_transactions` with `created[gte]`/`created[lte]` unix-timestamp range and `starting_after` cursor pagination (limit 100). **No Stripe webhook handler and no local transactions table exist** — nothing is persisted. Campaign attribution is via Stripe object `metadata.campaign_id`, not DB relations.
- **No contact↔revenue link exists.** No column ties a payment to a `contacts.id` anywhere.
- **Polling/sync pattern to reuse:** Google Drive sync (`apps/api/src/modules/integrations/google-drive/sync/drive-sync.service.ts`) — per-mapping `sync_interval_seconds`, `next_sync_at`, `sync_status` (`idle|syncing|error`), `last_sync_error`, cursor checkpointing, hard caps per sync run. Plus `brain_import_jobs` (`apps/api/src/modules/brain/services/brain-import-jobs.service.ts`) for queued jobs with `dedupe_key`, 3 attempts, exponential backoff.

So for Synbiotix revenue: the realistic build is a **polling sync job** (Drive-sync pattern) that GETs Synbiotix's API on an interval, persists rows into a new revenue table, and joins on our lead reference.

### 4.2 Fields we need per revenue record

| Field | Requirement | Why |
|---|---|---|
| `external_lead_ref` | **Required** | Must echo back the `external_ref` (our `contacts.id`) we sent in the lead POST. This is the only way to attribute revenue — we have no other join key. Fallback: patient email (matchable via `contact_identifiers` kind=`email`), but email matching is fuzzy and should be fallback only. |
| `transaction_id` | **Required** | Stable unique ID on their side, for idempotent upsert (dedupe on re-poll). |
| `amount` | **Required** | Integer minor units (cents/pence) preferred — matches the Stripe convention already used in our analytics layer (`stripe.types.ts`, amounts in cents). |
| `currency` | **Required** | ISO 4217 lowercase (Stripe convention). |
| `transaction_date` | **Required** | ISO 8601 UTC. |
| `service_identifier` | **Required** | Treatment/service code + display name; maps to our per-product attribution pattern (`metadata.product_id`/`product_name` in `stripe-api.service.ts`). |
| `patient_status` | Nice-to-have | e.g. `enquiry` \| `consultation_booked` \| `treated`; would drive our `contact_type` lead→customer transition (`contacts.contact_type`, `contact_type_source='integration'`). |
| `status` / refund flag | Nice-to-have | To net out refunds the way our Stripe overview does. |
| `location/clinic id` | Nice-to-have | Only if multi-site reporting is in scope. |

### 4.3 Preferred GET conventions (grounded in patterns we already consume)

- **Pagination:** cursor-based — `limit` (≤100) + `starting_after=<last_id>` (Stripe pattern we already implement) or `nextPageToken` (Drive pattern). Either works; offset pagination is acceptable but least preferred.
- **Date range:** `from`/`to` query params, ISO 8601 or unix seconds — we already build `created[gte]`/`created[lte]` windows in `stripe-api.service.ts`.
- **Envelope:** `{ "data": [...], "has_more": true|false }` (Stripe shape our client parses today) or `{ "data": [...], "next_page_token": "..." }`.
- **Polling frequency we can support:** configurable per-mapping `sync_interval_seconds` (Drive-sync pattern); propose **hourly** default, daily acceptable, anything ≥5 min technically fine. We should not promise real-time ingestion — we have no inbound webhook receiver for them today (one could be added later using the SendGrid/Cursor verified-webhook pattern, `apps/api/src/modules/email/controllers/webhooks.controller.ts`).
- **Auth for our GET calls:** static API key header or OAuth2 client-credentials — both supported by our `vault_secrets` + `user_integrations` infrastructure (`supabase/migrations/20260218114336_ghl_integrations_schema.sql`).

---

## 5. Compliance and Constraints

### 5.1 What exists

- **GDPR posture:** documented in the privacy policy (`apps/website/src/app/legal/privacy-policy.md`) — legitimate-interest basis, data-subject rights (access/correction/deletion/portability), no sale of personal data, 30-day deletion windows for connected-platform data (Google/PayPal/Meta), contact info@vibey.im. Erasure is **manual** — there is no automated right-to-erasure workflow or data-export endpoint in code.
- **Tenant isolation:** full RLS on `contacts` and related tables — per-command policies scoping to `user_id` or org membership (`supabase/migrations/20260513144500_perf_phase2_optionA_smart_batch.sql`).
- **Encryption:** integration credentials encrypted at rest with AES-256-GCM (`vault_secrets`; implementation pattern in `apps/agent-api/src/modules/browser-sessions/browser-sessions.service.ts`). Transport is HTTPS/TLS via Supabase and hosting platform. **Contact PII columns (`email`, `phone`, names) are stored plaintext** — no pgcrypto/column-level encryption.
- **Rate limits (inbound):** agent-api global 100 req/60 s (`apps/agent-api/src/app.module.ts`) with stricter per-endpoint limits on chat/widget routes. Body limits: 15 MB on main API (`apps/api/src/main.ts:39-40`), 50 MB on agent-api (`apps/agent-api/src/main.ts:68`).
- **Outbound limits:** none — no throttling, retry, or payload caps on outbound CRM calls (Section 2.2).
- **PII redaction:** exists only for agent chat output (`apps/agent-api/src/modules/chat/services/response-filter.service.ts`), not for integration payloads or logs.
- **Audit logging:** only superadmin impersonation is audit-logged (`supabase/migrations/20260610190000_superadmin_impersonation.sql`). There is no contact-level access/read/export audit trail.
- **Retention:** no retention policy or TTL cleanup for contacts. Soft-archive exists (`is_archived`), deletes are hard deletes.
- **Consent:** funnel/form opt-in exists, but there is **no "consent to share with third-party CRM" field** on contacts or forms.

### 5.2 Healthcare-specific flags for the proposal

Leads become patients, so treat lead data as potentially health-adjacent (an enquiry for "knee replacement" is itself sensitive). Recommendations on what to promise vs disclaim:

**Safe to promise:** TLS in transit; tenant-isolated storage (RLS); encrypted credential storage; GDPR data-subject-rights handling (manual fulfillment); only the minimal field set in Section 3 is transmitted; UK/EU GDPR lawful-basis language per the existing privacy policy.

**Must disclaim / not promise:**
- **HIPAA/BAA:** the pitch deck claims "SOC 2 + HIPAA" (`apps/website/src/app/vibey-pitch/PitchDeckV1.tsx`) but there is no BAA template, no PHI encryption at rest, and no HIPAA audit logging in the codebase. Do not assert HIPAA compliance in the proposal. (If the client is UK NHS-adjacent, UK GDPR/DPA 2018 + a DPA contract is the relevant frame anyway, not HIPAA.)
- Field-level encryption of contact PII (does not exist).
- Automated retention/erasure schedules (do not exist).
- Contact-level access audit trail (does not exist).
- Real-time webhook delivery guarantees, retries, or signed payloads (Section 2.2 — propose as new build, not existing capability).

**Pre-go-live build items implied by a healthcare client:** signed DPA (and BAA only if US/HIPAA actually applies), explicit CRM-share consent capture on intake forms, contact-level audit logging, a retention SLA + cleanup job, and the outbound hardening from Section 2.3.

---

*Generated 2026-06-12 from codebase inspection. Every file path above was verified against the working tree on that date.*
