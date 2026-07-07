# Credential Vault (External APIs)

**Credentials are stored in the Nexus vault.** You never see API keys. Call the backend; it uses the secret and returns the result.

## 1. Discover Your Capabilities

```bash
curl -s -H "Authorization: Bearer $NEXUS_API_TOKEN" \
  https://brain-api.sefytofan.com/api/vault/capabilities
```

Returns `{ "capabilities": [{ "service": "shopify", "scope": "healing_waves" }, ...] }` — only integrations you have access to.

## 2. Execute an Action

```bash
curl -s -X POST -H "Authorization: Bearer $NEXUS_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"service":"shopify","scope":"healing_waves","action":"list_products","params":{}}' \
  https://brain-api.sefytofan.com/api/vault/execute
```

**Body:** `{ service, scope?, action, params? }`

- `service` (required): e.g. shopify, fathom, kit, stripe
- `scope` (optional): e.g. healing_waves, live, default
- `action` (required): e.g. list_products, list_meetings
- `params` (optional): action-specific params

**Response:** `{ "success": true, "data": ... }` or `{ "success": false, "error": "..." }`

Unknown actions return `{ "success": false, "error": "Unknown action: service:action" }` — try and you'll get feedback.

## 3. Platform Descriptions & How to Use

Each service is a platform you can work with. Call `POST /api/vault/execute` with `{ service, scope?, action, params? }`. If the action exists, you get data. If not, you get an error — try and escalate if stuck.

| Platform                     | What it is                     | Use for                                                            |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| **shopify** (healing_waves)  | Healing Waves e‑commerce store | Products, orders, inventory — healing-waves.myshopify.com          |
| **fathom**                   | Call recording & AI summaries  | Meeting transcripts, summaries, action items (Inbar MD, Atlas)     |
| **kit**                      | Email marketing (ConvertKit)   | Subscribers, tags, sequences — Healing Waves list                  |
| **manychat** (healing_waves) | Facebook Messenger automation  | Page info, flows — Healing Waves DM flows                          |
| **stripe** (live)            | Payment processing             | Customers, balance, billing — Healing Waves live                   |
| **elevenlabs**               | Text-to-speech                 | TTS audio (Sefy voice clone)                                       |
| **youtube**                  | YouTube Data API               | Search videos, channel info                                        |
| **cloudflare**               | DNS & CDN                      | Zones, records — govibey.com, healingwaves.co, sefytofan.com, etc. |
| **vercel**                   | Hosting & deploys              | Projects, deployments — Nexus, Vibey                               |
| **github**                   | Code repos                     | List repos (Sefy-Tofan, GoVibey)                                   |
| **airtable**                 | Bases & tables                 | Records — Knowledge Base, Swipe File                               |
| **n8n**                      | Workflow automation            | List workflows — Olympus instance                                  |
| **quickbooks**               | Accounting (Finn)              | Customers — needs realm_id + OAuth token                           |

## 4. Supported Services & Actions

| Service    | Scope         | Action           | Params                       | Description                                                                                                           |
| ---------- | ------------- | ---------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| shopify    | healing_waves | list_products    | limit?: number               | Healing Waves store products                                                                                          |
| fathom     | default       | list_meetings    | limit?: number               | Fathom call transcripts                                                                                               |
| kit        | default       | list_subscribers | per_page?, status?           | Kit subscribers                                                                                                       |
| kit        | default       | list_tags        | —                            | Kit tags                                                                                                              |
| manychat   | healing_waves | get_page_info    | —                            | ManyChat page info                                                                                                    |
| stripe     | live          | list_customers   | limit?                       | Stripe customers                                                                                                      |
| stripe     | live          | get_balance      | —                            | Stripe balance                                                                                                        |
| elevenlabs | default       | text_to_speech   | text, voice_id?              | TTS (returns audio_base64)                                                                                            |
| youtube    | default       | search           | q, max_results?              | YouTube search                                                                                                        |
| cloudflare | default       | list_zones       | —                            | Cloudflare zones                                                                                                      |
| vercel     | default       | list_projects    | —                            | Vercel projects                                                                                                       |
| vercel     | default       | list_deployments | project_id?                  | Vercel deployments                                                                                                    |
| github     | default       | list_repos       | org? (default: Sefy-Tofan)   | GitHub org repos                                                                                                      |
| airtable   | default       | list_records     | base_id?, table?, page_size? | Airtable records                                                                                                      |
| n8n        | default       | list_workflows   | base_url?                    | n8n workflows                                                                                                         |
| quickbooks | default       | list_customers   | realm_id (required), limit?  | QuickBooks customers (vault must store OAuth access token; migrated value is client secret — Finn needs to add token) |

## 5. Deployment

To deploy updated vault handlers to nexus-api (server 188.245.41.230):

```bash
# From vibey2.0 repo root
scp .docs/.tasks/credential-vault/nexus-api-vault-impl/vault.ts root@188.245.41.230:/root/nexus-api/src/routes/vault.ts
ssh root@188.245.41.230 "cd /root/nexus-api && pm2 restart nexus-api"
```

## 6. Workflow

1. Call `GET /api/vault/capabilities` to see what you can use
2. Call `POST /api/vault/execute` with the right service, scope, action
3. Never store or request API keys — the backend handles them
