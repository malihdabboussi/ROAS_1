# Task Plan: OpenClaw DB-Backed Sessions + Smart Context Windowing

## Goal

Replace OpenClaw's file-based session storage with Supabase DB storage. Send conversation history from DB to OpenClaw via the Responses API `input` array. Implement smart context windowing with DB-persisted summaries so token costs stay flat regardless of conversation length.

## Current State (Evidence)

- OpenClaw stores sessions as JSONL files on disk (`~/.openclaw/agents/{id}/sessions/{sessionId}.jsonl`)
- Session metadata stored in `sessions.json` (JSON file mapping session keys to metadata)
- In Docker (Fly.io): files not persisted → every turn starts fresh → agent has no memory
- Our agent-api already saves all messages to Supabase `messages` table
- Our agent-api already loads full history from DB each turn
- But the proxy only sends last user message to OpenClaw — relies on OpenClaw's internal session for history (which doesn't work in Docker)

## Architecture Decision

**DB is the ONLY source of truth. OpenClaw is stateless.**

1. **No session key** — each request to OpenClaw is fully stateless (no `x-openclaw-session-key` header). OpenClaw gets a random session each time, preventing double-history.
2. **Input array** — send conversation context via the Responses API `input` array (user/assistant messages).
3. **Smart windowing** — instead of sending ALL messages every time (token cost grows linearly), we persist a running summary in the DB and send: `[summary] + [last N messages] + [new message]`.
4. **OpenClaw's file-based sessions become irrelevant** — no data loss, everything is in DB.

## Why This Approach

- No need to fork/modify OpenClaw's core session engine
- The Responses API supports `input` as an array of messages (verified in OpenClaw source: `buildAgentPrompt()` in `openresponses-http.ts`)
- System/developer messages in the array → `extraSystemPrompt`. User/assistant → conversation history.
- Content field accepts plain strings (`content: "text"`) — no need for `[{type: "input_text", text}]` wrapper
- Smart windowing keeps token cost flat (~5K tokens per turn regardless of conversation length)
- Compaction safeguard still works as emergency backup if input is too large
- System prompt + workspace files + tools all work normally
- We only change files in agent-api (our code, not the OpenClaw fork)

## Files That Need to Change

### Primary (agent-api)

1. **`apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`**
   - Currently: extracts last user message as `input` string, system msgs as `instructions`
   - Change: accept pre-built `input` array from chat.service, send as-is to OpenClaw
   - Remove session key header (stateless mode)

2. **`apps/agent-api/src/modules/chat/services/chat.service.ts`**
   - Build `input` array from DB history using smart windowing:
     - If conversation has summary → `[{type: "message", role: "system", content: summary}] + [last N messages] + [new message]`
     - If no summary yet → all messages as-is
   - Keep credential injection as `instructions`
   - Remove fake workspace path injection (lines 138-142 — `/campaigns` path doesn't exist on Fly.io, agent uses `vibey_backend` API instead)
   - After response: trigger summary update if message count exceeds threshold

3. **`apps/agent-api/src/modules/conversations/repositories/conversations.repository.ts`** (or new service)
   - Add method to read/write `summary` and `summary_message_count` on conversations table

### Database Migration

4. **Supabase migration: add summary columns to `conversations` table**
   - `summary` (text, nullable) — running conversation summary
   - `summary_message_count` (integer, default 0) — how many messages are covered by the summary
   - `summary_updated_at` (timestamptz, nullable)

### Config (already done — no changes needed)

5. `docker/openclaw.json` — `sessions_history` and `sessions_list` already denied

### No Changes Needed

- OpenClaw fork source code
- Frontend
- Messages table schema

## Phases

### Phase 1: DB Migration — Add summary columns

- [ ] Add `summary`, `summary_message_count`, `summary_updated_at` to `conversations` table
- [ ] Verify migration applies cleanly

### Phase 2: Modify openclaw-proxy.service.ts — Stateless input array

- [ ] Change `input` from string to accepting a pre-built array of `ItemParam[]`
- [ ] Remove `x-openclaw-session-key` header (each request = fresh random session)
- [ ] Keep `instructions` for credentials
- [ ] Update `ProxyOptions` interface to accept `input: string | Array<{type, role, content}>`

### Phase 3: Modify chat.service.ts — Smart context windowing

- [ ] Build `input` array from DB messages:
  - Load all messages from DB
  - If `conversation.summary` exists AND message count > threshold:
    - Input = `[system: summary] + [last N messages mapped to {type: "message", role, content}]`
  - Else:
    - Input = all messages mapped to `{type: "message", role, content}`
  - Always prepend credentials as `instructions` (not in input array)
- [ ] Remove session key generation (line 164: `const sessionKey = ...`)
- [ ] Remove fake workspace path lines (lines 138-142: `campaignsBasePath`, `workspacePath`, "Read metadata.json") — campaign data comes from `vibey_backend` API, not local files

### Phase 4: Summary generation — Background after response

- [ ] After assistant response is saved, check if summary update needed:
  - Threshold: every 10 messages (configurable)
  - Or when total message tokens exceed X (e.g., 8000 tokens)
- [ ] Generate summary via a lightweight LLM call (or use OpenClaw itself):
  - Send: "Summarize this conversation so far: [all messages]"
  - Save result to `conversations.summary`
  - Update `summary_message_count`
- [ ] This runs async (fire-and-forget) — does NOT block the chat stream

### Phase 5: Test locally

- [ ] Run agent-api locally against OpenClaw
- [ ] Verify: Turn 1 → works with no summary (fresh conversation)
- [ ] Verify: Turn 5 → still has full context (all messages sent)
- [ ] Verify: Turn 11+ → summary kicks in, last N messages + summary sent
- [ ] Verify: tool calls work (vibey_backend)
- [ ] Verify: streaming works
- [ ] Verify: token counts stay flat after summary kicks in
- [ ] Verify: no double history (session is truly stateless)

### Phase 6: Deploy and verify

- [ ] Run migration on production Supabase
- [ ] Commit + push agent-api changes
- [ ] Deploy to Fly.io (only agent-api rebuild needed, not OpenClaw)
- [ ] Verify from traces: token counts, summary presence, tool calls

## Smart Windowing Logic

```
function buildInputArray(messages, conversation):
  N = 6  // last N messages to keep in full (configurable)
  SUMMARY_THRESHOLD = 10  // messages before summarizing

  if conversation.summary AND messages.length > N:
    return [
      { type: "message", role: "system", content: "Previous conversation summary:\n" + conversation.summary },
      ...messages.slice(-N).map(m => ({ type: "message", role: m.role, content: m.content }))
    ]
  else:
    return messages.map(m => ({ type: "message", role: m.role, content: m.content }))
```

## Token Cost Comparison

| Turn | Old (broken)      | Plan v1 (raw history) | Plan v2 (smart windowing) |
| ---- | ----------------- | --------------------- | ------------------------- |
| 1    | ~500 (no history) | ~500                  | ~500                      |
| 10   | ~500 (no history) | ~5,000                | ~5,000                    |
| 20   | ~500 (no history) | ~10,000               | ~4,000 (summary + 6 msgs) |
| 50   | ~500 (no history) | ~25,000               | ~4,000 (summary + 6 msgs) |
| 100  | ~500 (no history) | ~50,000+ (danger)     | ~4,000 (summary + 6 msgs) |

## Key Answers (from code analysis)

1. **Input array format**: `[{type: "message", role: "user"|"assistant"|"system", content: "text"}]` — verified in `open-responses.schema.ts` and `buildAgentPrompt()`
2. **buildAgentPrompt() handles arrays correctly**: system/developer → extraSystemPrompt, user/assistant → conversation entries with history formatting
3. **Compaction still works**: safeguard mode kicks in if input exceeds context window — summarizes on-the-fly as emergency backup
4. **No session key = no double history**: each request gets a random session, OpenClaw never accumulates internal state

## Decisions Made

- DB (Supabase) is the ONLY source of truth
- OpenClaw is fully stateless (no session key)
- Smart windowing with DB-persisted summaries (not raw history dump)
- Summary generated async after response (does not block chat)
- Fake workspace path removed (campaign data accessed via `vibey_backend` API, not local files)
- `sessions_history` / `sessions_list` already denied in config — no config changes needed

## Errors Encountered

(none yet)

## Status

**Plan v2 approved** — Ready for implementation (all phases at once)
