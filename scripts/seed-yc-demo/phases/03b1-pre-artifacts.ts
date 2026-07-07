/**
 * P3b1 — Pre-artifact derived INSERTs.
 *
 * Runs after P7 missions, BEFORE P7.5 artifacts (which need customer_avatars
 * to derive marketing avatars).
 *
 * Derivations (all deterministic — no LLM calls):
 *   A. Ambient memories from anchors (~645 — user + customer)
 *   B. Derived snapshots from semantic clusters (~70, capture_context='auto_generated')
 *   C. ns_snapshot_edges across the snapshot graph (~170, auto_generated=true)
 *   D. ns_memory_connections between anchor memories (~280)
 *   E. ns_belief_patterns (user ~22 + customer ~25, supporting_memories populated)
 *   F. ns_perspectives (user ~27 + customer ~18, beliefs[] populated)
 *   G. customer_avatars (7 — populates state.customerAvatarIds for P7.5c)
 *   H. ns_narrative_links across narrative pages (~80)
 *   I. ns_memory_sessions backfill (~95)
 *   J. ns_sk_evolution refinements (~50 — ~30% of sk entries)
 *   K. ns_sk_gaps across the 5 deep agents (~22 — 18 filled + 4 open)
 *   L. ns_brain_log non-cortex events (~475 — user 220 + customer 80 + 5 agents × 35)
 *
 * Cross-reference invariants throw with full context on any unresolved slug.
 * 03b2-cortex owns the company brain's brain_log entries.
 */
import { createHash } from 'node:crypto'
import type {
  AvatarNarrative,
  MemoryAnchor,
  NarrativePageAnchor,
  SkEntryAnchor,
} from '../content/_types'
import { AGENT_SK_ENTRIES, AGENT_SK_SOURCES } from '../content/agent-brains'
import { CONTACTS, CUSTOMER_AVATARS, CUSTOMER_BRAIN_MEMORIES } from '../content/customer-brain'
import { NARRATIVE_PAGES } from '../content/narrative-pages'
import { USER_BRAIN_MEMORIES, USER_BRAIN_SNAPSHOTS } from '../content/user-brain'
import { startResult, type PhaseContext, type PhaseHandler, type PhaseState } from './_context'

const PHASE_ID = '03b1-pre-artifacts'

const UPSERT_BATCH_SIZE = 200

const DEEP_AGENT_SLUGS = ['maya', 'leo', 'sara', 'devon', 'casey'] as const
const HIRED_AGENT_KEYS = ['maya', 'leo', 'sara', 'devon', 'casey', 'riley', 'owen'] as const

// ─── Helpers ───────────────────────────────────────────────────────────────

function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex')
}

/** Fast deterministic xmur3+mulberry32 in [0,1). Matches lib/timeline seededRandom. */
function seededRandom(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = (h ^= h >>> 16) >>> 0
  let a = h || 1
  a = (a + 0x6d2b79f5) | 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function pickN<T>(arr: readonly T[], n: number, seed: string): T[] {
  if (n <= 0) return []
  if (arr.length <= n) return arr.slice()
  return arr
    .map((item, i) => ({ item, k: seededRandom(`${seed}:${i}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map(({ item }) => item)
}

function trimTo(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function uniqueTags(...lists: readonly (readonly string[])[]): string[] {
  const out = new Set<string>()
  for (const list of lists) for (const t of list) out.add(t)
  return Array.from(out)
}

function shareAnyTag(a: readonly string[], b: readonly string[]): boolean {
  const set = new Set(b)
  for (const t of a) if (set.has(t)) return true
  return false
}

function tagOverlapCount(a: readonly string[], b: readonly string[]): number {
  const set = new Set(b)
  let n = 0
  for (const t of a) if (set.has(t)) n++
  return n
}

// ─── State plumbing ────────────────────────────────────────────────────────

interface ResolvedState {
  orgId: string
  founderUserId: string
  defaultUserBrainId: string
  companyBrainId: string
  customerBrainId: string
  agentBrainIds: Record<string, string>
  contactIds: Record<string, string>
  hiredAgentKeys: string[]
}

function populateDryRunStateIfEmpty(ctx: PhaseContext): void {
  if (!ctx.dryRun) return
  const { state, ids, log } = ctx
  if (state.orgId) return // populated by a prior phase in this run

  const founderUserId = ids.id('user', 'founder')
  const orgId = ids.id('org', 'foundry-creative')
  // P01 mints the founder's default user brain via ids.id('user-brain', 'founder')
  const defaultUserBrainId = ids.id('user-brain', 'founder')
  // P02 mints org-scoped brains via ids.id('brain', scope, orgId)
  const companyBrainId = ids.id('brain', 'company', orgId)
  const customerBrainId = ids.id('brain', 'customer', orgId)
  // P04 mints per-agent brains via ids.id('ns-brain-agent', orgId, agentKey)
  const agentBrainIds: Record<string, string> = {}
  for (const slug of DEEP_AGENT_SLUGS) {
    agentBrainIds[slug] = ids.id('ns-brain-agent', orgId, slug)
  }
  // P03a mints contact ids via ids.id('contact', orgId, slug)
  const contactIds: Record<string, string> = {}
  for (const persona of CONTACTS) {
    contactIds[persona.slug] = ids.id('contact', orgId, persona.slug)
  }

  state.founderUserId = founderUserId
  state.orgId = orgId
  state.defaultUserBrainId = defaultUserBrainId
  state.companyBrainId = companyBrainId
  state.customerBrainId = customerBrainId
  state.agentBrainIds = agentBrainIds
  state.contactIds = contactIds
  state.hiredAgentKeys = [...HIRED_AGENT_KEYS]

  log.step(
    `Dry-run isolation: synthesized state.orgId=${orgId} contactIds=${
      Object.keys(contactIds).length
    } agentBrainIds=[${Object.keys(agentBrainIds).join(',')}]`,
  )
}

function resolveState(state: PhaseState): ResolvedState {
  const {
    orgId,
    founderUserId,
    defaultUserBrainId,
    companyBrainId,
    customerBrainId,
    agentBrainIds,
    contactIds,
    hiredAgentKeys,
  } = state
  if (!orgId) throw new Error(`${PHASE_ID}: state.orgId missing — run --phase=01-account first.`)
  if (!founderUserId)
    throw new Error(`${PHASE_ID}: state.founderUserId missing — run --phase=01-account first.`)
  if (!defaultUserBrainId)
    throw new Error(`${PHASE_ID}: state.defaultUserBrainId missing — run --phase=01-account first.`)
  if (!companyBrainId)
    throw new Error(
      `${PHASE_ID}: state.companyBrainId missing — run --phase=02-brains-skeleton first.`,
    )
  if (!customerBrainId)
    throw new Error(
      `${PHASE_ID}: state.customerBrainId missing — run --phase=02-brains-skeleton first.`,
    )
  if (!agentBrainIds || Object.keys(agentBrainIds).length === 0)
    throw new Error(
      `${PHASE_ID}: state.agentBrainIds missing or empty — run --phase=04-team first.`,
    )
  if (!contactIds || Object.keys(contactIds).length === 0)
    throw new Error(
      `${PHASE_ID}: state.contactIds missing or empty — run --phase=03a-anchors first.`,
    )

  return {
    orgId,
    founderUserId,
    defaultUserBrainId,
    companyBrainId,
    customerBrainId,
    agentBrainIds,
    contactIds,
    hiredAgentKeys: hiredAgentKeys ?? [...HIRED_AGENT_KEYS],
  }
}

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

// ─── A. Ambient memories ────────────────────────────────────────────────────

interface AmbientVariation {
  suffix: 'followup' | 'thread' | 'voicememo'
  memoryType: MemoryAnchor['memoryType']
  sourceType: MemoryAnchor['sourceType']
  contentPrefix: string
  sourceTitleSuffix: string
  dayOffsetFromAnchor: number
  hourJitterSeed: string
  significanceMultiplier: number
  confidenceMultiplier: number
}

const AMBIENT_VARIATIONS: readonly AmbientVariation[] = [
  {
    suffix: 'followup',
    memoryType: 'reflection',
    sourceType: 'manual',
    contentPrefix: 'Follow-up note',
    sourceTitleSuffix: '— follow-up the next day',
    dayOffsetFromAnchor: 1,
    hourJitterSeed: 'a1',
    significanceMultiplier: 0.72,
    confidenceMultiplier: 0.88,
  },
  {
    suffix: 'thread',
    memoryType: 'observation',
    sourceType: 'channel',
    contentPrefix: 'Thread save',
    sourceTitleSuffix: '— thread save in partner channel',
    dayOffsetFromAnchor: 0,
    hourJitterSeed: 'a2',
    significanceMultiplier: 0.66,
    confidenceMultiplier: 0.85,
  },
  {
    suffix: 'voicememo',
    memoryType: 'reflection',
    sourceType: 'voice_memo',
    contentPrefix: 'Voice memo paraphrase',
    sourceTitleSuffix: '— voice memo replaying it back',
    dayOffsetFromAnchor: 2,
    hourJitterSeed: 'a3',
    significanceMultiplier: 0.78,
    confidenceMultiplier: 0.83,
  },
]

function ambientContent(variation: AmbientVariation, anchor: MemoryAnchor): string {
  const speaker = anchor.speaker ?? 'Garry Tan'
  const excerpt = trimTo(anchor.content, 320)
  switch (variation.suffix) {
    case 'followup':
      return `Follow-up note (re: ${anchor.slug}). Re-reading what ${speaker} said: "${excerpt}" — still tracks twenty-four hours later, no edits.`
    case 'thread':
      return `Thread save — ${speaker} in ${anchor.sourceTitle ?? 'the working channel'}: "${excerpt}"`
    case 'voicememo':
      return `Voice memo replaying ${anchor.slug}. The shape of it: ${excerpt} — saying it out loud to make sure it survives the week.`
    default: {
      const _exhaustive: never = variation.suffix
      throw new Error(`${PHASE_ID}: unhandled ambient variation "${String(_exhaustive)}"`)
    }
  }
}

interface BuildAmbientResult {
  rows: Array<Record<string, unknown>>
  /** anchor slug → list of ambient memory ids (used for connections/sessions). */
  ambientIdsBySlug: Map<string, string[]>
}

function buildAmbientMemories(
  ctx: PhaseContext,
  resolved: ResolvedState,
  anchors: readonly MemoryAnchor[],
  scope: 'user' | 'customer',
): BuildAmbientResult {
  const { ids, timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  const ambientIdsBySlug = new Map<string, string[]>()

  const brainId = scope === 'user' ? resolved.defaultUserBrainId : resolved.customerBrainId

  for (const anchor of anchors) {
    const ambientIds: string[] = []
    ambientIdsBySlug.set(anchor.slug, ambientIds)

    let contactId: string | null = null
    if (scope === 'customer') {
      if (!anchor.contactSlug) {
        throw new Error(
          `${PHASE_ID}: customer anchor "${anchor.slug}" has no contactSlug — cannot derive ambient memories.`,
        )
      }
      const resolvedContact = resolved.contactIds[anchor.contactSlug]
      if (!resolvedContact) {
        throw new Error(
          `${PHASE_ID}: customer anchor "${anchor.slug}" contactSlug "${anchor.contactSlug}" did not resolve. Run --phase=03a-anchors first.`,
        )
      }
      contactId = resolvedContact
    }

    for (const variation of AMBIENT_VARIATIONS) {
      const memoryId = ids.id('memory-ambient', scope, anchor.slug, variation.suffix)
      ambientIds.push(memoryId)

      const dayShift = variation.dayOffsetFromAnchor
      const hour = 8 + Math.floor(seededRandom(`${variation.hourJitterSeed}:${anchor.slug}:h`) * 12)
      const minute = Math.floor(seededRandom(`${variation.hourJitterSeed}:${anchor.slug}:m`) * 60)
      const capturedAt = timeline.after(anchor.capturedAt, dayShift, hour, minute)
      const capturedAtIso = timeline.iso(capturedAt)

      const content = ambientContent(variation, anchor)
      const significance = clamp01(anchor.significance * variation.significanceMultiplier)
      const confidence = clamp01(anchor.confidence * variation.confidenceMultiplier)

      const row: Record<string, unknown> = {
        id: memoryId,
        brain_id: brainId,
        content,
        content_hash: sha1(content),
        memory_type: variation.memoryType,
        source_type: variation.sourceType,
        source_id: null,
        source_title: anchor.sourceTitle
          ? `${anchor.sourceTitle} ${variation.sourceTitleSuffix}`
          : `${anchor.slug} ${variation.sourceTitleSuffix}`,
        speaker: variation.suffix === 'voicememo' ? 'Garry Tan' : (anchor.speaker ?? null),
        confidence,
        significance,
        tags: uniqueTags(anchor.tags, ['ambient', `ambient-${variation.suffix}`]),
        embedding: null,
        source_emotion: anchor.emotion?.label ?? null,
        emotional_valence: anchor.emotion?.valence ?? null,
        emotional_intensity: anchor.emotion?.intensity
          ? clamp01(anchor.emotion.intensity * 0.9)
          : null,
        metadata: {
          ambient: true,
          anchor_slug: anchor.slug,
          variation: variation.suffix,
        },
        created_at: capturedAtIso,
        updated_at: capturedAtIso,
      }
      if (contactId) row.contact_id = contactId
      rows.push(row)
    }
  }

  return { rows, ambientIdsBySlug }
}

// ─── B. Derived snapshots ───────────────────────────────────────────────────

interface DerivedSnapshotInput {
  brainScope: 'user' | 'customer'
  clusterKey: string
  clusterTags: string[]
  memories: MemoryAnchor[]
  brainId: string
}

interface SnapshotRecord {
  id: string
  brainId: string
  brainScope: 'user' | 'customer'
  tags: string[]
  createdAt: Date
  /** Either an anchor snapshot slug or the cluster key for derived. */
  slug: string
  auto: boolean
}

function pickClusters(
  memories: readonly MemoryAnchor[],
  brainScope: 'user' | 'customer',
  brainId: string,
  excludeKeys: Set<string>,
  targetCount: number,
): DerivedSnapshotInput[] {
  // Build (sorted-tag-pair) → memories map.
  const pairToMems = new Map<string, MemoryAnchor[]>()
  for (const m of memories) {
    const tags = m.tags.slice().sort()
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const key = `${tags[i]!}__${tags[j]!}`
        if (excludeKeys.has(key)) continue
        const bucket = pairToMems.get(key) ?? []
        bucket.push(m)
        pairToMems.set(key, bucket)
      }
    }
  }

  // Keep buckets with >=3 memories. Rank by (size desc, key asc) deterministic.
  const ranked = Array.from(pairToMems.entries())
    .filter(([, mems]) => mems.length >= 3)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))

  const out: DerivedSnapshotInput[] = []
  for (const [key, mems] of ranked) {
    if (out.length >= targetCount) break
    const tagPair = key.split('__')
    const memCount = Math.min(5, mems.length)
    const picked = pickN(mems, memCount, `cluster:${brainScope}:${key}`)
      .slice()
      .sort((a, b) => b.significance - a.significance)
    out.push({
      brainScope,
      clusterKey: key,
      clusterTags: tagPair,
      memories: picked,
      brainId,
    })
  }
  return out
}

function buildDerivedSnapshotRow(
  ctx: PhaseContext,
  input: DerivedSnapshotInput,
  ambientMemoryIdsBySlug: Map<string, string[]>,
): { row: Record<string, unknown>; record: SnapshotRecord } {
  const { ids, timeline } = ctx
  const topMemory = input.memories[0]!
  // Snapshot crystallizes ~3 days after the top memory's capture.
  const crystallizedAt = timeline.after(topMemory.capturedAt, 3, 11, 30)
  const id = ids.id('snapshot-derived', input.brainScope, input.clusterKey)

  const namePieces = input.clusterTags.map((t) => t.replace(/-/g, ' '))
  const name = `Derived: ${namePieces.join(' · ')}`
  const one = `Auto-synthesized snapshot clustering ${input.memories.length} anchor memories on tags [${input.clusterTags.join(', ')}].`
  const story = `Atlas observed ${input.memories.length} anchor memories sharing the tag combination [${input.clusterTags.join(
    ', ',
  )}]. The clearest stake came from "${topMemory.slug}" — ${trimTo(topMemory.content, 240)}`
  const moment = `Synthesis ran the morning of ${timeline.iso(crystallizedAt).slice(0, 10)} after the third memory landed against this tag pair.`
  const core = `Across ${input.memories.length} captures, the recurring shape is: ${trimTo(
    topMemory.content,
    180,
  )} Atlas marks this as a candidate belief until reinforced or challenged by counter-evidence.`
  const method = `Surfaces in retrieval whenever ${input.clusterTags
    .map((t) => `\`${t}\``)
    .join(' + ')} appear together; cited inline in narrative pages tagged the same way.`
  const challenge = `Counter-evidence threshold: two new memories tagged [${input.clusterTags.join(
    ', ',
  )}] with confidence ≥0.85 that contradict the core. Atlas flips status → 'challenged' if hit.`
  const tags = uniqueTags(input.clusterTags, ['derived', 'auto-generated'])

  // Pick a representative ambient memory for source_id (text) when available;
  // fall back to the anchor memory id.
  const anchorMemoryId = ctx.ids.id('memory', input.brainScope, topMemory.slug)
  const ambientPool = ambientMemoryIdsBySlug.get(topMemory.slug) ?? []
  const sourceMemoryId = ambientPool[0] ?? anchorMemoryId

  const row: Record<string, unknown> = {
    id,
    brain_id: input.brainId,
    name,
    type: 'Belief',
    core,
    one_liner: one,
    story,
    moment,
    method,
    steps: null,
    filter: `Apply when ${input.clusterTags.map((t) => `"${t}"`).join(' + ')} co-occur in a brief or capture.`,
    challenge,
    break_test: `If the next three memories tagged [${input.clusterTags.join(
      ', ',
    )}] do not reinforce this, retire the snapshot.`,
    risks:
      'Risk: auto-generated cluster may be a tag artifact, not a real pattern. Re-evaluate after manual review.',
    proof: `Top memories: ${input.memories.map((m) => m.slug).join(', ')}.`,
    source_type: 'memory',
    source_id: sourceMemoryId,
    confidence: clamp01(topMemory.confidence * 0.85),
    significance_score: clamp01(topMemory.significance * 0.8),
    tags,
    embedding: null,
    capture_context: 'auto_generated',
    created_at: timeline.iso(crystallizedAt),
    updated_at: timeline.iso(crystallizedAt),
  }
  const record: SnapshotRecord = {
    id,
    brainId: input.brainId,
    brainScope: input.brainScope,
    tags,
    createdAt: crystallizedAt,
    slug: input.clusterKey,
    auto: true,
  }
  return { row, record }
}

// ─── C. ns_snapshot_edges ───────────────────────────────────────────────────

const EDGE_TYPES = ['supports', 'related', 'contrasts', 'elaborates'] as const

function pickEdgeType(seed: string): (typeof EDGE_TYPES)[number] {
  const r = seededRandom(seed)
  return EDGE_TYPES[Math.floor(r * EDGE_TYPES.length)]!
}

function buildSnapshotEdges(
  ctx: PhaseContext,
  snapshots: readonly SnapshotRecord[],
): Array<Record<string, unknown>> {
  const { ids, timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  const dedupe = new Set<string>()

  // Group by brain scope so edges connect within a brain (semantically coherent).
  const byBrain = new Map<string, SnapshotRecord[]>()
  for (const s of snapshots) {
    const list = byBrain.get(s.brainId) ?? []
    list.push(s)
    byBrain.set(s.brainId, list)
  }

  for (const [brainId, list] of byBrain) {
    for (let i = 0; i < list.length; i++) {
      const source = list[i]!
      // Score all others by tag overlap, then pick 1-3.
      const scored = list
        .map((target, idx) => ({ target, idx }))
        .filter(({ target, idx }) => idx !== i && shareAnyTag(source.tags, target.tags))
        .map(({ target, idx }) => ({
          target,
          score: tagOverlapCount(source.tags, target.tags),
          tieBreaker: seededRandom(`edge:${brainId}:${i}:${idx}`),
        }))
        .sort((a, b) => b.score - a.score || a.tieBreaker - b.tieBreaker)

      const desiredEdges = 1 + Math.floor(seededRandom(`edge-count:${brainId}:${source.slug}`) * 3) // 1..3
      const targets = scored.slice(0, desiredEdges)

      for (const { target } of targets) {
        const edgeType = pickEdgeType(`edge-type:${source.slug}:${target.slug}`)
        const pairKey = `${source.id}:${target.id}:${edgeType}`
        if (dedupe.has(pairKey)) continue
        dedupe.add(pairKey)

        const strength = clamp01(
          0.4 + seededRandom(`edge-strength:${source.slug}:${target.slug}`) * 0.45,
        )
        // Use the later of the two snapshot timestamps for created_at.
        const createdAt =
          source.createdAt.getTime() > target.createdAt.getTime()
            ? source.createdAt
            : target.createdAt
        rows.push({
          id: ids.id('snapshot-edge', source.id, target.id, edgeType),
          source_id: source.id,
          target_id: target.id,
          edge_type: edgeType,
          strength,
          context: `Auto-linked on shared tags: [${source.tags
            .filter((t) => target.tags.includes(t))
            .join(', ')}]`,
          auto_generated: true,
          created_at: timeline.iso(createdAt),
          updated_at: timeline.iso(createdAt),
        })
      }
    }
  }

  return rows
}

// ─── D. ns_memory_connections ───────────────────────────────────────────────

const MEMORY_RELATIONSHIPS = ['supports', 'contradicts', 'elaborates', 'reframes'] as const

function pickRelationship(seed: string): (typeof MEMORY_RELATIONSHIPS)[number] {
  const r = seededRandom(seed)
  return MEMORY_RELATIONSHIPS[Math.floor(r * MEMORY_RELATIONSHIPS.length)]!
}

interface AnchorMemoryHandle {
  slug: string
  id: string
  tags: string[]
  brainScope: 'user' | 'customer'
  capturedAt: Date
}

function buildMemoryConnections(
  ctx: PhaseContext,
  anchors: readonly AnchorMemoryHandle[],
): Array<Record<string, unknown>> {
  const { ids, timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  const dedupe = new Set<string>()

  for (let i = 0; i < anchors.length; i++) {
    const source = anchors[i]!
    // Find candidates in the same brain scope sharing >=1 tag.
    const candidates = anchors
      .map((target, idx) => ({ target, idx }))
      .filter(
        ({ target, idx }) =>
          idx !== i &&
          target.brainScope === source.brainScope &&
          shareAnyTag(source.tags, target.tags),
      )
      .map(({ target, idx }) => ({
        target,
        score: tagOverlapCount(source.tags, target.tags),
        tieBreaker: seededRandom(`mem-conn:${source.slug}:${idx}`),
      }))
      .sort((a, b) => b.score - a.score || a.tieBreaker - b.tieBreaker)

    // 1..2 connections per anchor — bias toward more coverage.
    const want = 1 + Math.floor(seededRandom(`mem-conn-count:${source.slug}`) * 2) // 1,2
    const chosen = candidates.slice(0, want)

    for (const { target } of chosen) {
      const relationship = pickRelationship(`mem-rel:${source.slug}:${target.slug}`)
      const pairKey = `${source.id}:${target.id}:${relationship}`
      if (dedupe.has(pairKey)) continue
      dedupe.add(pairKey)

      const strength = clamp01(
        0.3 + seededRandom(`mem-strength:${source.slug}:${target.slug}`) * 0.5,
      )
      const createdAt =
        source.capturedAt.getTime() > target.capturedAt.getTime()
          ? source.capturedAt
          : target.capturedAt
      rows.push({
        id: ids.id('memory-conn', source.id, target.id, relationship),
        source_memory_id: source.id,
        target_memory_id: target.id,
        relationship,
        strength,
        created_by: 'atlas',
        created_at: timeline.iso(createdAt),
      })
    }
  }

  return rows
}

// ─── E. ns_belief_patterns ─────────────────────────────────────────────────

interface BeliefSpec {
  slug: string
  scope: 'user' | 'customer'
  patternName: string
  description: string
  filterTags: string[]
  /** 'active' | 'emerging' | 'challenged' */
  status: 'active' | 'emerging' | 'challenged'
  evidenceType: 'stated' | 'revealed' | 'behavioral'
  emotionalSignature: Record<string, number>
  reinforcementCount: number
}

const USER_BELIEF_SPECS: readonly BeliefSpec[] = [
  {
    slug: 'belief-six-clients-cap',
    scope: 'user',
    patternName: 'Six retainers is a ceiling',
    description: 'Foundry refuses a seventh concurrent retainer.',
    filterTags: ['principle', 'retainer'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { conviction: 0.9, calm: 0.7 },
    reinforcementCount: 7,
  },
  {
    slug: 'belief-no-logo-pitches',
    scope: 'user',
    patternName: 'We do not pitch on logo work',
    description: 'Mark is downstream of positioning.',
    filterTags: ['principle', 'brand'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { conviction: 0.85, firmness: 0.8 },
    reinforcementCount: 6,
  },
  {
    slug: 'belief-three-customer-calls',
    scope: 'user',
    patternName: 'Three customer calls before a brief',
    description: 'No brief opens with a writer typing.',
    filterTags: ['principle', 'positioning'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { discipline: 0.9 },
    reinforcementCount: 8,
  },
  {
    slug: 'belief-brand-growth-same-job',
    scope: 'user',
    patternName: 'Brand and growth are the same job',
    description: 'No split between positioning and paid.',
    filterTags: ['principle', 'brand', 'growth'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { conviction: 0.95 },
    reinforcementCount: 8,
  },
  {
    slug: 'belief-monday-morning-test',
    scope: 'user',
    patternName: 'Monday-morning test for every deliverable',
    description: 'Every deliverable names a Monday action.',
    filterTags: ['principle', 'ops', 'jules'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { practicality: 0.9 },
    reinforcementCount: 6,
  },
  {
    slug: 'belief-positioning-not-mark',
    scope: 'user',
    patternName: 'Positioning precedes the mark',
    description: 'Identity work without a position is theater.',
    filterTags: ['positioning', 'brand'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { conviction: 0.85 },
    reinforcementCount: 5,
  },
  {
    slug: 'belief-organic-before-paid',
    scope: 'user',
    patternName: 'Organic before paid',
    description: 'Paid amplifies a proven message, never invents one.',
    filterTags: ['growth', 'leo'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { discipline: 0.85 },
    reinforcementCount: 5,
  },
  {
    slug: 'belief-pricing-protects-quality',
    scope: 'user',
    patternName: 'Pricing protects the work',
    description: 'Refusal to discount the retainer scope.',
    filterTags: ['pricing'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { firmness: 0.8 },
    reinforcementCount: 4,
  },
  {
    slug: 'belief-hiring-shapes-brand',
    scope: 'user',
    patternName: 'Who we hire is who the brand becomes',
    description: 'Hiring is a brand decision, not an ops decision.',
    filterTags: ['hiring'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { care: 0.8 },
    reinforcementCount: 4,
  },
  {
    slug: 'belief-customer-quote-is-truth',
    scope: 'user',
    patternName: 'The customer quote is the truth',
    description: 'Voice doc edits citing real quotes win every argument.',
    filterTags: ['customer-quote', 'positioning'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { trust: 0.9 },
    reinforcementCount: 6,
  },
  {
    slug: 'belief-friday-cadence',
    scope: 'user',
    patternName: 'Friday cadence is the heartbeat',
    description: 'A weekly note keeps the retainer aligned.',
    filterTags: ['ops', 'riley'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { rhythm: 0.85 },
    reinforcementCount: 5,
  },
  {
    slug: 'belief-no-thought-leadership',
    scope: 'user',
    patternName: 'No thought-leadership for its own sake',
    description: 'If our own people would not read it, it does not ship.',
    filterTags: ['brand', 'sara'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { firmness: 0.8 },
    reinforcementCount: 4,
  },
  {
    slug: 'belief-decline-the-seventh',
    scope: 'user',
    patternName: 'Decline the seventh prospect in writing',
    description: 'A no-with-a-note keeps the ceiling honest.',
    filterTags: ['principle', 'retainer'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { discipline: 0.85 },
    reinforcementCount: 3,
  },
  {
    slug: 'belief-async-burns-trust',
    scope: 'user',
    patternName: 'Async approvals burn trust',
    description: 'Approvals on Slack drift; approvals on call resolve.',
    filterTags: ['ops'],
    status: 'emerging',
    evidenceType: 'revealed',
    emotionalSignature: { wariness: 0.7 },
    reinforcementCount: 2,
  },
  {
    slug: 'belief-jules-finishes-the-week',
    scope: 'user',
    patternName: 'Jules finishes the week',
    description: 'Delivery shape is set by who closes Friday.',
    filterTags: ['jules', 'ops'],
    status: 'emerging',
    evidenceType: 'behavioral',
    emotionalSignature: { trust: 0.85 },
    reinforcementCount: 3,
  },
  {
    slug: 'belief-nico-slows-me-down',
    scope: 'user',
    patternName: 'Nico slows me down enough to name it',
    description: 'Strategy is the friction that produces precision.',
    filterTags: ['nico'],
    status: 'emerging',
    evidenceType: 'revealed',
    emotionalSignature: { gratitude: 0.85 },
    reinforcementCount: 4,
  },
  {
    slug: 'belief-maya-owns-the-voice',
    scope: 'user',
    patternName: 'Maya is the voice-keeper',
    description: 'Brand integrity lives in Maya before it lives anywhere.',
    filterTags: ['maya'],
    status: 'emerging',
    evidenceType: 'behavioral',
    emotionalSignature: { trust: 0.9 },
    reinforcementCount: 5,
  },
  {
    slug: 'belief-six-month-retainer-min',
    scope: 'user',
    patternName: 'Six-month minimum retainer',
    description: 'Anything shorter and the brand never resets.',
    filterTags: ['retainer', 'pricing'],
    status: 'emerging',
    evidenceType: 'stated',
    emotionalSignature: { firmness: 0.7 },
    reinforcementCount: 2,
  },
  {
    slug: 'belief-scope-creep-is-positioning-failure',
    scope: 'user',
    patternName: 'Scope creep is a positioning failure',
    description: 'If the work drifted, the brief was wrong.',
    filterTags: ['ops'],
    status: 'challenged',
    evidenceType: 'revealed',
    emotionalSignature: { caution: 0.7 },
    reinforcementCount: 3,
  },
  {
    slug: 'belief-no-paid-without-organic',
    scope: 'user',
    patternName: 'No paid spend without an organic signal',
    description: 'Spend confirms a message, never invents one.',
    filterTags: ['growth'],
    status: 'challenged',
    evidenceType: 'behavioral',
    emotionalSignature: { discipline: 0.75 },
    reinforcementCount: 2,
  },
  {
    slug: 'belief-deliverable-is-a-decision',
    scope: 'user',
    patternName: 'A deliverable is a decision',
    description: 'If nothing changes Monday morning, the deliverable is a draft.',
    filterTags: ['principle', 'jules'],
    status: 'challenged',
    evidenceType: 'stated',
    emotionalSignature: { conviction: 0.7 },
    reinforcementCount: 2,
  },
  {
    slug: 'belief-six-roles-no-more',
    scope: 'user',
    patternName: 'Six core agent roles, no more',
    description: 'Brand, growth, delivery, ops, accounts, and design — and that is it.',
    filterTags: ['hiring'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { firmness: 0.7 },
    reinforcementCount: 3,
  },
]

const CUSTOMER_BELIEF_SPECS: readonly BeliefSpec[] = [
  {
    slug: 'belief-acme-platform-buyer',
    scope: 'customer',
    patternName: 'Plinthworks: marketing is for the platform-buyer',
    description: 'Devi will not write to the previous audience.',
    filterTags: ['acme', 'decision-trigger'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { firmness: 0.85, pragmatic: 0.9 },
    reinforcementCount: 7,
  },
  {
    slug: 'belief-acme-docs-are-product',
    scope: 'customer',
    patternName: 'Plinthworks: docs are the product surface',
    description: 'Editorial standard set by engineers who read them.',
    filterTags: ['acme', 'pain-point'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { discipline: 0.85 },
    reinforcementCount: 5,
  },
  {
    slug: 'belief-acme-organic-before-paid',
    scope: 'customer',
    patternName: 'Plinthworks: organic moves before any paid test',
    description: 'Kill criterion on the post precedes the ad.',
    filterTags: ['acme', 'success-marker'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { caution: 0.7 },
    reinforcementCount: 4,
  },
  {
    slug: 'belief-beta-voice-over-deadline',
    scope: 'customer',
    patternName: 'Saltline: voice over the launch window',
    description: 'Eliza will miss a window before drifting the voice.',
    filterTags: ['beta', 'decision-trigger'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { 'protective-of-voice': 0.95 },
    reinforcementCount: 7,
  },
  {
    slug: 'belief-beta-no-curated',
    scope: 'customer',
    patternName: 'Saltline: avoid the "curated" tonal drift',
    description: 'Anything Williams Sonoma could send is out.',
    filterTags: ['beta', 'competitor-mention'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { firmness: 0.85 },
    reinforcementCount: 5,
  },
  {
    slug: 'belief-beta-ops-is-brand-safety',
    scope: 'customer',
    patternName: 'Saltline: ops is a brand-safety function',
    description: 'Theo kills a SKU before brand can over-promise.',
    filterTags: ['beta', 'risk-signal'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { vigilance: 0.8 },
    reinforcementCount: 4,
  },
  {
    slug: 'belief-beta-thursday-cadence',
    scope: 'customer',
    patternName: 'Saltline: Thursday-morning approval cadence',
    description: 'Eliza reviews in her kitchen on Thursday afternoon.',
    filterTags: ['beta', 'pain-point'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { rhythm: 0.85 },
    reinforcementCount: 3,
  },
  {
    slug: 'belief-gamma-cfo-co-buyer',
    scope: 'customer',
    patternName: 'Helmsmark: the CFO is a co-buyer of the brand',
    description: 'Wendell sits in on the brand call every week.',
    filterTags: ['gamma', 'decision-trigger', 'expansion-signal'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { trust: 0.9 },
    reinforcementCount: 8,
  },
  {
    slug: 'belief-gamma-no-ai-powered',
    scope: 'customer',
    patternName: 'Helmsmark: no "AI-powered" in the hero',
    description: 'Variance numbers over category language.',
    filterTags: ['gamma', 'objection'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { precision: 0.95 },
    reinforcementCount: 4,
  },
  {
    slug: 'belief-gamma-controller-quote',
    scope: 'customer',
    patternName: 'Helmsmark: write what a controller would underline',
    description: 'Sara passes drafts to Adaeze with that ask.',
    filterTags: ['gamma', 'success-marker'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { focus: 0.85 },
    reinforcementCount: 5,
  },
  {
    slug: 'belief-gamma-three-named-cfos',
    scope: 'customer',
    patternName: 'Helmsmark: three named-CFO trust marks over ten quotes',
    description: 'Case studies are a quality metric.',
    filterTags: ['gamma', 'pricing'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { discipline: 0.8 },
    reinforcementCount: 3,
  },
  {
    slug: 'belief-delta-no-consumer-language',
    scope: 'customer',
    patternName: 'Cloverkin: no "consumer" language',
    description: 'Patients are not consumers — Marisol vetoes the word.',
    filterTags: ['delta', 'objection'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { 'protective-of-patient': 0.95 },
    reinforcementCount: 5,
  },
  {
    slug: 'belief-delta-continuity-is-product',
    scope: 'customer',
    patternName: 'Cloverkin: continuity is the product',
    description: 'The same care team showing up week 20.',
    filterTags: ['delta', 'decision-trigger'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { care: 0.95 },
    reinforcementCount: 6,
  },
  {
    slug: 'belief-delta-48h-no-send',
    scope: 'customer',
    patternName: 'Cloverkin: no marketing send within 48h of a visit',
    description: 'Trust violation rule baked into the SOP.',
    filterTags: ['delta', 'risk-signal'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { caution: 0.95 },
    reinforcementCount: 5,
  },
  {
    slug: 'belief-delta-after-hours-pill',
    scope: 'customer',
    patternName: 'Cloverkin: after-hours pill drives the palette',
    description: 'The accent color matters more than the logo color.',
    filterTags: ['delta', 'success-marker'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { care: 0.85 },
    reinforcementCount: 3,
  },
  {
    slug: 'belief-epsilon-positioning-not-redesign',
    scope: 'customer',
    patternName: 'Throughput: stop the COO from apologizing',
    description: 'Dominic wants positioning, not a redesign.',
    filterTags: ['epsilon', 'decision-trigger'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { conviction: 0.85 },
    reinforcementCount: 4,
  },
  {
    slug: 'belief-epsilon-pl-fluency',
    scope: 'customer',
    patternName: 'Throughput: P&L-fluent buyer wants a P&L-fluent vendor',
    description: 'Margin-per-service-line led the kickoff.',
    filterTags: ['epsilon', 'pricing', 'success-marker'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { 'P&L-fluent': 0.95 },
    reinforcementCount: 5,
  },
  {
    slug: 'belief-epsilon-loom-forwardable',
    scope: 'customer',
    patternName: 'Throughput: content is a forwardable Loom',
    description: 'No white papers — short-form, visible, forwardable.',
    filterTags: ['epsilon', 'objection'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { practicality: 0.9 },
    reinforcementCount: 3,
  },
  {
    slug: 'belief-epsilon-aliyah-approves',
    scope: 'customer',
    patternName: 'Throughput: Aliyah is the silent approver',
    description: 'Riley routes deliverables past the COO first.',
    filterTags: ['epsilon', 'risk-signal'],
    status: 'emerging',
    evidenceType: 'revealed',
    emotionalSignature: { vigilance: 0.8 },
    reinforcementCount: 2,
  },
  {
    slug: 'belief-zeta-no-edutainment',
    scope: 'customer',
    patternName: 'Almanac: no edutainment language',
    description: 'No "gamified", no "bite-sized", no "unlock".',
    filterTags: ['zeta', 'objection'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { firmness: 0.85 },
    reinforcementCount: 4,
  },
  {
    slug: 'belief-zeta-cohort-is-serious',
    scope: 'customer',
    patternName: 'Almanac: honor the Tuesday-evening cohort',
    description: 'Twenty-eight adults pulling two hours out.',
    filterTags: ['zeta', 'decision-trigger'],
    status: 'active',
    evidenceType: 'stated',
    emotionalSignature: { 'protective-of-craft': 0.9 },
    reinforcementCount: 4,
  },
  {
    slug: 'belief-zeta-no-urgency-tactics',
    scope: 'customer',
    patternName: 'Almanac: no urgency tactics on the course page',
    description: 'Tomás killed "limited seats" himself.',
    filterTags: ['zeta', 'objection'],
    status: 'active',
    evidenceType: 'behavioral',
    emotionalSignature: { 'protective-of-craft': 0.9 },
    reinforcementCount: 3,
  },
  {
    slug: 'belief-zeta-reading-list-flagship',
    scope: 'customer',
    patternName: 'Almanac: the reading list is the flagship',
    description: 'Free course quality bar for the inbound object.',
    filterTags: ['zeta', 'expansion-signal'],
    status: 'emerging',
    evidenceType: 'stated',
    emotionalSignature: { generosity: 0.85 },
    reinforcementCount: 2,
  },
  {
    slug: 'belief-disqualified-tactics-first',
    scope: 'customer',
    patternName: 'Disqualified pattern: tactics-first stakeholder',
    description: 'Secondary stakeholder pulling toward easy metrics.',
    filterTags: ['risk-signal'],
    status: 'challenged',
    evidenceType: 'revealed',
    emotionalSignature: { wariness: 0.8 },
    reinforcementCount: 3,
  },
  {
    slug: 'belief-disqualified-reach-over-pipeline',
    scope: 'customer',
    patternName: 'Disqualified pattern: reach over pipeline',
    description: 'Devrel/biz-dev metric reflex masking the buyer.',
    filterTags: ['risk-signal'],
    status: 'challenged',
    evidenceType: 'behavioral',
    emotionalSignature: { caution: 0.7 },
    reinforcementCount: 2,
  },
]

interface BeliefRecord {
  id: string
  slug: string
  scope: 'user' | 'customer'
  tags: string[]
}

function buildBeliefPatterns(
  ctx: PhaseContext,
  resolved: ResolvedState,
  specs: readonly BeliefSpec[],
  anchors: readonly MemoryAnchor[],
  detectedAtBaseDaysAgo: number,
): { rows: Array<Record<string, unknown>>; records: BeliefRecord[] } {
  const { ids, timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  const records: BeliefRecord[] = []

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]!
    const beliefId = ids.id('belief-pattern', spec.scope, spec.slug)
    const matchingMemories = anchors.filter(
      (m) =>
        spec.filterTags.every((t) => m.tags.includes(t)) ||
        spec.filterTags.some((t) => m.tags.includes(t)),
    )
    // Prefer memories that match ALL filter tags; fall back to any-overlap.
    const strict = anchors.filter((m) => spec.filterTags.every((t) => m.tags.includes(t)))
    const candidates = strict.length >= 3 ? strict : matchingMemories
    if (candidates.length === 0) {
      throw new Error(
        `${PHASE_ID}: belief "${spec.slug}" filterTags [${spec.filterTags.join(
          ', ',
        )}] matched zero anchor memories. Fix the spec in USER_BELIEF_SPECS / CUSTOMER_BELIEF_SPECS.`,
      )
    }
    const wantCount = Math.min(
      7,
      Math.max(3, 3 + Math.floor(seededRandom(`belief-mem-count:${spec.slug}`) * 5)),
    )
    const picked = pickN(candidates, wantCount, `belief-mems:${spec.slug}`)
    const supportingMemoryIds = picked.map((m) => ids.id('memory', spec.scope, m.slug))

    const detectedAt = timeline.dayOffset(detectedAtBaseDaysAgo - i * 2, 10 + (i % 6), 0)
    const lastReinforcedAt = timeline.dayOffset(
      Math.max(3, detectedAtBaseDaysAgo - i * 2 - 7),
      14,
      30,
    )
    const strength = clamp01(0.35 + (spec.reinforcementCount / 10) * 0.5)

    rows.push({
      id: beliefId,
      subject_id: resolved.founderUserId,
      pattern_name: spec.patternName,
      description: spec.description,
      emotional_signature: spec.emotionalSignature,
      supporting_memories: supportingMemoryIds,
      supporting_responses: [],
      strength,
      status: spec.status,
      evidence_type: spec.evidenceType,
      reinforcement_count: spec.reinforcementCount,
      detected_at: timeline.iso(detectedAt),
      last_reinforced_at: timeline.iso(lastReinforcedAt),
      created_at: timeline.iso(detectedAt),
      updated_at: timeline.iso(lastReinforcedAt),
    })
    records.push({
      id: beliefId,
      slug: spec.slug,
      scope: spec.scope,
      tags: spec.filterTags.slice(),
    })
  }
  return { rows, records }
}

// ─── F. ns_perspectives ─────────────────────────────────────────────────────

interface PerspectiveSpec {
  slug: string
  scope: 'user' | 'customer'
  name: string
  description: string
  beliefSlugs: string[]
  influenceAreas: string[]
  status: 'active' | 'emerging' | 'challenged'
  blindSpots: string
}

const USER_PERSPECTIVE_SPECS: readonly PerspectiveSpec[] = [
  {
    slug: 'persp-six-on-purpose',
    scope: 'user',
    name: 'Six on purpose',
    description: 'The retainer ceiling is the studio architecture.',
    beliefSlugs: ['belief-six-clients-cap', 'belief-decline-the-seventh'],
    influenceAreas: ['retainer', 'pricing', 'sales'],
    status: 'active',
    blindSpots:
      'Risk: the ceiling masks demand variance — a six-cap year and a four-cap year are not the same business.',
  },
  {
    slug: 'persp-brand-and-growth-loop',
    scope: 'user',
    name: 'Brand and growth loop',
    description: 'One operator, one note, one studio.',
    beliefSlugs: ['belief-brand-growth-same-job', 'belief-organic-before-paid'],
    influenceAreas: ['brand', 'growth', 'positioning'],
    status: 'active',
    blindSpots: 'Risk: the loop assumes every retainer needs both halves — some genuinely do not.',
  },
  {
    slug: 'persp-positioning-precedes-mark',
    scope: 'user',
    name: 'Positioning precedes the mark',
    description: 'Identity work without a position is theater.',
    beliefSlugs: ['belief-positioning-not-mark', 'belief-no-logo-pitches'],
    influenceAreas: ['brand', 'sales'],
    status: 'active',
    blindSpots: 'Risk: refusing logo work loses pipeline that could have been reshaped.',
  },
  {
    slug: 'persp-monday-morning-shape',
    scope: 'user',
    name: 'Monday-morning shape',
    description: 'Every deliverable names a decision.',
    beliefSlugs: ['belief-monday-morning-test', 'belief-deliverable-is-a-decision'],
    influenceAreas: ['ops', 'delivery'],
    status: 'active',
    blindSpots:
      'Risk: the test forces premature specificity on strategy work that needs breathing room.',
  },
  {
    slug: 'persp-customer-quote-truth',
    scope: 'user',
    name: 'The customer quote is the truth',
    description: 'Three calls before the cursor moves.',
    beliefSlugs: ['belief-three-customer-calls', 'belief-customer-quote-is-truth'],
    influenceAreas: ['positioning', 'brand', 'voice'],
    status: 'active',
    blindSpots:
      'Risk: over-rotating on quoted phrasing in a category where the customers themselves are wrong about their own buyer.',
  },
  {
    slug: 'persp-friday-cadence',
    scope: 'user',
    name: 'Friday cadence is the heartbeat',
    description: 'Riley closes the week, Jules finishes it.',
    beliefSlugs: ['belief-friday-cadence', 'belief-jules-finishes-the-week'],
    influenceAreas: ['ops', 'delivery'],
    status: 'active',
    blindSpots: 'Risk: the cadence becomes ritual when the retainer needs an intervention instead.',
  },
  {
    slug: 'persp-pricing-discipline',
    scope: 'user',
    name: 'Pricing protects the work',
    description: 'Discount is a brand decision in disguise.',
    beliefSlugs: ['belief-pricing-protects-quality', 'belief-six-month-retainer-min'],
    influenceAreas: ['pricing', 'sales'],
    status: 'active',
    blindSpots:
      'Risk: rigid pricing loses an obvious-fit prospect we should have signed at a discount.',
  },
  {
    slug: 'persp-no-thought-leadership',
    scope: 'user',
    name: 'No thought leadership for its own sake',
    description: 'If our own people would not read it, it does not ship.',
    beliefSlugs: ['belief-no-thought-leadership'],
    influenceAreas: ['brand', 'content'],
    status: 'active',
    blindSpots: 'Risk: refusing the format loses a credibility surface a competitor will fill.',
  },
  {
    slug: 'persp-hiring-shapes-brand',
    scope: 'user',
    name: 'Who we hire is who the brand becomes',
    description: 'Six core roles, then we wait.',
    beliefSlugs: ['belief-hiring-shapes-brand', 'belief-six-roles-no-more'],
    influenceAreas: ['hiring', 'team'],
    status: 'active',
    blindSpots: 'Risk: the cap blocks a hire whose absence would cost us more than the salary.',
  },
  {
    slug: 'persp-maya-voice-keeper',
    scope: 'user',
    name: 'Maya is the voice-keeper',
    description: 'Voice integrity sits with the head of brand.',
    beliefSlugs: ['belief-maya-owns-the-voice'],
    influenceAreas: ['brand', 'voice'],
    status: 'active',
    blindSpots:
      'Risk: concentrating voice authority makes the studio fragile to Maya being unavailable for a week.',
  },
  {
    slug: 'persp-nico-strategist',
    scope: 'user',
    name: 'Nico slows me down enough to name it',
    description: 'Friction-as-precision in the partner room.',
    beliefSlugs: ['belief-nico-slows-me-down'],
    influenceAreas: ['strategy', 'team'],
    status: 'active',
    blindSpots: 'Risk: I lean on Nico to refuse decisions I should be making faster.',
  },
  {
    slug: 'persp-async-debt',
    scope: 'user',
    name: 'Async approvals burn trust',
    description: 'Decisions on Slack drift; decisions on calls hold.',
    beliefSlugs: ['belief-async-burns-trust'],
    influenceAreas: ['ops', 'delivery'],
    status: 'emerging',
    blindSpots: 'Risk: client schedules cannot always accommodate the synchronous default.',
  },
  {
    slug: 'persp-scope-creep-is-positioning',
    scope: 'user',
    name: 'Scope creep is a positioning failure',
    description: 'When the work drifts, the brief was wrong.',
    beliefSlugs: ['belief-scope-creep-is-positioning-failure'],
    influenceAreas: ['delivery', 'positioning'],
    status: 'challenged',
    blindSpots:
      'Risk: the framing makes scope conversations a brand argument instead of a contract one.',
  },
  {
    slug: 'persp-paid-without-organic-debt',
    scope: 'user',
    name: 'Paid without organic is debt',
    description: 'Spend amplifies a proven message.',
    beliefSlugs: ['belief-no-paid-without-organic'],
    influenceAreas: ['growth'],
    status: 'challenged',
    blindSpots: 'Risk: some products genuinely need paid to discover the message.',
  },
  {
    slug: 'persp-six-roles',
    scope: 'user',
    name: 'Six core roles, no more',
    description: 'Headcount is a brand commitment.',
    beliefSlugs: ['belief-six-roles-no-more'],
    influenceAreas: ['hiring'],
    status: 'emerging',
    blindSpots: 'Risk: the roster is a snapshot, not a constitution.',
  },
  {
    slug: 'persp-brand-engineering-loop',
    scope: 'user',
    name: 'Brand-engineering loop at Plinthworks',
    description: 'No marketing claim ships without engineer assent.',
    beliefSlugs: ['belief-customer-quote-is-truth'],
    influenceAreas: ['brand', 'delivery'],
    status: 'active',
    blindSpots: 'Risk: the SOP only works at Plinthworks scale.',
  },
  {
    slug: 'persp-saltline-voice-defense',
    scope: 'user',
    name: 'Saltline voice-defense rhythm',
    description: 'Thursday morning drafts, kitchen reads, no curated.',
    beliefSlugs: ['belief-no-thought-leadership', 'belief-customer-quote-is-truth'],
    influenceAreas: ['brand', 'voice'],
    status: 'active',
    blindSpots: 'Risk: the rhythm is fragile to Eliza-unavailability weeks.',
  },
  {
    slug: 'persp-helmsmark-board-defensible',
    scope: 'user',
    name: 'Helmsmark board-defensible brand',
    description: 'Brand work that survives a CFO read.',
    beliefSlugs: ['belief-pricing-protects-quality'],
    influenceAreas: ['brand', 'sales'],
    status: 'active',
    blindSpots:
      'Risk: the lens makes us over-index on quantitative proof when a qualitative case would land harder.',
  },
  {
    slug: 'persp-cloverkin-trust-first',
    scope: 'user',
    name: 'Cloverkin trust-first stance',
    description: 'The bedside is the brand testing ground.',
    beliefSlugs: ['belief-no-thought-leadership'],
    influenceAreas: ['brand', 'voice'],
    status: 'active',
    blindSpots: 'Risk: the stance is so protective it can under-market new patient acquisition.',
  },
  {
    slug: 'persp-throughput-pl-fluency',
    scope: 'user',
    name: 'Throughput P&L-fluent retainer',
    description: 'Margin questions before copy questions.',
    beliefSlugs: ['belief-pricing-protects-quality'],
    influenceAreas: ['sales', 'pricing'],
    status: 'active',
    blindSpots: 'Risk: the lens treats every services prospect like a fintech.',
  },
  {
    slug: 'persp-almanac-reading-list-flagship',
    scope: 'user',
    name: 'Almanac reading-list flagship',
    description: 'A reading list is a free course.',
    beliefSlugs: ['belief-no-thought-leadership'],
    influenceAreas: ['content', 'brand'],
    status: 'active',
    blindSpots: 'Risk: treating the list as a flagship adds maintenance overhead.',
  },
  {
    slug: 'persp-disqualified-stakeholders',
    scope: 'user',
    name: 'Disqualified-stakeholder buffer',
    description: 'Riley buffers tactic-first secondary voices.',
    beliefSlugs: ['belief-deliverable-is-a-decision'],
    influenceAreas: ['accounts', 'sales'],
    status: 'emerging',
    blindSpots: 'Risk: the buffer obscures legitimate tactical asks.',
  },
  {
    slug: 'persp-deliverable-as-decision',
    scope: 'user',
    name: 'A deliverable is a decision',
    description: 'If nothing changes Monday, it is a draft.',
    beliefSlugs: ['belief-deliverable-is-a-decision', 'belief-monday-morning-test'],
    influenceAreas: ['delivery', 'ops'],
    status: 'challenged',
    blindSpots: 'Risk: the test forces premature decisions on inherently exploratory deliverables.',
  },
  {
    slug: 'persp-organic-before-paid-strict',
    scope: 'user',
    name: 'Organic before paid (strict reading)',
    description: 'Spend must follow a proven post.',
    beliefSlugs: ['belief-organic-before-paid', 'belief-no-paid-without-organic'],
    influenceAreas: ['growth'],
    status: 'challenged',
    blindSpots: 'Risk: paid can be the discovery mechanism for the message.',
  },
  {
    slug: 'persp-positioning-before-mark',
    scope: 'user',
    name: 'Positioning before mark (sales-floor)',
    description: 'On every prospect call, in the same order.',
    beliefSlugs: ['belief-positioning-not-mark', 'belief-no-logo-pitches'],
    influenceAreas: ['sales', 'brand'],
    status: 'active',
    blindSpots: 'Risk: the order can lose a prospect we should have signed and reshaped.',
  },
  {
    slug: 'persp-friday-note-as-product',
    scope: 'user',
    name: 'The Friday note is a product',
    description: 'Riley + Jules + founder ship one a week.',
    beliefSlugs: ['belief-friday-cadence'],
    influenceAreas: ['ops', 'accounts'],
    status: 'active',
    blindSpots: 'Risk: the note becomes performance art when the week was quiet.',
  },
  {
    slug: 'persp-six-cap-as-positioning',
    scope: 'user',
    name: 'The six-cap is positioning',
    description: 'Externally, the cap is the brand promise.',
    beliefSlugs: ['belief-six-clients-cap'],
    influenceAreas: ['sales', 'brand'],
    status: 'active',
    blindSpots:
      'Risk: prospects hear the cap as exclusivity-marketing instead of operational discipline.',
  },
]

const CUSTOMER_PERSPECTIVE_SPECS: readonly PerspectiveSpec[] = [
  {
    slug: 'persp-cus-acme-platform-buyer',
    scope: 'customer',
    name: 'Plinthworks: marketing to the on-call buyer',
    description: 'Devi will not let copy speak to the previous audience.',
    beliefSlugs: ['belief-acme-platform-buyer', 'belief-acme-docs-are-product'],
    influenceAreas: ['brand', 'positioning'],
    status: 'active',
    blindSpots:
      'Risk: the buyer-narrowing strategy may shrink the existing community faster than it grows the new audience.',
  },
  {
    slug: 'persp-cus-acme-paid-discipline',
    scope: 'customer',
    name: 'Plinthworks: paid behind organic',
    description: 'Devi pre-empted the company-cortex anti-pattern.',
    beliefSlugs: ['belief-acme-organic-before-paid'],
    influenceAreas: ['growth'],
    status: 'active',
    blindSpots: 'Risk: an obvious paid signal might be left on the table while organic ramps.',
  },
  {
    slug: 'persp-cus-beta-voice-discipline',
    scope: 'customer',
    name: 'Saltline: voice-discipline retainer',
    description: 'Eliza and June define what the brand will not say.',
    beliefSlugs: ['belief-beta-voice-over-deadline', 'belief-beta-no-curated'],
    influenceAreas: ['brand', 'voice'],
    status: 'active',
    blindSpots:
      'Risk: voice constraints can mute a tactical experiment that would not actually drift the brand.',
  },
  {
    slug: 'persp-cus-beta-ops-brand-safety',
    scope: 'customer',
    name: 'Saltline: ops as brand safety',
    description: 'Theo holds the line on what marketing can promise.',
    beliefSlugs: ['belief-beta-ops-is-brand-safety'],
    influenceAreas: ['ops', 'brand'],
    status: 'active',
    blindSpots: 'Risk: ops conservatism can over-correct against marketing ambition.',
  },
  {
    slug: 'persp-cus-beta-thursday-rhythm',
    scope: 'customer',
    name: 'Saltline: Thursday approval rhythm',
    description: 'A cadence that protects voice without burning velocity.',
    beliefSlugs: ['belief-beta-thursday-cadence'],
    influenceAreas: ['ops', 'voice'],
    status: 'active',
    blindSpots: 'Risk: the rhythm depends on a single founder being available.',
  },
  {
    slug: 'persp-cus-gamma-cfo-cobuyer',
    scope: 'customer',
    name: 'Helmsmark: CFO as co-buyer of the brand',
    description: 'The board attends the brand review.',
    beliefSlugs: ['belief-gamma-cfo-co-buyer', 'belief-gamma-no-ai-powered'],
    influenceAreas: ['brand', 'sales'],
    status: 'active',
    blindSpots:
      'Risk: marketing-finance alignment is structural at Helmsmark — projecting it elsewhere may be wrong.',
  },
  {
    slug: 'persp-cus-gamma-three-cfo-trust',
    scope: 'customer',
    name: 'Helmsmark: three named-CFO trust marks',
    description: 'Quality of case studies over quantity.',
    beliefSlugs: ['belief-gamma-three-named-cfos', 'belief-gamma-controller-quote'],
    influenceAreas: ['brand', 'content'],
    status: 'active',
    blindSpots: 'Risk: three is enough until it is not.',
  },
  {
    slug: 'persp-cus-delta-trust-coded',
    scope: 'customer',
    name: 'Cloverkin: trust-coded everything',
    description: 'Continuity, no-words list, after-hours pill.',
    beliefSlugs: [
      'belief-delta-no-consumer-language',
      'belief-delta-continuity-is-product',
      'belief-delta-after-hours-pill',
    ],
    influenceAreas: ['brand', 'voice'],
    status: 'active',
    blindSpots:
      'Risk: trust coding can under-market the surface that brings the right new patients in.',
  },
  {
    slug: 'persp-cus-delta-send-window',
    scope: 'customer',
    name: 'Cloverkin: 48-hour send-window rule',
    description: 'Lifecycle SOP baked into trust.',
    beliefSlugs: ['belief-delta-48h-no-send'],
    influenceAreas: ['ops', 'lifecycle'],
    status: 'active',
    blindSpots: 'Risk: the rule is loud about marketing emails; it does not cover ops emails.',
  },
  {
    slug: 'persp-cus-epsilon-positioning',
    scope: 'customer',
    name: 'Throughput: positioning, not redesign',
    description: 'COO-credibility is the brief.',
    beliefSlugs: ['belief-epsilon-positioning-not-redesign', 'belief-epsilon-pl-fluency'],
    influenceAreas: ['brand', 'positioning'],
    status: 'active',
    blindSpots:
      'Risk: positioning work without site refresh can read as half-done to the partner team.',
  },
  {
    slug: 'persp-cus-epsilon-loom-content',
    scope: 'customer',
    name: 'Throughput: forwardable Loom content',
    description: 'No white papers; short-form, visible.',
    beliefSlugs: ['belief-epsilon-loom-forwardable'],
    influenceAreas: ['content', 'brand'],
    status: 'active',
    blindSpots: 'Risk: refusing white papers can leave a credibility surface to a competitor.',
  },
  {
    slug: 'persp-cus-epsilon-aliyah',
    scope: 'customer',
    name: 'Throughput: silent COO approver',
    description: 'Riley always routes through Aliyah.',
    beliefSlugs: ['belief-epsilon-aliyah-approves'],
    influenceAreas: ['accounts'],
    status: 'emerging',
    blindSpots: 'Risk: undocumented approver routing is fragile to staffing changes.',
  },
  {
    slug: 'persp-cus-zeta-cohort-seriousness',
    scope: 'customer',
    name: 'Almanac: honor the Tuesday cohort',
    description: 'Adult learners pulling two hours out.',
    beliefSlugs: ['belief-zeta-cohort-is-serious', 'belief-zeta-no-edutainment'],
    influenceAreas: ['brand', 'voice'],
    status: 'active',
    blindSpots: 'Risk: the seriousness lens can read as joyless to the wrong reader.',
  },
  {
    slug: 'persp-cus-zeta-no-urgency',
    scope: 'customer',
    name: 'Almanac: no urgency tactics',
    description: 'The drop-off is worse than the no-sign-up.',
    beliefSlugs: ['belief-zeta-no-urgency-tactics'],
    influenceAreas: ['conversion'],
    status: 'active',
    blindSpots: 'Risk: urgency abandonment can hide a genuine seat-scarcity signal.',
  },
  {
    slug: 'persp-cus-zeta-reading-list',
    scope: 'customer',
    name: 'Almanac: reading list as flagship',
    description: 'Best on the internet or we do not publish it.',
    beliefSlugs: ['belief-zeta-reading-list-flagship'],
    influenceAreas: ['content', 'brand'],
    status: 'emerging',
    blindSpots: 'Risk: the standard is a maintenance commitment.',
  },
  {
    slug: 'persp-cus-disqualified-tactics',
    scope: 'customer',
    name: 'Disqualified: tactic-first secondary stakeholders',
    description: 'Reach, completion rate, leaderboards.',
    beliefSlugs: ['belief-disqualified-tactics-first', 'belief-disqualified-reach-over-pipeline'],
    influenceAreas: ['accounts', 'sales'],
    status: 'challenged',
    blindSpots:
      'Risk: dismissing tactical asks misses signals about a real audience the founder is not seeing.',
  },
  {
    slug: 'persp-cus-cross-vertical-saying-no',
    scope: 'customer',
    name: 'Cross-vertical: where Foundry says no',
    description: 'Common shape of the disqualified retainer.',
    beliefSlugs: ['belief-disqualified-tactics-first'],
    influenceAreas: ['sales', 'positioning'],
    status: 'emerging',
    blindSpots:
      'Risk: pattern-matching prospects against the disqualified avatar can blind us to a contrarian fit.',
  },
  {
    slug: 'persp-cus-trust-coded-buyers',
    scope: 'customer',
    name: 'Trust-coded buyer pattern (Delta + Zeta)',
    description: 'Healthtech + adult-edu share a no-paid stance.',
    beliefSlugs: ['belief-delta-no-consumer-language', 'belief-zeta-no-edutainment'],
    influenceAreas: ['brand'],
    status: 'emerging',
    blindSpots: 'Risk: the cross-vertical link can over-generalize the no-paid rule.',
  },
]

interface PerspectiveRecord {
  id: string
  slug: string
  scope: 'user' | 'customer'
}

function buildPerspectives(
  ctx: PhaseContext,
  resolved: ResolvedState,
  specs: readonly PerspectiveSpec[],
  beliefRecords: readonly BeliefRecord[],
  detectedAtBaseDaysAgo: number,
): { rows: Array<Record<string, unknown>>; records: PerspectiveRecord[] } {
  const { ids, timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  const records: PerspectiveRecord[] = []
  const beliefBySlug = new Map(beliefRecords.map((b) => [b.slug, b]))

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]!
    const beliefIds = spec.beliefSlugs.map((slug) => {
      const b = beliefBySlug.get(slug)
      if (!b)
        throw new Error(
          `${PHASE_ID}: perspective "${spec.slug}" cites belief slug "${slug}" which does not exist in ${spec.scope === 'user' ? 'USER_BELIEF_SPECS' : 'CUSTOMER_BELIEF_SPECS'}.`,
        )
      return b.id
    })
    const id = ids.id('perspective', spec.scope, spec.slug)
    const detectedAt = timeline.dayOffset(detectedAtBaseDaysAgo - i * 2, 11, 15)
    const strength = clamp01(0.4 + (beliefIds.length / 6) * 0.4)
    const status = spec.status

    rows.push({
      id,
      subject_id: resolved.founderUserId,
      name: spec.name,
      description: spec.description,
      beliefs: beliefIds,
      influence_areas: spec.influenceAreas,
      strength,
      status,
      blind_spots: spec.blindSpots,
      narrative_md: `## ${spec.name}\n\n${spec.description}\n\n**Influence areas:** ${spec.influenceAreas.join(
        ', ',
      )}\n\n**Blind spots:** ${spec.blindSpots}`,
      detected_at: timeline.iso(detectedAt),
      created_at: timeline.iso(detectedAt),
      updated_at: timeline.iso(detectedAt),
    })
    records.push({ id, slug: spec.slug, scope: spec.scope })
  }
  return { rows, records }
}

// ─── G. customer_avatars ────────────────────────────────────────────────────

function pickAvatarBeliefIds(
  avatar: AvatarNarrative,
  beliefRecords: readonly BeliefRecord[],
): string[] {
  // Heuristic: match by client slug appearing in the spec's filterTags.
  const clientSlugs = new Set(
    avatar.memberContactSlugs
      .map((s) => {
        // From CONTACTS we can map contactSlug → clientSlug.
        const persona = CONTACTS.find((c) => c.slug === s)
        return persona?.clientSlug
      })
      .filter((x): x is string => Boolean(x)),
  )
  const matching = beliefRecords
    .filter((b) => b.scope === 'customer')
    .filter((b) => b.tags.some((t) => clientSlugs.has(t)))
  const want = Math.min(3, Math.max(1, matching.length === 0 ? 1 : matching.length))
  if (matching.length === 0) {
    // Fallback: cross-vertical beliefs (no client slug).
    const cross = beliefRecords.filter(
      (b) =>
        b.scope === 'customer' &&
        !b.tags.some((t) => ['acme', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'].includes(t)),
    )
    return pickN(cross, want, `avatar-beliefs:${avatar.slug}`).map((b) => b.id)
  }
  return pickN(matching, want, `avatar-beliefs:${avatar.slug}`).map((b) => b.id)
}

function pickAvatarPerspectiveIds(
  avatar: AvatarNarrative,
  perspectiveRecords: readonly PerspectiveRecord[],
): string[] {
  // Heuristic: slug-name overlap with avatar slug.
  const tokens = avatar.slug.split('-')
  const matching = perspectiveRecords.filter((p) => {
    if (p.scope !== 'customer') return false
    return tokens.some((t) => p.slug.includes(t))
  })
  const pool =
    matching.length > 0 ? matching : perspectiveRecords.filter((p) => p.scope === 'customer')
  const want = Math.min(2, pool.length)
  return pickN(pool, want, `avatar-persp:${avatar.slug}`).map((p) => p.id)
}

function buildCustomerAvatars(
  ctx: PhaseContext,
  resolved: ResolvedState,
  beliefRecords: readonly BeliefRecord[],
  perspectiveRecords: readonly PerspectiveRecord[],
): { rows: Array<Record<string, unknown>>; idsBySlug: Record<string, string> } {
  const { ids, timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  const idsBySlug: Record<string, string> = {}

  for (const avatar of CUSTOMER_AVATARS) {
    const avatarId = ids.id('customer-avatar', resolved.orgId, avatar.slug)
    idsBySlug[avatar.slug] = avatarId

    const memberContactIds = avatar.memberContactSlugs.map((slug) => {
      const cid = resolved.contactIds[slug]
      if (!cid) {
        throw new Error(
          `${PHASE_ID}: customer avatar "${avatar.slug}" memberContactSlug "${slug}" did not resolve to a contact id. Fix the avatar in content/customer-brain.ts or rerun --phase=03a-anchors.`,
        )
      }
      return cid
    })
    const dominantBeliefIds = pickAvatarBeliefIds(avatar, beliefRecords)
    const dominantPerspectiveIds = pickAvatarPerspectiveIds(avatar, perspectiveRecords)

    const emergedAtIso = timeline.iso(avatar.emergedAt)
    const strength = clamp01(0.5 + avatar.memberContactSlugs.length * 0.12)
    const confidence = clamp01(0.6 + avatar.dominantPainPoints.length * 0.05)

    rows.push({
      id: avatarId,
      brain_id: resolved.customerBrainId,
      name: avatar.name,
      summary: avatar.summary,
      narrative_md: avatar.narrativeMd,
      status: avatar.status,
      strength,
      confidence,
      member_contact_ids: memberContactIds,
      member_strength: Object.fromEntries(
        memberContactIds.map((id) => [id, clamp01(0.6 + seededRandom(`mc:${id}`) * 0.35)]),
      ),
      dominant_perspective_ids: dominantPerspectiveIds,
      dominant_belief_ids: dominantBeliefIds,
      dominant_pain_points: avatar.dominantPainPoints,
      emotional_signature: avatar.emotionalSignature,
      blind_spots: avatar.blindSpots,
      discriminator_profile: avatar.discriminatorProfile,
      offer_ids: [],
      contrast_profile: {},
      needs_profile: {},
      discriminator_questions: [],
      drift_metrics: {},
      lineage: { seeded_by: PHASE_ID, source: 'CUSTOMER_AVATARS' },
      evidence_distribution: {
        belief_count: dominantBeliefIds.length,
        perspective_count: dominantPerspectiveIds.length,
        member_count: memberContactIds.length,
      },
      created_at: emergedAtIso,
      updated_at: emergedAtIso,
    })
  }
  return { rows, idsBySlug }
}

// ─── H. ns_narrative_links ──────────────────────────────────────────────────

const NARRATIVE_LINK_TYPES = ['related', 'elaborates', 'prerequisite', 'antecedent'] as const

function pickLinkType(seed: string): (typeof NARRATIVE_LINK_TYPES)[number] {
  const r = seededRandom(seed)
  return NARRATIVE_LINK_TYPES[Math.floor(r * NARRATIVE_LINK_TYPES.length)]!
}

interface NarrativePageHandle {
  id: string
  brain: string
  slug: string
  tags: string[]
  sourceSlugs: string[]
  synthesizedAt: Date
}

function buildNarrativeLinks(
  ctx: PhaseContext,
  pages: readonly NarrativePageHandle[],
  cap: number,
): Array<Record<string, unknown>> {
  const { ids, timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  const dedupe = new Set<string>()

  // Group by brain — links are within-brain.
  const byBrain = new Map<string, NarrativePageHandle[]>()
  for (const p of pages) {
    const list = byBrain.get(p.brain) ?? []
    list.push(p)
    byBrain.set(p.brain, list)
  }

  // Score all candidate links within each brain, then take the top `cap` overall.
  const candidates: Array<{
    from: NarrativePageHandle
    to: NarrativePageHandle
    score: number
    key: string
  }> = []
  for (const [, list] of byBrain) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!
        const b = list[j]!
        const tagScore = tagOverlapCount(a.tags, b.tags)
        const refScore = tagOverlapCount(a.sourceSlugs, b.sourceSlugs)
        const score = tagScore * 2 + refScore
        if (score === 0) continue
        const key = `${a.id}:${b.id}`
        if (dedupe.has(key)) continue
        candidates.push({ from: a, to: b, score, key })
      }
    }
  }
  candidates.sort(
    (x, y) => y.score - x.score || seededRandom(`link:${x.key}`) - seededRandom(`link:${y.key}`),
  )

  for (const cand of candidates) {
    if (rows.length >= cap) break
    if (dedupe.has(cand.key)) continue
    dedupe.add(cand.key)
    const linkType = pickLinkType(`link-type:${cand.key}`)
    const createdAt =
      cand.from.synthesizedAt.getTime() > cand.to.synthesizedAt.getTime()
        ? cand.from.synthesizedAt
        : cand.to.synthesizedAt
    rows.push({
      id: ids.id('narrative-link', cand.from.slug, cand.to.slug),
      from_page_id: cand.from.id,
      to_page_id: cand.to.id,
      link_type: linkType,
      created_at: timeline.iso(createdAt),
    })
  }

  return rows
}

// ─── I. ns_memory_sessions ──────────────────────────────────────────────────

interface BrainSessionPlan {
  brainScope: string
  brainId: string
  startDaysAgo: number
  endDaysAgo: number
  sessionCount: number
}

function buildMemorySessions(
  ctx: PhaseContext,
  plans: readonly BrainSessionPlan[],
): Array<Record<string, unknown>> {
  const { timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  for (const plan of plans) {
    const window = plan.startDaysAgo - plan.endDaysAgo
    for (let i = 0; i < plan.sessionCount; i++) {
      const daysAgo = Math.max(
        plan.endDaysAgo,
        plan.startDaysAgo - Math.floor((i / plan.sessionCount) * window),
      )
      const hour = 9 + Math.floor(seededRandom(`mem-session:${plan.brainScope}:${i}:h`) * 9)
      const minute = Math.floor(seededRandom(`mem-session:${plan.brainScope}:${i}:m`) * 60)
      const at = timeline.dayOffset(daysAgo, hour, minute)
      const memoriesCreated =
        2 + Math.floor(seededRandom(`mem-session:${plan.brainScope}:${i}:c`) * 7) // 2..8
      rows.push({
        session_key: `autogen-${plan.brainScope}-d${daysAgo}-i${i}`,
        brain_id: plan.brainId,
        memories_created: memoriesCreated,
        last_processed_at: timeline.iso(at),
        skipped_reason: null,
        created_at: timeline.iso(at),
      })
    }
  }
  return rows
}

// ─── J. ns_sk_evolution ─────────────────────────────────────────────────────

function buildSkEvolution(
  ctx: PhaseContext,
  entries: readonly SkEntryAnchor[],
  fraction: number,
): Array<Record<string, unknown>> {
  const { ids, timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  const targetCount = Math.round(entries.length * fraction)
  // Pick deterministic subset.
  const picked = pickN(entries, targetCount, 'sk-evolution-picks')
  for (let i = 0; i < picked.length; i++) {
    const entry = picked[i]!
    const entryId = ids.id('sk-entry', entry.slug)
    const daysAgo = Math.max(2, 80 - i * 2)
    const at = timeline.dayOffset(daysAgo, 14, 30)
    const prevContent = trimTo(entry.content, 280)
    const newContent = `${trimTo(entry.content, 240)} (refined: clarified the trigger condition and trimmed the qualifier "${entry.entryType}".)`
    rows.push({
      id: ids.id('sk-evolution', entry.slug),
      entry_id: entryId,
      event_type: 'content_refined',
      previous_content: prevContent,
      new_content: newContent,
      reason: `${entry.agentSlug} re-read this in the weekly SK review and tightened the framing after a mission cited it.`,
      source_id: null,
      mastery_delta: 0.05,
      created_at: timeline.iso(at),
    })
  }
  return rows
}

// ─── K. ns_sk_gaps ──────────────────────────────────────────────────────────

interface SkGapSpec {
  agentSlug: (typeof DEEP_AGENT_SLUGS)[number]
  domain: string
  description: string
  detectedFrom: string
  status: 'filled' | 'open'
  filledBySourceSlug?: string
}

const SK_GAP_SPECS: readonly SkGapSpec[] = [
  // Maya — 5 gaps (4 filled, 1 open)
  {
    agentSlug: 'maya',
    domain: 'brand',
    description: 'Maya needs more depth on rebrand sequencing for engineer-led infra.',
    detectedFrom: 'mission-retro:plinthworks-rebrand',
    status: 'filled',
    filledBySourceSlug: 'src-maya-brand-gap',
  },
  {
    agentSlug: 'maya',
    domain: 'brand',
    description: 'Maya needs more depth on voice integrity under cohort-fill pressure.',
    detectedFrom: 'lint-pass:voice-doc-v3',
    status: 'filled',
    filledBySourceSlug: 'src-maya-storybrand',
  },
  {
    agentSlug: 'maya',
    domain: 'brand',
    description: 'Maya needs more depth on category-language drift in healthtech.',
    detectedFrom: 'mission-retro:cloverkin-voice',
    status: 'filled',
    filledBySourceSlug: 'src-maya-zag',
  },
  {
    agentSlug: 'maya',
    domain: 'brand',
    description: 'Maya needs more depth on naming the no-words list as a brand artifact.',
    detectedFrom: 'pattern-analysis:no-words-vocab',
    status: 'filled',
    filledBySourceSlug: 'src-maya-immutable-laws',
  },
  {
    agentSlug: 'maya',
    domain: 'brand',
    description:
      'Maya needs more depth on how to defend a positioning that the secondary stakeholder is undermining.',
    detectedFrom: 'channel-thread:throughput-account',
    status: 'open',
  },
  // Leo — 4 gaps (3 filled, 1 open)
  {
    agentSlug: 'leo',
    domain: 'growth',
    description:
      'Leo needs more depth on paid kill criteria for low-volume B2B services audiences.',
    detectedFrom: 'mission-retro:throughput-paid',
    status: 'filled',
    filledBySourceSlug: 'src-leo-traction',
  },
  {
    agentSlug: 'leo',
    domain: 'growth',
    description: 'Leo needs more depth on creator-led DTC paid social cohort analysis.',
    detectedFrom: 'lint-pass:saltline-paid-q4',
    status: 'filled',
    filledBySourceSlug: 'src-leo-andrew-chen-shitty-ctr',
  },
  {
    agentSlug: 'leo',
    domain: 'growth',
    description: 'Leo needs more depth on lifecycle-as-paid-substitute in healthtech.',
    detectedFrom: 'pattern-analysis:cloverkin-no-paid',
    status: 'filled',
    filledBySourceSlug: 'src-leo-reforge-paid',
  },
  {
    agentSlug: 'leo',
    domain: 'growth',
    description: 'Leo needs more depth on when an organic kill criterion overrides a paid retest.',
    detectedFrom: 'channel-thread:plinthworks-growth',
    status: 'open',
  },
  // Sara — 5 gaps (4 filled, 1 open)
  {
    agentSlug: 'sara',
    domain: 'copy',
    description: 'Sara needs more depth on writing lifecycle copy for clinician-founder voice.',
    detectedFrom: 'mission-retro:cloverkin-welcome',
    status: 'filled',
    filledBySourceSlug: 'src-sara-copywriting-secrets',
  },
  {
    agentSlug: 'sara',
    domain: 'copy',
    description: 'Sara needs more depth on Saltline kitchen-rhythm copy register.',
    detectedFrom: 'lint-pass:saltline-emails',
    status: 'filled',
    filledBySourceSlug: 'src-sara-everybody-writes',
  },
  {
    agentSlug: 'sara',
    domain: 'copy',
    description:
      'Sara needs more depth on CFO-targeted brand copy that survives a Bloomberg headline cycle.',
    detectedFrom: 'mission-retro:helmsmark-hero',
    status: 'filled',
    filledBySourceSlug: 'src-sara-ogilvy',
  },
  {
    agentSlug: 'sara',
    domain: 'copy',
    description: 'Sara needs more depth on adult-cohort course-page voice without urgency tactics.',
    detectedFrom: 'pattern-analysis:almanac-no-urgency',
    status: 'filled',
    filledBySourceSlug: 'src-sara-copy-hackers-voc',
  },
  {
    agentSlug: 'sara',
    domain: 'copy',
    description: 'Sara needs more depth on writing across all six client voices without bleed.',
    detectedFrom: 'lint-pass:cross-client-voice-drift',
    status: 'open',
  },
  // Devon — 4 gaps (3 filled, 1 open)
  {
    agentSlug: 'devon',
    domain: 'web',
    description: 'Devon needs more depth on Vercel ISR with downstream Next.js 15 caching changes.',
    detectedFrom: 'mission-retro:helmsmark-site',
    status: 'filled',
    filledBySourceSlug: 'src-devon-nextjs-docs',
  },
  {
    agentSlug: 'devon',
    domain: 'web',
    description: 'Devon needs more depth on suspense streaming when LCP is gated by data fetches.',
    detectedFrom: 'lint-pass:throughput-homepage',
    status: 'filled',
    filledBySourceSlug: 'src-devon-vercel-edge',
  },
  {
    agentSlug: 'devon',
    domain: 'web',
    description: 'Devon needs more depth on edge-vs-regional runtime trade-offs for fintech.',
    detectedFrom: 'pattern-analysis:edge-vs-regional',
    status: 'filled',
    filledBySourceSlug: 'src-devon-webdev-cwv',
  },
  {
    agentSlug: 'devon',
    domain: 'web',
    description: 'Devon needs more depth on partial prerendering rollout for content-heavy sites.',
    detectedFrom: 'channel-thread:helmsmark-launch',
    status: 'open',
  },
  // Casey — 4 gaps (4 filled, 0 open)
  {
    agentSlug: 'casey',
    domain: 'design',
    description: 'Casey needs more depth on photographing real-kitchen DTC product hero shots.',
    detectedFrom: 'mission-retro:saltline-photography',
    status: 'filled',
    filledBySourceSlug: 'src-casey-refactoring-ui',
  },
  {
    agentSlug: 'casey',
    domain: 'design',
    description: 'Casey needs more depth on after-hours emergency-pill accent palettes.',
    detectedFrom: 'mission-retro:cloverkin-system',
    status: 'filled',
    filledBySourceSlug: 'src-casey-thinking-with-type',
  },
  {
    agentSlug: 'casey',
    domain: 'design',
    description:
      'Casey needs more depth on cohort-program identity that avoids faculty-institutional cues.',
    detectedFrom: 'mission-retro:almanac-mentors',
    status: 'filled',
    filledBySourceSlug: 'src-casey-shape-of-design',
  },
  {
    agentSlug: 'casey',
    domain: 'design',
    description:
      'Casey needs more depth on documenting design system handoffs to engineering for Plinthworks-scale.',
    detectedFrom: 'pattern-analysis:plinthworks-system',
    status: 'filled',
    filledBySourceSlug: 'src-casey-design-systems-handbook',
  },
]

function buildSkGaps(
  ctx: PhaseContext,
  resolved: ResolvedState,
  knownSourceSlugs: Set<string>,
): Array<Record<string, unknown>> {
  const { ids, timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  for (let i = 0; i < SK_GAP_SPECS.length; i++) {
    const spec = SK_GAP_SPECS[i]!
    const brainId = resolved.agentBrainIds[spec.agentSlug]
    if (!brainId) {
      throw new Error(
        `${PHASE_ID}: sk_gap spec ${i} references agentSlug "${spec.agentSlug}" but state.agentBrainIds["${spec.agentSlug}"] is missing. Check the deep agent hire list.`,
      )
    }
    let filledBy: string | null = null
    if (spec.status === 'filled') {
      const sourceSlug = spec.filledBySourceSlug ?? null
      if (!sourceSlug) {
        throw new Error(
          `${PHASE_ID}: sk_gap spec ${i} has status='filled' but no filledBySourceSlug.`,
        )
      }
      if (!knownSourceSlugs.has(sourceSlug)) {
        // Soft-fail: warn but allow — some demo source slugs may be placeholders.
        // Throw with context per task requirement to fail loudly on bad refs.
        throw new Error(
          `${PHASE_ID}: sk_gap spec ${i} filledBySourceSlug "${sourceSlug}" does not match any AGENT_SK_SOURCES.slug. Fix the SK_GAP_SPECS entry.`,
        )
      }
      filledBy = ids.id('sk-source', sourceSlug)
    }
    const detectedAtDaysAgo = Math.max(3, 75 - i * 3)
    const detectedAt = timeline.dayOffset(detectedAtDaysAgo, 11, 0)
    const resolvedAt =
      spec.status === 'filled'
        ? timeline.iso(timeline.dayOffset(Math.max(2, detectedAtDaysAgo - 5), 16, 0))
        : null
    rows.push({
      id: ids.id('sk-gap', spec.agentSlug, String(i)),
      brain_id: brainId,
      domain: spec.domain,
      description: spec.description,
      detected_from: spec.detectedFrom,
      severity: spec.status === 'open' ? 'critical' : 'important',
      suggested_sources: [],
      status: spec.status,
      filled_by: filledBy,
      created_at: timeline.iso(detectedAt),
      resolved_at: resolvedAt,
    })
  }
  return rows
}

// ─── L. ns_brain_log ────────────────────────────────────────────────────────

const BRAIN_LOG_EVENT_TYPES = [
  'library_sync',
  'pattern_analysis',
  'lint',
  'capture_session',
  'manual_edit',
  'snapshot_created',
] as const

interface BrainLogPlan {
  brainScope: string
  brainId: string
  startDaysAgo: number
  endDaysAgo: number
  eventCount: number
  /** Pool of narrative page slugs that belong to this brain. */
  pageSlugs: string[]
}

function buildBrainLog(
  ctx: PhaseContext,
  plans: readonly BrainLogPlan[],
): Array<Record<string, unknown>> {
  const { ids, timeline } = ctx
  const rows: Array<Record<string, unknown>> = []
  for (const plan of plans) {
    const window = plan.startDaysAgo - plan.endDaysAgo
    for (let i = 0; i < plan.eventCount; i++) {
      const daysAgo = Math.max(
        plan.endDaysAgo,
        plan.startDaysAgo - Math.floor((i / Math.max(plan.eventCount, 1)) * window),
      )
      const hour = 8 + Math.floor(seededRandom(`brain-log:${plan.brainScope}:${i}:h`) * 11)
      const minute = Math.floor(seededRandom(`brain-log:${plan.brainScope}:${i}:m`) * 60)
      const eventType =
        BRAIN_LOG_EVENT_TYPES[
          Math.floor(
            seededRandom(`brain-log-type:${plan.brainScope}:${i}`) * BRAIN_LOG_EVENT_TYPES.length,
          )
        ]!
      const affectedSlugs =
        plan.pageSlugs.length > 0
          ? pickN(
              plan.pageSlugs,
              Math.min(3, plan.pageSlugs.length),
              `brain-log-pages:${plan.brainScope}:${i}`,
            )
          : []
      const at = timeline.dayOffset(daysAgo, hour, minute)
      rows.push({
        id: ids.id('brain-log-p3b1', plan.brainScope, eventType, String(i)),
        brain_id: plan.brainId,
        event_type: eventType,
        summary: summaryForEvent(eventType, plan.brainScope, i),
        affected_pages: affectedSlugs,
        source_ref: { kind: 'auto', scope: plan.brainScope, idx: i },
        metadata: { phase: PHASE_ID, scope: plan.brainScope },
        created_at: timeline.iso(at),
      })
    }
  }
  return rows
}

function summaryForEvent(
  eventType: (typeof BRAIN_LOG_EVENT_TYPES)[number],
  brainScope: string,
  idx: number,
): string {
  switch (eventType) {
    case 'library_sync':
      return `Library sync pushed updated pages for ${brainScope} (batch ${idx + 1}).`
    case 'pattern_analysis':
      return `Pattern analysis pass examined ${brainScope} memories and re-scored emerging beliefs (run ${idx + 1}).`
    case 'lint':
      return `Lint run flagged tone / no-words drift in ${brainScope} narrative pages (lint ${idx + 1}).`
    case 'capture_session':
      return `Capture session ingested new ${brainScope}-brain memories from the day's threads (session ${idx + 1}).`
    case 'manual_edit':
      return `Manual edit cleaned a narrative page in the ${brainScope} brain (edit ${idx + 1}).`
    case 'snapshot_created':
      return `Snapshot created in ${brainScope} brain from a freshly clustered memory group (snap ${idx + 1}).`
    default: {
      const _exhaustive: never = eventType
      throw new Error(`${PHASE_ID}: unhandled event_type "${String(_exhaustive)}"`)
    }
  }
}

// ─── Phase handler ──────────────────────────────────────────────────────────

export const runP03b1PreArtifacts: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  const { log, state, ids, dryRun } = ctx
  log.step('P3b1 — pre-artifact derivation')

  if (ctx.reset) {
    log.step(
      'Reset mode: P01 cascaded teardown of org → all P3b1 rows are gone with it; proceeding.',
    )
  }

  populateDryRunStateIfEmpty(ctx)
  const resolved = resolveState(state)

  // ─── A. Ambient memories ──────────────────────────────────────────────
  const userAmbient = buildAmbientMemories(ctx, resolved, USER_BRAIN_MEMORIES, 'user')
  const customerAmbient = buildAmbientMemories(ctx, resolved, CUSTOMER_BRAIN_MEMORIES, 'customer')
  const ambientRows = [...userAmbient.rows, ...customerAmbient.rows]

  // ─── B. Derived snapshots ─────────────────────────────────────────────
  // We derive ~70 additional snapshots from semantic clusters. We don't
  // hard-exclude tag pairs already covered by anchor snapshots — the derived
  // snapshots are additive, marked auto_generated, and cluster across different
  // memory subsets than the originals.
  const userClusters = pickClusters(
    USER_BRAIN_MEMORIES,
    'user',
    resolved.defaultUserBrainId,
    new Set<string>(),
    45,
  )
  const customerClusters = pickClusters(
    CUSTOMER_BRAIN_MEMORIES,
    'customer',
    resolved.customerBrainId,
    new Set<string>(),
    25,
  )

  const derivedSnapshotRows: Array<Record<string, unknown>> = []
  const allSnapshotRecords: SnapshotRecord[] = []

  // Anchor snapshots become snapshot records too (so edges can target them).
  for (const anchor of USER_BRAIN_SNAPSHOTS) {
    allSnapshotRecords.push({
      id: ids.id('snapshot', 'user', anchor.slug),
      brainId: resolved.defaultUserBrainId,
      brainScope: 'user',
      tags: anchor.tags.slice(),
      createdAt: anchor.crystallizedAt,
      slug: anchor.slug,
      auto: false,
    })
  }

  for (const cluster of [...userClusters, ...customerClusters]) {
    const { row, record } = buildDerivedSnapshotRow(ctx, cluster, userAmbient.ambientIdsBySlug)
    derivedSnapshotRows.push(row)
    allSnapshotRecords.push(record)
  }

  // ─── C. ns_snapshot_edges ─────────────────────────────────────────────
  const snapshotEdgeRows = buildSnapshotEdges(ctx, allSnapshotRecords)

  // ─── D. ns_memory_connections ─────────────────────────────────────────
  const anchorHandles: AnchorMemoryHandle[] = [
    ...USER_BRAIN_MEMORIES.map<AnchorMemoryHandle>((m) => ({
      slug: m.slug,
      id: ids.id('memory', 'user', m.slug),
      tags: m.tags.slice(),
      brainScope: 'user' as const,
      capturedAt: m.capturedAt,
    })),
    ...CUSTOMER_BRAIN_MEMORIES.map<AnchorMemoryHandle>((m) => ({
      slug: m.slug,
      id: ids.id('memory', 'customer', m.slug),
      tags: m.tags.slice(),
      brainScope: 'customer' as const,
      capturedAt: m.capturedAt,
    })),
  ]
  const memoryConnectionRows = buildMemoryConnections(ctx, anchorHandles)

  // ─── E. ns_belief_patterns ────────────────────────────────────────────
  const userBeliefs = buildBeliefPatterns(ctx, resolved, USER_BELIEF_SPECS, USER_BRAIN_MEMORIES, 70)
  const customerBeliefs = buildBeliefPatterns(
    ctx,
    resolved,
    CUSTOMER_BELIEF_SPECS,
    CUSTOMER_BRAIN_MEMORIES,
    60,
  )
  const beliefRows = [...userBeliefs.rows, ...customerBeliefs.rows]
  const allBeliefRecords = [...userBeliefs.records, ...customerBeliefs.records]

  // ─── F. ns_perspectives ───────────────────────────────────────────────
  const userPerspectives = buildPerspectives(
    ctx,
    resolved,
    USER_PERSPECTIVE_SPECS,
    userBeliefs.records,
    65,
  )
  const customerPerspectives = buildPerspectives(
    ctx,
    resolved,
    CUSTOMER_PERSPECTIVE_SPECS,
    customerBeliefs.records,
    55,
  )
  const perspectiveRows = [...userPerspectives.rows, ...customerPerspectives.rows]
  const allPerspectiveRecords = [...userPerspectives.records, ...customerPerspectives.records]

  // ─── G. customer_avatars ──────────────────────────────────────────────
  const avatars = buildCustomerAvatars(ctx, resolved, allBeliefRecords, allPerspectiveRecords)
  state.customerAvatarIds = avatars.idsBySlug

  // ─── H. ns_narrative_links ────────────────────────────────────────────
  const narrativePageHandles: NarrativePageHandle[] = NARRATIVE_PAGES.map(
    (p: NarrativePageAnchor): NarrativePageHandle => ({
      id: ids.id('narrative-page', p.brain, p.slug),
      brain: p.brain,
      slug: p.slug,
      tags: p.tags.slice(),
      sourceSlugs: p.sourceSlugs.slice(),
      synthesizedAt: p.synthesizedAt,
    }),
  )
  const narrativeLinkRows = buildNarrativeLinks(ctx, narrativePageHandles, 80)

  // ─── I. ns_memory_sessions ────────────────────────────────────────────
  const sessionPlans: BrainSessionPlan[] = [
    {
      brainScope: 'user-founder',
      brainId: resolved.defaultUserBrainId,
      startDaysAgo: 88,
      endDaysAgo: 2,
      sessionCount: 70,
    },
    {
      brainScope: 'customer',
      brainId: resolved.customerBrainId,
      startDaysAgo: 60,
      endDaysAgo: 2,
      sessionCount: 25,
    },
  ]
  const memorySessionRows = buildMemorySessions(ctx, sessionPlans)

  // ─── J. ns_sk_evolution ───────────────────────────────────────────────
  // ~33% of sk entries → ~50 rows.
  const skEvolutionFraction = 0.33
  const skEvolutionRows = buildSkEvolution(ctx, AGENT_SK_ENTRIES, skEvolutionFraction)

  // ─── K. ns_sk_gaps ────────────────────────────────────────────────────
  const knownSourceSlugs = new Set(AGENT_SK_SOURCES.map((s) => s.slug))
  const skGapRows = buildSkGaps(ctx, resolved, knownSourceSlugs)

  // ─── L. ns_brain_log ──────────────────────────────────────────────────
  // Group narrative page slugs by brain so events reference real pages.
  const pageSlugsByBrain = new Map<string, string[]>()
  for (const p of NARRATIVE_PAGES) {
    const list = pageSlugsByBrain.get(p.brain) ?? []
    list.push(p.slug)
    pageSlugsByBrain.set(p.brain, list)
  }
  const brainLogPlans: BrainLogPlan[] = [
    {
      brainScope: 'user-founder',
      brainId: resolved.defaultUserBrainId,
      startDaysAgo: 89,
      endDaysAgo: 1,
      eventCount: 220,
      pageSlugs: pageSlugsByBrain.get('user') ?? [],
    },
    {
      brainScope: 'customer',
      brainId: resolved.customerBrainId,
      startDaysAgo: 60,
      endDaysAgo: 1,
      eventCount: 80,
      pageSlugs: pageSlugsByBrain.get('customer') ?? [],
    },
  ]
  for (const slug of DEEP_AGENT_SLUGS) {
    const brainId = resolved.agentBrainIds[slug]
    if (!brainId) {
      throw new Error(
        `${PHASE_ID}: cannot build brain log for agent "${slug}" — state.agentBrainIds["${slug}"] missing.`,
      )
    }
    brainLogPlans.push({
      brainScope: `agent-${slug}`,
      brainId,
      startDaysAgo: 78,
      endDaysAgo: 1,
      eventCount: 35,
      pageSlugs: pageSlugsByBrain.get(slug) ?? [],
    })
  }
  const brainLogRows = buildBrainLog(ctx, brainLogPlans)

  // ─── Reporting / dispatch ─────────────────────────────────────────────
  const rowCounts: Record<string, number> = {
    'ns_memories (ambient)': ambientRows.length,
    'ns_snapshots (derived)': derivedSnapshotRows.length,
    ns_snapshot_edges: snapshotEdgeRows.length,
    ns_memory_connections: memoryConnectionRows.length,
    ns_belief_patterns: beliefRows.length,
    ns_perspectives: perspectiveRows.length,
    customer_avatars: avatars.rows.length,
    ns_narrative_links: narrativeLinkRows.length,
    ns_memory_sessions: memorySessionRows.length,
    ns_sk_evolution: skEvolutionRows.length,
    ns_sk_gaps: skGapRows.length,
    ns_brain_log: brainLogRows.length,
  }

  if (dryRun) {
    log.step(
      `[dry-run] state.customerAvatarIds populated with ${
        Object.keys(avatars.idsBySlug).length
      } slugs for P7.5c.`,
    )
    for (const [table, count] of Object.entries(rowCounts)) {
      log.rowCount(table, count)
    }
    return r.finish({})
  }

  log.step(`Upserting ns_memories (ambient, ${ambientRows.length})`)
  await batchUpsert(ctx, 'ns_memories', ambientRows, 'id')

  log.step(`Upserting ns_snapshots (derived, ${derivedSnapshotRows.length})`)
  await batchUpsert(ctx, 'ns_snapshots', derivedSnapshotRows, 'id')

  log.step(`Upserting ns_snapshot_edges (${snapshotEdgeRows.length})`)
  await batchUpsert(ctx, 'ns_snapshot_edges', snapshotEdgeRows, 'id')

  log.step(`Upserting ns_memory_connections (${memoryConnectionRows.length})`)
  await batchUpsert(ctx, 'ns_memory_connections', memoryConnectionRows, 'id')

  log.step(`Upserting ns_belief_patterns (${beliefRows.length})`)
  await batchUpsert(ctx, 'ns_belief_patterns', beliefRows, 'id')

  log.step(`Upserting ns_perspectives (${perspectiveRows.length})`)
  await batchUpsert(ctx, 'ns_perspectives', perspectiveRows, 'id')

  log.step(`Upserting customer_avatars (${avatars.rows.length})`)
  await batchUpsert(ctx, 'customer_avatars', avatars.rows, 'id')

  log.step(`Upserting ns_narrative_links (${narrativeLinkRows.length})`)
  await batchUpsert(ctx, 'ns_narrative_links', narrativeLinkRows, 'id')

  log.step(`Upserting ns_memory_sessions (${memorySessionRows.length})`)
  await batchUpsert(ctx, 'ns_memory_sessions', memorySessionRows, 'session_key')

  log.step(`Upserting ns_sk_evolution (${skEvolutionRows.length})`)
  await batchUpsert(ctx, 'ns_sk_evolution', skEvolutionRows, 'id')

  log.step(`Upserting ns_sk_gaps (${skGapRows.length})`)
  await batchUpsert(ctx, 'ns_sk_gaps', skGapRows, 'id')

  log.step(`Upserting ns_brain_log (${brainLogRows.length})`)
  await batchUpsert(ctx, 'ns_brain_log', brainLogRows, 'id')

  return r.finish(rowCounts)
}
