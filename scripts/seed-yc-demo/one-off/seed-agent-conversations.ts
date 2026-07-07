#!/usr/bin/env tsx
/**
 * One-off: seed titled agent conversations for the YC demo org.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ids } from '../lib/ids'
import { createLogger } from '../lib/log'
import * as timelineHelpers from '../lib/timeline'
import type { PhaseContext } from '../phases/_context'
import { seedAgentConversationsForOrg } from '../phases/10c-agent-conversations'

const ORG_ID = '9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800'
const FOUNDER_EMAIL = 'yc-demo@vibey.im'

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

  const { data: founder, error: founderErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', FOUNDER_EMAIL)
    .maybeSingle()
  if (founderErr || !founder?.id) {
    throw new Error(`Founder profile not found for ${FOUNDER_EMAIL}: ${founderErr?.message}`)
  }

  const log = createLogger(false)
  const ctx: PhaseContext = {
    supabase,
    ids,
    log,
    timeline: timelineHelpers,
    dryRun: false,
    reset: false,
    state: {
      orgId: ORG_ID,
      founderUserId: founder.id as string,
    },
  }

  const counts = await seedAgentConversationsForOrg(ctx, { replaceExisting: true })
  console.log(JSON.stringify(counts, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
