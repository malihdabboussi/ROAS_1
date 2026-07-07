/**
 * P12 — Verify + print credentials.
 *
 * Read-only assertions:
 *   A. Row count assertions per major table (range-checked against
 *      EXPECTED_RANGES). Tables with no `org_id` column are counted by
 *      joining through their owning brain / mission / channel.
 *   B. 19 connectivity invariants from the plan section 6.
 *
 * Then prints the credentials block (founder email + password) and writes
 * the same content to `apps/api/.docs/yc-demo-credentials.md`. The file's
 * parent dir is created if missing. .gitignore coverage is verified
 * (warning-only — this phase does NOT modify .gitignore).
 *
 * Failures do NOT throw — they're collected as warnings so the operator
 * sees the full picture.
 *
 * In dry-run, invariant queries are skipped (no state to verify), but the
 * credentials block is still printed and the file is still written.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { FOUNDER } from '../content/agency'
import { startResult, type PhaseContext, type PhaseHandler, type PhaseState } from './_context'

const PHASE_ID = '12-verify'

// Duplicate of the constant in phases/01-account.ts — kept in lockstep on
// purpose. This is what gets printed in the credentials block.
const FOUNDER_KNOWN_PASSWORD = 'VibeyYC2026Demo'
const ORG_NAME = 'Foundry Creative'
const LOGIN_URL = 'https://app.vibey.im/login'
const CREDIT_TOTAL = '~51,000'
const CREDENTIALS_PATH = 'apps/api/.docs/yc-demo-credentials.md'
const GITIGNORE_HINT_PATHS = ['.gitignore', 'apps/api/.gitignore']

const REPO_ROOT = process.cwd()

// ─── Row count assertions ──────────────────────────────────────────────────

type CountScope =
  | { kind: 'org' }
  | { kind: 'brain' }
  | { kind: 'brain-text-subject' }
  | { kind: 'mission' }
  | { kind: 'channel' }
  | { kind: 'all' }

interface ExpectedRange {
  table: string
  lo: number
  hi: number
  scope: CountScope
  notes?: string
}

/**
 * Tables → expected row-count range for the org. `scope` defines how to
 * filter the count for the demo org:
 *
 *   - org: WHERE org_id = state.orgId
 *   - brain: WHERE brain_id IN (brains of the org)
 *   - brain-text-subject: WHERE subject_id IN (org members' user_ids)
 *   - mission: WHERE mission_id IN (missions of the org)
 *   - channel: WHERE channel_id IN (channels of the org)
 *   - all: COUNT(*) (intentionally not scoped — used for organizations table)
 */
const EXPECTED_RANGES: readonly ExpectedRange[] = [
  {
    table: 'profiles',
    lo: 3,
    hi: 10,
    scope: { kind: 'org' },
    notes: 'profiles has no org_id; counted via org_members → profiles',
  },
  { table: 'organizations', lo: 1, hi: 1, scope: { kind: 'org' } },
  { table: 'org_members', lo: 2, hi: 5, scope: { kind: 'org' } },
  { table: 'org_credit_purchases', lo: 1, hi: 5, scope: { kind: 'org' } },
  { table: 'agents_registry', lo: 7, hi: 14, scope: { kind: 'org' } },
  { table: 'agent_teams', lo: 4, hi: 6, scope: { kind: 'org' } },
  { table: 'ns_brains', lo: 9, hi: 20, scope: { kind: 'org' } },
  { table: 'campaigns', lo: 9, hi: 12, scope: { kind: 'org' } },
  { table: 'spaces', lo: 10, hi: 16, scope: { kind: 'org' } },
  { table: 'space_items', lo: 100, hi: 300, scope: { kind: 'org' } },
  { table: 'ns_memories', lo: 700, hi: 1500, scope: { kind: 'brain' } },
  { table: 'ns_snapshots', lo: 100, hi: 150, scope: { kind: 'brain' } },
  { table: 'ns_belief_patterns', lo: 40, hi: 60, scope: { kind: 'brain-text-subject' } },
  { table: 'ns_perspectives', lo: 35, hi: 55, scope: { kind: 'brain-text-subject' } },
  { table: 'ns_narrative_pages', lo: 100, hi: 130, scope: { kind: 'brain' } },
  { table: 'ns_brain_log', lo: 400, hi: 700, scope: { kind: 'brain' } },
  { table: 'ns_memory_sessions', lo: 80, hi: 120, scope: { kind: 'brain' } },
  { table: 'ns_sk_sources', lo: 55, hi: 70, scope: { kind: 'brain' } },
  { table: 'ns_sk_entries', lo: 140, hi: 160, scope: { kind: 'brain' } },
  { table: 'contacts', lo: 18, hi: 25, scope: { kind: 'org' } },
  { table: 'customer_avatars', lo: 7, hi: 7, scope: { kind: 'brain' } },
  { table: 'company_cortex_dream_runs', lo: 80, hi: 100, scope: { kind: 'org' } },
  { table: 'company_cortex_signals', lo: 250, hi: 320, scope: { kind: 'org' } },
  { table: 'company_cortex_objects', lo: 20, hi: 25, scope: { kind: 'org' } },
  { table: 'missions', lo: 30, hi: 35, scope: { kind: 'org' } },
  { table: 'mission_subtasks', lo: 140, hi: 200, scope: { kind: 'mission' } },
  { table: 'mission_deliverables', lo: 10, hi: 25, scope: { kind: 'mission' } },
  { table: 'channels', lo: 11, hi: 18, scope: { kind: 'org' } },
  { table: 'channel_messages', lo: 300, hi: 400, scope: { kind: 'channel' } },
  { table: 'offers', lo: 18, hi: 30, scope: { kind: 'org' } },
  { table: 'funnels', lo: 12, hi: 18, scope: { kind: 'org' } },
  { table: 'avatars', lo: 5, hi: 10, scope: { kind: 'org' } },
]

interface ScopeIds {
  brainIds: string[]
  orgMemberUserIds: string[]
  missionIds: string[]
  channelIds: string[]
}

interface CountResult {
  table: string
  count: number | null
  lo: number
  hi: number
  status: 'PASS' | 'OUT_OF_RANGE' | 'ERROR' | 'SKIPPED'
  detail?: string
}

async function loadScopeIds(ctx: PhaseContext, orgId: string): Promise<ScopeIds> {
  const { supabase } = ctx

  const [brains, members, missions, channels] = await Promise.all([
    supabase.from('ns_brains').select('id').eq('org_id', orgId),
    supabase.from('org_members').select('user_id').eq('org_id', orgId).eq('status', 'active'),
    supabase.from('missions').select('id').eq('org_id', orgId),
    supabase.from('channels').select('id').eq('org_id', orgId),
  ])

  const brainIds = (brains.data ?? []).map((r) => r.id as string)
  const orgMemberUserIds = (members.data ?? []).map((r) => r.user_id as string)
  const missionIds = (missions.data ?? []).map((r) => r.id as string)
  const channelIds = (channels.data ?? []).map((r) => r.id as string)

  return { brainIds, orgMemberUserIds, missionIds, channelIds }
}

async function countTable(
  ctx: PhaseContext,
  range: ExpectedRange,
  orgId: string,
  scopeIds: ScopeIds,
): Promise<CountResult> {
  const { supabase } = ctx
  const { table, lo, hi, scope } = range

  try {
    let query = supabase.from(table).select('*', { count: 'exact', head: true })

    switch (scope.kind) {
      case 'org':
        if (table === 'organizations') query = query.eq('id', orgId)
        else if (table === 'profiles')
          query = query.in(
            'id',
            scopeIds.orgMemberUserIds.length
              ? scopeIds.orgMemberUserIds
              : ['00000000-0000-0000-0000-000000000000'],
          )
        else query = query.eq('org_id', orgId)
        break
      case 'brain':
        if (scopeIds.brainIds.length === 0) {
          return { table, count: 0, lo, hi, status: 'SKIPPED', detail: 'no brains in org' }
        }
        query = query.in('brain_id', scopeIds.brainIds)
        break
      case 'brain-text-subject':
        if (scopeIds.orgMemberUserIds.length === 0) {
          return { table, count: 0, lo, hi, status: 'SKIPPED', detail: 'no org members' }
        }
        query = query.in('subject_id', scopeIds.orgMemberUserIds)
        break
      case 'mission':
        if (scopeIds.missionIds.length === 0) {
          return { table, count: 0, lo, hi, status: 'SKIPPED', detail: 'no missions in org' }
        }
        query = query.in('mission_id', scopeIds.missionIds)
        break
      case 'channel':
        if (scopeIds.channelIds.length === 0) {
          return { table, count: 0, lo, hi, status: 'SKIPPED', detail: 'no channels in org' }
        }
        query = query.in('channel_id', scopeIds.channelIds)
        break
      case 'all':
        break
    }

    const { count, error } = await query
    if (error) {
      return { table, count: null, lo, hi, status: 'ERROR', detail: error.message }
    }
    const n = count ?? 0
    if (n < lo || n > hi) {
      return { table, count: n, lo, hi, status: 'OUT_OF_RANGE' }
    }
    return { table, count: n, lo, hi, status: 'PASS' }
  } catch (err) {
    return {
      table,
      count: null,
      lo,
      hi,
      status: 'ERROR',
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Connectivity invariants ───────────────────────────────────────────────

interface InvariantResult {
  id: number
  name: string
  status: 'PASS' | 'FAIL' | 'SKIPPED'
  detail: string
}

async function fetchAll<T>(
  build: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
    if (from > 50000) break // hard safety stop
  }
  return out
}

function isValidUuid(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  )
}

function extractUuidsFromValue(value: unknown, out: Set<string>): void {
  if (isValidUuid(value)) {
    out.add(value)
    return
  }
  if (Array.isArray(value)) {
    for (const v of value) extractUuidsFromValue(v, out)
    return
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      extractUuidsFromValue(v, out)
    }
  }
}

async function runInvariants(
  ctx: PhaseContext,
  orgId: string,
  state: PhaseState,
  scopeIds: ScopeIds,
): Promise<InvariantResult[]> {
  const { supabase, log } = ctx
  const results: InvariantResult[] = []
  const brainIds = scopeIds.brainIds
  const userBrainId = state.defaultUserBrainId
  const customerBrainId = state.customerBrainId
  const companyBrainId = state.companyBrainId

  const skip = (id: number, name: string, reason: string): InvariantResult => ({
    id,
    name,
    status: 'SKIPPED',
    detail: reason,
  })

  // ─── #1 ns_snapshots.source_id resolves ─────────────────────────────────
  try {
    if (!userBrainId) {
      results.push(skip(1, 'ns_snapshots.source_id resolves', 'no user brain'))
    } else {
      const snaps = await fetchAll<{ source_id: string | null }>((a, b) =>
        supabase
          .from('ns_snapshots')
          .select('source_id')
          .eq('brain_id', userBrainId)
          .eq('source_type', 'memory')
          .range(a, b),
      )
      const sourceIds = snaps.map((s) => s.source_id).filter((v): v is string => isValidUuid(v))
      if (sourceIds.length === 0) {
        results.push({
          id: 1,
          name: 'ns_snapshots.source_id resolves',
          status: 'PASS',
          detail: '0 source_type=memory snapshots to check',
        })
      } else {
        const mems = await fetchAll<{ id: string }>((a, b) =>
          supabase.from('ns_memories').select('id').in('id', sourceIds).range(a, b),
        )
        const known = new Set(mems.map((m) => m.id))
        const missing = sourceIds.filter((id) => !known.has(id)).length
        results.push({
          id: 1,
          name: 'ns_snapshots.source_id resolves',
          status: missing === 0 ? 'PASS' : 'FAIL',
          detail: `${sourceIds.length} checked, ${missing} unresolved`,
        })
      }
    }
  } catch (err) {
    results.push({
      id: 1,
      name: 'ns_snapshots.source_id resolves',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #2 ns_belief_patterns.supporting_memories has 3-7 real ids ─────────
  try {
    const subjects = scopeIds.orgMemberUserIds
    if (subjects.length === 0) {
      results.push(
        skip(2, 'ns_belief_patterns.supporting_memories has 3-7 real ids', 'no org members'),
      )
    } else {
      const patterns = await fetchAll<{ id: string; supporting_memories: string[] | null }>(
        (a, b) =>
          supabase
            .from('ns_belief_patterns')
            .select('id, supporting_memories')
            .in('subject_id', subjects)
            .range(a, b),
      )
      if (patterns.length === 0) {
        results.push({
          id: 2,
          name: 'ns_belief_patterns.supporting_memories has 3-7 real ids',
          status: 'PASS',
          detail: '0 belief patterns to check',
        })
      } else {
        const allRefs = new Set<string>()
        for (const p of patterns) {
          for (const m of p.supporting_memories ?? []) {
            if (isValidUuid(m)) allRefs.add(m)
          }
        }
        const memIds = Array.from(allRefs)
        const knownSet = new Set<string>()
        if (memIds.length > 0) {
          const known = await fetchAll<{ id: string }>((a, b) =>
            supabase.from('ns_memories').select('id').in('id', memIds).range(a, b),
          )
          for (const m of known) knownSet.add(m.id)
        }
        let bad = 0
        for (const p of patterns) {
          const refs = (p.supporting_memories ?? []).filter(isValidUuid)
          const inRange = refs.length >= 3 && refs.length <= 7
          const allResolve = refs.every((id) => knownSet.has(id))
          if (!inRange || !allResolve) bad++
        }
        results.push({
          id: 2,
          name: 'ns_belief_patterns.supporting_memories has 3-7 real ids',
          status: bad === 0 ? 'PASS' : 'FAIL',
          detail: `${patterns.length} patterns, ${bad} violating (range 3-7 + resolves)`,
        })
      }
    }
  } catch (err) {
    results.push({
      id: 2,
      name: 'ns_belief_patterns.supporting_memories has 3-7 real ids',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #3 ns_perspectives.beliefs has 1-3 real ids ────────────────────────
  try {
    const subjects = scopeIds.orgMemberUserIds
    if (subjects.length === 0) {
      results.push(skip(3, 'ns_perspectives.beliefs has 1-3 real ids', 'no org members'))
    } else {
      const persps = await fetchAll<{ id: string; beliefs: string[] | null }>((a, b) =>
        supabase
          .from('ns_perspectives')
          .select('id, beliefs')
          .in('subject_id', subjects)
          .range(a, b),
      )
      if (persps.length === 0) {
        results.push({
          id: 3,
          name: 'ns_perspectives.beliefs has 1-3 real ids',
          status: 'PASS',
          detail: '0 perspectives to check',
        })
      } else {
        const allRefs = new Set<string>()
        for (const p of persps) {
          for (const b of p.beliefs ?? []) {
            if (isValidUuid(b)) allRefs.add(b)
          }
        }
        const refIds = Array.from(allRefs)
        const knownSet = new Set<string>()
        if (refIds.length > 0) {
          const known = await fetchAll<{ id: string }>((a, b) =>
            supabase.from('ns_belief_patterns').select('id').in('id', refIds).range(a, b),
          )
          for (const m of known) knownSet.add(m.id)
        }
        let bad = 0
        for (const p of persps) {
          const refs = (p.beliefs ?? []).filter(isValidUuid)
          const inRange = refs.length >= 1 && refs.length <= 3
          const allResolve = refs.every((id) => knownSet.has(id))
          if (!inRange || !allResolve) bad++
        }
        results.push({
          id: 3,
          name: 'ns_perspectives.beliefs has 1-3 real ids',
          status: bad === 0 ? 'PASS' : 'FAIL',
          detail: `${persps.length} perspectives, ${bad} violating`,
        })
      }
    }
  } catch (err) {
    results.push({
      id: 3,
      name: 'ns_perspectives.beliefs has 1-3 real ids',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #4 ns_narrative_pages.source_refs cites real ids ──────────────────
  try {
    if (brainIds.length === 0) {
      results.push(skip(4, 'ns_narrative_pages.source_refs cites real ids', 'no brains in org'))
    } else {
      const pages = await fetchAll<{ id: string; source_refs: unknown }>((a, b) =>
        supabase
          .from('ns_narrative_pages')
          .select('id, source_refs')
          .in('brain_id', brainIds)
          .range(a, b),
      )
      const refIds = new Set<string>()
      for (const p of pages) extractUuidsFromValue(p.source_refs, refIds)
      const refArr = Array.from(refIds)
      const knownSet = new Set<string>()
      if (refArr.length > 0) {
        const knownMem = await fetchAll<{ id: string }>((a, b) =>
          supabase.from('ns_memories').select('id').in('id', refArr).range(a, b),
        )
        const knownSnap = await fetchAll<{ id: string }>((a, b) =>
          supabase.from('ns_snapshots').select('id').in('id', refArr).range(a, b),
        )
        for (const m of knownMem) knownSet.add(m.id)
        for (const s of knownSnap) knownSet.add(s.id)
      }
      let bad = 0
      let totalRefs = 0
      for (const p of pages) {
        const refs = new Set<string>()
        extractUuidsFromValue(p.source_refs, refs)
        if (refs.size === 0) continue
        totalRefs += refs.size
        for (const id of refs) if (!knownSet.has(id)) bad++
      }
      results.push({
        id: 4,
        name: 'ns_narrative_pages.source_refs cites real ids',
        status: bad === 0 ? 'PASS' : 'FAIL',
        detail: `${pages.length} pages, ${totalRefs} refs, ${bad} unresolved`,
      })
    }
  } catch (err) {
    results.push({
      id: 4,
      name: 'ns_narrative_pages.source_refs cites real ids',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #5 every ns_narrative_pages linked from ≥1 other page ─────────────
  try {
    if (brainIds.length === 0) {
      results.push(skip(5, 'every ns_narrative_page linked from ≥1 other page', 'no brains in org'))
    } else {
      const pages = await fetchAll<{ id: string }>((a, b) =>
        supabase.from('ns_narrative_pages').select('id').in('brain_id', brainIds).range(a, b),
      )
      if (pages.length === 0) {
        results.push({
          id: 5,
          name: 'every ns_narrative_page linked from ≥1 other page',
          status: 'PASS',
          detail: '0 pages to check',
        })
      } else {
        const pageIds = pages.map((p) => p.id)
        const links = await fetchAll<{ to_page_id: string }>((a, b) =>
          supabase
            .from('ns_narrative_links')
            .select('to_page_id')
            .in('to_page_id', pageIds)
            .range(a, b),
        )
        const linkedTo = new Set(links.map((l) => l.to_page_id))
        const orphans = pageIds.filter((id) => !linkedTo.has(id)).length
        results.push({
          id: 5,
          name: 'every ns_narrative_page linked from ≥1 other page',
          status: orphans === 0 ? 'PASS' : 'FAIL',
          detail: `${pageIds.length} pages, ${orphans} orphan (no inbound link)`,
        })
      }
    }
  } catch (err) {
    results.push({
      id: 5,
      name: 'every ns_narrative_page linked from ≥1 other page',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #6 customer_avatars.member_contact_ids has 2-4 real contacts ──────
  try {
    if (!customerBrainId) {
      results.push(
        skip(6, 'customer_avatars.member_contact_ids has 2-4 real contacts', 'no customer brain'),
      )
    } else {
      const avs = await fetchAll<{ id: string; member_contact_ids: string[] | null }>((a, b) =>
        supabase
          .from('customer_avatars')
          .select('id, member_contact_ids')
          .eq('brain_id', customerBrainId)
          .range(a, b),
      )
      if (avs.length === 0) {
        results.push({
          id: 6,
          name: 'customer_avatars.member_contact_ids has 2-4 real contacts',
          status: 'PASS',
          detail: '0 customer avatars to check',
        })
      } else {
        const allRefs = new Set<string>()
        for (const a of avs)
          for (const c of a.member_contact_ids ?? []) if (isValidUuid(c)) allRefs.add(c)
        const refIds = Array.from(allRefs)
        const knownSet = new Set<string>()
        if (refIds.length > 0) {
          const known = await fetchAll<{ id: string }>((a, b) =>
            supabase.from('contacts').select('id').in('id', refIds).range(a, b),
          )
          for (const c of known) knownSet.add(c.id)
        }
        let bad = 0
        for (const av of avs) {
          const refs = (av.member_contact_ids ?? []).filter(isValidUuid)
          const inRange = refs.length >= 2 && refs.length <= 4
          const allResolve = refs.every((id) => knownSet.has(id))
          if (!inRange || !allResolve) bad++
        }
        results.push({
          id: 6,
          name: 'customer_avatars.member_contact_ids has 2-4 real contacts',
          status: bad === 0 ? 'PASS' : 'FAIL',
          detail: `${avs.length} avatars, ${bad} violating`,
        })
      }
    }
  } catch (err) {
    results.push({
      id: 6,
      name: 'customer_avatars.member_contact_ids has 2-4 real contacts',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #7 customer_avatars.declared_avatar_id resolves to a marketing avatar
  try {
    if (!customerBrainId) {
      results.push(skip(7, 'customer_avatars.declared_avatar_id resolves', 'no customer brain'))
    } else {
      const avs = await fetchAll<{ declared_avatar_id: string | null }>((a, b) =>
        supabase
          .from('customer_avatars')
          .select('declared_avatar_id')
          .eq('brain_id', customerBrainId)
          .not('declared_avatar_id', 'is', null)
          .range(a, b),
      )
      const declared = avs
        .map((a) => a.declared_avatar_id)
        .filter((v): v is string => isValidUuid(v))
      if (declared.length === 0) {
        results.push({
          id: 7,
          name: 'customer_avatars.declared_avatar_id resolves',
          status: 'PASS',
          detail: '0 declared_avatar_id values to check',
        })
      } else {
        const known = await fetchAll<{ id: string }>((a, b) =>
          supabase.from('avatars').select('id').in('id', declared).range(a, b),
        )
        const knownSet = new Set(known.map((k) => k.id))
        const missing = declared.filter((id) => !knownSet.has(id)).length
        results.push({
          id: 7,
          name: 'customer_avatars.declared_avatar_id resolves',
          status: missing === 0 ? 'PASS' : 'FAIL',
          detail: `${declared.length} declared, ${missing} unresolved`,
        })
      }
    }
  } catch (err) {
    results.push({
      id: 7,
      name: 'customer_avatars.declared_avatar_id resolves',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #8 company_cortex_signals.evidence_refs cites real channel_messages
  try {
    const signals = await fetchAll<{ evidence_refs: unknown }>((a, b) =>
      supabase
        .from('company_cortex_signals')
        .select('evidence_refs')
        .eq('org_id', orgId)
        .range(a, b),
    )
    if (signals.length === 0) {
      results.push({
        id: 8,
        name: 'company_cortex_signals.evidence_refs cites real channel_messages',
        status: 'PASS',
        detail: '0 signals to check',
      })
    } else {
      const refIds = new Set<string>()
      for (const s of signals) extractUuidsFromValue(s.evidence_refs, refIds)
      const refArr = Array.from(refIds)
      const knownSet = new Set<string>()
      if (refArr.length > 0) {
        const known = await fetchAll<{ id: string }>((a, b) =>
          supabase.from('channel_messages').select('id').in('id', refArr).range(a, b),
        )
        for (const k of known) knownSet.add(k.id)
      }
      let signalsWithBadRef = 0
      let totalRefs = 0
      for (const s of signals) {
        const sRefs = new Set<string>()
        extractUuidsFromValue(s.evidence_refs, sRefs)
        if (sRefs.size === 0) continue
        totalRefs += sRefs.size
        for (const id of sRefs) {
          if (!knownSet.has(id)) {
            signalsWithBadRef++
            break
          }
        }
      }
      results.push({
        id: 8,
        name: 'company_cortex_signals.evidence_refs cites real channel_messages',
        status: signalsWithBadRef === 0 ? 'PASS' : 'FAIL',
        detail: `${signals.length} signals, ${totalRefs} refs, ${signalsWithBadRef} signals with unresolved refs`,
      })
    }
  } catch (err) {
    results.push({
      id: 8,
      name: 'company_cortex_signals.evidence_refs cites real channel_messages',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #9 company_cortex_objects.source_signal_ids has 2-5 real signals ──
  try {
    const objs = await fetchAll<{ id: string; source_signal_ids: string[] | null }>((a, b) =>
      supabase
        .from('company_cortex_objects')
        .select('id, source_signal_ids')
        .eq('org_id', orgId)
        .range(a, b),
    )
    if (objs.length === 0) {
      results.push({
        id: 9,
        name: 'company_cortex_objects.source_signal_ids has 2-5 real signals',
        status: 'PASS',
        detail: '0 cortex objects to check',
      })
    } else {
      const allRefs = new Set<string>()
      for (const o of objs)
        for (const s of o.source_signal_ids ?? []) if (isValidUuid(s)) allRefs.add(s)
      const refArr = Array.from(allRefs)
      const knownSet = new Set<string>()
      if (refArr.length > 0) {
        const known = await fetchAll<{ id: string }>((a, b) =>
          supabase.from('company_cortex_signals').select('id').in('id', refArr).range(a, b),
        )
        for (const k of known) knownSet.add(k.id)
      }
      let bad = 0
      for (const o of objs) {
        const refs = (o.source_signal_ids ?? []).filter(isValidUuid)
        const inRange = refs.length >= 2 && refs.length <= 5
        const allResolve = refs.every((id) => knownSet.has(id))
        if (!inRange || !allResolve) bad++
      }
      results.push({
        id: 9,
        name: 'company_cortex_objects.source_signal_ids has 2-5 real signals',
        status: bad === 0 ? 'PASS' : 'FAIL',
        detail: `${objs.length} objects, ${bad} violating`,
      })
    }
  } catch (err) {
    results.push({
      id: 9,
      name: 'company_cortex_objects.source_signal_ids has 2-5 real signals',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #10 every artifact row has campaign_id set ────────────────────────
  // Verifies offers / funnels / sequences / presentations / ad_campaigns /
  // social_posts / blog_posts / media_assets / avatars for the org. Each
  // table is checked: count(*) WHERE org_id = $1 AND campaign_id IS NULL.
  try {
    const artifactTables = [
      'offers',
      'funnels',
      'sequences',
      'presentations',
      'ad_campaigns',
      'social_posts',
      'blog_posts',
      'media_assets',
      'avatars',
    ]
    let totalMissing = 0
    const perTable: string[] = []
    for (const table of artifactTables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .is('campaign_id', null)
      if (error) {
        perTable.push(`${table}=ERR(${error.message.slice(0, 60)})`)
        continue
      }
      const n = count ?? 0
      totalMissing += n
      if (n > 0) perTable.push(`${table}=${n}`)
    }
    results.push({
      id: 10,
      name: 'every artifact row has campaign_id set',
      status: totalMissing === 0 ? 'PASS' : 'FAIL',
      detail:
        totalMissing === 0
          ? `${artifactTables.length} tables checked, 0 missing campaign_id`
          : `${totalMissing} rows missing campaign_id: ${perTable.join(', ')}`,
    })
  } catch (err) {
    results.push({
      id: 10,
      name: 'every artifact row has campaign_id set',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #11 every funnel references real offers + forms ──────────────────
  results.push(
    skip(
      11,
      'every funnel references real offers + forms',
      'funnel ↔ offer/form FK structure varies; check punted to runtime',
    ),
  )

  // ─── #12 every sequence references real emails ───────────────────────
  results.push(
    skip(
      12,
      'every sequence references real emails',
      'sequence ↔ email FK schema not centralized; check punted to runtime',
    ),
  )

  // ─── #13 every ad_campaign references real ads ───────────────────────
  results.push(
    skip(
      13,
      'every ad_campaign references real ads',
      'ad_campaign ↔ ads FK schema not centralized; check punted to runtime',
    ),
  )

  // ─── #14 every presentation references real media_assets ─────────────
  results.push(
    skip(
      14,
      'every presentation references real media_assets',
      'presentation ↔ media_assets ref lives in presentation.slides JSON; structural check punted',
    ),
  )

  // ─── #15 completed mission with deliverable_kinds has a real artifact deliverable
  try {
    const missions = await fetchAll<{
      id: string
      status: string | null
      deliverable_kinds: string[] | null
    }>((a, b) =>
      supabase
        .from('missions')
        .select('id, status, deliverable_kinds')
        .eq('org_id', orgId)
        .range(a, b),
    )
    const completedWithKinds = missions.filter(
      (m) => m.status === 'completed' && (m.deliverable_kinds ?? []).length > 0,
    )
    if (completedWithKinds.length === 0) {
      results.push({
        id: 15,
        name: 'completed missions w/ deliverable_kinds have artifact deliverables',
        status: 'PASS',
        detail: '0 qualifying completed missions',
      })
    } else {
      const ids = completedWithKinds.map((m) => m.id)
      const dels = await fetchAll<{ mission_id: string; artifact_id: string | null }>((a, b) =>
        supabase
          .from('mission_deliverables')
          .select('mission_id, artifact_id')
          .in('mission_id', ids)
          .range(a, b),
      )
      const byMission = new Map<string, boolean>()
      for (const d of dels) {
        if (isValidUuid(d.artifact_id)) byMission.set(d.mission_id, true)
      }
      const missing = ids.filter((id) => !byMission.has(id)).length
      results.push({
        id: 15,
        name: 'completed missions w/ deliverable_kinds have artifact deliverables',
        status: missing === 0 ? 'PASS' : 'FAIL',
        detail: `${ids.length} qualifying, ${missing} missing a deliverable w/ artifact_id`,
      })
    }
  } catch (err) {
    results.push({
      id: 15,
      name: 'completed missions w/ deliverable_kinds have artifact deliverables',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #16 org_members.role: exactly 1 owner + 2+ admin ────────────────
  try {
    const members = await fetchAll<{ role: string; status: string }>((a, b) =>
      supabase.from('org_members').select('role, status').eq('org_id', orgId).range(a, b),
    )
    const active = members.filter((m) => m.status === 'active')
    const owners = active.filter((m) => m.role === 'owner').length
    const admins = active.filter((m) => m.role === 'admin').length
    const ok = owners === 1 && admins >= 2
    results.push({
      id: 16,
      name: 'org_members: exactly 1 owner + 2+ admin (active)',
      status: ok ? 'PASS' : 'FAIL',
      detail: `owners=${owners} admins=${admins} (total active=${active.length})`,
    })
  } catch (err) {
    results.push({
      id: 16,
      name: 'org_members: exactly 1 owner + 2+ admin (active)',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #17 channel_message sender_id resolves to agent_key or user_id ─
  try {
    if (scopeIds.channelIds.length === 0) {
      results.push(skip(17, 'channel_messages.sender_id resolves', 'no channels in org'))
    } else {
      const msgs = await fetchAll<{ sender_type: string; sender_id: string | null }>((a, b) =>
        supabase
          .from('channel_messages')
          .select('sender_type, sender_id')
          .in('channel_id', scopeIds.channelIds)
          .neq('sender_type', 'system')
          .range(a, b),
      )
      if (msgs.length === 0) {
        results.push({
          id: 17,
          name: 'channel_messages.sender_id resolves',
          status: 'PASS',
          detail: '0 user/agent messages to check',
        })
      } else {
        const agentKeys = new Set<string>()
        const userIds = new Set<string>()
        for (const m of msgs) {
          if (!m.sender_id) continue
          if (m.sender_type === 'agent') agentKeys.add(m.sender_id)
          else if (m.sender_type === 'user' && isValidUuid(m.sender_id)) userIds.add(m.sender_id)
        }
        const knownAgents = new Set<string>()
        if (agentKeys.size > 0) {
          const akArr = Array.from(agentKeys)
          const akKnown = await fetchAll<{ agent_key: string }>((a, b) =>
            supabase
              .from('agents_registry')
              .select('agent_key')
              .eq('org_id', orgId)
              .in('agent_key', akArr)
              .range(a, b),
          )
          for (const k of akKnown) knownAgents.add(k.agent_key)
        }
        const knownUsers = new Set<string>(scopeIds.orgMemberUserIds)
        let bad = 0
        for (const m of msgs) {
          if (!m.sender_id) {
            bad++
            continue
          }
          if (m.sender_type === 'agent') {
            if (!knownAgents.has(m.sender_id)) bad++
          } else if (m.sender_type === 'user') {
            if (!isValidUuid(m.sender_id) || !knownUsers.has(m.sender_id)) bad++
          }
        }
        results.push({
          id: 17,
          name: 'channel_messages.sender_id resolves',
          status: bad === 0 ? 'PASS' : 'FAIL',
          detail: `${msgs.length} msgs, ${bad} unresolved sender`,
        })
      }
    }
  } catch (err) {
    results.push({
      id: 17,
      name: 'channel_messages.sender_id resolves',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  // ─── #18 no row in prod was mutated since the script started ─────────
  // The script is service-role and only reads from prod during the Adley
  // template extraction (P7.5a). We have no per-row baseline timestamp to
  // diff against from this phase, so this invariant is documented but
  // skipped. P7.5a is responsible for not mutating prod.
  results.push(
    skip(
      18,
      'no row in prod was mutated since script start',
      'no baseline available in P12 (P7.5a is read-only by construction)',
    ),
  )

  // ─── #19 company brain has cortex enabled + recent dream timestamp ──
  try {
    if (!companyBrainId) {
      results.push(
        skip(19, 'company cortex enabled + last_successful_dream_at set', 'no company brain'),
      )
    } else {
      const { data: cs, error } = await supabase
        .from('company_cortex_settings')
        .select('enabled, last_successful_dream_at')
        .eq('org_id', orgId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      const enabled = cs?.enabled === true
      const hasLast = typeof cs?.last_successful_dream_at === 'string'
      const ok = enabled && hasLast
      results.push({
        id: 19,
        name: 'company cortex enabled + last_successful_dream_at set',
        status: ok ? 'PASS' : 'FAIL',
        detail: `enabled=${enabled} last_successful_dream_at=${hasLast ? 'set' : 'null'}`,
      })
    }
  } catch (err) {
    results.push({
      id: 19,
      name: 'company cortex enabled + last_successful_dream_at set',
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  log.step(`Connectivity invariants checked: ${results.length}`)
  return results
}

// ─── Credentials block ─────────────────────────────────────────────────────

function buildCredentialsBlock(): string {
  const line = '================================================================'
  return [
    line,
    `YC DEMO ACCOUNT — ${ORG_NAME}`,
    line,
    `Login URL: ${LOGIN_URL}`,
    `Email:     ${FOUNDER.email}`,
    `Password:  ${FOUNDER_KNOWN_PASSWORD}`,
    `Org:       ${ORG_NAME}`,
    `Credits:   ${CREDIT_TOTAL}`,
    line,
    '',
  ].join('\n')
}

function verifyGitignoreCoverage(): { covered: boolean; checked: string[] } {
  const targetPatterns = ['apps/api/.docs', '*-credentials.md', 'apps/api/.docs/']
  const checked: string[] = []
  for (const giPath of GITIGNORE_HINT_PATHS) {
    const abs = join(REPO_ROOT, giPath)
    checked.push(giPath)
    if (!existsSync(abs)) continue
    const contents = readFileSync(abs, 'utf8')
    for (const pat of targetPatterns) {
      if (contents.split(/\r?\n/).some((line) => line.trim() === pat)) {
        return { covered: true, checked }
      }
    }
  }
  return { covered: false, checked }
}

function writeCredentialsFile(block: string, log: PhaseContext['log']): string | null {
  const abs = join(REPO_ROOT, CREDENTIALS_PATH)
  const dir = dirname(abs)
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
      log.step(`Created parent dir: ${dir}`)
    }
    writeFileSync(abs, block, 'utf8')
    return abs
  } catch (err) {
    log.warn(
      `Failed to write credentials file at ${abs}: ${err instanceof Error ? err.message : String(err)}`,
    )
    return null
  }
}

// ─── Phase handler ─────────────────────────────────────────────────────────

export const runP12Verify: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  const { state, log, dryRun } = ctx

  ctx.log.step('P12 — verify connectivity + print credentials')

  const warnings: string[] = []
  const credentialsBlock = buildCredentialsBlock()

  // Dry-run / empty state path: just print credentials + write file, skip
  // the DB-level invariant queries (nothing to verify).
  if (dryRun || !state.orgId) {
    if (!state.orgId) {
      warnings.push(
        'state.orgId empty — skipping invariant queries (dry-run or single-phase isolation).',
      )
    } else {
      warnings.push('Dry-run — skipping invariant queries against the database.')
    }

    const { covered, checked } = verifyGitignoreCoverage()
    if (!covered) {
      warnings.push(
        `apps/api/.docs/yc-demo-credentials.md may not be gitignored. Checked: ${checked.join(', ')}. Add "apps/api/.docs/" or "*-credentials.md" to .gitignore manually.`,
      )
    }

    if (!dryRun) {
      const path = writeCredentialsFile(credentialsBlock, log)
      if (path) log.step(`Credentials written to ${path}`)
    } else {
      log.step(`[dry-run] would write credentials to ${join(REPO_ROOT, CREDENTIALS_PATH)}`)
    }

    log.raw('')
    log.raw(credentialsBlock)
    return r.finish({ 'invariants checked': 0, 'invariants passing': 0 }, warnings)
  }

  const orgId = state.orgId

  // ─── A) Row count assertions ──────────────────────────────────────────
  log.step('Loading scope ids (brains / org members / missions / channels)')
  const scopeIds = await loadScopeIds(ctx, orgId)
  log.step(
    `Scope ids: ${scopeIds.brainIds.length} brains, ${scopeIds.orgMemberUserIds.length} members, ${scopeIds.missionIds.length} missions, ${scopeIds.channelIds.length} channels`,
  )

  log.step(`Running ${EXPECTED_RANGES.length} row-count assertions`)
  const countResults: CountResult[] = []
  for (const range of EXPECTED_RANGES) {
    const cr = await countTable(ctx, range, orgId, scopeIds)
    countResults.push(cr)
    if (cr.status === 'PASS') {
      log.rowCount(`${cr.table.padEnd(34, ' ')} (${cr.lo}-${cr.hi})`, cr.count ?? 0)
    } else if (cr.status === 'SKIPPED') {
      log.warn(`${cr.table}: SKIPPED (${cr.detail ?? ''})`)
    } else if (cr.status === 'OUT_OF_RANGE') {
      const msg = `${cr.table}: ${cr.count} not in range [${cr.lo}, ${cr.hi}]`
      log.warn(msg)
      warnings.push(msg)
    } else {
      const msg = `${cr.table}: ERROR (${cr.detail ?? 'unknown'})`
      log.warn(msg)
      warnings.push(msg)
    }
  }

  // ─── B) Connectivity invariants ──────────────────────────────────────
  log.step('Running 19 connectivity invariants')
  const invariantResults = await runInvariants(ctx, orgId, state, scopeIds)
  const passing = invariantResults.filter((i) => i.status === 'PASS').length
  for (const inv of invariantResults) {
    if (inv.status === 'PASS') {
      log.step(`  ✓ #${inv.id} ${inv.name} — ${inv.detail}`)
    } else if (inv.status === 'SKIPPED') {
      log.warn(`  · #${inv.id} ${inv.name}: SKIPPED (${inv.detail})`)
    } else {
      const msg = `#${inv.id} ${inv.name}: FAIL — ${inv.detail}`
      log.warn(`  ✗ ${msg}`)
      warnings.push(msg)
    }
  }

  // ─── C) Credentials ──────────────────────────────────────────────────
  const { covered, checked } = verifyGitignoreCoverage()
  if (!covered) {
    warnings.push(
      `apps/api/.docs/yc-demo-credentials.md may not be gitignored. Checked: ${checked.join(', ')}. Add "apps/api/.docs/" or "*-credentials.md" to .gitignore manually.`,
    )
  }
  const path = writeCredentialsFile(credentialsBlock, log)
  if (path) log.step(`Credentials written to ${path}`)

  log.raw('')
  log.raw(credentialsBlock)

  return r.finish(
    {
      'invariants checked': invariantResults.length,
      'invariants passing': passing,
    },
    warnings,
  )
}
