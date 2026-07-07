/**
 * P3b2 — Post-channel cortex derivation.
 *
 * Runs after P8 channels so signals can cite real channel_messages.id in
 * evidence_refs.
 *
 *   - ~90 company_cortex_dream_runs (weekdays since Week 8 cortex enable,
 *     dedupe_key = `${orgId}-${YYYY-MM-DD}`)
 *   - ~280 company_cortex_signals (multiple per object, attributed to a
 *     dream run on or after the object's formedAt; evidence_refs cite P8
 *     channel_messages by id)
 *   - Backfill company_cortex_objects.source_signal_ids + evidence_refs
 *   - Cortex-related ns_brain_log events (company brain)
 *   - 1 ns_pending_captures (status='pending', looks like Atlas captured
 *     something yesterday)
 *   - Final UPDATE pass on ns_brains lived-in counters:
 *     memories_since_last_sync, last_library_sync_at, last_lint_at,
 *     last_avatar_synthesis_at, customer_memories_since_last_avatar_pass
 *   - Final UPDATE on company_cortex_settings.last_successful_dream_at
 */
import type { CortexObjectAnchor, CortexObjectType } from '../content/_types'
import { COMPANY_CORTEX_OBJECTS } from '../content/company-brain'
import { COMPANY_CORTEX_ENABLED_AT } from '../content/timeline'
import { startResult, type PhaseContext, type PhaseHandler, type PhaseState } from './_context'

const PHASE_ID = '03b2-cortex'

const UPSERT_BATCH_SIZE = 200

const DRY_RUN_AGENT_SLUGS = ['maya', 'leo', 'sara', 'devon', 'casey'] as const

const SIGNALS_PER_OBJECT_MIN = 13
const SIGNALS_PER_OBJECT_MAX = 15

type CortexSignalType =
  | 'belief'
  | 'standard'
  | 'move'
  | 'anti_pattern'
  | 'protocol'
  | 'decision'
  | 'tension_candidate'
  | 'retrieval_rule'

type DreamRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped'

type SignalStatus = 'proposed' | 'active' | 'rejected' | 'expired' | 'merged'

interface ResolvedState {
  orgId: string
  founderUserId: string
  defaultUserBrainId: string
  companyBrainId: string
  customerBrainId: string
  agentBrainIds: Record<string, string>
}

interface DreamRunRow {
  id: string
  org_id: string
  brain_id: string
  dedupe_key: string
  window_start: string
  window_end: string
  status: DreamRunStatus
  source_counts: Record<string, number>
  tokens_estimated: number
  signals_created: number
  objects_updated: number
  error: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

interface SignalRow {
  id: string
  org_id: string
  brain_id: string
  dream_run_id: string
  signal_type: CortexSignalType
  truth: string
  scope: Record<string, unknown>
  evidence_refs: Array<{ kind: string; id: string }>
  confidence: number
  reason: string
  context_form: string
  status: SignalStatus
  source: string
  created_at: string
  updated_at: string
  /** Internal — used to associate signals back to their object for backfill. */
  __objectSlug: string
}

interface CortexObjectUpdate {
  id: string
  source_signal_ids: string[]
  evidence_refs: Array<{ kind: string; id: string }>
  updated_at: string
}

interface BrainLogRow {
  id: string
  brain_id: string
  event_type: string
  summary: string
  affected_pages: string[]
  source_ref: Record<string, unknown> | null
  metadata: Record<string, unknown>
  created_at: string
}

/**
 * In single-phase dry-run (`--dry-run --phase=03b2-cortex`), state from
 * P01/P02/P04 will be empty. Synthesize the deterministic IDs they would
 * have produced so this phase can preview its inserts in isolation.
 */
function ensureDryRunBootstrap(ctx: PhaseContext): void {
  if (!ctx.dryRun) return
  const { state, ids, log } = ctx
  if (state.orgId) return

  const founderUserId = ids.id('user', 'founder')
  const orgId = ids.id('org', 'foundry-creative')
  const defaultUserBrainId = ids.id('user-brain', 'founder')
  const companyBrainId = ids.id('brain', 'company', orgId)
  const customerBrainId = ids.id('brain', 'customer', orgId)
  const agentBrainIds: Record<string, string> = {}
  for (const agentSlug of DRY_RUN_AGENT_SLUGS) {
    agentBrainIds[agentSlug] = ids.id('ns-brain-agent', orgId, agentSlug)
  }

  state.founderUserId = founderUserId
  state.orgId = orgId
  state.defaultUserBrainId = defaultUserBrainId
  state.companyBrainId = companyBrainId
  state.customerBrainId = customerBrainId
  state.agentBrainIds = agentBrainIds

  log.step(
    `Dry-run isolation: synthesized state.orgId=${orgId} founderUserId=${founderUserId} defaultUserBrainId=${defaultUserBrainId} companyBrainId=${companyBrainId} customerBrainId=${customerBrainId} agentBrainIds.keys=[${Object.keys(
      agentBrainIds,
    ).join(',')}]`,
  )
}

function resolveState(state: PhaseState): ResolvedState {
  const orgId = state.orgId
  const founderUserId = state.founderUserId
  const defaultUserBrainId = state.defaultUserBrainId
  const companyBrainId = state.companyBrainId
  const customerBrainId = state.customerBrainId
  const agentBrainIds = state.agentBrainIds

  if (!orgId) {
    throw new Error(`${PHASE_ID}: state.orgId missing — run --phase=01-account first.`)
  }
  if (!founderUserId) {
    throw new Error(`${PHASE_ID}: state.founderUserId missing — run --phase=01-account first.`)
  }
  if (!defaultUserBrainId) {
    throw new Error(`${PHASE_ID}: state.defaultUserBrainId missing — run --phase=01-account first.`)
  }
  if (!companyBrainId) {
    throw new Error(
      `${PHASE_ID}: state.companyBrainId missing — run --phase=02-brains-skeleton first.`,
    )
  }
  if (!customerBrainId) {
    throw new Error(
      `${PHASE_ID}: state.customerBrainId missing — run --phase=02-brains-skeleton first.`,
    )
  }
  if (!agentBrainIds || Object.keys(agentBrainIds).length === 0) {
    throw new Error(
      `${PHASE_ID}: state.agentBrainIds missing or empty — run --phase=04-team first.`,
    )
  }

  return {
    orgId,
    founderUserId,
    defaultUserBrainId,
    companyBrainId,
    customerBrainId,
    agentBrainIds,
  }
}

/**
 * company_cortex_objects.object_type → company_cortex_signals.signal_type.
 *
 * The signals enum drops `perspective` and renames `tension` → `tension_candidate`.
 * `perspective` objects don't have a direct signal type, so we use `belief`
 * as the closest semantic proxy (a perspective is a stable belief about the
 * world that has been pressure-tested).
 */
function objectTypeToSignalType(objectType: CortexObjectType): CortexSignalType {
  switch (objectType) {
    case 'tension':
      return 'tension_candidate'
    case 'perspective':
      return 'belief'
    case 'belief':
    case 'standard':
    case 'move':
    case 'anti_pattern':
    case 'protocol':
    case 'decision':
    case 'retrieval_rule':
      return objectType
    default: {
      const _exhaustive: never = objectType
      throw new Error(`${PHASE_ID}: unknown CortexObjectType "${_exhaustive as string}".`)
    }
  }
}

function dateStrUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function truncateForSignal(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1).trimEnd() + '…'
}

function buildSignalTruth(object: CortexObjectAnchor, variant: number): string {
  const base = object.truth
  const sentenceMatch = base.match(/^[^.!?]+[.!?]/)
  const headline =
    sentenceMatch && sentenceMatch[0].length <= 240
      ? sentenceMatch[0].trim()
      : truncateForSignal(base, 200)
  const prefixes = [
    'Recurring signal',
    'Confirmed pattern',
    'Repeat observation',
    'Cross-client signal',
    'Operating thread',
  ] as const
  const prefix = prefixes[variant % prefixes.length] ?? prefixes[0]
  return `${prefix}: ${headline}`
}

function buildSignalReason(object: CortexObjectAnchor): string {
  return truncateForSignal(object.evidenceNarrative, 320)
}

function buildSignalContextForm(object: CortexObjectAnchor, variant: number): string {
  const lensVariants = ['retainer-level', 'cross-client', 'studio-wide', 'partner-sync'] as const
  const lens = lensVariants[variant % lensVariants.length] ?? lensVariants[0]
  return `${lens} • ${object.objectType}`
}

function pickSignalStatus(seed: number): SignalStatus {
  // 60% active, 25% proposed, 10% rejected, 5% merged
  const r = seed
  if (r < 0.6) return 'active'
  if (r < 0.85) return 'proposed'
  if (r < 0.95) return 'rejected'
  return 'merged'
}

function pickConfidence(baseConfidence: number, seed: number): number {
  // Cluster around the object's confidence in [0.5, 0.9].
  const min = 0.5
  const max = 0.9
  const target = Math.max(min, Math.min(max, baseConfidence))
  const jitter = (seed - 0.5) * 0.2
  const value = Math.max(min, Math.min(max, target + jitter))
  return Math.round(value * 100) / 100
}

function sourceCountsFor(seed: number): Record<string, number> {
  // deterministic ranges per phase contract
  const messages = 10 + Math.floor(seed * 41) // 10..50
  const channel_messages = 30 + Math.floor((seed * 7919) % 171) // 30..200
  const space_item_activity = 5 + Math.floor((seed * 104729) % 26) // 5..30
  return { messages, channel_messages, space_item_activity }
}

function tokensEstimatedFor(seed: number): number {
  // 2_000..14_000 — looks like a real daily-dream prompt budget
  return 2000 + Math.floor(seed * 12001)
}

/**
 * Generates a deterministic shuffle by sorting indices using a seeded
 * comparator. Used to pick evidence_refs from a real channel_messages.id
 * pool without committing to a single order.
 */
function pickIndicesDeterministic(
  pool: number,
  count: number,
  seedKey: string,
  seededRandom: (s: string) => number,
): number[] {
  const indices = Array.from({ length: pool }, (_, i) => i)
  const weighted = indices.map((i) => ({ i, w: seededRandom(`${seedKey}:${i}`) }))
  weighted.sort((a, b) => a.w - b.w)
  return weighted.slice(0, Math.min(count, pool)).map((x) => x.i)
}

async function batchUpsert<T extends object>(
  ctx: PhaseContext,
  table: string,
  rows: ReadonlyArray<T>,
  onConflict: string,
): Promise<void> {
  if (rows.length === 0) return
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_BATCH_SIZE)
    const { error } = await ctx.supabase
      .from(table)
      .upsert(chunk, { onConflict, ignoreDuplicates: false })
    if (error) {
      throw new Error(
        `${PHASE_ID}: upsert ${table} (batch ${i}..${i + chunk.length}) failed: ${error.message}`,
      )
    }
  }
}

export const runP03b2Cortex: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  const { log, state, ids, timeline, dryRun, supabase } = ctx
  const warnings: string[] = []

  log.step('P3b2 — post-channel cortex derivation')

  if (ctx.reset) {
    log.step(
      'Reset mode: P01 cascaded teardown of org → all cortex rows are gone with it; proceeding.',
    )
  }

  ensureDryRunBootstrap(ctx)
  const resolved = resolveState(state)

  // ─── 1. Pull channel_messages pool for evidence_refs ────────────────────
  // P8 seeds these. In dry-run (or if P8 hasn't run yet), synthesize a
  // stable pool of deterministic placeholder ids so evidence_refs still
  // has something to cite without crashing the phase.
  const channelMessagePool: string[] = []
  if (!dryRun) {
    // channel_messages has no org_id column — join via channels.org_id
    const { data: chans, error: chanErr } = await supabase
      .from('channels')
      .select('id')
      .eq('org_id', resolved.orgId)
    if (chanErr) {
      throw new Error(`${PHASE_ID}: failed to fetch channels for org: ${chanErr.message}`)
    }
    const channelIds = (chans ?? []).map((c) => (c as { id: string }).id)
    if (channelIds.length > 0) {
      const { data, error } = await supabase
        .from('channel_messages')
        .select('id')
        .in('channel_id', channelIds)
        .limit(500)
      if (error) {
        throw new Error(`${PHASE_ID}: failed to fetch channel_messages pool: ${error.message}`)
      }
      for (const row of data ?? []) {
        const id = (row as { id?: string }).id
        if (typeof id === 'string') channelMessagePool.push(id)
      }
    }
    if (channelMessagePool.length === 0) {
      warnings.push(
        'channel_messages pool empty for org — P8 has not produced any messages yet. Falling back to deterministic placeholder ids for cortex evidence_refs.',
      )
      for (let i = 0; i < 200; i += 1) {
        channelMessagePool.push(ids.id('channel-message', resolved.orgId, `placeholder-${i}`))
      }
    }
  } else {
    for (let i = 0; i < 200; i += 1) {
      channelMessagePool.push(ids.id('channel-message', resolved.orgId, `placeholder-${i}`))
    }
  }

  // ─── 2. Generate dream runs ────────────────────────────────────────────
  const today = timeline.now()
  const weekdays = timeline.weekdaysBetween(COMPANY_CORTEX_ENABLED_AT, today)
  if (weekdays.length === 0) {
    throw new Error(
      `${PHASE_ID}: weekdaysBetween(COMPANY_CORTEX_ENABLED_AT, today) produced no dates — timeline anchors are broken.`,
    )
  }

  // Status distribution scaled to the actual weekday count. Plan target is
  // 80 completed / 6 skipped / 3 failed / 1 running out of ~90 weekdays.
  const totalDays = weekdays.length
  const runningCount = 1
  const failedCount = Math.max(1, Math.round((totalDays * 3) / 90))
  const skippedCount = Math.max(1, Math.round((totalDays * 6) / 90))
  const completedCount = Math.max(0, totalDays - runningCount - failedCount - skippedCount)

  // Pick which day indices get non-completed statuses, deterministically.
  // Most recent weekday → running. Failed/skipped scattered across the
  // earlier days using the seeded shuffle.
  const lastIdx = weekdays.length - 1
  const earlierIndices = Array.from({ length: lastIdx }, (_, i) => i)
  const earlierWeighted = earlierIndices.map((i) => ({
    i,
    w: timeline.seededRandom(`dream-status:${resolved.orgId}:${dateStrUtc(weekdays[i]!)}`),
  }))
  earlierWeighted.sort((a, b) => a.w - b.w)
  const failedIndices = new Set<number>(earlierWeighted.slice(0, failedCount).map((x) => x.i))
  const skippedIndices = new Set<number>(
    earlierWeighted.slice(failedCount, failedCount + skippedCount).map((x) => x.i),
  )

  const dreamRunRows: DreamRunRow[] = []
  const dreamRunStartDate = weekdays[0]!

  for (let i = 0; i < weekdays.length; i += 1) {
    const windowEnd = weekdays[i]!
    const windowStart = timeline.before(windowEnd, 1, 0, 0)
    const dateStr = dateStrUtc(windowEnd)
    const dreamRunId = ids.id('cortex-dream-run', resolved.orgId, dateStr)
    const seed = timeline.seededRandom(`dream-run:${resolved.orgId}:${dateStr}`)

    let status: DreamRunStatus
    if (i === lastIdx) status = 'running'
    else if (failedIndices.has(i)) status = 'failed'
    else if (skippedIndices.has(i)) status = 'skipped'
    else status = 'completed'

    // Completed runs finish ~30-90 minutes after windowEnd.
    const startedAt: Date = windowEnd
    let completedAt: Date | null = null
    if (status === 'completed' || status === 'failed' || status === 'skipped') {
      const minutes = 30 + Math.floor(seed * 61)
      completedAt = new Date(windowEnd.getTime() + minutes * 60 * 1000)
    }

    const row: DreamRunRow = {
      id: dreamRunId,
      org_id: resolved.orgId,
      brain_id: resolved.companyBrainId,
      dedupe_key: `${resolved.orgId}-${dateStr}`,
      window_start: timeline.iso(windowStart),
      window_end: timeline.iso(windowEnd),
      status,
      source_counts: sourceCountsFor(seed),
      tokens_estimated: status === 'skipped' ? 0 : tokensEstimatedFor(seed),
      signals_created: 0,
      objects_updated: 0,
      error: status === 'failed' ? 'Upstream OpenClaw 504 — retried tomorrow.' : null,
      created_at: timeline.iso(windowEnd),
      started_at: timeline.iso(startedAt),
      completed_at: completedAt ? timeline.iso(completedAt) : null,
    }
    dreamRunRows.push(row)
  }

  // ─── 3. Generate signals ───────────────────────────────────────────────
  // Map each object to a "first eligible" dream run on or after formedAt
  // (or the earliest dream run if formedAt < cortex enable). Spread the
  // object's N signals across consecutive completed dream runs starting
  // there so each signal cites a different evidence batch.
  function findFirstDreamRunOnOrAfter(date: Date): DreamRunRow {
    const target = date.getTime()
    // dreamRunRows is in chronological order (oldest first).
    for (const row of dreamRunRows) {
      if (new Date(row.window_end).getTime() >= target) return row
    }
    return dreamRunRows[dreamRunRows.length - 1]!
  }

  // Completed runs only — we won't attribute signals to running/failed/skipped.
  const completedRuns = dreamRunRows.filter((r) => r.status === 'completed')
  if (completedRuns.length === 0) {
    throw new Error(
      `${PHASE_ID}: no completed dream runs were generated — cannot attribute signals. Check status distribution math (totalDays=${totalDays}).`,
    )
  }

  function completedRunFromBaseline(baseline: DreamRunRow, step: number): DreamRunRow {
    // If baseline is itself completed, walk forward from there. If not,
    // find the first completed run after baseline's window_end and step.
    const baselineEnd = new Date(baseline.window_end).getTime()
    let baseIdx = -1
    for (let i = 0; i < completedRuns.length; i += 1) {
      if (new Date(completedRuns[i]!.window_end).getTime() >= baselineEnd) {
        baseIdx = i
        break
      }
    }
    if (baseIdx === -1) baseIdx = completedRuns.length - 1
    const idx = Math.min(completedRuns.length - 1, baseIdx + step)
    return completedRuns[idx]!
  }

  const signalRows: SignalRow[] = []
  const signalsByObjectSlug = new Map<string, SignalRow[]>()
  for (const obj of COMPANY_CORTEX_OBJECTS) {
    const baselineRun = findFirstDreamRunOnOrAfter(obj.formedAt)
    const countSeed = timeline.seededRandom(`signal-count:${obj.slug}`)
    const span = SIGNALS_PER_OBJECT_MAX - SIGNALS_PER_OBJECT_MIN + 1
    const signalCount = SIGNALS_PER_OBJECT_MIN + Math.floor(countSeed * span)
    const signalType = objectTypeToSignalType(obj.objectType)
    const objectSignals: SignalRow[] = []

    for (let s = 0; s < signalCount; s += 1) {
      const signalId = ids.id('cortex-signal', resolved.orgId, obj.slug, String(s))
      const run = completedRunFromBaseline(baselineRun, s)
      const seedKey = `signal:${obj.slug}:${s}`
      const statusSeed = timeline.seededRandom(`${seedKey}:status`)
      const confSeed = timeline.seededRandom(`${seedKey}:conf`)
      const refCount = 1 + Math.floor(timeline.seededRandom(`${seedKey}:refcount`) * 3) // 1..3
      const pickedIdx = pickIndicesDeterministic(
        channelMessagePool.length,
        refCount,
        seedKey,
        timeline.seededRandom,
      )
      const evidence_refs = pickedIdx.map((i) => ({
        kind: 'channel_message',
        id: channelMessagePool[i]!,
      }))

      const createdAtIso = run.completed_at ?? run.window_end

      const row: SignalRow = {
        id: signalId,
        org_id: resolved.orgId,
        brain_id: resolved.companyBrainId,
        dream_run_id: run.id,
        signal_type: signalType,
        truth: buildSignalTruth(obj, s),
        scope: {},
        evidence_refs,
        confidence: pickConfidence(obj.confidence, confSeed),
        reason: buildSignalReason(obj),
        context_form: buildSignalContextForm(obj, s),
        status: pickSignalStatus(statusSeed),
        source: 'daily_dream',
        created_at: createdAtIso,
        updated_at: createdAtIso,
        __objectSlug: obj.slug,
      }

      signalRows.push(row)
      objectSignals.push(row)
    }
    signalsByObjectSlug.set(obj.slug, objectSignals)
  }

  // Update dream_runs.signals_created counters now that we know how many
  // signals landed on each run.
  const signalsCountByRunId = new Map<string, number>()
  for (const sig of signalRows) {
    signalsCountByRunId.set(sig.dream_run_id, (signalsCountByRunId.get(sig.dream_run_id) ?? 0) + 1)
  }
  const objectsByRunId = new Map<string, Set<string>>()
  for (const sig of signalRows) {
    let set = objectsByRunId.get(sig.dream_run_id)
    if (!set) {
      set = new Set()
      objectsByRunId.set(sig.dream_run_id, set)
    }
    set.add(sig.__objectSlug)
  }
  for (const row of dreamRunRows) {
    row.signals_created = signalsCountByRunId.get(row.id) ?? 0
    row.objects_updated = objectsByRunId.get(row.id)?.size ?? 0
  }

  // ─── 4. Backfill cortex_objects.source_signal_ids + evidence_refs ──────
  const cortexObjectUpdates: CortexObjectUpdate[] = []
  for (const obj of COMPANY_CORTEX_OBJECTS) {
    const objectId = ids.id('cortex-object', resolved.orgId, obj.slug)
    const objSignals = signalsByObjectSlug.get(obj.slug) ?? []
    // Pick 2-5 signal ids deterministically (highest-confidence first).
    const sortedByConfidence = [...objSignals].sort((a, b) => b.confidence - a.confidence)
    const countSeed = timeline.seededRandom(`object-ssid:${obj.slug}`)
    const ssidCount = 2 + Math.floor(countSeed * 4) // 2..5
    const chosenSignals = sortedByConfidence.slice(0, ssidCount)
    const ssids = chosenSignals.map((s) => s.id)
    // Denormalize evidence_refs from 1-2 of the chosen signals.
    const denormCount = Math.min(2, chosenSignals.length)
    const evidence_refs: Array<{ kind: string; id: string }> = []
    for (let i = 0; i < denormCount; i += 1) {
      const sig = chosenSignals[i]!
      for (const ref of sig.evidence_refs) {
        evidence_refs.push(ref)
        if (evidence_refs.length >= 4) break
      }
      if (evidence_refs.length >= 4) break
    }

    // updated_at: bump to the latest signal's created_at so the object
    // looks "alive" in the UI.
    const latestSignalAt = chosenSignals.reduce<string>((acc, s) => {
      return s.created_at > acc ? s.created_at : acc
    }, timeline.iso(obj.formedAt))

    cortexObjectUpdates.push({
      id: objectId,
      source_signal_ids: ssids,
      evidence_refs,
      updated_at: latestSignalAt,
    })
  }

  // ─── 5. ns_brain_log events (company brain) ────────────────────────────
  // For each completed dream run, 1-2 events: always a dream_run event,
  // sometimes a signal_proposed or object_formed event.
  const brainLogRows: BrainLogRow[] = []
  for (const run of dreamRunRows) {
    if (run.status !== 'completed') continue
    const dateStr = dateStrUtc(new Date(run.window_end))
    const seed = timeline.seededRandom(`brain-log:${run.id}`)
    const createdAtIso = run.completed_at ?? run.window_end

    brainLogRows.push({
      id: ids.id('cortex-brain-log', run.id, 'dream'),
      brain_id: resolved.companyBrainId,
      event_type: 'dream_run',
      summary: `Daily dream completed for ${dateStr}: ${run.signals_created} signals proposed, ${run.objects_updated} objects touched.`,
      affected_pages: [],
      source_ref: { dream_run_id: run.id },
      metadata: { date: dateStr, scope: 'company-cortex' },
      created_at: createdAtIso,
    })

    // ~40% of completed runs get a second event.
    if (seed < 0.4 && run.signals_created > 0) {
      const variantSeed = timeline.seededRandom(`brain-log:${run.id}:variant`)
      const isObjectEvent = variantSeed < 0.35
      const followAtMs = new Date(createdAtIso).getTime() + 5 * 60 * 1000
      const followAtIso = timeline.iso(new Date(followAtMs))
      brainLogRows.push({
        id: ids.id('cortex-brain-log', run.id, isObjectEvent ? 'object' : 'signal'),
        brain_id: resolved.companyBrainId,
        event_type: isObjectEvent ? 'object_formed' : 'signal_proposed',
        summary: isObjectEvent
          ? `Dream surfaced a new cortex object candidate from the ${dateStr} run.`
          : `${run.signals_created} new signals proposed against the company cortex from the ${dateStr} run.`,
        affected_pages: [],
        source_ref: { dream_run_id: run.id },
        metadata: { date: dateStr, scope: 'company-cortex' },
        created_at: followAtIso,
      })
    }
  }

  // ─── 6. ns_pending_captures (1) ────────────────────────────────────────
  const pendingCaptureCreatedAt = timeline.dayOffset(1, 14, 30)
  const autoAcceptAt = timeline.dayOffset(-1, 14, 30) // tomorrow afternoon
  const pendingCaptureRow = {
    id: ids.id('ns-pending-capture', resolved.orgId, 'meeting-yesterday'),
    profile_id: resolved.founderUserId,
    brain_id: resolved.defaultUserBrainId,
    snapshots: [
      {
        name: 'Pricing pushback: walk to Owen first',
        type: 'Move',
        core: 'Every client pricing pushback gets a P&L pass from Owen before any reply lands. The first reply anchors the negotiation; the anchor has to be defensible at the bottom of the sheet.',
        oneLiner: 'Pricing pushback walks to Owen before any reply.',
      },
    ],
    embeddings: null,
    agent_id: 'atlas',
    session_id: ids.id('atlas-session', resolved.orgId, 'capture-yesterday'),
    context:
      'Captured from yesterday partner sync — Owen raised the pricing-pushback pattern after Throughput change order.',
    source_type: 'meeting',
    status: 'pending',
    auto_accept_at: timeline.iso(autoAcceptAt),
    tokens_used: 1840,
    created_at: timeline.iso(pendingCaptureCreatedAt),
    reviewed_at: null,
  }

  // ─── 7. Lived-in counter UPDATEs on ns_brains ──────────────────────────
  const lastLibrarySyncIso = timeline.iso(timeline.dayOffset(3, 11, 0))
  const lastLintIso = timeline.iso(timeline.dayOffset(7, 9, 0))
  const lastAvatarSynthesisIso = timeline.iso(timeline.dayOffset(4, 14, 0))
  const userBrainCounterUpdate = {
    memories_since_last_sync: 12,
    last_library_sync_at: lastLibrarySyncIso,
    syncs_since_last_lint: 2,
    last_lint_at: lastLintIso,
  }
  const companyBrainCounterUpdate = {
    memories_since_last_sync: 4,
    last_library_sync_at: lastLibrarySyncIso,
    syncs_since_last_lint: 1,
    last_lint_at: lastLintIso,
  }
  const customerBrainCounterUpdate = {
    memories_since_last_sync: 9,
    last_library_sync_at: lastLibrarySyncIso,
    syncs_since_last_lint: 1,
    last_lint_at: lastLintIso,
    customer_memories_since_last_avatar_pass: 8,
    last_avatar_synthesis_at: lastAvatarSynthesisIso,
  }
  const agentBrainCounterUpdate = {
    memories_since_last_sync: 3,
    last_library_sync_at: lastLibrarySyncIso,
    syncs_since_last_lint: 1,
    last_lint_at: lastLintIso,
  }

  // ─── 8. company_cortex_settings UPDATE ─────────────────────────────────
  const lastSuccessfulDreamAtIso = timeline.iso(timeline.dayOffset(1, 2, 30))
  const settingsUpdate = {
    last_successful_dream_at: lastSuccessfulDreamAtIso,
  }

  // ─── Reporting / dispatch ──────────────────────────────────────────────
  const previewedRowCounts: Record<string, number> = {
    company_cortex_dream_runs: dreamRunRows.length,
    company_cortex_signals: signalRows.length,
    'company_cortex_objects (UPDATE source_signal_ids)': cortexObjectUpdates.length,
    'ns_brain_log (cortex)': brainLogRows.length,
    ns_pending_captures: 1,
    'ns_brains (UPDATE lived-in counters)':
      1 /* user */ +
      1 /* company */ +
      1 /* customer */ +
      Object.keys(resolved.agentBrainIds).length,
    'company_cortex_settings (UPDATE)': 1,
  }

  if (dryRun) {
    log.step(
      `[dry-run] cortex-enabled window: ${dateStrUtc(dreamRunStartDate)} → ${dateStrUtc(weekdays[lastIdx]!)} (${weekdays.length} weekdays; ${completedCount} completed / ${skippedCount} skipped / ${failedCount} failed / ${runningCount} running).`,
    )
    log.step(
      `[dry-run] channel_messages pool size for evidence_refs: ${channelMessagePool.length} (placeholder ids).`,
    )
    for (const [table, count] of Object.entries(previewedRowCounts)) {
      log.rowCount(table, count)
    }
    return r.finish({}, warnings)
  }

  // ─── Real-mode writes ──────────────────────────────────────────────────
  log.step(`Upserting company_cortex_dream_runs (${dreamRunRows.length})`)
  await batchUpsert(ctx, 'company_cortex_dream_runs', dreamRunRows, 'id')

  log.step(`Upserting company_cortex_signals (${signalRows.length})`)
  // Strip the internal __objectSlug field before sending.
  const signalRowsForInsert: Array<Record<string, unknown>> = signalRows.map((s) => {
    const { __objectSlug: _omit, ...rest } = s
    void _omit
    return rest
  })
  await batchUpsert(ctx, 'company_cortex_signals', signalRowsForInsert, 'id')

  log.step(`Updating company_cortex_objects.source_signal_ids (${cortexObjectUpdates.length})`)
  for (const upd of cortexObjectUpdates) {
    const { error } = await supabase
      .from('company_cortex_objects')
      .update({
        source_signal_ids: upd.source_signal_ids,
        evidence_refs: upd.evidence_refs,
        updated_at: upd.updated_at,
      })
      .eq('id', upd.id)
    if (error) {
      throw new Error(
        `${PHASE_ID}: failed to update company_cortex_objects.source_signal_ids (id=${upd.id}): ${error.message}`,
      )
    }
  }

  log.step(`Upserting ns_brain_log cortex events (${brainLogRows.length})`)
  await batchUpsert(ctx, 'ns_brain_log', brainLogRows, 'id')

  log.step('Upserting ns_pending_captures (1)')
  await batchUpsert(ctx, 'ns_pending_captures', [pendingCaptureRow], 'id')

  log.step('Updating ns_brains lived-in counters (user)')
  {
    const { error } = await supabase
      .from('ns_brains')
      .update(userBrainCounterUpdate)
      .eq('id', resolved.defaultUserBrainId)
    if (error) {
      throw new Error(`${PHASE_ID}: failed to update user brain counters: ${error.message}`)
    }
  }

  log.step('Updating ns_brains lived-in counters (company)')
  {
    const { error } = await supabase
      .from('ns_brains')
      .update(companyBrainCounterUpdate)
      .eq('id', resolved.companyBrainId)
    if (error) {
      throw new Error(`${PHASE_ID}: failed to update company brain counters: ${error.message}`)
    }
  }

  log.step('Updating ns_brains lived-in counters (customer)')
  {
    const { error } = await supabase
      .from('ns_brains')
      .update(customerBrainCounterUpdate)
      .eq('id', resolved.customerBrainId)
    if (error) {
      throw new Error(`${PHASE_ID}: failed to update customer brain counters: ${error.message}`)
    }
  }

  log.step(
    `Updating ns_brains lived-in counters (${Object.keys(resolved.agentBrainIds).length} deep agents)`,
  )
  for (const [agentSlug, agentBrainId] of Object.entries(resolved.agentBrainIds)) {
    const { error } = await supabase
      .from('ns_brains')
      .update(agentBrainCounterUpdate)
      .eq('id', agentBrainId)
    if (error) {
      throw new Error(
        `${PHASE_ID}: failed to update agent brain counters (slug=${agentSlug}, id=${agentBrainId}): ${error.message}`,
      )
    }
  }

  log.step('Updating company_cortex_settings.last_successful_dream_at')
  {
    const { error } = await supabase
      .from('company_cortex_settings')
      .update(settingsUpdate)
      .eq('org_id', resolved.orgId)
    if (error) {
      throw new Error(`${PHASE_ID}: failed to update company_cortex_settings: ${error.message}`)
    }
  }

  return r.finish(
    {
      company_cortex_dream_runs: dreamRunRows.length,
      company_cortex_signals: signalRows.length,
      'company_cortex_objects (UPDATE source_signal_ids)': cortexObjectUpdates.length,
      'ns_brain_log (cortex)': brainLogRows.length,
      ns_pending_captures: 1,
      'ns_brains (UPDATE lived-in counters)':
        1 + 1 + 1 + Object.keys(resolved.agentBrainIds).length,
      'company_cortex_settings (UPDATE)': 1,
    },
    warnings,
  )
}
