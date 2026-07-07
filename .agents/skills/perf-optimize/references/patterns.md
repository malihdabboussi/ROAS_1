# Fix Patterns Catalog

Each pattern: when it applies, how to implement it in this codebase, and a real
example already merged. Reuse the existing utilities because two caching systems
that half-overlap are worse than one.

## Contents

1. [cachedFetch - dedupe + TTL for repeated GETs](#1-cachedfetch)
2. [createCachedResource - singleton list resources](#2-createcachedresource)
3. [Snapshot/restore SWR caches in stores](#3-snapshotrestore-swr-caches-in-stores)
4. [Collapse N+1 into batched endpoints](#4-collapse-n1-into-batched-endpoints)
5. [Load-signature guards against dependency churn](#5-load-signature-guards)
6. [Eliminate duplicate mounts](#6-eliminate-duplicate-mounts)
7. [Lazy-load heavy subtrees](#7-lazy-load-heavy-subtrees)
8. [Backend payload and query fixes](#8-backend-payload-and-query-fixes)
9. [Anti-pattern checklist for audits](#9-anti-pattern-checklist)

## 1. cachedFetch

**File:** `apps/web/src/lib/cache/keyed-fetch-cache.ts`

**When:** any GET that fires on component mount and returns data that changes
rarely (models, skills, workflows, integrations, campaign lists), or any fetch
where concurrent duplicates (StrictMode double-effects, duplicate mounts) would
otherwise fire twice.

```ts
// TTL reuse - static-ish data refetched at most every 5 min:
cachedFetch(`agent-skills:${agentKey}`, () => backendGet(...), { ttlMs: 300_000 })

// ttl 0 = dedupe only - concurrent callers share one request, sequential refetch:
cachedFetch(`space-items:${spaceId}:${queryKey}`, () => fetchSpaceItems(...))
```

**TTL guidance:** 5 min for near-static (models, skills, workflows, overrides),
1-2 min for slowly-changing lists (campaigns, integrations), 0 (dedupe-only) for
anything the user actively mutates (items, conversations, roster).

**Invalidation is mandatory when there is a mutation path.** Every PUT/POST/DELETE
that changes cached data must call `invalidateCachedFetch(keyPrefix)`. See the
skill-toggle and access-toggle handlers in
`apps/web/src/features/studio/components/ChatInput.tsx`, and the
`campaign-config-updated` listener in `SpaceVibeyChatPanel.tsx`. If you cannot find
or wire the mutation path, use ttl 0.

## 2. createCachedResource

**File:** `apps/web/src/lib/cache/cached-resource.ts`

**When:** a single list resource consumed by hooks in multiple components, where
you want synchronous reads (`peek()`), local mutation (`mutate()`), and a `use()`
hook with loading state. Model: `cachedSpaces` in
`apps/web/src/features/spaces/hooks/use-cached-spaces.ts` (note its context-key
handling for org switching).

Prefer `cachedFetch` for one-off call sites; reach for this when several
components share the resource and need reactivity.

## 3. Snapshot/restore SWR caches in stores

**Model:** `itemsCacheBySpaceQuery` / `viewOverridesCacheBySpace` in
`apps/web/src/features/spaces/store/use-spaces-store.ts`.

**When:** a zustand store holds "the active entity's data" (items of the active
space, messages of the active conversation) and switching entities wipes state to
`[]` while refetching, causing a blank flash and a loading spinner on every switch.

**Shape:**

- Module-level `Map<entityKey, Data>` next to the store.
- On switch away: snapshot current state (including optimistic edits) into the map.
- On switch to: restore from the map synchronously (set the "loaded" flags so the
  UI renders rows, not skeletons), then fire the background refetch.
- On refetch success: update the map; on error: delete the entry (do not resurrect
  stale data); on entity delete: purge its entries.
- The refetch merge must preserve in-flight optimistic state. Reuse the store's
  existing merge helpers (`mergeFetchedItemsWithPending`) instead of overwriting.

The companion pattern for component state is `spaceConversationsCache`
(`apps/web/src/features/studio/services/space-conversations-cache.ts`): initialize
`useState` from the cache, sync state back to the cache in an effect, and guard
against in-place scope changes with a scope ref.

## 4. Collapse N+1 into batched endpoints

**Model:** `GET /api/conversations?agent_id=a,b,c` - the repository
(`apps/api/src/modules/conversations/repositories/conversations.repository.ts`)
splits a comma-separated `agent_id` and uses `.in()` for multiple keys, `.eq()`
for one. The frontend went from 1 + one-call-per-agent to exactly 2 calls.

**Recipe:** find the loop (`Promise.all(list.map(x => fetch(x)))`), extend the
backend filter to accept a list (comma-separated param or `.in()` filter), bump
the DTO max length, keep single-value behavior identical so other callers are
unaffected. Watch for per-row server work (permission resolution); batching the
HTTP calls also batches that.

## 5. Load-signature guards

**Model:** `lastConversationsLoadSigRef` in `SpaceVibeyChatPanel.tsx`.

**When:** a fetch callback's `useEffect` deps include identity-churning values
(`searchParams`, arrays from stores, derived objects) and the fetch re-runs even
though nothing meaningful changed.

**Shape:** build a string signature from only the inputs that change the result
(`${scopeId}|${agentKeysKey}|${activeAgentKey}`); early-return when it matches the
last successful run; set it only after success (so errors retry); accept a
`{ force: true }` option for explicit refresh callers (share modal, pull-to-refresh).

Companion fixes: derive a stable key (`array.map(...).sort().join(',')`) instead of
depending on array identity; gate batch loads on async prerequisites
(`rosterLoaded`) so they run once with full inputs instead of twice.

## 6. Eliminate duplicate mounts

**Model:** `SpacesContainer.tsx` renders the chat panel for desktop and mobile
trees; before the fix both were always mounted (CSS `hidden`/`md:hidden` only hides
pixels, not effects), so every chat fetch fired twice.

**Fix:** gate which subtree mounts with
`useMediaQuery('(min-width: 768px)')` from `apps/web/src/lib/hooks/use-media-query.ts`
(designed for this; see its doc comment). Audit tip: grep the parent for the
component name; two render sites + CSS visibility classes = duplicate mount.

## 7. Lazy-load heavy subtrees

**Model:** `apps/web/src/features/spaces/components/content/SpaceContentRouter.tsx`
wraps about 25 views in `next/dynamic`. Counter-example found in audit:
`SpaceModalsHost` statically imports every modal including the TipTap doc editor,
so all are parsed before first paint though none is visible.

**Targets:** modal hosts, editors (TipTap/Monaco), rarely-opened views, anything
behind a click. Use `next/dynamic(() => import(...).then(m => m.Named))` with a
small loading fallback. Verify the chunk actually split (`.next` analyze or just
confirm no static import remains).

## 8. Backend payload and query fixes

Findings to check on the heaviest endpoints (these are report items even if the
fix lands later):

- `select('*')` returning huge columns the view never uses, such as space items
  returning full `doc_body`/`notes` for a task list. Fix: column lists per use
  case; load heavy fields on item open.
- Filtering in app memory after fetching everything (`item_kind` filtering in
  `spaces.repository.findItemsBySpaceIdForAccess`). Push this into SQL.
- Missing `limit` + ordering on list endpoints (`conversations.findByUserId` has
  none).
- Per-row work in list handlers (permission resolution per conversation row).

## 9. Anti-pattern checklist

Quick greps/symptoms for the audit phase:

| Symptom | Likely cause | Pattern |
|---|---|---|
| Same request 2x back-to-back in dev | StrictMode double-effect, no dedupe | 1 (ttl 0) |
| Same request 2x in prod too | Duplicate mount | 6 |
| Burst of per-item requests | N+1 loop | 4 |
| Refetch after URL/store update with same data | Dependency churn | 5 |
| Blank flash + spinner on entity switch | State wiped on switch | 3 |
| Static data refetched every mount | No TTL cache | 1 |
| Full page blocked on one fetch | Loading gate too high | render shell, fetch in parallel |
| Route chunk contains editors/modals | Static imports | 7 |
| Endpoint slow even when warm | select *, in-memory filter, per-row work | 8 |

## Case study: Spaces page (June 2026)

Found: conversations fetched 1+N (one per roster agent), batch re-run on roster
arrival and URL change, chat panel mounted twice (desktop+mobile), items wiped to
`[]` on every space switch, ChatInput refetching 4 static endpoints per mount
(each 2-4s server-side), campaigns list refetched per container mount, items
endpoint returning full doc bodies via `select('*')`.

Fixed with patterns 1, 3, 4, 5, 6: about 25 requests per space switch became about
4-6, switches paint instantly from cache with background revalidation. Changelog
entries: `.docs/logs/changelog2026-06-10.md` (two `[REFACTOR]` entries) document
the full file list.
