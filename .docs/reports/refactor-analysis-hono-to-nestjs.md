# Vibey 2.0 — Complete Refactor Analysis Report

**Date:** February 10, 2026
**Author:** Meticulous Code Analyst
**Scope:** Full architecture audit — Current state vs. Guidelines vs. Legacy reference

---

## 1. Problem Restatement

The current Vibey 2.0 monorepo uses **Hono** as the backend framework (`apps/agent`) and **Next.js 14** as the frontend (`apps/web`). The established guidelines mandate:

- **Frontend:** Next.js (App Router) — aligned with `project-architecture.md`
- **Backend:** NestJS (3-layer architecture) — aligned with `backend-architecture.md` and `code-guidelines-backend.md`

The Vibey Legacy codebase (`Vibey_legacy/`) already had this exact setup (Next.js frontend + NestJS backend with 39+ modules). The V2 rewrite deviated from the guidelines by choosing Hono, which lacks the architectural patterns the guidelines depend on (modules, guards, decorators, DI, pipes, interceptors).

**Core ask:** Refactor V2 to match the guidelines — Next.js for frontend, NestJS for backend — similar to how Legacy was structured, but clean.

---

## 2. Environment & Context

### Current V2 Stack

| Component           | Current                              | Guideline Target                       |
| ------------------- | ------------------------------------ | -------------------------------------- |
| **Monorepo**        | Turbo + pnpm workspaces              | Turbo + pnpm workspaces (same)         |
| **Frontend app**    | `apps/web` — Next.js 14.2 (React 18) | Next.js (App Router) ✅ mostly aligned |
| **Backend app**     | `apps/agent` — Hono 4.7              | NestJS ❌ **misaligned**               |
| **Database**        | Supabase (via `@vibey/db`)           | Supabase ✅ aligned                    |
| **State mgmt**      | Zustand                              | Zustand ✅ aligned                     |
| **Auth**            | Supabase JWT (custom middleware)     | Supabase JWT via NestJS Guards ❌      |
| **Validation**      | Zod (manual middleware)              | Zod via NestJS Pipes ❌                |
| **Rate limiting**   | Custom middleware (`rate-limit.ts`)  | NestJS `@nestjs/throttler` ❌          |
| **Shared packages** | `@vibey/db`, `@vibey/ui`             | Aligned ✅                             |

### Versions

| Dependency  | Current Version | Notes                                                   |
| ----------- | --------------- | ------------------------------------------------------- |
| Node.js     | >=20            | Fine                                                    |
| TypeScript  | 5.7.3           | Fine                                                    |
| Next.js     | 14.2.23         | Guidelines reference Next.js 15 features (async params) |
| React       | 18.3.1          | Legacy uses React 19                                    |
| Hono        | 4.7.2           | **To be replaced** with NestJS                          |
| Supabase JS | 2.49.1          | Fine                                                    |
| Zod         | 3.24.1          | Fine (will be reused in NestJS pipes)                   |

### Legacy Reference Stack

| Component    | Legacy Version                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Next.js      | 15.5.9                                                                                                |
| React        | 19.1.0                                                                                                |
| NestJS       | 11.0.1                                                                                                |
| Backend port | 3003                                                                                                  |
| Modules      | 39+ (Vibey, Campaigns, Funnels, Studio, Email, Contacts, CRM, Billing, Analytics, Integrations, etc.) |

---

## 3. Current Architecture Deep Dive

### 3.1 Backend (`apps/agent`) — Hono

**Entry point:** `apps/agent/src/index.ts`

```
Hono app
├── Global middleware: logger, CORS
├── Public: GET /health
├── Auth middleware on /api/*
├── Routes:
│   ├── /api/conversations → conversationsController
│   └── /api/chat → chatController
├── 404 fallback
└── Global error handler
```

**Module structure (2 modules):**

```
src/modules/
├── chat/
│   ├── controllers/chat.controller.ts
│   ├── integrations/ (anthropic, gemini, openrouter, shared-sse-reader)
│   └── services/ (chat.service, llm-provider.service)
└── conversations/
    ├── controllers/conversations.controller.ts
    ├── repositories/ (conversations.repository, messages.repository)
    └── services/conversations.service.ts
```

**What exists that's reusable:**

- Business logic inside services (chat.service.ts, conversations.service.ts, llm-provider.service.ts)
- Repository pattern (conversations.repository.ts, messages.repository.ts)
- Integration layer (anthropic, gemini, openrouter integrations)
- Zod validation schemas
- Supabase client utilities

**What must be replaced:**

- Hono app setup → NestJS bootstrap (`main.ts`)
- Hono routing → NestJS `@Controller()` decorators
- Custom auth middleware → NestJS `AuthGuard` (CanActivate)
- Custom rate-limit middleware → `@nestjs/throttler`
- Custom validate middleware → `ZodValidationPipe`
- Manual DI (function params) → NestJS constructor injection

### 3.2 Frontend (`apps/web`) — Next.js 14

**Structure:**

```
src/
├── app/
│   ├── (auth)/ — login, register, callback
│   ├── (dashboard)/ — main app pages
│   │   ├── brain/
│   │   ├── campaigns/
│   │   ├── contacts/
│   │   ├── settings/
│   │   └── studio/
│   ├── globals.css
│   └── layout.tsx
├── components/layout/ — Sidebar, TopBar, MobileNav
├── features/studio/ — Chat interface (containers, components, services, store, types)
├── lib/
│   ├── api/backend-client.ts — API client to agent backend
│   └── supabase/ — client.ts, server.ts
└── middleware.ts — Auth session refresh
```

**Alignment with guidelines:**

- ✅ App Router structure
- ✅ Feature-based organization (`features/studio/`)
- ✅ Smart/Dumb component separation (StudioContainer + ChatInput, MessageBubble, etc.)
- ✅ Supabase auth via `@supabase/ssr`
- ✅ Zustand for state management
- ⚠️ Next.js 14 — guidelines reference Next.js 15 patterns (async `params`)
- ⚠️ No `src/lib/services/` for shared services yet (only supabase + api)
- ⚠️ No API routes (`src/app/api/`) — all API calls go to external Hono backend
- ❌ Missing: No `src/lib/middleware/`, `src/lib/schemas/`, `src/lib/constants/` as defined in guidelines
- ❌ Missing: No error logging service (`logErrorClient`, `logErrorServer`)
- ❌ Missing: No feature isolation checks (only 1 feature exists)

### 3.3 Shared Packages

**`@vibey/db`** — Supabase client factories

- `createClient()` — Client-side
- `createServiceClient()` — Service-side (bypasses RLS)
- `Database` type export

⚠️ **Guideline violation:** `createServiceClient` uses service role key which the guidelines explicitly forbid at runtime. This package needs redesign to only expose RLS-enforced clients.

**`@vibey/ui`** — Only exports `cn()` utility. Minimal.

---

## 4. Gap Analysis: Current vs. Guidelines

### 4.1 Backend Gaps (CRITICAL)

| Guideline Requirement                                      | Current State                                  | Gap Severity                                        |
| ---------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| NestJS framework                                           | Hono                                           | 🔴 CRITICAL                                         |
| 3-layer architecture (Controller → Service → Repository)   | Partially exists (modules follow this pattern) | 🟡 MEDIUM (structure exists, needs NestJS wrappers) |
| `@Module()` declarations                                   | None (Hono has no modules)                     | 🔴 CRITICAL                                         |
| `@Injectable()` services with DI                           | Manual function params                         | 🔴 CRITICAL                                         |
| `AuthGuard` (CanActivate)                                  | Custom Hono middleware                         | 🔴 CRITICAL                                         |
| `@CurrentUser()` decorator                                 | None                                           | 🔴 CRITICAL                                         |
| `@Supabase()` decorator                                    | None                                           | 🔴 CRITICAL                                         |
| `ThrottlerGuard` + `@Throttle()`                           | Custom rate-limit middleware                   | 🔴 CRITICAL                                         |
| `ZodValidationPipe`                                        | Custom validate middleware                     | 🔴 CRITICAL                                         |
| `LoggerService` (error logging to DB)                      | `console.error` only                           | 🔴 CRITICAL                                         |
| SharedModule (LoggerService, SupabaseModule, UsageTracker) | None                                           | 🔴 CRITICAL                                         |
| Global exception filters                                   | Basic `app.onError`                            | 🟡 MEDIUM                                           |
| CORS explicit configuration                                | Exists but basic                               | 🟢 LOW                                              |
| File size limits enforced                                  | Not measured                                   | 🟡 MEDIUM                                           |
| Service-based modules (vertical slices)                    | ✅ Already organized this way                  | 🟢 ALIGNED                                          |
| DTOs with Zod schemas                                      | Partial (Zod exists)                           | 🟡 MEDIUM                                           |

### 4.2 Frontend Gaps

| Guideline Requirement                             | Current State                            | Gap Severity                         |
| ------------------------------------------------- | ---------------------------------------- | ------------------------------------ |
| Next.js App Router                                | ✅ Exists                                | 🟢 ALIGNED                           |
| Feature-based organization                        | ✅ `features/studio/`                    | 🟢 ALIGNED                           |
| Smart/Dumb component separation                   | ✅ Container + Components                | 🟢 ALIGNED                           |
| API routes (`src/app/api/`) for server-side logic | ❌ All calls go to external Hono backend | 🟡 MEDIUM (will call NestJS instead) |
| `src/lib/services/` shared services               | ❌ Missing                               | 🟡 MEDIUM                            |
| Error logging service                             | ❌ Missing                               | 🔴 CRITICAL                          |
| Rate limiting middleware                          | ❌ Missing (backend handles it)          | 🟢 LOW (backend handles)             |
| Zod schemas in `src/lib/schemas/`                 | ❌ Missing                               | 🟡 MEDIUM                            |
| Feature isolation (no cross-feature imports)      | N/A (only 1 feature)                     | 🟢 LOW                               |
| Next.js 15 (guidelines reference)                 | Currently on 14                          | 🟡 MEDIUM                            |

### 4.3 Cross-Cutting Gaps

| Requirement                                                           | Status                            |
| --------------------------------------------------------------------- | --------------------------------- |
| `@vibey/db` exposes service role client                               | ⚠️ Violates RLS-only policy       |
| No `funnel-templates` package                                         | Missing from guidelines structure |
| No admin app                                                          | Existed in legacy, not yet in V2  |
| No error logging infrastructure (`app_errors` table, admin dashboard) | Missing                           |
| No usage tracking (`token_ai_usage_events`)                           | Missing                           |
| No OpenRouter cost tracking                                           | Missing                           |

---

## 5. Refactor Plan — Hono → NestJS

### Phase 1: Create NestJS Backend App (Replace `apps/agent`)

**Action:** Create `apps/api` (NestJS) to replace `apps/agent` (Hono).

**New app structure:**

```
apps/api/
├── src/
│   ├── main.ts                          # NestJS bootstrap
│   ├── app.module.ts                    # Root module
│   ├── shared/                          # SharedModule
│   │   ├── shared.module.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts            # JWT AuthGuard
│   │   │   └── admin.guard.ts           # Admin role guard
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── supabase.decorator.ts
│   │   ├── pipes/
│   │   │   └── zod-validation.pipe.ts
│   │   ├── filters/
│   │   │   ├── global-exception.filter.ts
│   │   │   ├── validation-exception.filter.ts
│   │   │   └── throttler-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   └── services/
│   │       ├── logger.service.ts         # Error logging to DB
│   │       ├── supabase-client.factory.ts
│   │       └── usage-tracker.service.ts
│   ├── modules/
│   │   ├── chat/                        # Migrated from Hono
│   │   │   ├── controllers/
│   │   │   │   └── chat.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── chat.service.ts
│   │   │   │   └── llm-provider.service.ts
│   │   │   ├── integrations/
│   │   │   │   ├── openrouter.integration.ts
│   │   │   │   ├── anthropic.integration.ts
│   │   │   │   └── gemini.integration.ts
│   │   │   ├── dto/
│   │   │   │   ├── send-message.dto.ts
│   │   │   │   └── chat-response.dto.ts
│   │   │   └── chat.module.ts
│   │   └── conversations/               # Migrated from Hono
│   │       ├── controllers/
│   │       │   └── conversations.controller.ts
│   │       ├── services/
│   │       │   └── conversations.service.ts
│   │       ├── repositories/
│   │       │   ├── conversations.repository.ts
│   │       │   └── messages.repository.ts
│   │       ├── dto/
│   │       │   ├── create-conversation.dto.ts
│   │       │   └── conversation-response.dto.ts
│   │       └── conversations.module.ts
│   └── lib/                             # Shared utilities
│       ├── types/
│       ├── utils/
│       └── constants/
├── test/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── nest-cli.json
```

**Key dependencies for `apps/api/package.json`:**

```json
{
  "dependencies": {
    "@nestjs/common": "^11.x",
    "@nestjs/core": "^11.x",
    "@nestjs/platform-express": "^11.x",
    "@nestjs/config": "^4.x",
    "@nestjs/throttler": "^6.x",
    "@supabase/supabase-js": "^2.49.1",
    "zod": "^3.24.1",
    "reflect-metadata": "^0.2.x",
    "rxjs": "^7.x"
  }
}
```

### Phase 2: Migrate Business Logic

**What to port (preserve logic, change wrappers):**

| Source (Hono)                      | Target (NestJS)                                      | Migration Type              |
| ---------------------------------- | ---------------------------------------------------- | --------------------------- |
| `chat.controller.ts` (Hono routes) | `chat.controller.ts` (NestJS `@Controller`)          | Rewrite wrapper, keep logic |
| `chat.service.ts`                  | `chat.service.ts` (NestJS `@Injectable`)             | Add DI decorators           |
| `llm-provider.service.ts`          | `llm-provider.service.ts` (NestJS `@Injectable`)     | Add DI decorators           |
| `conversations.controller.ts`      | `conversations.controller.ts` (NestJS `@Controller`) | Rewrite wrapper             |
| `conversations.service.ts`         | `conversations.service.ts` (NestJS `@Injectable`)    | Add DI decorators           |
| `conversations.repository.ts`      | `conversations.repository.ts` (NestJS `@Injectable`) | Add DI decorators           |
| `messages.repository.ts`           | `messages.repository.ts` (NestJS `@Injectable`)      | Add DI decorators           |
| `openrouter.integration.ts`        | `openrouter.integration.ts` (NestJS `@Injectable`)   | Add DI                      |
| `anthropic.integration.ts`         | `anthropic.integration.ts` (NestJS `@Injectable`)    | Add DI                      |
| `gemini.integration.ts`            | `gemini.integration.ts` (NestJS `@Injectable`)       | Add DI                      |
| `auth.ts` (Hono middleware)        | `auth.guard.ts` (NestJS Guard)                       | Rewrite                     |
| `rate-limit.ts` (custom)           | `@nestjs/throttler`                                  | Replace entirely            |
| `validate.ts` (custom)             | `ZodValidationPipe`                                  | Replace entirely            |
| `supabase.ts` (utility)            | `supabase-client.factory.ts` (NestJS provider)       | Rewrite as factory          |

### Phase 3: Frontend Updates

**Minimal frontend changes needed:**

1. **Update `backend-client.ts`** — Change base URL from Hono port (3001) to NestJS port (3001 or 3003)
2. **API response format** — Ensure NestJS controllers return same JSON shape
3. **Optional:** Upgrade Next.js 14 → 15 (async params, React 19)
4. **Add:** `src/lib/services/error-logger.service.ts` for client-side error logging
5. **Add:** `src/lib/schemas/` for shared Zod schemas if needed

### Phase 4: Remove Hono App

After NestJS backend is working and all tests pass:

1. Delete `apps/agent/` entirely
2. Update root `turbo.json` if any agent-specific config
3. Update any CI/CD references
4. Update documentation

---

## 6. Migration Transformation Examples

### 6.1 Controller: Hono → NestJS

**Before (Hono):**

```typescript
// apps/agent/src/modules/conversations/controllers/conversations.controller.ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', async (c) => {
  const user = c.get('user')
  const supabase = c.get('supabase')
  const conversations = await conversationsService.list(supabase, user.id)
  return c.json({ conversations })
})

export const conversationsController = app
```

**After (NestJS):**

```typescript
// apps/api/src/modules/conversations/controllers/conversations.controller.ts
@Controller('conversations')
@UseGuards(AuthGuard, ThrottlerGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async list(@CurrentUser() user: any, @Supabase() supabase: SupabaseClient) {
    const conversations = await this.conversationsService.list(supabase, user.id)
    return { conversations }
  }
}
```

### 6.2 Auth Middleware → Guard

**Before (Hono):**

```typescript
export const authMiddleware = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const {
    data: { user },
  } = await supabase.auth.getUser(token)
  c.set('user', user)
  c.set('supabase', createClientWithToken(token))
  await next()
}
```

**After (NestJS):**

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = request.headers.authorization?.replace('Bearer ', '')
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)
    if (error || !user) throw new UnauthorizedException()
    request.user = user
    request.supabase = createClientWithToken(token)
    return true
  }
}
```

### 6.3 Validation: Custom → Pipe

**Before (Hono):**

```typescript
import { zValidator } from './validate'
app.post('/', zValidator('json', CreateConversationSchema), async (c) => { ... })
```

**After (NestJS):**

```typescript
@Post()
async create(
  @Body(new ZodValidationPipe(CreateConversationDto)) dto: CreateConversationDto,
  @CurrentUser() user: any,
  @Supabase() supabase: SupabaseClient,
) { ... }
```

---

## 7. Risk Assessment

| Risk                                                            | Likelihood | Impact | Mitigation                                                             |
| --------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------- |
| Breaking existing chat/streaming functionality during migration | Medium     | High   | Port business logic unchanged; test SSE streaming thoroughly           |
| NestJS overhead vs Hono simplicity                              | Low        | Low    | NestJS is the guideline standard; overhead is acceptable for structure |
| Supabase client handling differences                            | Medium     | Medium | Keep same JWT-based RLS pattern, just change DI approach               |
| Frontend API client incompatibility                             | Low        | Medium | Match response shapes exactly; integration test                        |
| Package `@vibey/db` service role violation                      | Certain    | Medium | Redesign to remove `createServiceClient` from runtime paths            |

---

## 8. Recommended Execution Order

| Step | Action                                                                    | Estimated Effort | Dependencies   |
| ---- | ------------------------------------------------------------------------- | ---------------- | -------------- |
| 1    | Scaffold `apps/api` with NestJS, SharedModule, guards, pipes, filters     | 2-3 hours        | None           |
| 2    | Migrate `conversations` module (controller + service + repository + DTOs) | 1-2 hours        | Step 1         |
| 3    | Migrate `chat` module (controller + service + integrations + DTOs)        | 2-3 hours        | Step 1         |
| 4    | Add LoggerService, error logging infrastructure                           | 1 hour           | Step 1         |
| 5    | Add ThrottlerModule configuration                                         | 30 min           | Step 1         |
| 6    | Update frontend `backend-client.ts` to point to NestJS                    | 15 min           | Steps 2-3      |
| 7    | Integration test: full chat flow end-to-end                               | 1-2 hours        | Steps 2-6      |
| 8    | Remove `apps/agent` (Hono)                                                | 15 min           | Step 7 passing |
| 9    | Fix `@vibey/db` to remove service role export                             | 30 min           | Step 8         |
| 10   | (Optional) Upgrade Next.js 14 → 15, React 18 → 19                         | 1-2 hours        | Independent    |

**Total estimated effort:** 8-14 hours

---

## 9. What Stays Unchanged

- ✅ Monorepo structure (Turbo + pnpm workspaces)
- ✅ Frontend app location (`apps/web`)
- ✅ Frontend feature structure (`features/studio/`)
- ✅ Supabase as database
- ✅ Zustand for client state
- ✅ Zod for validation (reused in NestJS pipes)
- ✅ `@vibey/ui` package
- ✅ Tailwind CSS
- ✅ Vitest for testing
- ✅ Turbo for build orchestration
- ✅ All business logic (services, repositories, integrations) — ported, not rewritten

---

## 10. What Gets Removed

| Item                                | Reason                          |
| ----------------------------------- | ------------------------------- |
| `apps/agent/` (entire Hono app)     | Replaced by `apps/api` (NestJS) |
| `@hono/node-server` dependency      | No longer needed                |
| `hono` dependency                   | No longer needed                |
| `tsup` in agent (build tool)        | NestJS uses its own build       |
| Custom `auth.ts` middleware         | Replaced by NestJS AuthGuard    |
| Custom `rate-limit.ts` middleware   | Replaced by @nestjs/throttler   |
| Custom `validate.ts` middleware     | Replaced by ZodValidationPipe   |
| `@vibey/db` `createServiceClient()` | Violates RLS-only policy        |

---

## 11. Unknowns & Missing Evidence

| Unknown                                                                  | Impact                           | How to Resolve                                                             |
| ------------------------------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------- |
| Exact SSE streaming implementation in Hono chat controller               | High — must be preserved exactly | Read full `chat.controller.ts` and `shared-sse-reader.ts` before migration |
| Whether `@vibey/db` service client is used at runtime or only in scripts | Medium                           | Grep for `createServiceClient` usage across all files                      |
| Whether frontend expects specific response headers from Hono             | Low                              | Compare Hono vs NestJS default response headers                            |
| Deployment target (Vercel, Railway, Docker?)                             | Medium — affects NestJS config   | Ask user or check CI/CD config                                             |
| Whether `.env` files exist and what variables are set                    | Medium                           | Check for `.env`, `.env.local`, `.env.example`                             |

---

## 12. Quality Control Summary

- [x] Instructions fully covered (analyzed all 5 guideline docs + meticulously protocol)
- [x] All current files analyzed (agent entry, package.jsons, module structure)
- [x] Legacy reference consulted (NestJS patterns from `Vibey_legacy/apps/app-backend/`)
- [x] Gap analysis complete (backend: 15 gaps, frontend: 10 gaps)
- [x] Migration plan phased with estimates
- [x] Risk assessment provided
- [x] Transformation examples given (controller, guard, pipe)
- [x] Removal checklist prepared
- [x] Unknowns explicitly listed with resolution steps

---

**Bottom line:** The refactor is a framework swap (Hono → NestJS) for the backend. The business logic is already structured in a compatible way (modules, controllers, services, repositories). The migration is mostly wrapping existing code in NestJS decorators and DI patterns. The frontend needs minimal changes — just pointing the API client to the new backend.
