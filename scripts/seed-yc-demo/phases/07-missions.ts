/**
 * P7 — Missions + subtasks + deliverables.
 *
 * Inserts ~30 missions across the 9 campaigns with mixed statuses
 * (queued / in_progress / completed / cancelled) and timeline-anchored
 * timestamps. For each mission we also seed:
 *   - mission_subtasks (some checked) — sort_order matches array index
 *   - mission_deliverables for completed missions w/ deliverableKinds
 *     (metadata.artifact_table/artifact_id are NULL placeholders that P7.5c
 *     backfills with real artifact ids).
 *   - 1 space_items row per mission whose `spaceSlug` resolves, with
 *     `linked_mission_id` set so the space's "Missions" view is populated
 *     and the mission_status → space_item_status sync trigger fires.
 *
 * State populated for downstream phases:
 *   - state.missionIds[brief.slug] = missions.id
 *
 * Wave 4b-4 implementation.
 */
import type { MissionBrief } from '../content/_types'
import { MISSIONS } from '../content/missions'
import { mapMissionBriefStatus, remapToSpaceStatus } from '../lib/space-item-status'
import { after, iso, seededRandom } from '../lib/timeline'
import { startResult, type PhaseContext, type PhaseHandler, type PhaseState } from './_context'
import { statusOptionsForSpaceSlug } from './06-spaces'

const PHASE_ID = '07-missions'

const UPSERT_BATCH_SIZE = 200

// ─── Dry-run bootstrap ─────────────────────────────────────────────────────
//
// In a single-phase dry-run (`--dry-run --phase=07-missions`), state from
// P01..P06 is empty. Synthesize the deterministic IDs those phases would have
// produced so this phase can preview its inserts in isolation. Patterns must
// match phases/01-account.ts (orgId / founderUserId), phases/04-team.ts
// (hiredAgentKeys), phases/05-campaigns.ts (campaignIds), and
// phases/06-spaces.ts (spaceIds).

const KNOWN_HIRED_AGENT_KEYS: readonly string[] = [
  'maya',
  'leo',
  'sara',
  'devon',
  'casey',
  'riley',
  'owen',
]

const KNOWN_CAMPAIGN_SLUGS: readonly string[] = [
  'acme',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
  'internal-ops',
  'sales',
  'wiki',
]

const KNOWN_SPACE_SLUGS: readonly string[] = [
  'plinthworks-workspace',
  'plinthworks-launch',
  'saltline-workspace',
  'saltline-q4-launch',
  'helmsmark-workspace',
  'cloverkin-workspace',
  'throughput-workspace',
  'almanac-workspace',
  'operations',
  'pricing-and-margins',
  'pipeline',
  'company-wiki',
]

// ─── Status / type mappings ────────────────────────────────────────────────
//
// missions.status_check (latest, per 20260420110300_*) accepts:
//   inbox, backlog, planning, todo, in_progress, awaiting_human, review,
//   blocked, done, archived, error, failed, dead_letter, pending_approval
//
// MissionBrief.status uses the friendlier author-facing vocabulary
// (queued / in_progress / completed / cancelled). Map onto the canonical
// missions.status values.

function mapMissionStatus(brief: MissionBrief['status']): string {
  switch (brief) {
    case 'queued':
      return 'todo'
    case 'in_progress':
      return 'in_progress'
    case 'completed':
      return 'done'
    case 'cancelled':
      return 'archived'
    default: {
      const _exhaustive: never = brief
      throw new Error(`${PHASE_ID}: unhandled MissionBrief.status "${String(_exhaustive)}"`)
    }
  }
}

// mission_subtasks.status_check (per 20260420110300_*) accepts:
//   pending, in_progress, awaiting_human, done, revision, blocked, cancelled
function mapSubtaskStatus(done: boolean): string {
  return done ? 'done' : 'pending'
}

// space_items.status is now free-form (relaxed by 20260511135400_space_items_custom_statuses.sql).
// Map mission status onto a stable, human-readable string that matches the
// trigger expectations ("done" for closed, otherwise the mission status).

// mission_deliverables.type CHECK (per 20260331230000_mission_deliverables_entity_types.sql) accepts:
//   doc, text, image, video, pdf, file,
//   offer, funnel, presentation, sequence,
//   blog_post, social_post, ad, ad_campaign,
//   avatar, website
//
// MissionBrief.deliverableKinds uses richer authoring-time labels (e.g.
// "positioning", "audit_doc", "case_study"). We pick the closest enum value
// and preserve the original label in metadata.deliverable_kind so P7.5c (and
// downstream consumers) keep the authoring intent.
const DELIVERABLE_KIND_TO_TYPE: Record<string, string> = {
  positioning: 'doc',
  offer: 'offer',
  copy_doc: 'doc',
  audit_doc: 'doc',
  campaign_plan: 'doc',
  email: 'doc',
  sequence: 'sequence',
  design_system: 'doc',
  site: 'website',
  research_synthesis: 'doc',
  case_study: 'doc',
  media_asset: 'image',
  copy_system: 'doc',
  service_taxonomy: 'doc',
  proposal_kit: 'doc',
  playbook: 'doc',
  sop: 'doc',
  template: 'doc',
  principles_doc: 'doc',
  catalog: 'doc',
}

function mapDeliverableType(kind: string): string {
  const mapped = DELIVERABLE_KIND_TO_TYPE[kind]
  if (!mapped) {
    throw new Error(
      `${PHASE_ID}: unknown deliverableKind "${kind}" — add a mapping to DELIVERABLE_KIND_TO_TYPE.`,
    )
  }
  return mapped
}

// ─── State plumbing ────────────────────────────────────────────────────────

interface ResolvedState {
  orgId: string
  founderUserId: string
  campaignIds: Record<string, string>
  spaceIds: Record<string, string>
  hiredAgentKeys: string[]
}

function populateDryRunStateIfEmpty(ctx: PhaseContext): void {
  if (!ctx.dryRun) return

  const state: PhaseState = ctx.state
  const ids = ctx.ids

  if (!state.orgId) state.orgId = ids.id('org', 'foundry-creative')
  if (!state.founderUserId) state.founderUserId = ids.id('user', 'founder')
  if (!state.hiredAgentKeys) state.hiredAgentKeys = [...KNOWN_HIRED_AGENT_KEYS]

  const orgId = state.orgId
  if (!state.campaignIds) {
    state.campaignIds = Object.fromEntries(
      KNOWN_CAMPAIGN_SLUGS.map((slug) => [slug, ids.id('campaign', orgId, slug)]),
    )
  }
  if (!state.spaceIds) {
    state.spaceIds = Object.fromEntries(
      KNOWN_SPACE_SLUGS.map((slug) => [slug, ids.id('space', orgId, slug)]),
    )
  }
}

function resolveState(state: PhaseState): ResolvedState {
  const orgId = state.orgId
  const founderUserId = state.founderUserId
  const campaignIds = state.campaignIds
  const spaceIds = state.spaceIds ?? {}
  const hiredAgentKeys = state.hiredAgentKeys ?? []

  if (!orgId) {
    throw new Error(`${PHASE_ID}: missing state.orgId (set by P01).`)
  }
  if (!founderUserId) {
    throw new Error(`${PHASE_ID}: missing state.founderUserId (set by P01).`)
  }
  if (!campaignIds) {
    throw new Error(`${PHASE_ID}: missing state.campaignIds (set by P05).`)
  }

  return { orgId, founderUserId, campaignIds, spaceIds, hiredAgentKeys }
}

// ─── Row builders ──────────────────────────────────────────────────────────

interface MissionRow {
  id: string
  org_id: string
  user_id: string
  campaign_id: string
  title: string
  brief: string
  description: string
  status: string
  assigned_agent_key: string | null
  current_agent_key: string | null
  idempotency_key: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  input: Record<string, unknown>
  output: Record<string, unknown>
  retry_count: number
  sort_order: number
  queued_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

interface SubtaskRow {
  id: string
  mission_id: string
  user_id: string
  org_id: string
  title: string
  status: string
  assigned_agent_key: string | null
  assignee_type: 'agent'
  assigned_user_id: null
  sort_order: number
  output: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface DeliverableRow {
  id: string
  mission_id: string
  user_id: string
  org_id: string
  campaign_id: string
  agent_key: string
  type: string
  title: string
  file_url: null
  metadata: {
    deliverable_kind: string
    artifact_table: null
    artifact_id: null
    seeded_by: string
  }
  created_at: string
}

interface SpaceItemRow {
  id: string
  space_id: string
  org_id: string
  user_id: string
  title: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_type: 'agent' | 'human'
  assignee_id: string
  source: 'manual'
  linked_mission_id: string
  due_date: string | null
  custom_data: Record<string, unknown>
  sort_order: number
  created_at: string
  updated_at: string
}

function missionLinkDueDateIso(baseAt: Date, missionId: string): string {
  const daysAhead = Math.floor(seededRandom(`${missionId}:due`) * 35) - 3
  return iso(after(baseAt, daysAhead, 17, 0))
}

function priorityForBrief(brief: MissionBrief): 'low' | 'medium' | 'high' | 'urgent' {
  if (brief.status === 'cancelled') return 'low'
  if (brief.status === 'queued') return 'medium'
  if (brief.status === 'completed') return 'medium'
  return 'high'
}

function buildMissionRow(
  ctx: PhaseContext,
  brief: MissionBrief,
  resolved: ResolvedState,
): { row: MissionRow; missionId: string; agentKey: string } {
  const { ids, timeline } = ctx
  const orgId = resolved.orgId

  const campaignId = resolved.campaignIds[brief.campaignSlug]
  if (!campaignId) {
    throw new Error(
      `${PHASE_ID}: mission "${brief.slug}" → campaignSlug "${brief.campaignSlug}" did not resolve in state.campaignIds. Run --phase=05-campaigns first or fix the content reference.`,
    )
  }

  const missionId = ids.id('mission', orgId, brief.slug)
  const agentKey = brief.assignedAgentName.toLowerCase()
  const status = mapMissionStatus(brief.status)
  const queuedAtIso = timeline.iso(brief.queuedAt)
  const startedAtIso = brief.startedAt ? timeline.iso(brief.startedAt) : null
  const completedAtIso = brief.completedAt ? timeline.iso(brief.completedAt) : null

  // created_at/updated_at: anchor to queuedAt (mission's first appearance) and
  // to its latest known beat (completed > started > queued) so the row reads
  // as "lived in" along the 90-day arc.
  const createdAtIso = queuedAtIso
  const updatedAtIso = completedAtIso ?? startedAtIso ?? queuedAtIso

  const row: MissionRow = {
    id: missionId,
    org_id: orgId,
    user_id: resolved.founderUserId,
    campaign_id: campaignId,
    title: brief.title,
    brief: brief.briefText,
    description: brief.briefText,
    status,
    assigned_agent_key: agentKey,
    current_agent_key: brief.status === 'in_progress' ? agentKey : null,
    idempotency_key: `yc-demo:${brief.slug}`,
    priority: priorityForBrief(brief),
    input: {
      seeded_by: 'yc-demo-seeder',
      mission_slug: brief.slug,
    },
    output: {},
    retry_count: 0,
    sort_order: 0,
    started_at: startedAtIso,
    completed_at: completedAtIso,
    created_at: queuedAtIso,
    updated_at: updatedAtIso,
  }

  return { row, missionId, agentKey }
}

function buildSubtaskRows(
  ctx: PhaseContext,
  brief: MissionBrief,
  missionId: string,
  agentKey: string,
  resolved: ResolvedState,
): SubtaskRow[] {
  const { ids, timeline } = ctx
  const baseAt = brief.startedAt ?? brief.queuedAt
  const baseAtIso = timeline.iso(baseAt)

  return brief.subtasks.map((subtask, index) => {
    const subtaskId = ids.id('mission-subtask', missionId, String(index))
    return {
      id: subtaskId,
      mission_id: missionId,
      user_id: resolved.founderUserId,
      org_id: resolved.orgId,
      title: subtask.title,
      status: mapSubtaskStatus(subtask.done),
      assigned_agent_key: agentKey,
      assignee_type: 'agent',
      assigned_user_id: null,
      sort_order: index,
      output: {},
      created_at: baseAtIso,
      updated_at: baseAtIso,
    }
  })
}

function buildDeliverableRows(
  ctx: PhaseContext,
  brief: MissionBrief,
  missionId: string,
  agentKey: string,
  resolved: ResolvedState,
): DeliverableRow[] {
  if (brief.status !== 'completed') return []
  if (brief.deliverableKinds.length === 0) return []
  if (!brief.completedAt) {
    throw new Error(
      `${PHASE_ID}: mission "${brief.slug}" is completed but has no completedAt — fix the content anchor.`,
    )
  }
  const { ids, timeline } = ctx
  const completedAtIso = timeline.iso(brief.completedAt)
  const campaignId = resolved.campaignIds[brief.campaignSlug]
  if (!campaignId) {
    throw new Error(
      `${PHASE_ID}: mission "${brief.slug}" deliverable build → campaignSlug "${brief.campaignSlug}" missing in state.campaignIds.`,
    )
  }

  return brief.deliverableKinds.map((kind) => {
    const deliverableId = ids.id('mission-deliverable', missionId, kind)
    const type = mapDeliverableType(kind)
    return {
      id: deliverableId,
      mission_id: missionId,
      user_id: resolved.founderUserId,
      org_id: resolved.orgId,
      campaign_id: campaignId,
      agent_key: agentKey,
      type,
      title: `${brief.title} — ${kind}`,
      file_url: null,
      metadata: {
        deliverable_kind: kind,
        artifact_table: null,
        artifact_id: null,
        seeded_by: 'yc-demo-seeder',
      },
      created_at: completedAtIso,
    }
  })
}

function buildSpaceItemRow(
  ctx: PhaseContext,
  brief: MissionBrief,
  missionId: string,
  agentKey: string,
  resolved: ResolvedState,
): { row: SpaceItemRow; spaceSlug: string } | { skip: true; reason: string } {
  if (!brief.spaceSlug) {
    return { skip: true, reason: 'no spaceSlug on brief' }
  }
  const spaceId = resolved.spaceIds[brief.spaceSlug]
  if (!spaceId) {
    return {
      skip: true,
      reason: `state.spaceIds["${brief.spaceSlug}"] not found`,
    }
  }

  const { ids, timeline } = ctx
  const itemId = ids.id('space-item-mission-link', missionId)
  const baseAt = brief.startedAt ?? brief.queuedAt
  const baseAtIso = timeline.iso(baseAt)
  const updatedAt = brief.completedAt ?? brief.startedAt ?? brief.queuedAt

  const genericStatus = mapMissionBriefStatus(brief.status)
  const spaceStatus =
    remapToSpaceStatus(genericStatus, statusOptionsForSpaceSlug(brief.spaceSlug)) ?? genericStatus

  const row: SpaceItemRow = {
    id: itemId,
    space_id: spaceId,
    org_id: resolved.orgId,
    user_id: resolved.founderUserId,
    title: brief.title,
    status: spaceStatus,
    priority: priorityForBrief(brief),
    assignee_type: 'agent',
    assignee_id: agentKey,
    source: 'manual',
    linked_mission_id: missionId,
    due_date: missionLinkDueDateIso(baseAt, missionId),
    custom_data: {
      mission_id: missionId,
      mission_slug: brief.slug,
      assignee_agent_key: agentKey,
      tags: [brief.campaignSlug, 'mission'],
    },
    sort_order: 1_000,
    created_at: baseAtIso,
    updated_at: timeline.iso(updatedAt),
  }
  return { row, spaceSlug: brief.spaceSlug }
}

// ─── Batched upsert helper (mirrors phases/03a-anchors.ts pattern) ────────

async function batchUpsert(
  ctx: PhaseContext,
  table: string,
  rows: ReadonlyArray<Record<string, unknown>>,
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

// ─── Phase handler ─────────────────────────────────────────────────────────

export const runP07Missions: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  const { log, dryRun, reset, state } = ctx

  log.step('P7 — missions + subtasks + deliverables + space-item links')

  if (reset) {
    log.step('Reset mode: P01 cascaded teardown of org → all P7 rows are gone with it; proceeding.')
  }

  populateDryRunStateIfEmpty(ctx)
  const resolved = resolveState(state)

  state.missionIds = state.missionIds ?? {}
  const missionIds = state.missionIds

  const warnings: string[] = []
  const missionRows: MissionRow[] = []
  const subtaskRows: SubtaskRow[] = []
  const deliverableRows: DeliverableRow[] = []
  const spaceItemRows: SpaceItemRow[] = []

  for (const brief of MISSIONS) {
    const { row: missionRow, missionId, agentKey } = buildMissionRow(ctx, brief, resolved)
    missionIds[brief.slug] = missionId
    missionRows.push(missionRow)

    const subtasks = buildSubtaskRows(ctx, brief, missionId, agentKey, resolved)
    subtaskRows.push(...subtasks)

    const deliverables = buildDeliverableRows(ctx, brief, missionId, agentKey, resolved)
    deliverableRows.push(...deliverables)

    const spaceItem = buildSpaceItemRow(ctx, brief, missionId, agentKey, resolved)
    if ('skip' in spaceItem) {
      if (brief.spaceSlug) {
        const warning = `Mission "${brief.slug}" → spaceSlug "${brief.spaceSlug}" skipped: ${spaceItem.reason}.`
        log.warn(warning)
        warnings.push(warning)
      }
    } else {
      spaceItemRows.push(spaceItem.row)
    }
  }

  const rowCounts: Record<string, number> = {
    missions: missionRows.length,
    mission_subtasks: subtaskRows.length,
    mission_deliverables: deliverableRows.length,
    'space_items (mission-linked)': spaceItemRows.length,
  }

  if (dryRun) {
    log.step(
      `[dry-run] would insert ${missionRows.length} missions, ${subtaskRows.length} subtasks, ${deliverableRows.length} deliverables, ${spaceItemRows.length} mission-linked space_items.`,
    )
    log.step(
      `[dry-run] state.missionIds populated with ${Object.keys(missionIds).length} slugs for downstream phases (P7.5c, P8, P12).`,
    )
    for (const [table, count] of Object.entries(rowCounts)) {
      log.rowCount(table, count)
    }
    return r.finish(rowCounts, warnings)
  }

  log.step(`Upserting missions (${missionRows.length})`)
  await batchUpsert(
    ctx,
    'missions',
    missionRows as unknown as ReadonlyArray<Record<string, unknown>>,
    'id',
  )

  log.step(`Upserting mission_subtasks (${subtaskRows.length})`)
  await batchUpsert(
    ctx,
    'mission_subtasks',
    subtaskRows as unknown as ReadonlyArray<Record<string, unknown>>,
    'id',
  )

  log.step(`Upserting mission_deliverables (${deliverableRows.length})`)
  await batchUpsert(
    ctx,
    'mission_deliverables',
    deliverableRows as unknown as ReadonlyArray<Record<string, unknown>>,
    'id',
  )

  log.step(`Upserting space_items (mission-linked) (${spaceItemRows.length})`)
  await batchUpsert(
    ctx,
    'space_items',
    spaceItemRows as unknown as ReadonlyArray<Record<string, unknown>>,
    'id',
  )

  return r.finish(rowCounts, warnings)
}
