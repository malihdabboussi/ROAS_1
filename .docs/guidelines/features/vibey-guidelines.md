# Vibey Feature Guidelines

**Streaming Architecture, Animation Logic, and Content Display Patterns**

---

## 📖 **Table of Contents**

1. [Animation Logic & Gap State Management](#1-animation-logic--gap-state-management)
2. [Content Streaming & Display Patterns](#2-content-streaming--display-patterns)
3. [Backend Event Emission Rules](#3-backend-event-emission-rules)
4. [Frontend Rendering Logic](#4-frontend-rendering-logic)

---

## 1. Animation Logic & Gap State Management

### **CRITICAL UNDERSTANDING: Animation = Loading State Between Content**

The "Vibey Entering Flow" animation is **NOT** a content type - it's a **waiting/loading state** that shows when there's a gap between content updates.

### **When Animation SHOWS (Gap State):**

1. **Right after user sends message** → Brief "Vibey Entering Flow" while backend initializes
2. **After thought closes** → Brief gap before next content arrives
3. **DURING tool execution** → Tool is running (can take 30-60 seconds), user sees animation
4. **After tool finishes (Explored shows)** → Brief gap before next reasoning stream starts (if gap exists)
5. **After status finishes displaying** → Tool call starts, animation shows during execution

### **When Animation STOPS (Active Content Display):**

1. **Reasoning streaming** → Thought opens, text streams in, NO animation
2. **Status typewriter effect** → Status text displaying, NO animation
3. **Tool result showing** → "Explored" displays, NO animation

### **The Complete Cycle:**

```
User Message
  → Animation (brief - backend initializing)
  → Reasoning streams (Thought opens - NO animation)
  → Thought closes
  → Animation (brief - waiting for tool call)
  → Tool executing (Animation continues - LONG wait, 30-60s)
  → Explored shows (Tool result - NO animation)
  → Animation (if gap before next stream)
  → Status typewriter (NO animation)
  → Status finishes
  → Tool executing (Animation shows - LONG wait)
  → Explored shows (NO animation)
  → Next reasoning streams (Thought opens - NO animation)
  → Repeat
```

### **Key Insight:**

Animation is **NOT** triggered by events - it's the **DEFAULT STATE** when no content is actively displaying.

**Logic:**

- Content streaming = Hide animation
- Content finished + No new content arriving = Show animation
- Tool execution = Gap = Show animation (most important use case)

---

## 2. Content Streaming & Display Patterns

### **Event Types & Display Behavior**

| Event Type                | Frontend Display         | Animation State           |
| ------------------------- | ------------------------ | ------------------------- |
| `reasoning_chunk`         | Thought (streaming text) | Hidden (content active)   |
| `response_chunk`          | Status text (typewriter) | Hidden (content active)   |
| `tool_execution_start`    | "Explored" placeholder   | Animation SHOWS (waiting) |
| `tool_execution_complete` | "Explored" with result   | Hidden (content active)   |
| `status`                  | Status text              | Hidden (content active)   |

### **Content Block Types**

```typescript
// Reasoning (Thought)
type: 'reasoning'
- Streams character by character
- Displayed in expandable thought block
- NO animation while streaming

// Status (Orchestrator updates)
type: 'status'
- One-liner updates ("Working on Power Offer...")
- Typewriter effect
- NO animation while displaying

// Tool Call
type: 'tool_call'
- Shows "Exploring" with tool name
- Immediately followed by animation (waiting for result)
- Animation shows during execution

// Tool Result
type: 'tool_result'
- Shows "Explored" with formatted result
- NO animation (result is displaying)
```

---

## 3. Backend Event Emission Rules

### **Model Node (`model.node.ts`)**

**Rule:** Stream status ONLY during ReAct loop (when tool calls present)

```typescript
// Stream status when tool call is made (ReAct loop)
if (userContent && userContent.trim().length > 0 && finalToolCalls.length > 0) {
  config.writer?.({ type: 'response_chunk', content: userContent })
}

// Do NOT stream final responses (Synthesizer handles those)
```

**Why:** Prevents duplicate messages (Model + Synthesizer both streaming same content)

### **Tools Node (`tools.node.ts`)**

**Rule:** Emit `tool_execution_start` at the START of tool execution

```typescript
// Emit BEFORE calling tool
config.writer?.({
  type: 'tool_execution_start',
  toolName: toolCall.name,
  args: toolCall.args,
})

// Then execute tool (long wait - animation should show)
const result = await executeTool(toolCall)

// Emit result
config.writer?.({
  type: 'tool_execution_complete',
  result: result,
})
```

**Why:** Frontend needs to know tool started so it can show animation during execution

### **Synthesizer Node (`synthesizer.node.ts`)**

**Rule:** Stream final responses only (no tool calls)

```typescript
// Stream when no tool calls (end of ReAct loop)
if (!hasPendingToolCalls) {
  config.writer?.({ type: 'response_chunk', content: synthesizedResponse })
}
```

---

## 4. Frontend Rendering Logic

### **StreamManager (`stream-manager.ts`)**

**Responsibilities:**

1. Receive SSE events from backend
2. Manage `contentBlocks` array (accumulate all blocks for current message)
3. Manage `accumulatedContent` for live streaming display
4. **Manage gap animation timers**

### **Gap Animation Timer Logic**

**Current Implementation:**

```typescript
// After reasoning finishes (buffer is empty)
if (currentReasoningBuffer.length === 0) {
  // Clear any existing timer
  if (gapAnimationTimer) clearTimeout(gapAnimationTimer)

  // Start 100ms timer
  gapAnimationTimer = setTimeout(() => {
    // Show gap animation
    addContentBlock({ type: 'gap-animation' })
  }, 100)
}

// Clear timer when ANY new content arrives
if (
  event.type === 'reasoning_chunk' ||
  event.type === 'response_chunk' ||
  event.type === 'tool_execution_complete'
) {
  if (gapAnimationTimer) clearTimeout(gapAnimationTimer)
}
```

**Problem:** Timer gets cleared when `response_chunk` arrives (status text), leaving UI frozen without animation during tool execution.

**Correct Logic:**

```typescript
// Show animation DURING tool execution (don't clear on response_chunk)
if (event.type === 'tool_execution_start') {
  // Tool started - show animation immediately (don't wait for timer)
  addContentBlock({ type: 'gap-animation' })
}

// Clear animation only when:
// 1. New reasoning starts (thought opens)
// 2. Tool result arrives (explored shows)
if (event.type === 'reasoning_chunk' || event.type === 'tool_execution_complete') {
  // Remove gap animation
  removeGapAnimation()
}

// Do NOT clear animation on response_chunk (status text)
// Status is brief, then tool executes (animation should continue)
```

### **ContentBlockRenderer (`ContentBlockRenderer.tsx`)**

**Responsibilities:**

1. Render different content block types
2. Manage visibility of status blocks (show only most recent during streaming)
3. **Manage gap animation visibility**

**Animation Visibility Rules:**

```typescript
// Show gap animation when:
// 1. Block type is 'gap-animation'
// 2. No active content streaming (isStreaming = false OR during tool execution)

// Hide gap animation when:
// 1. Reasoning is streaming (thought is open)
// 2. Tool result just arrived (explored is showing)
// 3. Streaming is complete (all content blocks finalized)
```

---

## 5. Context Window: 4-Tier Memory System

### **CRITICAL UNDERSTANDING: Complete Context = Better Decisions**

The AI maintains conversation memory through a 4-tier architecture that balances **efficiency** (fast planning) with **completeness** (detailed answers).

### **The 4 Tiers Explained**

Think of tiers as levels of detail - like a book with a table of contents (Tier 0), chapter summaries (Tier 1-2), and full chapter text (Tier 3).

---

### **Tier 0: Executive Summary (The "State Dashboard")**

**What it is:** A lightweight 2K-token snapshot of the conversation state

**Purpose:** Give Plan Node a quick overview WITHOUT loading full context (saves tokens, speeds up planning)

**Contains:**

```typescript
{
  goal: 'CREATE_OFFER' | 'CREATE_FUNNEL' | 'QUERY_DATA' | 'EDIT_RESOURCE' | 'GENERAL_CHAT',
  workflow_state: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'IDLE',
  current_step: 'Step 3: Buyer Persona' // Current workflow step
  completed_actions: [
    { action: 'scrape_website', timestamp: '...', result: 'success' },
    { action: 'offer_agent step 1', timestamp: '...', result: 'success' },
    { action: 'offer_agent step 2', timestamp: '...', result: 'success' }
  ],
  available_data: {
    'offer_abc123': {
      available_fields: ['step1_*', 'step2_*'],
      missing_fields: ['step3_*', 'step4_*', 'step5_*'],
      size: '60 fields, ~50K tokens'
    }
  },
  context_budget: {
    current_tokens: 85000,
    threshold: 176000,
    remaining: 91000,
    headroom: 'GREEN' // GREEN | YELLOW | RED
  }
}
```

**When used:**

- Plan Node checks: "What's the goal? What workflow state?"
- Plan Node sees: "Offer creation IN_PROGRESS, step 2 complete, ready for step 3"
- Plan Node decides: "Call offer_agent with action: continue"

**Benefit:** Plan Node decides in seconds without loading 176K tokens of full context

---

### **Tier 1: Messages (Conversation Text)**

**What it is:** User and assistant messages (what was said in natural language)

**Purpose:** Maintain conversation flow and continuity

**Contains:**

```typescript
;[
  { role: 'user', content: 'Create an offer for Executive Coaching' },
  { role: 'assistant', content: 'Starting Power Offer creation...' },
  { role: 'user', content: 'Continue with the offer' },
  { role: 'assistant', content: 'Working on Buyer Persona...' },
]
```

**When used:**

- Model Node generates responses based on conversation history
- Synthesizer translates technical output to match conversation tone
- Save Node stores messages to database

**Token budget:** ~10-50K tokens (depends on conversation length)

---

### **Tier 2: Content Blocks (Action Metadata)**

**What it is:** Structured records of reasoning, tool calls, and execution summaries

**Purpose:** Show sequence of actions WITHOUT full data (what was done, not the data itself)

**Contains:**

```typescript
;[
  {
    type: 'reasoning',
    reasoning: 'User wants to create offer. Confidence: 95%. Next: call offer_agent.',
  },
  {
    type: 'tool_call',
    name: 'offer_agent',
    args: { action: 'initialize', offerName: 'Executive Coaching' },
  },
  {
    type: 'tool_result',
    name: 'offer_agent',
    status: 'success',
    steps: ['Market Analysis', 'Power Offer Statement'],
    summary: 'Completed step 1: Product Market Overview',
  },
]
```

**When used:**

- Model Node sees: "What tools were called? What happened?"
- Plan Node sees: "What's the action sequence so far?"
- Frontend renders: Thought blocks, Explored sections, Status messages

**Token budget:** ~5-20K tokens (metadata only, no full data)

---

### **Tier 3: Full Data (Complete Tool Results)**

**What it is:** Untruncated tool result objects with ALL fields (no summaries, complete data)

**Purpose:** Enable AI to generate detailed summaries or answer specific questions WITHOUT querying database

**Contains:**

```typescript
;[
  {
    tool: 'offer_agent',
    action: 'step_1_complete',
    data: {
      offer_id: 'abc123',
      offer_name: 'Executive Coaching',
      step1_product_name: 'Executive Coaching Program',
      step1_target_market: 'Burned-out executives...',
      step1_market_overview: '...(5000 chars)...',
      step1_positioning: '...(3000 chars)...',
      step1_competitive_landscape: '...(4000 chars)...',
      // ... 12 more step1 fields
    },
  },
  {
    tool: 'offer_agent',
    action: 'step_2_complete',
    data: {
      step2_power_offer_statement: '...',
      step2_pricing: '$5,000',
      step2_major_benefit: '...',
      step2_secondary_benefit: '...',
      // ... 15 more step2 fields
    },
  },
]
```

**When used:**

- User asks: "What's the summary of the offer we created?"
- Model Node accesses fullData: Reads all 60 fields across 5 steps
- Model Node generates: Complete summary from actual data
- Synthesizer translates: Summary into Vibey voice

**Benefit:** Zero database queries! All data already in context window.

**Token budget:** ~50-110K tokens (complete data for complex workflows)

---

### **Token Budget Strategy**

**Total Context Window:** 176K tokens (stays under 200K pricing tier)

**Budget Allocation:**

- **Tier 0 (Executive Summary):** ~2K tokens
- **Tier 1 (Messages):** ~10-50K tokens
- **Tier 2 (Content Blocks):** ~5-20K tokens
- **Tier 3 (Full Data):** ~50-110K tokens
- **Headroom for ReAct Loop:** ~24K tokens (model reasoning, tool calls, responses)

**Total:** ~176K tokens max

**Why 176K?**

- New models (Gemini, Claude) charge differently: <200K (low price) vs >200K (double price)
- 176K gives buffer for multi-turn ReAct loops without hitting 200K threshold

---

### **When to Use Which Tier**

| Question                         | Which Tier? | Why?                 |
| -------------------------------- | ----------- | -------------------- |
| "What's my current goal?"        | Tier 0      | Fast state check     |
| "What workflow step am I on?"    | Tier 0      | Current progress     |
| "What actions did I complete?"   | Tier 0      | Quick action list    |
| "What did we talk about?"        | Tier 1      | Conversation flow    |
| "What tools were called?"        | Tier 2      | Action sequence      |
| "Summarize the offer we created" | Tier 3      | Complete data needed |
| "What's the buyer persona?"      | Tier 3      | Specific field query |
| "Update pricing to $10K"         | Tier 3      | Need full offer data |

---

### **How Data Flows Through Tiers**

**Example: User Creates Offer**

**User Input:** "Create an offer for Executive Coaching"

**Tier 0 Updated:**

```typescript
goal: 'CREATE_OFFER'
workflow_state: 'STARTED'
current_step: null
```

**Tier 1 Updated:**

```typescript
messages: [{ role: 'user', content: 'Create an offer for Executive Coaching' }]
```

**Tier 2 Updated:**

```typescript
contentBlocks: [
  { type: 'reasoning', reasoning: 'User wants offer. Call offer_agent.' },
  { type: 'tool_call', name: 'offer_agent', args: { action: 'initialize' } },
]
```

**Tier 3 Updated:**

```typescript
fullData: [
  {
    tool: 'offer_agent',
    data: {
      offer_id: 'abc123',
      offer_name: 'Executive Coaching',
      // ... 15 step1 fields
    },
  },
]
```

**Executive Summary Updated:**

```typescript
workflow_state: 'IN_PROGRESS'
current_step: 'Step 1: Product Market Overview'
completed_actions: [
  { action: 'offer_agent step 1', result: 'success', timestamp: '...' }
]
available_data: {
  'offer_abc123': { available_fields: ['step1_*'], size: '15 fields' }
}
```

---

### **Lifecycle: When Tiers Are Cleared**

**During Active Conversation:**

- All 4 tiers accumulate data
- Executive Summary updates every turn
- Messages, Content Blocks, Full Data grow

**When Token Limit Reached (176K):**

- Trigger summarization
- **Tier 0:** Kept (always fresh, only 2K tokens)
- **Tier 1:** Older messages summarized, recent kept
- **Tier 2:** Content Blocks compressed
- **Tier 3:** Full Data deleted (can re-query database if needed)

**After Summarization:**

- Tier 0: Fresh executive summary (state snapshot)
- Tier 1: Summary message + recent messages
- Tier 2: Recent content blocks only
- Tier 3: Cleared (reloaded on demand)

**Benefit:** Conversation can continue indefinitely without losing context

---

### **Practical Examples**

**Example 1: Multi-Step Offer Creation**

**Turn 1:** User: "Create offer"

- Tier 0: goal='CREATE_OFFER', state='IN_PROGRESS', step='Step 1'
- Tier 3: Step 1 data (15 fields)

**Turn 2:** User: "Continue"

- Tier 0: Updates to step='Step 2'
- Tier 3: Adds Step 2 data (20 fields)

**Turn 3:** User: "Continue"

- Tier 0: Updates to step='Step 3'
- Tier 3: Adds Step 3 data (25 fields)

**Turn 4:** User: "Summarize everything"

- Model Node reads Tier 3: All 60 fields across steps 1-3
- Generates complete summary
- No database queries needed!

---

**Example 2: Tagged Resources (@mentions)**

**User tags:** "@Executive Coaching offer"

**Tier 0 Updated:**

```typescript
available_data: {
  'offer_abc123': {
    available_fields: ['step1_*', 'step2_*', 'step3_*', 'step4_*', 'step5_*'],
    size: '60 fields, ~50K tokens'
  }
}
```

**Tier 3 Loaded:**

```typescript
fullData: [
  {
    type: 'offer',
    id: 'offer_abc123',
    data: {
      /* all 60 fields */
    },
  },
]
```

**User asks:** "What's the pricing?"

- Plan Node checks Tier 0: "Offer data available ✓"
- Model Node accesses Tier 3: Finds `step2_pricing: "$5,000"`
- Responds instantly (no database query)

---

### **Benefits of 4-Tier Architecture**

✅ **Fast Planning:** Tier 0 lets Plan Node decide in <1s (2K tokens vs 176K)
✅ **Complete Context:** Tier 3 gives Model Node full data for detailed answers
✅ **Zero Redundant Queries:** Data loaded once, reused across turns
✅ **Token Efficient:** Tiers load only what's needed for each node
✅ **Cost Optimized:** Stays under 200K pricing threshold
✅ **Scalable:** Summarization ensures indefinite conversations

---

### **Debugging Context Issues**

**Check these in order:**

1. **Executive Summary (Tier 0):** Is workflow state correct?
   - Check logs: `[Orchestrator] Executive Summary: goal='CREATE_OFFER'`
2. **Full Data (Tier 3):** Is data loaded into context?
   - Check logs: `[Model Node] Full Data: 3 items, 85K tokens`
3. **Token Budget:** Are we near the 176K threshold?
   - Check logs: `[Orchestrator] Context Budget: 150K / 176K (YELLOW)`
4. **Summarization Trigger:** Did we hit the threshold?
   - Check logs: `[Orchestrator] Summarization triggered (178K > 176K)`

---

_For tagging and @mentions integration, see Section 5 above_
_For backend architecture, see `@backend-architecture.md`_

---

## Common Patterns

### **Adding New Content Block Types**

1. **Define type in `content-blocks.ts`:**

```typescript
export interface NewBlockType extends BaseContentBlock {
  type: 'new_type'
  // Additional fields
}
```

2. **Add backend emission in appropriate node:**

```typescript
config.writer?.({
  type: 'new_type',
  // data
})
```

3. **Add frontend handler in `stream-manager.ts`:**

```typescript
if (event.type === 'new_type') {
  // Handle event
  // Manage animation visibility
}
```

4. **Add renderer in `ContentBlockRenderer.tsx`:**

```typescript
case 'new_type':
  return <NewBlockRenderer {...block} />
```

### **Debugging Animation Issues**

**Check these in order:**

1. **Backend emission:** Is `tool_execution_start` being emitted?
   - Check logs: `[ToolsNode] Executing tool: {name}`
   - Check SSE stream: Look for `tool_execution_start` event

2. **Frontend reception:** Is StreamManager receiving the event?
   - Check logs: `[StreamManager] tool_execution_start received`

3. **Animation timer:** Is timer being cleared incorrectly?
   - Check logs: `clearTimeout` calls
   - Verify timer only cleared on reasoning/tool_result, NOT on status

4. **ContentBlockRenderer:** Is animation block being rendered?
   - Check contentBlocks array: Look for `{ type: 'gap-animation' }`
   - Check visibility logic: Animation should show during isStreaming if tool is executing

---

## Architecture Diagrams

### **Animation State Machine**

```
User Input
    ↓
[ANIMATION] (initializing)
    ↓
Reasoning Stream Starts
    ↓
[THOUGHT OPEN] (no animation)
    ↓
Thought Closes
    ↓
[ANIMATION] (brief gap)
    ↓
Tool Execution Starts
    ↓
[ANIMATION] (LONG - 30-60s) ← CRITICAL: User must see animation here
    ↓
Tool Result Arrives
    ↓
[EXPLORED] (no animation)
    ↓
Status Displays
    ↓
[STATUS TEXT] (no animation)
    ↓
Status Finishes
    ↓
Next Tool Execution Starts
    ↓
[ANIMATION] (LONG - 30-60s) ← CRITICAL: User must see animation here
    ↓
... repeat
```

### **Event Flow: Backend → Frontend**

```
Backend Node Emits Event
    ↓
SSE Stream Sends to Frontend
    ↓
StreamManager Receives Event
    ↓
Update contentBlocks Array
    ↓
Manage Animation Timer
    ↓
ContentBlockRenderer Renders
    ↓
User Sees Content/Animation
```

---

## Troubleshooting

### **Animation Not Showing During Tool Execution**

**Symptom:** User sees thought close, then UI freezes (no animation), then tool result suddenly appears.

**Root Cause:** Gap animation timer is being cleared when status text arrives (`response_chunk` event).

**Fix:** Do NOT clear animation timer on `response_chunk`. Only clear on `reasoning_chunk` or `tool_execution_complete`.

### **Animation Showing During Content Streaming**

**Symptom:** Animation overlaps with thought text or status text.

**Root Cause:** Animation visibility logic is incorrect in `ContentBlockRenderer`.

**Fix:** Hide animation when `isStreaming && (activeReasoningBlock || activeStatusBlock)`.

### **Status Messages Accumulating**

**Symptom:** "Working on Power Offer...Working on Buyer Persona...Working on ICP..." all show together.

**Root Cause:** `accumulatedContent` in StreamManager is not being reset between ReAct cycles.

**Fix:** Reset `accumulatedContent = ''` when new reasoning chunk arrives with empty buffer (start of new cycle).

---

_For code implementation patterns, see `@code-guidelines.md`_
_For backend architecture, see `@backend-architecture.md`_
