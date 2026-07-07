# Agent Building Guidelines - Vibey Backend

**Version 1.0 - Domain-of-Authority Pattern**

---

## 🎯 **Agent Architecture Philosophy**

**Principle:** Each agent is the **complete domain of authority** for a specific business domain.

**Why?**

- **Scalability:** Vibey doesn't get overwhelmed with 50+ tools
- **Isolation:** Changes to Offers don't affect Funnels
- **Clarity:** One agent = one domain = clear ownership
- **Maintainability:** Each agent is self-contained

**Anti-Pattern:**

```
❌ WRONG - Orchestrator with domain-specific tools:
Vibey Orchestrator has:
├─ query_offers (offers domain)
├─ create_offer (offers domain)
├─ view_funnel (funnels domain)
├─ edit_funnel (funnels domain)
└─ scrape_website (utility)
Result: 50+ tools as app grows

✅ CORRECT - Orchestrator with domain agents:
Vibey Orchestrator has:
├─ offer_agent (complete offers domain)
├─ funnel_agent (complete funnels domain)
└─ scrape_website (utility)
Result: ~5 agents regardless of features
```

---

## 🏗️ **Agent Structure Pattern**

Every agent follows this structure:

```
modules/vibey/agents/[domain]-agent/
├── services/
│   └── [domain]-agent.service.ts     # NestJS service with all agent logic
├── chains/
│   └── [workflow].chain.ts           # LangChain chains for complex workflows
├── tools/
│   └── [domain]-agent.tool.ts        # LangChain tool wrapper
└── README.md                          # Agent documentation
```

---

## 📋 **Agent Components**

### **1. Agent Service (Business Logic)**

**Purpose:** Contains all agent logic - both simple tools and complex chains.

**File:** `services/[domain]-agent.service.ts`

**Structure:**

```typescript
/**
 * [Domain] Agent Service
 *
 * Complete domain of authority for [domain].
 * Handles both simple CRUD operations and complex AI workflows.
 */

import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export interface [Domain]AgentResponse {
  success: boolean
  data?: any
  error?: string
  nextPrompt?: string  // What Vibey should say to user
}

@Injectable()
export class [Domain]AgentService {
  constructor(
    // Inject dependencies (other services, integrations)
  ) {}

  // ========================================
  // CHAINS: Complex multi-step AI workflows
  // ========================================

  /**
   * Create [domain item] - Multi-step AI workflow
   */
  async create[Domain](
    userId: string,
    input: any,
    supabase: SupabaseClient
  ): Promise<[Domain]AgentResponse> {
    // Call chain for complex workflow
    const result = await process[Domain]Chain(...)
    return result
  }

  // ========================================
  // TOOLS: Simple CRUD operations
  // ========================================

  /**
   * View [domain item]
   */
  async view[Domain](
    id: string,
    userId: string,
    supabase: SupabaseClient
  ): Promise<[Domain]AgentResponse> {
    // Simple database query
    const { data, error } = await supabase
      .from('[domain]s')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    return {
      success: !error,
      data,
      error: error?.message,
      nextPrompt: `Here's your [domain item].`
    }
  }

  /**
   * Edit [domain item]
   */
  async edit[Domain](
    id: string,
    userId: string,
    updates: Record<string, any>,
    supabase: SupabaseClient
  ): Promise<[Domain]AgentResponse> {
    // Update logic
  }

  /**
   * Delete [domain item]
   */
  async delete[Domain](
    id: string,
    userId: string,
    supabase: SupabaseClient
  ): Promise<[Domain]AgentResponse> {
    // Delete logic
  }

  /**
   * List/query [domain items]
   */
  async list[Domain]s(
    userId: string,
    filters: any,
    supabase: SupabaseClient
  ): Promise<[Domain]AgentResponse> {
    // Query with filters
  }
}
```

**Rules:**

- ✅ Maximum 600 LOC
- ✅ All domain operations in one service
- ✅ Return structured `AgentResponse` with `nextPrompt`
- ✅ Use RLS-enforced Supabase client
- ✅ Log actions with `[Domain Agent]` prefix

---

### **2. Chains (Complex Workflows)**

**Purpose:** Multi-step AI workflows using LangChain.

**File:** `chains/[workflow].chain.ts`

**When to Use:**

- Multi-step AI generation
- Requires LangSmith prompts
- Complex state management
- Fallback models
- Retry logic

**Structure:**

```typescript
/**
 * [Domain] [Workflow] Chain
 *
 * LangChain-based chain for [purpose].
 *
 * Steps:
 * 1. Fetch data from database
 * 2. Fetch prompt from LangSmith
 * 3. Build AI messages
 * 4. Call AI with structured output
 * 5. Parse and validate response
 * 6. Update database
 */

import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'
import { SupabaseClient } from '@supabase/supabase-js'

export interface ChainInput {
  [key]: string
  supabase: SupabaseClient
  // Dependencies
}

export interface ChainOutput {
  success: boolean
  data?: any
  error?: string
}

// Define chain steps as RunnableLambda
const step1 = RunnableLambda.from(async (input: ChainInput) => {
  // Step logic
  return { ...input, result }
})

const step2 = RunnableLambda.from(async (input: any) => {
  // Step logic
  return { ...input, result }
})

// Build complete chain
export const [workflow]Chain = RunnableSequence.from([
  step1,
  step2,
  // ... more steps
])

// Convenience method
export async function process[Workflow](
  params: any
): Promise<ChainOutput> {
  try {
    return await [workflow]Chain.invoke(params)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

**Rules:**

- ✅ Maximum 400 LOC per chain
- ✅ Use RunnableSequence for composition
- ✅ Include retry logic with exponential backoff
- ✅ Use structured outputs (not manual parsing)
- ✅ Log each step with chain name prefix

---

### **3. Tool Wrapper (LangChain Integration)**

**Purpose:** Wraps agent service as a LangChain tool for orchestrator.

**File:** `tools/[domain]-agent.tool.ts`

**Structure:**

```typescript
/**
 * [Domain] Agent Tool
 *
 * LangChain tool wrapper for the [Domain] Agent.
 * Routes actions to either simple tools or complex chains.
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { [Domain]AgentService } from '../services/[domain]-agent.service'

export function create[Domain]AgentTool(agentService: [Domain]AgentService) {
  return tool(
    async (
      {
        action,
        // ... parameters
      }: {
        action: 'create' | 'view' | 'edit' | 'delete' | 'list' | 'status'
        // ... parameter types
      },
      config
    ) => {
      try {
        // Extract context from orchestrator
        const supabase = config?.context?.supabase
        const userId = config?.context?.userId

        if (!supabase || !userId) {
          return JSON.stringify({
            success: false,
            error: 'Authentication required'
          })
        }

        // Route to appropriate action
        switch (action) {
          // ========================================
          // CHAINS: Complex workflows
          // ========================================

          case 'create':
            const createResult = await agentService.create[Domain](
              userId,
              params,
              supabase
            )
            return JSON.stringify(createResult)

          // ========================================
          // TOOLS: Simple CRUD
          // ========================================

          case 'view':
            const viewResult = await agentService.view[Domain](...)
            return JSON.stringify(viewResult)

          case 'edit':
            const editResult = await agentService.edit[Domain](...)
            return JSON.stringify(editResult)

          case 'delete':
            const deleteResult = await agentService.delete[Domain](...)
            return JSON.stringify(deleteResult)

          case 'list':
            const listResult = await agentService.list[Domain]s(...)
            return JSON.stringify(listResult)

          default:
            return JSON.stringify({
              success: false,
              error: `Unknown action: ${action}`
            })
        }
      } catch (error) {
        console.error(`[[Domain] Agent Tool] Execution failed:`, error)
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Tool execution failed'
        })
      }
    },
    {
      name: '[domain]_agent',
      description: `Complete domain agent for ALL [domain] operations.

**DOMAIN: [Domain] (Complete Authority)**
This agent handles EVERYTHING related to [domain]. No other tool should touch [domain].

**Actions Available:**

**Chains (Multi-step AI):**
- create: [description]

**Tools (CRUD):**
- view: Get [domain item] details
- edit: Update [domain item]
- delete: Delete [domain item]
- list: Query/search [domain items]
- status: Check [domain] status

**When to use:**
- ANY operation on [domain]
- User asks about their [domain items]
- User wants to create/modify [domain items]

**Important:**
- This is the ONLY tool for [domain] domain
- Returns structured JSON
- Vibey rephrases responses in Vibey's voice`,
      schema: z.object({
        action: z
          .enum(['create', 'view', 'edit', 'delete', 'list', 'status'])
          .describe('Action to perform'),
        // ... parameter schemas
      }),
    }
  )
}
```

**Rules:**

- ✅ Factory function (not class) - allows DI
- ✅ Returns LangChain `tool()`
- ✅ Always return JSON strings
- ✅ Extract context from config
- ✅ Route to service methods
- ✅ Clear separation: chains vs tools

---

## 🔄 **Orchestrator Integration**

### **How Orchestrator Works with Agents**

**Orchestrator's Role:**

1. ✅ Receives user message
2. ✅ Builds system prompt with context
3. ✅ Calls AI model with available tools (agents)
4. ✅ AI decides which agent/action to call
5. ✅ Orchestrator executes tool call
6. ✅ Returns result to AI
7. ✅ AI generates final response in Vibey's voice

**Orchestrator Integration:**

```typescript
// vibey-orchestrator.service.ts

@Injectable()
export class VibeyOrchestratorService {
  constructor(
    // ... other services
    private offerAgentService: OfferAgentService, // Inject agent
    private funnelAgentService: FunnelAgentService, // Inject agent
  ) {}

  private buildTools(): any[] {
    const tools: any[] = []

    // ========================================
    // DOMAIN AGENTS (Complete Authority)
    // ========================================

    // Offer Agent: Handles ALL offer operations
    tools.push(createOfferAgentTool(this.offerAgentService))

    // Funnel Agent: Handles ALL funnel operations
    tools.push(createFunnelAgentTool(this.funnelAgentService))

    // ========================================
    // UTILITY TOOLS (Generic Cross-Domain)
    // ========================================

    // Scraping tool
    tools.push(scrapeTool)

    return tools
  }
}
```

**Module Registration:**

```typescript
// vibey.module.ts

@Module({
  providers: [
    // Orchestrator
    VibeyOrchestratorService,

    // Specialized Agents
    OfferAgentService,
    FunnelAgentService,

    // Shared Services
    JsonRepairService,
  ],
})
export class VibeyModule {}
```

---

## 📊 **Agent Response Format**

**All agent methods MUST return consistent response:**

```typescript
export interface AgentResponse {
  success: boolean // ✅ Operation succeeded
  data?: any // ✅ Result data (if any)
  error?: string // ✅ Error message (if failed)
  nextPrompt?: string // ✅ What Vibey should say to user

  // Domain-specific fields (optional)
  [key: string]: any
}
```

**Why `nextPrompt`?**

- Agents suggest what to say
- Vibey rephrases in Vibey's voice
- Keeps agent responses atomic
- AI can adapt to conversation context

**Example:**

```typescript
// Agent returns:
{
  success: true,
  data: { id: '...', name: 'My Offer' },
  nextPrompt: "Offer created successfully."
}

// Vibey sees this and rephrases:
"Sweet! I just created your offer 'My Offer'. Want to add details now? 🚀"
```

---

## 🎨 **Tool vs Chain Decision Matrix**

| Use Case                       | Use Tool (Simple) | Use Chain (Complex) |
| ------------------------------ | ----------------- | ------------------- |
| **Single database query**      | ✅                | ❌                  |
| **Simple CRUD operation**      | ✅                | ❌                  |
| **Status check**               | ✅                | ❌                  |
| **Multi-step AI generation**   | ❌                | ✅                  |
| **Requires LangSmith prompts** | ❌                | ✅                  |
| **Fallback models needed**     | ❌                | ✅                  |
| **Retry logic required**       | ❌                | ✅                  |
| **JSON repair needed**         | ❌                | ✅                  |
| **Takes >5 seconds**           | ❌                | ✅                  |

---

## 📏 **File Size Limits (Enforced)**

| File Type         | Max LOC | Action at 80%                                   |
| ----------------- | ------- | ----------------------------------------------- |
| **Agent Service** | 600     | Split into multiple services or extract helpers |
| **Chain**         | 400     | Split into multiple chains or extract steps     |
| **Tool Wrapper**  | 400     | Should never hit - review architecture          |

---

## ✅ **Agent Checklist**

Before creating a new agent:

**Architecture:**

- [ ] Is this a complete business domain? (not a single operation)
- [ ] Will this domain have multiple operations? (create, view, edit, delete, list)
- [ ] Does this need to be separate from existing agents?

**Implementation:**

- [ ] Created service with all domain operations (tools + chains)
- [ ] Created tool wrapper with action routing
- [ ] Registered service in vibey.module.ts
- [ ] Added agent to orchestrator buildTools()
- [ ] Agent service < 600 LOC
- [ ] Chain files < 400 LOC each
- [ ] Tool wrapper < 400 LOC

**Testing:**

- [ ] All tools work independently
- [ ] Chains execute successfully
- [ ] Tool routing works correctly
- [ ] Orchestrator can call agent
- [ ] No linter errors
- [ ] RLS enforced (no service role key usage)

**Documentation:**

- [ ] Agent README.md with purpose and usage
- [ ] Tool description clear for AI
- [ ] Code comments explain complex logic

---

## 🚫 **Common Anti-Patterns**

### **❌ Anti-Pattern 1: Domain Leak**

```typescript
// WRONG: Orchestrator has domain-specific tools
private buildTools() {
  tools.push(query_offers)   // ❌ Offers domain leaked to orchestrator
  tools.push(create_offer)   // ❌ Should be in Offer Agent
}

// CORRECT: Orchestrator only has agents
private buildTools() {
  tools.push(createOfferAgentTool(...))  // ✅ Complete agent
}
```

### **❌ Anti-Pattern 2: Agent Without Tools**

```typescript
// WRONG: Agent only has creation chain, no CRUD
class OfferAgentService {
  createOffer() {} // Only one method
}

// CORRECT: Agent has complete domain
class OfferAgentService {
  createOffer() {} // Chain
  viewOffer() {} // Tool
  editOffer() {} // Tool
  deleteOffer() {} // Tool
  listOffers() {} // Tool
}
```

### **❌ Anti-Pattern 3: Business Logic in Tool Wrapper**

```typescript
// WRONG: Business logic in tool wrapper
export function createOfferAgentTool(service: OfferAgentService) {
  return tool(async ({ action }) => {
    // ❌ Business logic here
    if (action === 'create') {
      const data = await supabase.from('offers').insert(...)
      return JSON.stringify(data)
    }
  })
}

// CORRECT: Tool wrapper only routes
export function createOfferAgentTool(service: OfferAgentService) {
  return tool(async ({ action }) => {
    // ✅ Just routing
    switch (action) {
      case 'create':
        return JSON.stringify(await service.createOffer(...))
    }
  })
}
```

---

## 🎯 **Success Metrics**

Agent architecture is working when:

- ✅ Orchestrator has <10 tools (regardless of features)
- ✅ Each domain has ONE agent
- ✅ Adding new operations doesn't add tools
- ✅ Changes to one agent don't affect others
- ✅ AI can discover all operations through agent description

---

## 📝 **Example: Complete Agent Implementation**

See `modules/vibey/agents/offer-agent/` for reference implementation:

- ✅ Complete CRUD operations + creation chain
- ✅ 558 LOC service (within 600 limit)
- ✅ 363 LOC chain (within 400 limit)
- ✅ 273 LOC tool wrapper
- ✅ Clear separation of concerns
- ✅ Proper error handling
- ✅ RLS enforcement
- ✅ Comprehensive tool description

---

**Remember:** One agent = one domain = complete authority. Keep it simple, keep it focused.
