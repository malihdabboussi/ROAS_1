# Email Campaign System

## Overview

A provider-agnostic email campaign system that separates content creation from delivery. Email content lives in Vibey (`sequences` + `sequence_emails` tables). Delivery is handled by whichever email provider the user selects (ActiveCampaign, Mailchimp, GHL, Kit, etc.) through a recipe-based adapter system.

No provider-specific code exists in the UI or orchestrator. All provider differences are captured in DB recipe rows.

## Architecture

```
Content Layer:
  Vibey creates email content → stored in sequences + sequence_emails tables

Approval Layer:
  Agent calls prepare_email_send/prepare_sequence_send
  → emits email_send_confirm UI block
  → user reviews and clicks Approve

Delivery Layer:
  Email Orchestrator reads provider recipe from email_provider_recipes
  → executes integration calls in order
  → or routes to BullMQ for Vibey/GHL native
```

## Provider Recipe System

### How It Works

The `email_provider_recipes` table stores ordered API call steps for each provider and send type. When a send is approved, the orchestrator reads the recipe and executes each step in sequence.

### Table Schema

| Column          | Type  | Description                                               |
| --------------- | ----- | --------------------------------------------------------- |
| provider        | TEXT  | Integration ID (e.g. `active_campaign`)                   |
| recipe_type     | TEXT  | `broadcast` or `sequence`                                 |
| step_order      | INT   | Execution order (1, 2, 3...)                              |
| action_slug     | TEXT  | The `use_integration` action to call                      |
| params_template | JSONB | Template with `{{variable}}` placeholders                 |
| result_key      | TEXT  | Dot-path to extract from step result (e.g. `campaign.id`) |
| result_alias    | TEXT  | Variable name for subsequent steps (e.g. `campaign_id`)   |

### Template Variable Syntax

Templates use `{{variable_name}}` placeholders. Available variables:

**From email content:**

- `{{subject}}` — Email subject line
- `{{html}}` — Email body HTML
- `{{text}}` — Auto-stripped plain text version
- `{{name}}` — Campaign name

**From user input (approval card):**

- `{{from_email}}` — Sender email address
- `{{from_name}}` — Sender name
- `{{schedule_date}}` — Scheduled send date
- `{{list_id}}` — Selected list ID
- `{{segment_id}}` — Selected segment ID

**Sequence-specific:**

- `{{sequence_name}}` — Sequence name
- `{{email_index}}` — 1-based email position in sequence
- `{{calculated_sdate}}` — `start_date + delay_hours` per email

### Result Key Chaining

Steps can capture results for use in later steps:

1. Step 1 creates a campaign → result includes `{ campaign: { id: "123" } }`
2. `result_key: "campaign.id"` extracts `"123"`
3. `result_alias: "campaign_id"` stores it as `{{campaign_id}}`
4. Step 2 can reference `{{campaign_id}}` in its template

## Broadcast vs Sequence

### Broadcast

Single email, sent once to an audience.

- Recipe executed once with one email's data
- `send_type: 'broadcast'` in the API payload
- User sees: subject, HTML preview, provider/audience selectors, Send Now or Schedule

### Sequence

Multiple emails sent over time with delays.

- Recipe executed per email in the sequence
- Each email gets its own scheduled campaign in the provider
- `sdate` calculated as `start_date + email.delay_hours`
- User sees: all emails listed with their timing, single Approve triggers all

## BullMQ Path

For Vibey native and GoHighLevel, no recipes are used. The orchestrator detects `is_bullmq_provider: true` in `email_provider_capabilities` and inserts rows into `email_single_schedules` instead. The existing BullMQ worker (`SingleEmailScheduler`) polls and sends.

## API Endpoints

| Endpoint                                  | Method | Description                             |
| ----------------------------------------- | ------ | --------------------------------------- |
| `/api/email-campaigns/send`               | POST   | Execute broadcast or sequence send      |
| `/api/email-campaigns/providers`          | GET    | List connected email providers          |
| `/api/email-campaigns/provider-audiences` | GET    | Fetch lists/segments for a provider     |
| `/api/email-campaigns/approve`            | POST   | Approve a pending send (Telegram/Slack) |
| `/api/email-campaigns/cancel`             | POST   | Cancel a pending send                   |
| `/api/email-campaigns/capabilities`       | GET    | List all provider capabilities          |

## Agent Actions

| Action                  | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `prepare_email_send`    | Reads single email, fetches providers/audiences, emits approval UI block |
| `prepare_sequence_send` | Reads all emails in sequence, emits approval UI block with full overview |

Both actions return `ui_blocks` that the SSE pipeline emits to the frontend.

**Implementation:** `prepare_email_send` / `prepare_sequence_send` are artifact actions in `apps/agent-api` (`artifact-documents-sequences-avatars-themes.service.ts`): they validate `sequence_emails` / `sequences` ownership via the user Supabase client, load connected providers from `GET /api/email-campaigns/providers`, and return an `email_send_confirm` block.

## UI Components

| Component              | Block Type           | Purpose                                                          |
| ---------------------- | -------------------- | ---------------------------------------------------------------- |
| `EmailSendConfirmCard` | `email_send_confirm` | Approval card with provider dropdown, audience selector, preview |
| `EmailSendStatusCard`  | `email_send_status`  | Result card showing sent/scheduled/error status                  |

## Channel Behavior

| Channel      | Approval UX                                              |
| ------------ | -------------------------------------------------------- |
| Web (Studio) | Full rich card with dropdowns, preview, Approve button   |
| Telegram     | Text summary + inline keyboard (Approve & Send / Cancel) |
| Slack        | Text summary + Block Kit action buttons (future)         |

For Telegram/Slack, a `email_pending_sends` row persists the send config. The button callback references the row ID and triggers the orchestrator.

---

## How to Add a New Email Provider

### Checklist

1. **Ensure the integration exists.** Either build it directly (like ActiveCampaign) or confirm it's available via Composio.

2. **Map the provider's email-sending API flow.** Figure out what API calls are needed to create and send an email campaign. Typically 2-4 calls.

3. **Insert broadcast recipe rows:**

```sql
INSERT INTO email_provider_recipes (provider, recipe_type, step_order, action_slug, params_template, result_key, result_alias, description)
VALUES
  ('new_provider', 'broadcast', 1, 'create_campaign', '{"campaign": {"name": "{{name}}", ...}}', 'campaign.id', 'campaign_id', 'Create campaign'),
  ('new_provider', 'broadcast', 2, 'create_content', '{"campaignId": "{{campaign_id}}", "html": "{{html}}", ...}', NULL, NULL, 'Set email content'),
  ('new_provider', 'broadcast', 3, 'send_campaign', '{"campaignId": "{{campaign_id}}"}', NULL, NULL, 'Send campaign');
```

4. **Insert sequence recipe rows** (same steps but with `{{calculated_sdate}}`):

```sql
INSERT INTO email_provider_recipes (provider, recipe_type, step_order, action_slug, params_template, result_key, result_alias, description)
VALUES
  ('new_provider', 'sequence', 1, 'create_campaign', '{"campaign": {"name": "{{sequence_name}} - Email {{email_index}}", "sdate": "{{calculated_sdate}}", ...}}', 'campaign.id', 'campaign_id', 'Create scheduled campaign'),
  ('new_provider', 'sequence', 2, 'create_content', '{"campaignId": "{{campaign_id}}", "html": "{{html}}", ...}', NULL, NULL, 'Set email content'),
  ('new_provider', 'sequence', 3, 'send_campaign', '{"campaignId": "{{campaign_id}}"}', NULL, NULL, 'Activate campaign');
```

5. **Insert capability row:**

```sql
INSERT INTO email_provider_capabilities (provider, display_name, supports_broadcast, supports_sequences, supports_scheduling, supports_segments, requires_list, is_bullmq_provider)
VALUES ('new_provider', 'New Provider', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE);
```

6. **Test** with `POST /api/email-campaigns/send`.

7. **Update** the Vibey skill's `references/provider-capabilities.md` with the new provider's specifics.

### No Code Changes Needed

Adding a new provider requires zero code changes. Only DB inserts.

## Existing Provider Recipes

### ActiveCampaign

**Broadcast (3 steps):**

1. `create_campaign` — Creates draft campaign (status: 0)
2. `create_message` — Creates email content linked to campaign
3. `update_campaign` — Activates campaign (status: 1)

**Sequence (3 steps, per email):**
Same as broadcast, but with `sdate` calculated per email from `start_date + delay_hours`.

### Vibey Native / GoHighLevel

Uses BullMQ path (no recipes). Inserts into `email_single_schedules`.
