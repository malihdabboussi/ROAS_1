/**
 * P3a — Anchor INSERTs.
 *
 * Hand-written content from `content/*` is inserted with timeline-backed
 * timestamps:
 *
 *   A. ~18 contacts                    (CONTACTS → public.contacts)
 *   B. ~130 user-brain ns_memories     (USER_BRAIN_MEMORIES)
 *   C. ~40  user-brain ns_snapshots    (USER_BRAIN_SNAPSHOTS, source_id → memory)
 *   D. ~85  customer-brain ns_memories (CUSTOMER_BRAIN_MEMORIES, contact_id resolved)
 *   E. ~20  company_cortex_objects     (COMPANY_CORTEX_OBJECTS)
 *   F. ~60  ns_sk_sources + ~150 ns_sk_entries (AGENT_SK_SOURCES + ENTRIES)
 *   G. ~106 ns_narrative_pages         (NARRATIVE_PAGES)
 *   H. ~28  ns_brain_log seed events   (5/4/4/3-per-agent backdated milestones)
 *
 * Cross-reference invariants are enforced loudly: a snapshot whose
 * `sourceMemorySlug` does not resolve, a customer memory without a
 * resolvable `contactSlug`, an SK entry whose `sourceSlug`/`agentSlug`
 * does not resolve, or a narrative page whose `brain` is unknown will
 * throw with full context — connectivity invariants are enforced at the
 * source, not at verify time.
 *
 * State populated for downstream phases:
 *   - state.contactIds: Record<contactSlug, contactId>
 *
 * Embeddings (ns_memories / ns_snapshots / ns_sk_entries / ns_narrative_pages)
 * are left NULL — Wave 4c P3b1 backfills them.
 */
import { createHash } from 'node:crypto'
import { AGENT_SK_ENTRIES, AGENT_SK_SOURCES } from '../content/agent-brains'
import { COMPANY_CORTEX_OBJECTS } from '../content/company-brain'
import { CONTACTS, CUSTOMER_BRAIN_MEMORIES } from '../content/customer-brain'
import { NARRATIVE_PAGES } from '../content/narrative-pages'
import {
  AGENCY_FOUNDED_AT,
  COMPANY_CORTEX_ENABLED_AT,
  CORTEX_MAX_ENABLED_AT,
} from '../content/timeline'
import { USER_BRAIN_MEMORIES, USER_BRAIN_SNAPSHOTS } from '../content/user-brain'
import { startResult, type PhaseContext, type PhaseHandler, type PhaseState } from './_context'

const PHASE_ID = '03a-anchors'

const UPSERT_BATCH_SIZE = 200

const DRY_RUN_AGENT_SLUGS = ['maya', 'leo', 'sara', 'devon', 'casey'] as const

interface ResolvedState {
  orgId: string
  founderUserId: string
  defaultUserBrainId: string
  companyBrainId: string
  customerBrainId: string
  agentBrainIds: Record<string, string>
}

function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex')
}

function splitDisplayName(displayName: string): { first: string; last: string } {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0)
  const first = parts[0] ?? displayName
  const last = parts.slice(1).join(' ')
  return { first, last }
}

/**
 * In single-phase dry-run (`--dry-run --phase=03a-anchors`), state from
 * P01/P02/P04 will be empty. Synthesize the deterministic IDs they would
 * have produced so this phase can preview its inserts in isolation.
 */
function ensureDryRunBootstrap(ctx: PhaseContext): void {
  if (!ctx.dryRun) return
  const { state, ids, log } = ctx
  if (state.orgId) return // Already populated by a prior phase in this run.

  const founderUserId = ids.id('user', 'founder')
  const orgId = ids.id('org', 'foundry-creative')
  // P01 mints the founder's default user brain via ids.id('user-brain', 'founder').
  const defaultUserBrainId = ids.id('user-brain', 'founder')
  // P02 mints the org-scoped company / customer brains via ids.id('brain', scope, orgId).
  const companyBrainId = ids.id('brain', 'company', orgId)
  const customerBrainId = ids.id('brain', 'customer', orgId)
  // P04 mints per-agent brains via ids.id('ns-brain-agent', orgId, agentKey).
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

export const runP03aAnchors: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  const { log, state, ids, timeline, dryRun } = ctx

  log.step('P3a — anchor INSERTs')

  if (ctx.reset) {
    log.step(
      'Reset mode: P01 cascaded teardown of org → all P3a rows are gone with it; proceeding.',
    )
  }

  ensureDryRunBootstrap(ctx)
  const resolved = resolveState(state)

  // ─── A. Contacts (18) ──────────────────────────────────────────────────
  // public.contacts has no display_name/title/tier/company columns; we
  // store displayName/title/tier/clientSlug in `custom_fields` and use
  // first_name/last_name/business_name for the legacy CRM columns.
  const contactIds: Record<string, string> = {}
  state.contactIds = contactIds

  const contactRows: Array<Record<string, unknown>> = []
  for (const persona of CONTACTS) {
    const contactId = ids.id('contact', resolved.orgId, persona.slug)
    contactIds[persona.slug] = contactId

    const { first, last } = splitDisplayName(persona.displayName)
    const firstSeenIso = timeline.iso(persona.firstSeenAt)
    contactRows.push({
      id: contactId,
      org_id: resolved.orgId,
      user_id: resolved.founderUserId,
      email: persona.email,
      first_name: first,
      last_name: last,
      tags: ['demo', persona.clientSlug, persona.tier],
      contact_type: persona.contactType ?? 'customer',
      contact_source: 'demo-seed',
      business_name: persona.company,
      custom_fields: {
        display_name: persona.displayName,
        title: persona.title,
        tier: persona.tier,
        client_slug: persona.clientSlug,
      },
      created_at: firstSeenIso,
      updated_at: firstSeenIso,
    })
  }

  // ─── B. User-brain memories (130) ──────────────────────────────────────
  const memorySlugToId = new Map<string, string>()
  const userMemoryRows: Array<Record<string, unknown>> = []
  for (const anchor of USER_BRAIN_MEMORIES) {
    const memoryId = ids.id('memory', 'user', anchor.slug)
    memorySlugToId.set(anchor.slug, memoryId)
    const capturedAtIso = timeline.iso(anchor.capturedAt)

    userMemoryRows.push({
      id: memoryId,
      brain_id: resolved.defaultUserBrainId,
      content: anchor.content,
      content_hash: sha1(anchor.content),
      memory_type: anchor.memoryType,
      source_type: anchor.sourceType,
      source_id: null,
      source_title: anchor.sourceTitle ?? null,
      speaker: anchor.speaker ?? null,
      confidence: anchor.confidence,
      significance: anchor.significance,
      tags: anchor.tags,
      embedding: null,
      source_emotion: anchor.emotion?.label ?? null,
      emotional_valence: anchor.emotion?.valence ?? null,
      emotional_intensity: anchor.emotion?.intensity ?? null,
      created_at: capturedAtIso,
      updated_at: capturedAtIso,
    })
  }

  // ─── C. User-brain snapshots (40) ──────────────────────────────────────
  // Each snapshot must cite a real memory id via source_id.
  const userSnapshotRows: Array<Record<string, unknown>> = []
  for (const anchor of USER_BRAIN_SNAPSHOTS) {
    const sourceMemoryId = memorySlugToId.get(anchor.sourceMemorySlug)
    if (!sourceMemoryId) {
      throw new Error(
        `${PHASE_ID}: snapshot "${anchor.slug}" sourceMemorySlug "${anchor.sourceMemorySlug}" did not resolve to any USER_BRAIN_MEMORIES anchor. Connectivity invariant #1 violated — fix the content reference in scripts/seed-yc-demo/content/user-brain.ts.`,
      )
    }
    const snapshotId = ids.id('snapshot', 'user', anchor.slug)
    const crystallizedAtIso = timeline.iso(anchor.crystallizedAt)

    userSnapshotRows.push({
      id: snapshotId,
      brain_id: resolved.defaultUserBrainId,
      name: anchor.name,
      type: anchor.type,
      core: anchor.core,
      one_liner: anchor.oneLiner,
      story: anchor.story,
      moment: anchor.moment,
      method: anchor.method ?? null,
      steps: anchor.steps ?? null,
      filter: anchor.filter ?? null,
      challenge: anchor.challenge ?? null,
      break_test: anchor.breakTest ?? null,
      risks: anchor.risks ?? null,
      proof: anchor.proof ?? null,
      source_type: 'memory',
      source_id: sourceMemoryId,
      confidence: anchor.confidence,
      significance_score: anchor.significanceScore,
      tags: anchor.tags,
      embedding: null,
      created_at: crystallizedAtIso,
      updated_at: crystallizedAtIso,
    })
  }

  // ─── D. Customer-brain memories (85) ───────────────────────────────────
  // Each customer memory must cite a real contact via contact_id.
  const customerMemoryRows: Array<Record<string, unknown>> = []
  for (const anchor of CUSTOMER_BRAIN_MEMORIES) {
    if (!anchor.contactSlug) {
      throw new Error(
        `${PHASE_ID}: customer memory "${anchor.slug}" has no contactSlug — every customer-brain anchor must point to a CONTACTS persona.`,
      )
    }
    const contactId = contactIds[anchor.contactSlug]
    if (!contactId) {
      throw new Error(
        `${PHASE_ID}: customer memory "${anchor.slug}" contactSlug "${anchor.contactSlug}" did not resolve to any CONTACTS persona. Fix the content reference in scripts/seed-yc-demo/content/customer-brain.ts.`,
      )
    }

    const memoryId = ids.id('memory', 'customer', anchor.slug)
    const capturedAtIso = timeline.iso(anchor.capturedAt)

    customerMemoryRows.push({
      id: memoryId,
      brain_id: resolved.customerBrainId,
      content: anchor.content,
      content_hash: sha1(anchor.content),
      memory_type: anchor.memoryType,
      source_type: anchor.sourceType,
      source_id: null,
      source_title: anchor.sourceTitle ?? null,
      speaker: anchor.speaker ?? null,
      confidence: anchor.confidence,
      significance: anchor.significance,
      tags: anchor.tags,
      embedding: null,
      source_emotion: anchor.emotion?.label ?? null,
      emotional_valence: anchor.emotion?.valence ?? null,
      emotional_intensity: anchor.emotion?.intensity ?? null,
      contact_id: contactId,
      created_at: capturedAtIso,
      updated_at: capturedAtIso,
    })
  }

  // ─── E. Company cortex objects (20) ────────────────────────────────────
  const cortexObjectRows: Array<Record<string, unknown>> = []
  for (const anchor of COMPANY_CORTEX_OBJECTS) {
    const objectId = ids.id('cortex-object', resolved.orgId, anchor.slug)
    const formedAtIso = timeline.iso(anchor.formedAt)

    cortexObjectRows.push({
      id: objectId,
      org_id: resolved.orgId,
      brain_id: resolved.companyBrainId,
      object_type: anchor.objectType,
      title: anchor.title,
      truth: anchor.truth,
      status: anchor.status,
      confidence: anchor.confidence,
      source_signal_ids: [],
      evidence_refs: [],
      retrieval_rule: anchor.retrievalRule ?? {},
      metadata: { evidence_narrative: anchor.evidenceNarrative },
      created_at: formedAtIso,
      updated_at: formedAtIso,
    })
  }

  // ─── F. SK sources (~60) + entries (~150) ──────────────────────────────
  // Build sourceSlug → agentSlug map by scanning entries; then resolve
  // each source's agent brain id via state.agentBrainIds.
  const sourceSlugToAgentSlug = new Map<string, string>()
  const sourceEntryCounts = new Map<string, number>()
  for (const entry of AGENT_SK_ENTRIES) {
    if (!sourceSlugToAgentSlug.has(entry.sourceSlug)) {
      sourceSlugToAgentSlug.set(entry.sourceSlug, entry.agentSlug)
    }
    sourceEntryCounts.set(entry.sourceSlug, (sourceEntryCounts.get(entry.sourceSlug) ?? 0) + 1)
  }

  const sourceSlugToId = new Map<string, string>()
  const skSourceRows: Array<Record<string, unknown>> = []
  for (const anchor of AGENT_SK_SOURCES) {
    const agentSlug = sourceSlugToAgentSlug.get(anchor.slug)
    if (!agentSlug) {
      throw new Error(
        `${PHASE_ID}: SK source "${anchor.slug}" has no entries in AGENT_SK_ENTRIES — cannot derive its owning agent brain.`,
      )
    }
    const brainId = resolved.agentBrainIds[agentSlug]
    if (!brainId) {
      throw new Error(
        `${PHASE_ID}: SK source "${anchor.slug}" maps to agent slug "${agentSlug}" but state.agentBrainIds["${agentSlug}"] is missing. Run --phase=04-team first or check the deepBrain hire matrix.`,
      )
    }

    const sourceId = ids.id('sk-source', anchor.slug)
    sourceSlugToId.set(anchor.slug, sourceId)
    const ingestedAtIso = timeline.iso(anchor.ingestedAt)

    skSourceRows.push({
      id: sourceId,
      brain_id: brainId,
      source_type: anchor.sourceType,
      title: anchor.title,
      author: anchor.author ?? null,
      url: anchor.url ?? null,
      domain: anchor.domain,
      tags: [],
      status: 'ingested',
      entries_count: sourceEntryCounts.get(anchor.slug) ?? 0,
      ingested_at: ingestedAtIso,
      created_at: ingestedAtIso,
    })
  }

  const skEntryRows: Array<Record<string, unknown>> = []
  for (const anchor of AGENT_SK_ENTRIES) {
    const brainId = resolved.agentBrainIds[anchor.agentSlug]
    if (!brainId) {
      throw new Error(
        `${PHASE_ID}: SK entry "${anchor.slug}" agentSlug "${anchor.agentSlug}" does not resolve to state.agentBrainIds. Run --phase=04-team first.`,
      )
    }
    const sourceId = sourceSlugToId.get(anchor.sourceSlug)
    if (!sourceId) {
      throw new Error(
        `${PHASE_ID}: SK entry "${anchor.slug}" sourceSlug "${anchor.sourceSlug}" does not resolve to any AGENT_SK_SOURCES anchor. Fix the content reference in scripts/seed-yc-demo/content/agent-brains.ts.`,
      )
    }

    const entryId = ids.id('sk-entry', anchor.slug)
    const capturedAtIso = timeline.iso(anchor.capturedAt)

    skEntryRows.push({
      id: entryId,
      brain_id: brainId,
      source_id: sourceId,
      entry_type: anchor.entryType,
      title: anchor.title,
      content: anchor.content,
      content_hash: sha1(anchor.content),
      domain: anchor.domain,
      complexity: anchor.complexity,
      confidence: anchor.confidence,
      mastery: anchor.mastery,
      tags: anchor.tags,
      embedding: null,
      created_at: capturedAtIso,
      updated_at: capturedAtIso,
    })
  }

  // ─── G. Narrative pages (~106) ─────────────────────────────────────────
  function brainIdForNarrativeBrain(brain: string): string {
    switch (brain) {
      case 'user':
        return resolved.defaultUserBrainId
      case 'company':
        return resolved.companyBrainId
      case 'customer':
        return resolved.customerBrainId
      default: {
        const agentBrainId = resolved.agentBrainIds[brain]
        if (!agentBrainId) {
          throw new Error(
            `${PHASE_ID}: narrative page brain "${brain}" did not resolve to user/company/customer or any agent brain. Known agent brains: [${Object.keys(
              resolved.agentBrainIds,
            ).join(', ')}].`,
          )
        }
        return agentBrainId
      }
    }
  }

  const narrativePageRows: Array<Record<string, unknown>> = []
  for (const anchor of NARRATIVE_PAGES) {
    const brainId = brainIdForNarrativeBrain(anchor.brain)
    const pageId = ids.id('narrative-page', anchor.brain, anchor.slug)
    const synthesizedAtIso = timeline.iso(anchor.synthesizedAt)

    narrativePageRows.push({
      id: pageId,
      brain_id: brainId,
      slug: anchor.slug,
      title: anchor.title,
      page_type: anchor.pageType,
      content_md: anchor.contentMd,
      summary: anchor.summary,
      source_refs: anchor.sourceSlugs,
      tags: anchor.tags,
      status: 'active',
      embedding: null,
      last_synthesis_at: synthesizedAtIso,
      created_at: synthesizedAtIso,
      updated_at: synthesizedAtIso,
    })
  }

  // ─── H. ns_brain_log seed events (~3-5 per primary brain) ──────────────
  // Lightweight backdated milestones so each brain's history reads as
  // populated even before P3b1/P3b2 add the bulk events.
  const brainLogRows: Array<Record<string, unknown>> = []
  function pushBrainLog(
    brainScope: string,
    brainId: string,
    suffix: string,
    eventType: string,
    summary: string,
    at: Date,
  ): void {
    brainLogRows.push({
      id: ids.id('brain-log', brainScope, suffix),
      brain_id: brainId,
      event_type: eventType,
      summary,
      affected_pages: [],
      source_ref: null,
      metadata: { seeded: true, scope: brainScope },
      created_at: timeline.iso(at),
    })
  }

  // User brain — 5 milestones along the founding arc.
  pushBrainLog(
    'user-founder',
    resolved.defaultUserBrainId,
    'created',
    'brain_created',
    'Founder user brain created on Day 1.',
    AGENCY_FOUNDED_AT,
  )
  pushBrainLog(
    'user-founder',
    resolved.defaultUserBrainId,
    'first-anchors',
    'manual_capture',
    'Founding-week voice memos and principles ingested as anchor memories.',
    timeline.dayOffset(89, 16, 0),
  )
  pushBrainLog(
    'user-founder',
    resolved.defaultUserBrainId,
    'cortex-max-on',
    'cortex_max_enabled',
    'Cortex Max enabled on the user brain — Atlas can synthesize narrative pages now.',
    CORTEX_MAX_ENABLED_AT,
  )
  pushBrainLog(
    'user-founder',
    resolved.defaultUserBrainId,
    'first-library-sync',
    'library_sync',
    'First brain_library_sync pushed synthesized pages into agent brains.',
    timeline.dayOffset(55, 9, 0),
  )
  pushBrainLog(
    'user-founder',
    resolved.defaultUserBrainId,
    'narrative-pages-synthesized',
    'narrative_synthesis',
    'Atlas synthesized the first batch of narrative pages from anchor memories + snapshots.',
    timeline.dayOffset(54, 11, 0),
  )

  // Company brain — 4 milestones (created, cortex on, first dream, first object).
  pushBrainLog(
    'company',
    resolved.companyBrainId,
    'created',
    'brain_created',
    'Company Cortex brain provisioned for Foundry Creative.',
    AGENCY_FOUNDED_AT,
  )
  pushBrainLog(
    'company',
    resolved.companyBrainId,
    'cortex-enabled',
    'company_cortex_enabled',
    'Company Cortex daily-dream turned on (schedule = daily 02:00 UTC).',
    COMPANY_CORTEX_ENABLED_AT,
  )
  pushBrainLog(
    'company',
    resolved.companyBrainId,
    'first-dream',
    'dream_run',
    'First company-cortex daily dream produced 3 cross-client signals.',
    timeline.dayOffset(34, 2, 30),
  )
  pushBrainLog(
    'company',
    resolved.companyBrainId,
    'first-object',
    'object_crystallized',
    'First company_cortex_object crystallized: async-approvals anti-pattern.',
    timeline.dayOffset(28, 14, 0),
  )

  // Customer brain — 4 milestones (created, first contact, first pattern, first avatar).
  pushBrainLog(
    'customer',
    resolved.customerBrainId,
    'created',
    'brain_created',
    'Customer brain provisioned for Foundry Creative.',
    AGENCY_FOUNDED_AT,
  )
  pushBrainLog(
    'customer',
    resolved.customerBrainId,
    'first-contact',
    'contact_imported',
    'First Plinthworks customer contact ingested into the customer brain.',
    timeline.dayOffset(85, 14, 0),
  )
  pushBrainLog(
    'customer',
    resolved.customerBrainId,
    'first-pattern',
    'pattern_emerged',
    'First ns_belief_pattern emerged from Saltline + Cloverkin contact clusters.',
    timeline.dayOffset(45, 9, 0),
  )
  pushBrainLog(
    'customer',
    resolved.customerBrainId,
    'first-avatar',
    'avatar_synthesis',
    'First customer_avatar synthesized: boutique DTC operators.',
    timeline.dayOffset(40, 14, 0),
  )

  // Agent brains — 3 milestones each (created, first SK ingestion, first narrative pages).
  for (const [agentSlug, agentBrainId] of Object.entries(resolved.agentBrainIds)) {
    pushBrainLog(
      `agent-${agentSlug}`,
      agentBrainId,
      'created',
      'brain_created',
      `Agent brain provisioned for ${agentSlug}.`,
      timeline.dayOffset(80, 10, 0),
    )
    pushBrainLog(
      `agent-${agentSlug}`,
      agentBrainId,
      'sk-ingested',
      'sk_ingested',
      `Initial SK library ingested for ${agentSlug}.`,
      timeline.dayOffset(78, 11, 0),
    )
    pushBrainLog(
      `agent-${agentSlug}`,
      agentBrainId,
      'narrative-pages',
      'narrative_synthesis',
      `Atlas synthesized initial narrative pages for ${agentSlug}.`,
      timeline.dayOffset(60, 14, 0),
    )
  }

  // ─── Reporting / dispatch ──────────────────────────────────────────────
  const previewedRowCounts: Record<string, number> = {
    contacts: contactRows.length,
    'ns_memories (user)': userMemoryRows.length,
    'ns_memories (customer)': customerMemoryRows.length,
    ns_snapshots: userSnapshotRows.length,
    company_cortex_objects: cortexObjectRows.length,
    ns_sk_sources: skSourceRows.length,
    ns_sk_entries: skEntryRows.length,
    ns_narrative_pages: narrativePageRows.length,
    ns_brain_log: brainLogRows.length,
  }

  if (dryRun) {
    log.step(
      `[dry-run] state.contactIds populated with ${
        Object.keys(contactIds).length
      } slugs for downstream phases (P3b1, P7.5c).`,
    )
    for (const [table, count] of Object.entries(previewedRowCounts)) {
      log.rowCount(table, count)
    }
    return r.finish({})
  }

  log.step(`Upserting contacts (${contactRows.length})`)
  await batchUpsert(ctx, 'contacts', contactRows, 'id')

  log.step(`Upserting ns_memories — user (${userMemoryRows.length})`)
  await batchUpsert(ctx, 'ns_memories', userMemoryRows, 'id')

  log.step(`Upserting ns_memories — customer (${customerMemoryRows.length})`)
  await batchUpsert(ctx, 'ns_memories', customerMemoryRows, 'id')

  log.step(`Upserting ns_snapshots (${userSnapshotRows.length})`)
  await batchUpsert(ctx, 'ns_snapshots', userSnapshotRows, 'id')

  log.step(`Upserting company_cortex_objects (${cortexObjectRows.length})`)
  await batchUpsert(ctx, 'company_cortex_objects', cortexObjectRows, 'id')

  log.step(`Upserting ns_sk_sources (${skSourceRows.length})`)
  await batchUpsert(ctx, 'ns_sk_sources', skSourceRows, 'id')

  log.step(`Upserting ns_sk_entries (${skEntryRows.length})`)
  await batchUpsert(ctx, 'ns_sk_entries', skEntryRows, 'id')

  log.step(`Upserting ns_narrative_pages (${narrativePageRows.length})`)
  await batchUpsert(ctx, 'ns_narrative_pages', narrativePageRows, 'id')

  log.step(`Upserting ns_brain_log (${brainLogRows.length})`)
  await batchUpsert(ctx, 'ns_brain_log', brainLogRows, 'id')

  return r.finish({
    contacts: contactRows.length,
    ns_memories: userMemoryRows.length + customerMemoryRows.length,
    ns_snapshots: userSnapshotRows.length,
    company_cortex_objects: cortexObjectRows.length,
    ns_sk_sources: skSourceRows.length,
    ns_sk_entries: skEntryRows.length,
    ns_narrative_pages: narrativePageRows.length,
    ns_brain_log: brainLogRows.length,
  })
}
