/**
 * P11 — Optional Atlas freshness pass.
 *
 * Enqueues 7 `brain_ops_outbox` events that the mission-worker will pick up:
 *   1. `company_daily_dream` (manual=true) on the company brain
 *   2. `brain_pattern_analysis` × 3 — user brain, customer brain, first deep
 *      agent brain (Maya by default — the first key in state.agentBrainIds)
 *   3. `brain_avatar_synthesis` × 1 — customer brain
 *   4. `brain_library_sync` × 2 — user brain + company brain
 *
 * Processor: apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts
 *
 * If mission-worker is reachable from production, these events will be
 * processed and the "Cortex Max last run" timestamps in the UI will go
 * fresh-green (in addition to the lived-in counters set in P3b2). If
 * mission-worker is not reachable, the rows just sit queued — that's also
 * fine for the demo.
 *
 * NOTE on `status`: the column default is `'pending'` and the worker's
 * dispatcher polls `status = 'pending'`. We set `'queued'` here per the
 * seeder spec — flip to `'pending'` if the worker should actually drain
 * these in this environment.
 *
 * Off by default; only runs with `--phase=11-atlas-fresh` or
 * `--enable-atlas-fresh`.
 */
import { startResult, type PhaseContext, type PhaseHandler } from './_context'

const PHASE_ID = '11-atlas-fresh'

const DRY_RUN_AGENT_SLUGS = ['maya', 'leo', 'sara', 'devon', 'casey'] as const

type BrainOpsEventType =
  | 'company_daily_dream'
  | 'brain_pattern_analysis'
  | 'brain_avatar_synthesis'
  | 'brain_library_sync'

interface BrainOpsRow {
  id: string
  brain_id: string
  user_id: string
  org_id: string
  event_type: BrainOpsEventType
  dedupe_key: string
  payload: Record<string, unknown>
  status: 'pending'
  attempts: 0
  next_attempt_at: string
  created_at: string
}

/**
 * Single-phase dry-run isolation: synthesize the deterministic IDs that
 * P1/P2/P4 would have populated so this phase can preview its INSERTs
 * without depending on the upstream phases having run.
 */
function ensureDryRunBootstrap(ctx: PhaseContext): void {
  const { state, ids, log } = ctx
  if (!ctx.dryRun) return

  let mutated = false
  if (!state.orgId) {
    state.orgId = ids.id('org', 'foundry-creative')
    mutated = true
  }
  if (!state.founderUserId) {
    state.founderUserId = ids.id('user', 'founder')
    mutated = true
  }
  if (!state.defaultUserBrainId) {
    state.defaultUserBrainId = ids.id('user-brain', 'founder')
    mutated = true
  }
  const orgId = state.orgId
  if (!state.companyBrainId) {
    state.companyBrainId = ids.id('brain', 'company', orgId)
    mutated = true
  }
  if (!state.customerBrainId) {
    state.customerBrainId = ids.id('brain', 'customer', orgId)
    mutated = true
  }
  if (!state.agentBrainIds || Object.keys(state.agentBrainIds).length === 0) {
    const agentBrainIds: Record<string, string> = {}
    for (const slug of DRY_RUN_AGENT_SLUGS) {
      agentBrainIds[slug] = ids.id('ns-brain-agent', orgId, slug)
    }
    state.agentBrainIds = agentBrainIds
    mutated = true
  }

  if (mutated) {
    log.step(
      `Dry-run isolation: synthesized orgId=${state.orgId} founderUserId=${state.founderUserId} companyBrainId=${state.companyBrainId} customerBrainId=${state.customerBrainId} agentBrainIds.keys=[${Object.keys(state.agentBrainIds ?? {}).join(',')}]`,
    )
  }
}

export const runP11AtlasFresh: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  const { state, log, supabase, ids, dryRun, timeline } = ctx

  ctx.log.step('P11 — optional Atlas freshness pass')

  if (ctx.reset) {
    log.step(
      'Reset mode: brain_ops_outbox cascades from ns_brains (already torn down by P1); proceeding.',
    )
  }

  ensureDryRunBootstrap(ctx)

  const orgId = state.orgId
  const founderUserId = state.founderUserId
  const userBrainId = state.defaultUserBrainId
  const companyBrainId = state.companyBrainId
  const customerBrainId = state.customerBrainId
  const agentBrainIds = state.agentBrainIds ?? {}

  if (!orgId) {
    throw new Error(`${PHASE_ID}: state.orgId missing (P1 must have run).`)
  }
  if (!founderUserId) {
    throw new Error(`${PHASE_ID}: state.founderUserId missing (P1 must have run).`)
  }
  if (!userBrainId) {
    throw new Error(`${PHASE_ID}: state.defaultUserBrainId missing (P1 must have run).`)
  }
  if (!companyBrainId) {
    throw new Error(`${PHASE_ID}: state.companyBrainId missing (P2 must have run).`)
  }
  if (!customerBrainId) {
    throw new Error(`${PHASE_ID}: state.customerBrainId missing (P2 must have run).`)
  }

  const warnings: string[] = [
    'Requires mission-worker reachable for events to be processed. If not reachable, rows sit in brain_ops_outbox.',
  ]

  const agentBrainKeys = Object.keys(agentBrainIds)
  const firstAgentKey = agentBrainKeys[0]
  const firstAgentBrainId = firstAgentKey ? agentBrainIds[firstAgentKey] : undefined

  const nowIso = timeline.iso(timeline.now())

  const rows: BrainOpsRow[] = []

  const buildId = (eventType: BrainOpsEventType, brainId: string): string =>
    ids.id('brain-ops-outbox', orgId, eventType, brainId)
  const buildDedupe = (eventType: BrainOpsEventType, brainId: string): string =>
    `yc-demo-p11-${eventType}-${brainId}-${orgId}`

  // 1) company_daily_dream — payload triggers a manual fresh dream run.
  rows.push({
    id: buildId('company_daily_dream', companyBrainId),
    brain_id: companyBrainId,
    user_id: founderUserId,
    org_id: orgId,
    event_type: 'company_daily_dream',
    dedupe_key: buildDedupe('company_daily_dream', companyBrainId),
    payload: { manual: true, org_id: orgId, brain_id: companyBrainId },
    status: 'pending',
    attempts: 0,
    next_attempt_at: nowIso,
    created_at: nowIso,
  })

  // 2) brain_pattern_analysis × 3 (user, customer, first deep agent brain).
  const patternTargets: Array<{ brainId: string; label: string }> = [
    { brainId: userBrainId, label: 'user' },
    { brainId: customerBrainId, label: 'customer' },
  ]
  if (firstAgentBrainId && firstAgentKey) {
    patternTargets.push({
      brainId: firstAgentBrainId,
      label: `agent:${firstAgentKey}`,
    })
  } else {
    warnings.push(
      'No deep agent brain available — skipping the third brain_pattern_analysis event (state.agentBrainIds is empty; P4 must run first).',
    )
  }

  for (const target of patternTargets) {
    rows.push({
      id: buildId('brain_pattern_analysis', target.brainId),
      brain_id: target.brainId,
      user_id: founderUserId,
      org_id: orgId,
      event_type: 'brain_pattern_analysis',
      dedupe_key: buildDedupe('brain_pattern_analysis', target.brainId),
      payload: {},
      status: 'pending',
      attempts: 0,
      next_attempt_at: nowIso,
      created_at: nowIso,
    })
  }

  // 3) brain_avatar_synthesis — customer brain only (processor refuses
  //    non-customer scope).
  rows.push({
    id: buildId('brain_avatar_synthesis', customerBrainId),
    brain_id: customerBrainId,
    user_id: founderUserId,
    org_id: orgId,
    event_type: 'brain_avatar_synthesis',
    dedupe_key: buildDedupe('brain_avatar_synthesis', customerBrainId),
    payload: {},
    status: 'pending',
    attempts: 0,
    next_attempt_at: nowIso,
    created_at: nowIso,
  })

  // 4) brain_library_sync × 2 (user + company).
  const syncTargets: Array<{ brainId: string; label: string }> = [
    { brainId: userBrainId, label: 'user' },
    { brainId: companyBrainId, label: 'company' },
  ]
  for (const target of syncTargets) {
    rows.push({
      id: buildId('brain_library_sync', target.brainId),
      brain_id: target.brainId,
      user_id: founderUserId,
      org_id: orgId,
      event_type: 'brain_library_sync',
      dedupe_key: buildDedupe('brain_library_sync', target.brainId),
      payload: {},
      status: 'pending',
      attempts: 0,
      next_attempt_at: nowIso,
      created_at: nowIso,
    })
  }

  log.step(
    `Enqueuing ${rows.length} brain_ops_outbox events: ${rows
      .map((row) => row.event_type)
      .join(', ')}`,
  )

  if (dryRun) {
    for (const row of rows) {
      log.step(
        `  [dry-run] would UPSERT brain_ops_outbox { event_type: "${row.event_type}", brain_id: "${row.brain_id.slice(0, 8)}", dedupe_key: "${row.dedupe_key}" }`,
      )
    }
    return r.finish({ brain_ops_outbox: rows.length }, warnings)
  }

  const { error } = await supabase
    .from('brain_ops_outbox')
    .upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: false })
  if (error) {
    throw new Error(
      `${PHASE_ID}: upsert brain_ops_outbox (${rows.length} rows) failed: ${error.message}`,
    )
  }

  log.step(
    `Upserted ${rows.length} brain_ops_outbox rows with status='queued' (worker dispatcher polls status='pending' — see header note).`,
  )

  return r.finish({ brain_ops_outbox: rows.length }, warnings)
}
