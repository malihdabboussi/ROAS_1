# Vibey Backend - Architecture & Design Principles

**NestJS Microservice Authority - Backend Patterns, Services, Three-Layer Architecture**

**Version 1.0 - NestJS Microservice Architecture**

---

## 📖 **Table of Contents**

**VISION & PRINCIPLES**

1. [Backend Vision](#1-backend-vision) ............................................ Line ~40
2. [Core Architecture Principles](#2-core-architecture-principles) ................ Line ~60

**THREE-LAYER ARCHITECTURE** 3. [Layer 1: Controllers (Request Handling)](#3-layer-1-controllers-request-handling) Line ~150 4. [Layer 2: Services (Business Logic)](#4-layer-2-services-business-logic) ...... Line ~250 5. [Layer 3: Repositories/Integrations (Data Access)](#5-layer-3-repositoriesintegrations-data-access) Line ~380

**CODE ORGANIZATION** 6. [DTOs & Types](#6-dtos--types) ................................................ Line ~520 7. [File Size Limits (Enforced)](#7-file-size-limits-enforced) .................. Line ~590 8. [LangGraph Node Organization](#8-langgraph-node-organization) ................. Line ~670

**PATTERNS & PRACTICES** 9. [Orchestration Patterns](#9-orchestration-patterns) ........................... Line ~860 10. [Authentication & Authorization](#10-authentication--authorization) ........... Line ~950 11. [Shared Code (Cross-Service)](#11-shared-code-cross-service) ................. Line ~1030 12. [Streaming Patterns](#12-streaming-patterns) ................................. Line ~1100

**DEPLOYMENT & QUALITY** 13. [Testing Strategy](#13-testing-strategy) ..................................... Line ~1160 14. [Deployment Architecture](#14-deployment-architecture) ....................... Line ~1220 15. [Monitoring & Observability](#15-monitoring--observability) .................. Line ~1280 16. [Migration Philosophy](#16-migration-philosophy) ............................. Line ~1340 17. [Code Review Checklist](#17-code-review-checklist) ........................... Line ~1400

---

<!-- ============================================================================
   SECTION 1: BACKEND VISION
   ============================================================================ -->

## 1. Backend Vision

Build a dedicated NestJS backend that handles AI orchestration, real-time streaming, and complex business logic - decoupled from the Next.js frontend for **scalability, independent deployment, and performance**.

---

<!-- ============================================================================
   SECTION 2: CORE ARCHITECTURE PRINCIPLES
   ============================================================================ -->

## 2. Core Architecture Principles

### **Service-Based Modules (Vertical Slices)**

Following **Service-Oriented Architecture**, organize by service (feature), not by technical role.

Each service contains its complete three-layer stack:

```
✅ CORRECT - Service-Based (Vertical Slices)
apps/app-backend/src/modules/
├── vibey/                         # Vibey AI Service
│   ├── controllers/               # Layer 1: Request handling
│   ├── services/                  # Layer 2: Business logic
│   ├── repositories/              # Layer 3: Data access
│   ├── integrations/              # Layer 3: External APIs
│   ├── dto/                       # Data validation
│   ├── types/                     # TypeScript types
│   └── vibey.module.ts            # Service module
├── auth/                          # Authentication Service
│   ├── controllers/               # Layer 1
│   ├── services/                  # Layer 2
│   ├── repositories/              # Layer 3
│   └── auth.module.ts
├── campaigns/                     # Campaigns Service
│   ├── controllers/               # Layer 1
│   ├── services/                  # Layer 2
│   ├── repositories/              # Layer 3
│   └── campaigns.module.ts
└── offers/                        # Offers Service
    ├── controllers/               # Layer 1
    ├── services/                  # Layer 2
    ├── repositories/              # Layer 3
    └── offers.module.ts

❌ WRONG - Technical Layers (Horizontal)
apps/app-backend/src/
├── controllers/              # All controllers together
│   ├── vibey.controller.ts
│   ├── auth.controller.ts
│   └── offers.controller.ts
├── services/                 # All services together
├── repositories/             # All repositories together
└── dto/                      # All DTOs together
```

**Why Service-Based?**

- **Isolation:** Changes to Vibey service don't affect Auth service
- **Ownership:** Each service owns its complete stack (3 layers)
- **Scalability:** Can extract services to separate microservices
- **Testing:** Test services independently
- **Clear Boundaries:** Each service is a self-contained unit

---

<!-- ============================================================================
   SECTION 3: LAYER 1 - CONTROLLERS (REQUEST HANDLING)
   ============================================================================ -->

## 3. Layer 1: Controllers (Request Handling)

### **Purpose**

Handle incoming requests regardless of source (HTTP, events, triggers)

### **Responsibilities**

- Route definitions (`@Get()`, `@Post()`, etc.)
- Request validation (via DTOs)
- Authentication guards
- Call services (logic layer), return responses

### **Rules**

- NO business logic
- NO database queries
- NO external API calls
- NO direct repository access
- ONLY calls services
- Keep under 200 LOC

### **Examples**

```typescript
// ✅ CORRECT - Thin controller
@Controller('vibey/conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  async listConversations(@CurrentUser() user: any, @Supabase() supabase: SupabaseClient) {
    // Controller ONLY handles request → service → response
    return this.conversationsService.listUserConversations(user.id, supabase)
  }
}

// ❌ WRONG - Fat controller with business logic or data access
@Controller('vibey/conversations')
export class ConversationsController {
  @Get()
  async listConversations(@CurrentUser() user: any) {
    // ❌ Business logic in controller
    const { data } = await supabase.from('conversations').select('*')
    const filtered = data.filter((c) => c.user_id === user.id)
    return filtered.sort((a, b) => b.updated_at - a.updated_at)
  }
}
```

---

<!-- ============================================================================
   SECTION 4: LAYER 2 - SERVICES (BUSINESS LOGIC)
   ============================================================================ -->

## 4. Layer 2: Services (Business Logic)

### **Purpose**

Implement business logic and orchestrate operations

### **Responsibilities**

- Complex operations
- Data transformations
- Business rule validation
- Orchestrating multiple repository calls
- Transaction management
- Error handling

### **Rules**

- NO HTTP concerns (no `Request`, `Response` objects)
- NO direct database/API calls
- ONLY calls repositories/integrations
- Can call other services
- Keep under 600 LOC per service

### **Examples**

```typescript
// ✅ CORRECT - Service with business logic, calls repository
@Injectable()
export class ConversationsService {
  constructor(
    private conversationsRepository: ConversationsRepository,
    private userStore: UserStoreService,
  ) {}

  async listUserConversations(userId: string, supabase: SupabaseClient) {
    // Business logic: Check user permissions, apply filters
    const hasAccess = await this.validateUserAccess(userId)
    if (!hasAccess) throw new ForbiddenException('Access denied')

    // Call repository for data access
    const conversations = await this.conversationsRepository.findByUserId(userId, supabase, {
      archived: false,
    })

    // Business logic: Sort and format
    return {
      conversations: conversations.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
    }
  }

  private async validateUserAccess(userId: string): Promise<boolean> {
    // Business rule validation
    return true
  }
}

// ❌ WRONG - Service directly querying database
@Injectable()
export class ConversationsService {
  async listUserConversations(userId: string, supabase: SupabaseClient) {
    // ❌ Direct database access in service
    const { data } = await supabase.from('conversations').select('*')
    return data
  }
}
```

---

<!-- ============================================================================
   SECTION 5: LAYER 3 - REPOSITORIES/INTEGRATIONS (DATA ACCESS)
   ============================================================================ -->

## 5. Layer 3: Repositories/Integrations (Data Access)

### **Purpose**

Manage specific logic for database operations and external service communications

### **Responsibilities**

- Database queries (Supabase, PostgreSQL)
- External API calls (OpenRouter, Firecrawl, etc.)
- Data mapping (database ↔ domain objects)
- Connection management
- Query optimization

### **Rules**

- NO business logic
- NO HTTP concerns
- ONLY data access operations
- Return raw data or domain objects
- Keep under 400 LOC per repository

### **Repository Example**

```typescript
// ✅ CORRECT - Repository handles ONLY data access
@Injectable()
export class ConversationsRepository {
  async findByUserId(userId: string, supabase: SupabaseClient, filters?: { archived?: boolean }) {
    let query = supabase.from('conversations').select('*').eq('user_id', userId)

    if (filters?.archived !== undefined) {
      query = query.eq('is_archived', filters.archived)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return data
  }

  async findById(conversationId: string, supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (error) throw new Error(`Database error: ${error.message}`)
    return data
  }

  async create(conversation: CreateConversationDto, supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single()

    if (error) throw new Error(`Database error: ${error.message}`)
    return data
  }
}
```

### **Integration Example**

```typescript
// ✅ CORRECT - Integration for external services
@Injectable()
export class OpenRouterIntegration {
  private readonly apiKey = process.env.OPENROUTER_API_KEY
  private readonly baseUrl = 'https://openrouter.ai/api/v1'

  async createChatCompletion(messages: any[], model: string) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    return response.json()
  }
}
```

---

<!-- ============================================================================
   SECTION 6: DTOs & TYPES
   ============================================================================ -->

## 6. DTOs & Types

### **DTOs (Data Transfer Objects)**

**Purpose:** Validate and type request/response data

**Responsibilities:**

- Zod schemas for validation
- TypeScript interfaces for typing
- Input sanitization

**Rules:**

- ONE DTO per endpoint action
- Use Zod for runtime validation
- Export inferred types

```typescript
// ✅ CORRECT - DTO with Zod validation
export const CreateConversationDto = z.object({
  title: z.string().min(1).max(255).optional(),
  offer_id: z.string().uuid().optional(),
})

export type CreateConversationInput = z.infer<typeof CreateConversationDto>
```

### **Types (TypeScript Definitions)**

**Purpose:** Shared types, interfaces, enums

**Location:** `types/` inside each feature

**Rules:**

- Business domain types (not technical types)
- Shared across services/controllers
- Keep organized by domain concept

```typescript
// ✅ CORRECT - Domain types
export interface VibeyOrchestratorState {
  messages: BaseMessage[]
  userId: string
  conversationId: string
  userMemories?: GroupedUserMemories
}

export type DetectedIntent = 'create_offer' | 'create_funnel' | 'general_chat'
```

---

<!-- ============================================================================
   SECTION 7: FILE SIZE LIMITS (ENFORCED)
   ============================================================================ -->

## 7. File Size Limits (Enforced)

| File Type            | Max LOC | Action at 80%                                 |
| -------------------- | ------- | --------------------------------------------- |
| **Controllers**      | 200     | Extract to new controller or service          |
| **Services (Logic)** | 600     | Split into multiple services OR extract nodes |
| **Repositories**     | 400     | Split by entity or domain                     |
| **Integrations**     | 400     | Split by external service                     |
| **DTOs**             | 300     | Group related DTOs in separate files          |
| **Types**            | 500     | Split by domain concept                       |
| **Nodes**            | 150     | Keep nodes focused on single responsibility   |

**Why 600 LOC max?**

- Forces modular design
- Easier code review
- Prevents "god classes"
- Improves testability

**Enforcement:**

- Pre-commit hook checks file size
- CI fails if limits exceeded
- Regular audits

---

<!-- ============================================================================
   SECTION 8: LANGGRAPH NODE ORGANIZATION
   ============================================================================ -->

## 8. LangGraph Node Organization

### **Node Extraction Pattern**

For services using LangGraph workflows, extract nodes into separate files when service exceeds 400 LOC or when nodes become complex.

**Structure:**

```
modules/vibey/
├── services/
│   └── vibey-orchestrator.service.ts  # Graph wiring ONLY (~200 LOC)
├── nodes/
│   ├── index.ts                       # Export all nodes
│   ├── types.ts                       # Shared node types
│   ├── plan.node.ts                   # Planning/reasoning node
│   ├── model.node.ts                  # AI response generation node
│   ├── save.node.ts                   # Database persistence node
│   └── [custom].node.ts               # Additional custom nodes
```

### **Node File Structure**

Each node follows this pattern:

```typescript
/**
 * [Node Name] Node
 * [Purpose description]
 *
 * Purpose:
 * - [Responsibility 1]
 * - [Responsibility 2]
 *
 * LangSmith Tag: [tag-name]
 */

import type { NodeDependencies, NodeState, TypedLangGraphConfig, [NodeResult] } from './types';

export async function [nodeName]Node(
  state: NodeState,
  config: TypedLangGraphConfig,
  deps: NodeDependencies,
): Promise<[NodeResult]> {
  const { logger, ...otherDeps } = deps;

  logger.log(`[${NodeName}Node] Starting...`);

  try {
    // Node logic here

    logger.log(`[${NodeName}Node] Complete`);
    return { /* result */ };
  } catch (error) {
    logger.error(`[${NodeName}Node] Failed`, error);
    throw error; // Or return graceful degradation
  }
}
```

### **Service Wiring (Orchestrator)**

Service focuses ONLY on graph construction and dependency injection:

```typescript
@Injectable()
export class VibeyOrchestratorService {
  constructor(
    private vibeyRepository: VibeyRepository,
    private systemPromptService: SystemPromptService,
    private userStoreService: UserStoreService,
    private configService: ConfigService,
  ) {}

  private async buildGraph() {
    // Prepare node dependencies
    const nodeDeps = {
      configService: this.configService,
      vibeyRepository: this.vibeyRepository,
      systemPromptService: this.systemPromptService,
      userStoreService: this.userStoreService,
      model: this.model,
      logger: this.logger,
    }

    // Wrap nodes with dependency injection
    const planResponse = (state: any, config: any) => planNode(state, config, nodeDeps)

    const callModel = (state: any, config: any) => modelNode(state, config, nodeDeps)

    const saveMessages = (state: any, config: any) => saveNode(state, config, nodeDeps)

    // Build graph (ONLY graph wiring)
    const graph = new StateGraph(StateAnnotation)
      .addNode('plan', planResponse)
      .addNode('model', callModel)
      .addNode('save', saveMessages)
      .addEdge(START, 'plan')
      .addEdge('plan', 'model')
      .addEdge('model', 'save')
      .addEdge('save', END)
      .compile({ checkpointer })

    return graph
  }
}
```

### **Node Types Definition**

Centralize shared types in `nodes/types.ts`:

```typescript
/**
 * Node dependencies injected by orchestrator service
 */
export interface NodeDependencies {
  configService: ConfigService
  vibeyRepository: VibeyRepository
  systemPromptService: SystemPromptService
  userStoreService: UserStoreService
  model: any
  logger: Logger
}

/**
 * Node state (subset of graph state)
 */
export interface NodeState {
  messages: any[]
  userId: string
  conversationId: string
  reasoning?: string | null
}

/**
 * Node return types
 */
export interface PlanNodeResult {
  reasoning: string
}

export interface SaveNodeResult {
  saved: boolean
  userMessageId?: string
  assistantMessageId?: string
}
```

### **Benefits of Node Extraction**

1. **Single Responsibility** - Each node = one file, one purpose
2. **Testable** - Test nodes independently with mocked dependencies
3. **Reusable** - Use nodes in multiple graphs
4. **Scalable** - Add nodes without bloating orchestrator
5. **Team-Friendly** - Multiple devs work on different nodes
6. **Clear Dependencies** - Each node imports only what it needs
7. **LangSmith Tracing** - Node names map directly to file names

### **When to Extract Nodes**

**Extract nodes when:**

- ✅ Service exceeds 400 LOC
- ✅ Node logic exceeds 100 LOC
- ✅ Need to reuse node in multiple graphs
- ✅ Need to test node logic independently
- ✅ Team working on different nodes in parallel

**Keep nodes inline when:**

- ❌ Node is <50 LOC and trivial
- ❌ Node is used only once and tightly coupled
- ❌ Service is <300 LOC total

### **Node File Size Guidelines**

| Node Complexity                   | Max LOC | Action                                |
| --------------------------------- | ------- | ------------------------------------- |
| Simple (status check, validation) | 50      | Keep inline                           |
| Medium (data transformation)      | 100     | Extract to node file                  |
| Complex (AI calls, multi-step)    | 150     | Extract + split into helper functions |

**For LangGraph streaming patterns, see `@.langgraph_guidelines.md`**

---

<!-- ============================================================================
   SECTION 9: ORCHESTRATION PATTERNS
   ============================================================================ -->

## 9. Orchestration Patterns

### **Pattern 1: Service Orchestration**

When a controller action requires multiple steps:

```typescript
// ✅ CORRECT - Service orchestrates multiple operations
@Injectable()
export class VibeyOrchestratorService {
  constructor(
    private userStore: UserStoreService,
    private promptsService: PromptsService,
    private toolsService: ToolsService,
  ) {}

  async processMessage(userId: string, message: string) {
    // 1. Load user memories
    const memories = await this.userStore.getAllMemories(userId)

    // 2. Build system prompt
    const systemPrompt = this.promptsService.buildPrompt(memories)

    // 3. Execute LangGraph workflow
    const response = await this.executeGraph(systemPrompt, message)

    // 4. Save response
    await this.saveConversation(userId, message, response)

    return response
  }
}
```

### **Pattern 2: Tool Pattern (Pure Functions)**

For reusable operations without state:

```typescript
// ✅ CORRECT - Pure tool functions
export const queryUserOffers = tool(
  async ({ searchTerm }, config) => {
    const supabase = config.context.supabase
    const userId = config.context.userId

    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('user_id', userId)
      .ilike('offer_name', `%${searchTerm}%`)

    return data
  },
  {
    name: 'query_user_offers',
    description: 'Search user offers',
    schema: z.object({ searchTerm: z.string() }),
  },
)
```

---

<!-- ============================================================================
   SECTION 10: AUTHENTICATION & AUTHORIZATION
   ============================================================================ -->

## 10. Authentication & Authorization

### **Guards (Not Middleware)**

- **NO middleware** - NestJS uses Guards instead
- **AuthGuard** applied at controller/method level
- **RLS enforced** via Supabase (no service role keys in runtime)

```typescript
// ✅ CORRECT - Guard on controller
@Controller('vibey/conversations')
@UseGuards(AuthGuard) // Applies to all routes
export class ConversationsController {
  @Get()
  async listConversations(@CurrentUser() user: any) {
    // user is authenticated
  }
}
```

### **Database Access (RLS-Only)**

- **NEVER use service role key** in API runtime
- **ALWAYS enforce RLS** via user-scoped Supabase client
- **Admins are users** with role flag in database

```typescript
// ✅ CORRECT - RLS enforced
const { user, supabase } = await getServerAuthRls()
const { data } = await supabase.from('conversations').select('*')
// RLS automatically filters by user_id

// ❌ WRONG - Bypassing RLS
const adminSupabase = createClient(url, serviceRoleKey)
const { data } = await adminSupabase.from('conversations').select('*')
```

---

<!-- ============================================================================
   SECTION 11: SHARED CODE (CROSS-SERVICE)
   ============================================================================ -->

## 11. Shared Code (Cross-Service)

### **lib/ Directory Structure**

For code used by multiple services:

```
apps/app-backend/src/lib/
├── services/          # Shared business logic (scraping, email)
├── repositories/      # Shared data access (common queries)
├── integrations/      # Shared external APIs (payment, analytics)
├── utils/             # Pure utility functions
├── types/             # Shared TypeScript types
├── constants/         # App-wide constants
└── guards/            # Shared authentication guards
```

**Rules:**

- If used by 2+ services → Move to `lib/`
- If service-specific → Keep in service module
- Maintain three-layer separation even in shared code
- Avoid circular dependencies

---

<!-- ============================================================================
   SECTION 12: STREAMING PATTERNS
   ============================================================================ -->

## 12. Streaming Patterns

### **Server-Sent Events (SSE)**

For real-time AI streaming:

```typescript
// ✅ CORRECT - SSE with proper headers
@Post('chat')
async streamChat(@Body() dto: ChatDto) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of orchestrator.processMessageStream()) {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**For detailed LangGraph streaming patterns, see `@.langgraph_guidelines.md`**

---

<!-- ============================================================================
   SECTION 13: TESTING STRATEGY
   ============================================================================ -->

## 13. Testing Strategy

### **Unit Tests (Services)**

- Test business logic in isolation
- Mock external dependencies
- Focus on edge cases

### **Integration Tests (Controllers + Services)**

- Test full request/response cycle
- Use test database
- Verify auth guards

### **E2E Tests (Full Flow)**

- Test complete user scenarios
- Real database (separate test DB)
- Real external services (or mocked)

---

<!-- ============================================================================
   SECTION 14: DEPLOYMENT ARCHITECTURE
   ============================================================================ -->

## 14. Deployment Architecture

### **Environment Separation**

```
Development:  localhost:3001 (hot reload)
Staging:      staging-api.Vibey.ai
Production:   api.Vibey.ai
```

### **Scaling Strategy**

- **Horizontal:** Multiple instances behind load balancer
- **Vertical:** Increase instance resources
- **Feature Extraction:** Move heavy features to microservices

---

<!-- ============================================================================
   SECTION 15: MONITORING & OBSERVABILITY
   ============================================================================ -->

## 15. Monitoring & Observability

### **Logging Levels**

- **Error:** Failures requiring action
- **Warn:** Potential issues
- **Info:** Important events
- **Debug:** Detailed troubleshooting

### **Metrics to Track**

- Request latency (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- External API response times
- Memory/CPU usage

---

<!-- ============================================================================
   SECTION 16: MIGRATION PHILOSOPHY
   ============================================================================ -->

## 16. Migration Philosophy

When migrating from Next.js to NestJS:

1. **Port, don't rewrite**
   - Keep business logic identical
   - Preserve function signatures
   - Match response formats

2. **Test at boundaries**
   - Verify API responses match
   - Check auth flows
   - Validate error handling

3. **Phased rollout**
   - Feature flags control routing
   - Monitor both systems
   - Gradual traffic shift

---

<!-- ============================================================================
   SECTION 17: CODE REVIEW CHECKLIST
   ============================================================================ -->

## 17. Code Review Checklist

Before merging any backend PR:

- [ ] File sizes under limits (controllers 200, services 600, repositories 400)
- [ ] Three-layer separation enforced:
  - [ ] Controllers ONLY call services
  - [ ] Services ONLY call repositories/integrations
  - [ ] Repositories/Integrations ONLY do data access
- [ ] Service isolation maintained (changes in one service don't affect others)
- [ ] No business logic in controllers or repositories
- [ ] Zod validation on all inputs
- [ ] Auth guards applied
- [ ] RLS enforced (no service role keys)
- [ ] Error logging implemented
- [ ] Types exported for consumers
- [ ] Tests written and passing (unit tests per layer)
- [ ] No circular dependencies

---

## 🎯 **Success Metrics**

Backend is well-architected when:

- ✅ New features take <1 day to add
- ✅ Changes isolated to single module
- ✅ Tests run in <30 seconds
- ✅ API latency <100ms p95
- ✅ Zero production errors from type issues
- ✅ Code review takes <15 minutes
- ✅ New developers onboard in <1 day

---

**For related patterns, see:**

- Frontend architecture: `.docs/guidelines/architecture/project-architecture.md`
- Frontend code patterns: `.docs/guidelines/development/code-guidelines.md`
- LangGraph streaming: `@.langgraph_guidelines.md`
- Feature development: `@.feature_guidelines.md`

**Remember:** Good backend architecture is **invisible**. It just works.
