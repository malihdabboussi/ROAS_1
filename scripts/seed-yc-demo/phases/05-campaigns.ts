/**
 * P5 — Campaigns (+ campaign brains + knowledge nodes + agents).
 *
 * 9 campaigns:
 *   - 6 client retainers (one per ClientPersona in content/clients.ts)
 *   - Internal Ops, Sales/Pipeline, Company Wiki
 *
 * Implementation goes direct via service-role (not POST /campaigns) because:
 *   - POST /campaigns body doesn't accept an `id` field, so we can't pass our
 *     deterministic UUID through the controller.
 *   - We need backdated created_at on `campaigns` (the controller defaults to
 *     now()).
 *   - CampaignsService.ensureCampaignBrain is straightforward to inline here
 *     (single INSERT into ns_brains with campaign_id) and lets us backdate
 *     the brain too.
 *
 * For each campaign we:
 *   1. UPSERT into `campaigns` with the deterministic id, name, status, goal,
 *      context, config (with seed_slug + client_slug). created_at/updated_at
 *      backdated to def.createdAt.
 *   2. UPSERT into `ns_brains` (scope='campaign', campaign_id=<id>) with
 *      ctx.ids.id('ns-brain-campaign', orgId, slug) so brain id is
 *      deterministic and downstream phases can compute it.
 *   3. UPSERT campaign_nodes (3-5 per client campaign, 5-8 per internal one)
 *      drawn from each client's voice/retainerScope or Foundry's house docs.
 *   4. UPSERT campaign_agents for the locked client×team matrix, plus the
 *      core agents (vibey + atlas — matches CampaignsService
 *      ensureCoreCampaignAgents behavior).
 *
 * State written:
 *   - state.campaignIds[slug]      → campaigns.id
 *   - state.campaignBrainIds[slug] → ns_brains.id (campaign brain)
 *
 * Reset cascade: P01 already deletes the org → campaigns cascade to
 * campaign_nodes / campaign_agents / ns_brains (via campaign_id FK).
 */
import { AGENCY } from '../content/agency'
import { CLIENTS } from '../content/clients'
import { TEAM } from '../content/team'
import { AGENCY_FOUNDED_AT } from '../content/timeline'
import { startResult, type PhaseContext, type PhaseHandler, type PhaseState } from './_context'

const PHASE_ID = '05-campaigns'

const KNOWN_HIRED_AGENT_KEYS: readonly string[] = [
  'maya',
  'leo',
  'sara',
  'devon',
  'casey',
  'riley',
  'owen',
]

const CORE_AGENT_KEYS: readonly string[] = ['vibey', 'atlas']

/** All 9 campaign slugs in registry order. */
const CAMPAIGN_ORDER: readonly string[] = [
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

interface CampaignDefInline {
  slug: string
  name: string
  /** Stored in config.kind (campaigns.campaign_type is constrained to
   *  ('get-more-leads','book-more-calls','launch-a-webinar'); the demo's
   *  semantic kind goes in config). */
  kind: 'client' | 'internal' | 'sales' | 'wiki'
  /** Stable client slug if a client campaign; null otherwise. */
  clientSlug: string | null
  goal: string
  context: string
  /** When the campaign was created. */
  createdAt: Date
  /** campaigns.status — must be one of draft/active/paused/completed/archived. */
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  /** Agent names from content/team.ts (display-cased). */
  agentNames: string[]
  /** What knowledge nodes to seed for this campaign. */
  knowledgeNodes: KnowledgeNodeSeed[]
}

interface KnowledgeNodeSeed {
  slug: string
  title: string
  content: string
  /** campaign_nodes.node_type — must satisfy the check constraint. */
  nodeType:
    | 'document'
    | 'agent_learning'
    | 'user_upload'
    | 'offer'
    | 'avatar'
    | 'theme'
    | 'deliverable'
    | 'url_import'
  /** When the node was captured (drives created_at). */
  capturedAt: Date
  /** Domain tag stored on the node. */
  domain: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
}

// ─── Knowledge node content builders ──────────────────────────────────────

function clientVoiceCheatsheet(client: (typeof CLIENTS)[number]): string {
  const toneLine = client.voice.tone.join(', ')
  const keywords = client.voice.keywords.join(', ')
  const avoid = client.voice.avoid.join(', ')
  return [
    `${client.name} voice cheatsheet — keep every line on register.`,
    '',
    `Tone: ${toneLine}.`,
    `Use: ${keywords}.`,
    `Avoid: ${avoid}.`,
    '',
    `Brand colors locked: primary ${client.brand.primary}, secondary ${client.brand.secondary}, accent ${client.brand.accent}.`,
    `Naming pattern: ${client.namingPattern}.`,
  ].join('\n')
}

function clientPositioningBrief(client: (typeof CLIENTS)[number]): string {
  return [
    `${client.name} — positioning brief (working draft).`,
    '',
    `Retainer scope: ${client.retainerScope}`,
    '',
    `Vertical: ${client.vertical}. We are not optimizing for awareness — we are optimizing for the line a buyer can repeat without our deck in front of them.`,
    'Maya owns the positioning doc. Sara owns the voice. We refuse any copy that a competitor could paste under their own logo.',
  ].join('\n')
}

function clientRetainerSop(client: (typeof CLIENTS)[number]): string {
  return [
    `${client.name} — retainer SOP.`,
    '',
    'Weekly cadence: Tuesday async update (Riley) + Thursday review (Maya + lead). Anything outside scope routes to a written change-order before work starts.',
    'Approvals: copy ships when Sara + the client lead sign off in the doc, not in a Slack thread. Visuals ship when Casey signs off at 14px and at a billboard.',
    `In-scope: ${client.retainerScope}`,
    'Out of scope without a change order: anything that adds a net-new channel, swaps the offer, or rewrites the positioning doc.',
  ].join('\n')
}

function clientKickoffRetro(client: (typeof CLIENTS)[number]): string {
  return [
    `${client.name} — kickoff retro snippet.`,
    '',
    'What worked: customer interviews ran before brief; founder voice is in the doc verbatim; the trade-off is named on slide two.',
    'What did not: scope language too soft on the first SOW — Owen tightened it for v2.',
    'What we are watching: any drift between the positioning doc and the next paid creative. The brand and the spend have to agree.',
  ].join('\n')
}

function buildClientNodes(
  client: (typeof CLIENTS)[number],
  ctx: PhaseContext,
): KnowledgeNodeSeed[] {
  const { after } = ctx.timeline
  const onboarded = client.onboardedAt
  return [
    {
      slug: 'positioning-brief',
      title: `${client.name} — positioning brief`,
      content: clientPositioningBrief(client),
      nodeType: 'document',
      capturedAt: after(onboarded, 1, 14, 0),
      domain: 'strategy',
    },
    {
      slug: 'voice-cheatsheet',
      title: `${client.name} — voice cheatsheet`,
      content: clientVoiceCheatsheet(client),
      nodeType: 'document',
      capturedAt: after(onboarded, 2, 10, 0),
      domain: 'creative',
    },
    {
      slug: 'retainer-sop',
      title: `${client.name} — retainer SOP`,
      content: clientRetainerSop(client),
      nodeType: 'document',
      capturedAt: after(onboarded, 3, 11, 0),
      domain: 'operations',
    },
    {
      slug: 'kickoff-retro',
      title: `${client.name} — kickoff retro`,
      content: clientKickoffRetro(client),
      nodeType: 'document',
      capturedAt: after(onboarded, 7, 16, 0),
      domain: 'operations',
    },
  ]
}

function buildOpsNodes(ctx: PhaseContext): KnowledgeNodeSeed[] {
  const { after } = ctx.timeline
  const founded = AGENCY_FOUNDED_AT
  const items: {
    slug: string
    title: string
    body: string
    days: number
    domain: KnowledgeNodeSeed['domain']
  }[] = [
    {
      slug: 'six-clients-policy',
      title: 'Foundry — six clients a year',
      body: 'We pick six retainers a year on purpose. The seventh is a "no" we owe the team. Owen tracks the count and the partners say the no.',
      days: 1,
      domain: 'strategy',
    },
    {
      slug: 'approvals-sop',
      title: 'Foundry — approvals SOP',
      body: 'Copy ships when Sara + the client lead sign off in the doc, not in a thread. Visuals ship when Casey signs off at 14px and at a billboard. Anything else is not approved, it is "noted".',
      days: 3,
      domain: 'operations',
    },
    {
      slug: 'pricing-floor',
      title: 'Foundry — pricing floor',
      body: 'Below this margin we walk. Owen owns the model. Garry signs the exceptions in writing or they did not happen.',
      days: 5,
      domain: 'finance',
    },
    {
      slug: 'retro-standard',
      title: 'Foundry — weekly retro standard',
      body: 'What worked, what did not, what we are watching. Three lines each. No paragraphs. Jules runs the doc, the team signs in 10 minutes or it gets cancelled.',
      days: 7,
      domain: 'operations',
    },
    {
      slug: 'scope-creep-playbook',
      title: 'Foundry — scope-creep playbook',
      body: 'Scope-creep emails go to Riley first. Riley names the change as a change-order in writing. If it is not in writing, it did not happen.',
      days: 9,
      domain: 'operations',
    },
    {
      slug: 'on-call-rota',
      title: 'Foundry — on-call rota',
      body: 'Founder for the first 48 hours of a new retainer. Riley after that. Owen escalates only when a P&L line moves more than a quarter point.',
      days: 12,
      domain: 'operations',
    },
    {
      slug: 'vendor-renewals',
      title: 'Foundry — vendor renewal cadence',
      body: 'Owen reviews every recurring vendor 30 days before auto-renew. Renewals do not renegotiate themselves.',
      days: 16,
      domain: 'finance',
    },
  ]
  return items.map((it) => ({
    slug: it.slug,
    title: it.title,
    content: `${it.title}\n\n${it.body}`,
    nodeType: 'document',
    capturedAt: after(founded, it.days, 10, 0),
    domain: it.domain,
  }))
}

function buildSalesNodes(ctx: PhaseContext): KnowledgeNodeSeed[] {
  const { after } = ctx.timeline
  const founded = AGENCY_FOUNDED_AT
  const items: {
    slug: string
    title: string
    body: string
    days: number
    domain: KnowledgeNodeSeed['domain']
  }[] = [
    {
      slug: 'discovery-format',
      title: 'Foundry — discovery call format',
      body: 'No pitch deck on a first call. Three customer questions, one trade-off question, one budget question. We listen to the words they use.',
      days: 4,
      domain: 'marketing',
    },
    {
      slug: 'qualification-rubric',
      title: 'Foundry — qualification rubric',
      body: 'Brand AND growth on the same retainer. Founder available 2 hours/week. Pricing floor cleared. Otherwise no.',
      days: 6,
      domain: 'strategy',
    },
    {
      slug: 'no-pitch-policy',
      title: 'Foundry — no pitch on logo work',
      body: 'We do not pitch on logo work. If that is the brief, we send the rejection-with-care template and move on.',
      days: 8,
      domain: 'strategy',
    },
    {
      slug: 'proposal-kit',
      title: 'Foundry — proposal kit narrative',
      body: 'One position, one trade-off, one before/after. No "world-class". No three-option theatre. The proposal reads like the founder talking.',
      days: 12,
      domain: 'marketing',
    },
    {
      slug: 'outbound-experiment',
      title: 'Foundry — outbound experiment plan',
      body: 'Two operators a week, by name, hand-written intro. Kill criterion: no reply means kill at 21 days, no exceptions.',
      days: 18,
      domain: 'marketing',
    },
    {
      slug: 'lost-deal-retro',
      title: 'Foundry — lost-deal retro standard',
      body: 'Lost the deal? Write a line. Was it price, fit, timing, or voice? Nico keeps the count and we revisit at quarter close.',
      days: 24,
      domain: 'operations',
    },
  ]
  return items.map((it) => ({
    slug: it.slug,
    title: it.title,
    content: `${it.title}\n\n${it.body}`,
    nodeType: 'document',
    capturedAt: after(founded, it.days, 11, 0),
    domain: it.domain,
  }))
}

function buildWikiNodes(ctx: PhaseContext): KnowledgeNodeSeed[] {
  const { after } = ctx.timeline
  const founded = AGENCY_FOUNDED_AT
  const items: {
    slug: string
    title: string
    body: string
    days: number
    domain: KnowledgeNodeSeed['domain']
  }[] = [
    {
      slug: 'who-we-are-not',
      title: 'Foundry — who we are not',
      body: AGENCY.voice.dont.slice(0, 5).join(' '),
      days: 1,
      domain: 'strategy',
    },
    {
      slug: 'house-tagline',
      title: 'Foundry — house tagline',
      body: AGENCY.tagline,
      days: 1,
      domain: 'strategy',
    },
    {
      slug: 'voice-cheatsheet',
      title: 'Foundry — voice cheatsheet',
      body: `Tone: ${AGENCY.voice.tone.join(', ')}.\n\nDo: ${AGENCY.voice.do
        .slice(0, 5)
        .join(' ')}\n\nDon't: ${AGENCY.voice.dont.slice(0, 5).join(' ')}`,
      days: 2,
      domain: 'creative',
    },
    {
      slug: 'brand-growth-loop',
      title: 'Foundry — brand and growth are the same job',
      body: 'A positioning doc that nobody runs ads against is a Notion page. A funnel that converts on language the founder would not use in a customer call is a debt. We take both halves of the loop on retainer.',
      days: 4,
      domain: 'strategy',
    },
    {
      slug: 'kickoff-sop',
      title: 'Foundry — kickoff SOP',
      body: 'Three customer interviews before the brief. Founder voice in the doc verbatim. Positioning trade-off named on slide two. Nico signs the kickoff before any creative work starts.',
      days: 6,
      domain: 'operations',
    },
    {
      slug: 'brain-domain-map',
      title: 'Foundry — brain domain map',
      body: 'Brand: positioning, voice, narrative. Growth: paid acquisition, growth experiments. Delivery: web development, accounts. Ops: operations, pricing.',
      days: 9,
      domain: 'strategy',
    },
    {
      slug: 'anti-patterns',
      title: 'Foundry — anti-patterns to retire',
      body: 'Async-only approvals. Brand work without a paid hypothesis. Three-option proposals where two are obviously wrong. Decks instead of working docs.',
      days: 14,
      domain: 'strategy',
    },
  ]
  return items.map((it) => ({
    slug: it.slug,
    title: it.title,
    content: `${it.title}\n\n${it.body}`,
    nodeType: 'document',
    capturedAt: after(founded, it.days, 12, 0),
    domain: it.domain,
  }))
}

// ─── Campaign definitions ────────────────────────────────────────────────

function buildCampaignDefs(ctx: PhaseContext): CampaignDefInline[] {
  const clientBySlug = new Map(CLIENTS.map((c) => [c.slug, c] as const))

  function client(slug: string): (typeof CLIENTS)[number] {
    const c = clientBySlug.get(slug)
    if (!c) throw new Error(`buildCampaignDefs: unknown client slug "${slug}"`)
    return c
  }

  const clientAgents: Record<string, string[]> = {
    acme: ['Maya', 'Leo', 'Sara', 'Devon', 'Riley'],
    beta: ['Maya', 'Sara', 'Casey', 'Leo', 'Riley'],
    gamma: ['Maya', 'Sara', 'Leo', 'Riley', 'Devon'],
    delta: ['Maya', 'Sara', 'Casey', 'Riley'],
    epsilon: ['Maya', 'Sara', 'Riley', 'Owen'],
    zeta: ['Maya', 'Sara', 'Casey', 'Riley'],
  }

  const clientDefs: CampaignDefInline[] = CLIENTS.map((c) => {
    const agents = clientAgents[c.slug]
    if (!agents) {
      throw new Error(`buildCampaignDefs: no agent matrix entry for client "${c.slug}"`)
    }
    return {
      slug: c.slug,
      name: `${c.name} Retainer`,
      kind: 'client',
      clientSlug: c.slug,
      goal: `Run the ${c.name} retainer end-to-end — brand and growth on the same loop, no hand-offs.`,
      context: c.retainerScope,
      createdAt: c.onboardedAt,
      status: 'active',
      agentNames: agents,
      knowledgeNodes: buildClientNodes(client(c.slug), ctx),
    }
  })

  const opsDef: CampaignDefInline = {
    slug: 'internal-ops',
    name: 'Internal Ops',
    kind: 'internal',
    clientSlug: null,
    goal: 'Keep the studio honest. Margin, utilization, vendor renewals, and the SOPs nobody else wants to write.',
    context:
      'Owen owns the model. Riley owns the calendar. Decisions land here before they land in a client thread.',
    createdAt: AGENCY_FOUNDED_AT,
    status: 'active',
    agentNames: ['Owen', 'Riley'],
    knowledgeNodes: buildOpsNodes(ctx),
  }

  const salesDef: CampaignDefInline = {
    slug: 'sales',
    name: 'Sales & Pipeline',
    kind: 'sales',
    clientSlug: null,
    goal: 'Pick six retainers a year on purpose. Say no to the rest with care, in writing, and once.',
    context:
      'Inbound + outbound pipeline across the studio. Two operators a week, by name, hand-written. No pitch on logo work.',
    createdAt: ctx.timeline.after(AGENCY_FOUNDED_AT, 3, 11, 0),
    status: 'active',
    agentNames: ['Riley', 'Maya', 'Owen'],
    knowledgeNodes: buildSalesNodes(ctx),
  }

  const wikiDef: CampaignDefInline = {
    slug: 'wiki',
    name: 'Company Wiki',
    kind: 'wiki',
    clientSlug: null,
    goal: 'One place for the standards, the SOPs, and the lines we refuse to cross.',
    context:
      'Foundry house docs — voice, kickoff, approvals, retros, anti-patterns. Owen + Maya keep it honest.',
    createdAt: AGENCY_FOUNDED_AT,
    status: 'active',
    agentNames: ['Maya', 'Owen'],
    knowledgeNodes: buildWikiNodes(ctx),
  }

  const all = [...clientDefs, opsDef, salesDef, wikiDef]
  // Order strictly by CAMPAIGN_ORDER so log/output is stable.
  const bySlug = new Map(all.map((d) => [d.slug, d] as const))
  const ordered: CampaignDefInline[] = []
  for (const slug of CAMPAIGN_ORDER) {
    const d = bySlug.get(slug)
    if (!d) throw new Error(`buildCampaignDefs: missing definition for "${slug}"`)
    ordered.push(d)
  }
  if (ordered.length !== 9) {
    throw new Error(`buildCampaignDefs: expected 9 campaigns, got ${ordered.length}`)
  }
  return ordered
}

// ─── State guards ────────────────────────────────────────────────────────

interface RequiredP05State {
  orgId: string
  founderUserId: string
  hiredAgentKeys: readonly string[]
}

function populateDryRunStateIfEmpty(ctx: PhaseContext): void {
  if (!ctx.dryRun) return
  const state: PhaseState = ctx.state
  if (!state.orgId) state.orgId = ctx.ids.id('org', 'foundry-creative')
  if (!state.founderUserId) state.founderUserId = ctx.ids.id('user', 'founder')
  if (!state.hiredAgentKeys || state.hiredAgentKeys.length === 0) {
    state.hiredAgentKeys = [...KNOWN_HIRED_AGENT_KEYS]
  }
}

function requirePriorState(ctx: PhaseContext): RequiredP05State {
  const orgId = ctx.state.orgId
  const founderUserId = ctx.state.founderUserId
  const hiredAgentKeys = ctx.state.hiredAgentKeys ?? []
  if (!orgId) throw new Error(`${PHASE_ID}: missing state.orgId (set by P01).`)
  if (!founderUserId) throw new Error(`${PHASE_ID}: missing state.founderUserId (set by P01).`)
  if (hiredAgentKeys.length === 0) {
    throw new Error(`${PHASE_ID}: missing state.hiredAgentKeys (set by P04).`)
  }
  return { orgId, founderUserId, hiredAgentKeys }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function agentKeyFromName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'agent'
  )
}

function hireByName(name: string): (typeof TEAM)[number] | undefined {
  for (const h of TEAM) {
    if (h.name === name) return h
  }
  return undefined
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b
}

// ─── Phase handler ──────────────────────────────────────────────────────

export const runP05Campaigns: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  ctx.log.step('P5 — campaigns + campaign brains + knowledge nodes + agents')

  populateDryRunStateIfEmpty(ctx)
  const { orgId, founderUserId, hiredAgentKeys } = requirePriorState(ctx)

  const defs = buildCampaignDefs(ctx)
  const { iso } = ctx.timeline

  // Reserve state shapes so downstream phases have something to read even on
  // an early throw (matches the P4 pattern).
  ctx.state.campaignIds = ctx.state.campaignIds ?? {}
  ctx.state.campaignBrainIds = ctx.state.campaignBrainIds ?? {}

  const rowCounts: Record<string, number> = {
    campaigns: 0,
    'ns_brains (scope=campaign)': 0,
    campaign_nodes: 0,
    campaign_agents: 0,
  }

  for (const def of defs) {
    const campaignId = ctx.ids.id('campaign', orgId, def.slug)
    const brainId = ctx.ids.id('ns-brain-campaign', orgId, def.slug)
    const createdAtIso = iso(def.createdAt)

    ctx.state.campaignIds[def.slug] = campaignId
    ctx.state.campaignBrainIds[def.slug] = brainId

    if (ctx.dryRun) {
      ctx.log.step(
        `  [dry-run] campaign "${def.slug}" id=${campaignId} kind=${def.kind} status=${def.status} createdAt=${createdAtIso}`,
      )
      ctx.log.step(`             brain id=${brainId}`)
      ctx.log.step(
        `             agents (${def.agentNames.length + CORE_AGENT_KEYS.length}): ${[...def.agentNames.map(agentKeyFromName), ...CORE_AGENT_KEYS].join(', ')}`,
      )
      ctx.log.step(`             knowledge nodes: ${def.knowledgeNodes.length}`)
      rowCounts.campaigns = (rowCounts.campaigns ?? 0) + 1
      rowCounts['ns_brains (scope=campaign)'] = (rowCounts['ns_brains (scope=campaign)'] ?? 0) + 1
      rowCounts.campaign_nodes = (rowCounts.campaign_nodes ?? 0) + def.knowledgeNodes.length
      rowCounts.campaign_agents =
        (rowCounts.campaign_agents ?? 0) + def.agentNames.length + CORE_AGENT_KEYS.length
      continue
    }

    // ── 1) UPSERT campaigns row ────────────────────────────────────────
    const campaignRow = {
      id: campaignId,
      user_id: founderUserId,
      org_id: orgId,
      name: def.name,
      campaign_type: 'get-more-leads',
      status: def.status,
      goal: { statement: def.goal },
      context: {
        purpose: def.goal,
        strategy: def.context,
        result: '',
        off_limits: [],
        north_star_defined_at: createdAtIso,
      },
      config: {
        kind: def.kind,
        seed_slug: def.slug,
        client_slug: def.clientSlug,
      },
      created_at: createdAtIso,
      updated_at: createdAtIso,
    }
    const { error: campErr } = await ctx.supabase
      .from('campaigns')
      .upsert(campaignRow, { onConflict: 'id', ignoreDuplicates: false })
    if (campErr) {
      throw new Error(`${PHASE_ID}: upsert campaigns(${def.slug}) failed: ${campErr.message}`)
    }
    rowCounts.campaigns = (rowCounts.campaigns ?? 0) + 1

    // ── 2) UPSERT campaign brain (ns_brains scope='campaign') ──────────
    // Unique index idx_ns_brains_campaign forces one brain per campaign — if
    // a prior run inserted with a different id, that index would block this
    // INSERT. We resolve that by looking up the existing brain first; if it
    // exists, reuse its id (and record that in state). Otherwise INSERT with
    // our deterministic id.
    const { data: existingBrain, error: brainLookupErr } = await ctx.supabase
      .from('ns_brains')
      .select('id')
      .eq('campaign_id', campaignId)
      .maybeSingle()
    if (brainLookupErr) {
      throw new Error(
        `${PHASE_ID}: ns_brains lookup for campaign ${def.slug} failed: ${brainLookupErr.message}`,
      )
    }

    let resolvedBrainId: string
    if (existingBrain?.id) {
      resolvedBrainId = String(existingBrain.id)
      const { error: brainUpdErr } = await ctx.supabase
        .from('ns_brains')
        .update({
          owner_id: founderUserId,
          org_id: orgId,
          name: def.name,
          scope: 'campaign',
          is_default: false,
          color: '#6366F1',
          icon: 'campaign',
          created_at: createdAtIso,
          updated_at: createdAtIso,
        })
        .eq('id', resolvedBrainId)
      if (brainUpdErr) {
        throw new Error(
          `${PHASE_ID}: update ns_brains (campaign ${def.slug}) failed: ${brainUpdErr.message}`,
        )
      }
    } else {
      resolvedBrainId = brainId
      const { error: brainInsErr } = await ctx.supabase.from('ns_brains').insert({
        id: brainId,
        owner_id: founderUserId,
        org_id: orgId,
        campaign_id: campaignId,
        name: def.name,
        scope: 'campaign',
        is_default: false,
        color: '#6366F1',
        icon: 'campaign',
        tags: [],
        created_at: createdAtIso,
        updated_at: createdAtIso,
      })
      if (brainInsErr) {
        throw new Error(
          `${PHASE_ID}: insert ns_brains (campaign ${def.slug}) failed: ${brainInsErr.message}`,
        )
      }
    }
    ctx.state.campaignBrainIds[def.slug] = resolvedBrainId
    rowCounts['ns_brains (scope=campaign)'] = (rowCounts['ns_brains (scope=campaign)'] ?? 0) + 1

    // ── 3) UPSERT campaign_nodes (knowledge) ───────────────────────────
    const nodeRows = def.knowledgeNodes.map((node) => {
      const at = iso(node.capturedAt)
      return {
        id: ctx.ids.id('campaign-node', campaignId, node.slug),
        campaign_id: campaignId,
        user_id: founderUserId,
        node_type: node.nodeType,
        title: node.title,
        content: node.content,
        source_type: 'upload' as const,
        source_id: `seed:${def.slug}:${node.slug}`,
        domain: node.domain,
        metadata: { seed_slug: node.slug, seeded_by: 'yc-demo-p05' },
        created_at: at,
        updated_at: at,
      }
    })
    if (nodeRows.length > 0) {
      const { error: nodeErr } = await ctx.supabase
        .from('campaign_nodes')
        .upsert(nodeRows, { onConflict: 'id', ignoreDuplicates: false })
      if (nodeErr) {
        throw new Error(
          `${PHASE_ID}: upsert campaign_nodes for ${def.slug} failed: ${nodeErr.message}`,
        )
      }
      rowCounts.campaign_nodes = (rowCounts.campaign_nodes ?? 0) + nodeRows.length
    }

    // ── 4) UPSERT campaign_agents (named hires + core) ────────────────
    const namedRows = def.agentNames
      .map((name) => {
        const hire = hireByName(name)
        if (!hire) {
          throw new Error(
            `${PHASE_ID}: agentNames for "${def.slug}" references unknown name "${name}"`,
          )
        }
        const agentKey = agentKeyFromName(hire.name)
        if (!hiredAgentKeys.includes(agentKey)) {
          // Hire was rolled back in P04 (gateway sync warning). Skip this
          // assignment — campaign team will be missing the agent, surfaced
          // at P12 verify.
          return null
        }
        const joinedAt = maxDate(def.createdAt, hire.hiredAt)
        const joinedAtIso = iso(joinedAt)
        return {
          id: ctx.ids.id('campaign-agent', campaignId, agentKey),
          campaign_id: campaignId,
          user_id: founderUserId,
          org_id: orgId,
          agent_key: agentKey,
          name: hire.name,
          status: 'idle' as const,
          created_at: joinedAtIso,
          updated_at: joinedAtIso,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)

    const coreRows = CORE_AGENT_KEYS.map((agentKey) => ({
      id: ctx.ids.id('campaign-agent', campaignId, agentKey),
      campaign_id: campaignId,
      user_id: founderUserId,
      org_id: orgId,
      agent_key: agentKey,
      name: agentKey.charAt(0).toUpperCase() + agentKey.slice(1),
      status: 'idle' as const,
      created_at: createdAtIso,
      updated_at: createdAtIso,
    }))

    const allAgentRows = [...namedRows, ...coreRows]
    if (allAgentRows.length > 0) {
      const { error: agentErr } = await ctx.supabase
        .from('campaign_agents')
        .upsert(allAgentRows, { onConflict: 'campaign_id,agent_key', ignoreDuplicates: false })
      if (agentErr) {
        throw new Error(
          `${PHASE_ID}: upsert campaign_agents for ${def.slug} failed: ${agentErr.message}`,
        )
      }
      rowCounts.campaign_agents = (rowCounts.campaign_agents ?? 0) + allAgentRows.length
    }

    ctx.log.step(
      `  ${def.slug}: campaign ${campaignId} + brain ${resolvedBrainId} + ${nodeRows.length} nodes + ${allAgentRows.length} agents`,
    )
  }

  return r.finish(rowCounts)
}
