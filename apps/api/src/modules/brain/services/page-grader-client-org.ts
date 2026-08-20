import { BadRequestException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveQcConnectionOrg } from '../../integrations/page-grader/services/page-grader-qc-connection-org'

export async function resolvePageGraderImportOrg(
  supabase: SupabaseClient,
  userId: string,
  orgId?: string | null,
  campaignId?: string | null,
): Promise<string | null> {
  const resolved = await resolveQcConnectionOrg(
    supabase,
    { userId, orgId: orgId ?? null },
    { campaignIds: campaignId ? [campaignId] : [] },
  )
  return resolved.orgId
}

export async function attachPageGraderCampaignToOrg(
  supabase: SupabaseClient,
  campaignId: string,
  orgId: string,
) {
  const { error: campaignError } = await supabase
    .from('campaigns')
    .update({ org_id: orgId })
    .eq('id', campaignId)
    .is('org_id', null)
  if (campaignError) {
    throw new BadRequestException(
      `Could not attach ROAS Portal campaign to the org: ${campaignError.message}`,
    )
  }

  const { error: spaceError } = await supabase
    .from('spaces')
    .update({ org_id: orgId, visibility: 'team' })
    .eq('campaign_id', campaignId)
    .is('org_id', null)
  if (spaceError) {
    throw new BadRequestException(
      `Could not attach ROAS Portal Spaces to the org: ${spaceError.message}`,
    )
  }

  const { error: brainError } = await supabase
    .from('ns_brains')
    .update({ org_id: orgId })
    .eq('campaign_id', campaignId)
    .is('org_id', null)
  if (brainError) {
    throw new BadRequestException(
      `Could not attach the campaign Brain to the org: ${brainError.message}`,
    )
  }
}

export async function findPageGraderCampaignForClient(
  supabase: SupabaseClient,
  input: {
    userId: string
    orgId: string | null
    pageGraderClientId: string
    uniqueClientId: string
  },
) {
  const candidates = [
    input.pageGraderClientId
      ? { external_sources: { page_grader: { client_id: input.pageGraderClientId } } }
      : null,
    input.uniqueClientId
      ? { external_sources: { page_grader: { unique_client_id: input.uniqueClientId } } }
      : null,
  ].filter(Boolean) as Record<string, unknown>[]

  if (input.orgId) {
    const orgCampaign = await lookupCampaign(supabase, candidates, {
      orgId: input.orgId,
    })
    if (orgCampaign) return orgCampaign
  }

  const personalCampaign = await lookupCampaign(supabase, candidates, {
    userId: input.userId,
    personal: true,
  })
  if (personalCampaign) return personalCampaign

  if (!input.orgId) {
    return lookupCampaign(supabase, candidates, { userId: input.userId, anyOrg: true })
  }
  return null
}

async function lookupCampaign(
  supabase: SupabaseClient,
  candidates: Record<string, unknown>[],
  scope: { orgId?: string; userId?: string; personal?: boolean; anyOrg?: boolean },
) {
  for (const candidate of candidates) {
    let query = supabase
      .from('campaigns')
      .select('*')
      .contains('config', candidate)
      .is('deleted_at', null)
      .limit(1)
    if (scope.orgId) query = query.eq('org_id', scope.orgId)
    else if (scope.personal) query = query.eq('user_id', scope.userId).is('org_id', null)
    else if (scope.anyOrg) {
      query = query
        .eq('user_id', scope.userId)
        .not('org_id', 'is', null)
        .order('created_at', { ascending: true })
    }
    const { data, error } = await query.maybeSingle()
    if (error) {
      throw new BadRequestException(`Could not look up ROAS Portal campaign: ${error.message}`)
    }
    if (data) return data
  }
  return null
}

export async function resolveClientsProgramId(
  supabase: SupabaseClient,
  orgId: string | null,
): Promise<string | null> {
  if (!orgId) return null
  const { data, error } = await supabase
    .from('programs')
    .select('id')
    .eq('org_id', orgId)
    .eq('system_kind', 'clients')
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (error) {
    throw new BadRequestException(`Could not load the Clients program: ${error.message}`)
  }
  return typeof data?.id === 'string' ? data.id : null
}

export async function ensurePageGraderCampaignInClientsProgram(
  supabase: SupabaseClient,
  campaignId: string,
  orgId: string | null,
) {
  const programId = await resolveClientsProgramId(supabase, orgId)
  if (!programId) return
  const { error } = await supabase
    .from('campaigns')
    .update({ program_id: programId })
    .eq('id', campaignId)
    .is('program_id', null)
  if (error) {
    throw new BadRequestException(
      `Could not assign the ROAS Portal campaign to Clients: ${error.message}`,
    )
  }
}
