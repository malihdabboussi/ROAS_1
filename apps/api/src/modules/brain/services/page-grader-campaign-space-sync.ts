import { createHash } from 'node:crypto'
import { BadRequestException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PageGraderRecord } from './page-grader-brain-package-build'
import {
  buildPageGraderCampaignBrief,
  buildPageGraderCampaignSpaceSchema,
  mergePageGraderCampaignSpaceSchema,
  resolvePageGraderCampaignMeta,
  type PageGraderMetaContext,
} from './page-grader-campaign-space-schema'

export function computePageGraderCampaignSpaceHash(input: {
  campaigns: PageGraderRecord[]
  metaContext?: PageGraderMetaContext | null
}): string {
  const campaigns = input.campaigns.filter(isEligiblePageGraderCampaign)
  const accounts = (input.metaContext?.accounts ?? []).map((row) => ({
    account_db_id: row.account_db_id ?? null,
    ad_account_id: row.ad_account_id ?? null,
    name: row.name ?? null,
    account_status: row.account_status ?? null,
    active: row.active === true,
    sync_error: row.sync_error ?? null,
  }))
  const metaCampaigns = (input.metaContext?.campaigns ?? []).map((row) => ({
    page_grader_campaign_id: row.page_grader_campaign_id ?? null,
    page_grader_campaign_name: row.page_grader_campaign_name ?? null,
    page_grader_campaign_status: row.page_grader_campaign_status ?? null,
    meta_campaign_id: row.meta_campaign_id ?? null,
    meta_campaign_name: row.meta_campaign_name ?? null,
    account_db_id: row.account_db_id ?? null,
  }))
  return createHash('sha256')
    .update(
      JSON.stringify({
        campaigns,
        connected: input.metaContext?.connected === true,
        recommended_ad_account_id: input.metaContext?.recommended_ad_account_id ?? null,
        accounts,
        meta_campaigns: metaCampaigns,
      }),
    )
    .digest('hex')
}

export function isEligiblePageGraderCampaign(campaign: PageGraderRecord): boolean {
  if (stringValue(campaign.deleted_at)) return false
  const status = stringValue(campaign.status, campaign.platform_status).toLowerCase()
  return status !== 'archived'
}

export async function syncPageGraderCampaignSpaces(
  supabase: SupabaseClient,
  input: {
    userId: string
    orgId: string | null
    roasCampaignId: string
    clientName: string
    pageGraderClientId: string
    campaigns: PageGraderRecord[]
    metaContext?: PageGraderMetaContext | null
  },
) {
  const syncedAt = new Date().toISOString()
  const eligibleCampaigns = input.campaigns.filter(isEligiblePageGraderCampaign)
  const retired = await retireIneligibleCampaignSpaces(supabase, {
    roasCampaignId: input.roasCampaignId,
    campaigns: input.campaigns,
  })
  const results: Array<{
    page_grader_campaign_id: string
    space_id: string
    title: string
    action: 'created' | 'updated'
    meta_ad_account_id: string | null
    meta_campaign_id: string | null
  }> = []

  for (const campaign of eligibleCampaigns) {
    const pageGraderCampaignId = stringValue(campaign.id)
    if (!pageGraderCampaignId) continue
    const title = stringValue(campaign.name, campaign.title) || 'Untitled campaign'
    const meta = resolvePageGraderCampaignMeta(pageGraderCampaignId, input.metaContext)
    const schema = buildPageGraderCampaignSpaceSchema({
      clientId: input.pageGraderClientId,
      campaign,
      meta,
      syncedAt,
    })

    const { data: existing, error: findError } = await supabase
      .from('spaces')
      .select('*')
      .eq('campaign_id', input.roasCampaignId)
      .eq('is_template', false)
      .contains('schema', {
        custom_data: { page_grader_campaign_id: pageGraderCampaignId },
      })
      .limit(1)
      .maybeSingle()
    if (findError) {
      throw new BadRequestException(
        `Could not load Page Grader campaign Space: ${findError.message}`,
      )
    }

    let space = existing
    let action: 'created' | 'updated' = 'updated'
    if (space) {
      const { data, error } = await supabase
        .from('spaces')
        .update({
          title,
          description: `Campaign workspace synced from The ROAS Portal for ${input.clientName}.`,
          schema: mergePageGraderCampaignSpaceSchema(existing.schema, schema),
          updated_at: syncedAt,
        })
        .eq('id', String(space.id))
        .select()
        .single()
      if (error) throw new BadRequestException(`Could not update campaign Space: ${error.message}`)
      space = data
    } else {
      action = 'created'
      const { data, error } = await supabase
        .from('spaces')
        .insert({
          user_id: input.userId,
          org_id: input.orgId,
          campaign_id: input.roasCampaignId,
          title,
          description: `Campaign workspace synced from The ROAS Portal for ${input.clientName}.`,
          visibility: input.orgId ? 'team' : 'private',
          is_template: false,
          schema,
        })
        .select()
        .single()
      if (error) throw new BadRequestException(`Could not create campaign Space: ${error.message}`)
      space = data
    }

    const spaceId = String(space.id)
    await upsertCampaignBrief(supabase, {
      userId: input.userId,
      orgId: input.orgId,
      spaceId,
      clientName: input.clientName,
      campaign,
      pageGraderCampaignId,
      meta,
      syncedAt,
    })
    results.push({
      page_grader_campaign_id: pageGraderCampaignId,
      space_id: spaceId,
      title,
      action,
      meta_ad_account_id:
        stringValue(meta.account?.ad_account_id, meta.recommendedAdAccountId) || null,
      meta_campaign_id: stringValue(meta.campaign?.meta_campaign_id) || null,
    })
  }
  return { spaces: results, retired }
}

async function retireIneligibleCampaignSpaces(
  supabase: SupabaseClient,
  input: { roasCampaignId: string; campaigns: PageGraderRecord[] },
) {
  const ineligibleIds = new Set(
    input.campaigns
      .filter((campaign) => !isEligiblePageGraderCampaign(campaign))
      .map((campaign) => stringValue(campaign.id))
      .filter(Boolean),
  )
  if (ineligibleIds.size === 0) return { deleted: 0, retained_with_user_content: 0 }

  const { data: spaces, error: spacesError } = await supabase
    .from('spaces')
    .select('id, schema')
    .eq('campaign_id', input.roasCampaignId)
    .eq('is_template', false)
    .contains('schema', { custom_data: { space_role: 'client_campaign' } })
  if (spacesError) {
    throw new BadRequestException(`Could not load stale campaign Spaces: ${spacesError.message}`)
  }
  const staleSpaces = (spaces ?? []).filter((space) => {
    const customData = asRecord(asRecord(space.schema).custom_data)
    return ineligibleIds.has(stringValue(customData.page_grader_campaign_id))
  })
  if (staleSpaces.length === 0) return { deleted: 0, retained_with_user_content: 0 }

  const staleIds = staleSpaces.map((space) => String(space.id))
  const { data: items, error: itemsError } = await supabase
    .from('space_items')
    .select('space_id, custom_data')
    .in('space_id', staleIds)
  if (itemsError) {
    throw new BadRequestException(`Could not inspect stale campaign Spaces: ${itemsError.message}`)
  }
  const spacesWithUserContent = new Set(
    (items ?? [])
      .filter((item) => asRecord(item.custom_data).source_type !== 'campaign_brief')
      .map((item) => String(item.space_id)),
  )
  const safeToDelete = staleIds.filter((id) => !spacesWithUserContent.has(id))
  if (safeToDelete.length > 0) {
    const { error } = await supabase.from('spaces').delete().in('id', safeToDelete)
    if (error)
      throw new BadRequestException(`Could not retire stale campaign Spaces: ${error.message}`)
  }
  return {
    deleted: safeToDelete.length,
    retained_with_user_content: staleIds.length - safeToDelete.length,
  }
}

async function upsertCampaignBrief(
  supabase: SupabaseClient,
  input: {
    userId: string
    orgId: string | null
    spaceId: string
    clientName: string
    campaign: PageGraderRecord
    pageGraderCampaignId: string
    meta: ReturnType<typeof resolvePageGraderCampaignMeta>
    syncedAt: string
  },
) {
  const docBody = buildPageGraderCampaignBrief(input)
  const customData = {
    _view_type: 'doc',
    source: 'page_grader',
    source_type: 'campaign_brief',
    page_grader_campaign_id: input.pageGraderCampaignId,
    last_synced_at: input.syncedAt,
  }
  const { data: existing, error: findError } = await supabase
    .from('space_items')
    .select('id')
    .eq('space_id', input.spaceId)
    .eq('custom_data->>source_type', 'campaign_brief')
    .eq('custom_data->>page_grader_campaign_id', input.pageGraderCampaignId)
    .limit(1)
    .maybeSingle()
  if (findError)
    throw new BadRequestException(`Could not load campaign brief: ${findError.message}`)

  if (existing?.id) {
    const { error } = await supabase
      .from('space_items')
      .update({
        title: 'Campaign Brief',
        doc_body: docBody,
        custom_data: customData,
        updated_at: input.syncedAt,
      })
      .eq('id', existing.id)
    if (error) throw new BadRequestException(`Could not update campaign brief: ${error.message}`)
    return
  }
  const { error } = await supabase.from('space_items').insert({
    user_id: input.userId,
    org_id: input.orgId,
    space_id: input.spaceId,
    title: 'Campaign Brief',
    status: 'todo',
    priority: 'medium',
    source: 'agent',
    sort_order: 0,
    doc_body: docBody,
    custom_data: customData,
  })
  if (error) throw new BadRequestException(`Could not create campaign brief: ${error.message}`)
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
