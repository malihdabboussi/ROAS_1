/**
 * P7.5c — Brain-derived marketing avatars + mission_deliverables backfill.
 *
 * Two responsibilities:
 *
 *   1) For each of the 7 customer_avatars built in P3b1, INSERT a marketing
 *      `avatars` row whose persona_data summarizes the cluster (summary,
 *      narrative_md, pain_points, discriminator_profile, source_contact_ids,
 *      dominant beliefs / perspectives), then UPDATE the source
 *      customer_avatars.declared_avatar_id to point at the new marketing
 *      avatar — satisfying invariant #16 (customer brain = marketing brain
 *      source of truth, marketing brain = customer brain formalization).
 *
 *   2) Backfill mission_deliverables.metadata to point at the artifact rows
 *      P7.5b produced — invariant #17 (every completed mission deliverable
 *      links to a real artifact). Matching heuristic: by client
 *      (campaignSlug → clientSlug) + by deliverable_kind → artifact_table:
 *          offer            → offers
 *          campaign_plan    → funnels
 *          site             → websites (funnel_type='website')
 *          email            → sequence_emails (first email of the welcome
 *                              sequence for the matching client)
 *          sequence         → sequences
 *          presentation /
 *          case_study /
 *          proposal_kit     → presentations
 *          media_asset      → media_assets
 *      Anything else (positioning, audit_doc, copy_doc, sop, …) is left
 *      with metadata.artifact_table = null; warning count emitted at the end.
 *
 * State produced:
 *   - state.marketingAvatarIds[customerAvatarSlug] = avatars.id
 *
 * State consumed:
 *   - state.orgId, state.founderUserId, state.contactIds,
 *     state.customerAvatarIds, state.missionIds, state.artifactIds
 *
 * Dry-run bootstrap mirrors the deterministic-id formulas of P3a (contacts),
 * P3b1 (customer_avatars), P7 (missions + deliverables), and P7.5b
 * (artifacts) so the phase runs end-to-end in isolation.
 */
import type { AvatarNarrative, ContactPersona, MissionBrief } from '../content/_types'
import { CLIENTS } from '../content/clients'
import { CONTACTS, CUSTOMER_AVATARS } from '../content/customer-brain'
import { MISSIONS } from '../content/missions'
import { startResult, type PhaseContext, type PhaseHandler, type PhaseState } from './_context'

const PHASE_ID = '07_5c-avatars'

const UPDATE_BATCH_SIZE = 100

// ─── Mappings ──────────────────────────────────────────────────────────────

/** mission deliverable kind → which P7.5b artifact table best satisfies it. */
const DELIVERABLE_KIND_TO_ARTIFACT_TABLE: Readonly<Record<string, string>> = {
  offer: 'offers',
  campaign_plan: 'funnels',
  site: 'websites',
  email: 'sequence_emails',
  sequence: 'sequences',
  presentation: 'presentations',
  case_study: 'presentations',
  proposal_kit: 'presentations',
  media_asset: 'media_assets',
}

// ─── State plumbing ────────────────────────────────────────────────────────

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

/**
 * Per-client artifact slug seed used by the dry-run bootstrap to mint a
 * minimal artifactIds index matching P7.5b's deterministic-id formula. This
 * is intentionally a sparse subset — enough to drive the deliverable backfill
 * to the same warning/matched ratios that a full run would produce.
 *
 * If P7.5b's slug naming changes, this needs to track it. P12 verify catches
 * drift in real runs; this is just for `--dry-run --phase=07_5c-avatars`
 * isolation.
 */
const ARTIFACT_SLUGS_PER_CLIENT: Readonly<
  Record<
    string,
    {
      offerSlugs: readonly string[]
      funnelSlugs: readonly string[]
      sequenceSlugs: readonly string[]
      /** First email of each sequence. */
      sequenceEmailFirstSlugs: readonly string[]
      presentationSlugs: readonly string[]
      mediaSlugs: readonly string[]
      /** Always present — every client has a 'website' funnel. */
      website: true
    }
  >
> = {
  acme: {
    offerSlugs: ['offer-1', 'offer-2', 'offer-3', 'offer-4'],
    funnelSlugs: ['on-call-checklist-funnel', 'platform-strategy-call'],
    sequenceSlugs: ['webinar-reminder'],
    sequenceEmailFirstSlugs: ['webinar-reminder:email-1'],
    presentationSlugs: ['presentation-1-positioning-deck', 'presentation-2-case-study'],
    mediaSlugs: ['media-1'],
    website: true,
  },
  beta: {
    offerSlugs: ['offer-1', 'offer-2', 'offer-3', 'offer-4', 'offer-5'],
    funnelSlugs: ['pantry-drop-opt-in', 'gifting-bundle'],
    sequenceSlugs: ['pantry-club-welcome'],
    sequenceEmailFirstSlugs: ['pantry-club-welcome:email-1'],
    presentationSlugs: ['presentation-1-positioning-deck', 'presentation-2-case-study'],
    mediaSlugs: ['media-1'],
    website: true,
  },
  gamma: {
    offerSlugs: ['offer-1', 'offer-2', 'offer-3'],
    funnelSlugs: ['controller-playbook-lead', 'cfo-briefing-call'],
    sequenceSlugs: [] as string[],
    sequenceEmailFirstSlugs: [] as string[],
    presentationSlugs: [
      'presentation-1-positioning-deck',
      'presentation-2-case-study',
      'presentation-3-proposal-kit',
    ],
    mediaSlugs: ['media-1'],
    website: true,
  },
  delta: {
    offerSlugs: ['offer-1', 'offer-2', 'offer-3'],
    funnelSlugs: ['new-patient-onboarding-lead'],
    sequenceSlugs: ['new-patient-onboarding'],
    sequenceEmailFirstSlugs: ['new-patient-onboarding:email-1'],
    presentationSlugs: ['presentation-1-positioning-deck', 'presentation-2-case-study'],
    mediaSlugs: ['media-1'],
    website: true,
  },
  epsilon: {
    offerSlugs: ['offer-1', 'offer-2', 'offer-3', 'offer-4'],
    funnelSlugs: ['coo-strategy-call', 'practice-lead-loom-request'],
    sequenceSlugs: ['coo-outbound'],
    sequenceEmailFirstSlugs: ['coo-outbound:email-1'],
    presentationSlugs: [
      'presentation-1-positioning-deck',
      'presentation-2-case-study',
      'presentation-3-proposal-kit',
    ],
    mediaSlugs: ['media-1'],
    website: true,
  },
  zeta: {
    offerSlugs: ['offer-1', 'offer-2', 'offer-3', 'offer-4'],
    funnelSlugs: ['reading-list-opt-in', 'cohort-info-session'],
    sequenceSlugs: ['mentor-matching'],
    sequenceEmailFirstSlugs: ['mentor-matching:email-1'],
    presentationSlugs: [
      'presentation-1-positioning-deck',
      'presentation-2-case-study',
      'presentation-3-proposal-kit',
    ],
    mediaSlugs: ['media-1'],
    website: true,
  },
}

function bootstrapArtifactIds(ctx: PhaseContext, orgId: string): void {
  const state: PhaseState = ctx.state
  if (!state.artifactIds) state.artifactIds = {}
  const ids = ctx.ids
  function set(table: string, clientSlug: string, slug: string, id: string): void {
    const bucket = state.artifactIds![table] ?? (state.artifactIds![table] = {})
    bucket[`${clientSlug}:${slug}`] = id
  }
  for (const client of CLIENTS) {
    const seed = ARTIFACT_SLUGS_PER_CLIENT[client.slug]
    if (!seed) continue
    for (const s of seed.offerSlugs)
      set('offers', client.slug, s, ids.id('offer', orgId, client.slug, s))
    for (const s of seed.funnelSlugs)
      set('funnels', client.slug, s, ids.id('funnel', orgId, client.slug, s))
    if (seed.website) {
      const websiteId = ids.id('funnel', orgId, client.slug, 'website')
      set('funnels', client.slug, 'website', websiteId)
      set('websites', client.slug, 'website', websiteId)
    }
    for (const s of seed.sequenceSlugs) {
      set('sequences', client.slug, s, ids.id('sequence', orgId, client.slug, s))
    }
    for (const slug of seed.sequenceEmailFirstSlugs) {
      const [seqSlug] = slug.split(':')
      if (!seqSlug) continue
      const sequenceId = ids.id('sequence', orgId, client.slug, seqSlug)
      const emailId = ids.id('sequence-email', sequenceId, '0')
      set('sequence_emails', client.slug, slug, emailId)
    }
    for (const s of seed.presentationSlugs) {
      set('presentations', client.slug, s, ids.id('presentation', orgId, client.slug, s))
    }
    for (const s of seed.mediaSlugs) {
      set('media_assets', client.slug, s, ids.id('media-asset', orgId, client.slug, s))
    }
  }
}

function populateDryRunStateIfEmpty(ctx: PhaseContext): void {
  if (!ctx.dryRun) return
  const state: PhaseState = ctx.state
  const ids = ctx.ids

  if (!state.orgId) state.orgId = ids.id('org', 'foundry-creative')
  if (!state.founderUserId) state.founderUserId = ids.id('user', 'founder')
  if (!state.hiredAgentKeys) state.hiredAgentKeys = [...KNOWN_HIRED_AGENT_KEYS]

  const orgId = state.orgId

  if (!state.contactIds) {
    state.contactIds = Object.fromEntries(
      CONTACTS.map((c) => [c.slug, ids.id('contact', orgId, c.slug)]),
    )
  }
  if (!state.customerAvatarIds) {
    state.customerAvatarIds = Object.fromEntries(
      CUSTOMER_AVATARS.map((a) => [a.slug, ids.id('customer-avatar', orgId, a.slug)]),
    )
  }
  if (!state.campaignIds) {
    state.campaignIds = Object.fromEntries(
      KNOWN_CAMPAIGN_SLUGS.map((slug) => [slug, ids.id('campaign', orgId, slug)]),
    )
  }
  if (!state.missionIds) {
    state.missionIds = Object.fromEntries(
      MISSIONS.map((m) => [m.slug, ids.id('mission', orgId, m.slug)]),
    )
  }
  if (!state.artifactIds || Object.keys(state.artifactIds).length === 0) {
    bootstrapArtifactIds(ctx, orgId)
  }
}

interface ResolvedState {
  orgId: string
  founderUserId: string
  contactIds: Record<string, string>
  customerAvatarIds: Record<string, string>
  missionIds: Record<string, string>
  artifactIds: Record<string, Record<string, string>>
}

function resolveState(state: PhaseState): ResolvedState {
  if (!state.orgId) throw new Error(`${PHASE_ID}: missing state.orgId (set by P01).`)
  if (!state.founderUserId)
    throw new Error(`${PHASE_ID}: missing state.founderUserId (set by P01).`)
  if (!state.contactIds) throw new Error(`${PHASE_ID}: missing state.contactIds (set by P03a).`)
  if (!state.customerAvatarIds)
    throw new Error(`${PHASE_ID}: missing state.customerAvatarIds (set by P3b1).`)
  if (!state.missionIds) throw new Error(`${PHASE_ID}: missing state.missionIds (set by P07).`)
  return {
    orgId: state.orgId,
    founderUserId: state.founderUserId,
    contactIds: state.contactIds,
    customerAvatarIds: state.customerAvatarIds,
    missionIds: state.missionIds,
    artifactIds: state.artifactIds ?? {},
  }
}

// ─── Marketing avatar derivation ───────────────────────────────────────────

function deriveAvatarType(narrative: AvatarNarrative): string {
  const identityRaw = narrative.discriminatorProfile.identity?.value ?? 'unspecified'
  // Take the first clause before a comma or "I" hand-off and slugify.
  const firstClause = identityRaw.split(/[,;]/)[0] ?? identityRaw
  return (
    firstClause
      .toLowerCase()
      .replace(/^i\s+(am|run|do|build)\s+/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'unspecified'
  )
}

/**
 * Map a customer avatar slug → matching client slug. The 6 named avatars
 * follow a 1:1 with the 6 vertical-aligned clients; the cross-vertical
 * anti-avatar is left without a client link.
 */
const AVATAR_SLUG_TO_CLIENT_SLUG: Readonly<Record<string, string>> = {
  'saas-platform-founders': 'acme',
  'dtc-operators-with-taste': 'beta',
  'fintech-marketing-controllers': 'gamma',
  'healthtech-clinic-ops-founders': 'delta',
  'services-firm-managing-partners': 'epsilon',
  'adult-cohort-edu-founders': 'zeta',
  'cross-vertical-disqualified-leads': '',
}

function pickOfferForAvatar(resolved: ResolvedState, narrative: AvatarNarrative): string | null {
  const clientSlug = AVATAR_SLUG_TO_CLIENT_SLUG[narrative.slug] ?? ''
  if (!clientSlug) return null
  const offers = resolved.artifactIds.offers
  if (!offers) return null
  // Prefer offer-1 if present, else first match.
  const preferred = offers[`${clientSlug}:offer-1`]
  if (preferred) return preferred
  for (const [key, id] of Object.entries(offers)) {
    if (key.startsWith(`${clientSlug}:`)) return id
  }
  return null
}

interface MarketingAvatarRow {
  id: string
  user_id: string
  org_id: string
  campaign_id: string | null
  offer_id: string | null
  name: string
  avatar_type: string
  persona_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

function buildMarketingAvatar(
  ctx: PhaseContext,
  resolved: ResolvedState,
  narrative: AvatarNarrative,
): MarketingAvatarRow {
  const { ids, timeline } = ctx
  const orgId = resolved.orgId

  const id = ids.id('avatar', orgId, narrative.slug)
  const memberContactIds = narrative.memberContactSlugs
    .map((slug) => resolved.contactIds[slug])
    .filter((x): x is string => typeof x === 'string')

  const clientSlug = AVATAR_SLUG_TO_CLIENT_SLUG[narrative.slug] ?? ''
  const offerId = pickOfferForAvatar(resolved, narrative)
  const campaignSlug = clientSlug || null
  const campaignId =
    campaignSlug && ctx.state.campaignIds ? (ctx.state.campaignIds[campaignSlug] ?? null) : null

  // Marketing avatar = next-day formalization of the customer brain inference.
  const createdAt = timeline.after(narrative.emergedAt, 1, 9, 0)

  return {
    id,
    user_id: resolved.founderUserId,
    org_id: orgId,
    campaign_id: campaignId,
    offer_id: offerId,
    name: narrative.name,
    avatar_type: deriveAvatarType(narrative),
    persona_data: {
      slug: narrative.slug,
      summary: narrative.summary,
      narrative_md: narrative.narrativeMd,
      pain_points: narrative.dominantPainPoints,
      blind_spots: narrative.blindSpots,
      discriminator_profile: narrative.discriminatorProfile,
      emotional_signature: narrative.emotionalSignature,
      source_contact_ids: memberContactIds,
      source_contact_slugs: narrative.memberContactSlugs,
      // Filled in by P3b1 (dominant_belief_ids / dominant_perspective_ids on
      // customer_avatars). For now we carry the names through so downstream
      // surfaces have something readable.
      dominant_belief_ids: [],
      dominant_perspective_ids: [],
      status: narrative.status,
      derived_from: 'customer_avatars',
      seeded_by: 'yc-demo-seeder',
    },
    created_at: timeline.iso(createdAt),
    updated_at: timeline.iso(createdAt),
  }
}

// ─── Deliverable backfill ──────────────────────────────────────────────────

interface DeliverableUpdate {
  id: string
  metadata: Record<string, unknown>
}

interface BackfillStats {
  matched: number
  skipped: number
  matchedByKind: Record<string, number>
  skippedByKind: Record<string, number>
}

function pickArtifactForDeliverable(
  resolved: ResolvedState,
  clientSlug: string,
  table: string,
): string | null {
  const bucket = resolved.artifactIds[table]
  if (!bucket) return null
  // Look for the first artifact slug matching this client.
  for (const [key, id] of Object.entries(bucket)) {
    if (key.startsWith(`${clientSlug}:`)) return id
  }
  return null
}

interface DeliverableSeed {
  brief: MissionBrief
  kind: string
  deliverableId: string
}

function enumerateExpectedDeliverables(
  ctx: PhaseContext,
  resolved: ResolvedState,
): DeliverableSeed[] {
  // Mirrors P7's deterministic-id formula: ids.id('mission-deliverable',
  // missionId, kind). We only emit one entry per (mission, kind) for
  // completed missions; queued / in_progress / cancelled missions have no
  // deliverables to backfill.
  const out: DeliverableSeed[] = []
  for (const brief of MISSIONS) {
    if (brief.status !== 'completed') continue
    const missionId = resolved.missionIds[brief.slug]
    if (!missionId) continue
    for (const kind of brief.deliverableKinds) {
      const deliverableId = ctx.ids.id('mission-deliverable', missionId, kind)
      out.push({ brief, kind, deliverableId })
    }
  }
  return out
}

function planDeliverableBackfill(
  ctx: PhaseContext,
  resolved: ResolvedState,
  warnings: string[],
): { updates: DeliverableUpdate[]; stats: BackfillStats } {
  const stats: BackfillStats = {
    matched: 0,
    skipped: 0,
    matchedByKind: {},
    skippedByKind: {},
  }
  const updates: DeliverableUpdate[] = []

  for (const seed of enumerateExpectedDeliverables(ctx, resolved)) {
    const artifactTable = DELIVERABLE_KIND_TO_ARTIFACT_TABLE[seed.kind]
    if (!artifactTable) {
      stats.skipped += 1
      stats.skippedByKind[seed.kind] = (stats.skippedByKind[seed.kind] ?? 0) + 1
      continue
    }
    const clientSlug = seed.brief.campaignSlug
    const artifactId = pickArtifactForDeliverable(resolved, clientSlug, artifactTable)
    if (!artifactId) {
      stats.skipped += 1
      stats.skippedByKind[seed.kind] = (stats.skippedByKind[seed.kind] ?? 0) + 1
      continue
    }
    updates.push({
      id: seed.deliverableId,
      metadata: {
        deliverable_kind: seed.kind,
        artifact_table: artifactTable,
        artifact_id: artifactId,
        seeded_by: 'yc-demo-seeder',
        backfilled_by: PHASE_ID,
      },
    })
    stats.matched += 1
    stats.matchedByKind[seed.kind] = (stats.matchedByKind[seed.kind] ?? 0) + 1
  }

  if (stats.skipped > 0) {
    warnings.push(
      `P7.5c: ${stats.skipped} mission_deliverables had no plausible artifact match (kinds: ${Object.entries(
        stats.skippedByKind,
      )
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}).`,
    )
  }

  return { updates, stats }
}

// ─── Direct UPDATE helper ──────────────────────────────────────────────────

async function applyDeliverableUpdates(
  ctx: PhaseContext,
  updates: DeliverableUpdate[],
): Promise<void> {
  if (updates.length === 0) return
  for (let i = 0; i < updates.length; i += UPDATE_BATCH_SIZE) {
    const chunk = updates.slice(i, i + UPDATE_BATCH_SIZE)
    // No bulk-update RPC — issue per-row UPDATEs in a batched loop.
    await Promise.all(
      chunk.map(async (u) => {
        const { error } = await ctx.supabase
          .from('mission_deliverables')
          .update({ metadata: u.metadata })
          .eq('id', u.id)
        if (error) {
          throw new Error(
            `${PHASE_ID}: UPDATE mission_deliverables ${u.id} failed: ${error.message}`,
          )
        }
      }),
    )
  }
}

async function applyCustomerAvatarLinks(
  ctx: PhaseContext,
  pairs: ReadonlyArray<{ customerAvatarId: string; marketingAvatarId: string }>,
): Promise<void> {
  if (pairs.length === 0) return
  for (let i = 0; i < pairs.length; i += UPDATE_BATCH_SIZE) {
    const chunk = pairs.slice(i, i + UPDATE_BATCH_SIZE)
    await Promise.all(
      chunk.map(async (p) => {
        const { error } = await ctx.supabase
          .from('customer_avatars')
          .update({ declared_avatar_id: p.marketingAvatarId })
          .eq('id', p.customerAvatarId)
        if (error) {
          throw new Error(
            `${PHASE_ID}: UPDATE customer_avatars.declared_avatar_id for ${p.customerAvatarId} failed: ${error.message}`,
          )
        }
      }),
    )
  }
}

async function batchUpsertAvatars(
  ctx: PhaseContext,
  rows: ReadonlyArray<MarketingAvatarRow>,
): Promise<void> {
  if (rows.length === 0) return
  for (let i = 0; i < rows.length; i += UPDATE_BATCH_SIZE) {
    const chunk = rows.slice(i, i + UPDATE_BATCH_SIZE)
    const { error } = await ctx.supabase
      .from('avatars')
      .upsert(chunk as unknown as ReadonlyArray<Record<string, unknown>>, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
    if (error) {
      throw new Error(
        `${PHASE_ID}: upsert avatars (batch ${i}..${i + chunk.length}) failed: ${error.message}`,
      )
    }
  }
}

// ─── Phase handler ─────────────────────────────────────────────────────────

export const runP07_5cAvatars: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  const { log, dryRun, reset, state } = ctx

  log.step('P7.5c — derive marketing avatars + backfill mission_deliverables')

  if (reset) {
    log.step(
      'Reset mode: P01 cascaded teardown of org → all P7.5c rows are gone with it; proceeding.',
    )
  }

  populateDryRunStateIfEmpty(ctx)
  const resolved = resolveState(state)

  const warnings: string[] = []

  // 1) Build marketing avatar rows from CUSTOMER_AVATARS content.
  const marketingAvatarRows: MarketingAvatarRow[] = []
  const declaredAvatarPairs: { customerAvatarId: string; marketingAvatarId: string }[] = []
  state.marketingAvatarIds = state.marketingAvatarIds ?? {}
  const marketingAvatarIds = state.marketingAvatarIds

  for (const narrative of CUSTOMER_AVATARS) {
    const customerAvatarId = resolved.customerAvatarIds[narrative.slug]
    if (!customerAvatarId) {
      warnings.push(
        `P7.5c: no customer_avatars id for slug "${narrative.slug}" — P3b1 must seed it. Skipping marketing avatar derivation for this slug.`,
      )
      continue
    }
    const row = buildMarketingAvatar(ctx, resolved, narrative)
    marketingAvatarRows.push(row)
    marketingAvatarIds[narrative.slug] = row.id
    declaredAvatarPairs.push({
      customerAvatarId,
      marketingAvatarId: row.id,
    })
  }

  // 2) Plan deliverable backfill against the artifact index in state.
  const { updates: deliverableUpdates, stats } = planDeliverableBackfill(ctx, resolved, warnings)

  // 3) Surface a quick view of who the avatars are pointed at.
  const contactMatched = marketingAvatarRows.reduce((acc, row) => {
    const ids = (row.persona_data as { source_contact_ids?: string[] }).source_contact_ids ?? []
    return acc + ids.length
  }, 0)

  const rowCounts: Record<string, number> = {
    'avatars (marketing)': marketingAvatarRows.length,
    'customer_avatars.declared_avatar_id': declaredAvatarPairs.length,
    'mission_deliverables (backfilled)': stats.matched,
    'mission_deliverables (skipped)': stats.skipped,
    'avatar source_contact_ids resolved': contactMatched,
  }

  // Build a brief summary line so dry-run output is informative.
  const matchedKindSummary = Object.entries(stats.matchedByKind)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
  const skippedKindSummary = Object.entries(stats.skippedByKind)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
  log.step(
    `P7.5c — backfill plan: ${stats.matched} matched (${matchedKindSummary || 'none'}); ${stats.skipped} skipped (${skippedKindSummary || 'none'}).`,
  )

  if (dryRun) {
    log.step(
      `[dry-run] would upsert ${marketingAvatarRows.length} avatars, update ${declaredAvatarPairs.length} customer_avatars.declared_avatar_id, patch ${stats.matched} mission_deliverables.metadata`,
    )
    log.step(
      `[dry-run] state.marketingAvatarIds populated with ${Object.keys(marketingAvatarIds).length} slugs for downstream phases.`,
    )
    for (const [table, count] of Object.entries(rowCounts)) {
      log.rowCount(table, count)
    }
    return r.finish(rowCounts, warnings)
  }

  log.step(`Upserting marketing avatars (${marketingAvatarRows.length})`)
  await batchUpsertAvatars(ctx, marketingAvatarRows)

  log.step(`Linking customer_avatars.declared_avatar_id (${declaredAvatarPairs.length})`)
  await applyCustomerAvatarLinks(ctx, declaredAvatarPairs)

  log.step(`Backfilling mission_deliverables.metadata (${deliverableUpdates.length})`)
  await applyDeliverableUpdates(ctx, deliverableUpdates)

  return r.finish(rowCounts, warnings)
}

// Re-export the ContactPersona / AvatarNarrative types for the linter — kept
// to satisfy strict unused-import checks if the build is later tightened.
export type { AvatarNarrative, ContactPersona }
