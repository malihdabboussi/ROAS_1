# Vibey Agent Integration Spec (v2)

> **Purpose:** Wire the Hono backend (`apps/agent`) to route chat through OpenClaw gateway, with campaign file workspaces synced to Supabase Storage.
> **Updated:** 2026-02-10 20:42 UTC

---

## Architecture Overview

**Key: NestJS (Hono) runs ON the same VM as OpenClaw.** Not on Vercel. Each user's VM runs both.

```
Browser (Studio Chat)
    │ POST /api/chat { message, conversation_id, campaign_id }
    ▼
Hono Backend (same VM, port 3001)
    │ 1. Auth (Supabase JWT)
    │ 2. Save user message to DB
    │ 3. Forward to OpenClaw gateway (same VM)
    ▼
OpenClaw Gateway (same VM, port 18789)
    │ model: "openclaw:vibey"
    │ session: "vibey-{userId}-{conversationId}"
    │ System msg: "Campaign workspace: /campaigns/{userId}/{campaignId}"
    ▼
Vibey Agent (autonomous)
    │ Reads/writes campaign files LOCALLY (fast)
    │ Creates real Next.js pages, components, full code
    │ Calls Hono internal API to sync files → Supabase Storage
    │ Calls Hono internal API to persist structured data → Supabase DB
    │ Streams response via SSE
    ▼
Hono proxies SSE → Browser
```

---

## Two Types of Data

### 1. Structured Data → Supabase Tables

- Offers (5-step JSONB)
- Avatars (persona JSONB)
- Email sequences (text fields)
- Themes (config JSONB)
- Campaign metadata
- Conversations + messages

**Vibey creates these via:** `POST /internal/assets`

### 2. Code/Files → Local Filesystem + Supabase Storage

- Funnel pages (real Next.js/React components)
- Landing pages (full HTML/CSS/JS)
- Lead magnet pages
- Any generated code, documents, assets

**Vibey creates these locally, then syncs via:** `POST /internal/files/sync`

### Source of Truth

- **Supabase Storage** = persistent source of truth for files
- **Supabase DB** = persistent source of truth for structured data
- **Local filesystem** = fast working cache (ephemeral, VM can pause/restart)

---

## Campaign Workspace

### Local Structure (on VM)

```
/campaigns/{userId}/{campaignId}/
├── metadata.json              # Asset IDs, status, quick reference
├── brief.md                   # Campaign goal, target, constraints
├── offer.json                 # Cached from DB
├── avatar.json                # Cached from DB
├── theme.json                 # Brand colors, fonts, voice style
├── notes.md                   # Agent working notes
├── funnel/                    # Real Next.js funnel code
│   ├── pages/
│   │   ├── opt-in.tsx         # Opt-in landing page (full React component)
│   │   ├── thank-you.tsx      # Thank you page
│   │   └── upsell.tsx         # Upsell page
│   ├── components/
│   │   ├── CheckoutButton.tsx
│   │   ├── EmailCapture.tsx
│   │   └── Testimonials.tsx
│   ├── styles/
│   │   └── globals.css        # Themed with user's brand
│   └── config.json            # Funnel metadata, routes, settings
├── lead-magnet/
│   ├── pages/
│   │   └── download.tsx       # Lead magnet download page
│   └── assets/
│       └── guide.html         # Generated document (like Z's sleep guide)
└── emails/
    └── welcome-sequence.json  # Email content (also in DB)
```

### Supabase Storage Structure (mirror)

```
campaigns/
  {userId}/
    {campaignId}/
      metadata.json
      brief.md
      funnel/pages/opt-in.tsx
      funnel/pages/thank-you.tsx
      funnel/components/CheckoutButton.tsx
      funnel/styles/globals.css
      lead-magnet/pages/download.tsx
      ...
```

Same paths. Local = working copy. Storage = saved copy.

---

## VM Lifecycle

### Boot (VM starts / resumes from pause)

```
Hono starts → calls hydrate for active campaigns:
  1. List user's campaigns from Supabase DB
  2. For each active campaign:
     - Pull all files from Supabase Storage
     - Write to local /campaigns/{userId}/{campaignId}/
  3. Agent is ready to work
```

### Work (normal operation)

```
Vibey creates/edits files locally → fast, no network
Vibey calls POST /internal/files/sync → Hono uploads to Supabase Storage
Vibey calls POST /internal/assets → Hono persists structured data to DB
Both copies always in sync
```

### Pause (VM goes idle)

```
Nothing to do — everything already synced to Supabase.
Local files are ephemeral. VM can be destroyed and recreated.
```

---

## OpenClaw Gateway Details

| Setting     | Value                                                     |
| ----------- | --------------------------------------------------------- |
| **URL**     | `http://127.0.0.1:18789/v1/chat/completions`              |
| **Auth**    | `Authorization: Bearer {OPENCLAW_GATEWAY_TOKEN}`          |
| **Model**   | `openclaw:vibey`                                          |
| **Format**  | OpenAI-compatible, SSE streaming                          |
| **Session** | `x-openclaw-session-key: vibey-{userId}-{conversationId}` |

Env vars:

```env
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=<set-via-fly-secrets>
OPENCLAW_AGENT_ID=vibey
```

---

## Endpoints

### Public Endpoints (user-facing, JWT auth)

#### `POST /api/chat` — Send message, stream Vibey's response

Replaces the current direct-LLM flow. Proxies to OpenClaw gateway.

```typescript
// Body: { conversation_id, content, campaign_id? }

// 1. Save user message to DB
await messages.create({ conversation_id, role: 'user', content })

// 2. Load conversation history
const history = await messages.findByConversationId(conversation_id)

// 3. Get campaign workspace path
const conversation = await conversations.findById(conversation_id)
const campaignId = conversation.campaign_id
const workspacePath = `${CAMPAIGNS_BASE_PATH}/${userId}/${campaignId}`

// 4. Build messages for OpenClaw
const messages = [
  {
    role: 'system',
    content: `Your active campaign workspace is: ${workspacePath}\nRead metadata.json to understand current state.`,
  },
  ...history.map((m) => ({ role: m.role, content: m.content })),
]

// 5. Forward to OpenClaw gateway (streaming)
const response = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
    'Content-Type': 'application/json',
    'x-openclaw-session-key': `vibey-${userId}-${conversation_id}`,
  },
  body: JSON.stringify({
    model: `openclaw:${OPENCLAW_AGENT_ID}`,
    messages,
    stream: true,
  }),
})

// 6. Proxy SSE to browser
// Parse OpenAI chunks → transform to app format → forward
// Accumulate content → save assistant message to DB on [DONE]
```

**SSE Format Bridge:**

OpenClaw returns:

```
data: {"id":"chatcmpl_xxx","choices":[{"delta":{"content":"Hello"}}]}
```

Transform to app format:

```
data: {"type":"content_delta","content":"Hello"}
```

#### `POST /api/campaigns` — Create campaign + workspace

```typescript
// Body: { name, campaign_type, goal? }

// 1. Insert into campaigns table
const campaign = await supabase.from('campaigns').insert({
  user_id: userId, name, campaign_type, status: 'draft', goal: goal ?? {}
}).select().single()

// 2. Create local workspace
const workspacePath = `${CAMPAIGNS_BASE_PATH}/${userId}/${campaign.id}`
await fs.mkdir(`${workspacePath}/funnel/pages`, { recursive: true })
await fs.mkdir(`${workspacePath}/funnel/components`, { recursive: true })
await fs.mkdir(`${workspacePath}/lead-magnet`, { recursive: true })
await fs.mkdir(`${workspacePath}/emails`, { recursive: true })

// 3. Write metadata.json
const metadata = {
  campaign_id: campaign.id,
  campaign_name: name,
  campaign_type,
  status: 'draft',
  created_at: new Date().toISOString(),
  assets: { offer_id: null, avatar_id: null, funnel_id: null, ... },
  user: { id: userId, name: profile.full_name, email: profile.email, company: profile.company_name },
}
await fs.writeFile(`${workspacePath}/metadata.json`, JSON.stringify(metadata, null, 2))
await fs.writeFile(`${workspacePath}/brief.md`, `# ${name}\n\nGoal: ${goal?.description ?? 'TBD'}\n`)

// 4. Sync initial files to Supabase Storage
await syncToStorage(userId, campaign.id, ['metadata.json', 'brief.md'])

return campaign
```

#### `GET /api/campaigns` — List campaigns

#### `GET /api/campaigns/:id` — Get campaign with asset summary

#### `POST /api/conversations` — Create conversation (accepts campaign_id)

#### `GET /api/conversations` — List conversations

#### `GET /api/conversations/:id/messages` — Get messages

These are standard CRUD — keep existing patterns.

---

### Internal Endpoints (agent-facing, token auth)

These are called by the Vibey agent (via `exec` tool running curl) to persist data. Not called by the frontend.

**Auth:** Bearer token via `INTERNAL_API_TOKEN` env var (not user JWT).

#### `POST /internal/files/sync` — Sync local file to Supabase Storage

```typescript
// Body: { campaign_id, user_id, path, action }
// action: "upsert" | "delete"

if (action === 'upsert') {
  const localPath = `${CAMPAIGNS_BASE_PATH}/${user_id}/${campaign_id}/${path}`
  const fileContent = await fs.readFile(localPath)
  const storagePath = `${user_id}/${campaign_id}/${path}`

  await supabase.storage.from('campaigns').upload(storagePath, fileContent, { upsert: true })

  return { ok: true, storage_path: storagePath }
}

if (action === 'delete') {
  const storagePath = `${user_id}/${campaign_id}/${path}`
  await supabase.storage.from('campaigns').remove([storagePath])

  // Also delete locally if exists
  const localPath = `${CAMPAIGNS_BASE_PATH}/${user_id}/${campaign_id}/${path}`
  await fs.unlink(localPath).catch(() => {})

  return { ok: true }
}
```

#### `POST /internal/files/sync-batch` — Sync multiple files at once

```typescript
// Body: { campaign_id, user_id, paths: string[], action: "upsert" | "delete" }
// Batch version — used after creating a funnel with multiple files

for (const path of paths) {
  await syncFile({ campaign_id, user_id, path, action })
}
return { ok: true, synced: paths.length }
```

#### `POST /internal/assets` — Persist structured data to Supabase DB

```typescript
// Body: { campaign_id, user_id, type, data }
// type: 'offer' | 'avatar' | 'funnel' | 'lead_magnet' | 'sequence' | 'theme'

switch (type) {
  case 'offer':
    const offer = await supabase
      .from('offers')
      .insert({
        user_id,
        campaign_id,
        name: data.name,
        step1_data: data.step1_data,
        step2_data: data.step2_data,
        // ...
      })
      .select()
      .single()

    // Update local metadata.json
    await updateLocalMetadata(user_id, campaign_id, { offer_id: offer.id })
    // Sync metadata to storage
    await syncFile({ user_id, campaign_id, path: 'metadata.json', action: 'upsert' })

    return offer

  case 'funnel':
    const funnel = await supabase
      .from('funnels')
      .insert({
        user_id,
        campaign_id,
        name: data.name,
        funnel_type: data.funnel_type,
        status: 'draft',
      })
      .select()
      .single()
    await updateLocalMetadata(user_id, campaign_id, { funnel_id: funnel.id })
    await syncFile({ user_id, campaign_id, path: 'metadata.json', action: 'upsert' })
    return funnel

  // Same pattern for lead_magnet, sequence, avatar, theme
}
```

#### `GET /internal/campaigns/:campaignId/hydrate` — Pull files from Storage to local

```typescript
// Called on VM boot to populate local filesystem from Supabase Storage

const storagePath = `${userId}/${campaignId}`
const { data: files } = await supabase.storage.from('campaigns').list(storagePath, { limit: 1000 })

for (const file of files) {
  const { data } = await supabase.storage.from('campaigns').download(`${storagePath}/${file.name}`)

  const localPath = `${CAMPAIGNS_BASE_PATH}/${userId}/${campaignId}/${file.name}`
  await fs.mkdir(path.dirname(localPath), { recursive: true })
  await fs.writeFile(localPath, Buffer.from(await data.arrayBuffer()))
}

return { ok: true, hydrated: files.length }
```

---

## Vibey Agent Workflow Example

User says: "Create a lead generation funnel for my coaching business"

```
1. Vibey reads /campaigns/{userId}/{campaignId}/metadata.json
   → Sees offer exists, avatar exists, theme exists
   → Reads offer.json, avatar.json, theme.json for context

2. Vibey creates funnel pages locally:
   → Writes /campaigns/.../funnel/pages/opt-in.tsx (full React component)
   → Writes /campaigns/.../funnel/pages/thank-you.tsx
   → Writes /campaigns/.../funnel/components/EmailCapture.tsx
   → Writes /campaigns/.../funnel/styles/globals.css (themed)
   → Writes /campaigns/.../funnel/config.json

3. Vibey calls internal API to persist funnel record:
   exec: curl -X POST http://localhost:3001/internal/assets \
     -H "Authorization: Bearer $INTERNAL_TOKEN" \
     -d '{"campaign_id":"abc","user_id":"xyz","type":"funnel","data":{"name":"Coaching Opt-in","funnel_type":"lead-magnet"}}'

4. Vibey calls internal API to sync all funnel files:
   exec: curl -X POST http://localhost:3001/internal/files/sync-batch \
     -H "Authorization: Bearer $INTERNAL_TOKEN" \
     -d '{"campaign_id":"abc","user_id":"xyz","action":"upsert","paths":["funnel/pages/opt-in.tsx","funnel/pages/thank-you.tsx","funnel/components/EmailCapture.tsx","funnel/styles/globals.css","funnel/config.json"]}'

5. Vibey responds to user:
   "I created your lead generation funnel with 2 pages:
    - Opt-in page with email capture form
    - Thank you page with next steps
    Using your brand colors and coaching offer copy."
```

---

## Environment Variables

```env
# OpenClaw Gateway (same VM)
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=<set-via-fly-secrets>
OPENCLAW_AGENT_ID=vibey

# Campaign workspaces (local filesystem)
CAMPAIGNS_BASE_PATH=/campaigns

# Internal API auth
INTERNAL_API_TOKEN=vibey-internal-secret-change-me

# Supabase
SUPABASE_URL=https://qfrvykscoymiwwgysvsr.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## File Structure (new/changed)

```
apps/agent/src/
├── modules/
│   ├── chat/
│   │   ├── services/
│   │   │   ├── chat.service.ts           # REWRITE: proxy to OpenClaw
│   │   │   ├── openclaw-proxy.service.ts  # NEW: gateway SSE client
│   │   │   └── llm-provider.service.ts    # KEEP but unused for studio
│   │   └── ...
│   ├── campaigns/                         # NEW MODULE
│   │   ├── controllers/
│   │   │   └── campaigns.controller.ts    # CRUD + workspace creation
│   │   ├── services/
│   │   │   ├── campaigns.service.ts       # Business logic
│   │   │   └── workspace.service.ts       # Local filesystem management
│   │   ├── dto/
│   │   │   └── campaigns.dto.ts
│   │   └── index.ts
│   └── internal/                          # NEW MODULE
│       ├── controllers/
│       │   ├── assets.controller.ts       # DB persistence
│       │   └── files.controller.ts        # Storage sync
│       ├── services/
│       │   ├── assets.service.ts
│       │   ├── files-sync.service.ts      # Local ↔ Supabase Storage sync
│       │   └── hydrate.service.ts         # VM boot: pull from Storage
│       ├── middleware/
│       │   └── internal-auth.ts           # Token auth (not JWT)
│       └── index.ts
├── lib/
│   ├── repositories/
│   │   ├── campaigns.repository.ts        # NEW
│   │   └── ...
│   └── storage.ts                         # NEW: Supabase Storage client
└── index.ts                               # Add new routes
```

### Route Registration

```typescript
// Public (JWT auth)
app.route('/api/campaigns', campaignsController)
app.route('/api/chat', chatController)
app.route('/api/conversations', conversationsController)

// Internal (token auth — agent-facing)
app.use('/internal/*', internalAuthMiddleware)
app.route('/internal/assets', assetsController)
app.route('/internal/files', filesController)
```

---

## Supabase Storage Setup

Create a `campaigns` bucket in Supabase:

```sql
-- In Supabase dashboard or via SQL
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaigns', 'campaigns', false);

-- RLS: only service role can access (backend handles auth)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
USING (bucket_id = 'campaigns')
WITH CHECK (bucket_id = 'campaigns');
```

---

## What NOT to Change

- **Frontend SSE handling** — transform format in proxy, keep Zustand store
- **Conversation CRUD** — existing endpoints stay, add campaign_id field
- **Auth middleware** — Supabase JWT for public routes
- **Message persistence** — keep saving to DB
- **Supabase schema** — no table changes needed

---

## Demo vs Production

### Demo (Sprint 1 — single VM)

- One VM runs Hono + OpenClaw
- `/campaigns/` is a local directory on the VM
- Supabase Storage sync works but VM doesn't pause
- All users share one VM

### Production (Sprint 2+ — VM per user)

- Each user gets a Fly.io VM with Hono + OpenClaw
- VM boots → hydrates campaigns from Supabase Storage
- VM pauses when idle → all state in Supabase
- VM resumes → re-hydrates from Storage, agent continues

---

## Concurrent Conversations

OpenClaw handles this natively via session keys:

- User A chatting = session `vibey-userA-conv1`
- User B chatting = session `vibey-userB-conv2`
- Different sessions run independently on the same gateway
- Bottleneck = model API rate limits (handled by OpenClaw token rotation)

---

## Testing

```bash
# 1. Create campaign
curl -X POST http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer <user-jwt>" \
  -d '{"name":"Test","campaign_type":"get-more-leads"}'

# 2. Verify workspace
ls /campaigns/<userId>/<campaignId>/

# 3. Create conversation
curl -X POST http://localhost:3001/api/conversations \
  -H "Authorization: Bearer <user-jwt>" \
  -d '{"campaign_id":"<id>"}'

# 4. Chat (streams through OpenClaw → Vibey agent)
curl -N http://localhost:3001/api/chat \
  -H "Authorization: Bearer <user-jwt>" \
  -d '{"conversation_id":"<id>","content":"Create a funnel for my coaching business"}'

# 5. Verify file sync
# Check local: ls /campaigns/<userId>/<campaignId>/funnel/
# Check storage: supabase storage ls campaigns/<userId>/<campaignId>/
```
