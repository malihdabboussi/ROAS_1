# Vibe OS - Code Guidelines

**Development Patterns Authority - HOW to Code, Server/Client Patterns, Security**

**Quick Reference for AI and Developers**

---

## 📖 **Table of Contents**

**CRITICAL - READ FIRST** 0. [Context Gathering Protocol (MANDATORY)](#0-context-gathering-protocol-mandatory) ... Line ~50
0.5. [Code Replacement & Dead Code Removal (MANDATORY)](#05-code-replacement--dead-code-removal-mandatory) Line ~250

**ARCHITECTURE PATTERNS**

1. [Server vs Client Side Architecture](#1-server-vs-client-side-architecture) ......... Line ~450
2. [Service Integration Pattern](#2-service-integration-pattern) ...................... Line ~550
3. [Feature-Based API Isolation](#3-feature-based-api-isolation-critical) ............. Line ~700
4. [Authentication Patterns (RLS-Only)](#4-authentication-patterns-rls-only) .......... Line ~900

**PERFORMANCE & OPTIMIZATION** 5. [Performance: Client vs Server Queries](#5-performance-client-vs-server-queries) ... Line ~1050 6. [Data Flow Patterns](#6-data-flow-patterns) .................................... Line ~1250

**SECURITY & VALIDATION** 7. [Security Requirements (MANDATORY)](#7-security-requirements-mandatory) ............ Line ~800 8. [Input Validation & Error Handling](#8-input-validation--error-handling) ........... Line ~894

**COMMON PATTERNS** 9. [Common Coding Patterns](#9-common-coding-patterns) ............................. Line ~1144 10. [AI/LLM Integration Patterns](#10-aillm-integration-patterns) .................... Line ~1191 11. [Common Mistakes to Avoid](#11-common-mistakes-to-avoid) ......................... Line ~1389

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
   - Files that import this file
   - Files this file imports
   - Parent components/services
   - Child components/utilities

3. **Understand complete data flow**
   - Where does data come from? (source)
   - How is it transformed? (all steps)
   - Where does it go? (destination)
   - What depends on it? (consumers)

### **File Size Guidelines**

| File Size       | Action                                                          | Rationale                                        |
| --------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| < 200 lines     | Read entire file                                                | Fast to read, essential for context              |
| 200-500 lines   | Read entire file                                                | Must understand full logic                       |
| 500-1000 lines  | Read entire file                                                | Cannot make informed decisions otherwise         |
| 1000-2000 lines | Read entire file                                                | Large files often have complex interdependencies |
| > 2000 lines    | Read entire file OR use `codebase_search` for specific sections | Very large files may need targeted search first  |

### **"But it's too long" is NOT an excuse**

```
❌ WRONG THINKING:
"This file is 800 lines, I'll just read the function I need to change"

✅ CORRECT THINKING:
"This file is 800 lines, I need to read all 800 lines to understand:
- How this function is called
- What depends on it
- What state it modifies
- What edge cases exist
- How it fits in the overall architecture"
```

### **Context Gathering Checklist (MANDATORY)**

**Before EVERY code change, verify:**

- [ ] I have read the ENTIRE target file (100% of lines)
- [ ] I have read ALL files that import the target file
- [ ] I have read ALL files the target file imports
- [ ] I understand the complete data flow (source → transform → destination)
- [ ] I have searched for all usages of functions/components I'm modifying
- [ ] I have checked the git history to understand why this code exists
- [ ] I can explain how my change fits into the complete system

**If ANY checkbox is unchecked → STOP. Gather context first.**

### **Examples of Proper Context Gathering**

#### **Example 1: Modifying a Component**

```
Task: Fix a bug in FunnelWizardStepSetup.tsx (600 lines)

✅ CORRECT:
1. Read all 600 lines of FunnelWizardStepSetup.tsx
2. Read FunnelCopilotWizardContainer.tsx (parent component, 1124 lines)
3. Read all hooks used by the component (useWizardState, useWizardValidation)
4. Read the API route it calls (/api/funnel/generate-copy/route.ts)
5. Understand the complete wizard flow
6. Identify root cause
7. Make informed fix

❌ WRONG:
1. Read lines 200-350 where the bug occurs
2. Make a quick fix
3. Hope it works
```

#### **Example 2: Modifying an API Route**

```
Task: Add validation to /api/offers/route.ts

✅ CORRECT:
1. Read entire /api/offers/route.ts file
2. Read all components that call this route (grep "/api/offers")
3. Read the service it uses (offers.service.ts)
4. Read the database schema (offers table)
5. Read existing validation patterns from other routes
6. Understand what data consumers expect
7. Implement validation that doesn't break consumers

❌ WRONG:
1. Read just the POST handler (50 lines)
2. Add Zod validation
3. Don't check if it breaks existing callers
```

### **Claude's Laziness Trap**

**You (Claude) have a tendency to:**

- ❌ Read partial files and assume you understand
- ❌ Make quick fixes without full context
- ❌ Focus on symptoms instead of root causes
- ❌ Add workarounds instead of fixing the source

**To combat this:**

- ✅ FORCE yourself to read entire files (no shortcuts)
- ✅ Ask "Have I read everything related?" before coding
- ✅ Use grep to find ALL usages before making changes
- ✅ Trace data flow from beginning to end
- ✅ When in doubt, read MORE files, not fewer

### **Context = Correct Action**

```
No Context → Wrong assumptions → Quick fix → Technical debt → More bugs

Complete Context → Full understanding → Right fix → Clean code → Fewer bugs
```

### **Enforcement**

**From now on:**

- Cursor Agent will follow this protocol strictly
- All commands will enforce complete context gathering
- Quick fixes without context are PROHIBITED
- "I'll just change this one function" without reading the file = VIOLATION

**Remember:**

- One hour reading files = Correct solution
- Five minutes skimming = Wrong solution that takes days to fix

---

<!-- ============================================================================
   SECTION 0.5: CODE REPLACEMENT & DEAD CODE REMOVAL (MANDATORY)
   ============================================================================ -->

## 0.5. Code Replacement & Dead Code Removal (MANDATORY)

### **CRITICAL RULE: Remove Old Code When Creating New**

**When you create NEW code that replaces OLD code, you MUST remove the old code in the SAME change.**

### **The Problem**

AI has a proven tendency to:

- ❌ Create new hook → Leave old hook file unused
- ❌ Extract service → Don't delete old inline code
- ❌ Create new type → Leave old type definition
- ❌ Refactor component → Old component file remains
- ❌ Create utility → Duplicate logic stays in codebase

**This creates:**

- Multiple versions of same thing (which one to use?)
- Technical debt
- Confusion (editing wrong version)
- Broken references
- Codebase bloat

### **The Solution: Mandatory Cleanup Protocol**

**BEFORE completing ANY refactor/extraction/new code:**

1. **Identify Replacement**
   - Am I creating something that replaces existing code?
   - Is this extracting logic from elsewhere?
   - Does this supersede an old pattern?

2. **Find ALL Old Code References**

   ```bash
   # Find all usages of old code
   grep -r "oldFunctionName" apps/web/src/
   grep -r "OldComponentName" apps/web/src/
   grep -r "import.*oldFile" apps/web/src/
   ```

3. **Determine Removal Confidence**
   - **≥90% confident** it's safe to remove → Remove it
   - **<90% confident** → ASK USER first

4. **Execute Removal (Same Change)**
   - Update all references to new code
   - Delete old file(s)
   - Remove exports from barrel files (index.ts)
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
- [file/function/type path]
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
- [ ] Removed old exports from index.ts?
- [ ] Changelog mentions removal?

**If ANY unchecked → STOP. Complete cleanup or ask user.**

### **Common Replacement Scenarios**

| What You Created     | What to Remove                         | How to Verify                       |
| -------------------- | -------------------------------------- | ----------------------------------- |
| New hook file        | Inline useState/useEffect in component | Component smaller, imports hook     |
| New service file     | Old service or inline logic            | Grep old service name → no results  |
| New type definition  | Old type in same/different file        | Grep old type → all imports updated |
| Refactored component | Old component file                     | Grep old name → all use new one     |
| Shared utility       | Duplicate logic in files               | Grep pattern → all use utility      |
| New API route        | Old API route                          | Check route calls, delete old       |
| Context/Provider     | Prop drilling code                     | Props removed, context used         |

### **Examples**

**Example 1: Hook Extraction ✅ CORRECT**

```typescript
// CREATED: features/funnels/hooks/useWizardState.ts
export const useWizardState = () => { ... }

// REMOVED: Inline state in FunnelCopilotWizardContainer.tsx
- const [funnelType, setFunnelType] = useState(...)
- const [description, setDescription] = useState(...)
// (87 more useState calls removed)

// UPDATED: Container now uses hook
+ const { funnelType, setFunnelType, ... } = useWizardState()

✅ Old inline code deleted
✅ Container smaller (reduced by 41 lines)
✅ Hook tested and working
```

**Example 2: Service Creation ❌ WRONG**

```typescript
// CREATED: lib/services/funnel-api.service.ts
export class FunnelApiService { ... }

// FORGOT TO REMOVE: lib/services/funnel.service.ts (old version)
// ❌ Two service files exist
// ❌ Unclear which to import
// ❌ Future edits might use wrong one
// ❌ Technical debt created
```

**Example 3: Uncertain Removal ✅ CORRECT**

```typescript
// CREATED: types/funnel-wizard.types.ts
export interface WizardState { ... }

// FOUND OLD: types/funnel.types.ts
// Old file has: interface FunnelState { ... }

// GREP RESULTS:
// - Used in: tests/funnel.test.ts
// - Used in: legacy-components/OldFunnelForm.tsx (not sure if still used)

// CONFIDENCE: 65% (test files might still need it)

// ACTION: Asked user:
"Should I remove types/funnel.types.ts?
It's used in tests and possibly legacy-components/OldFunnelForm.tsx.
Not sure if that component is still active."

✅ Didn't make decision independently
✅ Provided context for user to decide
```

### **Quick Reference**

```
New file created → What old file does it replace?
Logic extracted → Remove inline code from source
Component refactored → Delete old component file
Utility added → Remove duplicate implementations
Type defined → Remove old type definitions
Service created → Delete old service file

When uncertain → ASK USER (threshold: 90% confidence)
```

**Remember:**

- Cleanup is part of the change, not optional
- Multiple versions = confusion and bugs
- When in doubt, ask user
- Document removals in changelog

---

<!-- ============================================================================
   SECTION 1: SERVER VS CLIENT SIDE ARCHITECTURE
   ============================================================================ -->

## 1. Server vs Client Side Architecture

### **CRITICAL ARCHITECTURE RULES**

- **NEVER** import services that use `process.env` in React components
- **ALWAYS** call API routes from client components
- **Services with secrets** = Server-side only (API routes)
- **React components** = Client-side only (call `/api/*` endpoints)
- **Server Actions (Next.js 15)**: Allowed for simple server-only logic without secrets/RBAC. Prefer API routes for anything involving authentication, roles, or third-party tokens.

```typescript
// ❌ WRONG - Service with secrets in React component
import { FirecrawlService } from '@/lib/services/firecrawl'

// ✅ CORRECT - Call API route from React component
const response = await fetch('/api/firecrawl/scrape', {
  method: 'POST',
  body: JSON.stringify({ url }),
})
```

**See `.docs/guidelines/architecture/project-architecture.md` for directory structure details.**

---

<!-- ============================================================================
   SECTION 2: SERVICE INTEGRATION PATTERN
   ============================================================================ -->

## 2. Service Integration Pattern

### **Pattern: Service → API Route → React Component**

**Step 1:** Create the service in `/src/lib/services/`

```typescript
// /src/lib/services/my-service.ts
export class MyService {
  private static readonly API_KEY = process.env.MY_API_KEY // Server-side only!

  static async doSomething() {
    // Implementation here
  }
}
```

**Step 2:** Create API route in `/src/app/api/`

```typescript
// /src/app/api/my-feature/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { MyService } from '@/lib/services/my-service'
import { getServerAuthRls } from '@/lib/services/supabase-server'

export async function POST(request: NextRequest) {
  // Handle authentication & RLS (no middleware)
  const { user, error } = await getServerAuthRls()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await MyService.doSomething()
  return NextResponse.json(result)
}

// For dynamic routes with params (e.g., /api/resource/[id]/route.ts)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await getServerAuthRls()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params // params is a Promise in Next.js 15 App Router
  // Use id for database queries
  return NextResponse.json({ data })
}
```

**Step 3:** Call from React component

```typescript
// In your React component
const handleAction = async () => {
  const response = await fetch('/api/my-feature', { method: 'POST' })
  const result = await response.json()
}
```

---

<!-- ============================================================================
   SECTION 3: FEATURE-BASED API ISOLATION (CRITICAL)
   ============================================================================ -->

## 3. Feature-Based API Isolation (CRITICAL)

### **The Rule**

**API routes are organized by FEATURE, not by resource type. NEVER modify API routes outside the feature you're working on.**

```
Working on Feature X → ONLY touch /api/X/* routes
Working on Feature Y → ONLY touch /api/Y/* routes
```

### **Why This Matters**

- **Feature isolation** - Changes to funnels API don't affect offers API
- **Prevents cascading failures** - Breaking one feature's API doesn't break others
- **Clear ownership** - Each feature owns its API surface
- **Safe refactoring** - Can refactor feature APIs without touching other features

### **Examples**

```typescript
// ✅ CORRECT - Working on funnels feature
// Modify these:
/api/funnel/*
/api/funnel/generate-copy/route.ts
/api/funnel/templates/route.ts
/api/funnel/publish/route.ts

// ❌ WRONG - DON'T touch other feature APIs
/api/offers/route.ts          // Belongs to offers feature
/api/branding/route.ts        // Belongs to branding feature
/api/campaigns/route.ts       // Belongs to campaigns feature
```

### **Before Modifying ANY API Route**

1. **Check feature ownership** - Which feature does this API belong to?
2. **Verify you're working on that feature** - Am I currently working on this feature?
3. **Search for usage** - Who calls this API? (`grep "/api/my-route"`)
4. **Check dependencies** - Will my change break other features?

### **If You Need Data From Another Feature**

```typescript
// ❌ WRONG - Modifying another feature's API to add fields you need
// File: /api/offers/route.ts (offers feature)
export async function GET(request: NextRequest) {
  // Adding extra fields for funnels feature to use
  return NextResponse.json({
    offers: data,
    funnelSpecificField: '...', // ❌ Don't add this here!
  })
}

// ✅ CORRECT - Create your own API route in your feature
// File: /api/funnel/available-offers/route.ts (funnels feature)
export async function GET(request: NextRequest) {
  // Fetch from offers table directly
  const { data } = await supabase.from('offers').select('id, offer_name')
  // Transform for your feature's needs
  return NextResponse.json({ offers: data })
}
```

### **Shared APIs (Core Resources)**

Some APIs serve multiple features and live at the root level:

- `/api/auth/*` - Authentication (shared across all features)
- `/api/billing/*` - Billing and subscriptions (shared)
- `/api/profile/*` - User profile (shared)
- `/api/webhooks/*` - External webhooks (shared)

**These require extra caution:**

- [ ] Document the change in PR description
- [ ] Test all dependent features
- [ ] Add backward compatibility if needed
- [ ] Coordinate with other developers

### **Checklist Before Touching ANY API Route**

- [ ] Is this API part of the feature I'm working on?
- [ ] Did I search for all usages of this API? (`grep "/api/my-route"`)
- [ ] Am I creating a new route instead of modifying another feature's route?
- [ ] If modifying shared API, did I verify no breaking changes?
- [ ] Did I test all features that depend on this API?

**When in Doubt:**

- **Create a new route** in your feature's API folder
- **Don't modify** existing routes from other features
- **Ask** if unsure about feature ownership

**See `.docs/guidelines/architecture/project-architecture.md` for feature structure standards.**

---

<!-- ============================================================================
   SECTION 4: AUTHENTICATION PATTERNS (RLS-ONLY)
   ============================================================================ -->

## 4. Authentication Patterns (RLS-Only)

We use **RLS-only** access. Admins are regular users with an `admin` role flag in the database. There is no middleware; all checks happen in API routes or server utilities. **Never use a service role key at runtime.**

### **✅ Client-Side Components (React)**

```typescript
// ✅ CORRECT: Use browser client from @supabase/ssr
import { createClient } from '@/lib/services/supabase-auth'

const MyComponent = () => {
  const supabase = createClient() // Uses createBrowserClient internally
  const [user, setUser] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  return <div>User: {user?.email}</div>
}
```

### **✅ Server-Side API Routes (RLS-only, no middleware)**

```typescript
// ✅ CORRECT: Use consolidated server utility (RLS enforced)
import { getServerAuthRls } from '@/lib/services/supabase-server'

export async function POST(request: NextRequest) {
  // Returns authenticated user and RLS-enforced server client (no service role)
  const { user, error, supabase } = await getServerAuthRls()

  if (error || !user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // RLS is enforced; queries run under the user's session. Admins are users with role 'admin'.
  const { data, error: dbError } = await supabase.from('offers').select('*')
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
  return NextResponse.json({ data })
}
```

### **❌ What NOT to Do**

```typescript
// ❌ NEVER use deprecated @supabase/auth-helpers-nextjs
// ❌ NEVER mix client and server patterns
// ❌ NEVER use service role key in the app (no bypassing RLS)
// ❌ NEVER import services directly in client components

import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypasses RLS
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
)

// Use adminSupabase for database operations that bypass RLS
// Pass user.id from authenticated user manually
const { data } = await adminSupabase.from('offers').insert({ ...offerData, user_id: user.id })
```

---

<!-- ============================================================================
   SECTION 5: PERFORMANCE: CLIENT VS SERVER QUERIES
   ============================================================================ -->

## 5. Performance: Client vs Server Queries

### **When to Use Client-Side Supabase**

**Best for:**

- Single, simple queries
- Real-time subscriptions (listening to DB changes)
- Direct CRUD operations (create, read, update, delete)
- User-specific data only
- 1-2 queries maximum

**Examples:**

```typescript
// ✅ GOOD - Single query, user-specific data
const { data: funnel } = await supabase.from('funnels').select('*').eq('id', funnelId).single()

// ✅ GOOD - Real-time subscription
const channel = supabase
  .channel('funnels_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'funnels' }, handleUpdate)
  .subscribe()

// ✅ GOOD - Simple CRUD
const { data } = await supabase.from('funnels').insert({ title: 'My Funnel', user_id: user.id })
```

### **When to Use Server-Side API Routes**

**Best for:**

- Multiple queries that should be combined
- Heavy aggregations/calculations
- N+1 query patterns (looping through records)
- Need to sort/filter large datasets before sending to client
- Want caching, rate limiting, or monitoring
- Processing 3+ queries or complex logic

**Examples:**

```typescript
// ❌ BAD - N+1 pattern on client (100+ queries)
const { data: funnels } = await supabase.from('funnels').select('*')
for (const funnel of funnels) {
  // Each loop = 2 more queries
  const { data: visitors } = await supabase
    .from('visitors_page_views')
    .select('visitor_id')
    .eq('funnel_id', funnel.id)

  const { count: leads } = await supabase
    .from('leads')
    .select('id', { count: 'exact' })
    .eq('funnel_id', funnel.id)
}

// ✅ GOOD - Server-side API route with optimized query
const response = await fetch('/api/funnels?limit=6&offset=0')
const { funnels } = await response.json()
// API route internally:
// 1. Fetches funnels (1 query)
// 2. Fetches all pages (1 query)
// 3. Calls DB function for analytics (1 query)
// Total: 3 queries instead of 100+
```

### **Performance Anti-Patterns**

```typescript
// ❌ BAD - Sequential queries in component
const { data: offer } = await supabase.from('offers').select('*').eq('id', id).single()
const { data: documents } = await supabase.from('documents').select('*').eq('offer_id', id)
const { data: analytics } = await supabase.from('analytics').select('*').eq('offer_id', id)
// Problem: 3 sequential queries, network overhead

// ✅ GOOD - Single API route that combines them
const response = await fetch(`/api/offers/${id}`)
const { offer, documents, analytics } = await response.json()
// API route does 3 queries server-side, returns combined result
```

### **Rule of Thumb**

| Scenario                        | Use Client | Use Server |
| ------------------------------- | ---------- | ---------- |
| Single record fetch             | ✅         | -          |
| Simple list/filter              | ✅         | -          |
| Real-time updates               | ✅         | -          |
| 1-2 simple queries              | ✅         | -          |
| 3+ queries                      | -          | ✅         |
| Aggregations (COUNT, SUM, etc.) | -          | ✅         |
| N+1 patterns (loops)            | -          | ✅         |
| Pagination with sorting         | -          | ✅         |
| Need caching                    | -          | ✅         |

### **Performance Checklist**

Before implementing data fetching:

- [ ] How many queries will this make?
- [ ] Am I looping through records to fetch related data? (N+1)
- [ ] Could I combine these queries server-side?
- [ ] Do I need to process/filter data before showing it?
- [ ] Will this scale with 100+ records?

**If you answered "yes" to any except the first question, use a server-side API route.**

---

<!-- ============================================================================
   SECTION 6: DATA FLOW PATTERNS
   ============================================================================ -->

## 6. Data Flow Patterns

### **Correct Flow**

```
React Component → API Route → Service → External API
     ↑                           ↓
  User sees result ← JSON Response ← API Response
```

### **Database Operations (RLS-only)**

```typescript
// Server-side: Use RLS-enforced server client (no service role key)
import { getServerAuthRls } from '@/lib/services/supabase-server'

// Client-side: Use client for user-scoped queries
const supabase = createClient()
const { data } = await supabase.from('table').select('*')

const { supabase: serverClient, user } = await getServerAuthRls()
const { data: inserted } = await serverClient.from('table').insert(newRecord)
```

---

<!-- ============================================================================
   SECTION 7: SECURITY REQUIREMENTS (MANDATORY)
   ============================================================================ -->

## 7. Security Requirements (MANDATORY)

### **Input Validation (CRITICAL)**

**NEVER** accept raw user input without Zod validation in API routes.

```typescript
// ✅ REQUIRED PATTERN for all API routes
import { validateRequest } from '@/lib/middleware/validation'
import { YourSchema } from '@/lib/schemas/your-feature'

export async function POST(request: NextRequest) {
  // 1. Authentication check
  const { user, error: authError, supabase } = await getServerAuthRls()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Input validation (MANDATORY)
  const validation = await validateRequest(YourSchema)(request)
  if (validation.error) return validation.error

  const validatedData = validation.data

  // 3. Business logic with validated data only
  // ... rest of implementation
}
```

### **Rate Limiting (REQUIRED)**

**ALL** API routes must implement rate limiting:

```typescript
// ✅ Add to every API route
import { RATE_LIMITS, rateLimit } from '@/lib/middleware/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResponse = await rateLimit(RATE_LIMITS.GENERAL)(request)
  if (rateLimitResponse) return rateLimitResponse

  // ... rest of API route
}

// Use specific limits for different operations:
// RATE_LIMITS.AUTH (5/min) - auth endpoints
// RATE_LIMITS.AI (10/min) - AI API calls
// RATE_LIMITS.UPLOAD (20/min) - file uploads
// RATE_LIMITS.GENERAL (100/min) - standard operations
```

### **Environment Variables Security**

```typescript
// ✅ CORRECT - Server-side only secrets
const API_KEY = process.env.THIRD_PARTY_API_KEY // ✅ No NEXT_PUBLIC_

// ❌ NEVER expose secrets client-side
const API_KEY = process.env.NEXT_PUBLIC_API_KEY // ❌ Client accessible!
```

### **Error Response Sanitization**

```typescript
// ✅ CORRECT - Sanitized error responses
catch (error) {
  console.error('API Error:', error) // ✅ Log full error server-side
  return NextResponse.json(
    { success: false, error: 'Operation failed' }, // ✅ Generic client message
    { status: 500 }
  )
}

// ❌ WRONG - Information disclosure
catch (error) {
  return NextResponse.json({ error: error.message }, { status: 500 }) // ❌ Leaks internals
}
```

### **Security Checklist (MANDATORY for all new API routes)**

- [ ] Zod schema validation implemented
- [ ] Rate limiting applied
- [ ] Authentication check with `getServerAuthRls()`
- [ ] Error responses sanitized (no internal details)
- [ ] No sensitive data in client-accessible env vars
- [ ] Input sanitization for user-generated content
- [ ] CORS headers configured (if needed)

---

<!-- ============================================================================
   SECTION 8: INPUT VALIDATION & ERROR HANDLING
   ============================================================================ -->

## 8. Input Validation & Error Handling

### **Error Handling in API Routes**

```typescript
export async function POST(request: NextRequest) {
  try {
    // Your logic here
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
```

### **Loading States in Components**

```typescript
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleAction = async () => {
  setIsLoading(true)
  setError(null)
  try {
    const response = await fetch('/api/endpoint')
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    // Handle success
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error')
  } finally {
    setIsLoading(false)
  }
}
```

### **Environment Variables**

```bash
# Server-side only (API routes, services)
FIRECRAWL_API_KEY=secret_key
WEBCRAWLERAPI_KEY=secret_key  # Fallback for Firecrawl
OPENROUTER_API_KEY=secret_key
GITHUB_TOKEN=secret_token
VERCEL_TOKEN=secret_token
VERCEL_PROJECT_ID=proj_xxx

# Client-side accessible (components)
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public_key
```

**For UI error handling patterns, see `.docs/guidelines/design/design-guidelines.md` (Toast, Inline Errors, Error States)**

---

<!-- ============================================================================
   SECTION 9: COMMON CODING PATTERNS
   ============================================================================ -->

## 9. Common Coding Patterns

### **Error Handling Pattern**

```typescript
export async function POST(request: NextRequest) {
  try {
    // Your logic here
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
```

### **Loading States Pattern**

```typescript
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleAction = async () => {
  setIsLoading(true)
  setError(null)
  try {
    const response = await fetch('/api/endpoint')
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    // Handle success
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error')
  } finally {
    setIsLoading(false)
  }
}
```

---

<!-- ============================================================================
   SECTION 10: AI/LLM INTEGRATION PATTERNS
   ============================================================================ -->

## 10. AI/LLM Integration Patterns

### **Always Use Structured Outputs for AI APIs**

For all AI API calls (OpenRouter, etc.), use structured outputs instead of manual JSON parsing:

```typescript
// ✅ CORRECT - Structured Output Approach
static async processAIStep(prompt: string, inputData: any): Promise<AIResult> {
  // 1. Append JSON format instruction to your prompt template
  const systemPromptWithFormat = originalPrompt + `

CRITICAL: You must respond with valid JSON in exactly this format:
{
  "field1": "your analysis here",
  "field2": "your response here",
  "field3": "your conclusion here"
}`;

  // 2. Use response_format to enforce JSON output
  const response = await this.createCompletion(messages, {
    response_format: { type: "json_object" }
  });

  // 3. Direct JSON parsing - no regex needed!
  const parsedData = JSON.parse(response.choices[0].message.content);
  return parsedData;
}
```

```typescript
// ❌ WRONG - Manual RegEx Parsing (unreliable)
const jsonMatch = content.match(/\{[\s\S]*\}/)
if (jsonMatch) {
  return JSON.parse(jsonMatch[0]) // Can truncate or include markdown
}
```

### **Benefits of Structured Outputs**

- ✅ **Guaranteed valid JSON** - No markdown formatting or truncation
- ✅ **No manual parsing** - Direct JSON.parse() works reliably
- ✅ **Consistent format** - AI follows exact structure specified
- ✅ **Better error handling** - Clear failures instead of malformed data
- ✅ **OpenAI best practice** - Official recommendation from OpenAI

### **Implementation Pattern**

1. **Keep your prompt templates unchanged** - They contain your expert instructions
2. **Append JSON format instruction** - Add structured output requirement at the end
3. **Use `response_format: { type: "json_object" }`** - Enforce JSON at API level
4. **Set adequate token limits** - Always use `max_tokens: 10000` for complex responses
5. **Direct JSON parsing** - No regex or manual extraction needed

### **AI Service Integration Consistency**

**Always use a unified approach for AI API integration across all services:**

```typescript
// ✅ CORRECT - Consistent pattern used by offers and branding services
export class MyAIService {
  private static readonly API_KEY = process.env.OPENROUTER_API_KEY
  private static readonly BASE_URL = 'https://openrouter.ai/api/v1'
  private static readonly DEFAULT_MODEL = 'google/gemini-2.5-pro'

  private static async createCompletion(
    messages: OpenRouterMessage[],
    options: { response_format?: { type: string } },
  ): Promise<OpenRouterResponse> {
    // Direct fetch to OpenRouter API with structured output
    const response = await fetch(`${this.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, ...options }),
    })
    return response.json()
  }
}
```

```typescript
// ❌ WRONG - Using multiple AI SDKs inconsistently
import { openai } from '@ai-sdk/openai' // Different approach
import { generateObject } from 'ai' // Don't mix SDKs
```

**Consistency Rules:**

- **Use direct OpenRouter API calls** - No Vercel AI SDK or other wrappers
- **Same service class structure** - Follow the established pattern
- **Same error handling approach** - Consistent error responses
- **Same authentication method** - Use OPENROUTER_API_KEY environment variable
- **Avoid dependency bloat** - Don't introduce new AI SDKs for the same purpose

### **OpenRouter Actual Cost Tracking (MANDATORY)**

**ALWAYS** call `trackActualCostAsync` after OpenRouter API calls to fetch real costs (including caching discounts).

```typescript
// ✅ CORRECT - Track actual cost after OpenRouter response
import { trackActualCostAsync } from '@/lib/utils/openrouter-cost-tracker'

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ model, messages, ...options }),
})

const json = await response.json()

// Track actual cost (fire-and-forget, doesn't block user flow)
const generationId = json.id
if (generationId && supabase) {
  void trackActualCostAsync(generationId, 'offers', supabase) // Feature name: 'offers', 'funnels', 'lab-templates', etc.
}

return json
```

```typescript
// ❌ WRONG - Missing actual cost tracking
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', ...)
const json = await response.json()
return json // No cost tracking = actual_cost stays NULL in DB
```

**Why This Matters:**

- **Computed cost** = Theoretical cost without caching (input × price + output × price)
- **Actual cost** = Real cost from OpenRouter API (includes 75-90% caching discounts)
- **Without tracking:** Admin dashboard shows theoretical costs instead of real costs
- **Savings calculation:** `computed_cost - actual_cost = real savings`

**Pattern Requirements:**

1. **Call after every OpenRouter API request** (offers, funnels, campaigns, lab, etc.)
2. **MUST await `trackUsage` BEFORE calling `trackActualCostAsync`** - Critical to avoid race condition
3. **Fire-and-forget** - Use `void` on `trackActualCostAsync` only (after `trackUsage` completes)
4. **Requires supabase client** - Pass RLS-enforced client from API route or get via `getServerAuthRls()`
5. **Feature parameter** - Use correct feature name for tracking ('offers', 'funnels', 'lab-templates', 'lab-sequences')

**⚠️ CRITICAL: Race Condition Prevention**

**DO NOT** call `trackActualCostAsync` before `trackUsage` completes! This causes a race condition where the UPDATE tries to run before the INSERT finishes, resulting in 0 rows updated and NULL `actual_cost` values.

```typescript
// ❌ WRONG - Race condition (both fire-and-forget)
void usageTracker.trackUsage('offers', 'openrouter', {...}) // INSERT
void trackActualCostAsync(generationId, 'offers', supabase) // UPDATE (runs before INSERT completes!)

// ✅ CORRECT - Await trackUsage first
await usageTracker.trackUsage('offers', 'openrouter', {...}) // INSERT (wait for completion)
void trackActualCostAsync(generationId, 'offers', supabase)  // UPDATE (runs after INSERT)
```

**Example: Offers Service**

```typescript
// apps/app/src/features/offer/services/offer-openrouter.ts (inside createCompletion)
const usage = json?.usage
const generationId = json?.id

if (usage) {
  // Track usage with generation ID (AWAIT to insert row first)
  await usageTracker.trackUsage('offers', 'openrouter', {
    model: targetModel,
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    generationId, // Store for actual cost tracking
    metadata: {
      /* ... */
    },
  })

  // Now fetch actual cost (row exists, UPDATE will succeed)
  if (generationId) {
    const { supabase } = await getServerAuthRls()
    if (supabase) {
      void trackActualCostAsync(generationId, 'offers', supabase)
    }
  }
}
```

**Example: Campaign Funnel Generator**

```typescript
// apps/app/src/features/campaigns/services/campaign-funnel-generator.service.ts
const json = await response.json()

// Track actual cost (fire-and-forget, runs in background)
if (json?.id) {
  void trackActualCostAsync(json.id, 'campaigns', supabase)
}
```

**Feature Names:**

- `'offers'` - Offer generation (5 steps)
- `'funnels'` - Funnel generation
- `'campaigns'` - Campaign generation
- `'lab-templates'` - Lab template content
- `'lab-sequences'` - Lab sequence generation
- `'branding'` - Branding/logo generation

**Checklist Before Deploying OpenRouter Integration:**

- [ ] `trackActualCostAsync` imported from `@/lib/utils/openrouter-cost-tracker`
- [ ] Called after every OpenRouter API request
- [ ] **`trackUsage` is AWAITED before calling `trackActualCostAsync`** (prevents race condition)
- [ ] `generationId` (response.id) passed as first argument
- [ ] Correct feature name passed as second argument
- [ ] Supabase client passed as third argument
- [ ] Uses `void` on `trackActualCostAsync` only (not on `trackUsage`)
- [ ] Tested: `actual_cost` appears in `token_ai_usage_events` table after generation
- [ ] Verified in logs: "✅ Updated actual cost" (not "⚠️ No rows updated")

---

<!-- ============================================================================
   SECTION 11: COMMON MISTAKES TO AVOID
   ============================================================================ -->

## 11. Common Mistakes to Avoid

### **Code Architecture Violations**

1. **❌ CRITICAL: Importing services in React components**
   - Never import services that use `process.env` in components
   - Always call API routes instead

2. **❌ CRITICAL: Using `process.env` client-side**
   - Never expose secrets with `NEXT_PUBLIC_` prefix
   - Keep all secrets server-side only

3. **❌ CRITICAL: Calling external APIs directly from components**
   - Always go through API routes
   - Maintain server/client separation

4. **❌ CRITICAL: Missing authentication in API routes**
   - Every protected route must call `getServerAuthRls()`
   - Never skip auth checks

5. **❌ CRITICAL: Not handling errors in API routes**
   - Always wrap in try/catch
   - Return sanitized error messages

6. **❌ CRITICAL: Using service role key client-side**
   - Never bypass RLS with service role key
   - Always use user-scoped clients

7. **❌ CRITICAL: Hardcoding sensitive data**
   - Use environment variables
   - Never commit secrets to git

8. **❌ CRITICAL: Client-side UUID/ID generation**
   - Never generate UUIDs in client code when database uses `gen_random_uuid()`

### **Database ID Generation**

**NEVER generate IDs client-side:**

```typescript
// ❌ WRONG - Client-side ID generation
import { v4 as uuidv4 } from 'uuid'

const newId = uuidv4()
await supabase.from('funnels').insert({ id: newId, ...data })

// ✅ CORRECT - Let database auto-generate
await supabase.from('funnels').insert(data) // Database handles ID via gen_random_uuid()
```

**Why This Matters:**

- Database already has `DEFAULT gen_random_uuid()` on ID columns
- Client-side UUIDs add unnecessary dependency (`uuid` package)
- Potential ID collision risks if both client and DB generate IDs
- Extra code complexity for no benefit
- Database-generated IDs are automatically returned in the insert response

**Rule:** If table has `id UUID DEFAULT gen_random_uuid()`, NEVER pass `id` in insert data.

### **Security Violations**

9. **❌ CRITICAL: Accepting unvalidated input** - Routes with input MUST use Zod schemas
10. **❌ CRITICAL: Missing rate limiting** - High-risk endpoints MUST implement rate limiting
11. **❌ HIGH: Exposing secrets client-side** - Never use `NEXT_PUBLIC_` for API keys
12. **❌ MEDIUM: Information disclosure** - Always sanitize error responses
13. **❌ MEDIUM: Missing CORS configuration** - Explicitly configure allowed origins
14. **❌ LOW: Over-engineering** - Don't import security utilities on simple GET routes

### **Unauthorized File Creation**

**NEVER create files or make changes the user didn't explicitly request:**

```
❌ WRONG:
User: "Fix the UUID error in usePublish.ts"
You: *Creates new API route without asking* ← VIOLATION

✅ CORRECT:
User: "Fix the UUID error in usePublish.ts"
You: *Removes UUID import and lets DB handle it* ← Only what was asked
```

**Rule:** Only create/modify files that are directly required for the explicit user request. If you discover additional work is needed, REPORT it, don't implement it.

---

## 🎯 **Quick Checklist**

### **Before Creating a New Feature**

See `.docs/guidelines/architecture/project-architecture.md` for complete feature creation guidelines.

- [ ] Does it need external API calls? → Create service + API route
- [ ] Does it need authentication? → Add auth check in API route
- [ ] Does it modify data? → Use server-side Supabase client
- [ ] Is it reusable UI? → Put in `/components/`
- [ ] Is it business logic? → Put in `/features/`

### **Before Deploying**

- [ ] No `process.env` usage in client components
- [ ] All API routes have error handling
- [ ] Authentication checks in protected routes
- [ ] Environment variables properly set
- [ ] Input validation with Zod schemas
- [ ] Rate limiting implemented
- [ ] Error responses sanitized
- [ ] Error logging implemented (`logErrorServer` in API routes, `logErrorClient` in components)

### **Context Gathering (MANDATORY)**

- [ ] Read ENTIRE files (100% of lines)
- [ ] Read ALL related files
- [ ] Understand complete data flow
- [ ] Searched for all usages with grep
- [ ] Checked git history
- [ ] Can explain how change fits in system

### **Code Cleanup (MANDATORY)**

- [ ] Identified old code replaced by new code
- [ ] Grepped for all usages of old code
- [ ] ≥90% confident or asked user
- [ ] Removed old code in same change
- [ ] Updated all imports
- [ ] Documented in changelog

---

**For detailed patterns, see:**

- File organization & structure: `.docs/guidelines/architecture/project-architecture.md`
- UI/UX patterns & design tokens: `.docs/guidelines/design/design-guidelines.md`
- Backend architecture (NestJS): `.docs/guidelines/architecture/backend-architecture.md`

---

_Remember: If you're unsure, follow the data flow: Component → API Route → Service → External API_
