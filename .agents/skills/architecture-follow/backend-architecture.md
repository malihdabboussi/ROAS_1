# Vibey Backend - Architecture & Design Principles

**NestJS Microservice Authority - Backend Patterns, Services, Three-Layer Architecture**

**Version 1.0 - NestJS Microservice Architecture**

---

## Table of Contents

**VISION & PRINCIPLES**

1. [Backend Vision](#1-backend-vision)
2. [Core Architecture Principles](#2-core-architecture-principles)

**THREE-LAYER ARCHITECTURE** 3. [Layer 1: Controllers (Request Handling)](#3-layer-1-controllers-request-handling) 4. [Layer 2: Services (Business Logic)](#4-layer-2-services-business-logic) 5. [Layer 3: Repositories/Integrations (Data Access)](#5-layer-3-repositoriesintegrations-data-access)

**CODE ORGANIZATION** 6. [DTOs & Types](#6-dtos--types) 7. [File Size Limits (Enforced)](#7-file-size-limits-enforced) 8. [LangGraph Node Organization](#8-langgraph-node-organization)

**PATTERNS & PRACTICES** 9. [Orchestration Patterns](#9-orchestration-patterns) 10. [Authentication & Authorization](#10-authentication--authorization) 11. [Shared Code (Cross-Service)](#11-shared-code-cross-service) 12. [Streaming Patterns](#12-streaming-patterns)

**DEPLOYMENT & QUALITY** 13. [Testing Strategy](#13-testing-strategy) 14. [Deployment Architecture](#14-deployment-architecture) 15. [Monitoring & Observability](#15-monitoring--observability) 16. [Migration Philosophy](#16-migration-philosophy) 17. [Code Review Checklist](#17-code-review-checklist)

---

## 1. Backend Vision

Build a dedicated NestJS backend that handles AI orchestration, real-time streaming, and complex business logic - decoupled from the Next.js frontend for **scalability, independent deployment, and performance**.

---

## 2. Core Architecture Principles

### **Service-Based Modules (Vertical Slices)**

Following **Service-Oriented Architecture**, organize by service (feature), not by technical role.

Each service contains its complete three-layer stack:

```
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
├── campaigns/                     # Campaigns Service
└── offers/                        # Offers Service
```

**Why Service-Based?**

- **Isolation:** Changes to Vibey service don't affect Auth service
- **Ownership:** Each service owns its complete stack (3 layers)
- **Scalability:** Can extract services to separate microservices
- **Testing:** Test services independently
- **Clear Boundaries:** Each service is a self-contained unit

---

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

### **Example**

```typescript
// CORRECT - Thin controller
@Controller('vibey/conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  async listConversations(@CurrentUser() user: any, @Supabase() supabase: SupabaseClient) {
    return this.conversationsService.listUserConversations(user.id, supabase)
  }
}
```

---

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

### **Example**

```typescript
// CORRECT - Service with business logic, calls repository
@Injectable()
export class ConversationsService {
  constructor(
    private conversationsRepository: ConversationsRepository,
    private userStore: UserStoreService,
  ) {}

  async listUserConversations(userId: string, supabase: SupabaseClient) {
    const hasAccess = await this.validateUserAccess(userId)
    if (!hasAccess) throw new ForbiddenException('Access denied')

    const conversations = await this.conversationsRepository.findByUserId(userId, supabase, {
      archived: false,
    })

    return {
      conversations: conversations.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
    }
  }
}
```

---

## 5. Layer 3: Repositories/Integrations (Data Access)

### **Purpose**

Manage specific logic for database operations and external service communications

### **Responsibilities**

- Database queries (Supabase, PostgreSQL)
- External API calls (OpenRouter, Firecrawl, etc.)
- Data mapping (database <-> domain objects)
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
@Injectable()
export class ConversationsRepository {
  async findByUserId(userId: string, supabase: SupabaseClient, filters?: { archived?: boolean }) {
    let query = supabase.from('conversations').select('*').eq('user_id', userId)

    if (filters?.archived !== undefined) {
      query = query.eq('is_archived', filters.archived)
    }

    const { data, error } = await query
    if (error) throw new Error(`Database error: ${error.message}`)
    return data
  }
}
```

### **Integration Example**

```typescript
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

## 6. DTOs & Types

### **DTOs (Data Transfer Objects)**

**Purpose:** Validate and type request/response data

```typescript
// DTO with Zod validation
export const CreateConversationDto = z.object({
  title: z.string().min(1).max(255).optional(),
  offer_id: z.string().uuid().optional(),
})

export type CreateConversationInput = z.infer<typeof CreateConversationDto>
```

### **Types (TypeScript Definitions)**

**Purpose:** Shared types, interfaces, enums

**Location:** `types/` inside each feature

```typescript
export interface VibeyOrchestratorState {
  messages: BaseMessage[]
  userId: string
  conversationId: string
  userMemories?: GroupedUserMemories
}

export type DetectedIntent = 'create_offer' | 'create_funnel' | 'general_chat'
```

---

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

---

## 8. LangGraph Node Organization

### **Node Extraction Pattern**

For services using LangGraph workflows, extract nodes into separate files when service exceeds 400 LOC.

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
│   └── save.node.ts                   # Database persistence node
```

### **Node File Structure**

```typescript
/**
 * [Node Name] Node
 *
 * Purpose:
 * - [Responsibility 1]
 * - [Responsibility 2]
 */

export async function planNode(
  state: NodeState,
  config: TypedLangGraphConfig,
  deps: NodeDependencies,
): Promise<PlanNodeResult> {
  const { logger } = deps

  logger.log(`[PlanNode] Starting...`)

  try {
    // Node logic here

    logger.log(`[PlanNode] Complete`)
    return {
      /* result */
    }
  } catch (error) {
    logger.error(`[PlanNode] Failed`, error)
    throw error
  }
}
```

### **When to Extract Nodes**

**Extract nodes when:**

- Service exceeds 400 LOC
- Node logic exceeds 100 LOC
- Need to reuse node in multiple graphs
- Need to test node logic independently

**Keep nodes inline when:**

- Node is <50 LOC and trivial
- Service is <300 LOC total

---

## 9. Orchestration Patterns

### **Service Orchestration**

```typescript
@Injectable()
export class VibeyOrchestratorService {
  constructor(
    private userStore: UserStoreService,
    private promptsService: PromptsService,
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

---

## 10. Authentication & Authorization

### **Guards (Not Middleware)**

- **NO middleware** - NestJS uses Guards instead
- **AuthGuard** applied at controller/method level
- **RLS enforced** via Supabase (no service role keys in runtime)

```typescript
@Controller('vibey/conversations')
@UseGuards(AuthGuard)
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

---

## 11. Shared Code (Cross-Service)

### **lib/ Directory Structure**

```
apps/app-backend/src/lib/
├── services/          # Shared business logic
├── repositories/      # Shared data access
├── integrations/      # Shared external APIs
├── utils/             # Pure utility functions
├── types/             # Shared TypeScript types
├── constants/         # App-wide constants
└── guards/            # Shared authentication guards
```

**Rules:**

- If used by 2+ services -> Move to `lib/`
- If service-specific -> Keep in service module
- Maintain three-layer separation even in shared code

---

## 12. Streaming Patterns

### **Server-Sent Events (SSE)**

```typescript
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

---

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

## 17. Code Review Checklist

Before merging any backend PR:

- [ ] File sizes under limits (controllers 200, services 600, repositories 400)
- [ ] Three-layer separation enforced:
  - [ ] Controllers ONLY call services
  - [ ] Services ONLY call repositories/integrations
  - [ ] Repositories/Integrations ONLY do data access
- [ ] Service isolation maintained
- [ ] No business logic in controllers or repositories
- [ ] Zod validation on all inputs
- [ ] Auth guards applied
- [ ] RLS enforced (no service role keys)
- [ ] Error logging implemented
- [ ] Types exported for consumers
- [ ] Tests written and passing
- [ ] No circular dependencies

---

## Success Metrics

Backend is well-architected when:

- New features take <1 day to add
- Changes isolated to single module
- Tests run in <30 seconds
- API latency <100ms p95
- Zero production errors from type issues
- Code review takes <15 minutes
- New developers onboard in <1 day
