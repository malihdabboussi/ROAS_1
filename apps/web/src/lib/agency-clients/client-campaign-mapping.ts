import type { AgencyClient, AgencyClientCampaign } from './agency-clients-api'

export const CLIENT_CAMPAIGN_FIELD_ID = 'client_campaign'

export type ClientCampaignMapping = {
  client_id: string
  client_name: string
  campaign_id: string
  campaign_name: string
  roas_space_id?: string | null
}

export type ClientCampaignOption = {
  id: string
  name: string
  roasSpaceId: string | null
}

export type ClientCampaignGroup = {
  clientId: string
  clientName: string
  campaigns: ClientCampaignOption[]
}

export function parseClientCampaignMapping(value: unknown): ClientCampaignMapping | null {
  if (typeof value === 'string' && value.trim()) {
    return {
      client_id: '',
      client_name: '',
      campaign_id: '',
      campaign_name: value.trim(),
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const campaignName = typeof row.campaign_name === 'string' ? row.campaign_name.trim() : ''
  const campaignId = typeof row.campaign_id === 'string' ? row.campaign_id.trim() : ''
  if (!campaignName && !campaignId) return null
  return {
    client_id: typeof row.client_id === 'string' ? row.client_id.trim() : '',
    client_name: typeof row.client_name === 'string' ? row.client_name.trim() : '',
    campaign_id: campaignId,
    campaign_name: campaignName,
    roas_space_id: typeof row.roas_space_id === 'string' ? row.roas_space_id : null,
  }
}

export function clientCampaignMappingLabel(mapping: ClientCampaignMapping | null): string {
  if (!mapping) return ''
  const client = mapping.client_name.trim()
  const campaign = mapping.campaign_name.trim()
  if (client && campaign) return `${client} · ${campaign}`
  return campaign || client
}

export function buildClientCampaignGroups(
  campaigns: AgencyClientCampaign[],
  clients: AgencyClient[] = [],
): ClientCampaignGroup[] {
  const groups = new Map<string, ClientCampaignGroup>()
  for (const campaign of campaigns) {
    const clientId = campaign.client_id || campaign.clients?.id || ''
    const clientName =
      campaign.clients?.friendly_name?.trim() || campaign.clients?.name?.trim() || 'Unknown client'
    const key = clientId || clientName
    const existing = groups.get(key) ?? {
      clientId: clientId || key,
      clientName,
      campaigns: [],
    }
    existing.campaigns.push({
      id: campaign.id,
      name: campaign.name,
      roasSpaceId: campaign.roas_space_id ?? null,
    })
    groups.set(key, existing)
  }
  for (const client of clients) {
    const clientId = client.id?.trim()
    const mapping = client.mapping
    const generalId = mapping?.campaign_id?.trim()
    const generalSpaceId = mapping?.space_id?.trim()
    if (!clientId || !generalId || !generalSpaceId) continue
    const clientName =
      client.display_name?.trim() || client.name?.trim() || mapping?.campaign_name?.trim()
    if (!clientName) continue
    const existing = groups.get(clientId) ?? {
      clientId,
      clientName,
      campaigns: [],
    }
    const alreadyIncluded = existing.campaigns.some(
      (campaign) => campaign.id === generalId || campaign.roasSpaceId === generalSpaceId,
    )
    if (!alreadyIncluded) {
      existing.campaigns.unshift({
        id: generalId,
        name: mapping?.space_title?.trim() || 'General',
        roasSpaceId: generalSpaceId,
      })
    }
    groups.set(clientId, existing)
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      campaigns: [...group.campaigns].sort((a, b) =>
        a.name === 'General'
          ? -1
          : b.name === 'General'
            ? 1
            : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName, undefined, { sensitivity: 'base' }))
}

export function toClientCampaignMapping(
  group: ClientCampaignGroup,
  campaign: ClientCampaignOption,
): ClientCampaignMapping {
  return {
    client_id: group.clientId,
    client_name: group.clientName,
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    roas_space_id: campaign.roasSpaceId,
  }
}

export function clientCampaignClientHref(mapping: ClientCampaignMapping): string | null {
  return mapping.client_id ? `/clients/${encodeURIComponent(mapping.client_id)}` : null
}

export function clientCampaignSpaceHref(mapping: ClientCampaignMapping): string | null {
  return mapping.roas_space_id ? `/spaces?space=${encodeURIComponent(mapping.roas_space_id)}` : null
}
