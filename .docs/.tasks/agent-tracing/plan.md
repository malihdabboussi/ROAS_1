# Agent Tracing — Implementation Plan

**Date:** 2026-02-16
**Status:** Planning
**Goal:** Full observability for the Vibey agent — see every input, output, tool call, and token usage. Custom-built, zero external dependencies.

---

## Architecture Overview

```
User sends message
    ↓
┌─ agent-api (chat.service.ts) ─────────────────────────────┐
│  1. Builds messagesForGateway (input + system + history)   │
│  2. Calls openclaw-proxy.service.ts                        │
│     → Sends to OpenClaw gateway (localhost:18789)          │
│     ← Receives SSE stream (tool calls, content, usage)    │
│  3. NEW: tracing.service.ts collects all data              │
│  4. NEW: Writes trace row to Supabase `agent_traces` table │
└────────────────────────────────────────────────────────────┘
    ↓
┌─ Nexus app (apps/nexus) ──────────────────────────────────┐
│  NEW: /traces page — reads from `agent_traces` table       │
│  - List view: all traces with filters                      │
│  - Detail view: expand to see full input/output/tools      │
└────────────────────────────────────────────────────────────┘
```

---

## What Gets Captured (Per Message Exchange)

| Data Point                | Source                                                       | How                          |
| ------------------------- | ------------------------------------------------------------ | ---------------------------- |
| **User message**          | `chat.service.ts` — the `content` param                      | Captured before sending      |
| **System instructions**   | `chat.service.ts` lines 96-111 — the contextLines array      | Captured before sending      |
| **Full chat history**     | `chat.service.ts` — `formattedHistory`                       | Captured before sending      |
| **Model used**            | `openclaw.json` — `openrouter/anthropic/claude-opus-4.6`     | Static, known                |
| **Session key**           | `chat.service.ts` line 125                                   | Captured at creation         |
| **Every tool call**       | SSE events `response.output_item.added` (type=function_call) | Already parsed in proxy      |
| **Every tool result**     | SSE events `response.output_item.done`                       | Already parsed in proxy      |
| **Full response content** | SSE `response.output_text.delta` accumulated                 | Already accumulated in proxy |
| **Token usage**           | SSE `response.completed` → usage object                      | Already parsed in proxy      |
| **Timing**                | `Date.now()` at start/end                                    | New timestamps               |
| **Errors**                | SSE `response.failed`                                        | Already parsed in proxy      |
| **User ID**               | From `processMessage` options                                | Available                    |
| **Conversation ID**       | From `processMessage` options                                | Available                    |
| **Campaign ID**           | From `processMessage` options                                | Available                    |

---

## Implementation Steps

### Step 1: Supabase Migration — `vb_agent_traces` table

**File:** `supabase/migrations/010_vb_agent_traces.sql` (run manually)

```sql
CREATE TABLE vb_agent_traces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  conversation_id uuid NOT NULL,
  campaign_id     uuid,
  session_key     text NOT NULL,

  -- Input
  user_message    text NOT NULL,
  system_prompt   text,
  history_length  integer NOT NULL DEFAULT 0,

  -- Output
  response        text,

  -- Tool calls (JSONB array)
  tool_steps      jsonb DEFAULT '[]'::jsonb,
  -- Each element: { name, label, status, started_at?, ended_at? }

  -- Usage
  input_tokens    integer,
  output_tokens   integer,
  cache_read_tokens integer DEFAULT 0,
  cache_write_tokens integer DEFAULT 0,
  total_tokens    integer,

  -- Timing
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  duration_ms     integer,

  -- Status
  status          text NOT NULL DEFAULT 'streaming'
                  CHECK (status IN ('streaming', 'completed', 'failed')),
  error           text,

  -- Metadata
  model           text DEFAULT 'anthropic/claude-opus-4.6',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for the nexus UI queries
CREATE INDEX idx_vb_agent_traces_user_id ON vb_agent_traces(user_id);
CREATE INDEX idx_vb_agent_traces_conversation_id ON vb_agent_traces(conversation_id);
CREATE INDEX idx_vb_agent_traces_created_at ON vb_agent_traces(created_at DESC);
CREATE INDEX idx_vb_agent_traces_status ON vb_agent_traces(status);

ALTER TABLE vb_agent_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own traces"
  ON vb_agent_traces FOR SELECT
  USING (auth.uid() = user_id);
```

**Note:** Service role bypasses RLS for INSERT/UPDATE.

---

### Step 2: Tracing Service — `tracing.service.ts`

**New file:** `apps/agent-api/src/modules/chat/services/tracing.service.ts`

**What it does:**

1. `startTrace(opts)` → creates a row in `agent_traces` with status='streaming', returns trace ID
2. `recordToolStep(traceId, toolStep)` → appends to the JSONB tool_steps array
3. `completeTrace(traceId, result)` → updates with response, usage, timing, status='completed'
4. `failTrace(traceId, error)` → updates with error, status='failed'

**Uses:** Service-role Supabase client (same as brain processing already does in `chat.service.ts` line 259)

**~60 lines of code.**

---

### Step 3: Wire Into Chat Service — `chat.service.ts`

**Modify:** `apps/agent-api/src/modules/chat/services/chat.service.ts`

**Changes:**

1. Inject `TracingService` in constructor
2. Before calling `openClaw.streamCompletion()`:
   - Call `tracingService.startTrace()` with user_message, system_prompt, history_length, user_id, conversation_id, campaign_id, session_key
3. Wrap `progressiveSend` one more time to intercept `tool_start`/`tool_end` events → call `tracingService.recordToolStep()`
4. After stream completes (in the `finally` block):
   - Call `tracingService.completeTrace()` with response content, usage data, timing
5. On error:
   - Call `tracingService.failTrace()` with error message

**~30 lines of additions to existing file.**

---

### Step 4: Register in Chat Module — `chat.module.ts`

**Modify:** `apps/agent-api/src/modules/chat/chat.module.ts`

**Change:** Add `TracingService` to providers array.

**1 line change.**

---

### Step 5: Nexus UI — `/traces` page

**New files in `apps/nexus/app/`:**

1. `src/app/(dashboard)/traces/page.tsx` — Main traces list page
2. `src/features/traces/services/traces.service.ts` — Supabase queries
3. `src/features/traces/components/TracesList.tsx` — Table/list component
4. `src/features/traces/components/TraceDetail.tsx` — Expandable detail view

**What the page shows:**

**List View (table):**
| Time | User Message (truncated) | Tools Used | Tokens | Duration | Status |
|---|---|---|---|---|---|
| 2:15 PM | "Build me a funnel for..." | web_search, exec (x3) | 12,450 | 34s | ✅ |
| 2:12 PM | "Create an offer about..." | exec (x6) | 28,100 | 1m 12s | ✅ |

**Detail View (click to expand):**

- Full user message
- System prompt sent
- History length
- Each tool call (name, status, timing)
- Full response
- Token breakdown (input/output/cache)
- Session key, conversation ID, campaign ID

**Filters:**

- By status (completed/failed/streaming)
- By date range
- By user (if admin)
- Search by message content

---

### Step 6: Add to Sidebar

**Modify:** `apps/nexus/app/src/components/layout/Sidebar.tsx`

**Change:** Add `{ name: 'Traces', href: '/traces', Icon: Activity }` to the navigation array.

**1 line change.**

---

## File Changes Summary

| File                                                       | Action                               | Lines Changed   |
| ---------------------------------------------------------- | ------------------------------------ | --------------- |
| Supabase                                                   | New migration (`agent_traces` table) | ~40 lines SQL   |
| `agent-api/src/modules/chat/services/tracing.service.ts`   | **NEW**                              | ~60 lines       |
| `agent-api/src/modules/chat/services/chat.service.ts`      | Modify                               | ~30 lines added |
| `agent-api/src/modules/chat/chat.module.ts`                | Modify                               | 2 lines         |
| `nexus/app/src/app/(dashboard)/traces/page.tsx`            | **NEW**                              | ~30 lines       |
| `nexus/app/src/features/traces/services/traces.service.ts` | **NEW**                              | ~50 lines       |
| `nexus/app/src/features/traces/components/TracesList.tsx`  | **NEW**                              | ~150 lines      |
| `nexus/app/src/features/traces/components/TraceDetail.tsx` | **NEW**                              | ~100 lines      |
| `nexus/app/src/features/traces/components/index.ts`        | **NEW**                              | 3 lines         |
| `nexus/app/src/components/layout/Sidebar.tsx`              | Modify                               | 1 line          |

**Total: ~470 lines of new code. 4 new files. 3 modified files. 1 migration.**

---

## What This Does NOT Include (By Design)

- No external services (LangSmith, LangWatch, etc.)
- No new npm dependencies
- No Docker image changes (tracing happens in agent-api, which is already in the image)
- No OpenClaw config changes
- No frontend changes to the main `apps/web` app

---

## Deployment

1. Run the Supabase migration (via MCP)
2. The agent-api code ships with next Docker deploy
3. The Nexus app deploys separately (or runs locally)
4. Traces start flowing immediately after Docker redeploy

---

## Risk Assessment

| Risk               | Likelihood | Mitigation                                           |
| ------------------ | ---------- | ---------------------------------------------------- |
| Trace insert fails | Low        | Fire-and-forget with `.catch()` — never blocks chat  |
| DB size grows      | Medium     | Add retention policy later (delete traces > 30 days) |
| Performance impact | Very Low   | 1 insert + 1 update per message, async, non-blocking |
| Missing data       | None       | We capture at the point we build/receive all data    |
