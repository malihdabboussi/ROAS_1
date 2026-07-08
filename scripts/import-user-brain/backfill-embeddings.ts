#!/usr/bin/env tsx
/**
 * Backfill embeddings for imported brain content on ROAS (or any target Supabase).
 *
 * Usage:
 *   pnpm import:brain-embeddings -- --owner-email=test@gmail.com
 *   pnpm import:brain-embeddings -- --owner-email=test@gmail.com --table=memories --limit=100
 *
 * Env: scripts/roas/roas-secrets.env (SUPABASE_*, GEMINI_API_KEY)
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const BLOCKED_HOSTS = new Set(['qfrvykscoymiwwgysvsr.supabase.co'])
const DEFAULT_EXPECTED_HOST = 'lhfgtsjetcardinpgouq.supabase.co'
const DEFAULT_MODEL = 'gemini-embedding-2'
const EMBEDDING_DIMENSIONS = 768
const DEFAULT_CONCURRENCY = 8
const DEFAULT_PAGE_SIZE = 500
const MAX_TEXT_CHARS = 8000
const NARRATIVE_MAX_CHARS = 4000

type TableKey = 'memories' | 'snapshots' | 'sk' | 'pages'
const ALL_TABLES: readonly TableKey[] = ['memories', 'snapshots', 'sk', 'pages']

interface CliArgs {
  ownerEmail: string
  expectedHost: string
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
  table: string
  select: string
  buildText: (row: Record<string, unknown>) => string
}

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
}

function parseArgs(argv: string[]): CliArgs {
  let ownerEmail = 'test@gmail.com'
  let expectedHost = process.env.EXPECTED_SUPABASE_HOST ?? DEFAULT_EXPECTED_HOST
  let tables: TableKey[] = [...ALL_TABLES]
  let limit: number | null = null
  let concurrency = DEFAULT_CONCURRENCY
  let dryRun = false

  for (const arg of argv) {
    if (arg.startsWith('--owner-email=')) ownerEmail = arg.slice('--owner-email='.length).trim()
    else if (arg.startsWith('--expected-host='))
      expectedHost = arg.slice('--expected-host='.length).trim()
    else if (arg === '--dry-run') dryRun = true
    else if (arg.startsWith('--table=')) {
      const v = arg.slice('--table='.length)
      if (v === 'all') tables = [...ALL_TABLES]
      else if ((ALL_TABLES as readonly string[]).includes(v)) tables = [v as TableKey]
      else throw new Error(`--table must be one of: all,${ALL_TABLES.join(',')}`)
    } else if (arg.startsWith('--limit=')) {
      limit = Number.parseInt(arg.slice('--limit='.length), 10)
      if (!Number.isFinite(limit) || limit <= 0) throw new Error('--limit must be positive')
    } else if (arg.startsWith('--concurrency=')) {
      concurrency = Number.parseInt(arg.slice('--concurrency='.length), 10)
      if (!Number.isFinite(concurrency) || concurrency <= 0 || concurrency > 32) {
        throw new Error('--concurrency must be 1..32')
      }
    }
  }

  if (!ownerEmail) throw new Error('Missing --owner-email=')
  return { ownerEmail, expectedHost, tables, limit, concurrency, dryRun }
}

function assertSafeTarget(supabaseUrl: string, expectedHost: string): void {
  const host = new URL(supabaseUrl).host
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error(`Refusing: SUPABASE_URL host ${host} is Vibey production`)
  }
  if (host !== expectedHost) {
    throw new Error(`Refusing: SUPABASE_URL host is ${host}, expected ${expectedHost}`)
  }
}

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
        await new Promise((r) => setTimeout(r, Math.min(2 ** attempt * 250, 8000)))
        lastErr = `${res.status}`
        continue
      }
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`)
      }
      const data = (await res.json()) as { embedding?: { values?: number[] } }
      const values = data.embedding?.values
      if (!values?.length) return null
      return values
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err)
      await new Promise((r) => setTimeout(r, Math.min(2 ** attempt * 250, 8000)))
    }
  }
  throw new Error(`embed failed: ${lastErr}`)
}

async function resolveBrainIds(supabase: SupabaseClient, ownerEmail: string): Promise<string[]> {
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', ownerEmail)
    .maybeSingle()
  if (profileErr || !profile?.id) {
    throw new Error(`Profile not found for ${ownerEmail}: ${profileErr?.message}`)
  }

  const { data: brains, error } = await supabase
    .from('ns_brains')
    .select('id')
    .eq('owner_id', profile.id)
  if (error) throw new Error(`Failed to load brains: ${error.message}`)
  return (brains ?? []).map((b) => b.id as string)
}

function tableSpecs(): Record<TableKey, TableSpec> {
  return {
    memories: {
      table: 'ns_memories',
      select: 'id, content',
      buildText: (row) => String(row.content ?? ''),
    },
    snapshots: {
      table: 'ns_snapshots',
      select: 'id, name, core, one_liner',
      buildText: (row) => [row.name, row.core, row.one_liner].filter(Boolean).join(' — '),
    },
    sk: {
      table: 'ns_sk_entries',
      select: 'id, title, content',
      buildText: (row) => `${row.title ?? ''}\n${row.content ?? ''}`.trim(),
    },
    pages: {
      table: 'ns_narrative_pages',
      select: 'id, content_md',
      buildText: (row) => String(row.content_md ?? '').slice(0, NARRATIVE_MAX_CHARS),
    },
  }
}

async function fetchRows(
  supabase: SupabaseClient,
  spec: TableSpec,
  brainIds: string[],
  limit: number | null,
): Promise<Row[]> {
  const out: Row[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await supabase
      .from(spec.table)
      .select(spec.select)
      .in('brain_id', brainIds)
      .is('embedding', null)
      .order('id', { ascending: true })
      .range(offset, offset + DEFAULT_PAGE_SIZE - 1)
    if (error) throw new Error(`Failed to read ${spec.table}: ${error.message}`)

    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const text = spec.buildText(row).trim()
      if (!text) continue
      out.push({ id: String(row.id), text })
      if (limit && out.length >= limit) return out
    }
    if ((data ?? []).length < DEFAULT_PAGE_SIZE) break
    offset += DEFAULT_PAGE_SIZE
  }
  return out
}

async function processTable(
  supabase: SupabaseClient,
  key: TableKey,
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

  async function worker(): Promise<void> {
    while (true) {
      const idx = cursor++
      if (idx >= rows.length) return
      const row = rows[idx]
      try {
        const vec = await embed(row.text, apiKey, model)
        if (!vec) {
          skipped++
          continue
        }
        if (!dryRun) {
          const { error } = await supabase
            .from(spec.table)
            .update({ embedding: `[${vec.join(',')}]` })
            .eq('id', row.id)
          if (error) {
            failed++
            continue
          }
        }
        embedded++
        if ((embedded + skipped + failed) % 100 === 0) {
          process.stdout.write(`  ${key}: ${embedded + skipped + failed}/${rows.length}\n`)
        }
      } catch {
        failed++
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return { embedded, skipped, failed }
}

async function main(): Promise<void> {
  loadEnv()
  const args = parseArgs(process.argv.slice(2))
  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  if (!supabaseUrl || !supabaseKey)
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  if (!geminiKey) throw new Error('Missing GEMINI_API_KEY')
  assertSafeTarget(supabaseUrl, args.expectedHost)

  const model = process.env.EMBEDDING_MODEL?.trim() || DEFAULT_MODEL
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`Embedding backfill → ${args.ownerEmail} @ ${new URL(supabaseUrl).host}`)
  const brainIds = await resolveBrainIds(supabase, args.ownerEmail)
  console.log(`Brains in scope: ${brainIds.length}`)

  const specs = tableSpecs()
  let totalEmbedded = 0
  let totalFailed = 0

  for (const key of args.tables) {
    const spec = specs[key]
    console.log(`\n→ ${spec.table} (embedding IS NULL)`)
    const rows = await fetchRows(supabase, spec, brainIds, args.limit)
    console.log(`  rows: ${rows.length}`)
    if (rows.length === 0) continue

    const result = await processTable(
      supabase,
      key,
      spec,
      rows,
      geminiKey,
      model,
      args.concurrency,
      args.dryRun,
    )
    totalEmbedded += result.embedded
    totalFailed += result.failed
    console.log(
      `  done: embedded=${result.embedded} failed=${result.failed} skipped=${result.skipped}`,
    )
  }

  console.log(`\nTotal embedded: ${totalEmbedded}, failed: ${totalFailed}`)
  if (totalFailed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
