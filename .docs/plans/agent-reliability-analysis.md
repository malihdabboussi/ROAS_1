# Agent Reliability Analysis — Making Vibey Agents Never Stop Mid-Conversation

**Date:** 2026-03-14  
**Status:** Analysis Complete — Ready for Implementation Planning  
**Severity:** High — Directly impacts user trust and product quality

---

## 1. PROBLEM RESTATEMENT

Viktor (widget-builder agent) stopped mid-conversation, cutting the response in the middle. The user saw a truncated answer with no error, no warning, no recovery — just silence. This is a known pattern across all Vibey agents, not isolated to Viktor.

**Screenshot evidence:** Conversation shows partial text with image rendering failures, content cut mid-sentence.

---

## 2. CURRENT ARCHITECTURE (Evidence-Based)

### Data Flow: User Message → Agent Response

```
Frontend (Next.js)
    │ POST /api/proxy/chat → agent-api /api/chat
    │ SSE: text/event-stream
    ▼
agent-api ChatController
    │ AuthGuard → ThrottlerGuard → CreditsGuard
    ▼
ChatService.processMessage()
    │ 1. Save user message → Supabase
    │ 2. Load full conversation history
    │ 3. AgentRuntimeService → resolve agent (vibey/manager/employee/viktor)
    │ 4. ContextWindowService.buildContext() → compaction + recent messages
    │ 5. Build instructions (campaign, brain, integrations)
    │ 6. Create empty assistant message in DB
    │ 7. StreamRegistry.register() for resume
    │ 8. OpenClawProxyService.streamCompletion() → POST /v1/responses
    ▼
OpenClaw Gateway (Hetzner VM)
    │ model: openclaw:{agentId}
    │ Routes to OpenRouter → Claude/Gemini/GPT
    ▼
SSE events stream back:
    content_delta → done (or... silence)
```

### Context Window Management

| Setting                          | Value         |
| -------------------------------- | ------------- |
| MESSAGE_TOKEN_BUDGET             | 80,000 tokens |
| RECENT_COUNT                     | 8 messages    |
| MIN_MESSAGES_FOR_COMPACTION      | 12            |
| HARD_OLDER_MESSAGE_THRESHOLD     | 30 messages   |
| MAX_COMPACTIONS_IN_CONTEXT       | 3             |
| MAX_COMPACTION_TOKENS_IN_CONTEXT | 3,000         |
| Token estimation                 | chars / 4     |

### Model Limits (openclaw.json)

| Model              | Context Window | Max Output Tokens |
| ------------------ | -------------- | ----------------- |
| Claude Opus/Sonnet | 200k           | 200k              |
| Gemini 3           | 1M             | 65.5k             |
| GPT-5.4            | 200k           | 200k              |

### Existing Error Handling

- JWT expiry: Refresh + retry
- Provider retries: `isRetryableProviderError()` for overloaded/rate-limited
- Rate limit: `rate_limit_notice` event (soft)
- Progressive save: Flush every 2s, final save in `finally`
- Stall detection: Log warning after 15s without events
- Context overflow: `isContextOverflowError()` → auto-compaction → retry

---

## 3. ROOT CAUSE ANALYSIS — WHY AGENTS STOP MID-CONVERSATION

### 5-Whys Analysis

```
SYMPTOM: Agent response cut off mid-sentence
  ↓ Why?
CAUSE 1: SSE stream ended without "done" event
  ↓ Why?
CAUSE 2: Upstream provider (OpenRouter/model) returned stopReason: "length"
          OR connection dropped OR gateway timeout
  ↓ Why?
CAUSE 3: Model hit output token limit during generation
          OR context window overflow during long conversation
          OR network interruption between OpenClaw ↔ OpenRouter
  ↓ Why?
CAUSE 4: No continuation logic when stopReason !== "end_turn"
          No detection of incomplete responses
          No automatic retry/resume mechanism
  ↓ Why?
ROOT CAUSE: The system treats ALL stream endings the same —
            whether the model finished naturally or was cut off.
            There is no distinction between "done" and "truncated".
```

### Identified Failure Points (7 Total)

#### FP-1: Output Token Limit Hit (stopReason: "length")

- **Evidence:** OpenClaw GitHub issue #28632 documents this exact bug
- **What happens:** Model hits max output tokens → response truncated → session ends silently
- **Current handling:** NONE. System treats it as normal completion
- **Impact:** HIGH — Most common cause of mid-conversation stops

#### FP-2: Context Window Overflow

- **What happens:** Conversation history + system prompt + instructions exceed model's context limit
- **Current handling:** `isContextOverflowError()` triggers auto-compaction + retry
- **Gap:** Compaction itself can fail or produce lossy summaries. Chars/4 token estimation is inaccurate (real tokenizers report 10-20% variance)
- **Impact:** MEDIUM — Partially handled but imprecise

#### FP-3: Network/Connection Drops

- **What happens:** SSE connection between client↔agent-api or agent-api↔OpenClaw drops
- **Current handling:** `StreamRegistry.register()` enables resume via GET /api/chat/resume/:id
- **Gap:** Resume only works if the stream is still active server-side. If OpenClaw connection died, resume returns nothing
- **Impact:** MEDIUM — Partially handled

#### FP-4: Gateway Timeout

- **What happens:** OpenClaw or OpenRouter takes too long (especially with tool calls)
- **Current handling:** 15s stall detection (log only, no action)
- **Gap:** Warning logged but no recovery action taken. No timeout on the overall request
- **Impact:** MEDIUM — Detected but not acted upon

#### FP-5: Thinking Token Explosion

- **What happens:** Extended thinking models (Claude) can spend all tokens on thinking, leaving none for the actual response
- **Evidence:** OpenClaw #28632 shows 8,192 tokens consumed by thinking alone
- **Current handling:** NONE
- **Impact:** HIGH for thinking-enabled models

#### FP-6: Provider Rate Limiting / Overload

- **What happens:** OpenRouter or underlying provider returns 429/503
- **Current handling:** `isRetryableProviderError()` + fallback model (if strategy is "auto")
- **Gap:** Limited retry attempts, no exponential backoff documented
- **Impact:** LOW-MEDIUM — Best handled of all failure modes

#### FP-7: Client-Side Disconnect

- **What happens:** User's browser/tab closes, network switches, or SSE EventSource errors
- **Current handling:** Frontend `chat.service.ts` parses events; `AbortError` caught
- **Gap:** No automatic reconnection with state recovery on the frontend
- **Impact:** MEDIUM — User loses partial response

---

## 4. RESEARCH FINDINGS — INDUSTRY BEST PRACTICES

### Source 1: Anthropic — "Effective Harnesses for Long-Running Agents" (Nov 2025)

- **Key insight:** Agents fail in two patterns: (1) trying to do too much at once → context exhaustion, (2) declaring done prematurely
- **Solution:** Initializer agent + incremental coding agent pattern
- **Progress tracking:** `claude-progress.txt` + git commits bridge context windows
- **Testing:** End-to-end verification with browser automation before marking complete
- **Relevance:** Directly applicable to Vibey's multi-turn agent conversations

### Source 2: OpenClaw GitHub Issue #28632 (Feb 2026)

- **Root cause:** `handleAgentEnd()` only checks `stopReason === "error"`, NOT "length"
- **Fix:** Detect "length"/"max_tokens" stopReason → auto-continue or notify user
- **PR exists:** #28843 — may already be merged into newer OpenClaw versions
- **Relevance:** CRITICAL — This is likely the exact bug causing Viktor's mid-conversation stops

### Source 3: Zylos Research — Long-Running AI Agents (Jan 2026)

- **Key finding:** Task duration and failure rates have non-linear relationship — doubling duration quadruples failure rate
- **Solution:** Planner-Worker decomposition → 90% cost reduction
- **Checkpoint recovery:** Store state at meaningful steps, resume from last known-good
- **Relevance:** Validates sub-agent delegation approach

### Source 4: Zylos Research — Agent Delegation Patterns (Mar 2026)

- **Key finding:** 79% of production failures stem from specification/coordination, not technical bugs
- **Three patterns:** Hierarchical (boss-worker), Peer-to-peer (mesh), Event-driven (reactive)
- **Framework comparison:** CrewAI, AutoGen, Claude Code all use hierarchical delegation
- **Relevance:** Architecture blueprint for Vibey's multi-agent system

### Source 5: Towards AI — "Subagents in Agent Coding" (Mar 2026)

- **Key insight:** Context isolation is more valuable than context expansion — "not more tokens, but the right tokens in the right window"
- **Three pillars:** Context isolation + Parallelism + Specialization
- **Communication:** Filesystem (markdown files) > prompt retelling for agent-to-agent handoffs
- **Anti-pattern:** Single agent with single context doesn't scale
- **Relevance:** Design principles for Vibey's sub-agent architecture

### Source 6: Redis Blog — Context Window Overflow (2026)

- **Solutions:** Semantic caching, sliding windows, summarization
- **Key insight:** "Lost in the middle" — models process info at beginning/end of context better than middle
- **Relevance:** Validates importance of smart context management

### Source 7: Anthropic — Claude Agent SDK Checkpointing (2026)

- **Patterns:** Resume (continue session), Fork (branch from checkpoint), Continue (most recent)
- **File checkpointing:** Automatic state tracking before each modification
- **Relevance:** Model for implementing checkpoint/recovery in Vibey agents

---

## 5. SOLUTION FRAMEWORK — THREE TIERS

### Tier 1: Quick Wins (Fix existing bugs — 1-2 weeks)

These fix the immediate problem of agents dying mid-conversation.

#### 1A. Detect and Handle stopReason: "length" / "max_tokens"

**Where:** agent-api `ChatService` + `OpenClawProxyService`  
**What:** When OpenClaw returns a non-"end_turn" stop reason:

```
if stopReason === "length" || stopReason === "max_tokens":
    1. Save partial content to DB (already happens via progressive save)
    2. Send SSE event: { type: "truncated", reason: "output_limit" }
    3. Auto-continue: Re-call OpenClaw with truncated context asking to continue
    4. Append continuation to existing assistant message

if stopReason === "error":
    1. Send SSE event: { type: "error", message: "..." }
    2. Attempt retry with fallback model
```

**Frontend:** Handle "truncated" event → show indicator → auto-wait for continuation

#### 1B. Upgrade Stall Detection from "Log" to "Act"

**Where:** `OpenClawProxyService`  
**What:** Current 15s stall warning → upgrade to:

```
15s: Log warning
30s: Send SSE "status" event to user: "Still thinking..."
60s: Send SSE "status" event: "Taking longer than usual..."
90s: Abort + retry with fresh context (compacted)
120s: Abort + send error event to user
```

#### 1C. Improve Token Estimation

**Where:** `ContextWindowService`  
**What:** Replace `chars / 4` with a proper tokenizer (tiktoken for OpenAI, claude-tokenizer for Anthropic)  
**Why:** 10-20% variance means the 80k budget could actually be 88-96k, triggering overflow

#### 1D. Add Thinking Token Budget

**Where:** OpenClaw request parameters  
**What:** Set `thinking.budget_tokens` to cap thinking at ~25% of max_tokens  
**Why:** Prevents thinking from consuming the entire output budget

### Tier 2: Architecture Improvements (2-4 weeks)

These make agents structurally more reliable for longer conversations.

#### 2A. Sub-Agent Delegation Pattern

**Design:** Main conversation agent (Viktor, Vibey, etc.) delegates heavy tasks to sub-agents:

```
User: "Build me a pricing widget"
    ↓
Viktor (orchestrator):
    ├── Sub-agent 1: "Analyze existing widget patterns in codebase" (read-only, fast model)
    ├── Sub-agent 2: "Generate widget HTML/CSS" (code model)
    └── Sub-agent 3: "Validate output renders correctly" (browser automation)
    ↓
Viktor: Assembles results, responds to user with clean context
```

**Implementation in OpenClaw:**

- Add `sub_agent` tool to agent skill definitions
- Sub-agent gets: task description + relevant context only (not full conversation)
- Sub-agent returns: structured result (JSON/markdown)
- Main agent's context stays clean — only sees summaries

**Benefits:**

- Main agent context stays under 20-30k tokens (fast, accurate)
- Sub-agents each get fresh 200k context for their specific task
- Parallel execution possible
- Failure isolation — sub-agent crash doesn't kill main conversation

#### 2B. Checkpoint & Recovery System

**Design:** After every meaningful agent action, save a checkpoint:

```
checkpoint = {
    conversation_id,
    message_id,
    timestamp,
    agent_state: {
        current_task,
        completed_steps,
        pending_steps,
        partial_output
    },
    context_snapshot: {
        compaction_summary,
        recent_messages_ids,
        active_tools
    }
}
```

**Recovery flow:**

1. Detect incomplete response (stopReason !== "end_turn", stall timeout, connection drop)
2. Load latest checkpoint
3. Resume from checkpoint with fresh context window
4. Append to existing response seamlessly

**Storage:** `conversation_checkpoints` table in Supabase

#### 2C. Progressive Context Strategy

Instead of one flat context window, use a hierarchical approach:

```
Layer 1 (always in context): System prompt + current task + last 3 messages
Layer 2 (summaries): Compacted history (key decisions, not verbatim)
Layer 3 (on-demand): Full message history via retrieval when needed
Layer 4 (external): Project files, documents, integrations via tools
```

This keeps the active context small (~30k) while having 200k+ available through retrieval.

### Tier 3: Production-Grade Reliability (4-8 weeks)

These are the patterns used by best-in-class agent systems.

#### 3A. Multi-Model Orchestration

**Design:** Use the right model for each phase:

| Phase                     | Model                        | Why                  |
| ------------------------- | ---------------------------- | -------------------- |
| Understanding user intent | Fast/cheap (Haiku, Flash)    | Quick classification |
| Planning approach         | Capable (Sonnet, Gemini)     | Needs reasoning      |
| Generating code/content   | Best available (Opus, GPT-5) | Quality matters      |
| Reviewing/validating      | Medium (Sonnet)              | Catch errors         |
| Summarizing for context   | Fast (Haiku)                 | Compression task     |

#### 3B. Self-Verification Loop

Before marking any response as "done":

```
1. Agent generates response
2. Verification sub-agent checks:
   - Is the response complete? (no cut-off sentences)
   - Does it answer the user's question?
   - Are code blocks valid?
   - Are referenced files/functions real?
3. If verification fails → agent continues/fixes
4. If verification passes → send to user
```

#### 3C. Conversation Health Monitor

Background service that monitors active conversations:

```
- Track token usage per conversation (warning at 60%, critical at 80%)
- Track response times (degradation = context bloat)
- Track error rates per agent/model
- Auto-compact at thresholds (don't wait for overflow)
- Alert dashboard for ops
```

#### 3D. Graceful Degradation Protocol

When things go wrong, degrade gracefully instead of dying:

```
Level 0: Normal operation
Level 1: Model slow → Switch to faster model, notify user
Level 2: Model failing → Try fallback model
Level 3: All models failing → Save state, notify user, queue for retry
Level 4: System failure → Save everything possible, send apology message
```

At no level should the conversation just... stop.

---

## 6. PRIORITY MATRIX

| Fix                             | Impact | Effort | Priority          |
| ------------------------------- | ------ | ------ | ----------------- |
| 1A: Handle stopReason: "length" | HIGH   | LOW    | **P0 — DO FIRST** |
| 1B: Active stall detection      | HIGH   | LOW    | **P0**            |
| 1D: Thinking token budget       | HIGH   | LOW    | **P0**            |
| 1C: Better token estimation     | MEDIUM | LOW    | **P1**            |
| 2A: Sub-agent delegation        | HIGH   | MEDIUM | **P1**            |
| 2B: Checkpoint & recovery       | HIGH   | MEDIUM | **P1**            |
| 2C: Progressive context         | MEDIUM | MEDIUM | **P2**            |
| 3A: Multi-model orchestration   | MEDIUM | HIGH   | **P2**            |
| 3B: Self-verification loop      | MEDIUM | MEDIUM | **P2**            |
| 3C: Health monitor              | LOW    | MEDIUM | **P3**            |
| 3D: Graceful degradation        | MEDIUM | HIGH   | **P3**            |

---

## 7. UNKNOWNS / MISSING EVIDENCE

| Unknown                                        | How to Obtain                                                               | Impact of Not Knowing                  |
| ---------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| OpenClaw version — does it have #28632 fix?    | Check `docker/openclaw.json` or OpenClaw release notes                      | May already be fixed upstream          |
| Server-side logs for Viktor's specific failure | Check OpenClaw logs on Hetzner VM                                           | Can't confirm exact failure mode       |
| Frequency of mid-conversation stops            | Query `messages` table for conversations with incomplete assistant messages | Can't prioritize correctly             |
| OpenRouter error rates by model                | OpenRouter dashboard / logs                                                 | Can't identify worst-performing models |
| Frontend EventSource reconnection behavior     | Review `chat.service.ts` SSE handling                                       | May have client-side blind spots       |

---

## 8. REFERENCES

1. [Anthropic — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
2. [OpenClaw — Bug #28632: Agent freezes on stopReason: "length"](https://github.com/openclaw/openclaw/issues/28632)
3. [Zylos Research — Long-Running AI Agents](https://zylos.ai/research/2026-01-16-long-running-ai-agents)
4. [Zylos Research — Agent Delegation Patterns](https://zylos.ai/research/2026-03-08-ai-agent-delegation-team-coordination-patterns)
5. [Towards AI — Subagents in Agent Coding](https://pub.towardsai.net/subagents-in-agent-coding)
6. [Anthropic — Claude Agent SDK Checkpointing](https://console.anthropic.com/docs/en/agent-sdk/file-checkpointing)
7. [Redis — Context Window Overflow](https://redis.io/blog/context-window-overflow/)
8. [Zylos Research — Multi-Agent Orchestration Patterns](https://zylos.ai/research/2026-01-06-multi-agent-orchestration-patterns)

---

## 9. NEXT STEPS

1. **Validate:** Check OpenClaw version for #28632 fix status
2. **Measure:** Query DB for incomplete assistant messages to quantify the problem
3. **Implement P0:** stopReason handling + stall detection + thinking budget
4. **Design P1:** Sub-agent delegation architecture doc
5. **Prototype P1:** Checkpoint/recovery system
