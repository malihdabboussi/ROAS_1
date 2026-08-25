import { clientScopeMatches, type ResolvedClientScope } from './client-scope-match'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function clientScopeMatchesRecord(scope: ResolvedClientScope, input: object): boolean {
  const value = input as Record<string, unknown>
  const metadata = record(value.metadata)
  const custom = record(value.custom_data)
  const clientCampaign = record(custom.client_campaign)
  const related = record(value.related)
  const prep = record(value.prep)
  const clientId =
    text(value.client_id) ??
    text(value.page_grader_client_id) ??
    text(metadata.client_id) ??
    text(metadata.page_grader_client_id) ??
    text(custom.client_id) ??
    text(custom.page_grader_client_id) ??
    text(clientCampaign.client_id)
  if (clientId) return clientId === scope.clientId

  const campaignId =
    text(value.campaign_id) ?? text(metadata.campaign_id) ?? text(custom.campaign_id)
  const spaceId =
    text(value.space_id) ??
    text(related.space_id) ??
    text(prep.space_id) ??
    text(metadata.space_id) ??
    text(custom.space_id) ??
    text(custom.source_space_id)
  if (campaignId || spaceId) return clientScopeMatches(scope, { campaignId, spaceId })

  const clientWorkspace = text(custom.campaign_name) ?? text(clientCampaign.client_name)
  return clientWorkspace?.toLocaleLowerCase() === scope.clientName.toLocaleLowerCase()
}

export function clientScopeMatchesActionUrl(
  scope: ResolvedClientScope,
  actionUrl: string | null | undefined,
): boolean {
  if (!actionUrl) return false
  const url = new URL(actionUrl, 'https://app.roas.test')
  return clientScopeMatches(scope, {
    campaignId: url.searchParams.get('campaign'),
    spaceId: url.searchParams.get('space'),
  })
}
