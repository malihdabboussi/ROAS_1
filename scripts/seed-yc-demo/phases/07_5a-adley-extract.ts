/**
 * P7.5a — Adley template extraction (READ-ONLY against prod).
 *
 * What this phase does
 * --------------------
 * If SUPABASE_PROD_URL + SUPABASE_PROD_SERVICE_ROLE_KEY are set, opens a
 * SEPARATE read-only Supabase client pointed at prod, finds Adley's user
 * (and her org, if any), and dumps every artifact-table row she owns into
 * `scripts/seed-yc-demo/.cache/adley-prod-dump.json` so P7.5b can reskin
 * them per fictional client.
 *
 * Tables dumped (parent → child topology preserved):
 *   offers, funnels, funnel_pages, sequences, sequence_emails,
 *   presentations, media_assets, ad_campaigns, ad_sets, ads, forms, avatars
 *
 * If the prod env vars are not set, the phase logs a clear warning and
 * returns an empty dump. P7.5b detects this and synthesizes minimal but
 * realistic artifacts from each ClientPersona alone.
 *
 * Safety:
 *   - SELECT only. Never INSERT / UPDATE / DELETE against prod.
 *   - Cap row counts so a runaway prod query can't pull tens of thousands.
 *   - Dump is stored under scripts/seed-yc-demo/.cache/ (ignored by the
 *     phase's tsconfig); operator must verify .gitignore before committing.
 *
 * State produced (attached via inline cast — P7.5b reads the same way,
 * no _context.ts change required):
 *   (ctx.state as { adleyDump?: AdleyDump }).adleyDump = <AdleyDump>
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { startResult, type PhaseContext, type PhaseHandler } from './_context'

const PHASE_ID = '07_5a-adley-extract'

const CACHE_PATH = resolve(process.cwd(), 'scripts/seed-yc-demo/.cache/adley-prod-dump.json')

// Hard cap on rows pulled per table so a misconfigured target can never
// exfiltrate huge amounts of prod data. Adley's templates are well under this.
const PER_TABLE_ROW_CAP = 500
const CHILD_TABLE_ROW_CAP = 2000

// ─── Public types (P7.5b consumes these via the inline state cast) ─────────

export interface AdleyDumpRows {
  offers: unknown[]
  funnels: unknown[]
  funnel_pages: unknown[]
  sequences: unknown[]
  sequence_emails: unknown[]
  presentations: unknown[]
  media_assets: unknown[]
  ad_campaigns: unknown[]
  ad_sets: unknown[]
  ads: unknown[]
  forms: unknown[]
  avatars: unknown[]
}

export interface AdleyDump {
  available: boolean
  reason: string
  adleyUserId: string | null
  adleyOrgId: string | null
  fetchedAt: string | null
  rows: AdleyDumpRows
}

const ARTIFACT_TABLES: ReadonlyArray<keyof AdleyDumpRows> = [
  'offers',
  'funnels',
  'funnel_pages',
  'sequences',
  'sequence_emails',
  'presentations',
  'media_assets',
  'ad_campaigns',
  'ad_sets',
  'ads',
  'forms',
  'avatars',
]

function emptyRows(): AdleyDumpRows {
  return {
    offers: [],
    funnels: [],
    funnel_pages: [],
    sequences: [],
    sequence_emails: [],
    presentations: [],
    media_assets: [],
    ad_campaigns: [],
    ad_sets: [],
    ads: [],
    forms: [],
    avatars: [],
  }
}

function attachDump(ctx: PhaseContext, dump: AdleyDump): void {
  ;(ctx.state as { adleyDump?: AdleyDump }).adleyDump = dump
}

// ─── Prod queries ──────────────────────────────────────────────────────────

interface AdleyProfile {
  id: string
  email: string | null
  full_name: string | null
}

async function findAdleyProfile(client: SupabaseClient): Promise<AdleyProfile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, email, full_name, created_at')
    .or('email.ilike.%adley%,full_name.ilike.%adley%')
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) {
    throw new Error(`${PHASE_ID}: SELECT profiles for Adley failed: ${error.message}`)
  }
  if (!data || data.length === 0) return null
  const first = data[0] as AdleyProfile
  return first
}

async function findAdleyOrgId(client: SupabaseClient, adleyUserId: string): Promise<string | null> {
  // Organizations owner_id has been the canonical field across the project's
  // org migrations — fall back to null (personal context) if there's no row.
  const { data, error } = await client
    .from('organizations')
    .select('id')
    .eq('owner_id', adleyUserId)
    .limit(1)
  if (error) {
    // Don't fail the whole phase — Adley may be personal-only.
    return null
  }
  if (!data || data.length === 0) return null
  return (data[0] as { id: string }).id
}

async function fetchOwnedRows(
  client: SupabaseClient,
  table: string,
  adleyUserId: string,
  adleyOrgId: string | null,
): Promise<unknown[]> {
  let query = client.from(table).select('*').limit(PER_TABLE_ROW_CAP)
  if (adleyOrgId) {
    query = query.or(`user_id.eq.${adleyUserId},org_id.eq.${adleyOrgId}`)
  } else {
    query = query.eq('user_id', adleyUserId)
  }
  const { data, error } = await query
  if (error) {
    throw new Error(`${PHASE_ID}: SELECT ${table} for Adley failed: ${error.message}`)
  }
  return data ?? []
}

async function fetchChildrenByParent(
  client: SupabaseClient,
  table: string,
  parentColumn: string,
  parentIds: string[],
): Promise<unknown[]> {
  if (parentIds.length === 0) return []
  const { data, error } = await client
    .from(table)
    .select('*')
    .in(parentColumn, parentIds)
    .limit(CHILD_TABLE_ROW_CAP)
  if (error) {
    throw new Error(
      `${PHASE_ID}: SELECT ${table} via ${parentColumn} IN (${parentIds.length} ids) failed: ${error.message}`,
    )
  }
  return data ?? []
}

function pluckIds(rows: unknown[]): string[] {
  const out: string[] = []
  for (const r of rows) {
    if (r && typeof r === 'object' && 'id' in r) {
      const id = (r as { id: unknown }).id
      if (typeof id === 'string') out.push(id)
    }
  }
  return out
}

// ─── Phase handler ─────────────────────────────────────────────────────────

export const runP07_5aAdleyExtract: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  ctx.log.step('P7.5a — Adley template extraction (read-only against prod)')

  const warnings: string[] = []
  const dump: AdleyDump = {
    available: false,
    reason: '',
    adleyUserId: null,
    adleyOrgId: null,
    fetchedAt: null,
    rows: emptyRows(),
  }

  // 1) Dry-run short-circuit. Produce an empty dump so P7.5b's branch that
  //    synthesizes from personas alone runs end-to-end.
  if (ctx.dryRun) {
    ctx.log.step(
      "[dry-run] would query prod for Adley's user/org, then dump offers, funnels, funnel_pages, sequences, sequence_emails, presentations, media_assets, ad_campaigns, ad_sets, ads, forms, avatars to scripts/seed-yc-demo/.cache/adley-prod-dump.json",
    )
    dump.reason = 'dry-run'
    attachDump(ctx, dump)
    ctx.log.step(
      '[dry-run] state.adleyDump = { available: false, rows: empty } — P7.5b will synthesize from personas.',
    )
    return r.finish({ adley_rows_dumped: 0 }, warnings)
  }

  // 2) Env-guard. If prod creds aren't set, P7.5b must synthesize from
  //    personas; do not silently fall back to a stale local file.
  const prodUrl = process.env.SUPABASE_PROD_URL
  const prodKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY
  if (!prodUrl || !prodKey) {
    const msg =
      'Adley extraction skipped — set SUPABASE_PROD_URL + SUPABASE_PROD_SERVICE_ROLE_KEY to enable. P7.5b will synthesize artifacts from client personas alone.'
    ctx.log.warn(msg)
    warnings.push(msg)
    dump.reason = 'prod env vars missing'
    attachDump(ctx, dump)
    return r.finish({ adley_rows_dumped: 0 }, warnings)
  }

  // 3) Separate read-only prod client. NEVER reuse ctx.supabase (that points
  //    at the demo target). The seeder is destructive against demo; this
  //    client must only SELECT.
  const prodClient = createClient(prodUrl, prodKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  })

  // 4) Resolve Adley → user_id + org_id.
  const adley = await findAdleyProfile(prodClient)
  if (!adley) {
    const msg =
      'P7.5a: no Adley profile found in prod (no email/full_name match). P7.5b will synthesize from personas alone.'
    ctx.log.warn(msg)
    warnings.push(msg)
    dump.reason = 'no Adley profile match in prod'
    attachDump(ctx, dump)
    return r.finish({ adley_rows_dumped: 0 }, warnings)
  }
  ctx.log.step(`P7.5a — matched Adley: user_id=${adley.id} email=${adley.email ?? '(null)'}`)

  const adleyOrgId = await findAdleyOrgId(prodClient, adley.id)
  ctx.log.step(`P7.5a — Adley org_id=${adleyOrgId ?? '(personal context, no org)'}`)

  // 5) Dump parent tables.
  const parentTables: ReadonlyArray<keyof AdleyDumpRows> = [
    'offers',
    'funnels',
    'sequences',
    'presentations',
    'media_assets',
    'ad_campaigns',
    'ads',
    'forms',
    'avatars',
  ]
  for (const table of parentTables) {
    const rows = await fetchOwnedRows(prodClient, table, adley.id, adleyOrgId)
    dump.rows[table] = rows
    ctx.log.step(`P7.5a — dumped ${table} = ${rows.length} rows`)
  }

  // 6) Child tables (FK topology preserved). Pull by parent-id arrays.
  const funnelIds = pluckIds(dump.rows.funnels)
  const sequenceIds = pluckIds(dump.rows.sequences)
  const adCampaignIds = pluckIds(dump.rows.ad_campaigns)

  dump.rows.funnel_pages = await fetchChildrenByParent(
    prodClient,
    'funnel_pages',
    'funnel_id',
    funnelIds,
  )
  ctx.log.step(`P7.5a — dumped funnel_pages = ${dump.rows.funnel_pages.length} rows`)

  dump.rows.sequence_emails = await fetchChildrenByParent(
    prodClient,
    'sequence_emails',
    'sequence_id',
    sequenceIds,
  )
  ctx.log.step(`P7.5a — dumped sequence_emails = ${dump.rows.sequence_emails.length} rows`)

  dump.rows.ad_sets = await fetchChildrenByParent(
    prodClient,
    'ad_sets',
    'ad_campaign_id',
    adCampaignIds,
  )
  ctx.log.step(`P7.5a — dumped ad_sets = ${dump.rows.ad_sets.length} rows`)

  // 7) Finalize + cache.
  dump.available = true
  dump.adleyUserId = adley.id
  dump.adleyOrgId = adleyOrgId
  dump.fetchedAt = ctx.timeline.iso(ctx.timeline.now())

  await mkdir(dirname(CACHE_PATH), { recursive: true })
  await writeFile(CACHE_PATH, JSON.stringify(dump, null, 2), 'utf8')
  ctx.log.step(`P7.5a — cached dump to ${CACHE_PATH}`)

  const gitignoreWarning =
    'P7.5a: verify .gitignore covers scripts/seed-yc-demo/.cache/ before committing. The dump contains prod template data and must not be checked in.'
  ctx.log.warn(gitignoreWarning)
  warnings.push(gitignoreWarning)

  attachDump(ctx, dump)

  const rowCounts: Record<string, number> = {
    adley_rows_dumped: 0,
  }
  let total = 0
  for (const table of ARTIFACT_TABLES) {
    const count = dump.rows[table].length
    rowCounts[`adley_prod.${table}`] = count
    total += count
  }
  rowCounts.adley_rows_dumped = total

  return r.finish(rowCounts, warnings)
}
