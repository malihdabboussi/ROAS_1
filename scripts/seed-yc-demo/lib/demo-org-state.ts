/**
 * Resolve Foundry Creative demo org context from the database so optional
 * phases (e.g. 07_5d-curated-showcase) can run without re-seeding P01–P05.
 */
import { FOUNDER } from '../content/agency'
import { CLIENTS } from '../content/clients'
import type { PhaseContext, PhaseState } from '../phases/_context'

export const DEMO_ORG_SLUG = 'foundry-creative'

const CLIENT_CAMPAIGN_SLUGS = CLIENTS.map((c) => c.slug)

export interface ResolvedDemoOrgState {
  orgId: string
  founderUserId: string
  campaignIds: Record<string, string>
}

function seedDryRunState(ctx: PhaseContext): ResolvedDemoOrgState {
  const state: PhaseState = ctx.state
  const { id } = ctx.ids

  if (!state.orgId) state.orgId = id('org', DEMO_ORG_SLUG)
  if (!state.founderUserId) state.founderUserId = id('user', 'founder')

  const orgId = state.orgId
  if (!state.campaignIds) {
    state.campaignIds = Object.fromEntries(
      CLIENT_CAMPAIGN_SLUGS.map((slug) => [slug, id('campaign', orgId, slug)]),
    )
  }

  return {
    orgId,
    founderUserId: state.founderUserId,
    campaignIds: state.campaignIds,
  }
}

export async function resolveDemoOrgState(ctx: PhaseContext): Promise<ResolvedDemoOrgState> {
  if (ctx.dryRun) return seedDryRunState(ctx)

  if (ctx.state.orgId && ctx.state.founderUserId && ctx.state.campaignIds) {
    return {
      orgId: ctx.state.orgId,
      founderUserId: ctx.state.founderUserId,
      campaignIds: ctx.state.campaignIds,
    }
  }

  const { data: org, error: orgErr } = await ctx.supabase
    .from('organizations')
    .select('id')
    .eq('slug', DEMO_ORG_SLUG)
    .maybeSingle()

  if (orgErr || !org?.id) {
    throw new Error(
      `Demo org "${DEMO_ORG_SLUG}" not found — run pnpm seed:yc-demo through --phase=05-campaigns first. (${orgErr?.message ?? 'no row'})`,
    )
  }

  const { data: founder, error: founderErr } = await ctx.supabase
    .from('profiles')
    .select('id')
    .eq('email', FOUNDER.email)
    .maybeSingle()

  if (founderErr || !founder?.id) {
    throw new Error(
      `Founder profile "${FOUNDER.email}" not found — run --phase=01-account first. (${founderErr?.message ?? 'no row'})`,
    )
  }

  const orgId = org.id as string
  const founderUserId = founder.id as string
  const campaignIds = Object.fromEntries(
    CLIENT_CAMPAIGN_SLUGS.map((slug) => [slug, ctx.ids.id('campaign', orgId, slug)]),
  )

  ctx.state.orgId = orgId
  ctx.state.founderUserId = founderUserId
  ctx.state.campaignIds = campaignIds

  return { orgId, founderUserId, campaignIds }
}
