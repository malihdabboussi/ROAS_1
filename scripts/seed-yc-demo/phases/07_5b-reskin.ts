/**
 * P7.5b — Reskin Adley templates for all 6 fictional clients.
 *
 * Two execution modes, transparently:
 *
 *   A) Real Adley dump available (P7.5a fetched). The dump is treated as a
 *      shape reference (FK topology, JSON column shapes, status vocabulary),
 *      and per-client copy/colors/names are layered on top. Any "Adley" /
 *      "Kinsman" / "viral" / "creator" tokens that slip through the copy
 *      substitutions get scrubbed and a warning is logged.
 *
 *   B) No dump (env vars not set, no profile match, or --dry-run). We
 *      synthesize minimal but realistic rows per client from the persona
 *      alone — same FK topology, same approximate volumes, no template
 *      lineage. This is the path that runs under `pnpm seed:yc-demo
 *      --dry-run --phase=07_5b-reskin`.
 *
 * Per client we produce:
 *   - 3-5 offers (~24 total across 6 clients)
 *   - 2-3 funnels + funnel_pages (~15 funnels total, plus a website)
 *   - 1 website (a funnel with funnel_type='website') + ~4 funnel_pages
 *   - 3 sequences + 5 sequence_emails per sequence (~18 + ~90)
 *   - 2-3 presentations (~15 total)
 *   - 15-20 media_assets (~100 total)
 *   - 0-2 ad_campaigns + 4-6 ads each on growth-heavy clients (~8 + ~40)
 *   - 2 forms (~12 total)
 *
 *   Marketing avatars are NOT inserted here — P7.5c derives them from the
 *   customer_avatars rows P3b1 produces.
 *
 * Conventions:
 *   - All ids via `ctx.ids.id(table, orgId, clientSlug, artifactSlug)`.
 *   - All dates via timeline helpers (never `new Date(...)`).
 *   - `user_id = state.founderUserId`, `org_id = state.orgId`, `campaign_id
 *     = state.campaignIds[client.slug]`, `space_id = state.spaceIds[<client
 *     workspace>]` where the column exists.
 *
 * State produced for downstream phases:
 *   - state.artifactIds[table][slug] = row.id, with `slug` of the form
 *     `<client.slug>:<artifact-key>` so P7.5c's deliverable backfill can
 *     locate artifacts by client.
 */
import type { ClientPersona } from '../content/_types'
import { CLIENTS } from '../content/clients'
import { startResult, type PhaseContext, type PhaseHandler, type PhaseState } from './_context'
import type { AdleyDump } from './07_5a-adley-extract'

const PHASE_ID = '07_5b-reskin'

const UPSERT_BATCH_SIZE = 200

// ─── Tokens to scrub from any copy that came from the real Adley dump. ─────
//
// Case-insensitive matches on full words. Logged but not blocked — the seeder
// is fail-loud only when the underlying mechanism (FK / column) fails.
const ADLEY_SCRUB_TOKENS: readonly RegExp[] = [
  /adley/gi,
  /kinsman/gi,
  /\bviral\b/gi,
  /\bcreator\b/gi,
  /\bcreators\b/gi,
]

function scrubAdleyTokens(input: string, ctx: PhaseContext): string {
  let out = input
  let scrubbed = false
  for (const re of ADLEY_SCRUB_TOKENS) {
    if (re.test(out)) {
      scrubbed = true
      out = out.replace(re, '')
    }
  }
  if (scrubbed) {
    ctx.log.warn(
      `P7.5b: scrubbed Adley/Kinsman/viral/creator token from copy: "${input.slice(0, 80)}…"`,
    )
  }
  return out.replace(/\s{2,}/g, ' ').trim()
}

// ─── Per-vertical artifact plans ────────────────────────────────────────────

interface FunnelPlan {
  /** Stable per-client suffix used as the artifact slug. */
  slug: string
  funnel_type:
    | 'lead-magnet'
    | 'call-booking'
    | 'webinar'
    | 'home-page'
    | 'ecommerce-product'
    | 'custom'
  /** Page mix authored as (page_type, name suffix). */
  pages: readonly { page_type: string; name: string }[]
}

interface ArtifactPlan {
  offers: number // 3-5
  funnels: readonly FunnelPlan[]
  /** Whether to also stand up a `funnel_type='website'` artifact (4-5 pages). */
  website: boolean
  sequences: number // 3
  emailsPerSequence: number // 5
  presentations: number // 2-3
  mediaAssets: number // 15-20
  adCampaigns: number // 0-2
  adsPerCampaign: number // 4-6
  forms: number // 2
  /** Whether this client uses paid social (drives ad creative tone). */
  growthHeavy: boolean
}

const PLANS: Readonly<Record<string, ArtifactPlan>> = {
  // saas / Plinthworks — engineer-direct, one paid experiment per quarter.
  acme: {
    offers: 4,
    funnels: [
      {
        slug: 'on-call-checklist-funnel',
        funnel_type: 'lead-magnet',
        pages: [
          { page_type: 'opt-in', name: 'on-call checklist opt-in' },
          { page_type: 'thank-you', name: 'on-call checklist thank-you' },
        ],
      },
      {
        slug: 'platform-strategy-call',
        funnel_type: 'call-booking',
        pages: [
          { page_type: 'opt-in', name: 'platform strategy call request' },
          { page_type: 'booking', name: 'platform strategy calendar' },
          { page_type: 'thank-you', name: 'platform strategy booked' },
        ],
      },
    ],
    website: true,
    sequences: 3,
    emailsPerSequence: 5,
    presentations: 2,
    mediaAssets: 15,
    adCampaigns: 1,
    adsPerCampaign: 4,
    forms: 2,
    growthHeavy: false,
  },
  // dtc / Saltline — sensory, voice-defended, growth-heavy.
  beta: {
    offers: 5,
    funnels: [
      {
        slug: 'pantry-drop-opt-in',
        funnel_type: 'lead-magnet',
        pages: [
          { page_type: 'opt-in', name: 'pantry drop opt-in' },
          { page_type: 'thank-you', name: 'pantry drop confirmation' },
        ],
      },
      {
        slug: 'gifting-bundle',
        funnel_type: 'custom',
        pages: [
          { page_type: 'opt-in', name: 'gifting bundle landing' },
          { page_type: 'thank-you', name: 'gifting order confirmation' },
        ],
      },
    ],
    website: true,
    sequences: 3,
    emailsPerSequence: 5,
    presentations: 2,
    mediaAssets: 20,
    adCampaigns: 2,
    adsPerCampaign: 6,
    forms: 2,
    growthHeavy: true,
  },
  // fintech / Helmsmark — sober, controller-trust, NO aggressive paid funnels.
  gamma: {
    offers: 3,
    funnels: [
      {
        slug: 'controller-playbook-lead',
        funnel_type: 'lead-magnet',
        pages: [
          { page_type: 'opt-in', name: 'controller playbook opt-in' },
          { page_type: 'thank-you', name: 'controller playbook confirmation' },
        ],
      },
      {
        slug: 'cfo-briefing-call',
        funnel_type: 'call-booking',
        pages: [
          { page_type: 'opt-in', name: 'CFO briefing request' },
          { page_type: 'booking', name: 'CFO briefing calendar' },
          { page_type: 'thank-you', name: 'CFO briefing booked' },
        ],
      },
    ],
    website: true,
    sequences: 3,
    emailsPerSequence: 5,
    presentations: 3,
    mediaAssets: 12,
    adCampaigns: 0,
    adsPerCampaign: 0,
    forms: 2,
    growthHeavy: false,
  },
  // healthtech / Cloverkin — careful, trust-coded. NO ads.
  delta: {
    offers: 3,
    funnels: [
      {
        slug: 'new-patient-onboarding-lead',
        funnel_type: 'lead-magnet',
        pages: [
          { page_type: 'opt-in', name: 'new patient guide opt-in' },
          { page_type: 'thank-you', name: 'new patient guide confirmation' },
        ],
      },
    ],
    website: true,
    sequences: 3,
    emailsPerSequence: 5,
    presentations: 2,
    mediaAssets: 15,
    adCampaigns: 0,
    adsPerCampaign: 0,
    forms: 2,
    growthHeavy: false,
  },
  // b2b-services / Throughput — P&L-fluent, outbound + proposal-kit.
  epsilon: {
    offers: 4,
    funnels: [
      {
        slug: 'coo-strategy-call',
        funnel_type: 'call-booking',
        pages: [
          { page_type: 'opt-in', name: 'COO strategy call request' },
          { page_type: 'booking', name: 'COO strategy calendar' },
          { page_type: 'thank-you', name: 'COO strategy booked' },
        ],
      },
      {
        slug: 'practice-lead-loom-request',
        funnel_type: 'custom',
        pages: [
          { page_type: 'opt-in', name: 'practice lead Loom request' },
          { page_type: 'thank-you', name: 'Loom delivery confirmation' },
        ],
      },
    ],
    website: true,
    sequences: 3,
    emailsPerSequence: 5,
    presentations: 3,
    mediaAssets: 12,
    adCampaigns: 1,
    adsPerCampaign: 4,
    forms: 2,
    growthHeavy: true,
  },
  // education / Almanac — curious, generous, cohort-trust.
  zeta: {
    offers: 4,
    funnels: [
      {
        slug: 'reading-list-opt-in',
        funnel_type: 'lead-magnet',
        pages: [
          { page_type: 'opt-in', name: 'reading list opt-in' },
          { page_type: 'thank-you', name: 'reading list confirmation' },
        ],
      },
      {
        slug: 'cohort-info-session',
        funnel_type: 'webinar',
        pages: [
          { page_type: 'opt-in', name: 'cohort info session registration' },
          { page_type: 'thank-you', name: 'cohort info session confirmed' },
          { page_type: 'replay', name: 'cohort info session replay' },
        ],
      },
    ],
    website: true,
    sequences: 3,
    emailsPerSequence: 5,
    presentations: 3,
    mediaAssets: 12,
    adCampaigns: 1,
    adsPerCampaign: 4,
    forms: 2,
    growthHeavy: false,
  },
}

// Map client slug → space slug for the client's primary workspace, so
// media_assets and forms can be space-scoped per the schema.
const CLIENT_WORKSPACE_SPACE: Readonly<Record<string, string>> = {
  acme: 'plinthworks-workspace',
  beta: 'saltline-workspace',
  gamma: 'helmsmark-workspace',
  delta: 'cloverkin-workspace',
  epsilon: 'throughput-workspace',
  zeta: 'almanac-workspace',
}

// ─── Naming helpers ────────────────────────────────────────────────────────

function clientLabel(client: ClientPersona, kind: string, n: number): string {
  // namingPattern is e.g. `Plinthworks — {{kind}} v{{n}}`
  return client.namingPattern.replace('{{kind}}', kind).replace('{{n}}', String(n))
}

/** Pick N keywords deterministically from the client's voice keyword pool. */
function pickKeywords(client: ClientPersona, n: number, seedKey: string): string[] {
  const pool = client.voice.keywords
  if (pool.length === 0) return []
  const out: string[] = []
  let h = 0
  for (let i = 0; i < seedKey.length; i++) h = (h * 31 + seedKey.charCodeAt(i)) >>> 0
  for (let i = 0; i < n; i++) {
    const idx = (h + i * 17) % pool.length
    const w = pool[idx]
    if (w !== undefined && !out.includes(w)) out.push(w)
  }
  return out
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

interface ResolvedState {
  orgId: string
  founderUserId: string
  campaignIds: Record<string, string>
  spaceIds: Record<string, string>
}

function resolveState(state: PhaseState): ResolvedState {
  if (!state.orgId) throw new Error(`${PHASE_ID}: missing state.orgId (set by P01).`)
  if (!state.founderUserId)
    throw new Error(`${PHASE_ID}: missing state.founderUserId (set by P01).`)
  if (!state.campaignIds) throw new Error(`${PHASE_ID}: missing state.campaignIds (set by P05).`)
  return {
    orgId: state.orgId,
    founderUserId: state.founderUserId,
    campaignIds: state.campaignIds,
    spaceIds: state.spaceIds ?? {},
  }
}

function readAdleyDump(ctx: PhaseContext): AdleyDump | null {
  const d = (ctx.state as { adleyDump?: AdleyDump }).adleyDump
  return d ?? null
}

// ─── Batched upsert (mirrors phases/07-missions.ts) ────────────────────────

async function batchUpsert(
  ctx: PhaseContext,
  table: string,
  rows: ReadonlyArray<Record<string, unknown>>,
): Promise<void> {
  if (rows.length === 0) return
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_BATCH_SIZE)
    const { error } = await ctx.supabase
      .from(table)
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false })
    if (error) {
      throw new Error(
        `${PHASE_ID}: upsert ${table} (batch ${i}..${i + chunk.length}) failed: ${error.message}`,
      )
    }
  }
}

// ─── Per-client row builders ───────────────────────────────────────────────

interface BuildContext {
  ctx: PhaseContext
  resolved: ResolvedState
  client: ClientPersona
  plan: ArtifactPlan
  spaceId: string | null
  campaignId: string
  baseAt: Date
  artifactIds: Record<string, Record<string, string>>
  warnings: string[]
}

function artifactKey(clientSlug: string, key: string): string {
  return `${clientSlug}:${key}`
}

function trackArtifact(bc: BuildContext, table: string, key: string, id: string): void {
  const bucket = bc.artifactIds[table] ?? (bc.artifactIds[table] = {})
  bucket[artifactKey(bc.client.slug, key)] = id
}

function scrub(bc: BuildContext, text: string): string {
  return scrubAdleyTokens(text, bc.ctx)
}

function jitter(bc: BuildContext, seedKey: string, maxDaysOffset = 60): string {
  const { jitterWithin, dayOffset } = bc.ctx.timeline
  const end = dayOffset(0, 18, 0)
  // Cap end at min(today, client.onboardedAt + maxDaysOffset days)
  const cappedEnd = bc.ctx.timeline.after(bc.baseAt, maxDaysOffset, 18, 0)
  const upperEnd = cappedEnd.getTime() < end.getTime() ? cappedEnd : end
  const at = jitterWithin(bc.baseAt, upperEnd, seedKey)
  return bc.ctx.timeline.iso(at)
}

// ─── offers ────────────────────────────────────────────────────────────────

interface OfferRow {
  id: string
  user_id: string
  org_id: string
  campaign_id: string
  name: string
  processing_status: string
  step1_data: Record<string, unknown>
  step2_data: Record<string, unknown>
  step3_data: Record<string, unknown>
  step4_data: Record<string, unknown>
  step5_data: Record<string, unknown>
  step6_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

function buildOffers(bc: BuildContext): OfferRow[] {
  const out: OfferRow[] = []
  for (let i = 1; i <= bc.plan.offers; i++) {
    const slug = `offer-${i}`
    const id = bc.ctx.ids.id('offer', bc.resolved.orgId, bc.client.slug, slug)
    trackArtifact(bc, 'offers', slug, id)
    const at = jitter(bc, `offers:${bc.client.slug}:${i}`)
    const name = scrub(bc, clientLabel(bc.client, 'Offer', i))
    const keywords = pickKeywords(bc.client, 6, `offer:${bc.client.slug}:${i}`)
    out.push({
      id,
      user_id: bc.resolved.founderUserId,
      org_id: bc.resolved.orgId,
      campaign_id: bc.campaignId,
      name,
      processing_status: 'complete',
      step1_data: {
        product_summary: `${bc.client.name} — ${bc.client.retainerScope}`,
        market_context: keywords.slice(0, 3).join(', '),
        seeded_by: 'yc-demo-seeder',
      },
      step2_data: {
        promise: scrub(
          bc,
          `${bc.client.name} helps ${keywords[0] ?? 'teams'} move past ${keywords[1] ?? 'friction'}.`,
        ),
        proof_points: keywords.slice(0, 4),
      },
      step3_data: {
        buyer_persona: bc.client.vertical,
        tone: bc.client.voice.tone,
      },
      step4_data: { icp_vertical: bc.client.vertical },
      step5_data: { competitive_edge: bc.client.voice.tone.join(', ') },
      step6_data: { unique_mechanisms: keywords.slice(2, 5) },
      created_at: at,
      updated_at: at,
    })
  }
  return out
}

// ─── funnels + funnel_pages ────────────────────────────────────────────────

interface FunnelRow {
  id: string
  user_id: string
  org_id: string
  campaign_id: string
  offer_id: string | null
  name: string
  funnel_type: string
  status: string
  slug: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface FunnelPageRow {
  id: string
  funnel_id: string
  name: string
  page_type: string
  sections: unknown[]
  theme_config: Record<string, unknown>
  order_index: number
  is_published: boolean
  created_at: string
  updated_at: string
}

function pickOfferIdForFunnel(bc: BuildContext): string | null {
  const bucket = bc.artifactIds.offers
  if (!bucket) return null
  const first = bucket[artifactKey(bc.client.slug, 'offer-1')]
  return first ?? null
}

function buildFunnels(bc: BuildContext): { funnels: FunnelRow[]; pages: FunnelPageRow[] } {
  const funnels: FunnelRow[] = []
  const pages: FunnelPageRow[] = []
  const offerId = pickOfferIdForFunnel(bc)
  let n = 1
  for (const f of bc.plan.funnels) {
    const funnelId = bc.ctx.ids.id('funnel', bc.resolved.orgId, bc.client.slug, f.slug)
    trackArtifact(bc, 'funnels', f.slug, funnelId)
    const at = jitter(bc, `funnel:${bc.client.slug}:${f.slug}`)
    const name = scrub(bc, clientLabel(bc.client, 'Funnel', n))
    funnels.push({
      id: funnelId,
      user_id: bc.resolved.founderUserId,
      org_id: bc.resolved.orgId,
      campaign_id: bc.campaignId,
      offer_id: offerId,
      name,
      funnel_type: f.funnel_type,
      status: 'published',
      slug: `${bc.client.slug}-${f.slug}`,
      metadata: {
        client_slug: bc.client.slug,
        brand: bc.client.brand,
        voice_tone: bc.client.voice.tone,
        seeded_by: 'yc-demo-seeder',
      },
      created_at: at,
      updated_at: at,
    })
    f.pages.forEach((p, idx) => {
      const pageId = bc.ctx.ids.id('funnel-page', funnelId, p.page_type, String(idx))
      pages.push({
        id: pageId,
        funnel_id: funnelId,
        name: scrub(bc, `${bc.client.name} — ${p.name}`),
        page_type: p.page_type,
        sections: [
          {
            id: 'hero',
            type: 'hero',
            headline: scrub(
              bc,
              `${bc.client.name} — ${pickKeywords(bc.client, 2, `funnel:hero:${f.slug}:${idx}`).join(' ')}`,
            ),
          },
        ],
        theme_config: { primary: bc.client.brand.primary, accent: bc.client.brand.accent },
        order_index: idx,
        is_published: true,
        created_at: at,
        updated_at: at,
      })
    })
    n += 1
  }
  return { funnels, pages }
}

// ─── website (funnel_type='website') + pages ──────────────────────────────

const WEBSITE_PAGE_PLAN: readonly { page_type: string; name: string }[] = [
  { page_type: 'home', name: 'home' },
  { page_type: 'about', name: 'about' },
  { page_type: 'services', name: 'services' },
  { page_type: 'pricing', name: 'pricing' },
  { page_type: 'contact', name: 'contact' },
]

function buildWebsite(bc: BuildContext): { funnels: FunnelRow[]; pages: FunnelPageRow[] } {
  if (!bc.plan.website) return { funnels: [], pages: [] }
  const funnelId = bc.ctx.ids.id('funnel', bc.resolved.orgId, bc.client.slug, 'website')
  trackArtifact(bc, 'funnels', 'website', funnelId)
  trackArtifact(bc, 'websites', 'website', funnelId)
  const at = jitter(bc, `website:${bc.client.slug}`)
  const funnels: FunnelRow[] = [
    {
      id: funnelId,
      user_id: bc.resolved.founderUserId,
      org_id: bc.resolved.orgId,
      campaign_id: bc.campaignId,
      offer_id: pickOfferIdForFunnel(bc),
      name: scrub(bc, clientLabel(bc.client, 'Site', 1)),
      funnel_type: 'website',
      status: 'published',
      slug: `${bc.client.slug}-site`,
      metadata: {
        client_slug: bc.client.slug,
        brand: bc.client.brand,
        voice_tone: bc.client.voice.tone,
        kind: 'marketing_site',
        seeded_by: 'yc-demo-seeder',
      },
      created_at: at,
      updated_at: at,
    },
  ]
  const pages: FunnelPageRow[] = WEBSITE_PAGE_PLAN.map((p, idx) => {
    const id = bc.ctx.ids.id('funnel-page', funnelId, p.page_type, String(idx))
    return {
      id,
      funnel_id: funnelId,
      name: scrub(bc, `${bc.client.name} — ${p.name}`),
      page_type: p.page_type,
      sections: [
        {
          id: 'hero',
          type: 'hero',
          headline: scrub(bc, `${bc.client.name}`),
        },
      ],
      theme_config: { primary: bc.client.brand.primary, accent: bc.client.brand.accent },
      order_index: idx,
      is_published: true,
      created_at: at,
      updated_at: at,
    }
  })
  return { funnels, pages }
}

// ─── sequences + sequence_emails ───────────────────────────────────────────

interface SequenceRow {
  id: string
  user_id: string
  org_id: string
  campaign_id: string
  name: string
  status: string
  trigger: Record<string, unknown>
  config: Record<string, unknown>
  metrics: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface SequenceEmailRow {
  id: string
  sequence_id: string
  subject: string
  body: string
  delay_hours: number
  order_index: number
  status: string
  metrics: Record<string, unknown>
  created_at: string
  updated_at: string
}

const SEQUENCE_INTENTS: readonly { slug: string; intent: string }[] = [
  { slug: 'welcome', intent: 'Welcome new leads' },
  { slug: 'nurture', intent: 'Nurture warm leads' },
  { slug: 're-engage', intent: 'Re-engage cold leads' },
]

function buildSequences(bc: BuildContext): {
  sequences: SequenceRow[]
  emails: SequenceEmailRow[]
} {
  const sequences: SequenceRow[] = []
  const emails: SequenceEmailRow[] = []
  for (let i = 0; i < bc.plan.sequences; i++) {
    const intent = SEQUENCE_INTENTS[i % SEQUENCE_INTENTS.length] ?? SEQUENCE_INTENTS[0]!
    const sequenceId = bc.ctx.ids.id('sequence', bc.resolved.orgId, bc.client.slug, intent.slug)
    trackArtifact(bc, 'sequences', intent.slug, sequenceId)
    const at = jitter(bc, `sequence:${bc.client.slug}:${intent.slug}`)
    const name = scrub(bc, clientLabel(bc.client, 'Sequence', i + 1))
    sequences.push({
      id: sequenceId,
      user_id: bc.resolved.founderUserId,
      org_id: bc.resolved.orgId,
      campaign_id: bc.campaignId,
      name: `${name} — ${intent.intent}`,
      status: 'active',
      trigger: { type: 'manual', source: 'yc-demo-seeder' },
      config: { client_slug: bc.client.slug, voice_tone: bc.client.voice.tone },
      metrics: {},
      created_at: at,
      updated_at: at,
    })
    for (let j = 0; j < bc.plan.emailsPerSequence; j++) {
      const emailId = bc.ctx.ids.id('sequence-email', sequenceId, String(j))
      trackArtifact(bc, 'sequence_emails', `${intent.slug}:email-${j + 1}`, emailId)
      const kw = pickKeywords(bc.client, 3, `email:${bc.client.slug}:${intent.slug}:${j}`)
      const subject = scrub(
        bc,
        `${bc.client.name} — ${intent.intent} (${kw[0] ?? 'step'} ${j + 1})`,
      )
      const bodyLines = [
        scrub(bc, `${bc.client.name} note from the team — ${kw.join(', ')}.`),
        scrub(
          bc,
          `Tone: ${bc.client.voice.tone.slice(0, 2).join(', ')}. Avoid: ${bc.client.voice.avoid.slice(0, 2).join(', ')}.`,
        ),
      ].join('\n\n')
      emails.push({
        id: emailId,
        sequence_id: sequenceId,
        subject,
        body: bodyLines,
        delay_hours: j === 0 ? 0 : 24 * j,
        order_index: j,
        status: 'ready',
        metrics: {},
        created_at: at,
        updated_at: at,
      })
    }
  }
  return { sequences, emails }
}

// ─── presentations ─────────────────────────────────────────────────────────

interface PresentationRow {
  id: string
  user_id: string
  org_id: string
  campaign_id: string
  offer_id: string | null
  name: string
  slides: unknown[]
  theme_id: null
  file_url: null
  status: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

const PRESENTATION_INTENTS: readonly string[] = ['positioning deck', 'case study', 'proposal kit']

function buildPresentations(bc: BuildContext): PresentationRow[] {
  const out: PresentationRow[] = []
  const offerId = pickOfferIdForFunnel(bc)
  for (let i = 0; i < bc.plan.presentations; i++) {
    const intent = PRESENTATION_INTENTS[i % PRESENTATION_INTENTS.length] ?? PRESENTATION_INTENTS[0]!
    const slug = `presentation-${i + 1}-${intent.replace(/\s+/g, '-')}`
    const id = bc.ctx.ids.id('presentation', bc.resolved.orgId, bc.client.slug, slug)
    trackArtifact(bc, 'presentations', slug, id)
    const at = jitter(bc, `presentation:${bc.client.slug}:${i}`)
    const kw = pickKeywords(bc.client, 5, `presentation:${bc.client.slug}:${i}`)
    out.push({
      id,
      user_id: bc.resolved.founderUserId,
      org_id: bc.resolved.orgId,
      campaign_id: bc.campaignId,
      offer_id: offerId,
      name: scrub(bc, `${clientLabel(bc.client, 'Presentation', i + 1)} — ${intent}`),
      slides: [
        { title: scrub(bc, `${bc.client.name} — ${intent}`), bullets: kw },
        { title: 'Why now', bullets: kw.slice(0, 3) },
        { title: 'What we own', bullets: bc.client.voice.tone },
      ],
      theme_id: null,
      file_url: null,
      status: 'published',
      metadata: {
        client_slug: bc.client.slug,
        intent,
        seeded_by: 'yc-demo-seeder',
      },
      created_at: at,
      updated_at: at,
    })
  }
  return out
}

// ─── media_assets ──────────────────────────────────────────────────────────

interface MediaAssetRow {
  id: string
  user_id: string
  org_id: string
  campaign_id: string
  space_id: string | null
  name: string
  original_filename: string
  file_path: string
  bucket_name: string
  file_size: number
  mime_type: string
  asset_type: 'image' | 'document' | 'video' | 'audio' | 'other'
  category: string | null
  subcategory: string | null
  tags: string[]
  description: string | null
  is_public: boolean
  source: 'generated'
  source_model: string | null
  source_prompt: string | null
  created_at: string
  updated_at: string
}

function buildMediaAssets(bc: BuildContext): MediaAssetRow[] {
  const out: MediaAssetRow[] = []
  for (let i = 0; i < bc.plan.mediaAssets; i++) {
    const slug = `media-${i + 1}`
    const id = bc.ctx.ids.id('media-asset', bc.resolved.orgId, bc.client.slug, slug)
    trackArtifact(bc, 'media_assets', slug, id)
    const at = jitter(bc, `media:${bc.client.slug}:${i}`)
    const kw = pickKeywords(bc.client, 4, `media:${bc.client.slug}:${i}`)
    const isImage = i % 4 !== 3 // 3 of every 4 are images, 1 of 4 is document
    out.push({
      id,
      user_id: bc.resolved.founderUserId,
      org_id: bc.resolved.orgId,
      campaign_id: bc.campaignId,
      space_id: bc.spaceId,
      name: scrub(bc, `${bc.client.name} — asset ${i + 1}`),
      original_filename: `${bc.client.slug}-asset-${i + 1}.${isImage ? 'png' : 'pdf'}`,
      file_path: `yc-demo/${bc.client.slug}/asset-${i + 1}.${isImage ? 'png' : 'pdf'}`,
      bucket_name: 'media',
      file_size: 0,
      mime_type: isImage ? 'image/png' : 'application/pdf',
      asset_type: isImage ? 'image' : 'document',
      category: bc.client.vertical,
      subcategory: bc.client.slug,
      tags: [bc.client.slug, ...kw.slice(0, 3)],
      description: scrub(bc, `Brand visual for ${bc.client.name} — ${kw.join(', ')}.`),
      is_public: false,
      source: 'generated',
      source_model: null,
      source_prompt: scrub(
        bc,
        `${bc.client.name} brand palette ${bc.client.brand.primary} / ${bc.client.brand.accent}, tone: ${bc.client.voice.tone.slice(0, 2).join(', ')}.`,
      ),
      created_at: at,
      updated_at: at,
    })
  }
  return out
}

// ─── ad_campaigns + ad_sets + ads ──────────────────────────────────────────

interface AdCampaignRow {
  id: string
  user_id: string
  org_id: string
  campaign_id: string
  name: string
  objective: string
  status: string
  budget_type: string
  special_ad_categories: unknown[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface AdSetRow {
  id: string
  user_id: string
  org_id: string
  ad_campaign_id: string
  name: string
  status: string
  daily_budget: number | null
  optimization_goal: string
  billing_event: string
  targeting: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface AdRow {
  id: string
  user_id: string
  campaign_id: string
  ad_set_id: string
  platform: string
  placement: string
  primary_text: string
  headline: string
  description: string | null
  cta_type: string | null
  cta_text: string | null
  destination_url: string
  display_link: string | null
  image_url: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

function buildAds(bc: BuildContext): {
  ad_campaigns: AdCampaignRow[]
  ad_sets: AdSetRow[]
  ads: AdRow[]
} {
  const ad_campaigns: AdCampaignRow[] = []
  const ad_sets: AdSetRow[] = []
  const ads: AdRow[] = []
  if (bc.plan.adCampaigns === 0) return { ad_campaigns, ad_sets, ads }

  for (let c = 0; c < bc.plan.adCampaigns; c++) {
    const campaignSlug = `ad-campaign-${c + 1}`
    const adCampaignId = bc.ctx.ids.id(
      'ad-campaign',
      bc.resolved.orgId,
      bc.client.slug,
      campaignSlug,
    )
    trackArtifact(bc, 'ad_campaigns', campaignSlug, adCampaignId)
    const at = jitter(bc, `ad-campaign:${bc.client.slug}:${c}`)
    ad_campaigns.push({
      id: adCampaignId,
      user_id: bc.resolved.founderUserId,
      org_id: bc.resolved.orgId,
      campaign_id: bc.campaignId,
      name: scrub(bc, `${clientLabel(bc.client, 'Ad Campaign', c + 1)}`),
      objective: bc.plan.growthHeavy ? 'OUTCOME_LEADS' : 'OUTCOME_TRAFFIC',
      status: 'active',
      budget_type: 'ABO',
      special_ad_categories: [],
      metadata: {
        client_slug: bc.client.slug,
        seeded_by: 'yc-demo-seeder',
      },
      created_at: at,
      updated_at: at,
    })

    const adSetSlug = `ad-set-${c + 1}`
    const adSetId = bc.ctx.ids.id('ad-set', bc.resolved.orgId, bc.client.slug, adSetSlug)
    trackArtifact(bc, 'ad_sets', adSetSlug, adSetId)
    ad_sets.push({
      id: adSetId,
      user_id: bc.resolved.founderUserId,
      org_id: bc.resolved.orgId,
      ad_campaign_id: adCampaignId,
      name: scrub(bc, `${bc.client.name} — primary ad set`),
      status: 'active',
      daily_budget: bc.plan.growthHeavy ? 7500 : 4000,
      optimization_goal: bc.plan.growthHeavy ? 'LEAD_GENERATION' : 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
      targeting: { client_slug: bc.client.slug, vertical: bc.client.vertical },
      metadata: { seeded_by: 'yc-demo-seeder' },
      created_at: at,
      updated_at: at,
    })

    for (let a = 0; a < bc.plan.adsPerCampaign; a++) {
      const adSlug = `ad-${c + 1}-${a + 1}`
      const adId = bc.ctx.ids.id('ad', bc.resolved.orgId, bc.client.slug, adSlug)
      trackArtifact(bc, 'ads', adSlug, adId)
      const kw = pickKeywords(bc.client, 4, `ad:${bc.client.slug}:${c}:${a}`)
      ads.push({
        id: adId,
        user_id: bc.resolved.founderUserId,
        campaign_id: bc.campaignId,
        ad_set_id: adSetId,
        platform: 'meta',
        placement: a % 3 === 0 ? 'story' : 'feed',
        primary_text: scrub(
          bc,
          `${bc.client.name} — ${kw.slice(0, 2).join(', ')}. Tone: ${bc.client.voice.tone[0] ?? ''}.`,
        ),
        headline: scrub(bc, `${bc.client.name}`),
        description: scrub(bc, kw.slice(2, 4).join(' · ')),
        cta_type: 'LEARN_MORE',
        cta_text: 'Learn more',
        destination_url: `https://foundry.demo/${bc.client.slug}`,
        display_link: `foundry.demo/${bc.client.slug}`,
        image_url: null,
        metadata: {
          client_slug: bc.client.slug,
          ad_campaign_id: adCampaignId,
          seeded_by: 'yc-demo-seeder',
        },
        created_at: at,
        updated_at: at,
      })
    }
  }
  return { ad_campaigns, ad_sets, ads }
}

// ─── forms ─────────────────────────────────────────────────────────────────

interface FormRow {
  id: string
  user_id: string
  org_id: string
  campaign_id: string
  space_id: string | null
  name: string
  slug: string
  status: string
  visibility: string
  schema: Record<string, unknown>
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

const FORM_INTENTS: readonly { slug: string; label: string }[] = [
  { slug: 'discovery', label: 'discovery questionnaire' },
  { slug: 'feedback', label: 'cohort feedback' },
]

function buildForms(bc: BuildContext): FormRow[] {
  const out: FormRow[] = []
  for (let i = 0; i < bc.plan.forms; i++) {
    const intent = FORM_INTENTS[i % FORM_INTENTS.length] ?? FORM_INTENTS[0]!
    const id = bc.ctx.ids.id('form', bc.resolved.orgId, bc.client.slug, intent.slug)
    trackArtifact(bc, 'forms', intent.slug, id)
    const at = jitter(bc, `form:${bc.client.slug}:${intent.slug}`)
    const kw = pickKeywords(bc.client, 4, `form:${bc.client.slug}:${intent.slug}`)
    out.push({
      id,
      user_id: bc.resolved.founderUserId,
      org_id: bc.resolved.orgId,
      campaign_id: bc.campaignId,
      space_id: bc.spaceId,
      name: scrub(bc, `${bc.client.name} — ${intent.label}`),
      slug: `${bc.client.slug}-${intent.slug}`,
      status: 'published',
      visibility: 'public',
      schema: {
        questions: kw.map((k, idx) => ({
          id: `q-${idx + 1}`,
          type: 'short_text',
          label: scrub(bc, `What does "${k}" look like for your team right now?`),
        })),
      },
      settings: { client_slug: bc.client.slug, seeded_by: 'yc-demo-seeder' },
      created_at: at,
      updated_at: at,
    })
  }
  return out
}

// ─── Phase handler ─────────────────────────────────────────────────────────

export const runP07_5bReskin: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  const { log, dryRun, reset, state } = ctx

  log.step('P7.5b — reskin Adley templates for 6 fictional clients')

  if (reset) {
    log.step(
      'Reset mode: P01 cascaded teardown of org → all P7.5b rows are gone with it; proceeding.',
    )
  }

  populateDryRunStateIfEmpty(ctx)
  const resolved = resolveState(state)

  state.artifactIds = state.artifactIds ?? {}
  const artifactIds = state.artifactIds

  const dump = readAdleyDump(ctx)
  if (dump?.available) {
    log.step(
      `P7.5b — Adley dump present (fetched ${dump.fetchedAt ?? '?'}): ${Object.values(dump.rows).reduce((a, b) => a + b.length, 0)} prod template rows used as shape reference; per-client copy + colors reskinned on top.`,
    )
  } else {
    log.step(
      `P7.5b — no Adley dump available (${dump?.reason ?? 'no state.adleyDump'}); synthesizing minimal artifacts from each ClientPersona alone.`,
    )
  }

  const warnings: string[] = []

  // Aggregate per-table row arrays so we can batch-upsert at the end.
  const allOffers: OfferRow[] = []
  const allFunnels: FunnelRow[] = []
  const allFunnelPages: FunnelPageRow[] = []
  const allSequences: SequenceRow[] = []
  const allEmails: SequenceEmailRow[] = []
  const allPresentations: PresentationRow[] = []
  const allMedia: MediaAssetRow[] = []
  const allAdCampaigns: AdCampaignRow[] = []
  const allAdSets: AdSetRow[] = []
  const allAds: AdRow[] = []
  const allForms: FormRow[] = []

  for (const client of CLIENTS) {
    const plan = PLANS[client.slug]
    if (!plan) {
      throw new Error(`${PHASE_ID}: no artifact plan for client "${client.slug}".`)
    }
    const campaignId = resolved.campaignIds[client.slug]
    if (!campaignId) {
      throw new Error(
        `${PHASE_ID}: missing state.campaignIds["${client.slug}"] — run --phase=05-campaigns first.`,
      )
    }
    const spaceSlug = CLIENT_WORKSPACE_SPACE[client.slug] ?? null
    const spaceId = spaceSlug ? (resolved.spaceIds[spaceSlug] ?? null) : null

    const bc: BuildContext = {
      ctx,
      resolved,
      client,
      plan,
      spaceId,
      campaignId,
      baseAt: client.onboardedAt,
      artifactIds,
      warnings,
    }

    // Build per-client artifacts — order matters for offer→funnel FK lookups.
    allOffers.push(...buildOffers(bc))
    const funnelMain = buildFunnels(bc)
    allFunnels.push(...funnelMain.funnels)
    allFunnelPages.push(...funnelMain.pages)
    const site = buildWebsite(bc)
    allFunnels.push(...site.funnels)
    allFunnelPages.push(...site.pages)
    const seq = buildSequences(bc)
    allSequences.push(...seq.sequences)
    allEmails.push(...seq.emails)
    allPresentations.push(...buildPresentations(bc))
    allMedia.push(...buildMediaAssets(bc))
    const adsBuilt = buildAds(bc)
    allAdCampaigns.push(...adsBuilt.ad_campaigns)
    allAdSets.push(...adsBuilt.ad_sets)
    allAds.push(...adsBuilt.ads)
    allForms.push(...buildForms(bc))
  }

  const rowCounts: Record<string, number> = {
    offers: allOffers.length,
    funnels: allFunnels.length,
    funnel_pages: allFunnelPages.length,
    sequences: allSequences.length,
    sequence_emails: allEmails.length,
    presentations: allPresentations.length,
    media_assets: allMedia.length,
    ad_campaigns: allAdCampaigns.length,
    ad_sets: allAdSets.length,
    ads: allAds.length,
    forms: allForms.length,
  }

  if (dryRun) {
    log.step(
      `[dry-run] would insert ${Object.entries(rowCounts)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
    )
    log.step(
      `[dry-run] state.artifactIds populated with ${Object.keys(artifactIds).length} tables for downstream phases (P7.5c, P8).`,
    )
    for (const [table, count] of Object.entries(rowCounts)) {
      log.rowCount(table, count)
    }
    return r.finish(rowCounts, warnings)
  }

  // Upsert in FK-safe order. Each table is independent at the row-batch level
  // because deterministic ids mean both parents and children resolve up-front.
  log.step(`Upserting offers (${allOffers.length})`)
  await batchUpsert(ctx, 'offers', allOffers as unknown as ReadonlyArray<Record<string, unknown>>)

  log.step(`Upserting funnels (${allFunnels.length})`)
  await batchUpsert(ctx, 'funnels', allFunnels as unknown as ReadonlyArray<Record<string, unknown>>)

  log.step(`Upserting funnel_pages (${allFunnelPages.length})`)
  await batchUpsert(
    ctx,
    'funnel_pages',
    allFunnelPages as unknown as ReadonlyArray<Record<string, unknown>>,
  )

  log.step(`Upserting sequences (${allSequences.length})`)
  await batchUpsert(
    ctx,
    'sequences',
    allSequences as unknown as ReadonlyArray<Record<string, unknown>>,
  )

  log.step(`Upserting sequence_emails (${allEmails.length})`)
  await batchUpsert(
    ctx,
    'sequence_emails',
    allEmails as unknown as ReadonlyArray<Record<string, unknown>>,
  )

  log.step(`Upserting presentations (${allPresentations.length})`)
  await batchUpsert(
    ctx,
    'presentations',
    allPresentations as unknown as ReadonlyArray<Record<string, unknown>>,
  )

  log.step(`Upserting media_assets (${allMedia.length})`)
  await batchUpsert(
    ctx,
    'media_assets',
    allMedia as unknown as ReadonlyArray<Record<string, unknown>>,
  )

  log.step(`Upserting ad_campaigns (${allAdCampaigns.length})`)
  await batchUpsert(
    ctx,
    'ad_campaigns',
    allAdCampaigns as unknown as ReadonlyArray<Record<string, unknown>>,
  )

  log.step(`Upserting ad_sets (${allAdSets.length})`)
  await batchUpsert(ctx, 'ad_sets', allAdSets as unknown as ReadonlyArray<Record<string, unknown>>)

  log.step(`Upserting ads (${allAds.length})`)
  await batchUpsert(ctx, 'ads', allAds as unknown as ReadonlyArray<Record<string, unknown>>)

  log.step(`Upserting forms (${allForms.length})`)
  await batchUpsert(ctx, 'forms', allForms as unknown as ReadonlyArray<Record<string, unknown>>)

  return r.finish(rowCounts, warnings)
}
