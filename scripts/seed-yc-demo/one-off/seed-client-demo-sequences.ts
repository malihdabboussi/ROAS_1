#!/usr/bin/env tsx
/**
 * One-off: seed Almanac, Saltline, Cloverkin, Throughput demo sequences.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ids } from '../lib/ids'
import { createLogger } from '../lib/log'
import * as timelineHelpers from '../lib/timeline'
import type { PhaseContext } from '../phases/_context'
import { seedClientDemoSequences } from '../phases/10e-client-demo-sequences'

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

async function main(): Promise<void> {
  loadDotEnv()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const log = createLogger(false)
  const ctx: PhaseContext = {
    supabase,
    ids,
    log,
    timeline: timelineHelpers,
    dryRun: false,
    reset: false,
    state: {},
  }

  const counts = await seedClientDemoSequences(ctx)
  console.log(JSON.stringify(counts, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
