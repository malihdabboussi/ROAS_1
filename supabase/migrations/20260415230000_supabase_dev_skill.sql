-- supabase-dev skill for Viktor (widget_builder agent)
-- System-level skill (user_id = NULL) so all Viktor instances get it.
-- Teaches Viktor how to build Supabase-powered features: auth, database, RLS.

INSERT INTO agent_skills (user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled)
VALUES (
  NULL,
  NULL,
  'widget_builder',
  'supabase-dev',
  'Supabase Development',
  'Build Supabase-powered features in Vibey projects — database schemas, authentication, RLS policies, and data seeding. Use when the user mentions database, tables, auth, login, signup, authentication, RLS, row level security, Supabase, user accounts, sign in, sign up, password reset, or wants to store/query data in their project. Also use when creating a new app that needs a backend, even if the user does not explicitly mention Supabase.',
  $skill_body$# Supabase Development

Build database schemas, authentication flows, and RLS policies for Vibey projects using the linked Supabase instance.

## Before You Start

1. Check if the project has Supabase linked — call `supabase_list_tables` with the project_id. If it fails with "not linked", tell the user to open the Database tab in their project and connect their Supabase account first.

2. Install dependencies via `update_project_deps`:
```json
{"action":"update_project_deps","data":{"project_id":"UUID","dependencies":{"@supabase/supabase-js":"^2","@supabase/ssr":"^0.5"}}}
```

3. Check if `lib/supabase/client.ts` exists (call `read_file`). If not, set up the auth infrastructure first — read `references/auth-setup.md`.

## When to Read Which Reference

| User wants... | Read this |
|---------------|-----------|
| Set up Supabase client, middleware, session handling | `references/auth-setup.md` |
| Login page, signup page, password reset UI | `references/auth-pages.md` |
| Create tables, design schema, add RLS policies | `references/database-schema.md` |
| Seed data, chain multiple DB actions, bootstrap an app | `references/action-patterns.md` |

For a full app bootstrap (user says "build me an app with auth and a database"), read in this order:
1. `references/auth-setup.md` — create client utilities + middleware
2. `references/database-schema.md` — design and create tables with RLS
3. `references/auth-pages.md` — build the login/signup UI
4. `references/action-patterns.md` — seed initial data

## Action Quick Reference

| Action | Use for |
|--------|---------|
| `supabase_list_tables` | See current schema (tables, columns, types, PKs, row counts) |
| `supabase_create_table` | Create a new table with typed columns. RLS enabled by default |
| `supabase_run_sql` | Any SQL: ALTER TABLE, CREATE INDEX, RLS policies, triggers, FKs, complex queries |
| `supabase_insert_rows` | Insert one or more rows (seeding, initial data) |
| `supabase_update_rows` | Update a row by primary key |
| `supabase_delete_rows` | Delete a row by primary key |

Use `supabase_create_table` for straightforward tables. Use `supabase_run_sql` for anything complex (foreign keys, unique constraints, multi-column PKs, triggers, indexes, RLS policies).

## File Placement (Next.js App Router)

```
lib/supabase/client.ts     — Browser client (createBrowserClient)
lib/supabase/server.ts     — Server client (createServerClient + cookies)
middleware.ts              — Session refresh on every request
app/auth/callback/route.ts — OAuth & email confirmation callback
app/(auth)/login/page.tsx  — Login page
app/(auth)/signup/page.tsx — Signup page
app/(auth)/layout.tsx      — Centered auth layout
```

## Key Principles

- Use `getUser()` for authorization checks, not `getSession()`. `getSession` reads cookies without verification — it can be spoofed. `getUser` contacts the Supabase Auth server and validates the JWT.
- Always enable RLS on every table. A table without RLS is publicly readable/writable.
- Link user-owned tables to `auth.users` via a `user_id uuid REFERENCES auth.users(id)` column.
- Create a `profiles` table as the first step when adding auth — it extends the built-in `auth.users` with app-specific fields.
$skill_body$,
  true
);

-- Reference: auth-setup.md
INSERT INTO agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content)
VALUES (
  NULL,
  NULL,
  'widget_builder',
  'supabase-dev',
  'references/auth-setup.md',
  $auth_setup$# Auth Setup — Infrastructure Files

Complete, copy-paste-ready files for Supabase Auth in a Next.js App Router project. Create these files before building any auth UI pages.

## 1. Browser Client — `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Use in Client Components (`'use client'`). The browser client is a singleton — calling `createClient()` multiple times returns the same instance.

## 2. Server Client — `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll is called from Server Components where cookies can't be set.
            // This is safe to ignore — middleware handles the refresh.
          }
        },
      },
    }
  )
}
```

Use in Server Components, Server Actions, and Route Handlers. Always `await createClient()` — it's async because `cookies()` is async in Next.js 15+.

## 3. Middleware — `middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

This refreshes the auth token on every request and redirects unauthenticated users to `/login`. Adjust the protected route check for your app's needs.

## 4. Auth Callback — `app/auth/callback/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) next = '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

Handles both OAuth provider callbacks and email confirmation links. The `next` parameter lets you redirect to a specific page after auth.

## 5. Protected Route Pattern

In any Server Component or Route Handler where you need the current user:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <div>Hello {user.email}</div>
}
```

Use `getUser()` — it validates the JWT with the Supabase Auth server. Never use `getSession()` for authorization because it reads cookies without verification.

## 6. Sign Out — Server Action

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

Call from a form or button: `<form action={signOut}><button type="submit">Sign Out</button></form>`

## 7. Sign In with Email/Password — Server Action

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) redirect('/login?error=' + encodeURIComponent(error.message))
  redirect('/')
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) redirect('/signup?error=' + encodeURIComponent(error.message))
  redirect('/signup?message=Check your email to confirm your account')
}
```
$auth_setup$
);

-- Reference: database-schema.md
INSERT INTO agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content)
VALUES (
  NULL,
  NULL,
  'widget_builder',
  'supabase-dev',
  'references/database-schema.md',
  $db_schema$# Database Schema Patterns

Postgres schema patterns for Supabase projects. Use `supabase_create_table` for simple tables and `supabase_run_sql` for RLS, triggers, indexes, and foreign keys.

## Standard Column Patterns

Every table should have these baseline columns:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key |
| `created_at` | `timestamptz` | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `now()` | Last modified (use trigger) |
| `user_id` | `uuid` | — | FK to `auth.users(id)` for RLS |

## Profiles Table (Create First When Adding Auth)

The profiles table extends `auth.users` with app-specific fields. The `id` column references `auth.users` directly — not a separate UUID.

```sql
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

Optionally auto-create a profile on signup with a trigger:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Auto-Updated_at Trigger

Reusable trigger function — create once, attach to any table:

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to a table:
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

## RLS Policy Templates

Always enable RLS on every public table. A table without RLS is readable/writable by anyone with the anon key.

**User owns row (most common):**
```sql
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own posts"
  ON public.posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Public read, authenticated write:**
```sql
CREATE POLICY "Anyone can read"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);
```

**Admin only:**
```sql
CREATE POLICY "Admins only"
  ON public.admin_settings FOR ALL
  USING ((auth.jwt() ->> 'role') = 'admin');
```

## Common App Schemas

### Blog / Content App

```sql
-- Posts
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### E-Commerce

```sql
-- Products (public read)
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Orders (user-owned)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
  total_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL
);
```

### Project Management

```sql
-- Projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  status text DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  assigned_to uuid REFERENCES auth.users(id),
  due_date date,
  created_at timestamptz DEFAULT now()
);
```

For each schema above, after creating tables run RLS + triggers via `supabase_run_sql`.
$db_schema$
);

-- Reference: action-patterns.md
INSERT INTO agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content)
VALUES (
  NULL,
  NULL,
  'widget_builder',
  'supabase-dev',
  'references/action-patterns.md',
  $action_pat$# Action Patterns — Workflow Recipes

Step-by-step sequences using Viktor's `supabase_*` actions for common tasks.

## Bootstrap a New App

When the user wants a new app with auth and a database, run these actions in order:

**Step 1 — Check current state:**
```json
{"action":"supabase_list_tables","label":"Checking database schema","data":{"project_id":"UUID"}}
```

**Step 2 — Create profiles table:**
```json
{"action":"supabase_create_table","label":"Creating profiles table","data":{
  "project_id":"UUID",
  "table_name":"profiles",
  "columns":[
    {"name":"id","type":"uuid","primary_key":true},
    {"name":"full_name","type":"text"},
    {"name":"avatar_url","type":"text"},
    {"name":"created_at","type":"timestamptz","default":"now()"},
    {"name":"updated_at","type":"timestamptz","default":"now()"}
  ]
}}
```

Note: for profiles linked to auth.users, prefer `supabase_run_sql` so you can add the FK reference:
```json
{"action":"supabase_run_sql","label":"Creating profiles with auth link","data":{
  "project_id":"UUID",
  "query":"CREATE TABLE public.profiles (id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY, full_name text, avatar_url text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()); ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; CREATE POLICY \"Users manage own profile\" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);"
}}
```

**Step 3 — Add auto-updated_at trigger:**
```json
{"action":"supabase_run_sql","label":"Adding updated_at trigger","data":{
  "project_id":"UUID",
  "query":"CREATE OR REPLACE FUNCTION public.update_updated_at() RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql; CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();"
}}
```

**Step 4 — Seed sample data:**
```json
{"action":"supabase_insert_rows","label":"Seeding test data","data":{
  "project_id":"UUID",
  "table":"profiles",
  "rows":[
    {"full_name":"Alice Demo","avatar_url":null},
    {"full_name":"Bob Test","avatar_url":null}
  ]
}}
```

**Step 5 — Set up auth infrastructure files** using `create_file` / `update_file` with templates from `references/auth-setup.md`.

## Add a Feature Table

When adding a new feature to an existing app:

1. `supabase_list_tables` — check what exists
2. `supabase_create_table` or `supabase_run_sql` — create the table
3. `supabase_run_sql` — add RLS policies, foreign keys, indexes

Example adding a "posts" feature:
```json
{"action":"supabase_run_sql","label":"Creating posts table with RLS","data":{
  "project_id":"UUID",
  "query":"CREATE TABLE public.posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, title text NOT NULL, content text, published boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()); ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY; CREATE POLICY \"Users manage own posts\" ON public.posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); CREATE POLICY \"Public can read published\" ON public.posts FOR SELECT USING (published = true); CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();"
}}
```

## When to Use Which Action

| Scenario | Action | Why |
|----------|--------|-----|
| Simple table, no FKs | `supabase_create_table` | Structured input, RLS auto-enabled |
| Table with FK references | `supabase_run_sql` | `create_table` can't express REFERENCES |
| ALTER TABLE (add column) | `supabase_run_sql` | Only DDL tool for modifications |
| CREATE INDEX | `supabase_run_sql` | No dedicated index action |
| RLS policies | `supabase_run_sql` | Always SQL |
| Insert 1-10 rows | `supabase_insert_rows` | Structured, per-row |
| Insert 100+ rows | `supabase_run_sql` | Single bulk INSERT is faster |
| Complex SELECT/JOIN | `supabase_run_sql` | Direct SQL query |

## Reading supabase_list_tables Output

The response looks like:
```json
{
  "success": true,
  "tables": [
    {
      "name": "profiles",
      "columns": [
        {"name": "id", "dataType": "uuid", "isNullable": false, "isPrimaryKey": true, "defaultValue": "gen_random_uuid()"},
        {"name": "full_name", "dataType": "text", "isNullable": true, "isPrimaryKey": false, "defaultValue": null}
      ],
      "rowCount": 42
    }
  ]
}
```

Use this to understand the current schema before making changes. Check column types and PKs to avoid conflicts.
$action_pat$
);

-- Reference: auth-pages.md
INSERT INTO agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content)
VALUES (
  NULL,
  NULL,
  'widget_builder',
  'supabase-dev',
  'references/auth-pages.md',
  $auth_pages$# Auth Pages — TSX Templates

Production-quality auth page patterns for Next.js App Router with Supabase. Each example shows a different visual approach — adapt the layout and styling to match the user's project while keeping the Supabase auth logic intact.

When building auth pages, follow these rules:
- Import `createClient` from `@/lib/supabase/client` (browser client) for client-side auth actions
- Use server actions from `@/lib/supabase/server` for form submissions when possible
- Always handle loading, error, and success states
- Validate email format and password length (min 6 chars for Supabase) before calling auth
- Include links between login/signup/forgot-password pages
- For OAuth, redirect to `/auth/callback` (the route handler from auth-setup.md)

## Shared UI Components

### Dialog Component (Radix-based)

Use for modal auth forms or confirmation dialogs. Based on `@radix-ui/react-dialog`:

```tsx
// components/ui/dialog.tsx
"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 rounded-lg p-1 opacity-70 hover:opacity-100 transition-opacity">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));

export { Dialog, DialogClose, DialogContent, DialogPortal, DialogTrigger };
```

### Glass Input Component

Premium input with hover-glow border effect:

```tsx
// components/ui/glass-input.tsx
"use client";

import { useState } from "react";

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export function GlassInput({ label, icon, error, className, ...props }: GlassInputProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  return (
    <div className="w-full">
      {label && <label className="block mb-2 text-sm text-muted-foreground">{label}</label>}
      <div className="relative">
        <input
          className={`w-full h-12 px-4 rounded-xl border border-border bg-card/50 text-sm backdrop-blur-sm outline-none transition-all focus:border-primary focus:bg-card ${icon ? "pr-10" : ""} ${error ? "border-destructive" : ""} ${className ?? ""}`}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          {...props}
        />
        {hovering && (
          <div
            className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none rounded-t-xl"
            style={{
              background: `radial-gradient(30px circle at ${mousePos.x}px 0px, hsl(var(--primary)) 0%, transparent 70%)`,
            }}
          />
        )}
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        )}
      </div>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}
```

## Pattern A: Centered Card Login

Clean, minimal card centered on screen. Best for simple apps.

```tsx
// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { LogIn, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required"); return; }
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) { setError(authError.message); setLoading(false); return; }
    router.push("/");
    router.refresh();
  };

  const handleOAuth = async (provider: "google" | "github") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 shadow-xl">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-6">
          <LogIn className="w-6 h-6 text-primary" />
        </div>

        <h1 className="text-2xl font-semibold text-center mb-2">Sign In</h1>
        <p className="text-muted-foreground text-sm text-center mb-6">
          Welcome back — enter your credentials
        </p>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex justify-between items-center text-sm">
            {error && <p className="text-destructive text-xs">{error}</p>}
            <Link href="/forgot-password" className="text-primary text-xs hover:underline ml-auto">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="flex items-center my-4">
          <span className="flex-1 border-t border-border" />
          <span className="px-3 text-xs text-muted-foreground">Or continue with</span>
          <span className="flex-1 border-t border-border" />
        </div>

        <div className="flex gap-3">
          <button onClick={() => handleOAuth("google")} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-sm">
            Google
          </button>
          <button onClick={() => handleOAuth("github")} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-sm">
            GitHub
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account? <Link href="/signup" className="text-primary hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
```

## Pattern B: Split-Screen Login

Left panel with branding/image, right panel with form. Best for marketing-focused apps.

```tsx
// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) { setError(authError.message); setLoading(false); return; }
    router.push("/");
    router.refresh();
  };

  const handleOAuth = async (provider: "google" | "github") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: branding */}
      <div className="hidden md:flex flex-1 bg-primary/5 items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome back</h1>
          <p className="text-muted-foreground text-lg">
            Sign in to continue building with your team.
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Sign In</h2>
            <p className="text-muted-foreground mt-2">Access your account</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="mt-1 rounded-xl border border-border bg-card/50 backdrop-blur-sm focus-within:border-primary transition-colors">
                <input
                  type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent p-4 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Password</label>
              <div className="mt-1 rounded-xl border border-border bg-card/50 backdrop-blur-sm focus-within:border-primary transition-colors relative">
                <input
                  type={showPassword ? "text" : "password"} placeholder="Enter your password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent p-4 pr-12 rounded-xl text-sm focus:outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-primary hover:underline">Reset password</Link>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <span className="w-full border-t border-border" />
            <span className="px-4 text-sm text-muted-foreground bg-background absolute">Or continue with</span>
          </div>

          <button onClick={() => handleOAuth("google")} className="w-full flex items-center justify-center gap-3 border border-border rounded-xl py-4 hover:bg-muted/50 transition-colors">
            Continue with Google
          </button>

          <p className="text-center text-sm text-muted-foreground">
            New here? <Link href="/signup" className="text-primary hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

## Pattern C: Signup Page

```tsx
// app/(auth)/signup/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (authError) { setError(authError.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Check your email</h2>
          <p className="text-muted-foreground text-sm mb-4">
            We sent a confirmation link to <strong>{email}</strong>
          </p>
          <Link href="/login" className="text-primary text-sm hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-center mb-2">Create Account</h1>
        <p className="text-muted-foreground text-sm text-center mb-6">Get started for free</p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <input
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="password" placeholder="Password (min 6 characters)" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="password" placeholder="Confirm password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          {error && <p className="text-destructive text-sm">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account? <Link href="/login" className="text-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
```

## Pattern D: Forgot Password & Reset

```tsx
// app/(auth)/forgot-password/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (resetError) { setError(resetError.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-center mb-2">Reset Password</h1>
        <p className="text-muted-foreground text-sm text-center mb-6">
          Enter your email and we'll send you a reset link
        </p>

        {sent ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Check your email for the reset link.</p>
            <Link href="/login" className="text-primary text-sm hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
```

```tsx
// app/(auth)/reset-password/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) { setError(updateError.message); setLoading(false); return; }
    router.push("/login?message=Password updated successfully");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-center mb-2">New Password</h1>
        <p className="text-muted-foreground text-sm text-center mb-6">Enter your new password</p>

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="password" placeholder="New password (min 6 characters)" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="password" placeholder="Confirm new password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## Pattern E: Auth Layout

Wrap all auth pages in a centered layout:

```tsx
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
```

## Adapting to the User's Project

When building auth pages, adapt these patterns to match the user's existing project:
- Check if a theme exists — use the project's color tokens and typography
- Match the existing layout patterns (centered vs split-screen based on other pages)
- Use the same component library already in the project (shadcn, custom, etc.)
- Keep the Supabase auth logic (createClient, signInWithPassword, signInWithOAuth, signUp, resetPasswordForEmail, updateUser) — only change the UI layer
$auth_pages$
);
