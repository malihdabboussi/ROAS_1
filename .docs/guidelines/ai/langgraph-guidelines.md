# LangGraph Streaming Guidelines

**LangGraph Authority - Real-Time Streaming, Node Organization, Best Practices**

**Last Updated:** 2025-10-28  
**Based on:** Official LangGraph TypeScript/JavaScript Documentation

---

## 📖 **Table of Contents**

**CORE CONCEPTS**

1. [Core Principle](#1-core-principle) ............................................ Line ~40
2. [Common Mistake: Using .invoke()](#2-common-mistake-using-invoke) .............. Line ~60
3. [Correct Approach: Using .stream()](#3-correct-approach-using-stream) .......... Line ~110

**OFFICIAL PATTERNS** 4. [Pattern 1: Streaming LLM Tokens](#4-pattern-1-streaming-llm-tokens) ........... Line ~180 5. [Pattern 2: Streaming Custom Data](#5-pattern-2-streaming-custom-data) ......... Line ~230 6. [Pattern 3: Streaming with Tool Calls](#6-pattern-3-streaming-with-tool-calls) . Line ~270

**STREAM MODES** 7. [Stream Modes Explained](#7-stream-modes-explained) ............................ Line ~350 8. [When To Use Each Approach](#8-when-to-use-each-approach) ...................... Line ~420

**CRITICAL RULES** 9. [Rule 1: config.writer() is Optional](#9-rule-1-configwriter-is-optional) ...... Line ~490 10. [Rule 2: Stream Text, Not Metadata](#10-rule-2-stream-text-not-metadata) ...... Line ~510 11. [Rule 3: Accumulate State, Stream Chunks](#11-rule-3-accumulate-state-stream-chunks) Line ~530 12. [Rule 4: Enable streaming: true](#12-rule-4-enable-streaming-true) ............ Line ~560

**PERFORMANCE & DEBUGGING** 13. [Performance Comparison](#13-performance-comparison) ........................... Line ~590 14. [Debugging Streaming](#14-debugging-streaming) ................................. Line ~630 15. [Checklist for New Nodes](#15-checklist-for-new-nodes) ........................ Line ~700

**CODE ORGANIZATION** 16. [Node Extraction Pattern](#16-node-extraction-pattern) ......................... Line ~750 17. [Benefits & When to Extract](#17-benefits--when-to-extract) ................... Line ~920 18. [Real-World Example](#18-real-world-example) ................................... Line ~1000

---

<!-- ============================================================================
   SECTION 1: CORE PRINCIPLE
   ============================================================================ -->

## 1. Core Principle

**Real-time streaming requires `.stream()` + `config.writer()`, NOT `.invoke()`**

---

<!-- ============================================================================
   SECTION 2: COMMON MISTAKE - USING .INVOKE()
   ============================================================================ -->

## 2. Common Mistake: Using .invoke()

### **What We Did Wrong**

```typescript
// ❌ WRONG - Waits for complete response, THEN streams
const response = await model.invoke(messages)
return { messages: [response] }
```

**Problem:**

1. `.invoke()` waits for COMPLETE response
2. LangGraph emits result AFTER node completes
3. User sees: Long wait → Everything appears at once
4. Result: Batch streaming (all at end), not real-time

**When this happens:**

- Planning node: 3-5 second wait → Complete reasoning appears
- Model node: 5-10 second wait → Complete answer appears
- User experience: Feels frozen/broken

---

<!-- ============================================================================
   SECTION 3: CORRECT APPROACH - USING .STREAM()
   ============================================================================ -->

## 3. Correct Approach: Using .stream()

### **What To Do Instead**

```typescript
// ✅ CORRECT - Streams tokens AS THEY'RE GENERATED
const stream = await model.stream(messages)

let fullContent = ''
for await (const chunk of stream) {
  if (chunk.content) {
    fullContent += chunk.content
    config.writer?.(chunk.content) // Stream immediately to 'custom' mode
  }
}

return { messages: [fullContent] }
```

**Why This Works:**

1. `.stream()` yields tokens as model generates them
2. `config.writer()` emits to LangGraph's 'custom' stream mode IMMEDIATELY
3. Frontend receives tokens in real-time
4. Result: Typewriter effect like ChatGPT

**User experience:**

- Sees "Vibey thinking..."
- Reasoning appears word by word AS it's generated
- Answer streams token by token AS Vibey types
- No waiting, constant feedback

---

<!-- ============================================================================
   SECTION 4: PATTERN 1 - STREAMING LLM TOKENS
   ============================================================================ -->

## 4. Pattern 1: Streaming LLM Tokens

From official docs:

```typescript
const callModel = async (state, config: LangGraphRunnableConfig) => {
  const stream = await model.stream(state.messages)

  let fullResponse = ''
  for await (const chunk of stream) {
    if (chunk.content) {
      fullResponse += chunk.content
      config.writer?.(chunk.content) // Streams to 'custom' mode
    }
  }

  return { messages: [fullResponse] }
}
```

**Key Points:**

- Use `.stream()` not `.invoke()`
- Loop through chunks with `for await`
- Call `config.writer()` for each chunk
- Accumulate full response for state

---

<!-- ============================================================================
   SECTION 5: PATTERN 2 - STREAMING CUSTOM DATA
   ============================================================================ -->

## 5. Pattern 2: Streaming Custom Data

From official docs:

```typescript
const myNode = async (state, config: LangGraphRunnableConfig) => {
  const chunks = ['Four', 'score', 'and', 'seven', 'years', 'ago']

  for (const chunk of chunks) {
    config.writer?.(chunk) // Streams immediately via 'custom' mode
  }

  return { messages: [{ role: 'assistant', content: chunks.join(' ') }] }
}
```

**Use for:**

- Progress updates ("Processing step 1 of 5...")
- Status messages ("Searching database...")
- Custom events ("Found 3 results")

---

<!-- ============================================================================
   SECTION 6: PATTERN 3 - STREAMING WITH TOOL CALLS
   ============================================================================ -->

## 6. Pattern 3: Streaming with Tool Calls

```typescript
const callModel = async (state, config: LangGraphRunnableConfig) => {
  const stream = await model.stream(messages)

  let fullContent = ''
  let toolCalls: any[] = []
  const chunks: any[] = []

  for await (const chunk of stream) {
    chunks.push(chunk)

    // Stream text tokens
    if (chunk.content) {
      fullContent += chunk.content
      config.writer?.(chunk.content)
    }

    // Collect tool calls (don't stream these, they're metadata)
    if (chunk.tool_calls?.length > 0) {
      toolCalls = chunk.tool_calls
    }
  }

  // Use last chunk as response (has complete tool_calls array)
  const finalResponse = chunks[chunks.length - 1]

  return { messages: [finalResponse] }
}
```

**Key Points:**

- Stream text content immediately
- Collect tool calls without streaming
- Return complete message with tool calls intact

---

<!-- ============================================================================
   SECTION 7: STREAM MODES EXPLAINED
   ============================================================================ -->

## 7. Stream Modes Explained

### **3 Stream Modes Available**

```typescript
const stream = await graph.stream(input, {
  streamMode: ['updates', 'messages', 'custom'],
})
```

**1. `updates` - Node Completion Events**

- Emitted AFTER each node finishes
- Contains final node output
- Use for: Progress tracking ("Planning done", "Model done")

**2. `messages` - LLM Token Streaming**

- Emitted as LLM generates tokens
- Only works with `.stream()` (not `.invoke()`)
- Use for: Real-time text streaming

**3. `custom` - Custom Data Streaming**

- Emitted when `config.writer()` is called
- Works for any node
- Use for: Status updates, progress, custom events

---

<!-- ============================================================================
   SECTION 8: WHEN TO USE EACH APPROACH
   ============================================================================ -->

## 8. When To Use Each Approach

### **Use .stream() + config.writer() (Real-time Streaming)**

**When:**

- User-facing responses (chatbot, copilot)
- Progress indicators needed
- Long-running operations
- Multi-step workflows

**Examples:**

- Planning/reasoning display
- AI response generation
- Tool execution progress
- Multi-agent coordination

### **Use .invoke() (Batch Processing)**

**When:**

- Internal processing (no user waiting)
- Background jobs
- Batch operations
- Non-interactive flows

**Examples:**

- Offer generation steps (internal)
- Data processing pipelines
- Scheduled tasks
- API-to-API communication

---

<!-- ============================================================================
   SECTION 9: RULE 1 - CONFIG.WRITER() IS OPTIONAL
   ============================================================================ -->

## 9. Rule 1: config.writer() is Optional

```typescript
config.writer?.(chunk) // Use optional chaining
```

**Why:** `writer` only exists when streaming is active. Always check with `?.`

---

<!-- ============================================================================
   SECTION 10: RULE 2 - STREAM TEXT, NOT METADATA
   ============================================================================ -->

## 10. Rule 2: Stream Text, Not Metadata

```typescript
// ✅ DO: Stream user-visible content
config.writer?.(chunk.content)

// ❌ DON'T: Stream internal data
config.writer?.(chunk.tool_calls) // Wrong - metadata, not content
```

**Why:** Users see 'custom' stream output. Only send readable content.

---

<!-- ============================================================================
   SECTION 11: RULE 3 - ACCUMULATE STATE, STREAM CHUNKS
   ============================================================================ -->

## 11. Rule 3: Accumulate State, Stream Chunks

```typescript
let fullResponse = ''

for await (const chunk of stream) {
  fullResponse += chunk.content // Accumulate for state
  config.writer?.(chunk.content) // Stream for user
}

return { messages: [fullResponse] } // State gets full message
```

**Why:** State needs complete data, user needs real-time tokens.

---

<!-- ============================================================================
   SECTION 12: RULE 4 - ENABLE STREAMING: TRUE
   ============================================================================ -->

## 12. Rule 4: Enable streaming: true

```typescript
const model = new ChatOpenAI({
  model: 'google/gemini-2.5-pro',
  streaming: true, // Required for .stream() to work
  // ... other config
})
```

**Why:** Model must support streaming at initialization.

---

<!-- ============================================================================
   SECTION 13: PERFORMANCE COMPARISON
   ============================================================================ -->

## 13. Performance Comparison

### **Batch (.invoke())**

```
User request → Wait 10s → Complete response
User sees: "..." → "Complete answer"
Perceived speed: Slow (10s wait)
```

### **Streaming (.stream())**

```
User request → Token 1 (0.1s) → Token 2 (0.2s) → ... → Token N (10s)
User sees: "H" → "He" → "Hel" → "Hell" → "Hello"
Perceived speed: Fast (immediate feedback)
```

**Perceived speed improvement: 5-10x faster**

---

<!-- ============================================================================
   SECTION 14: DEBUGGING STREAMING
   ============================================================================ -->

## 14. Debugging Streaming

### **Check 1: Is streaming enabled?**

```typescript
const model = new ChatOpenAI({
  streaming: true, // Must be true
})
```

### **Check 2: Using .stream() not .invoke()?**

```typescript
// ❌ Wrong
await model.invoke(messages)

// ✅ Correct
await model.stream(messages)
```

### **Check 3: Calling config.writer()?**

```typescript
for await (const chunk of stream) {
  config.writer?.(chunk.content) // Must call this
}
```

### **Check 4: StreamMode includes 'custom'?**

```typescript
const stream = await graph.stream(input, {
  streamMode: ['updates', 'messages', 'custom'], // Need 'custom'
})
```

---

<!-- ============================================================================
   SECTION 15: CHECKLIST FOR NEW NODES
   ============================================================================ -->

## 15. Checklist for New Nodes

Before creating any LangGraph node:

- [ ] Is this user-facing? → Use `.stream()`
- [ ] Is this internal? → OK to use `.invoke()`
- [ ] Enabled `streaming: true` in model config?
- [ ] Loop through chunks with `for await`?
- [ ] Call `config.writer?.()` for each chunk?
- [ ] Accumulate full response for state?
- [ ] Return complete message in state?
- [ ] StreamMode includes 'custom'?

---

<!-- ============================================================================
   SECTION 16: NODE EXTRACTION PATTERN
   ============================================================================ -->

## 16. Node Extraction Pattern

### **When to Extract Nodes to Separate Files**

**Extract when:**

- Graph builder file exceeds 600-800 lines
- Node functions are complex (50+ lines each)
- Nodes are reusable across multiple graphs
- Need independent testing of node logic

**Keep inline when:**

- Simple 10-20 line nodes
- Graph-specific logic not reused elsewhere
- Rapid prototyping phase

### **File Structure**

```
vibey/orchestrator/
  ├── services/
  │   └── vibey-orchestrator.service.ts  (main coordinator)
  ├── nodes/
  │   ├── plan-node.ts       (planning logic)
  │   └── model-node.ts      (model calling logic)
  └── graph-builder.ts       (optional: graph construction)
```

### **Example: Plan Node Extraction**

**Before (Inline Node - 814 line file):**

```typescript
// Inside buildGraph() method
const planResponse = async (state, config: LangGraphRunnableConfig) => {
  // 80 lines of planning logic...
  const stream = await planningModel.stream([...])
  let fullReasoning = ""
  for await (const chunk of stream) {
    fullReasoning += chunk.content
    config.writer?.(chunk.content)
  }
  return { reasoning: fullReasoning }
}

// 200 more lines of other nodes...
```

**After (Extracted Node - Two 100-line files):**

**File: `nodes/plan-node.ts`**

```typescript
/**
 * Plan Node - Vibey Orchestrator
 *
 * Generates reasoning before model response with REAL-TIME STREAMING.
 * Uses .stream() + config.writer() for token-by-token output.
 *
 * @see .docs/.langgraph_guidelines.md - Pattern 1: Streaming LLM Tokens
 */
import { ChatOpenAI } from '@langchain/openai'
import type { LangGraphRunnableConfig } from '@langchain/langgraph'

export const planResponse = async (
  state: any,
  config: LangGraphRunnableConfig
) => {
  // 80 lines of planning logic...
  const stream = await planningModel.stream([...])
  let fullReasoning = ""
  for await (const chunk of stream) {
    fullReasoning += chunk.content
    config.writer?.(chunk.content)
  }
  return { reasoning: fullReasoning }
}
```

**File: `services/vibey-orchestrator.service.ts`**

```typescript
import { planResponse } from '../nodes/plan-node'

private async buildGraph() {
  // ... model setup ...

  // Use extracted node
  const graph = new StateGraph(VibeyStateAnnotation)
    .addNode("plan", planResponse)  // Clean and simple
    .addNode("model", callModel)
    .compile()

  return graph
}
```

---

<!-- ============================================================================
   SECTION 17: BENEFITS & WHEN TO EXTRACT
   ============================================================================ -->

## 17. Benefits & When to Extract

### **Benefits of Node Extraction**

1. **Smaller Files** (814 lines → 200 lines main + 100 lines per node)
2. **Testable Nodes** (test node logic independently)
3. **Reusable Logic** (use same node in multiple graphs)
4. **Clear Responsibilities** (one file = one node's logic)
5. **Easier Navigation** (find node logic by filename)
6. **Better Collaboration** (less merge conflicts)

### **Node Extraction Checklist**

Before extracting a node:

- [ ] Node is 50+ lines of code
- [ ] Node logic is self-contained
- [ ] All dependencies can be imported
- [ ] Node can be tested independently
- [ ] Main file will be <600 lines after extraction

**If all checked → Extract the node**

### **Nodes That Need Model Access**

**Pattern: Factory Function**

For nodes that need the bound model instance:

```typescript
// nodes/model-node.ts
export const createModelNode = (model: any) => {
  return async (state: any, config: LangGraphRunnableConfig) => {
    const stream = await model.stream([...])  // Uses bound model
    // ... rest of node logic
  }
}

// In service:
const callModel = createModelNode(this.model)
```

**Why:** Model is bound to tools in service, node needs access to it.

---

<!-- ============================================================================
   SECTION 18: REAL-WORLD EXAMPLE
   ============================================================================ -->

## 18. Real-World Example

### **Before (Broken Streaming)**

```typescript
// Planning node
const planningResult = await planningModel.invoke(prompt)
return { reasoning: planningResult.content }
// Result: 3s wait → Complete reasoning appears

// Model node
const response = await this.model.invoke(messages)
return { messages: [response] }
// Result: 8s wait → Complete answer appears
```

**User Experience:** "Vibey in Flow..." → Long wait → Everything at once

### **After (Real-Time Streaming)**

```typescript
// Planning node
const stream = await planningModel.stream(prompt)
let fullReasoning = ''
for await (const chunk of stream) {
  fullReasoning += chunk.content
  config.writer?.(chunk.content) // Stream reasoning tokens
}
return { reasoning: fullReasoning }
// Result: Reasoning streams word by word

// Model node
const stream = await this.model.stream(messages)
let fullContent = ''
for await (const chunk of stream) {
  fullContent += chunk.content
  config.writer?.(chunk.content) // Stream answer tokens
}
return { messages: [fullContent] }
// Result: Answer streams word by word
```

**User Experience:** "Vibey thinking..." → Reasoning appears → Answer types out

---

## 🎓 **Lessons Learned**

### **Lesson 1: .invoke() != Real-Time Streaming**

**What we thought:**

> "LangGraph handles streaming automatically with .invoke()"

**What's true:**

> ".invoke() waits for completion. Use .stream() + config.writer() for real-time."

### **Lesson 2: Stream Modes Are Passive**

**What we thought:**

> "Setting streamMode: 'messages' makes everything stream"

**What's true:**

> "Stream modes CONSUME events. Nodes must PRODUCE events with .stream() + config.writer()"

### **Lesson 3: Custom Mode Is King**

**What we thought:**

> "'messages' mode is for streaming LLM tokens"

**What's true:**

> "'custom' mode (via config.writer) gives you full control and works everywhere"

---

## 🚀 **Next Steps**

When building new LangGraph nodes:

1. **Read this doc first**
2. **Check if user-facing** → Use `.stream()`
3. **Extract nodes** → If file >600 lines or node >50 lines
4. **Test streaming works** → Check terminal logs
5. **Verify real-time UX** → Open frontend, watch tokens appear
6. **Document any new patterns** → Add to this doc

---

## 📖 **References**

**Official LangGraph Docs:**

- [Streaming Guide](https://langchain-ai.github.io/langgraphjs/concepts/streaming)
- [Agent Streaming](https://langchain-ai.github.io/langgraphjs/agents/streaming)
- [Custom Events](https://langchain-ai.github.io/langgraphjs/how-tos/streaming-content)

**Key Takeaway:**

> "To stream tokens as they're generated, use `model.stream()` and write to `config.writer`. The 'messages' stream mode will emit tokens in real-time."

---

**For related patterns, see:**

- Backend architecture: `.docs/guidelines/architecture/backend-architecture.md`
- Feature development: `@.feature_guidelines.md`
- Code patterns: `.docs/guidelines/development/code-guidelines.md`

**Remember:** Real-time streaming = Happy users. Batch processing = Anxious users waiting. Small files = Happy developers.
