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

type BrainImportResult = {
  campaignSpaces?: Array<{
    page_grader_campaign_id?: unknown
    space_id?: unknown
    title?: unknown
  }>
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
      await mapWithConcurrency(missing.slice(0, 50), 8, async (client) => {
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
      })
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

  async getClient(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    clientId: string,
    opts: { sync?: boolean } = {},
  ) {
    const workspace = await this.api.getClientWorkspace(userId, clientId)
    if (opts.sync === false) {
      const mapping = (await this.api.getClientScopeMap(userId))[clientId] ?? null
      return {
        ...workspace,
        mapping,
        campaign_spaces: mapping ? await this.loadCampaignSpaceMappings(supabase, mapping) : [],
      }
    }
    const imported = await this.brainImport.importClientBrain(
      supabase,
      userId,
      {
        client_id: clientId,
        campaignName: workspace.client.display_name || workspace.client.name,
      },
      scope.orgId,
    )
    const scopeMap = await this.api.getClientScopeMap(userId)
    const mapping = scopeMap[clientId]
    if (!mapping) throw new BadRequestException('The client could not be mapped into ROAS')
    const campaignSpaces = readImportedCampaignSpaces(imported)
    return { ...workspace, mapping, campaign_spaces: campaignSpaces }
  }

  async listCampaigns(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    opts: { q?: string; clientId?: string; sync?: boolean },
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
    const entries = [...grouped.entries()]
    if (opts.sync === false) {
      return {
        campaigns: entries.flatMap(([, rows]) =>
          rows.map((row) => ({ ...row, roas_space_id: null })),
        ),
      }
    }

    let scopeMap = await this.api.getClientScopeMap(userId)
    const importedSpaces = new Map<string, CampaignSpaceMapping[]>()
    await mapWithConcurrency(
      entries.filter(([clientId]) => !scopeMap[clientId]),
      8,
      async ([clientId]) => {
        try {
          const imported = await this.brainImport.importClientBrain(
            supabase,
            userId,
            { client_id: clientId },
            scope.orgId,
          )
          importedSpaces.set(clientId, readImportedCampaignSpaces(imported))
        } catch {
          // A failed mapping must not hide the Page Grader campaign from the agency view.
        }
      },
    )
    scopeMap = await this.api.getClientScopeMap(userId)

    const output = await mapWithConcurrency(entries, 8, async ([clientId, rows]) => {
      const mapping = scopeMap[clientId]
      if (!mapping) return rows.map((row) => ({ ...row, roas_space_id: null }))
      let spaces = importedSpaces.get(clientId) ?? []
      try {
        if (spaces.length === 0) spaces = await this.loadCampaignSpaceMappings(supabase, mapping)
        const knownIds = new Set(spaces.map((row) => row.page_grader_campaign_id))
        if (rows.some((row) => !knownIds.has(row.id))) {
          const imported = await this.brainImport.importClientBrain(
            supabase,
            userId,
            { client_id: clientId },
            scope.orgId,
          )
          spaces = readImportedCampaignSpaces(imported)
        }
      } catch {
        // Keep the live campaign inventory available even if a Space refresh fails.
      }
      const byExternalId = new Map(spaces.map((row) => [row.page_grader_campaign_id, row.space_id]))
      return rows.map((row) => ({ ...row, roas_space_id: byExternalId.get(row.id) ?? null }))
    })
    return { campaigns: output.flat() }
  }

  async patchEntity(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
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
    const mutation = await this.api.updateWorkspaceEntity(userId, path, input.patch)
    if (input.kind === 'task' || input.kind === 'request') {
      return { mutation, brain_sync: null }
    }
    const pushed = recordValue(mutation.roas_push).pushed === true
    if (pushed) {
      return { mutation, brain_sync: { status: 'webhook_dispatched' } }
    }
    const brainSync = await this.brainImport.importClientBrain(
      supabase,
      userId,
      { client_id: input.clientId },
      scope.orgId,
    )
    return { mutation, brain_sync: brainSync }
  }

  private async loadCampaignSpaceMappings(
    supabase: SupabaseClient,
    mapping: ClientScope,
  ): Promise<CampaignSpaceMapping[]> {
    const { data: existing, error } = await supabase
      .from('spaces')
      .select('id, title, schema')
      .eq('campaign_id', mapping.campaign_id)
      .is('deleted_at', null)
    if (error)
      throw new BadRequestException(`Could not load client campaign Spaces: ${error.message}`)
    const mappings: CampaignSpaceMapping[] = []
    for (const row of existing ?? []) {
      const schema = recordValue(row.schema)
      const customData = recordValue(schema.custom_data)
      const externalId = stringValue(customData.page_grader_campaign_id)
      if (externalId) {
        mappings.push({
          page_grader_campaign_id: externalId,
          space_id: String(row.id),
          space_title: String(row.title),
        })
      }
    }
    return mappings
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

function readImportedCampaignSpaces(value: unknown): CampaignSpaceMapping[] {
  if (!value || typeof value !== 'object') return []
  const spaces = (value as BrainImportResult).campaignSpaces
  if (!Array.isArray(spaces)) return []
  return spaces.flatMap((row) => {
    const campaignId = stringValue(row.page_grader_campaign_id)
    const spaceId = stringValue(row.space_id)
    if (!campaignId || !spaceId) return []
    return [
      {
        page_grader_campaign_id: campaignId,
        space_id: spaceId,
        space_title: stringValue(row.title) || 'Client Campaign',
      },
    ]
  })
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

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(values.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++
      output[index] = await mapper(values[index] as T)
    }
  })
  await Promise.all(workers)
  return output
}
