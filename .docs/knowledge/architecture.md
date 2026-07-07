# Vibey 2.0 — System Architecture

## Overview

Vibey 2.0 is an AI-powered marketing platform where users chat with an AI agent that generates campaigns, funnels, offers, lead magnets, email sequences, and other marketing artifacts.

---

## Stack

| Layer       | Technology                | Location                                                                      |
| ----------- | ------------------------- | ----------------------------------------------------------------------------- |
| Frontend    | Next.js 16 (Turbopack)    | `apps/web` on `localhost:3000`                                                |
| Backend API | NestJS                    | `apps/api` on `localhost:3001`                                                |
| AI Gateway  | OpenClaw (self-hosted VM) | `https://gateway.govibey.com` (Cloudflare tunnel into VM at `188.245.41.230`) |
| Database    | Supabase (Postgres + RLS) | Project `qfrvykscoymiwwgysvsr`                                                |
| Auth        | Supabase Auth (JWT)       | Frontend gets token, backend validates via `AuthGuard`                        |

---

## OpenClaw Gateway

OpenClaw is an AI agent orchestration framework running on a Hetzner VM. It exposes an OpenAI-compatible API.

### Two Modes

**Mode 1: Chat Completions API (`/v1/chat/completions`) — STATELESS**

- This is what NestJS uses
- Caller sends full message history, gets a response back
- Gateway does NOT save messages or manage sessions
- NestJS is responsible for message persistence (Supabase)

**Mode 2: Telegram/Webchat Channels — STATEFUL**

- Used for direct Telegram/webchat conversations
- Gateway manages sessions in memory, saves transcripts to disk (JSONL)
- Handles compaction, context assembly, memory flush
- Not used by the Vibey app

### Agent Routing

To talk to a specific agent, set `model` to `openclaw:<agentId>`:

- `model: "openclaw:main"` — talks to the main Q agent (personality, tools, memory)
- `model: "openclaw:vibe"` — talks to the Vibe agent
- Alternative: header `x-openclaw-agent-id: main`

The agent ID is configured via `OPENCLAW_AGENT_ID` env var (default: `main`).

### Connection Details

```
URL:   OPENCLAW_GATEWAY_URL (env) → https://gateway.govibey.com
Auth:  Bearer OPENCLAW_GATEWAY_TOKEN (env)
Agent: OPENCLAW_AGENT_ID (env) → sent as model: "openclaw:{agentId}"
```

---

## Chat Data Flow

```
Frontend (Next.js)
    │
    │  POST /api/chat { conversation_id, content }
    │  Authorization: Bearer <supabase_jwt>
    ▼
NestJS Backend
    │
    │  1. AuthGuard validates JWT, creates RLS-scoped Supabase client
    │  2. ChatController receives request
    │  3. ChatService.processMessage():
    │     a. Save user message → Supabase `messages` table
    │     b. Load full history from Supabase `messages` table
    │     c. Send history to OpenClaw POST /v1/chat/completions
    │        with model: "openclaw:main"
    │     d. Stream SSE response back to frontend
    │     e. Save assistant message → Supabase `messages` table
    │     f. Update conversation timestamp
    │
    │  SSE events streamed to frontend:
    │    - message_start { message_id, conversation_id }
    │    - content_delta { content }  (text chunks)
    │    - content_done { message_id }
    │    - error { error }
    ▼
Frontend receives SSE stream
    │  - Appends content_delta to optimistic assistant message
    │  - Updates message ID on message_start
    │  - Clears streaming state on content_done
```

---

## Database (Supabase)

**Project ID:** `qfrvykscoymiwwgysvsr`
**URL:** `https://qfrvykscoymiwwgysvsr.supabase.co`

### Core Tables

| Table                    | Purpose                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `conversations`          | Chat threads (user_id, title, campaign_id, status)                                   |
| `messages`               | Chat messages (conversation_id, role, content, content_blocks, metadata, created_at) |
| `conversation_documents` | Artifacts attached to conversations (document_type, content, resource_id)            |

### Artifact Tables

| Table             | Purpose                            | Key Columns                                               |
| ----------------- | ---------------------------------- | --------------------------------------------------------- |
| `campaigns`       | Marketing campaigns                | name, campaign_type, status, goal, config, metrics        |
| `campaign_plans`  | AI-generated execution plans       | campaign_id, plan data                                    |
| `campaign_tasks`  | Campaign Kanban tasks              | campaign_id, task data                                    |
| `offers`          | Offer research (5-step process)    | step1_data through step5_data, processing_status          |
| `avatars`         | Buyer personas                     | user_id, persona data                                     |
| `funnels`         | Funnel containers                  | campaign_id, offer_id, funnel_type, status, slug          |
| `funnel_pages`    | Individual funnel pages            | funnel_id, page_type, sections, theme_config, order_index |
| `lead_magnets`    | Lead magnet PDFs                   | campaign_id, offer_id, slides, theme_id, file_url         |
| `sequences`       | Email sequences                    | campaign_id, sequence data                                |
| `sequence_emails` | Individual emails in sequences     | sequence_id, email data                                   |
| `templates`       | Funnel/lead magnet/email templates | category, template_data, fields_schema                    |

### Supporting Tables

| Table                | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `profiles`           | User profiles                                 |
| `contacts`           | CRM contacts                                  |
| `audiences`          | Contact segments                              |
| `domains`            | Custom domains                                |
| `themes`             | Visual themes                                 |
| `memories`           | Brain memories (from conversation processing) |
| `memory_connections` | Connections between memories                  |
| `memory_sessions`    | Conversation processing sessions              |
| `neural_snapshots`   | Brain knowledge snapshots                     |
| `agent_configs`      | Agent configuration                           |
| `agent_tasks`        | Agent execution tracking                      |

---

## Backend Architecture (NestJS)

Located in `apps/api/src/`.

### Module Structure

```
src/
├── main.ts                    # Bootstrap, CORS, global prefix /api
├── app.module.ts              # Root module (imports all feature modules)
├── shared/
│   ├── guards/auth.guard.ts   # JWT validation, creates RLS Supabase client
│   ├── decorators/            # @CurrentUser(), @Supabase()
│   ├── filters/               # Global exception filter
│   ├── pipes/                 # Zod validation pipe
│   └── services/              # Logger, SupabaseClientFactory
└── modules/
    ├── chat/                  # SSE streaming chat
    │   ├── controllers/chat.controller.ts
    │   ├── services/chat.service.ts
    │   └── services/openclaw-proxy.service.ts
    ├── conversations/         # Conversation + message CRUD
    │   ├── controllers/conversations.controller.ts
    │   ├── services/conversations.service.ts
    │   └── repositories/      # conversations.repository, messages.repository
    ├── campaigns/             # Campaign CRUD
    │   ├── controllers/campaigns.controller.ts
    │   ├── services/campaigns.service.ts
    │   └── repositories/campaigns.repository.ts
    └── brain/                 # Memory management (NeuralSnap integration)
        ├── controllers/       # memories, snapshots, graph
        ├── services/          # embedding, crystallization, conversation-processing
        ├── repositories/      # memories, snapshots
        └── guards/brain-auth.guard.ts  # Dual auth (JWT + agent token)
```

### Auth Flow

1. Frontend gets Supabase session token via `@supabase/ssr`
2. Sends `Authorization: Bearer <token>` on every API request
3. `AuthGuard` validates token via `supabase.auth.getUser(token)`
4. Creates an RLS-scoped Supabase client with the user's JWT
5. Attaches `request.user` and `request.supabase` for controllers
6. All DB queries go through the RLS-scoped client (row-level security enforced)

### Layered Architecture

```
Controller (Layer 1) → thin request handler, validation
    ↓
Service (Layer 2) → business logic, orchestration
    ↓
Repository (Layer 3) → data access, Supabase queries only
```

---

## Frontend Architecture (Next.js)

Located in `apps/web/src/`.

### Studio Feature (Chat UI)

```
features/studio/
├── components/
│   ├── ChatInterface.tsx      # Main chat view (messages + composer)
│   ├── ChatInput.tsx          # Message input with send/stop
│   ├── MessageBubble.tsx      # Renders individual messages (markdown)
│   ├── StudioContainer.tsx    # Layout: chat + preview panel
│   ├── layout/                # Header bar, resizable divider
│   ├── preview/               # Campaign preview tabs (artifacts, dashboard, etc.)
│   └── settings/              # Model/settings panel
├── services/
│   ├── chat.service.ts        # SSE streaming, message CRUD via backend
│   └── campaign.service.ts    # Campaign CRUD via backend
├── store/
│   └── use-chat-store.ts      # Zustand store (messages, streaming state, model)
├── contexts/
│   └── CampaignModeContext    # Preview panel state
├── hooks/                     # Panel resize, etc.
└── types/
    └── index.ts               # Message, Conversation, ContentBlock, SSE types
```

### State Management

- **Zustand** store for chat state (messages, streaming, model selection)
- **React Context** for campaign preview panel state
- **Backend client** (`lib/api/backend-client.ts`) — wraps fetch with auth token injection

### Types (Defined but Partially Implemented)

```typescript
// ContentBlock — types exist, but only 'text' is used currently
type: 'text' | 'reasoning' | 'tool_call' | 'tool_result' | 'status'

// SSE events — types exist, but only 4 are handled
handled:    message_start, content_delta, content_done, error
not handled: reasoning_start, reasoning_delta, reasoning_done, tool_call, tool_result
```

---

## Current Gaps (as of Feb 2026)

### Tool Call Pipeline (NOT IMPLEMENTED)

The OpenClaw agent can call tools (create_funnel, create_offer, etc.) but:

1. `openclaw-proxy.service.ts` only reads `delta.content` — ignores `delta.tool_calls`
2. `chat.service.ts` only saves plain text content — never builds `content_blocks`
3. `messages.content_blocks` column exists but is always null
4. Frontend SSE parser only handles `content_delta` — no tool_call events
5. `MessageBubble` only renders `message.content` as markdown — no tool_call UI
6. `ArtifactsTab` in preview panel is a placeholder with no data source

### What Would Need to Happen

```
OpenClaw agent calls tool (e.g. create_funnel)
    ↓
openclaw-proxy.service.ts parses delta.tool_calls from SSE
    ↓
chat.service.ts receives tool_call event, saves to content_blocks
    ↓
NestJS writes artifact to Supabase (funnels table, etc.)
    ↓
Frontend receives tool_call SSE event
    ↓
MessageBubble renders tool_call block (expandable card)
    ↓
ArtifactsTab shows created artifacts in preview panel
```

---

## Environment Variables

### Backend (`apps/api/.env`)

| Variable                          | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `SUPABASE_URL`                    | Vibey 2.0 Supabase URL                      |
| `SUPABASE_ANON_KEY`               | Supabase publishable key                    |
| `OPENCLAW_GATEWAY_URL`            | OpenClaw gateway URL (Cloudflare tunnel)    |
| `OPENCLAW_GATEWAY_TOKEN`          | Bearer token for gateway auth               |
| `OPENCLAW_AGENT_ID`               | Agent to route to (default: `main`)         |
| `NEURALSNAP_SUPABASE_URL`         | NeuralSnap SaaS Supabase (ns\_\* tables)    |
| `NEURALSNAP_SUPABASE_SERVICE_KEY` | NeuralSnap service key                      |
| `BRAIN_AGENT_TOKEN`               | Token for VM agent → brain API calls        |
| `BRAIN_AGENT_USER_ID`             | User ID for agent brain operations          |
| `GEMINI_API_KEY`                  | Gemini API for embeddings + crystallization |
| `PORT`                            | API port (default: 3001)                    |
| `APP_URL`                         | Frontend URL for CORS                       |
| `CORS_ORIGIN`                     | CORS allowed origin                         |

### Frontend (`apps/web/.env`)

| Variable                        | Purpose                                      |
| ------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase URL (same as backend)               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key                     |
| `NEXT_PUBLIC_BACKEND_URL`       | NestJS backend URL (`http://localhost:3001`) |
