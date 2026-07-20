import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import {
  computePageGraderPackageContentHash,
  type PageGraderPackage,
  type PageGraderRecord,
} from './page-grader-brain-package-build'
import { PageGraderBrainPackageIngestService } from './page-grader-brain-package-ingest.service'
import {
  buildPageGraderGeneralSpaceSchema,
  PAGE_GRADER_GENERAL_SPACE_TITLE,
} from './page-grader-general-space-schema'

export type PageGraderClientImportBody = {
  package?: PageGraderPackage
  dryRun?: boolean
  force?: boolean
  campaignId?: string
  campaignName?: string
  campaignHint?: string
  spaceId?: string
  spaceTitle?: string
}

@Injectable()
export class PageGraderClientImportService {
  constructor(private readonly packageIngest: PageGraderBrainPackageIngestService) {}

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
    const contentHash = computePageGraderPackageContentHash(pkg)
    const externalSource = {
      page_grader: {
        client_id: pageGraderClientId || null,
        unique_client_id: uniqueClientId || null,
        package_version: stringValue(pkg.envelope?.package_version) || '1',
        last_exported_at: stringValue(pkg.envelope?.exported_at) || null,
        content_hash: contentHash,
        last_sync_status: 'pending',
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

    if (body.campaignId?.trim() && !existingCampaign) {
      throw new BadRequestException(
        `Mapped campaign ${body.campaignId.trim()} was not found or is not accessible`,
      )
    }

    // Prefer the campaign's own org scope. Personal Page Grader sync (orgId null) must
    // still reuse org-mapped campaigns instead of creating personal duplicates.
    const effectiveOrgId =
      (typeof existingCampaign?.org_id === 'string' && existingCampaign.org_id.trim()
        ? existingCampaign.org_id.trim()
        : null) ??
      scope.orgId ??
      null

    const campaignPlan = existingCampaign
      ? {
          action: 'reuse' as const,
          id: String(existingCampaign.id),
          name: String(existingCampaign.name),
        }
      : { action: 'create' as const, id: null, name: campaignName }

    const existingSpace = body.spaceId
      ? await this.findSpaceById(supabase, body.spaceId, userId, effectiveOrgId)
      : campaignPlan.id
        ? await this.findSpaceByCampaign(supabase, campaignPlan.id, userId, effectiveOrgId)
        : null
    const spacePlan = existingSpace
      ? {
          action: 'reuse' as const,
          id: String(existingSpace.id),
          title: String(existingSpace.title),
        }
      : {
          action: 'create' as const,
          id: null,
          title: body.spaceTitle?.trim() || PAGE_GRADER_GENERAL_SPACE_TITLE,
        }

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
          action: 'deterministic_ingest',
          title: `Page Grader Client Intel - ${clientName}`,
          contentChars: content.length,
          contentHash,
          sourceItems: pkg.source_items?.length ?? 0,
          legacyIntelNotes: pkg.legacy_local_only?.intel_notes?.length ?? 0,
        },
      }
    }

    const campaign =
      existingCampaign ??
      (await this.createCampaign(supabase, {
        userId,
        orgId: effectiveOrgId,
        name: campaignName,
        externalSource,
      }))
    await this.ensureCampaignBrain(supabase, {
      userId,
      orgId: effectiveOrgId,
      campaignId: String(campaign.id),
      campaignName: String(campaign.name),
    })

    const space =
      existingSpace ??
      (await this.createSpace(supabase, {
        userId,
        orgId: effectiveOrgId,
        campaignId: String(campaign.id),
        title: body.spaceTitle?.trim() || PAGE_GRADER_GENERAL_SPACE_TITLE,
        clientName,
        pageGraderClientId,
        uniqueClientId,
      }))

    const ingested = await this.packageIngest.ingestPackage(supabase, {
      userId,
      orgId: effectiveOrgId,
      campaignId: String(campaign.id),
      spaceId: String(space.id),
      package: pkg,
      force: body.force === true,
    })
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
      brainImport: {
        action: ingested.skippedUnchanged ? 'skipped_unchanged' : 'ingested',
        title: `Page Grader Client Intel - ${clientName}`,
        status: 'succeeded',
        ...ingested,
      },
    }
  }

  private async findCampaignById(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
    orgId?: string | null,
  ) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw new BadRequestException(`Could not load campaign: ${error.message}`)
    if (!data) return null
    if (!(await this.canAccessCampaign(supabase, data, userId, orgId))) {
      throw new BadRequestException(`Campaign not accessible: ${campaignId}`)
    }
    return data
  }

  private async canAccessCampaign(
    supabase: SupabaseClient,
    campaign: { user_id?: unknown; org_id?: unknown },
    userId: string,
    orgId?: string | null,
  ): Promise<boolean> {
    const ownerId = typeof campaign.user_id === 'string' ? campaign.user_id : ''
    const campaignOrgId = typeof campaign.org_id === 'string' ? campaign.org_id : null
    if (ownerId === userId) return true
    if (orgId && campaignOrgId && campaignOrgId === orgId) return true
    if (!campaignOrgId) return false
    const { data, error } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', campaignOrgId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (error) return false
    return Boolean(data?.id)
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

    // Personal Page Grader sync: prefer an existing org campaign for the same client
    // instead of minting another personal duplicate.
    if (!input.orgId) {
      for (const candidate of candidates) {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .contains('config', candidate)
          .eq('user_id', input.userId)
          .not('org_id', 'is', null)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (error)
          throw new BadRequestException(`Could not look up Page Grader campaign: ${error.message}`)
        if (data) return data
      }
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
        scope: 'campaign',
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
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new BadRequestException(`Could not load space: ${error.message}`)
    if (!data) return null
    const spaceUserId = typeof data.user_id === 'string' ? data.user_id : ''
    const spaceOrgId = typeof data.org_id === 'string' ? data.org_id : null
    if (spaceUserId === userId) return data
    if (orgId && spaceOrgId && spaceOrgId === orgId) return data
    if (spaceOrgId) {
      const ok = await this.canAccessCampaign(
        supabase,
        { user_id: spaceUserId, org_id: spaceOrgId },
        userId,
        orgId,
      )
      if (ok) return data
    }
    throw new BadRequestException(`Space not accessible: ${spaceId}`)
  }

  private async findSpaceByCampaign(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
    orgId?: string | null,
  ) {
    let generalQuery = supabase
      .from('spaces')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_template', false)
      .contains('schema', { custom_data: { space_role: 'general' } })
      .order('updated_at', { ascending: false })
      .limit(1)
    generalQuery = orgId
      ? generalQuery.eq('org_id', orgId)
      : generalQuery.eq('user_id', userId).is('org_id', null)
    const { data: generalSpace, error: generalError } = await generalQuery.maybeSingle()
    if (generalError) {
      throw new BadRequestException(
        `Could not load campaign General Space: ${generalError.message}`,
      )
    }
    if (generalSpace) return generalSpace

    let legacyQuery = supabase
      .from('spaces')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_template', false)
      .contains('schema', { custom_data: { source: 'page_grader' } })
      .order('updated_at', { ascending: false })
      .limit(1)
    legacyQuery = orgId
      ? legacyQuery.eq('org_id', orgId)
      : legacyQuery.eq('user_id', userId).is('org_id', null)
    const { data: legacySpace, error: legacyError } = await legacyQuery.maybeSingle()
    if (legacyError) {
      throw new BadRequestException(`Could not load legacy campaign space: ${legacyError.message}`)
    }
    return legacySpace
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
        schema: buildPageGraderGeneralSpaceSchema({
          pageGraderClientId: input.pageGraderClientId,
          uniqueClientId: input.uniqueClientId,
        }),
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
    this.appendRecords(lines, 'Onboarding Call Notes', recordList(pkg.onboarding_call_notes))
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

function recordList(
  value: PageGraderRecord | PageGraderRecord[] | undefined,
): PageGraderRecord[] | undefined {
  if (Array.isArray(value)) return value
  return value ? [value] : undefined
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
