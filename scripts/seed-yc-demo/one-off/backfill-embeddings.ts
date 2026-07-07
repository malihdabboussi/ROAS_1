#!/usr/bin/env tsx
/**
 * One-off: backfill Gemini embeddings for the YC demo (Foundry Creative).
 *
 * The seeder (03a / 03b1 / 03b2) inserts brain content with `embedding = NULL`.
 * This script fills those vectors so semantic search (search_ns_memories,
 * find_similar_snapshots, search_sk_entries, search_company_cortex_objects,
 * search_narrative_pages) actually returns results.
 *
 * Tables scoped to Foundry Creative (org 9fb9a0c1...) + the founder's
 * personal user brain (owner = yc-demo@vibey.im):
 *
 *   ns_memories             ← content
 *   ns_snapshots            ← name — core — one_liner
 *   ns_sk_entries           ← title\ncontent
 *   company_cortex_objects  ← title\ntruth     (filtered by org_id)
 *   ns_narrative_pages      ← content_md (first 4000 chars)
 *
 * Idempotent: only fetches rows where `embedding IS NULL`. Re-run safely.
 *
 * Usage:
 *   tsx scripts/seed-yc-demo/one-off/backfill-embeddings.ts \
 *     [--table=all|memories|snapshots|sk|cortex|pages] \
 *     [--limit=N] \
 *     [--concurrency=N] \
 *     [--dry-run]
 *
 * Required env (auto-loads from apps/api/.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const ORG_ID = '9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800'
const FOUNDER_EMAIL = 'yc-demo@vibey.im'

const DEFAULT_MODEL = 'gemini-embedding-2'
const EMBEDDING_DIMENSIONS = 768
const DEFAULT_CONCURRENCY = 8
const DEFAULT_PAGE_SIZE = 500
const MAX_TEXT_CHARS = 8000
const NARRATIVE_MAX_CHARS = 4000

type TableKey = 'memories' | 'snapshots' | 'sk' | 'cortex' | 'pages'
const ALL_TABLES: readonly TableKey[] = ['memories', 'snapshots', 'sk', 'cortex', 'pages']

interface CliArgs {
  tables: TableKey[]
  limit: number | null
  concurrency: number
  dryRun: boolean
}

interface Row {
  id: string
  text: string
}

interface TableSpec {
  key: TableKey
  table: string
  select: string
  brainScoped: boolean
  buildText: (row: Record<string, unknown>) => string
}

// ── env / args ─────────────────────────────────────────────────────────────

function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), 'apps/api/.env')
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    tables: [...ALL_TABLES],
    limit: null,
    concurrency: DEFAULT_CONCURRENCY,
    dryRun: false,
  }
  for (const raw of argv.slice(2)) {
    if (raw === '--dry-run') args.dryRun = true
    else if (raw.startsWith('--table=')) {
      const v = raw.slice('--table='.length)
      if (v === 'all') args.tables = [...ALL_TABLES]
      else if ((ALL_TABLES as readonly string[]).includes(v)) args.tables = [v as TableKey]
      else throw new Error(`--table must be one of: all,${ALL_TABLES.join(',')}`)
    } else if (raw.startsWith('--limit=')) {
      const n = Number.parseInt(raw.slice('--limit='.length), 10)
      if (!Number.isFinite(n) || n <= 0) throw new Error('--limit must be a positive integer')
      args.limit = n
    } else if (raw.startsWith('--concurrency=')) {
      const n = Number.parseInt(raw.slice('--concurrency='.length), 10)
      if (!Number.isFinite(n) || n <= 0 || n > 32) {
        throw new Error('--concurrency must be 1..32')
      }
      args.concurrency = n
    } else {
      throw new Error(`Unknown arg: ${raw}`)
    }
  }
  return args
}

// ── Gemini embeddings ──────────────────────────────────────────────────────

async function embed(text: string, apiKey: string, model: string): Promise<number[] | null> {
  const cleaned = text.trim().slice(0, MAX_TEXT_CHARS)
  if (!cleaned) return null

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`
  const body = {
    content: { parts: [{ text: cleaned }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
    taskType: 'RETRIEVAL_DOCUMENT',
  }

  let lastErr = ''
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status === 429 || res.status === 503) {
        const wait = Math.min(2 ** attempt * 250, 8000)
        await new Promise((r) => setTimeout(r, wait))
        lastErr = `${res.status}`
        continue
      }
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`)
      }
      const data = (await res.json()) as { embedding?: { values?: number[] } }
      const values = data.embedding?.values
      if (!values || values.length === 0) return null
      return values
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err)
      const wait = Math.min(2 ** attempt * 250, 8000)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw new Error(`embed failed after retries: ${lastErr}`)
}

// ── scope resolution ───────────────────────────────────────────────────────

async function resolveScope(supabase: SupabaseClient): Promise<{
  founderUserId: string
  brainIds: string[]
}> {
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', FOUNDER_EMAIL)
    .maybeSingle()
  if (profileErr || !profile?.id) {
    throw new Error(`Founder profile not found for ${FOUNDER_EMAIL}: ${profileErr?.message}`)
  }
  const founderUserId = profile.id as string

  const { data: orgBrains, error: orgBrainsErr } = await supabase
    .from('ns_brains')
    .select('id')
    .eq('org_id', ORG_ID)
  if (orgBrainsErr) throw new Error(`Failed to load org brains: ${orgBrainsErr.message}`)

  const { data: userBrains, error: userBrainsErr } = await supabase
    .from('ns_brains')
    .select('id')
    .eq('owner_id', founderUserId)
    .eq('scope', 'user')
  if (userBrainsErr) throw new Error(`Failed to load user brains: ${userBrainsErr.message}`)

  const brainIds = [
    ...new Set([
      ...(orgBrains ?? []).map((r) => r.id as string),
      ...(userBrains ?? []).map((r) => r.id as string),
    ]),
  ]

  return { founderUserId, brainIds }
}

// ── table specs ────────────────────────────────────────────────────────────

function tableSpecs(): Record<TableKey, TableSpec> {
  return {
    memories: {
      key: 'memories',
      table: 'ns_memories',
      select: 'id, content',
      brainScoped: true,
      buildText: (row) => String(row.content ?? ''),
    },
    snapshots: {
      key: 'snapshots',
      table: 'ns_snapshots',
      select: 'id, name, core, one_liner',
      brainScoped: true,
      buildText: (row) => [row.name, row.core, row.one_liner].filter(Boolean).join(' — '),
    },
    sk: {
      key: 'sk',
      table: 'ns_sk_entries',
      select: 'id, title, content',
      brainScoped: true,
      buildText: (row) => `${row.title ?? ''}\n${row.content ?? ''}`.trim(),
    },
    cortex: {
      key: 'cortex',
      table: 'company_cortex_objects',
      select: 'id, title, truth',
      brainScoped: false,
      buildText: (row) => `${row.title ?? ''}\n${row.truth ?? ''}`.trim(),
    },
    pages: {
      key: 'pages',
      table: 'ns_narrative_pages',
      select: 'id, content_md',
      brainScoped: true,
      buildText: (row) => String(row.content_md ?? '').slice(0, NARRATIVE_MAX_CHARS),
    },
  }
}

// ── fetch null-embedding rows ──────────────────────────────────────────────

async function fetchRows(
  supabase: SupabaseClient,
  spec: TableSpec,
  brainIds: string[],
  limit: number | null,
): Promise<Row[]> {
  const out: Row[] = []
  let offset = 0
  for (;;) {
    let query = supabase
      .from(spec.table)
      .select(spec.select)
      .is('embedding', null)
      .order('id', { ascending: true })
      .range(offset, offset + DEFAULT_PAGE_SIZE - 1)

    if (spec.brainScoped) {
      query = query.in('brain_id', brainIds)
    } else {
      query = query.eq('org_id', ORG_ID)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to read ${spec.table}: ${error.message}`)
    const rows = (data ?? []) as Array<Record<string, unknown>>
    for (const row of rows) {
      const text = spec.buildText(row).trim()
      if (!text) continue
      out.push({ id: String(row.id), text })
      if (limit && out.length >= limit) return out
    }
    if (rows.length < DEFAULT_PAGE_SIZE) break
    offset += DEFAULT_PAGE_SIZE
  }
  return out
}

// ── worker pool ────────────────────────────────────────────────────────────

async function processTable(
  supabase: SupabaseClient,
  spec: TableSpec,
  rows: Row[],
  apiKey: string,
  model: string,
  concurrency: number,
  dryRun: boolean,
): Promise<{ embedded: number; skipped: number; failed: number }> {
  let cursor = 0
  let embedded = 0
  let skipped = 0
  let failed = 0
  const start = Date.now()
  const total = rows.length

  function logProgress(): void {
    const done = embedded + skipped + failed
    if (done === 0 || done % 50 !== 0) return
    const elapsed = (Date.now() - start) / 1000
    const rate = (done / elapsed).toFixed(1)
    process.stdout.write(
      `  ${spec.key}: ${done}/${total}  (${rate}/s, embedded=${embedded}, failed=${failed}, skipped=${skipped})\n`,
    )
  }

  async function worker(): Promise<void> {
    while (true) {
      const idx = cursor++
      if (idx >= rows.length) return
      const row = rows[idx]
      try {
        const vec = await embed(row.text, apiKey, model)
        if (!vec) {
          skipped++
          logProgress()
          continue
        }
        if (!dryRun) {
          const { error } = await supabase
            .from(spec.table)
            .update({ embedding: `[${vec.join(',')}]` })
            .eq('id', row.id)
          if (error) {
            failed++
            console.error(`    ✗ ${spec.table} ${row.id}: ${error.message}`)
            logProgress()
            continue
          }
        }
        embedded++
        logProgress()
      } catch (err) {
        failed++
        console.error(
          `    ✗ ${spec.table} ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        )
        logProgress()
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)
  return { embedded, skipped, failed }
}

// ── main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadDotEnv()
  const args = parseArgs(process.argv)

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  if (!geminiKey) {
    throw new Error('Missing GEMINI_API_KEY (add to apps/api/.env)')
  }
  const model = process.env.EMBEDDING_MODEL || DEFAULT_MODEL

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('━━━ YC demo embedding backfill ━━━')
  console.log(`  org_id      : ${ORG_ID}`)
  console.log(`  model       : ${model}`)
  console.log(`  tables      : ${args.tables.join(',')}`)
  console.log(`  concurrency : ${args.concurrency}`)
  console.log(`  limit       : ${args.limit ?? 'unlimited'}`)
  console.log(`  dry_run     : ${args.dryRun}`)
  console.log('')

  const { brainIds } = await resolveScope(supabase)
  console.log(`Resolved ${brainIds.length} brain(s) in scope.`)

  const specs = tableSpecs()
  const totals = { embedded: 0, skipped: 0, failed: 0 }

  for (const key of args.tables) {
    const spec = specs[key]
    console.log(`\n→ Loading ${spec.table} where embedding IS NULL ...`)
    const rows = await fetchRows(supabase, spec, brainIds, args.limit)
    console.log(`  found: ${rows.length}`)
    if (rows.length === 0) continue

    const result = await processTable(
      supabase,
      spec,
      rows,
      geminiKey,
      model,
      args.concurrency,
      args.dryRun,
    )
    totals.embedded += result.embedded
    totals.skipped += result.skipped
    totals.failed += result.failed
    console.log(
      `  done: embedded=${result.embedded}, failed=${result.failed}, skipped=${result.skipped}`,
    )
  }

  console.log('\n━━━ totals ━━━')
  console.log(`  embedded : ${totals.embedded}`)
  console.log(`  failed   : ${totals.failed}`)
  console.log(`  skipped  : ${totals.skipped} (empty text)`)
  if (args.dryRun) {
    console.log('\nDRY RUN — no writes performed.')
  }
  if (totals.failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
