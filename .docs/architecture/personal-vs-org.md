# Personal vs Organization Scope

## Canonical Model

Vibey has two separate working contexts:

- **Personal account**: rows belong to one user and have `org_id IS NULL`.
- **Organization**: rows belong to an organization and have `org_id = <organization uuid>`.

The frontend signals the context through the `X-Org-Id` header:

- Personal account: omit `X-Org-Id`.
- Organization: send `X-Org-Id`.

`OrgContextGuard` turns that into request scope:

- Personal account: `orgId = null`, `orgRole = null`.
- Organization: `orgId = <uuid>`, `orgRole = <member role>`.

## Query Scoping

Use `applyOwnerScope` from `@vibey/api-shared` for user/org-owned tables.

```ts
applyOwnerScope(query, { userId, orgId })
```

It applies:

- Organization: `org_id = orgId`.
- Personal account: `user_id = userId AND org_id IS NULL`.

Do not write local versions of this helper. Do not scope personal queries by `user_id` only; that can leak rows the user created inside an organization.

## Insert Scoping

Use `resolveScopedOrgId` from `@vibey/api-shared` when writing scoped rows:

```ts
{
  user_id: userId,
  org_id: resolveScopedOrgId({ orgId }),
}
```

It returns:

- Organization: the organization UUID.
- Personal account: `null`.

Do not use `orgId ?? userId`. The database now rejects `org_id = user_id` on the migrated space tables.

## Permissions

Personal account rows do not use team-style permission checks. The owner is the owner.

For spaces, the permission resolver grants:

- `space.user_id === userId` → `admin`.
- Organization spaces → org role baseline plus sharing policies.

Organization RBAC still runs for organization context only.

## Auth Access Routing

`account_mode = 'org_only'` makes a profile fully onboarded for auth routing, but it does
not grant dashboard access by itself. Dashboard access still requires one of:

- an active or trialing personal subscription
- an active `org_members` row

If an org-only profile has no active org membership and no active subscription, middleware sends
the user to `/no-org-access` instead of `/onboarding`. `/onboarding` remains the setup and
subscription flow for personal accounts.

Access checks that time out or throw are treated as `unknown`, not denied. Middleware should not
send users to onboarding or no-org-access from an unknown access result; downstream pages and APIs
remain responsible for enforcing their own data access.

## Default Startup Account

The durable startup preference lives on `profiles`:

- `default_account_mode = 'personal'` with `default_org_id IS NULL`.
- `default_account_mode = 'org'` with `default_org_id = <organization uuid>`.

The frontend still uses `vibey-active-org` as session-only tab state. On dashboard bootstrap,
`/api/profile` provides the saved preference and `/api/org/my` validates that the saved org is
still an active membership before the app enters org context. A URL `?org=<uuid>` remains an
explicit override for links and new tabs.

The preference is updated through `PATCH /api/profile/default-account`. Org defaults must pass
server-side active membership validation before `profiles.default_org_id` is saved.

## Migrated Space Tables

These tables support personal account rows with `org_id IS NULL`:

- `spaces`
- `space_items`
- `space_drive_folder_mappings`
- `space_drive_push_channels`

The migration `normalize_personal_org_scope`:

- Dropped `NOT NULL` on `org_id` for those tables.
- Backfilled personal `spaces` and `space_items` from `org_id = user_id` to `NULL`.
- Added CHECK constraints forbidding `org_id = user_id`.

## Brain Scope

Personal default brains are user-owned rows and must have `org_id IS NULL`:

```ts
ns_brains.owner_id = userId
ns_brains.scope = 'user'
ns_brains.is_default = true
ns_brains.org_id = null
```

Do not create or resolve an organization-scoped default user brain. Organizations own specific non-default brain types instead:

- Company Brain: `scope = 'company'`, `org_id = <organization uuid>`, `is_default = false`.
- Customer Brain: `scope = 'customer'`, `org_id = <organization uuid>` for org workspaces, `is_default = false`.
- Agent Brain: `scope = 'agent'`, keyed by `agent_id`.
- Campaign Brain: `scope = 'campaign'`, keyed by `campaign_id`.

The migration `personal_default_brain_scope`:

- Backfilled `ns_brains` default user rows from `org_id IS NOT NULL` to `NULL`.
- Added a check constraint forbidding `scope = 'user' AND is_default = true AND org_id IS NOT NULL`.
- Added a personal default unique index for `owner_id` where `scope = 'user' AND is_default = true AND org_id IS NULL`.

## Verification Queries

No scoped table should intentionally use `org_id = user_id`:

```sql
select count(*)
from spaces
where org_id = user_id;
```

For the migrated tables, expected personal rows:

```sql
select count(*)
from spaces
where org_id is null;
```

For personal default brains, expected invalid rows:

```sql
select count(*)
from ns_brains
where scope = 'user'
  and is_default is true
  and org_id is not null;
```

Expected result: `0`.
