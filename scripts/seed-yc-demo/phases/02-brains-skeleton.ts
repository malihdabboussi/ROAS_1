/**
 * P2 — Brains skeleton + cortex_max ON.
 *
 * Runs after P01 has provisioned the founder, the org, and the founder's
 * default user brain (created via OrgService.createOrg → seedCoreAgents).
 *
 * Responsibilities:
 *   - Flip ns_brains.cortex_max = true on the founder's default user brain.
 *   - Backdate ns_brains.created_at on the default user brain to
 *     AGENCY_FOUNDED_AT so it reads as 90 days old.
 *   - Replicate CompanyCortexService.getOrCreateCompanyCortex inline
 *     (service uses BrainAuthGuard + user JWT; the seeder runs as
 *     service role via the internal token, so we go direct).
 *       · INSERT ns_brains scope='company' (cortex_max=true).
 *       · INSERT company_cortex_settings (enabled=true, schedule='daily').
 *       · Backdate company_cortex_settings.created_at to
 *         COMPANY_CORTEX_ENABLED_AT (Week 8) and
 *         last_successful_dream_at to dayOffset(1).
 *   - INSERT ns_brains scope='customer' (cortex_max=true,
 *     last_avatar_synthesis_at = dayOffset(4)).
 *   - Initialize ctx.state.agentBrainIds = {} (populated by P4).
 *
 * Deterministic UUIDs (via ctx.ids) make the phase idempotent and let later
 * phases compute the brain ids without coordinating.
 */
import {
  AGENCY_FOUNDED_AT,
  COMPANY_CORTEX_ENABLED_AT,
  CORTEX_MAX_ENABLED_AT,
} from '../content/timeline'
import { startResult, type PhaseContext, type PhaseHandler } from './_context'

const PHASE_ID = '02-brains-skeleton'

const COMPANY_CORTEX_INCLUDE_SOURCES_DEFAULT: readonly string[] = [
  'conversations',
  'channel_messages',
  'space_item_activity',
  'space_item_deliverables',
  'conversation_documents',
]

interface RequiredP01State {
  orgId: string
  founderUserId: string
  defaultUserBrainId: string
}

/**
 * Populate state with the deterministic IDs P01 would have set, so a
 * single-phase dry run (`--dry-run --phase=02-brains-skeleton`) can execute
 * in isolation. Only fires when both `dryRun` is on AND state is empty —
 * never overrides values set by a real P01 run.
 */
function populateDryRunStateIfEmpty(ctx: PhaseContext): void {
  if (!ctx.dryRun) return
  if (ctx.state.orgId) return

  const founderUserId = ctx.ids.id('user', 'founder')
  const nicoUserId = ctx.ids.id('user', 'nico')
  const julesUserId = ctx.ids.id('user', 'jules')
  const orgId = ctx.ids.id('org', 'foundry-creative')
  const defaultUserBrainId = ctx.ids.id('brain', 'user', 'founder')

  ctx.state.founderUserId = founderUserId
  ctx.state.nicoUserId = nicoUserId
  ctx.state.julesUserId = julesUserId
  ctx.state.orgId = orgId
  ctx.state.defaultUserBrainId = defaultUserBrainId

  ctx.log.step(
    `Dry-run state seed: orgId=${orgId} founderUserId=${founderUserId} defaultUserBrainId=${defaultUserBrainId}`,
  )
}

function requireP01State(ctx: PhaseContext): RequiredP01State {
  const orgId = ctx.state.orgId
  const founderUserId = ctx.state.founderUserId
  const defaultUserBrainId = ctx.state.defaultUserBrainId
  if (!orgId || !founderUserId || !defaultUserBrainId) {
    throw new Error(
      `${PHASE_ID}: missing state from P01 (orgId=${orgId ?? '∅'} founderUserId=${
        founderUserId ?? '∅'
      } defaultUserBrainId=${defaultUserBrainId ?? '∅'}). Run --phase=01-account first.`,
    )
  }
  return { orgId, founderUserId, defaultUserBrainId }
}

export const runP02BrainsSkeleton: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  ctx.log.step('P2 — brains skeleton + cortex_max ON')

  populateDryRunStateIfEmpty(ctx)
  const { orgId, founderUserId, defaultUserBrainId } = requireP01State(ctx)

  if (ctx.reset) {
    ctx.log.step('Reset mode: P01 already cascaded teardown of org brains; proceeding.')
  }

  const companyBrainId = ctx.ids.id('brain', 'company', orgId)
  const customerBrainId = ctx.ids.id('brain', 'customer', orgId)

  const userBrainCreatedAtIso = ctx.timeline.iso(AGENCY_FOUNDED_AT)
  const cortexMaxFlippedAtIso = ctx.timeline.iso(CORTEX_MAX_ENABLED_AT)
  const companyBrainCreatedAtIso = ctx.timeline.iso(AGENCY_FOUNDED_AT)
  const companySettingsCreatedAtIso = ctx.timeline.iso(COMPANY_CORTEX_ENABLED_AT)
  const lastDreamAtIso = ctx.timeline.iso(ctx.timeline.dayOffset(1, 2, 30))
  const customerBrainCreatedAtIso = ctx.timeline.iso(AGENCY_FOUNDED_AT)
  const lastAvatarSynthesisAtIso = ctx.timeline.iso(ctx.timeline.dayOffset(4, 14, 0))

  const userBrainUpdate = {
    cortex_max: true,
    created_at: userBrainCreatedAtIso,
    updated_at: cortexMaxFlippedAtIso,
  }

  const companyBrainInsert = {
    id: companyBrainId,
    owner_id: founderUserId,
    org_id: orgId,
    name: 'Company Cortex',
    description: 'Organizational operating mind',
    is_default: false,
    color: '#8b5cf6',
    icon: 'building-2',
    scope: 'company' as const,
    cortex_max: true,
    created_at: companyBrainCreatedAtIso,
    updated_at: companyBrainCreatedAtIso,
  }

  const companyCortexSettingsInsert = {
    org_id: orgId,
    brain_id: companyBrainId,
    enabled: true,
    schedule: 'daily' as const,
    local_time: '02:00',
    timezone: 'UTC',
    lookback_hours: 24,
    min_activity_threshold: 1,
    include_sources: [...COMPANY_CORTEX_INCLUDE_SOURCES_DEFAULT],
    last_successful_dream_at: lastDreamAtIso,
    created_at: companySettingsCreatedAtIso,
    updated_at: companySettingsCreatedAtIso,
  }

  const customerBrainInsert = {
    id: customerBrainId,
    owner_id: founderUserId,
    org_id: orgId,
    name: 'Customer Brain',
    description: 'Customer intelligence layer',
    is_default: false,
    color: '#38bdf8',
    icon: 'users',
    scope: 'customer' as const,
    cortex_max: true,
    last_avatar_synthesis_at: lastAvatarSynthesisAtIso,
    created_at: customerBrainCreatedAtIso,
    updated_at: customerBrainCreatedAtIso,
  }

  if (ctx.dryRun) {
    ctx.log.step(
      `[dry-run] UPDATE ns_brains SET cortex_max=true, created_at=${userBrainCreatedAtIso} WHERE id=${defaultUserBrainId}`,
    )
    ctx.log.step(`[dry-run] INSERT ns_brains (company) id=${companyBrainId}`)
    ctx.log.step(
      `[dry-run] INSERT company_cortex_settings org_id=${orgId} brain_id=${companyBrainId}`,
    )
    ctx.log.step(`[dry-run] INSERT ns_brains (customer) id=${customerBrainId}`)

    ctx.state.companyBrainId = companyBrainId
    ctx.state.customerBrainId = customerBrainId
    ctx.state.agentBrainIds = {}

    return r.finish({})
  }

  const { error: userBrainUpdateError } = await ctx.supabase
    .from('ns_brains')
    .update(userBrainUpdate)
    .eq('id', defaultUserBrainId)
  if (userBrainUpdateError) {
    throw new Error(
      `${PHASE_ID}: failed to flip cortex_max on user brain ${defaultUserBrainId}: ${userBrainUpdateError.message}`,
    )
  }

  const { data: companyBrainData, error: companyBrainError } = await ctx.supabase
    .from('ns_brains')
    .upsert(companyBrainInsert, { onConflict: 'id' })
    .select('id')
    .single()
  if (companyBrainError) {
    throw new Error(`${PHASE_ID}: failed to insert company brain: ${companyBrainError.message}`)
  }
  if (!companyBrainData || companyBrainData.id !== companyBrainId) {
    throw new Error(
      `${PHASE_ID}: company brain id mismatch (expected ${companyBrainId}, got ${
        companyBrainData?.id ?? 'null'
      }).`,
    )
  }

  const { error: companySettingsError } = await ctx.supabase
    .from('company_cortex_settings')
    .upsert(companyCortexSettingsInsert, { onConflict: 'org_id' })
  if (companySettingsError) {
    throw new Error(
      `${PHASE_ID}: failed to insert company_cortex_settings: ${companySettingsError.message}`,
    )
  }

  const { data: customerBrainData, error: customerBrainError } = await ctx.supabase
    .from('ns_brains')
    .upsert(customerBrainInsert, { onConflict: 'id' })
    .select('id')
    .single()
  if (customerBrainError) {
    throw new Error(`${PHASE_ID}: failed to insert customer brain: ${customerBrainError.message}`)
  }
  if (!customerBrainData || customerBrainData.id !== customerBrainId) {
    throw new Error(
      `${PHASE_ID}: customer brain id mismatch (expected ${customerBrainId}, got ${
        customerBrainData?.id ?? 'null'
      }).`,
    )
  }

  ctx.state.companyBrainId = companyBrainId
  ctx.state.customerBrainId = customerBrainId
  ctx.state.agentBrainIds = {}

  return r.finish({
    'ns_brains (UPDATE cortex_max)': 1,
    'ns_brains (INSERT company)': 1,
    'ns_brains (INSERT customer)': 1,
    company_cortex_settings: 1,
  })
}
