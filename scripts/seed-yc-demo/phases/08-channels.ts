/**
 * P8 — Channels + memberships + 90 days of channel_messages.
 *
 * Reconciles ChannelDefs from `content/channels.ts` against the channels
 * P6 already created (state.spaceChannelIds). Reuses those IDs when the
 * def's spaceSlug is already wired; mints new channels (deterministic IDs)
 * for the non-space-bound channels (foundry-general, foundry-leadership,
 * design-crit, wiki-discussion) and for the private pricing-and-margins
 * channel that P6 deliberately skipped.
 *
 * Then INSERTs:
 *   - channel_memberships per (channel × member) — humans resolved from
 *     state.{founder,nico,jules}UserId; agent members keyed by lowercase
 *     name (matches AgentHire.name → agent_key convention used everywhere).
 *   - channel_messages from CHANNEL_THREADS — thread.startedAt +
 *     message.minuteOffset for created_at, deterministic UUIDs by
 *     (channel, thread.slug, index). thread_id stored in metadata since
 *     channel_messages has no thread column in the current schema.
 *
 * Deterministic IDs are required: P3b2 cortex signals.evidence_refs cite
 * channel_messages.id by computing the same kind/parts tuple this phase
 * uses (`'channel-message', channel_id, thread.slug, index`).
 *
 * Wave 4c-3 implementation.
 */
import type { ChannelDef, ChannelThread } from '../content/_types'
import { CHANNEL_THREADS, CHANNELS } from '../content/channels'
import { startResult, type PhaseContext, type PhaseHandler, type PhaseState } from './_context'

const PHASE_ID = '08-channels'

const UPSERT_BATCH_SIZE = 200

// ─── Constants ─────────────────────────────────────────────────────────────

const HUMAN_SLUGS = new Set(['founder', 'nico', 'jules'])

/** Channels that should be marked is_private (founder/partner-only or sensitive ops). */
const PRIVATE_CHANNEL_SLUGS = new Set(['foundry-leadership', 'pricing-and-margins'])

/** When def.spaceSlug isn't set, special-case: link this channel to a P6 space. */
const NON_SPACE_CHANNEL_TO_SPACE: Record<string, string> = {
  'pricing-and-margins': 'pricing-and-margins',
}

// ─── Dry-run bootstrap ─────────────────────────────────────────────────────
//
// Mirrors the deterministic IDs P01..P06 would have minted so a single-phase
// dry-run can preview inserts in isolation. Patterns must match
// phases/01-account.ts (orgId / founderUserId / nicoUserId / julesUserId),
// phases/04-team.ts (hiredAgentKeys), phases/05-campaigns.ts (campaignIds),
// and phases/06-spaces.ts (spaceIds + spaceChannelIds for the 11 spaces with
// hasChannel=true).

const KNOWN_HIRED_AGENT_KEYS: readonly string[] = [
  'maya',
  'leo',
  'sara',
  'devon',
  'casey',
  'riley',
  'owen',
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

/** Spaces with hasChannel=true in P6 — channels created by P6, not us. */
const KNOWN_SPACE_CHANNEL_SLUGS: readonly string[] = [
  'plinthworks-workspace',
  'plinthworks-launch',
  'saltline-workspace',
  'saltline-q4-launch',
  'helmsmark-workspace',
  'cloverkin-workspace',
  'throughput-workspace',
  'almanac-workspace',
  'operations',
  'pipeline',
  'company-wiki',
]

function populateDryRunStateIfEmpty(ctx: PhaseContext): void {
  if (!ctx.dryRun) return

  const state: PhaseState = ctx.state
  const ids = ctx.ids

  if (!state.orgId) state.orgId = ids.id('org', 'foundry-creative')
  if (!state.founderUserId) state.founderUserId = ids.id('user', 'founder')
  if (!state.nicoUserId) state.nicoUserId = ids.id('user', 'nico')
  if (!state.julesUserId) state.julesUserId = ids.id('user', 'jules')
  if (!state.hiredAgentKeys) state.hiredAgentKeys = [...KNOWN_HIRED_AGENT_KEYS]

  const orgId = state.orgId
  if (!state.spaceIds) {
    state.spaceIds = Object.fromEntries(
      KNOWN_SPACE_SLUGS.map((slug) => [slug, ids.id('space', orgId, slug)]),
    )
  }
  if (!state.spaceChannelIds) {
    state.spaceChannelIds = Object.fromEntries(
      KNOWN_SPACE_CHANNEL_SLUGS.map((slug) => [slug, ids.id('channel', orgId, slug)]),
    )
  }
}

// ─── Resolved state ────────────────────────────────────────────────────────

interface ResolvedState {
  orgId: string
  founderUserId: string
  nicoUserId: string
  julesUserId: string
  spaceIds: Record<string, string>
  spaceChannelIds: Record<string, string>
}

function resolveState(state: PhaseState): ResolvedState {
  const orgId = state.orgId
  const founderUserId = state.founderUserId
  const nicoUserId = state.nicoUserId
  const julesUserId = state.julesUserId
  const spaceIds = state.spaceIds ?? {}
  const spaceChannelIds = state.spaceChannelIds ?? {}

  if (!orgId) throw new Error(`${PHASE_ID}: missing state.orgId (set by P01).`)
  if (!founderUserId) throw new Error(`${PHASE_ID}: missing state.founderUserId (set by P01).`)
  if (!nicoUserId) throw new Error(`${PHASE_ID}: missing state.nicoUserId (set by P01).`)
  if (!julesUserId) throw new Error(`${PHASE_ID}: missing state.julesUserId (set by P01).`)

  return { orgId, founderUserId, nicoUserId, julesUserId, spaceIds, spaceChannelIds }
}

// ─── Member resolution ─────────────────────────────────────────────────────

interface ResolvedMember {
  /** The original member token from the def (e.g. "Maya" or "founder"). */
  rawSlug: string
  /** Stable, lowercase identifier used for deterministic UUID derivation. */
  key: string
  type: 'user' | 'agent'
  /** When type='user', the auth UUID; when type='agent', the agent_key. */
  identity: string
  role: 'admin' | 'edit'
}

function resolveMember(rawSlug: string, resolved: ResolvedState): ResolvedMember {
  if (HUMAN_SLUGS.has(rawSlug)) {
    const userId =
      rawSlug === 'founder'
        ? resolved.founderUserId
        : rawSlug === 'nico'
          ? resolved.nicoUserId
          : resolved.julesUserId
    return {
      rawSlug,
      key: rawSlug,
      type: 'user',
      identity: userId,
      role: rawSlug === 'founder' ? 'admin' : 'edit',
    }
  }
  const agentKey = rawSlug.toLowerCase()
  return {
    rawSlug,
    key: agentKey,
    type: 'agent',
    identity: agentKey,
    role: 'edit',
  }
}

// ─── Row shapes ────────────────────────────────────────────────────────────

interface ChannelInsertRow {
  id: string
  org_id: string
  user_id: string
  name: string
  description: string
  is_private: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface ChannelPatchRow {
  id: string
  name: string
  description: string
  is_private: boolean
  metadata: Record<string, unknown>
  updated_at: string
}

interface MembershipRow {
  id: string
  channel_id: string
  member_type: 'user' | 'agent'
  user_id: string | null
  agent_key: string | null
  role: 'admin' | 'edit'
  added_by: string | null
  joined_at: string
  created_at: string
}

interface ChannelMessageRow {
  id: string
  channel_id: string
  sender_type: 'user' | 'agent'
  sender_id: string
  content: string
  content_blocks: null
  metadata: Record<string, unknown>
  reply_to_id: null
  pinned: boolean
  created_at: string
  updated_at: string
}

// ─── Builders ──────────────────────────────────────────────────────────────

function stripChannelHash(name: string): string {
  return name.replace(/^#/, '').trim() || name
}

function buildChannelMetadata(def: ChannelDef, spaceId: string | null): Record<string, unknown> {
  const meta: Record<string, unknown> = { source: 'yc-demo-seeder' }
  if (spaceId) meta.space_id = spaceId
  if (def.campaignSlug) meta.campaign_slug = def.campaignSlug
  return meta
}

function buildChannelDescription(def: ChannelDef): string {
  if (def.spaceSlug) return `In-space channel for ${stripChannelHash(def.name)}.`
  switch (def.slug) {
    case 'foundry-general':
      return 'Foundry-wide all-hands channel — agents + partners.'
    case 'foundry-leadership':
      return 'Founder + partner channel — leadership decisions only.'
    case 'design-crit':
      return 'Design + voice crit room — Wednesday cadence.'
    case 'pricing-and-margins':
      return 'Pricing + retainer margin review — sensitive ops.'
    case 'wiki-discussion':
      return 'Discussion thread for wiki / standards changes.'
    default:
      return `Foundry channel: ${stripChannelHash(def.name)}.`
  }
}

interface ResolvedChannel {
  id: string
  isReused: boolean
  insertRow: ChannelInsertRow | null
  patchRow: ChannelPatchRow | null
}

function resolveChannel(
  ctx: PhaseContext,
  def: ChannelDef,
  resolved: ResolvedState,
  foundedAtIso: string,
): ResolvedChannel {
  const reusedChannelId = def.spaceSlug ? resolved.spaceChannelIds[def.spaceSlug] : undefined

  const isReused = Boolean(reusedChannelId)
  const channelId = reusedChannelId ?? ctx.ids.id('channel', resolved.orgId, def.slug)

  // Determine the linked space_id (if any).
  let spaceId: string | null = null
  if (def.spaceSlug && resolved.spaceIds[def.spaceSlug]) {
    spaceId = resolved.spaceIds[def.spaceSlug]!
  } else if (NON_SPACE_CHANNEL_TO_SPACE[def.slug]) {
    const fallback = NON_SPACE_CHANNEL_TO_SPACE[def.slug]!
    if (resolved.spaceIds[fallback]) spaceId = resolved.spaceIds[fallback]!
  }

  const isPrivate = PRIVATE_CHANNEL_SLUGS.has(def.slug)
  const metadata = buildChannelMetadata(def, spaceId)
  const name = stripChannelHash(def.name)
  const description = buildChannelDescription(def)

  if (isReused) {
    const patchRow: ChannelPatchRow = {
      id: channelId,
      name,
      description,
      is_private: isPrivate,
      metadata,
      updated_at: foundedAtIso,
    }
    return { id: channelId, isReused: true, insertRow: null, patchRow }
  }

  const insertRow: ChannelInsertRow = {
    id: channelId,
    org_id: resolved.orgId,
    user_id: resolved.founderUserId,
    name,
    description,
    is_private: isPrivate,
    metadata,
    created_at: foundedAtIso,
    updated_at: foundedAtIso,
  }
  return { id: channelId, isReused: false, insertRow, patchRow: null }
}

function buildMembershipRows(
  ctx: PhaseContext,
  def: ChannelDef,
  channelId: string,
  resolved: ResolvedState,
  foundedAtIso: string,
): MembershipRow[] {
  const rows: MembershipRow[] = []
  const seen = new Set<string>()
  for (const rawMember of def.members) {
    const member = resolveMember(rawMember, resolved)
    if (seen.has(member.key)) continue
    seen.add(member.key)
    const id = ctx.ids.id('channel-membership', channelId, member.key)
    rows.push({
      id,
      channel_id: channelId,
      member_type: member.type,
      user_id: member.type === 'user' ? member.identity : null,
      agent_key: member.type === 'agent' ? member.identity : null,
      role: member.role,
      added_by: resolved.founderUserId,
      joined_at: foundedAtIso,
      created_at: foundedAtIso,
    })
  }
  return rows
}

function addMinutes(anchor: Date, minutes: number): Date {
  // Date arithmetic from an existing Date — not a fresh `new Date()` clock
  // read. Stays inside the seeder's deterministic timeline (NOW_MS pinned in
  // lib/timeline.ts).
  return new Date(anchor.getTime() + minutes * 60_000)
}

function buildMessageRows(
  ctx: PhaseContext,
  thread: ChannelThread,
  channelId: string,
  resolved: ResolvedState,
): ChannelMessageRow[] {
  const { ids, timeline } = ctx
  const threadId = ids.id('channel-thread', channelId, thread.slug)

  return thread.messages.map((msg, index) => {
    const member = resolveMember(msg.speaker, resolved)
    const messageId = ids.id('channel-message', channelId, thread.slug, String(index))
    const at = addMinutes(thread.startedAt, msg.minuteOffset)
    const atIso = timeline.iso(at)

    const metadata: Record<string, unknown> = {
      thread_id: threadId,
      thread_slug: thread.slug,
      thread_topic: thread.topic,
      message_index: index,
      seeded_by: 'yc-demo-seeder',
    }
    if (thread.campaignSlug) metadata.campaign_slug = thread.campaignSlug
    if (thread.spaceSlug) metadata.space_slug = thread.spaceSlug
    if (msg.mentions && msg.mentions.length > 0) metadata.mentions = msg.mentions
    metadata.speaker_kind = member.type
    metadata.speaker_label = member.rawSlug

    return {
      id: messageId,
      channel_id: channelId,
      sender_type: member.type,
      sender_id: member.identity,
      content: msg.body,
      content_blocks: null,
      metadata,
      reply_to_id: null,
      pinned: false,
      created_at: atIso,
      updated_at: atIso,
    }
  })
}

// ─── Batched DB helpers ────────────────────────────────────────────────────

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

async function patchReusedChannels(
  ctx: PhaseContext,
  rows: ReadonlyArray<ChannelPatchRow>,
): Promise<void> {
  // Per-row UPDATE so we do not overwrite P6's created_at.
  for (const row of rows) {
    const { error } = await ctx.supabase
      .from('channels')
      .update({
        name: row.name,
        description: row.description,
        is_private: row.is_private,
        metadata: row.metadata,
        updated_at: row.updated_at,
      })
      .eq('id', row.id)
    if (error) {
      throw new Error(`${PHASE_ID}: UPDATE channel id=${row.id} failed: ${error.message}`)
    }
  }
}

// ─── Phase handler ─────────────────────────────────────────────────────────

export const runP08Channels: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  const { log, dryRun, reset, state, timeline } = ctx

  log.step('P8 — channels + memberships + 90 days of messages')

  if (reset) {
    log.step(
      'Reset mode: P01 cascaded teardown of org → channels/memberships/messages gone with it; proceeding.',
    )
  }

  populateDryRunStateIfEmpty(ctx)
  const resolved = resolveState(state)

  // AGENCY_FOUNDED_AT lives in content/timeline.ts but maps directly to
  // dayOffset(90, 9, 0) — recompute via the lib helper to avoid pulling the
  // content module just for one constant.
  const foundedAt = timeline.dayOffset(90, 9, 0)
  const foundedAtIso = timeline.iso(foundedAt)

  // 1) Reconcile channels — split into NEW vs REUSED.
  const channelInsertRows: ChannelInsertRow[] = []
  const channelPatchRows: ChannelPatchRow[] = []
  const channelSlugToId = new Map<string, string>()
  let reusedCount = 0
  let createdCount = 0

  const memberships: MembershipRow[] = []
  const seenMembershipIds = new Set<string>()

  for (const def of CHANNELS) {
    const resolvedChannel = resolveChannel(ctx, def, resolved, foundedAtIso)
    channelSlugToId.set(def.slug, resolvedChannel.id)

    if (resolvedChannel.isReused) {
      if (resolvedChannel.patchRow) channelPatchRows.push(resolvedChannel.patchRow)
      reusedCount += 1
    } else {
      if (resolvedChannel.insertRow) channelInsertRows.push(resolvedChannel.insertRow)
      createdCount += 1
    }

    // Memberships per channel (deterministic, deduped on id).
    const rows = buildMembershipRows(ctx, def, resolvedChannel.id, resolved, foundedAtIso)
    for (const row of rows) {
      if (seenMembershipIds.has(row.id)) continue
      seenMembershipIds.add(row.id)
      memberships.push(row)
    }
  }

  // 2) Build messages from CHANNEL_THREADS, resolving channel ids.
  const messages: ChannelMessageRow[] = []
  const seenMessageIds = new Set<string>()
  const warnings: string[] = []

  for (const thread of CHANNEL_THREADS) {
    const channelId = channelSlugToId.get(thread.channelSlug)
    if (!channelId) {
      throw new Error(
        `${PHASE_ID}: thread "${thread.slug}" → channelSlug "${thread.channelSlug}" did not resolve to any channel. Add a matching ChannelDef to content/channels.ts or fix the thread.`,
      )
    }
    const rows = buildMessageRows(ctx, thread, channelId, resolved)
    for (const row of rows) {
      if (seenMessageIds.has(row.id)) {
        warnings.push(
          `${PHASE_ID}: duplicate channel_message id ${row.id} (channel="${thread.channelSlug}", thread="${thread.slug}") — skipped.`,
        )
        continue
      }
      seenMessageIds.add(row.id)
      messages.push(row)
    }
  }

  const rowCounts: Record<string, number> = {
    channels_created: createdCount,
    channels_reused: reusedCount,
    channels: createdCount + reusedCount,
    channel_memberships: memberships.length,
    channel_messages: messages.length,
  }

  if (dryRun) {
    log.step(
      `[dry-run] would create ${createdCount} channels, reuse ${reusedCount} (${channelPatchRows.length} patched), insert ${memberships.length} memberships and ${messages.length} channel_messages.`,
    )
    for (const [table, count] of Object.entries(rowCounts)) {
      log.rowCount(table, count)
    }
    return r.finish(rowCounts, warnings)
  }

  // 3) Real path — INSERT new channels first, then patch reused, then
  //    memberships, then messages (FK ordering).
  log.step(`Upserting new channels (${channelInsertRows.length})`)
  await batchUpsert(
    ctx,
    'channels',
    channelInsertRows as unknown as ReadonlyArray<Record<string, unknown>>,
    'id',
  )

  log.step(`Patching reused channels (${channelPatchRows.length})`)
  await patchReusedChannels(ctx, channelPatchRows)

  log.step(`Upserting channel_memberships (${memberships.length})`)
  await batchUpsert(
    ctx,
    'channel_memberships',
    memberships as unknown as ReadonlyArray<Record<string, unknown>>,
    'id',
  )

  log.step(`Upserting channel_messages (${messages.length})`)
  await batchUpsert(
    ctx,
    'channel_messages',
    messages as unknown as ReadonlyArray<Record<string, unknown>>,
    'id',
  )

  log.step(
    `Created ${createdCount} new channels, reused ${reusedCount}, ${memberships.length} memberships, ${messages.length} messages.`,
  )

  return r.finish(rowCounts, warnings)
}
