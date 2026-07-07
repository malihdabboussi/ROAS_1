#!/usr/bin/env tsx
/**
 * scripts/seed-yc-demo/index.ts
 *
 * One-shot seeder that provisions the YC demo account "Foundry Creative"
 * in a Supabase project. See scripts/seed-yc-demo/README.md for the full
 * design and .cursor/plans/yc_demo_account_seed_*.plan.md for the plan.
 *
 * Usage:
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   API_BASE_URL=https://api.vibey.im
 *   INTERNAL_API_TOKEN=...
 *   OPENAI_API_KEY=...    (required from P3a onward for embeddings)
 *   pnpm seed:yc-demo [--phase=all|<id>] [--dry-run] [--reset] [--list]
 *
 * Default phase set excludes 11-atlas-fresh; pass --phase=11-atlas-fresh
 * (or --enable-atlas-fresh) to run it.
 */
import { createApiClient } from './lib/api'
import { loadEnv } from './lib/env'
import { ids } from './lib/ids'
import { createLogger } from './lib/log'
import { createServiceClient } from './lib/supabase'
import * as timelineHelpers from './lib/timeline'
import type { PhaseContext, PhaseResult, PhaseState } from './phases/_context'
import { DEFAULT_PHASE_IDS, OPTIONAL_PHASE_IDS, PHASE_REGISTRY } from './phases/_registry'

interface CliArgs {
  phase: 'all' | string
  dryRun: boolean
  reset: boolean
  list: boolean
  enableAtlasFresh: boolean
  enableIntegrations: boolean
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    phase: 'all',
    dryRun: false,
    reset: false,
    list: false,
    enableAtlasFresh: false,
    enableIntegrations: false,
    help: false,
  }
  for (const raw of argv.slice(2)) {
    if (raw === '--dry-run') args.dryRun = true
    else if (raw === '--reset') args.reset = true
    else if (raw === '--list') args.list = true
    else if (raw === '--enable-atlas-fresh') args.enableAtlasFresh = true
    else if (raw === '--enable-integrations') args.enableIntegrations = true
    else if (raw === '--help' || raw === '-h') args.help = true
    else if (raw.startsWith('--phase=')) args.phase = raw.slice('--phase='.length)
    else throw new Error(`Unknown arg: ${raw}`)
  }
  return args
}

function printHelp(): void {
  console.log(`
seed-yc-demo — provision the Foundry Creative YC demo account.

Required env:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  API_BASE_URL
  INTERNAL_API_TOKEN

Optional env:
  OPENAI_API_KEY                 required from Phase 03a (embeddings)
  EXPECTED_SUPABASE_HOST         assert SUPABASE_URL host matches before running

Flags:
  --phase=<id|all>               run a single phase or the default sequence
  --dry-run                      print intended INSERTs, do not commit
  --reset                        tear down the demo org if it exists, then re-seed
  --enable-atlas-fresh           include the optional 11-atlas-fresh phase
  --enable-integrations          include the optional 09-integrations phase
  --list                         show the phase registry and exit
  --help, -h                     show this help

Phase ids (in execution order):
${PHASE_REGISTRY.map((p) => `  ${p.id.padEnd(28, ' ')} ${p.name}`).join('\n')}
`)
}

function printList(): void {
  console.log('Phase registry (execution order):')
  for (const p of PHASE_REGISTRY) {
    const optional = OPTIONAL_PHASE_IDS.includes(p.id) ? ' (optional)' : ''
    console.log(`  ${p.id.padEnd(28, ' ')} ${p.name}${optional}`)
    console.log(`  ${' '.repeat(28)} ${p.description}`)
  }
}

function selectPhases(args: CliArgs): typeof PHASE_REGISTRY {
  if (args.phase === 'all') {
    const optedIn = new Set<string>(DEFAULT_PHASE_IDS)
    if (args.enableAtlasFresh) optedIn.add('11-atlas-fresh')
    if (args.enableIntegrations) optedIn.add('09-integrations')
    return PHASE_REGISTRY.filter((p) => optedIn.has(p.id))
  }
  const found = PHASE_REGISTRY.filter((p) => p.id === args.phase)
  if (found.length === 0) {
    throw new Error(`Unknown phase id: ${args.phase}. Run --list to see options.`)
  }
  return found
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)
  if (args.help) {
    printHelp()
    return
  }
  if (args.list) {
    printList()
    return
  }

  const log = createLogger()
  log.raw('')
  log.raw('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log.raw('  YC DEMO ACCOUNT — Foundry Creative')
  log.raw('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const env = loadEnv()
  const supabase = createServiceClient(env)
  const api = createApiClient(env)

  const state: PhaseState = {}
  const ctx: PhaseContext = {
    env,
    supabase,
    api,
    log,
    ids,
    timeline: timelineHelpers,
    dryRun: args.dryRun,
    reset: args.reset,
    state,
  }

  log.raw(`  Supabase: ${env.supabaseUrl}`)
  log.raw(`  API base: ${env.apiBaseUrl}`)
  log.raw(`  Dry run:  ${args.dryRun ? 'YES (no commits)' : 'no — will write'}`)
  log.raw(`  Reset:    ${args.reset ? 'YES (teardown demo org first)' : 'no'}`)
  log.raw('')

  const phases = selectPhases(args)
  const results: PhaseResult[] = []
  const t0 = Date.now()

  for (const phase of phases) {
    log.phase(phase.id, `${phase.name} — ${phase.description}`)
    const result = await phase.handler(ctx)
    for (const [table, count] of Object.entries(result.rowCounts)) {
      log.rowCount(table, count)
    }
    for (const warning of result.warnings) {
      log.warn(warning)
    }
    log.done(phase.id, result.durationMs)
    results.push(result)
  }

  const totalMs = Date.now() - t0
  log.raw('')
  log.raw('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log.raw(`  ✓ ${phases.length} phases complete in ${(totalMs / 1000).toFixed(1)}s`)
  log.raw('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log.raw('')

  if (args.dryRun) {
    log.warn('Dry run — nothing was committed.')
  }
}

main().catch((err) => {
  console.error('')
  console.error('  ✗ seed-yc-demo failed:')
  console.error(err)
  process.exit(1)
})
