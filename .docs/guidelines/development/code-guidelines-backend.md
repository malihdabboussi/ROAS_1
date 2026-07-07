# Vibey - Backend Code Guidelines (NestJS)

**Backend Development Patterns Authority - HOW to Code in NestJS Backend**

**Quick Reference for Backend Development**

---

## 📖 **Table of Contents**

**CRITICAL - READ FIRST** 0. [Context Gathering Protocol (MANDATORY)](#0-context-gathering-protocol-mandatory) ... Line ~50
0.5. [Code Replacement & Dead Code Removal (MANDATORY)](#05-code-replacement--dead-code-removal-mandatory) ... Line ~250

**ARCHITECTURE PATTERNS**

1. [NestJS 3-Layer Architecture](#1-nestjs-3-layer-architecture) .................. Line ~450
2. [Module Structure Standards](#2-module-structure-standards) .................... Line ~600
3. [Authentication Patterns (RLS-Only)](#3-authentication-patterns-rls-only) ..... Line ~750
4. [Dependency Injection Best Practices](#4-dependency-injection-best-practices) . Line ~900

**SECURITY & VALIDATION** 5. [Security Requirements (MANDATORY)](#5-security-requirements-mandatory) ........ Line ~1050 6. [Input Validation with Zod](#6-input-validation-with-zod) .................... Line ~1200 7. [Rate Limiting with Throttler](#7-rate-limiting-with-throttler) .............. Line ~1350 8. [Error Logging (MANDATORY)](#8-error-logging-mandatory) ....................... Line ~1500

**DATA & DATABASE** 9. [Database Operations (RLS-Enforced)](#9-database-operations-rls-enforced) ..... Line ~1650 10. [Service Layer Best Practices](#10-service-layer-best-practices) ............. Line ~1800

**COMMON PATTERNS** 11. [Controller Patterns](#11-controller-patterns) ............................... Line ~1950 12. [Error Handling Patterns](#12-error-handling-patterns) ....................... Line ~2100 13. [Testing Patterns](#13-testing-patterns) ..................................... Line ~2250 14. [Common Mistakes to Avoid](#14-common-mistakes-to-avoid) ..................... Line ~2400

---

<!-- ============================================================================
   SECTION 0: CONTEXT GATHERING PROTOCOL (MANDATORY)
   ============================================================================ -->

## 0. Context Gathering Protocol (MANDATORY)

### **CRITICAL RULE: READ ENTIRE FILES FOR CONTEXT**

**Context is EVERYTHING. Without complete context, you WILL make wrong decisions.**

### **The Problem**

- ❌ Reading 100 lines of a 400-line file = Incomplete understanding
- ❌ Reading 200 lines of a 1000-line file = Missing critical logic
- ❌ Skimming code = Wrong assumptions about data flow
- ❌ Quick fixes without context = Technical debt and bugs

### **The Solution: ALWAYS Read Complete Files**

**BEFORE making ANY code change:**

1. **Read the ENTIRE file you're modifying**
   - If the file is 400 lines, read all 400 lines
   - If the file is 1000 lines, read all 1000 lines
   - If the file is 2000 lines, read all 2000 lines
   - NO EXCEPTIONS

2. **Read ALL related files**
   - Controller → Service → Repository chain
   - DTOs and validation schemas
   - Module dependencies
   - Shared services used
   - Database entities/types

3. **Understand complete request flow**
   - Request → Guard → Pipe → Controller → Service → Repository → Database
   - Response transformation
   - Error handling chain
   - Logging points

### **File Size Guidelines**

| File Size       | Action                                                          | Rationale                                        |
| --------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| < 200 lines     | Read entire file                                                | Fast to read, essential for context              |
| 200-500 lines   | Read entire file                                                | Must understand full logic                       |
| 500-1000 lines  | Read entire file                                                | Cannot make informed decisions otherwise         |
| 1000-2000 lines | Read entire file                                                | Large files often have complex interdependencies |
| > 2000 lines    | Read entire file OR use `codebase_search` for specific sections | Very large files may need targeted search first  |

### **Context Gathering Checklist (MANDATORY)**

**Before EVERY code change, verify:**

- [ ] I have read the ENTIRE target file (100% of lines)
- [ ] I have read the complete Controller → Service → Repository chain
- [ ] I have read ALL DTOs and validation schemas used
- [ ] I have read the module configuration
- [ ] I understand the complete request flow (guards, pipes, interceptors)
- [ ] I have searched for all usages of methods I'm modifying
- [ ] I have checked the git history to understand why this code exists
- [ ] I can explain how my change fits into the complete system

**If ANY checkbox is unchecked → STOP. Gather context first.**

### **Examples of Proper Context Gathering**

#### **Example 1: Adding New Endpoint to Tags**

```
Task: Add PATCH /tags/:id endpoint

✅ CORRECT:
1. Read entire tags.controller.ts (100% of lines)
2. Read entire tags.service.ts (100% of lines)
3. Read tags.module.ts to understand dependencies
4. Read tag DTOs (CreateTagDto, UpdateTagDto)
5. Read AuthGuard and ThrottleGuard implementations
6. Check if other endpoints use similar patterns
7. Understand complete request flow
8. Implement endpoint following established patterns

❌ WRONG:
1. Copy POST endpoint code
2. Change method to PATCH
3. Hope it works
```

#### **Example 2: Modifying Service Method**

```
Task: Update tags.service.ts to add filtering

✅ CORRECT:
1. Read entire tags.service.ts file
2. Read tags.controller.ts (all methods calling this service)
3. Read LoggerService to understand error logging
4. Check database schema (contact_tags table)
5. Understand existing filter patterns from other services
6. Verify impact on all callers
7. Implement filtering without breaking consumers

❌ WRONG:
1. Read just the method being changed (20 lines)
2. Add filter parameter
3. Don't check if callers expect old behavior
```

### **Context = Correct Action**

```
No Context → Wrong assumptions → Quick fix → Technical debt → More bugs

Complete Context → Full understanding → Right fix → Clean code → Fewer bugs
```

---

<!-- ============================================================================
   SECTION 0.5: CODE REPLACEMENT & DEAD CODE REMOVAL (MANDATORY)
   ============================================================================ -->

## 0.5. Code Replacement & Dead Code Removal (MANDATORY)

### **CRITICAL RULE: Remove Old Code When Creating New**

**When you create NEW code that replaces OLD code, you MUST remove the old code in the SAME change.**

### **The Problem**

- ❌ Create new service method → Leave old method unused
- ❌ Refactor to new DTO → Leave old DTO in codebase
- ❌ Create new guard → Old guard file remains
- ❌ Extract utility → Duplicate logic stays
- ❌ Rename method → Old method still exported

### **The Solution: Mandatory Cleanup Protocol**

**BEFORE completing ANY refactor/extraction/new code:**

1. **Identify Replacement**
   - Am I creating something that replaces existing code?
   - Is this extracting logic from elsewhere?
   - Does this supersede an old pattern?

2. **Find ALL Old Code References**

   ```bash
   # Find all usages
   grep -r "oldMethodName" apps/app-backend/src/
   grep -r "OldService" apps/app-backend/src/
   grep -r "import.*old-file" apps/app-backend/src/
   ```

3. **Determine Removal Confidence**
   - **≥90% confident** it's safe to remove → Remove it
   - **<90% confident** → ASK USER first

4. **Execute Removal (Same Change)**
   - Update all references to new code
   - Delete old file(s)
   - Remove exports from module
   - Update all imports
   - Document removal in changelog

### **Confidence Threshold: 90%**

**If confidence ≥ 90%:**

```
✅ Proceed with removal
✅ List what you're removing
✅ Verify no broken references
```

**If confidence < 90%:**

```
❌ STOP and ASK USER:

"I've created [new code].

OLD CODE FOUND:
- [file/method/class path]
- Used in: [list locations]

CONFIDENCE: [X]% safe to remove
UNCERTAINTY: [specific concerns]

Should I remove the old code?"
```

### **Mandatory Removal Checklist**

**Before marking task complete:**

- [ ] Created something NEW that replaces OLD?
- [ ] Identified ALL old code to remove?
- [ ] Grepped for all usages of old code?
- [ ] Updated all references to new code?
- [ ] ≥90% confident old code is unused?
- [ ] If <90%, asked user for confirmation?
- [ ] Removed old files/code in this change?
- [ ] Removed old exports from modules?
- [ ] Changelog mentions removal?

**If ANY unchecked → STOP. Complete cleanup or ask user.**

---

<!-- ============================================================================
   SECTION 1: NESTJS 3-LAYER ARCHITECTURE
   ============================================================================ -->

## 1. NestJS 3-Layer Architecture

### **The Pattern: Controller → Service → Repository**

**NestJS enforces separation of concerns through a 3-layer architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│ CONTROLLER LAYER                                            │
│ - HTTP request handling                                     │
│ - Input validation (Pipes)                                  │
│ - Response transformation                                   │
│ - Guards (auth, throttle)                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ SERVICE LAYER (Business Logic)                              │
│ - Core business rules                                       │
│ - Data transformations                                      │
│ - Third-party API calls                                     │
│ - Error logging                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ REPOSITORY LAYER (Data Access)                              │
│ - Database queries (Supabase)                               │
│ - RLS-enforced operations                                   │
│ - Data persistence                                          │
└─────────────────────────────────────────────────────────────┘
```

### **Controller Responsibilities**

**ONLY handle HTTP concerns:**

```typescript
// ✅ CORRECT - Controller handles HTTP, delegates to service
@Controller('tags')
@UseGuards(AuthGuard, ThrottlerGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async getTags(@CurrentUser() user: any, @Supabase() supabase: SupabaseClient) {
    const tags = await this.tagsService.getTags(supabase, user.id)
    return { tags }
  }

  @Post()
  async createTag(
    @Body(new ZodValidationPipe(CreateTagDto)) dto: CreateTagDto,
    @CurrentUser() user: any,
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const tag = await this.tagsService.createTag(supabase, user.id, dto)
      return { tag }
    } catch (error) {
      if (error.message === 'Tag name already exists') {
        throw new HttpException('Tag name already exists', HttpStatus.CONFLICT)
      }
      throw new HttpException('Failed to create tag', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
```

```typescript
// ❌ WRONG - Business logic in controller
@Controller('tags')
export class TagsController {
  @Post()
  async createTag(@Body() dto: CreateTagDto, @Supabase() supabase: SupabaseClient) {
    // ❌ Database query in controller
    const { data: existing } = await supabase
      .from('contact_tags')
      .select('id')
      .eq('name', dto.name)
      .single()

    if (existing) {
      throw new HttpException('Tag exists', HttpStatus.CONFLICT)
    }

    // ❌ More database logic in controller
    const { data } = await supabase
      .from('contact_tags')
      .insert({ ...dto, user_id: user.id })
      .select()
      .single()

    return { tag: data }
  }
}
```

### **Service Responsibilities**

**Business logic and orchestration:**

```typescript
// ✅ CORRECT - Service contains business logic
@Injectable()
export class TagsService {
  constructor(private readonly logger: LoggerService) {}

  async createTag(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateTagDto,
  ): Promise<TagResponseDto> {
    // Business rule: Check duplicate
    const { data: existing } = await supabase
      .from('contact_tags')
      .select('id')
      .eq('name', dto.name)
      .single()

    if (existing) {
      throw new Error('Tag name already exists')
    }

    // Data persistence
    const { data, error } = await supabase
      .from('contact_tags')
      .insert({ user_id: userId, ...dto })
      .select()
      .single()

    if (error) {
      // Error logging
      await this.logger.error({
        app: 'app',
        severity: 'error',
        feature: 'tags/create',
        error_code: 'DB_ERROR',
        message: 'Failed to create tag',
        context: { db_error: error.message, userId, tag_data: dto },
      })
      throw new Error('Failed to create tag')
    }

    return data
  }
}
```

### **Repository Layer (Optional)**

**For complex data access patterns, extract to repository:**

```typescript
// Optional - For complex database operations
@Injectable()
export class TagsRepository {
  async findByName(supabase: SupabaseClient, name: string): Promise<TagEntity | null> {
    const { data } = await supabase.from('contact_tags').select('*').eq('name', name).single()

    return data
  }

  async create(supabase: SupabaseClient, userId: string, dto: CreateTagDto): Promise<TagEntity> {
    const { data, error } = await supabase
      .from('contact_tags')
      .insert({ user_id: userId, ...dto })
      .select()
      .single()

    if (error) throw error
    return data
  }
}
```

### **When to Use Repository Layer**

**Use Repository when:**

- Complex query logic (joins, aggregations)
- Multiple database calls for single operation
- Query reuse across multiple services
- Need to mock database for testing

**Skip Repository when:**

- Simple CRUD operations
- Single-table queries
- Direct Supabase client usage is clear

---

<!-- ============================================================================
   SECTION 2: MODULE STRUCTURE STANDARDS
   ============================================================================ -->

## 2. Module Structure Standards

### **Standard Feature Module Structure**

```
modules/tags/
├── controllers/
│   └── tags.controller.ts        # HTTP endpoints
├── services/
│   └── tags.service.ts            # Business logic
├── dtos/
│   ├── create-tag.dto.ts          # Input DTOs
│   ├── update-tag.dto.ts
│   └── tag-response.dto.ts        # Output DTOs
├── repositories/                   # Optional
│   └── tags.repository.ts
├── guards/                         # Optional - feature-specific guards
│   └── tag-ownership.guard.ts
├── tags.module.ts                  # Module definition
└── tests/
    ├── tags.controller.spec.ts
    ├── tags.service.spec.ts
    └── tags.e2e.spec.ts
```

### **Module Configuration**

```typescript
// ✅ CORRECT - Properly configured module
import { Module } from '@nestjs/common'
import { SharedModule } from '@/shared/shared.module'
import { TagsController } from './controllers/tags.controller'
import { TagsService } from './services/tags.service'

@Module({
  imports: [
    SharedModule, // Provides LoggerService, SupabaseModule, etc.
  ],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService], // Export if other modules need it
})
export class TagsModule {}
```

### **Register in AppModule**

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    SharedModule,
    VibeyModule, // Already migrated
    TagsModule, // ← Add new module here
    // ... other modules
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

### **Shared Module Pattern**

**SharedModule provides common services to all features:**

```typescript
// shared/shared.module.ts
@Module({
  imports: [SupabaseModule],
  providers: [
    LoggerService,
    UsageTrackerService,
    // ... other shared services
  ],
  exports: [LoggerService, UsageTrackerService, SupabaseModule],
})
export class SharedModule {}
```

**Import SharedModule in every feature module:**

- Provides LoggerService for error logging
- Provides SupabaseModule for database client factory
- Provides UsageTrackerService for AI usage tracking

---

<!-- ============================================================================
   SECTION 3: AUTHENTICATION PATTERNS (RLS-ONLY)
   ============================================================================ -->

## 3. Authentication Patterns (RLS-Only)

### **CRITICAL: RLS-Only Authentication**

We use **RLS-only** access. **Never use a service role key at runtime.** All database operations run under the authenticated user's session with RLS enforced.

### **Authentication Flow**

```
1. Frontend sends JWT in Authorization header
   ↓
2. AuthGuard validates JWT and extracts user
   ↓
3. Supabase client created with user's JWT (RLS enforced)
   ↓
4. Controller receives @CurrentUser() and @Supabase()
   ↓
5. Service executes queries under user's RLS context
```

### **Standard Authentication Pattern**

```typescript
// ✅ CORRECT - RLS-enforced authentication
@Controller('tags')
@UseGuards(AuthGuard, ThrottlerGuard) // Apply guards at controller level
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async getTags(
    @CurrentUser() user: any, // JWT validated, user extracted
    @Supabase() supabase: SupabaseClient, // Client created with user's JWT
  ) {
    // RLS is enforced - user can only see their own tags
    const tags = await this.tagsService.getTags(supabase, user.id)
    return { tags }
  }
}
```

### **AuthGuard Implementation**

```typescript
// shared/guards/auth.guard.ts
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    // Extract JWT from Authorization header
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header')
    }

    const token = authHeader.substring(7)

    // Validate JWT with Supabase
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      throw new UnauthorizedException('Invalid token')
    }

    // Attach user to request
    request.user = user

    // Create RLS-enforced Supabase client with user's token
    request.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    return true
  }
}
```

### **Custom Decorators**

```typescript
// shared/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request.user
})

// shared/decorators/supabase.decorator.ts
export const Supabase = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request.supabase
})
```

### **Admin Role Check (Optional)**

```typescript
// shared/guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const supabase = request.supabase

    if (!user || !supabase) {
      throw new UnauthorizedException('User not authenticated')
    }

    // Check admin role flag in database (RLS still enforced)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new ForbiddenException('Admin access required')
    }

    return true
  }
}

// Usage
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  // Only admins can access
}
```

### **❌ What NOT to Do**

```typescript
// ❌ NEVER bypass RLS with service role key
const adminSupabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Bypasses RLS
)

// ❌ NEVER skip authentication
@Controller('tags')
export class TagsController {
  @Get()
  async getTags() {
    // No @UseGuards(AuthGuard)
    // No @CurrentUser()
    // Anyone can call this!
  }
}

// ❌ NEVER trust client-provided user ID
@Post()
async createTag(@Body() dto: { userId: string, name: string }) {
  // Client can send any userId!
  await supabase.from('tags').insert({ user_id: dto.userId, ... })
}
```

### **Authentication Checklist**

Before deploying any controller:

- [ ] `@UseGuards(AuthGuard)` applied to controller or method
- [ ] `@CurrentUser()` decorator used to get authenticated user
- [ ] `@Supabase()` decorator used to get RLS-enforced client
- [ ] User ID from `@CurrentUser()`, never from request body
- [ ] No service role key used at runtime
- [ ] Admin checks use database role flag (not hardcoded)

---

<!-- ============================================================================
   SECTION 4: DEPENDENCY INJECTION BEST PRACTICES
   ============================================================================ -->

## 4. Dependency Injection Best Practices

### **Constructor Injection Pattern**

```typescript
// ✅ CORRECT - Dependencies injected via constructor
@Injectable()
export class TagsService {
  constructor(
    private readonly logger: LoggerService,
    private readonly usageTracker: UsageTrackerService,
  ) {}

  async createTag(...) {
    // Use injected services
    await this.logger.error({ ... })
    await this.usageTracker.trackUsage(...)
  }
}
```

```typescript
// ❌ WRONG - Direct import without injection
import { LoggerService } from '@/shared/services/logger.service'

@Injectable()
export class TagsService {
  async createTag(...) {
    // ❌ Creating instance manually
    const logger = new LoggerService()
    await logger.error({ ... })
  }
}
```

### **Dependency Scopes**

**Singleton (Default) - Most Common:**

```typescript
@Injectable()
export class TagsService {
  // Single instance shared across entire app
}
```

**Request-Scoped - When Needed:**

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  // New instance per HTTP request
  // Useful for request-specific data
}
```

**Transient - Rarely Used:**

```typescript
@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {
  // New instance every time it's injected
}
```

### **Circular Dependency Resolution**

```typescript
// ✅ Use forwardRef() for circular dependencies
@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => TagsService))
    private readonly tagsService: TagsService,
  ) {}
}

@Injectable()
export class TagsService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}
}
```

**Better: Refactor to eliminate circular dependency**

```typescript
// ✅ Extract shared logic to third service
@Injectable()
export class SharedLogicService {
  // Logic used by both UserService and TagsService
}

@Injectable()
export class UserService {
  constructor(private readonly shared: SharedLogicService) {}
}

@Injectable()
export class TagsService {
  constructor(private readonly shared: SharedLogicService) {}
}
```

### **Conditional Providers**

```typescript
// Provide different implementations based on environment
{
  provide: 'CACHE_SERVICE',
  useClass: process.env.NODE_ENV === 'production'
    ? RedisCacheService
    : InMemoryCacheService,
}
```

---

<!-- ============================================================================
   SECTION 5: SECURITY REQUIREMENTS (MANDATORY)
   ============================================================================ -->

## 5. Security Requirements (MANDATORY)

### **Input Validation (CRITICAL)**

**NEVER** accept raw user input without Zod validation.

```typescript
// ✅ REQUIRED PATTERN - Zod validation in pipe
import { z } from 'zod'

// Define schema
export const CreateTagDto = z.object({
  name: z.string().min(1).max(50),
  color: z.string().min(1).max(20),
})

export type CreateTagDto = z.infer<typeof CreateTagDto>

// Use in controller with ZodValidationPipe
@Post()
async createTag(
  @Body(new ZodValidationPipe(CreateTagDto)) dto: CreateTagDto,
  @CurrentUser() user: any,
  @Supabase() supabase: SupabaseClient
) {
  // dto is validated and type-safe
  return await this.tagsService.createTag(supabase, user.id, dto)
}
```

### **ZodValidationPipe Implementation**

```typescript
// shared/pipes/zod-validation.pipe.ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import { ZodSchema } from 'zod'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value)
    } catch (error) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.errors,
      })
    }
  }
}
```

### **Rate Limiting (REQUIRED)**

**ALL** controllers must implement rate limiting:

```typescript
// ✅ Controller-level rate limiting
@Controller('tags')
@UseGuards(AuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
export class TagsController {
  // All endpoints inherit rate limit
}

// ✅ Endpoint-specific rate limiting
@Controller('offers')
@UseGuards(AuthGuard, ThrottlerGuard)
export class OffersController {
  @Get()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async list() { ... }

  @Post('generate')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Stricter for AI endpoints
  async generate() { ... }
}
```

### **ThrottlerGuard Configuration**

```typescript
// app.module.ts
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: 10, // 10 requests for AI endpoints
      },
    ]),
  ],
})
export class AppModule {}
```

### **Environment Variables Security**

```typescript
// ✅ CORRECT - Server-side only secrets
const API_KEY = process.env.OPENROUTER_API_KEY // No public prefix

// ❌ NEVER expose secrets
const API_KEY = process.env.PUBLIC_API_KEY // Would be exposed to frontend
```

### **Error Response Sanitization**

```typescript
// ✅ CORRECT - Sanitized error responses
@Post()
async createTag(@Body(new ZodValidationPipe(CreateTagDto)) dto: CreateTagDto) {
  try {
    return await this.tagsService.createTag(...)
  } catch (error) {
    console.error('Service error:', error) // ✅ Log full error server-side

    // ✅ Return generic message to client
    throw new HttpException(
      'Failed to create tag',
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }
}

// ❌ WRONG - Information disclosure
@Post()
async createTag(...) {
  try {
    return await this.tagsService.createTag(...)
  } catch (error) {
    // ❌ Exposes internal error details
    throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
```

### **CORS Configuration**

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // ✅ Explicit CORS configuration
  app.enableCors({
    origin: [
      'https://app.Vibey.io',
      'https://Vibey.io',
      'http://localhost:3000', // Development only
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  await app.listen(3001)
}
```

### **Public HTTP surface (allowlist at the Express edge)**

The API is not a generic web server. The real surface is **`/api` + `setGlobalPrefix('api')`** plus a **small, explicit** set of root static files (whatever lives in `apps/api/public/` and must be reachable without the `/api` prefix).

Public hosts are scanned constantly: `/.env`, `/.env.local`, `/.git/config`, WordPress paths (`/wp-login.php`, `/xmlrpc.php`), framework probes (`/_next/static/...`, `/actuator/env`, `/.vercel/...`), and similar. Those requests must **not** enter the Nest pipeline as “unhandled” work — that wastes serverless invocations and floods observability with **`unhandled_error` / 500**-style noise even though nothing is wrong with your app.

**Required pattern (vibey-v2-api):** Mount Express middleware **first** on the shared Express instance (before JSON/urlencoded body parsers and before Nest), and **continue** only when the request path is allowed; otherwise **`res.status(404).end()`** and stop.

**Allow:**

- **`/api`** and **`/api/*`** (the Nest global prefix and every route under it)
- **Known root static paths** that you intentionally expose (examples: `/favicon.ico`, `/favicon.png`, `/capture.js`) — keep this list aligned with files under `apps/api/public/`

**Deny:** Everything else → **404**, empty body, **no Nest**, no global exception filter for that request.

**Maintenance:** When you add a new file under `public/` that must be served **outside** `/api/*`, add its URL path to the allowlist in `apps/api/src/middleware/external-surface.middleware.ts` and keep **`apps/api/src/main.ts`** and **`apps/api/api/index.ts`** consistent (both attach the same middleware on the same Express `server`).

**Platform layer (optional):** Vercel Firewall / managed rules / IP reputation can drop scanner traffic before it reaches the function; the allowlist is still the in-app guarantee.

### **Security Checklist (MANDATORY for all endpoints)**

Before deploying any endpoint:

- [ ] Zod schema validation with `ZodValidationPipe`
- [ ] `@UseGuards(AuthGuard)` applied
- [ ] `@UseGuards(ThrottlerGuard)` applied
- [ ] Rate limit configured (default or custom)
- [ ] Error responses sanitized (no internal details)
- [ ] No sensitive data in logs sent to client
- [ ] CORS headers configured correctly
- [ ] Input sanitization for user-generated content
- [ ] File upload validation (if applicable)
- [ ] **Public HTTP surface:** Express allowlist middleware rejects non-`/api` junk paths with **404** (see **Public HTTP surface** above) for APIs that use a custom Express adapter + Vercel entry

---

<!-- ============================================================================
   SECTION 6: INPUT VALIDATION WITH ZOD
   ============================================================================ -->

## 6. Input Validation with Zod

### **DTO Definition Pattern**

```typescript
// dtos/create-tag.dto.ts
import { z } from 'zod'

// Define Zod schema
export const CreateTagDto = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less').trim(),

  color: z
    .string()
    .min(1, 'Color is required')
    .max(20, 'Color must be 20 characters or less')
    .regex(/^[a-z-]+$/, 'Color must be lowercase with hyphens only'),
})

// Export TypeScript type
export type CreateTagDto = z.infer<typeof CreateTagDto>

// Optional: Export with custom error messages
export const CreateTagDtoWithMessages = CreateTagDto.refine(
  (data) => data.name.toLowerCase() !== 'admin',
  {
    message: 'Name "admin" is reserved',
    path: ['name'],
  },
)
```

### **Complex Validation Patterns**

**Nested Objects:**

```typescript
export const CreateCampaignDto = z.object({
  name: z.string().min(1).max(100),
  settings: z.object({
    autoPublish: z.boolean(),
    scheduleDate: z.string().datetime().optional(),
    targetAudience: z.enum(['all', 'segment', 'custom']),
  }),
  funnels: z
    .array(
      z.object({
        funnelId: z.string().uuid(),
        order: z.number().int().positive(),
      }),
    )
    .min(1, 'At least one funnel required'),
})
```

**Conditional Validation:**

```typescript
export const UpdateUserDto = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password) {
        return data.password === data.confirmPassword
      }
      return true
    },
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    },
  )
```

**Array Validation:**

```typescript
export const BulkCreateTagsDto = z.object({
  tags: z
    .array(CreateTagDto)
    .min(1, 'At least one tag required')
    .max(50, 'Maximum 50 tags allowed'),
})
```

### **Query Parameter Validation**

```typescript
// dtos/list-tags-query.dto.ts
export const ListTagsQueryDto = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'created_at']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// Controller usage
@Get()
async getTags(
  @Query(new ZodValidationPipe(ListTagsQueryDto)) query: z.infer<typeof ListTagsQueryDto>,
  @CurrentUser() user: any,
  @Supabase() supabase: SupabaseClient
) {
  return await this.tagsService.getTags(supabase, user.id, query)
}
```

### **Path Parameter Validation**

```typescript
// dtos/tag-id-param.dto.ts
export const TagIdParamDto = z.object({
  id: z.string().uuid('Invalid tag ID format'),
})

// Controller usage
@Get(':id')
async getTag(
  @Param(new ZodValidationPipe(TagIdParamDto)) params: z.infer<typeof TagIdParamDto>,
  @CurrentUser() user: any,
  @Supabase() supabase: SupabaseClient
) {
  return await this.tagsService.getTagById(supabase, user.id, params.id)
}
```

### **File Upload Validation**

```typescript
// dtos/upload-file.dto.ts
export const UploadFileDto = z.object({
  file: z.custom<Express.Multer.File>(),
  category: z.enum(['image', 'document', 'video']).optional(),
}).refine(
  (data) => {
    const file = data.file
    const maxSize = 10 * 1024 * 1024 // 10MB
    return file.size <= maxSize
  },
  {
    message: 'File size must be 10MB or less',
    path: ['file'],
  }
)

// Controller usage
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @UploadedFile() file: Express.Multer.File,
  @Body(new ZodValidationPipe(UploadFileDto.omit({ file: true }))) dto: any,
  @CurrentUser() user: any
) {
  const validation = UploadFileDto.safeParse({ file, ...dto })
  if (!validation.success) {
    throw new BadRequestException(validation.error.errors)
  }

  return await this.mediaService.uploadFile(user.id, file, dto.category)
}
```

### **Validation Error Handling**

```typescript
// Custom exception filter for validation errors
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const exceptionResponse = exception.getResponse() as any

    response.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      errors: exceptionResponse.errors || exceptionResponse.message,
      timestamp: new Date().toISOString(),
    })
  }
}

// Apply globally
app.useGlobalFilters(new ValidationExceptionFilter())
```

---

<!-- ============================================================================
   SECTION 7: RATE LIMITING WITH THROTTLER
   ============================================================================ -->

## 7. Rate Limiting with Throttler

### **Global Rate Limiting Configuration**

```typescript
// app.module.ts
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: 10, // For AI/expensive endpoints
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 5, // For auth endpoints
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Apply globally
    },
  ],
})
export class AppModule {}
```

### **Controller-Level Rate Limiting**

```typescript
// ✅ Apply to all endpoints in controller
@Controller('tags')
@UseGuards(AuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 100, ttl: 60000 } })
export class TagsController {
  // All methods inherit this rate limit
}
```

### **Endpoint-Level Rate Limiting**

```typescript
// ✅ Different limits for different endpoints
@Controller('offers')
@UseGuards(AuthGuard, ThrottlerGuard)
export class OffersController {
  @Get()
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // Standard limit
  async list() { ... }

  @Post('generate')
  @Throttle({ strict: { limit: 10, ttl: 60000 } }) // Strict limit for AI
  async generate() { ... }

  @Post('upload')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // Moderate limit for uploads
  async upload() { ... }
}
```

### **Skip Rate Limiting for Specific Endpoints**

```typescript
@Controller('webhooks')
export class WebhooksController {
  @Post('stripe')
  @SkipThrottle() // No rate limiting for webhooks
  async handleStripe() { ... }
}
```

### **Custom Throttler Strategy (Redis-Based)**

```typescript
// shared/throttler/redis-throttler.strategy.ts
import { Injectable } from '@nestjs/common'
import { ThrottlerStorage } from '@nestjs/throttler'
import { Redis } from 'ioredis'

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private redis: Redis

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    })
  }

  async increment(key: string, ttl: number): Promise<number> {
    const count = await this.redis.incr(key)
    if (count === 1) {
      await this.redis.expire(key, Math.floor(ttl / 1000))
    }
    return count
  }
}

// Register in module
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
      storage: new RedisThrottlerStorage(),
    }),
  ],
})
export class AppModule {}
```

### **Rate Limit by User ID**

```typescript
// Custom throttler guard that limits per user
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user ID instead of IP for rate limiting
    return req.user?.id || req.ip
  }
}

// Usage
@Controller('offers')
@UseGuards(AuthGuard, UserThrottlerGuard)
export class OffersController {
  // Rate limited per user, not per IP
}
```

### **Rate Limit Response Headers**

```typescript
// Automatically added by ThrottlerGuard
// X-RateLimit-Limit: 100
// X-RateLimit-Remaining: 99
// X-RateLimit-Reset: 1640000000
```

### **Custom Rate Limit Error Response**

```typescript
// shared/filters/throttler-exception.filter.ts
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()

    response.status(429).json({
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
      retryAfter: 60, // seconds
      timestamp: new Date().toISOString(),
    })
  }
}

// Apply globally
app.useGlobalFilters(new ThrottlerExceptionFilter())
```

### **Rate Limiting Checklist**

Before deploying any controller:

- [ ] `@UseGuards(ThrottlerGuard)` applied
- [ ] Appropriate rate limit configured (default/strict/auth)
- [ ] Custom limits for expensive operations (AI, uploads)
- [ ] Redis-based storage configured for distributed systems
- [ ] Rate limit error responses are user-friendly
- [ ] Webhooks excluded from rate limiting (if applicable)

---

<!-- ============================================================================
   SECTION 8: ERROR LOGGING (MANDATORY)
   ============================================================================ -->

## 8. Error Logging (MANDATORY)

### **Every Service Must Log Errors**

**CRITICAL REQUIREMENT:** All services must log authentication failures, validation errors, and business logic errors consistently.

### **LoggerService Pattern**

```typescript
// ✅ MANDATORY - Inject LoggerService in every service
@Injectable()
export class TagsService {
  constructor(private readonly logger: LoggerService) {}

  async createTag(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateTagDto,
  ): Promise<TagResponseDto> {
    try {
      // Business logic
      const { data, error } = await supabase
        .from('contact_tags')
        .insert({ user_id: userId, ...dto })
        .select()
        .single()

      if (error) {
        // Log database error
        await this.logger.error({
          app: 'app',
          severity: 'error',
          feature: 'tags/create',
          error_code: 'DB_ERROR',
          message: 'Failed to create tag in database',
          context: {
            db_error: error.message,
            userId,
            tag_data: dto,
          },
        })
        throw new Error('Failed to create tag')
      }

      return data
    } catch (error) {
      // Log unhandled errors
      await this.logger.error({
        app: 'app',
        severity: 'critical',
        feature: 'tags/create',
        error_code: 'UNHANDLED_ERROR',
        message: 'Unhandled error in tag creation',
        context: {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId,
        },
      })
      throw error
    }
  }
}
```

### **Error Logging Parameters**

| Parameter    | Required | Description                | Example Values                                                               |
| ------------ | -------- | -------------------------- | ---------------------------------------------------------------------------- |
| `app`        | ✅       | Application identifier     | `'app'`, `'admin'`, `'backend'`                                              |
| `severity`   | ✅       | Error severity level       | `'error'`, `'warning'`, `'critical'`                                         |
| `feature`    | ✅       | Feature/module identifier  | `'tags/create'`, `'offers/generate'`, `'campaigns/publish'`                  |
| `error_code` | ✅       | Specific error type        | `'AUTH_FAILED'`, `'VALIDATION_FAILED'`, `'DB_ERROR'`, `'EXTERNAL_API_ERROR'` |
| `message`    | ✅       | Human-readable description | `'Failed to create tag in database'`                                         |
| `context`    | ❌       | Additional error details   | `{ db_error: '...', userId: '...', request_data: {...} }`                    |

### **Error Code Standards**

**Authentication Errors:**

- `AUTH_FAILED` - JWT validation failed
- `INSUFFICIENT_PERMISSIONS` - User lacks required role
- `SESSION_EXPIRED` - Token expired

**Validation Errors:**

- `VALIDATION_FAILED` - Request validation failed
- `INVALID_PARAMETERS` - Invalid path/query parameters
- `MISSING_REQUIRED_FIELDS` - Required fields missing

**Business Logic Errors:**

- `DB_ERROR` - Database operation failed
- `EXTERNAL_API_ERROR` - Third-party API call failed
- `RATE_LIMIT_EXCEEDED` - Rate limit reached
- `UNHANDLED_ERROR` - Unexpected application error

### **Controller Error Handling**

```typescript
// ✅ CORRECT - Controller catches and transforms service errors
@Controller('tags')
@UseGuards(AuthGuard, ThrottlerGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  async createTag(
    @Body(new ZodValidationPipe(CreateTagDto)) dto: CreateTagDto,
    @CurrentUser() user: any,
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const tag = await this.tagsService.createTag(supabase, user.id, dto)
      return { tag }
    } catch (error) {
      // Service already logged the error
      // Controller transforms to HTTP exception
      if (error.message === 'Tag name already exists') {
        throw new HttpException('Tag name already exists', HttpStatus.CONFLICT)
      }
      throw new HttpException('Failed to create tag', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
```

### **Global Exception Filter**

```typescript
// shared/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      message = exception.message
    }

    // Log unhandled exceptions
    if (status === 500) {
      this.logger.error({
        app: 'backend',
        severity: 'critical',
        feature: 'global/unhandled',
        error_code: 'UNHANDLED_EXCEPTION',
        message: 'Unhandled exception in request',
        context: {
          path: request.url,
          method: request.method,
          error: exception instanceof Error ? exception.message : 'Unknown',
          stack: exception instanceof Error ? exception.stack : undefined,
        },
      })
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}

// Apply globally
app.useGlobalFilters(new GlobalExceptionFilter(loggerService))
```

### **HttpException identity (duplicate `@nestjs/common` / Vercel)**

`GlobalExceptionFilter` in **`@vibey/api-shared`** must treat Nest HTTP errors correctly even when **`instanceof HttpException` is false** — for example if more than one copy of `@nestjs/common` is bundled and the thrown `NotFoundException` is not the same class as the filter’s imported `HttpException`.

**Pattern:** Duck-type HTTP exceptions: if the thrown value is an object with **`getStatus`** and **`getResponse`** functions (same contract as `HttpException`), handle it like `HttpException` (return the right status and body, **do not** log as `unhandled_error` / 500). This keeps normal **404** paths from appearing as application failures in logs.

### **LoggerService Implementation**

```typescript
// shared/services/logger.service.ts
@Injectable()
export class LoggerService {
  async error(params: {
    app: string
    severity: 'error' | 'warning' | 'critical'
    feature: string
    error_code: string
    message: string
    context?: Record<string, any>
  }): Promise<void> {
    console.error(
      `[${params.severity.toUpperCase()}] ${params.feature}/${params.error_code}: ${params.message}`,
      params.context || {},
    )
  }

  async info(message: string, context?: Record<string, any>): Promise<void> {
    console.log('[INFO]', message, context)
  }

  async warn(message: string, context?: Record<string, any>): Promise<void> {
    console.warn('[WARN]', message, context)
  }
}
```

### **Error Logging Checklist**

Before deploying any service:

- [ ] LoggerService injected via constructor
- [ ] Database errors logged with `DB_ERROR` code
- [ ] External API errors logged with `EXTERNAL_API_ERROR` code
- [ ] Meaningful `feature` identifier (e.g., `'tags/create'`)
- [ ] Error context includes relevant debugging info
- [ ] Controllers transform service errors to HTTP exceptions
- [ ] Global exception filter catches unhandled errors
- [ ] Global exception filter recognizes **`HttpException` by contract** (`getStatus` / `getResponse`) where `instanceof` may fail (see **HttpException identity**)
- [ ] Errors are visible in your current backend logging pipeline

---

<!-- ============================================================================
   SECTION 9: DATABASE OPERATIONS (RLS-ENFORCED)
   ============================================================================ -->

## 9. Database Operations (RLS-Enforced)

### **Always Use RLS-Enforced Client**

```typescript
// ✅ CORRECT - RLS-enforced queries
@Injectable()
export class TagsService {
  async getTags(
    supabase: SupabaseClient, // Client created with user's JWT
    userId: string,
  ): Promise<TagResponseDto[]> {
    // RLS ensures user only sees their own tags
    const { data, error } = await supabase
      .from('contact_tags')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error('Failed to fetch tags')
    return data || []
  }
}
```

```typescript
// ❌ WRONG - Service role key bypasses RLS
@Injectable()
export class TagsService {
  private adminClient: SupabaseClient

  constructor() {
    this.adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Bypasses RLS
    )
  }

  async getTags(userId: string) {
    // ❌ Bypasses RLS - can see all users' tags
    const { data } = await this.adminClient.from('contact_tags').select('*').eq('user_id', userId) // Manual filtering instead of RLS

    return data
  }
}
```

### **Query Patterns**

**Select with RLS:**

```typescript
// Automatically filtered by RLS to current user's data
const { data, error } = await supabase
  .from('contact_tags')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20)
```

**Insert with RLS:**

```typescript
// user_id required by RLS policy
const { data, error } = await supabase
  .from('contact_tags')
  .insert({
    user_id: userId, // Must match authenticated user
    name: dto.name,
    color: dto.color,
  })
  .select()
  .single()
```

**Update with RLS:**

```typescript
// RLS ensures user can only update their own tags
const { data, error } = await supabase
  .from('contact_tags')
  .update({ name: dto.name, color: dto.color })
  .eq('id', tagId) // RLS verifies ownership
  .select()
  .single()
```

**Delete with RLS:**

```typescript
// RLS ensures user can only delete their own tags
const { error } = await supabase.from('contact_tags').delete().eq('id', tagId) // RLS verifies ownership
```

### **Complex Queries with Joins**

```typescript
// RLS enforced on all joined tables
const { data, error } = await supabase
  .from('funnels')
  .select(
    `
    *,
    funnel_pages (
      id,
      title,
      slug,
      funnel_page_content_blocks (
        id,
        type,
        content
      )
    )
  `,
  )
  .eq('id', funnelId)
  .single()

// RLS policies on funnels, funnel_pages, and funnel_page_content_blocks
// all apply automatically
```

### **Transactions (Not Supported by Supabase REST API)**

```typescript
// ❌ Supabase REST API doesn't support transactions
// Use PostgreSQL functions instead

// Create PostgreSQL function
CREATE OR REPLACE FUNCTION create_funnel_with_pages(
  p_user_id uuid,
  p_funnel_data jsonb,
  p_pages_data jsonb[]
) RETURNS jsonb AS $$
DECLARE
  v_funnel_id uuid;
  v_result jsonb;
BEGIN
  -- Insert funnel
  INSERT INTO funnels (user_id, title, description)
  VALUES (p_user_id, p_funnel_data->>'title', p_funnel_data->>'description')
  RETURNING id INTO v_funnel_id;

  -- Insert pages
  INSERT INTO funnel_pages (funnel_id, title, slug, template)
  SELECT v_funnel_id, page->>'title', page->>'slug', page->>'template'
  FROM unnest(p_pages_data) AS page;

  -- Return result
  SELECT jsonb_build_object('funnel_id', v_funnel_id) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

// Call from service
const { data, error } = await supabase
  .rpc('create_funnel_with_pages', {
    p_user_id: userId,
    p_funnel_data: { title: '...', description: '...' },
    p_pages_data: [{ title: '...', slug: '...', template: '...' }]
  })
```

### **Error Handling**

```typescript
// ✅ Always check for errors
const { data, error } = await supabase.from('contact_tags').select('*')

if (error) {
  await this.logger.error({
    app: 'app',
    severity: 'error',
    feature: 'tags/list',
    error_code: 'DB_ERROR',
    message: 'Failed to fetch tags',
    context: {
      db_error: error.message,
      db_code: error.code,
      userId,
    },
  })
  throw new Error('Failed to fetch tags')
}

return data || []
```

### **Database Operation Checklist**

Before deploying any database operation:

- [ ] Using RLS-enforced client (from `@Supabase()` decorator)
- [ ] Not using service role key at runtime
- [ ] `user_id` always from `@CurrentUser()`, never from request body
- [ ] Error handling implemented (check `error` property)
- [ ] Errors logged with context
- [ ] RLS policies verified in database
- [ ] Test that users can't access other users' data

---

<!-- ============================================================================
   SECTION 10: SERVICE LAYER BEST PRACTICES
   ============================================================================ -->

## 10. Service Layer Best Practices

### **Single Responsibility Principle**

```typescript
// ✅ CORRECT - Service focuses on one domain
@Injectable()
export class TagsService {
  constructor(private readonly logger: LoggerService) {}

  async getTags(...) { ... }
  async createTag(...) { ... }
  async updateTag(...) { ... }
  async deleteTag(...) { ... }
}

// ❌ WRONG - Service handles multiple domains
@Injectable()
export class AppService {
  async getTags(...) { ... }
  async getOffers(...) { ... }
  async getCampaigns(...) { ... }
  // Too many responsibilities
}
```

### **Dependency Injection Pattern**

```typescript
// ✅ CORRECT - Dependencies injected
@Injectable()
export class OffersService {
  constructor(
    private readonly logger: LoggerService,
    private readonly openrouter: OpenRouterService,
    private readonly usageTracker: UsageTrackerService,
  ) {}

  async generateOffer(...) {
    await this.openrouter.complete(...)
    await this.usageTracker.track(...)
    await this.logger.info('Offer generated')
  }
}

// ❌ WRONG - Direct imports
@Injectable()
export class OffersService {
  async generateOffer(...) {
    const openrouter = new OpenRouterService() // ❌ Manual instantiation
    await openrouter.complete(...)
  }
}
```

### **Method Naming Conventions**

```typescript
@Injectable()
export class TagsService {
  // ✅ Verb + noun pattern
  async getTags(...) { ... }           // Fetch multiple
  async getTagById(...) { ... }        // Fetch single
  async createTag(...) { ... }         // Create
  async updateTag(...) { ... }         // Update
  async deleteTag(...) { ... }         // Delete
  async validateTagName(...) { ... }   // Validation
  async findTagsByColor(...) { ... }   // Search/filter
}
```

### **Return Type Patterns**

```typescript
// ✅ Return typed DTOs
async createTag(...): Promise<TagResponseDto> {
  const { data } = await supabase.from('contact_tags').insert(...).select().single()
  return data // Type-safe
}

// ✅ Return arrays for lists
async getTags(...): Promise<TagResponseDto[]> {
  const { data } = await supabase.from('contact_tags').select('*')
  return data || []
}

// ✅ Return null for not found
async getTagById(...): Promise<TagResponseDto | null> {
  const { data } = await supabase.from('contact_tags').select('*').eq('id', id).single()
  return data || null
}

// ❌ Don't return { data, error } tuples
async getTags(...): Promise<{ data: any[], error: any }> {
  return await supabase.from('contact_tags').select('*')
}
```

### **Error Handling in Services**

```typescript
// ✅ CORRECT - Throw meaningful errors
@Injectable()
export class TagsService {
  async createTag(...): Promise<TagResponseDto> {
    // Check business rules
    const existing = await this.findByName(supabase, dto.name)
    if (existing) {
      throw new Error('Tag name already exists') // Specific error
    }

    // Database operation
    const { data, error } = await supabase.from('contact_tags').insert(...).select().single()

    if (error) {
      await this.logger.error({ ... })
      throw new Error('Failed to create tag') // Generic error for client
    }

    return data
  }
}

// Controller transforms to HTTP exceptions
@Post()
async createTag(...) {
  try {
    const tag = await this.tagsService.createTag(...)
    return { tag }
  } catch (error) {
    if (error.message === 'Tag name already exists') {
      throw new HttpException('Tag name already exists', HttpStatus.CONFLICT)
    }
    throw new HttpException('Failed to create tag', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
```

### **Private Helper Methods**

```typescript
@Injectable()
export class TagsService {
  // Public API
  async createTag(...): Promise<TagResponseDto> {
    await this.validateTagName(dto.name)
    return await this.insertTag(supabase, userId, dto)
  }

  // Private helpers
  private async validateTagName(name: string): Promise<void> {
    if (name.toLowerCase() === 'admin') {
      throw new Error('Tag name "admin" is reserved')
    }
  }

  private async insertTag(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateTagDto
  ): Promise<TagResponseDto> {
    const { data, error } = await supabase
      .from('contact_tags')
      .insert({ user_id: userId, ...dto })
      .select()
      .single()

    if (error) throw new Error('Failed to create tag')
    return data
  }
}
```

---

<!-- ============================================================================
   SECTION 11: CONTROLLER PATTERNS
   ============================================================================ -->

## 11. Controller Patterns

### **Standard Controller Structure**

```typescript
@Controller('tags')
@UseGuards(AuthGuard, ThrottlerGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(ListQueryDto)) query: ListQueryDto,
    @CurrentUser() user: any,
    @Supabase() supabase: SupabaseClient,
  ) {
    const tags = await this.tagsService.getTags(supabase, user.id, query)
    return { tags }
  }

  @Get(':id')
  async get(
    @Param(new ZodValidationPipe(IdParamDto)) params: IdParamDto,
    @CurrentUser() user: any,
    @Supabase() supabase: SupabaseClient,
  ) {
    const tag = await this.tagsService.getTagById(supabase, user.id, params.id)
    if (!tag) {
      throw new NotFoundException('Tag not found')
    }
    return { tag }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateTagDto)) dto: CreateTagDto,
    @CurrentUser() user: any,
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const tag = await this.tagsService.createTag(supabase, user.id, dto)
      return { tag }
    } catch (error) {
      if (error.message === 'Tag name already exists') {
        throw new ConflictException('Tag name already exists')
      }
      throw new InternalServerErrorException('Failed to create tag')
    }
  }

  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(IdParamDto)) params: IdParamDto,
    @Body(new ZodValidationPipe(UpdateTagDto)) dto: UpdateTagDto,
    @CurrentUser() user: any,
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const tag = await this.tagsService.updateTag(supabase, user.id, params.id, dto)
      return { tag }
    } catch (error) {
      if (error.message === 'Tag not found') {
        throw new NotFoundException('Tag not found')
      }
      throw new InternalServerErrorException('Failed to update tag')
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param(new ZodValidationPipe(IdParamDto)) params: IdParamDto,
    @CurrentUser() user: any,
    @Supabase() supabase: SupabaseClient,
  ) {
    await this.tagsService.deleteTag(supabase, user.id, params.id)
    return { success: true }
  }
}
```

### **Response Transformation**

```typescript
// ✅ Use interceptors for consistent response format
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }))
    )
  }
}

// Apply globally or per controller
@Controller('tags')
@UseInterceptors(TransformInterceptor)
export class TagsController { ... }
```

### **File Upload Handling**

```typescript
@Controller('media')
@UseGuards(AuthGuard, ThrottlerGuard)
export class MediaController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif)$/)) {
          return cb(new BadRequestException('Only images allowed'), false)
        }
        cb(null, true)
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: any,
    @CurrentUser() user: any,
    @Supabase() supabase: SupabaseClient,
  ) {
    const result = await this.mediaService.uploadFile(supabase, user.id, file, dto)
    return { file: result }
  }
}
```

### **Streaming Responses (SSE)**

```typescript
@Controller('ai')
@UseGuards(AuthGuard, ThrottlerGuard)
export class AIController {
  @Sse('stream')
  stream(
    @Query(new ZodValidationPipe(StreamQueryDto)) query: StreamQueryDto,
    @CurrentUser() user: any,
    @Supabase() supabase: SupabaseClient,
  ): Observable<MessageEvent> {
    return new Observable((observer) => {
      this.aiService
        .generateStream(supabase, user.id, query)
        .then((stream) => {
          for await (const chunk of stream) {
            observer.next({ data: chunk } as MessageEvent)
          }
          observer.complete()
        })
        .catch((error) => observer.error(error))
    })
  }
}
```

---

<!-- ============================================================================
   SECTION 12: ERROR HANDLING PATTERNS
   ============================================================================ -->

## 12. Error Handling Patterns

### **Built-in HTTP Exceptions**

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'

// Use built-in exceptions
throw new BadRequestException('Invalid input')
throw new UnauthorizedException('Invalid credentials')
throw new NotFoundException('Resource not found')
throw new ForbiddenException('Access denied')
throw new ConflictException('Resource already exists')
throw new InternalServerErrorException('Internal error')
```

### **Custom Exceptions**

```typescript
// domain-exception.ts
export class DomainException extends HttpException {
  constructor(message: string, statusCode: number) {
    super({ message, error: 'DomainError' }, statusCode)
  }
}

// Usage
throw new DomainException('Tag name already exists', HttpStatus.CONFLICT)
```

### **Exception Filters**

```typescript
// Global exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message
    }

    // Log errors
    if (status >= 500) {
      this.logger.error({
        app: 'backend',
        severity: 'critical',
        feature: 'global/exception',
        error_code: 'UNHANDLED_EXCEPTION',
        message: `Unhandled exception: ${message}`,
        context: {
          path: request.url,
          method: request.method,
          statusCode: status,
          error: exception instanceof Error ? exception.message : 'Unknown',
          stack: exception instanceof Error ? exception.stack : undefined,
        },
      })
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
```

### **Validation Error Filter**

```typescript
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const exceptionResponse = exception.getResponse() as any

    response.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      errors: exceptionResponse.errors || exceptionResponse.message,
      timestamp: new Date().toISOString(),
    })
  }
}
```

---

<!-- ============================================================================
   SECTION 13: TESTING PATTERNS
   ============================================================================ -->

## 13. Testing Patterns

### **Unit Tests (Services)**

```typescript
// tags.service.spec.ts
describe('TagsService', () => {
  let service: TagsService
  let logger: LoggerService
  let supabase: jest.Mocked<SupabaseClient>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            info: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<TagsService>(TagsService)
    logger = module.get<LoggerService>(LoggerService)

    // Mock Supabase client
    supabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn(),
    } as any
  })

  describe('createTag', () => {
    it('should create a tag successfully', async () => {
      const dto = { name: 'Test Tag', color: 'blue' }
      const userId = 'user-123'
      const expected = { id: 'tag-123', ...dto, user_id: userId }

      supabase.single.mockResolvedValue({ data: expected, error: null })

      const result = await service.createTag(supabase, userId, dto)

      expect(result).toEqual(expected)
      expect(supabase.from).toHaveBeenCalledWith('contact_tags')
    })

    it('should throw error if tag name exists', async () => {
      // Test duplicate name logic
    })

    it('should log error on database failure', async () => {
      const dto = { name: 'Test Tag', color: 'blue' }
      const userId = 'user-123'
      const dbError = { message: 'DB error', code: '23505' }

      supabase.single.mockResolvedValue({ data: null, error: dbError })

      await expect(service.createTag(supabase, userId, dto)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })
})
```

### **Integration Tests (Controllers)**

```typescript
// tags.controller.spec.ts
describe('TagsController', () => {
  let app: INestApplication
  let tagsService: TagsService

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: {
            getTags: jest.fn(),
            createTag: jest.fn(),
            updateTag: jest.fn(),
            deleteTag: jest.fn(),
          },
        },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    tagsService = moduleRef.get<TagsService>(TagsService)

    await app.init()
  })

  describe('GET /tags', () => {
    it('should return list of tags', async () => {
      const tags = [{ id: '1', name: 'Tag 1', color: 'blue' }]
      jest.spyOn(tagsService, 'getTags').mockResolvedValue(tags)

      return request(app.getHttpServer())
        .get('/tags')
        .set('Authorization', 'Bearer test-token')
        .expect(200)
        .expect({ tags })
    })
  })

  describe('POST /tags', () => {
    it('should create a tag', async () => {
      const dto = { name: 'New Tag', color: 'red' }
      const created = { id: '2', ...dto, user_id: 'user-123' }
      jest.spyOn(tagsService, 'createTag').mockResolvedValue(created)

      return request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', 'Bearer test-token')
        .send(dto)
        .expect(201)
        .expect({ tag: created })
    })

    it('should return 400 for invalid input', async () => {
      return request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', 'Bearer test-token')
        .send({ name: '' }) // Invalid
        .expect(400)
    })
  })
})
```

### **E2E Tests**

```typescript
// tags.e2e.spec.ts
describe('Tags API (e2e)', () => {
  let app: INestApplication
  let testUser: any
  let testToken: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()

    // Create test user and get JWT
    testUser = await createTestUser()
    testToken = await getTestToken(testUser)
  })

  afterAll(async () => {
    await cleanupTestData()
    await app.close()
  })

  describe('/tags (GET)', () => {
    it('should return user tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/tags')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('tags')
      expect(Array.isArray(response.body.tags)).toBe(true)
    })

    it('should return 401 without token', async () => {
      return request(app.getHttpServer()).get('/tags').expect(401)
    })
  })

  describe('/tags (POST)', () => {
    it('should create new tag', async () => {
      const dto = { name: 'E2E Tag', color: 'green' }

      const response = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${testToken}`)
        .send(dto)
        .expect(201)

      expect(response.body.tag).toMatchObject(dto)
      expect(response.body.tag).toHaveProperty('id')
    })
  })
})
```

---

<!-- ============================================================================
   SECTION 14: COMMON MISTAKES TO AVOID
   ============================================================================ -->

## 14. Common Mistakes to Avoid

### **Architecture Violations**

1. **❌ CRITICAL: Business logic in controllers**
   - Controllers should only handle HTTP concerns
   - Move all business logic to services

2. **❌ CRITICAL: Using service role key at runtime**
   - Never bypass RLS with service role key
   - Always use user-scoped clients

3. **❌ CRITICAL: Missing authentication guards**
   - Every protected endpoint needs `@UseGuards(AuthGuard)`
   - Never skip auth checks

4. **❌ CRITICAL: Skipping input validation**
   - All input MUST be validated with Zod
   - Use `ZodValidationPipe` on all `@Body()`, `@Query()`, `@Param()`

5. **❌ CRITICAL: Missing rate limiting**
   - All controllers need `@UseGuards(ThrottlerGuard)`
   - Configure appropriate limits

6. **❌ CRITICAL: Direct database queries in controllers**
   - Controllers should call services
   - Services handle database operations

7. **❌ CRITICAL: Not logging errors**
   - Services must inject and use `LoggerService`
   - Log all database errors, external API errors, unhandled errors

8. **❌ HIGH: Trusting client-provided user ID**
   - Always use `@CurrentUser()` decorator
   - Never accept `userId` from request body

9. **❌ HIGH: Manual dependency instantiation**
   - Use constructor injection
   - Let NestJS handle dependency creation

10. **❌ MEDIUM: Exposing internal error details**
    - Sanitize error messages
    - Log details server-side, return generic messages

11. **❌ MEDIUM: Missing error handling**
    - Always check database `error` property
    - Wrap operations in try/catch

12. **❌ MEDIUM: Not using TypeScript types**
    - Define DTOs with Zod
    - Use `z.infer<typeof Schema>` for types

### **Security Violations**

13. **❌ CRITICAL: Bypassing RLS**
14. **❌ CRITICAL: Exposing secrets**
15. **❌ HIGH: SQL injection** (use Supabase query builder, not raw SQL)
16. **❌ HIGH: Missing CORS configuration**
17. **❌ MEDIUM: Insecure file uploads**
18. **❌ LOW: Missing helmet headers**

---

## 🎯 **Quick Checklist**

### **Before Creating New Module**

- [ ] Read complete context (all related files 100%)
- [ ] Create 3-layer structure (Controller → Service → DTO)
- [ ] Define Zod schemas for validation
- [ ] Import SharedModule for LoggerService
- [ ] Register module in AppModule

### **Before Deploying Controller**

- [ ] `@UseGuards(AuthGuard, ThrottlerGuard)` applied
- [ ] `@CurrentUser()` and `@Supabase()` decorators used
- [ ] Input validation with `ZodValidationPipe`
- [ ] Rate limits configured
- [ ] Error handling with HTTP exceptions
- [ ] Response transformation consistent

### **Before Deploying Service**

- [ ] LoggerService injected via constructor
- [ ] All database errors logged
- [ ] RLS-enforced client used (no service role key)
- [ ] Meaningful error messages thrown
- [ ] Private helper methods for complex logic
- [ ] Return types properly defined

### **Security Checklist**

- [ ] No service role key at runtime
- [ ] User ID from `@CurrentUser()` only
- [ ] All input validated with Zod
- [ ] Rate limiting implemented
- [ ] Error responses sanitized
- [ ] CORS configured correctly
- [ ] Environment variables secure

### **Code Quality Checklist**

- [ ] Context gathered (read entire files)
- [ ] Old code removed (if replaced)
- [ ] Tests written (unit + integration)
- [ ] Error logging implemented
- [ ] Documentation updated
- [ ] Changelog entry added

---

**For more patterns, see:**

- Frontend architecture: `@.docs/guidelines/development/code-guidelines.md`
- Project architecture: `.docs/guidelines/architecture/project-architecture.md`
- Design patterns: `@.docs/guidelines/design/.design_guidelines.md`

---

_Remember: Follow the 3-layer pattern: Controller → Service → Repository (optional). Keep business logic in services. Always use RLS-enforced clients. Log all errors._
