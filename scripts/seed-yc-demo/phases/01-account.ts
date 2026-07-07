/**
 * P1 — Accounts (3 humans) + Org + Credits.
 *
 * - Create founder (known password) + Nico + Jules (random passwords) via
 *   supabase.auth.admin.createUser; signup trigger fires (writes profiles,
 *   user_profiles, brains, agents_registry).
 * - Insert a default ns_brains row per human (the signup trigger only
 *   populates the legacy `brains` table; downstream phases read `ns_brains`).
 * - Founder calls OrgService.createOrg via apps/api with internal-token
 *   impersonation (preserves seedCoreAgents + seedStarterCredits side effects).
 * - Add Nico + Jules as org_members (admin role) with backdated accepted_at.
 * - Top up org_credit_purchases with 50,000 extra credits + materialize
 *   org_monthly_credit_usage by hitting GET /org/:orgId/billing/status, which
 *   triggers OrgBillingService.getOrgBalance(orgId) auto-INSERT.
 */
import { randomBytes } from 'node:crypto'
import type { HumanPartner } from '../content/_types'
import { AGENCY, FOUNDER, HUMANS, JULES, NICO } from '../content/agency'
import { AGENCY_FOUNDED_AT, TODAY } from '../content/timeline'
import { startResult, type PhaseContext, type PhaseHandler } from './_context'

// YC-visible password for the founder login. Intentionally hardcoded — this
// is what gets printed in the credentials block at the end of the seeder.
const FOUNDER_KNOWN_PASSWORD = 'VibeyYC2026Demo'

const ORG_SLUG = 'foundry-creative'
const CREDIT_TOP_UP_AMOUNT = 50000

/** Tables that hold an `org_id` FK with no ON DELETE cascade to organizations. */
const ORG_DEPENDENT_TABLES = [
  // billing/credits
  'org_credit_purchases',
  'org_monthly_credit_usage',
  'org_member_credit_limits',
  'org_credit_auto_recharge',
  'org_subscriptions',
  // agents (seeded by OrgService.seedCoreAgents)
  'agent_team_grants',
  'agent_overrides',
  'agent_channels',
  'agent_skill_resources',
  'agent_skills',
  'agent_definitions',
  'agents_registry',
  'agent_teams',
  // brains scoped to org (campaign + customer + company brains and dependents)
  'ns_belief_patterns',
  'ns_perspectives',
  'ns_memory_connections',
  'ns_memory_versions',
  'ns_emotional_responses',
  'ns_memory_sessions',
  'ns_pending_captures',
  'ns_memories',
  'ns_snapshot_edges',
  'ns_snapshots',
  'ns_sk_evolution',
  'ns_sk_gaps',
  'ns_sk_entries',
  'ns_sk_sources',
  'ns_sk_curriculum',
  'ns_narrative_links',
  'ns_narrative_pages',
  'ns_brain_log',
  'ns_brain_lint_results',
  'customer_avatars',
  'company_cortex_signals',
  'company_cortex_dream_runs',
  'company_cortex_objects',
  'company_cortex_settings',
  'ns_brains',
  // campaigns + missions
  'campaign_nodes',
  'campaign_edges',
  'campaign_agents',
  'mission_subtasks',
  'mission_deliverables',
  'missions',
  'campaigns',
  // spaces
  'space_item_activity',
  'space_items',
  'space_view_overrides',
  'space_automation_runs',
  'space_automations',
  'space_drive_push_channels',
  'space_drive_folder_mappings',
  'space_external_automation_events',
  'space_external_automation_triggers',
  'space_item_shares',
  'space_shares',
  'spaces',
  // channels
  'channel_messages',
  'channel_memberships',
  'channels',
  // contacts
  'contact_identifiers',
  'contact_campaign_memberships',
  'contacts',
  // integrations
  'user_integrations',
  // marketing artifacts
  'ads',
  'ad_sets',
  'ad_campaigns',
  'forms',
  'sequence_emails',
  'sequences',
  'media_assets',
  'websites',
  'presentations',
  'funnel_pages',
  'funnels',
  'offers',
  'avatars',
  // brain ops / org_members
  'brain_ops_outbox',
  'org_members',
] as const

function resolvePassword(human: HumanPartner): string {
  if (human.passwordKind === 'known') return FOUNDER_KNOWN_PASSWORD
  return randomBytes(24).toString('base64url')
}

interface ImpersonatedFetchOptions {
  method: 'GET' | 'POST'
  path: string
  userId: string
  orgId?: string
  body?: unknown
}

/**
 * Hits apps/api with the internal-token impersonation pair recognised by
 * AuthGuard (`x-internal-token` + `x-user-id`). Kept inline because P1 is the
 * only phase that needs createOrg / getOrgBalance via HTTP.
 */
async function callApiAsUser(ctx: PhaseContext, opts: ImpersonatedFetchOptions): Promise<unknown> {
  const baseUrl = ctx.env.apiBaseUrl.replace(/\/$/, '')
  const url = `${baseUrl}${opts.path.startsWith('/') ? opts.path : `/${opts.path}`}`
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-internal-token': ctx.env.internalApiToken,
    'x-user-id': opts.userId,
  }
  if (opts.orgId) headers['x-org-id'] = opts.orgId

  const res = await fetch(url, {
    method: opts.method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${opts.method} ${opts.path} → ${res.status} ${res.statusText}: ${text}`)
  }
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

export const runP01Account: PhaseHandler = async (ctx) => {
  const r = startResult('01-account')
  const { iso } = ctx.timeline

  // ─── Deterministic IDs ──────────────────────────────────────────────
  const founderUserId = ctx.ids.id('user', 'founder')
  const nicoUserId = ctx.ids.id('user', 'nico')
  const julesUserId = ctx.ids.id('user', 'jules')
  const founderBrainId = ctx.ids.id('user-brain', 'founder')
  const nicoBrainId = ctx.ids.id('user-brain', 'nico')
  const julesBrainId = ctx.ids.id('user-brain', 'jules')
  const creditPurchaseId = ctx.ids.id('credit-purchase', 'foundry-creative', 'top-up')

  const userIdsByPartnerSlug: Record<string, string> = {
    founder: founderUserId,
    nico: nicoUserId,
    jules: julesUserId,
  }
  const brainIdsByPartnerSlug: Record<string, string> = {
    founder: founderBrainId,
    nico: nicoBrainId,
    jules: julesBrainId,
  }

  // Populate state up-front so downstream phases (and dry-run callers) can
  // consume them regardless of which branch we take.
  ctx.state.founderUserId = founderUserId
  ctx.state.founderEmail = FOUNDER.email
  ctx.state.founderPassword = FOUNDER_KNOWN_PASSWORD
  ctx.state.nicoUserId = nicoUserId
  ctx.state.julesUserId = julesUserId
  ctx.state.defaultUserBrainId = founderBrainId

  // ─── Dry-run: log intentions only ───────────────────────────────────
  if (ctx.dryRun) {
    ctx.log.step(`(dry) Would create 3 auth users: ${HUMANS.map((h) => h.email).join(', ')}`)
    ctx.log.step(`(dry) Founder id=${founderUserId} password=${FOUNDER_KNOWN_PASSWORD}`)
    ctx.log.step(`(dry) Nico id=${nicoUserId}, Jules id=${julesUserId} (random passwords)`)
    ctx.log.step('(dry) Would backdate profiles + user_profiles + ns_brains to joinedAt')
    ctx.log.step(`(dry) Would POST /org as founder { name: "${AGENCY.name}", slug: "${ORG_SLUG}" }`)
    ctx.log.step('(dry) Would backdate organizations.created_at = AGENCY_FOUNDED_AT')
    ctx.log.step('(dry) Would add Nico + Jules as org_members (admin/active)')
    ctx.log.step(`(dry) Would insert ${CREDIT_TOP_UP_AMOUNT}-credit top-up in org_credit_purchases`)
    ctx.log.step(
      '(dry) Would materialize org_monthly_credit_usage via GET /org/:orgId/billing/status',
    )
    ctx.log.step(
      `(dry) State seeded: founderUserId, nicoUserId, julesUserId, defaultUserBrainId=${founderBrainId}`,
    )
    ctx.log.step('(dry) orgId left undefined (depends on POST /org response)')
    return r.finish({})
  }

  // ─── Reset: tear down existing demo org + 3 humans ──────────────────
  if (ctx.reset) {
    ctx.log.step('Reset: tearing down existing Foundry Creative org + 3 humans')

    const { data: existingOrg, error: orgLookupErr } = await ctx.supabase
      .from('organizations')
      .select('id')
      .eq('slug', ORG_SLUG)
      .maybeSingle()
    if (orgLookupErr) throw new Error(`Reset: org lookup failed: ${orgLookupErr.message}`)

    if (existingOrg) {
      const oid = existingOrg.id as string
      ctx.log.step(`Reset: deleting dependents + org ${oid}`)
      for (const table of ORG_DEPENDENT_TABLES) {
        const { error } = await ctx.supabase.from(table).delete().eq('org_id', oid)
        if (error) throw new Error(`Reset: delete ${table}: ${error.message}`)
      }
      const { error: delOrgErr } = await ctx.supabase.from('organizations').delete().eq('id', oid)
      if (delOrgErr) throw new Error(`Reset: delete organizations: ${delOrgErr.message}`)
    } else {
      ctx.log.step('Reset: no existing Foundry Creative org found')
    }

    for (const human of HUMANS) {
      const uid = userIdsByPartnerSlug[human.slug]
      if (!uid) continue
      const { data: existingUser, error: getErr } = await ctx.supabase.auth.admin.getUserById(uid)
      if (getErr && !/not.?found/i.test(getErr.message)) {
        throw new Error(`Reset: getUserById(${uid}) failed: ${getErr.message}`)
      }
      if (existingUser?.user) {
        const { error: delErr } = await ctx.supabase.auth.admin.deleteUser(uid)
        if (delErr) throw new Error(`Reset: deleteUser(${uid}) failed: ${delErr.message}`)
        ctx.log.step(`Reset: deleted auth user ${human.email} (${uid})`)
      } else {
        ctx.log.step(`Reset: no existing auth user for ${human.email}`)
      }
    }
  }

  // ─── 1. Create 3 auth users (idempotent on deterministic id) ────────
  for (const human of HUMANS) {
    const uid = userIdsByPartnerSlug[human.slug]
    if (!uid) throw new Error(`Missing deterministic id for partner slug ${human.slug}`)

    const { data: existing, error: getErr } = await ctx.supabase.auth.admin.getUserById(uid)
    if (getErr && !/not.?found/i.test(getErr.message)) {
      throw new Error(`getUserById(${uid}) failed: ${getErr.message}`)
    }

    if (existing?.user) {
      const { error: metaErr } = await ctx.supabase.auth.admin.updateUserById(uid, {
        user_metadata: {
          ...(existing.user.user_metadata ?? {}),
          display_name: human.displayName,
          full_name: human.displayName,
        },
      })
      if (metaErr) {
        throw new Error(`updateUserMetadata(${human.email}) failed: ${metaErr.message}`)
      }
      ctx.log.step(`Auth user exists (metadata synced): ${human.email} (${uid})`)
      continue
    }

    const { error } = await ctx.supabase.auth.admin.createUser({
      id: uid,
      email: human.email,
      password: resolvePassword(human),
      email_confirm: true,
      user_metadata: {
        display_name: human.displayName,
        full_name: human.displayName,
      },
    })
    if (error) throw new Error(`createUser(${human.email}) failed: ${error.message}`)
    ctx.log.step(`Created auth user: ${human.email} (${uid})`)
  }

  // ─── 2. Backdate profiles + user_profiles to joinedAt ───────────────
  for (const human of HUMANS) {
    const uid = userIdsByPartnerSlug[human.slug]
    if (!uid) throw new Error(`Missing deterministic id for partner slug ${human.slug}`)
    const joinedAt = iso(human.joinedAt)

    const { error: profErr } = await ctx.supabase
      .from('profiles')
      .update({
        full_name: human.displayName,
        email: human.email,
        created_at: joinedAt,
        updated_at: joinedAt,
      })
      .eq('id', uid)
    if (profErr) throw new Error(`backdate profiles(${human.slug}): ${profErr.message}`)

    const { error: upErr } = await ctx.supabase
      .from('user_profiles')
      .update({
        display_name: human.displayName,
        created_at: joinedAt,
        updated_at: joinedAt,
      })
      .eq('id', uid)
    if (upErr) throw new Error(`backdate user_profiles(${human.slug}): ${upErr.message}`)
  }
  ctx.log.step('Backdated profiles + user_profiles for 3 humans')

  // ─── 3. Default ns_brains row per human ─────────────────────────────
  for (const human of HUMANS) {
    const uid = userIdsByPartnerSlug[human.slug]
    const bid = brainIdsByPartnerSlug[human.slug]
    if (!uid || !bid) throw new Error(`Missing id mapping for partner slug ${human.slug}`)
    const joinedAt = iso(human.joinedAt)

    const { error } = await ctx.supabase.from('ns_brains').upsert(
      {
        id: bid,
        owner_id: uid,
        name: 'My Brain',
        is_default: true,
        scope: 'user',
        created_at: joinedAt,
        updated_at: joinedAt,
      },
      { onConflict: 'id' },
    )
    if (error) throw new Error(`upsert ns_brains(${human.slug}): ${error.message}`)
  }
  ctx.log.step('Upserted 3 default user ns_brains')

  // ─── 4. Get-or-create org as founder via apps/api ───────────────────
  const { data: existingOrg, error: existingOrgErr } = await ctx.supabase
    .from('organizations')
    .select('id')
    .eq('slug', ORG_SLUG)
    .maybeSingle()
  if (existingOrgErr) throw new Error(`org lookup failed: ${existingOrgErr.message}`)

  let orgId: string
  if (existingOrg) {
    orgId = existingOrg.id as string
    ctx.log.step(`Org ${ORG_SLUG} already exists, id=${orgId}`)
  } else {
    const resp = (await callApiAsUser(ctx, {
      method: 'POST',
      path: '/org',
      userId: founderUserId,
      body: { name: AGENCY.name, slug: ORG_SLUG },
    })) as { success?: boolean; org?: { id?: string } }
    const returnedId = resp?.org?.id
    if (typeof returnedId !== 'string' || returnedId.length === 0) {
      throw new Error(`POST /org returned unexpected shape: ${JSON.stringify(resp)}`)
    }
    orgId = returnedId
    ctx.log.step(`Created org ${ORG_SLUG} via POST /org → ${orgId}`)
  }
  ctx.state.orgId = orgId

  // Backdate organizations.created_at to Week 1 founding.
  {
    const foundedIso = iso(AGENCY_FOUNDED_AT)
    const { error } = await ctx.supabase
      .from('organizations')
      .update({ created_at: foundedIso, updated_at: foundedIso })
      .eq('id', orgId)
    if (error) throw new Error(`backdate organizations: ${error.message}`)
  }

  // Founder org_members row was created by createOrg with now() timestamps —
  // realign it to the founding moment.
  {
    const foundedIso = iso(FOUNDER.joinedAt)
    const { error } = await ctx.supabase
      .from('org_members')
      .update({ accepted_at: foundedIso, created_at: foundedIso })
      .eq('org_id', orgId)
      .eq('user_id', founderUserId)
    if (error) throw new Error(`backdate founder org_members: ${error.message}`)
  }

  // ─── 5. Add Nico + Jules as org_members (admin) ─────────────────────
  for (const human of [NICO, JULES] as const) {
    const uid = userIdsByPartnerSlug[human.slug]
    if (!uid) throw new Error(`Missing deterministic id for ${human.slug}`)
    const joinedAt = iso(human.joinedAt)

    const { error } = await ctx.supabase.from('org_members').upsert(
      {
        org_id: orgId,
        user_id: uid,
        role: 'admin',
        status: 'active',
        invited_by: founderUserId,
        accepted_at: joinedAt,
        created_at: joinedAt,
      },
      { onConflict: 'org_id,user_id' },
    )
    if (error) throw new Error(`upsert org_members(${human.slug}): ${error.message}`)
  }
  ctx.log.step('Added Nico + Jules as org_members (admin, backdated)')

  // ─── 6. Top up org_credit_purchases (+50k) ──────────────────────────
  {
    const purchasedAt = iso(TODAY)
    const { error } = await ctx.supabase.from('org_credit_purchases').upsert(
      {
        id: creditPurchaseId,
        org_id: orgId,
        credits_purchased: CREDIT_TOP_UP_AMOUNT,
        amount_paid: 0,
        purchased_by: founderUserId,
        status: 'completed',
        created_at: purchasedAt,
      },
      { onConflict: 'id' },
    )
    if (error) throw new Error(`upsert org_credit_purchases: ${error.message}`)
  }
  ctx.log.step(`Top-up of ${CREDIT_TOP_UP_AMOUNT} credits inserted`)

  // ─── 7. Materialize org_monthly_credit_usage ────────────────────────
  // GET /org/:orgId/billing/status → OrgBillingService.getOrgBalance auto-
  // INSERTs the current-month usage row on first call.
  await callApiAsUser(ctx, {
    method: 'GET',
    path: `/org/${orgId}/billing/status`,
    userId: founderUserId,
    orgId,
  })
  ctx.log.step('Materialized org_monthly_credit_usage via GET /org/:orgId/billing/status')

  return r.finish({
    'auth.users': 3,
    profiles: 3,
    organizations: 1,
    org_members: 2,
    org_credit_purchases: 1,
    org_monthly_credit_usage: 1,
  })
}
