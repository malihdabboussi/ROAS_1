import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import type { PageGraderClientCampaign } from '../integrations/page-grader.integration'
import { PageGraderApiService } from './page-grader-api.service'
import { PageGraderBrainImportService } from './page-grader-brain-import.service'

type ClientScope = {
  campaign_id: string
  campaign_name?: string
  space_id?: string | null
  space_title?: string | null
}

type CampaignSpaceMapping = {
  page_grader_campaign_id: string
  space_id: string
  space_title: string
}

@Injectable()
export class PageGraderAgencyWorkspaceService {
  constructor(
    private readonly api: PageGraderApiService,
    private readonly brainImport: PageGraderBrainImportService,
  ) {}

  async listClients(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    opts: { q?: string; sync?: boolean },
  ) {
    const listed = await this.api.listClients(userId, { q: opts.q, all: true })
    let scopeMap = listed.client_scope_map as Record<string, ClientScope>
    const syncErrors: Array<{ client_id: string; error: string }> = []

    if (opts.sync !== false) {
      const missing = listed.clients.filter((client) => !scopeMap[client.id])
      for (const client of missing.slice(0, 50)) {
        try {
          await this.brainImport.importClientBrain(
            supabase,
            userId,
            { client_id: client.id, campaignName: client.display_name || client.name },
            scope.orgId,
          )
        } catch (error) {
          syncErrors.push({
            client_id: client.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      scopeMap = await this.api.getClientScopeMap(userId)
    }

    const mappings = await this.loadMappedEntities(supabase, Object.values(scopeMap))
    return {
      clients: listed.clients.map((client) => {
        const mapping = scopeMap[client.id] ?? null
        return {
          ...client,
          mapping: mapping
            ? {
                ...mapping,
                campaign_exists: mappings.campaignIds.has(mapping.campaign_id),
                general_space_exists: mapping.space_id
                  ? mappings.spaceIds.has(mapping.space_id)
                  : false,
              }
            : null,
        }
      }),
      sync_errors: syncErrors,
    }
  }

  async getClient(supabase: SupabaseClient, userId: string, scope: RequestScope, clientId: string) {
    const workspace = await this.api.getClientWorkspace(userId, clientId)
    let scopeMap = await this.api.getClientScopeMap(userId)
    if (!scopeMap[clientId]) {
      await this.brainImport.importClientBrain(
        supabase,
        userId,
        {
          client_id: clientId,
          campaignName: workspace.client.display_name || workspace.client.name,
        },
        scope.orgId,
      )
      scopeMap = await this.api.getClientScopeMap(userId)
    }
    const mapping = scopeMap[clientId]
    if (!mapping) throw new BadRequestException('The client could not be mapped into ROAS')
    const campaignSpaces = await this.reconcileCampaignSpaces(
      supabase,
      userId,
      scope.orgId ?? null,
      mapping,
      workspace.campaigns,
      clientId,
    )
    return { ...workspace, mapping, campaign_spaces: campaignSpaces }
  }

  async listCampaigns(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    opts: { q?: string; clientId?: string },
  ) {
    const campaigns = await this.api.listClientCampaigns(userId, {
      q: opts.q,
      clientId: opts.clientId,
      limit: 500,
    })
    const grouped = new Map<string, PageGraderClientCampaign[]>()
    for (const campaign of campaigns) {
      const rows = grouped.get(campaign.client_id) ?? []
      rows.push(campaign)
      grouped.set(campaign.client_id, rows)
    }
    const scopeMap = await this.api.getClientScopeMap(userId)
    const output: Array<PageGraderClientCampaign & { roas_space_id: string | null }> = []
    for (const [clientId, rows] of grouped) {
      let mapping = scopeMap[clientId]
      if (!mapping) {
        await this.brainImport.importClientBrain(
          supabase,
          userId,
          { client_id: clientId },
          scope.orgId,
        )
        mapping = (await this.api.getClientScopeMap(userId))[clientId]
      }
      if (!mapping) continue
      const spaces = await this.reconcileCampaignSpaces(
        supabase,
        userId,
        scope.orgId ?? null,
        mapping,
        rows,
        clientId,
      )
      const byExternalId = new Map(spaces.map((row) => [row.page_grader_campaign_id, row.space_id]))
      output.push(
        ...rows.map((row) => ({ ...row, roas_space_id: byExternalId.get(row.id) ?? null })),
      )
    }
    return { campaigns: output }
  }

  async patchEntity(
    userId: string,
    input: {
      clientId: string
      kind: 'client' | 'campaign' | 'task' | 'request'
      entityId?: string
      patch: Record<string, unknown>
    },
  ) {
    const clientId = encodeURIComponent(input.clientId)
    const path =
      input.kind === 'client'
        ? `/clients/${clientId}`
        : `/clients/${clientId}/${input.kind === 'campaign' ? 'campaigns' : `${input.kind}s`}/${encodeURIComponent(input.entityId ?? '')}`
    return this.api.updateWorkspaceEntity(userId, path, input.patch)
  }

  private async reconcileCampaignSpaces(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    mapping: ClientScope,
    campaigns: PageGraderClientCampaign[],
    clientId: string,
  ): Promise<CampaignSpaceMapping[]> {
    const { data: existing, error } = await supabase
      .from('spaces')
      .select('id, title, schema')
      .eq('campaign_id', mapping.campaign_id)
      .is('deleted_at', null)
    if (error)
      throw new BadRequestException(`Could not load client campaign Spaces: ${error.message}`)
    const byExternalId = new Map<string, { id: string; title: string }>()
    for (const row of existing ?? []) {
      const schema = recordValue(row.schema)
      const customData = recordValue(schema.custom_data)
      const externalId = stringValue(customData.page_grader_campaign_id)
      if (externalId) byExternalId.set(externalId, { id: String(row.id), title: String(row.title) })
    }

    const resolved: CampaignSpaceMapping[] = []
    for (const campaign of campaigns) {
      const found = byExternalId.get(campaign.id)
      if (found) {
        resolved.push({
          page_grader_campaign_id: campaign.id,
          space_id: found.id,
          space_title: found.title,
        })
        continue
      }
      const { data: created, error: createError } = await supabase
        .from('spaces')
        .insert({
          user_id: userId,
          org_id: orgId,
          campaign_id: mapping.campaign_id,
          title: campaign.name,
          description:
            stringValue(campaign.campaign_overview, campaign.description) ||
            `Client Campaign synced from Page Grader.`,
          visibility: orgId ? 'team' : 'private',
          is_template: false,
          schema: buildClientCampaignSpaceSchema(clientId, campaign),
        })
        .select('id, title')
        .single()
      if (createError) {
        throw new BadRequestException(
          `Could not create client campaign Space: ${createError.message}`,
        )
      }
      resolved.push({
        page_grader_campaign_id: campaign.id,
        space_id: String(created.id),
        space_title: String(created.title),
      })
    }
    return resolved
  }

  private async loadMappedEntities(supabase: SupabaseClient, mappings: ClientScope[]) {
    const campaignIds = [...new Set(mappings.map((row) => row.campaign_id).filter(Boolean))]
    const spaceIds = [
      ...new Set(mappings.map((row) => row.space_id).filter((id): id is string => Boolean(id))),
    ]
    const [campaignResult, spaceResult] = await Promise.all([
      campaignIds.length
        ? supabase.from('campaigns').select('id').in('id', campaignIds).is('deleted_at', null)
        : Promise.resolve({ data: [] }),
      spaceIds.length
        ? supabase.from('spaces').select('id').in('id', spaceIds).is('deleted_at', null)
        : Promise.resolve({ data: [] }),
    ])
    return {
      campaignIds: new Set((campaignResult.data ?? []).map((row) => String(row.id))),
      spaceIds: new Set((spaceResult.data ?? []).map((row) => String(row.id))),
    }
  }
}

function buildClientCampaignSpaceSchema(clientId: string, campaign: PageGraderClientCampaign) {
  return {
    version: 1,
    icon: 'megaphone',
    fields: [
      { id: 'title', name: 'Name', type: 'text', system: true, required: true },
      { id: 'status', name: 'Status', type: 'select', system: true, required: true },
      { id: 'priority', name: 'Priority', type: 'select', system: true, required: true },
      { id: 'assignee', name: 'Assignee', type: 'assignee', system: true },
      { id: 'due_date', name: 'Due Date', type: 'date', system: true },
      { id: 'event_date', name: 'Event Date', type: 'date' },
      { id: 'budget', name: 'Budget', type: 'number' },
      { id: 'tags', name: 'Tags', type: 'multi_select', system: true, options: [] },
    ],
    views: [
      { id: 'campaign-overview', type: 'campaign_overview', name: 'Overview' },
      { id: 'list', type: 'list', name: 'Work' },
      { id: 'calendar', type: 'calendar', name: 'Calendar' },
      { id: 'docs', type: 'docs', name: 'Docs' },
    ],
    custom_data: {
      source: 'page_grader',
      space_role: 'client_campaign',
      page_grader_client_id: clientId,
      page_grader_campaign_id: campaign.id,
      campaign_status: campaign.status,
      event_date: campaign.event_date,
      budget_amount: campaign.budget_amount,
      budget_type: campaign.budget_type,
      currency: campaign.currency,
      last_synced_at: new Date().toISOString(),
    },
  }
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}
