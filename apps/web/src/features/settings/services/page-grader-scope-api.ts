import { backendGet, backendPost } from '@/lib/api/backend-client'

export type PageGraderClient = {
  id: string
  name: string
  status: string
}

export type PageGraderClientScopeEntry = {
  campaign_id: string
  campaign_name?: string
  space_id?: string | null
  space_title?: string | null
}

export type PageGraderClientScopeMap = Record<string, PageGraderClientScopeEntry>

export async function listPageGraderClientsForSettings(): Promise<{
  clients: PageGraderClient[]
  clientScopeMap: PageGraderClientScopeMap
}> {
  const res = await backendGet<{
    success: boolean
    clients: PageGraderClient[]
    client_scope_map?: PageGraderClientScopeMap
  }>('/api/integrations/page-grader/clients')
  return {
    clients: res?.clients ?? [],
    clientScopeMap:
      res?.client_scope_map && typeof res.client_scope_map === 'object' ? res.client_scope_map : {},
  }
}

export async function savePageGraderClientScopeMapForSettings(
  mappings: Array<{
    clientId: string
    campaignId: string
    campaignName?: string
    spaceId?: string | null
    spaceTitle?: string | null
  }>,
): Promise<PageGraderClientScopeMap> {
  const res = await backendPost<{
    success: boolean
    client_scope_map?: PageGraderClientScopeMap
  }>('/api/integrations/page-grader/client-scope-map', {
    mappings: mappings.map((row) => ({
      client_id: row.clientId,
      campaign_id: row.campaignId,
      ...(row.campaignName ? { campaign_name: row.campaignName } : {}),
      space_id: row.spaceId ?? null,
      ...(row.spaceTitle ? { space_title: row.spaceTitle } : {}),
    })),
  })
  return res?.client_scope_map && typeof res.client_scope_map === 'object'
    ? res.client_scope_map
    : {}
}

export async function importPageGraderClientBrainForSettings(input: {
  clientId: string
  campaignId?: string
  campaignName?: string
  campaignHint?: string
  spaceId?: string | null
  spaceTitle?: string | null
  dryRun?: boolean
}): Promise<{
  success: boolean
  campaign?: { id: string; name?: string | null }
  space?: { id: string; title?: string | null }
  brainImport?: { jobId?: string | null; status?: string | null }
}> {
  return backendPost('/api/integrations/page-grader/import-client-brain', {
    client_id: input.clientId,
    dryRun: input.dryRun ?? false,
    ...(input.campaignId ? { campaignId: input.campaignId } : {}),
    ...(input.campaignName ? { campaignName: input.campaignName } : {}),
    ...(input.campaignHint ? { campaignHint: input.campaignHint } : {}),
    ...(input.spaceId ? { spaceId: input.spaceId } : {}),
    ...(input.spaceTitle ? { spaceTitle: input.spaceTitle } : {}),
  })
}

export function suggestCampaignForClient(
  clientName: string,
  campaigns: Array<{ id: string; name: string }>,
): { id: string; name: string } | null {
  const client = clientName.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!client) return null
  for (const campaign of campaigns) {
    const scope = campaign.name.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!scope) continue
    if (client === scope || client.includes(scope) || scope.includes(client)) return campaign
    const clientFirst = client.split(' ')[0] ?? ''
    const scopeFirst = scope.split(' ')[0] ?? ''
    if (clientFirst && scopeFirst && clientFirst === scopeFirst) return campaign
  }
  return null
}
