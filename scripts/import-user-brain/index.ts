/**
 * Import a portable vibey-brain-export v1 bundle into the target Supabase project.
 *
 * Usage:
 *   pnpm import:user-brain -- \
 *     --export=/path/to/brain-export.json \
 *     --target-email=test@gmail.com \
 *     --expected-host=lhfgtsjetcardinpgouq.supabase.co
 *
 * Env (loads scripts/roas/roas-secrets.env first, then apps/api/.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL (optional, for column introspection)
 *
 * Idempotent: upserts on primary key `id`. Re-run safe.
 * Embeddings are not in the bundle — run backfill-embeddings after import for semantic search.
 */
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const BLOCKED_HOSTS = new Set(['qfrvykscoymiwwgysvsr.supabase.co'])
const DEFAULT_EXPECTED_HOST = 'lhfgtsjetcardinpgouq.supabase.co'
const BATCH_SIZE = 200

const BRAIN_SCOPED_TABLES = [
  'ns_memories',
  'ns_memory_sessions',
  'ns_snapshots',
  'ns_sk_sources',
  'ns_sk_entries',
  'ns_sk_gaps',
  'ns_sk_curriculum',
  'ns_pending_captures',
  'ns_content_hashes',
  'ns_narrative_pages',
  'ns_brain_log',
  'ns_brain_evidence_chunks',
  'brain_timelines',
  'brain_timeline_items',
  'brain_episodes',
  'customer_entities',
  'customer_source_identities',
] as const

const SUBJECT_SCOPED_TABLES = ['ns_belief_patterns', 'ns_perspectives'] as const

const USER_SCOPED_TABLES = [
  { exportKey: 'brain_import_jobs', table: 'brain_import_jobs', userColumn: 'user_id' as const },
  {
    exportKey: 'ns_meeting_imports',
    table: 'ns_meeting_imports',
    userColumn: 'profile_id' as const,
  },
] as const

const EDGE_TABLES = [
  'ns_memory_connections',
  'ns_memory_versions',
  'ns_emotional_responses',
  'ns_snapshot_edges',
  'ns_narrative_links',
  'ns_sk_evolution',
  'brain_cross_suggestions',
  'brain_shares',
  'customer_avatars',
] as const

const NULLABLE_FK_COLUMNS = new Set([
  'org_id',
  'campaign_id',
  'contact_id',
  'customer_entity_id',
  'customer_source_identity_id',
  'episode_id',
  'created_by',
])

type ImportArgs = {
  exportPath: string
  targetEmail: string
  expectedHost: string
  dryRun: boolean
}

type ImportContext = {
  sourceUserId: string
  targetUserId: string
  brainIds: Set<string>
  brainIdRemap: Map<string, string>
  targetCustomerPersonalBrainId: string | null
  targetDefaultUserBrainId: string | null
}

type CountReport = Record<string, { expected: number; imported: number; skipped: number }>

const require = createRequire(import.meta.url)

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function loadEnv(): void {
  const cwd = process.cwd()
  loadEnvFile(resolve(cwd, 'scripts/roas/roas-secrets.env'))
  loadEnvFile(resolve(cwd, 'scripts/roas/.env'))
  loadEnvFile(resolve(cwd, 'apps/api/.env'))
}

function parseArgs(argv: string[]): ImportArgs {
  let exportPath = ''
  let targetEmail = 'test@gmail.com'
  let expectedHost = process.env.EXPECTED_SUPABASE_HOST ?? DEFAULT_EXPECTED_HOST
  let dryRun = false

  for (const arg of argv) {
    if (arg.startsWith('--export=')) exportPath = arg.slice('--export='.length).trim()
    else if (arg.startsWith('--target-email='))
      targetEmail = arg.slice('--target-email='.length).trim()
    else if (arg.startsWith('--expected-host=')) {
      expectedHost = arg.slice('--expected-host='.length).trim()
    } else if (arg === '--dry-run') dryRun = true
  }

  if (!exportPath) {
    throw new Error('Missing --export=/path/to/brain-export.json')
  }
  if (!targetEmail) {
    throw new Error('Missing --target-email=...')
  }

  return {
    exportPath: resolve(exportPath),
    targetEmail,
    expectedHost,
    dryRun,
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

function assertSafeTarget(supabaseUrl: string, expectedHost: string): void {
  const host = new URL(supabaseUrl).host
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error(
      `Refusing import: SUPABASE_URL host ${host} is Vibey production. ` +
        `Load scripts/roas/roas-secrets.env (ROAS: ${DEFAULT_EXPECTED_HOST}).`,
    )
  }
  if (host !== expectedHost) {
    throw new Error(`Refusing import: SUPABASE_URL host is ${host}, expected ${expectedHost}`)
  }
}

async function loadTableColumns(databaseUrl: string | null): Promise<Map<string, Set<string>>> {
  const columnsByTable = new Map<string, Set<string>>()
  if (!databaseUrl) return columnsByTable

  let pg: typeof import('pg') | null = null
  const pgCandidates = [
    'pg',
    resolve(process.cwd(), 'node_modules/pg'),
    resolve(process.cwd(), 'node_modules/.pnpm/pg@8.19.0/node_modules/pg'),
    resolve(process.cwd(), 'apps/api/node_modules/pg'),
  ]
  for (const candidate of pgCandidates) {
    try {
      pg = require(candidate)
      break
    } catch {
      // try next
    }
  }
  if (!pg) {
    console.warn(
      '  pg not available — skipping column introspection (upsert may fail on schema drift)',
    )
    return columnsByTable
  }

  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    const allTables = [
      'ns_brains',
      ...BRAIN_SCOPED_TABLES,
      ...SUBJECT_SCOPED_TABLES,
      ...USER_SCOPED_TABLES.map((t) => t.table),
      ...EDGE_TABLES,
    ]
    for (const table of allTables) {
      const res = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      )
      columnsByTable.set(
        table,
        new Set(res.rows.map((r: { column_name: string }) => r.column_name)),
      )
    }
  } finally {
    await client.end()
  }
  return columnsByTable
}

function filterColumns(
  row: Record<string, unknown>,
  table: string,
  columnsByTable: Map<string, Set<string>>,
): Record<string, unknown> {
  const allowed = columnsByTable.get(table)
  if (!allowed || allowed.size === 0) return row
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (allowed.has(key)) out[key] = value
  }
  return out
}

function remapUserId(value: unknown, ctx: ImportContext): unknown {
  if (typeof value !== 'string') return value
  if (value === ctx.sourceUserId) return ctx.targetUserId
  return value
}

function remapBrainId(value: unknown, ctx: ImportContext): unknown {
  if (typeof value !== 'string') return value
  return ctx.brainIdRemap.get(value) ?? value
}

function prepareBrainRow(
  row: Record<string, unknown>,
  ctx: ImportContext,
  columnsByTable: Map<string, Set<string>>,
): Record<string, unknown> | null {
  const id = String(row.id)
  const next: Record<string, unknown> = { ...row }
  next.owner_id = ctx.targetUserId
  if (next.created_by === ctx.sourceUserId || next.created_by == null) {
    next.created_by = ctx.targetUserId
  }

  const hadOrg = next.org_id != null
  const hadCampaign = next.campaign_id != null
  next.org_id = null
  next.campaign_id = null

  const scope = String(next.scope ?? 'user')

  if (scope === 'customer' && !hadOrg) {
    if (ctx.targetCustomerPersonalBrainId && ctx.targetCustomerPersonalBrainId !== id) {
      ctx.brainIdRemap.set(id, ctx.targetCustomerPersonalBrainId)
      return null
    }
  }

  if (scope === 'customer' || scope === 'company' || scope === 'campaign') {
    next.scope = 'user'
    if (hadOrg || hadCampaign) {
      const suffix = hadCampaign ? ' (imported campaign brain)' : ' (imported scoped brain)'
      next.name = `${String(next.name ?? 'Brain')}${suffix}`
    }
  }

  if (
    scope === 'user' &&
    next.is_default === true &&
    ctx.targetDefaultUserBrainId &&
    ctx.targetDefaultUserBrainId !== id
  ) {
    next.is_default = false
  }

  return filterColumns(next, 'ns_brains', columnsByTable)
}

function sanitizeRow(
  table: string,
  row: Record<string, unknown>,
  ctx: ImportContext,
  columnsByTable: Map<string, Set<string>>,
): Record<string, unknown> | null {
  const next: Record<string, unknown> = { ...row }

  if (table === 'ns_brains') {
    return prepareBrainRow(row, ctx, columnsByTable)
  }

  if (table === 'brain_import_jobs' || table === 'ns_meeting_imports') {
    const userCol = table === 'brain_import_jobs' ? 'user_id' : 'profile_id'
    next[userCol] = ctx.targetUserId
    next.org_id = null
  }

  if (table === 'ns_belief_patterns' || table === 'ns_perspectives') {
    next.subject_id = ctx.targetUserId
  }

  if (table === 'brain_shares') {
    next.created_by = ctx.targetUserId
    next.org_id = null
    if (next.entity_type === 'user') {
      next.entity_id = remapUserId(next.entity_id, ctx)
    }
    if (next.entity_type === 'org') {
      return null
    }
  }

  for (const col of NULLABLE_FK_COLUMNS) {
    if (col in next && next[col] != null) {
      if (col === 'created_by' && table !== 'ns_brains' && table !== 'brain_shares') {
        next[col] = remapUserId(next[col], ctx)
      } else if (col !== 'created_by') {
        next[col] = null
      }
    }
  }

  delete next.embedding

  if ('brain_id' in next) {
    next.brain_id = remapBrainId(next.brain_id, ctx)
    const brainId = next.brain_id
    if (typeof brainId === 'string' && !ctx.brainIds.has(brainId)) {
      return null
    }
  }

  return filterColumns(next, table, columnsByTable)
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function upsertBatch(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  dryRun: boolean,
): Promise<void> {
  if (rows.length === 0) return
  if (dryRun) return

  for (const batch of chunk(rows, BATCH_SIZE)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' })
    if (error) {
      throw new Error(`${table} upsert failed (${batch.length} rows): ${error.message}`)
    }
  }
}

async function loadTargetBrainConstraints(
  supabase: SupabaseClient,
  targetUserId: string,
): Promise<{ customerPersonalBrainId: string | null; defaultUserBrainId: string | null }> {
  const { data, error } = await supabase
    .from('ns_brains')
    .select('id,scope,org_id,is_default')
    .eq('owner_id', targetUserId)
  if (error) throw new Error(`target ns_brains lookup failed: ${error.message}`)

  const customerPersonalBrainId =
    data?.find((b) => b.scope === 'customer' && b.org_id == null)?.id ?? null
  const defaultUserBrainId =
    data?.find((b) => b.scope === 'user' && b.is_default === true && b.org_id == null)?.id ?? null

  return {
    customerPersonalBrainId: customerPersonalBrainId ? String(customerPersonalBrainId) : null,
    defaultUserBrainId: defaultUserBrainId ? String(defaultUserBrainId) : null,
  }
}

async function resolveTargetUser(
  supabase: SupabaseClient,
  email: string,
): Promise<{ id: string; email: string }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email')
    .eq('email', email)
    .maybeSingle()
  if (error) throw new Error(`profiles lookup failed: ${error.message}`)
  if (!data) {
    throw new Error(
      `No profile found for ${email}. Create the auth user + profile in target Supabase first.`,
    )
  }
  return { id: data.id as string, email: data.email as string }
}

async function countRows(
  supabase: SupabaseClient,
  table: string,
  ctx: ImportContext,
): Promise<number> {
  if (table === 'ns_brains') {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ctx.targetUserId)
    if (error) throw new Error(`${table} count failed: ${error.message}`)
    return count ?? 0
  }

  const brainIds = [...ctx.brainIds]
  if (brainIds.length === 0) return 0

  if (
    BRAIN_SCOPED_TABLES.includes(table as (typeof BRAIN_SCOPED_TABLES)[number]) ||
    table === 'brain_cross_suggestions' ||
    table === 'customer_avatars'
  ) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .in('brain_id', brainIds)
    if (error) throw new Error(`${table} count failed: ${error.message}`)
    return count ?? 0
  }

  if (SUBJECT_SCOPED_TABLES.includes(table as (typeof SUBJECT_SCOPED_TABLES)[number])) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', ctx.targetUserId)
    if (error) throw new Error(`${table} count failed: ${error.message}`)
    return count ?? 0
  }

  if (table === 'brain_import_jobs') {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.targetUserId)
    if (error) throw new Error(`${table} count failed: ${error.message}`)
    return count ?? 0
  }

  if (table === 'ns_narrative_links') {
    const { data: pages, error: pagesError } = await supabase
      .from('ns_narrative_pages')
      .select('id')
      .in('brain_id', brainIds)
    if (pagesError) throw new Error(`ns_narrative_pages count failed: ${pagesError.message}`)
    const pageIds = (pages ?? []).map((p) => p.id as string)
    if (pageIds.length === 0) return 0
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .in('from_page_id', pageIds)
    if (error) throw new Error(`${table} count failed: ${error.message}`)
    return count ?? 0
  }

  if (table === 'ns_memory_connections') {
    const { data: memories, error: memError } = await supabase
      .from('ns_memories')
      .select('id')
      .in('brain_id', brainIds)
    if (memError) throw new Error(`ns_memories count failed: ${memError.message}`)
    const memoryIds = (memories ?? []).map((m) => m.id as string)
    if (memoryIds.length === 0) return 0
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .in('source_memory_id', memoryIds)
    if (error) throw new Error(`${table} count failed: ${error.message}`)
    return count ?? 0
  }

  return 0
}

async function importTable(
  supabase: SupabaseClient,
  table: string,
  exportKey: string,
  bundle: Record<string, unknown>,
  ctx: ImportContext,
  columnsByTable: Map<string, Set<string>>,
  report: CountReport,
  dryRun: boolean,
): Promise<void> {
  const raw = (bundle[exportKey] ?? []) as Record<string, unknown>[]
  const expected = raw.length
  if (expected === 0) {
    report[table] = { expected: 0, imported: 0, skipped: 0 }
    return
  }

  const rows: Record<string, unknown>[] = []
  let skipped = 0
  for (const row of raw) {
    const sanitized = sanitizeRow(table, row, ctx, columnsByTable)
    if (!sanitized) {
      skipped += 1
      continue
    }
    rows.push(sanitized)
  }

  process.stdout.write(`  ${table}: ${rows.length}/${expected}`)
  if (skipped > 0) process.stdout.write(` (${skipped} skipped)`)
  if (dryRun) {
    console.log(' [dry-run]')
    report[table] = { expected, imported: rows.length, skipped }
    return
  }

  await upsertBatch(supabase, table, rows, dryRun)
  console.log(' ✓')
  report[table] = { expected, imported: rows.length, skipped }
}

async function main(): Promise<void> {
  loadEnv()
  const args = parseArgs(process.argv.slice(2))
  if (!existsSync(args.exportPath)) {
    throw new Error(`Export file not found: ${args.exportPath}`)
  }

  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  assertSafeTarget(supabaseUrl, args.expectedHost)

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? null
  const columnsByTable = await loadTableColumns(databaseUrl)

  console.log(`Import brain export → ${args.targetEmail}`)
  console.log(`Target: ${new URL(supabaseUrl).host}`)
  console.log(`Export: ${args.exportPath}`)
  if (args.dryRun) console.log('Mode: dry-run (no writes)')

  const bundle = JSON.parse(readFileSync(args.exportPath, 'utf8')) as Record<string, unknown>
  const manifest = bundle.manifest as {
    format?: string
    version?: number
    user?: { id?: string; email?: string }
    tables?: Record<string, number>
  }

  if (manifest.format !== 'vibey-brain-export' || manifest.version !== 1) {
    throw new Error(`Unsupported export format: ${manifest.format} v${manifest.version}`)
  }

  const sourceUserId = manifest.user?.id ?? (bundle.profile as { id?: string })?.id
  if (!sourceUserId) throw new Error('Export missing source user id')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const targetUser = await resolveTargetUser(supabase, args.targetEmail)
  const targetConstraints = await loadTargetBrainConstraints(supabase, targetUser.id)
  const brains = (bundle.brains ?? []) as Record<string, unknown>[]
  const ctx: ImportContext = {
    sourceUserId,
    targetUserId: targetUser.id,
    brainIds: new Set(brains.map((b) => String(b.id))),
    brainIdRemap: new Map(),
    targetCustomerPersonalBrainId: targetConstraints.customerPersonalBrainId,
    targetDefaultUserBrainId: targetConstraints.defaultUserBrainId,
  }

  console.log(`Source user: ${manifest.user?.email ?? sourceUserId}`)
  console.log(`Target user: ${targetUser.email} (${targetUser.id})`)
  console.log(`Brains in bundle: ${brains.length}`)
  console.log(
    `Embeddings in bundle: ${(manifest as { with_embeddings?: boolean }).with_embeddings ? 'yes' : 'no'}`,
  )

  const report: CountReport = {}

  console.log('\nPhase 1 — ns_brains')
  await importTable(
    supabase,
    'ns_brains',
    'brains',
    bundle,
    ctx,
    columnsByTable,
    report,
    args.dryRun,
  )
  for (const to of ctx.brainIdRemap.values()) ctx.brainIds.add(to)
  if (ctx.brainIdRemap.size > 0) {
    console.log(`  brain id remaps: ${ctx.brainIdRemap.size}`)
  }

  console.log('\nPhase 2 — brain-scoped tables')
  for (const table of BRAIN_SCOPED_TABLES) {
    await importTable(supabase, table, table, bundle, ctx, columnsByTable, report, args.dryRun)
  }

  console.log('\nPhase 3 — cognition (subject-scoped)')
  for (const table of SUBJECT_SCOPED_TABLES) {
    await importTable(supabase, table, table, bundle, ctx, columnsByTable, report, args.dryRun)
  }

  console.log('\nPhase 4 — user-scoped tables')
  for (const { exportKey, table } of USER_SCOPED_TABLES) {
    await importTable(supabase, table, exportKey, bundle, ctx, columnsByTable, report, args.dryRun)
  }

  console.log('\nPhase 5 — edge / derived tables')
  for (const table of EDGE_TABLES) {
    await importTable(supabase, table, table, bundle, ctx, columnsByTable, report, args.dryRun)
  }

  if (!args.dryRun) {
    console.log('\nVerification counts (target DB):')
    const verifyTables = [
      'ns_brains',
      'ns_memories',
      'ns_belief_patterns',
      'ns_perspectives',
      'ns_narrative_pages',
      'ns_narrative_links',
      'brain_import_jobs',
    ]
    for (const table of verifyTables) {
      const count = await countRows(supabase, table, ctx)
      const manifestCount =
        manifest.tables?.[table] ?? manifest.tables?.[table === 'ns_brains' ? 'ns_brains' : table]
      const expected =
        table === 'ns_brains'
          ? brains.length
          : ((manifestCount as number | undefined) ?? report[table]?.expected ?? 0)
      const status = count >= (report[table]?.imported ?? 0) ? 'ok' : 'LOW'
      console.log(`  ${table}: ${count} (manifest ${expected}) ${status}`)
    }

    const defaultBrain = brains.find((b) => b.is_default === true && b.agent_id == null)
    if (defaultBrain) {
      const { count, error } = await supabase
        .from('ns_memories')
        .select('*', { count: 'exact', head: true })
        .eq('brain_id', String(defaultBrain.id))
      if (!error) {
        console.log(
          `\nDefault User Brain (${defaultBrain.id}): ${count ?? 0} memories (manifest ${manifest.tables?.ns_memories ?? '?'})`,
        )
      }
    }
  }

  console.log('\nImport summary:')
  for (const [table, stats] of Object.entries(report).sort(([a], [b]) => a.localeCompare(b))) {
    if (stats.expected === 0 && stats.imported === 0) continue
    console.log(
      `  ${table}: expected=${stats.expected} imported=${stats.imported} skipped=${stats.skipped}`,
    )
  }

  if (!(manifest as { with_embeddings?: boolean }).with_embeddings) {
    console.log(
      '\nNote: embeddings were not exported. Semantic search needs re-embedding — see scripts/seed-yc-demo/one-off/backfill-embeddings.ts',
    )
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
