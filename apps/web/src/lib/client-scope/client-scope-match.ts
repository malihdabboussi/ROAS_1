import type { AgencyClient, AgencyClientWorkspace } from '@/lib/agency-clients'

export type ResolvedClientScope = {
  clientId: string
  clientName: string
  campaignId: string | null
  spaceIds: string[]
}

export function resolveClientScope(
  client: AgencyClient,
  workspace: AgencyClientWorkspace | null,
): ResolvedClientScope {
  const spaceIds = new Set<string>()
  if (client.mapping?.space_id) spaceIds.add(client.mapping.space_id)
  if (workspace?.mapping?.space_id) spaceIds.add(workspace.mapping.space_id)
  for (const mapping of workspace?.campaign_spaces ?? []) spaceIds.add(mapping.space_id)

  return {
    clientId: client.id,
    clientName: client.display_name?.trim() || client.name,
    campaignId: workspace?.mapping?.campaign_id ?? client.mapping?.campaign_id ?? null,
    spaceIds: [...spaceIds],
  }
}

export function clientScopeMatches(
  scope: ResolvedClientScope,
  input: { campaignId?: string | null; spaceId?: string | null },
): boolean {
  if (input.campaignId && input.campaignId === scope.campaignId) return true
  return Boolean(input.spaceId && scope.spaceIds.includes(input.spaceId))
}

export function clientScopeHref(href: string, clientId: string | null): string {
  const url = new URL(href, 'https://app.roas.test')
  if (clientId) url.searchParams.set('client', clientId)
  else url.searchParams.delete('client')
  return `${url.pathname}${url.search}${url.hash}`
}
