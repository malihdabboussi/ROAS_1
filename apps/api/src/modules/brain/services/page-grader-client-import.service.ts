import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { BrainImportJobsService } from './brain-import-jobs.service'

type PageGraderRecord = Record<string, unknown>

type PageGraderPackage = {
  envelope?: PageGraderRecord
  client?: PageGraderRecord
  client_campaigns?: PageGraderRecord[]
  client_offers?: PageGraderRecord[]
  client_avatars?: PageGraderRecord[]
  client_strategies?: PageGraderRecord[]
  onboarding_call_notes?: PageGraderRecord[]
  source_items?: PageGraderRecord[]
  source_pointers?: PageGraderRecord
  social_links?: PageGraderRecord[]
  intel_summary_hint?: PageGraderRecord | null
  legacy_local_only?: {
    intel_notes?: PageGraderRecord[]
    activity_log?: PageGraderRecord[]
  }
}

export type PageGraderClientImportBody = {
  package?: PageGraderPackage
  dryRun?: boolean
  campaignId?: string
  campaignName?: string
  campaignHint?: string
  spaceId?: string
  spaceTitle?: string
}

@Injectable()
export class PageGraderClientImportService {
  constructor(private readonly importJobs: BrainImportJobsService) {}

  async importPackage(
    supabase: SupabaseClient,
    userId: string,
    body: PageGraderClientImportBody,
    scope: RequestScope,
  ) {
    const pkg = body.package
    if (!pkg || typeof pkg !== 'object') {
      throw new BadRequestException('package is required')
    }

    const pageGraderClientId = stringValue(pkg.envelope?.page_grader_client_id, pkg.client?.id)
    const uniqueClientId = stringValue(pkg.envelope?.unique_client_id, pkg.client?.unique_client_id)
    const clientName =
      stringValue(pkg.client?.friendly_name, pkg.client?.name, pkg.client?.legal_business_name) ||
      'Page Grader Client'

    if (!pageGraderClientId && !uniqueClientId) {
      throw new BadRequestException('package must include a Page Grader client id')
    }

    const campaignName =
      body.campaignName?.trim() ||
      this.resolveCampaignName(pkg, clientName, body.campaignHint ?? 'multi-family strategy')
    const externalSource = {
      page_grader: {
        client_id: pageGraderClientId || null,
        unique_client_id: uniqueClientId || null,
        package_version: stringValue(pkg.envelope?.package_version) || '1',
        last_exported_at: stringValue(pkg.envelope?.exported_at) || null,
      },
    }

    const existingCampaign = body.campaignId
      ? await this.findCampaignById(supabase, body.campaignId, userId, scope.orgId)
      : await this.findCampaignByPageGraderClient(supabase, {
          userId,
          orgId: scope.orgId ?? null,
          pageGraderClientId,
          uniqueClientId,
        })

    const campaignPlan = existingCampaign
      ? {
          action: 'reuse' as const,
          id: String(existingCampaign.id),
          name: String(existingCampaign.name),
        }
      : { action: 'create' as const, id: null, name: campaignName }

    const existingSpace = body.spaceId
      ? await this.findSpaceById(supabase, body.spaceId, userId, scope.orgId)
      : campaignPlan.id
        ? await this.findSpaceByCampaign(supabase, campaignPlan.id, userId, scope.orgId)
        : null
    const spacePlan = existingSpace
      ? {
          action: 'reuse' as const,
          id: String(existingSpace.id),
          title: String(existingSpace.title),
        }
      : { action: 'create' as const, id: null, title: body.spaceTitle?.trim() || campaignName }

    const content = this.buildCampaignBrainContent(pkg, {
      clientName,
      campaignName,
      pageGraderClientId,
      uniqueClientId,
    })

    if (body.dryRun) {
      return {
        success: true,
        dryRun: true,
        client: { name: clientName, pageGraderClientId, uniqueClientId },
        campaign: campaignPlan,
        space: spacePlan,
        brainImport: {
          action: 'queue',
          title: `Page Grader Client Intel - ${clientName}`,
          contentChars: content.length,
          sourceItems: pkg.source_items?.length ?? 0,
          legacyIntelNotes: pkg.legacy_local_only?.intel_notes?.length ?? 0,
        },
      }
    }

    const campaign =
      existingCampaign ??
      (await this.createCampaign(supabase, {
        userId,
        orgId: scope.orgId ?? null,
        name: campaignName,
        externalSource,
      }))
    await this.ensureCampaignBrain(supabase, {
      userId,
      orgId: scope.orgId ?? null,
      campaignId: String(campaign.id),
      campaignName: String(campaign.name),
    })

    const space =
      existingSpace ??
      (await this.createSpace(supabase, {
        userId,
        orgId: scope.orgId ?? null,
        campaignId: String(campaign.id),
        title: body.spaceTitle?.trim() || String(campaign.name),
        clientName,
        pageGraderClientId,
        uniqueClientId,
      }))

    const queued = await this.importJobs.enqueueCampaignFileImport(
      userId,
      {
        campaignId: String(campaign.id),
        title: `Page Grader Client Intel - ${clientName}`,
        content,
        sourceType: 'upload',
        domain: 'strategy',
      },
      scope.orgId,
    )

    return {
      success: true,
      dryRun: false,
      client: { name: clientName, pageGraderClientId, uniqueClientId },
      campaign: {
        action: existingCampaign ? 'reuse' : 'create',
        id: String(campaign.id),
        name: String(campaign.name),
      },
      space: {
        action: existingSpace ? 'reuse' : 'create',
        id: String(space.id),
        title: String(space.title),
      },
      brainImport: queued,
    }
  }

  private async findCampaignById(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
    orgId?: string | null,
  ) {
    let query = supabase.from('campaigns').select('*').eq('id', campaignId).is('deleted_at', null)
    query = orgId ? query.eq('org_id', orgId) : query.eq('user_id', userId).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new BadRequestException(`Could not load campaign: ${error.message}`)
    return data
  }

  private async findCampaignByPageGraderClient(
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

    for (const candidate of candidates) {
      let query = supabase
        .from('campaigns')
        .select('*')
        .contains('config', candidate)
        .is('deleted_at', null)
        .limit(1)
      query = input.orgId
        ? query.eq('org_id', input.orgId)
        : query.eq('user_id', input.userId).is('org_id', null)
      const { data, error } = await query.maybeSingle()
      if (error)
        throw new BadRequestException(`Could not look up Page Grader campaign: ${error.message}`)
      if (data) return data
    }

    return null
  }

  private async createCampaign(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId: string | null
      name: string
      externalSource: Record<string, unknown>
    },
  ) {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        user_id: input.userId,
        org_id: input.orgId,
        name: input.name,
        // campaigns.campaign_type CHECK allows only these values (see schema.sql).
        campaign_type: 'get-more-leads',
        status: 'active',
        config: {
          source: 'page_grader',
          external_sources: input.externalSource,
          imported_by: 'page_grader_client_import',
        },
      })
      .select()
      .single()
    if (error) throw new BadRequestException(`Could not create campaign: ${error.message}`)
    return data
  }

  private async ensureCampaignBrain(
    supabase: SupabaseClient,
    input: { userId: string; orgId: string | null; campaignId: string; campaignName: string },
  ) {
    const { data: existing, error: existingError } = await supabase
      .from('ns_brains')
      .select('id')
      .eq('campaign_id', input.campaignId)
      .limit(1)
      .maybeSingle()
    if (existingError)
      throw new BadRequestException(`Could not load campaign brain: ${existingError.message}`)
    if (existing?.id) return existing

    const { data, error } = await supabase
      .from('ns_brains')
      .insert({
        owner_id: input.userId,
        org_id: input.orgId,
        campaign_id: input.campaignId,
        name: input.campaignName,
        is_default: false,
        color: '#6366F1',
        icon: 'campaign',
        tags: [],
      })
      .select('id')
      .single()
    if (error && !error.message.includes('idx_ns_brains_campaign')) {
      throw new BadRequestException(`Could not create campaign brain: ${error.message}`)
    }
    return data
  }

  private async findSpaceById(
    supabase: SupabaseClient,
    spaceId: string,
    userId: string,
    orgId?: string | null,
  ) {
    let query = supabase.from('spaces').select('*').eq('id', spaceId)
    query = orgId ? query.eq('org_id', orgId) : query.eq('user_id', userId).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new BadRequestException(`Could not load space: ${error.message}`)
    return data
  }

  private async findSpaceByCampaign(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
    orgId?: string | null,
  ) {
    let query = supabase
      .from('spaces')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_template', false)
      .order('updated_at', { ascending: false })
      .limit(1)
    query = orgId ? query.eq('org_id', orgId) : query.eq('user_id', userId).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new BadRequestException(`Could not load campaign space: ${error.message}`)
    return data
  }

  private async createSpace(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId: string | null
      campaignId: string
      title: string
      clientName: string
      pageGraderClientId: string
      uniqueClientId: string
    },
  ) {
    const { data, error } = await supabase
      .from('spaces')
      .insert({
        user_id: input.userId,
        org_id: input.orgId,
        campaign_id: input.campaignId,
        title: input.title,
        description: `Client workspace synced from Page Grader for ${input.clientName}.`,
        visibility: input.orgId ? 'team' : 'private',
        is_template: false,
        schema: {
          views: [
            { id: 'campaign-overview', type: 'campaign_overview', name: 'Overview' },
            { id: 'docs', type: 'docs', name: 'Docs' },
            { id: 'missions', type: 'missions', name: 'Missions' },
            { id: 'calendar', type: 'calendar', name: 'Calendar' },
          ],
          custom_data: {
            source: 'page_grader',
            page_grader_client_id: input.pageGraderClientId || null,
            unique_client_id: input.uniqueClientId || null,
          },
        },
      })
      .select()
      .single()
    if (error) throw new BadRequestException(`Could not create space: ${error.message}`)
    return data
  }

  private resolveCampaignName(pkg: PageGraderPackage, clientName: string, campaignHint: string) {
    const normalizedHint = campaignHint.toLowerCase()
    const campaign = (pkg.client_campaigns ?? []).find((row) => {
      const haystack = [
        stringValue(row.name),
        stringValue(row.title),
        stringValue(row.campaign_type),
        stringValue(row.type),
      ]
        .join(' ')
        .toLowerCase()
      return normalizedHint
        .split(/\s+/)
        .filter(Boolean)
        .every((part) => haystack.includes(part))
    })
    return (
      stringValue(campaign?.name, campaign?.title) ||
      `${clientName} - ${titleCaseWords(campaignHint || 'Strategy')}`
    )
  }

  private buildCampaignBrainContent(
    pkg: PageGraderPackage,
    meta: {
      clientName: string
      campaignName: string
      pageGraderClientId: string
      uniqueClientId: string
    },
  ) {
    const lines: string[] = [
      `# Page Grader Client Intel Package`,
      ``,
      `Client: ${meta.clientName}`,
      `Campaign: ${meta.campaignName}`,
      `Page Grader client id: ${meta.pageGraderClientId || 'unknown'}`,
      `Unique client id: ${meta.uniqueClientId || 'unknown'}`,
      `Exported at: ${stringValue(pkg.envelope?.exported_at) || new Date().toISOString()}`,
      ``,
      `## Client Profile`,
      jsonBlock(pkg.client),
      ``,
      `## Source Pointers`,
      jsonBlock(pkg.source_pointers),
      ``,
      `## Intel Summary Hint`,
      jsonBlock(pkg.intel_summary_hint),
    ]

    this.appendRecords(lines, 'Client Campaigns', pkg.client_campaigns)
    this.appendRecords(lines, 'Client Strategies', pkg.client_strategies)
    this.appendRecords(lines, 'Offers', pkg.client_offers)
    this.appendRecords(lines, 'Avatars', pkg.client_avatars)
    this.appendRecords(lines, 'Onboarding Call Notes', pkg.onboarding_call_notes)
    this.appendRecords(lines, 'Social Links', pkg.social_links)
    this.appendRecords(lines, 'Source Items', pkg.source_items, 500)
    this.appendRecords(lines, 'Legacy Local Intel Notes', pkg.legacy_local_only?.intel_notes, 200)

    return lines.join('\n').slice(0, 1_900_000)
  }

  private appendRecords(
    lines: string[],
    heading: string,
    records: PageGraderRecord[] | undefined,
    limit = 100,
  ) {
    const rows = records ?? []
    lines.push('', `## ${heading}`, `Total records in package: ${rows.length}`)
    for (const row of rows.slice(0, limit)) {
      const title = stringValue(row.title, row.name, row.source_title, row.id) || 'Untitled'
      lines.push('', `### ${title}`, jsonBlock(row))
    }
    if (rows.length > limit) {
      lines.push('', `Skipped ${rows.length - limit} lower-priority records in this import pass.`)
    }
  }
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function jsonBlock(value: unknown): string {
  return ['```json', JSON.stringify(value ?? null, null, 2), '```'].join('\n')
}
