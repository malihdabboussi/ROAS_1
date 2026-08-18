import { describe, expect, it } from 'vitest'
import {
  buildClientCampaignGroups,
  clientCampaignClientHref,
  clientCampaignMappingLabel,
  clientCampaignSpaceHref,
  parseClientCampaignMapping,
  toClientCampaignMapping,
} from './client-campaign-mapping'

describe('client-campaign-mapping', () => {
  it('groups Page Grader campaigns under the client, then sorts A–Z', () => {
    const groups = buildClientCampaignGroups([
      {
        id: 'camp-b',
        client_id: 'client-1',
        name: 'Wholesale',
        status: null,
        platform_status: 'active',
        start_date: null,
        end_date: null,
        event_date: null,
        budget_amount: null,
        budget_type: null,
        currency: null,
        next_action: null,
        clients: { id: 'client-1', name: '1DS Collective' },
      },
      {
        id: 'camp-a',
        client_id: 'client-1',
        name: 'Launch',
        status: null,
        platform_status: 'active',
        start_date: null,
        end_date: null,
        event_date: null,
        budget_amount: null,
        budget_type: null,
        currency: null,
        next_action: null,
        clients: { id: 'client-1', name: '1DS Collective' },
      },
      {
        id: 'camp-c',
        client_id: 'client-2',
        name: 'Always-on',
        status: null,
        platform_status: 'active',
        start_date: null,
        end_date: null,
        event_date: null,
        budget_amount: null,
        budget_type: null,
        currency: null,
        next_action: null,
        clients: { id: 'client-2', name: 'Acme' },
      },
    ])

    expect(groups.map((group) => group.clientName)).toEqual(['1DS Collective', 'Acme'])
    expect(groups[0]?.campaigns.map((campaign) => campaign.name)).toEqual(['Launch', 'Wholesale'])
  })

  it('labels a mapped meeting as Client · Campaign', () => {
    const mapping = toClientCampaignMapping(
      { clientId: 'client-1', clientName: '1DS Collective', campaigns: [] },
      { id: 'camp-a', name: 'Launch', roasSpaceId: 'space-1' },
    )
    expect(clientCampaignMappingLabel(mapping)).toBe('1DS Collective · Launch')
    expect(parseClientCampaignMapping(mapping)).toEqual(mapping)
    expect(parseClientCampaignMapping('Legacy free text')?.campaign_name).toBe('Legacy free text')
  })

  it('builds client and campaign-space hrefs from a mapping', () => {
    const mapping = toClientCampaignMapping(
      { clientId: 'client-1', clientName: '1DS Collective', campaigns: [] },
      { id: 'camp-a', name: 'Launch', roasSpaceId: 'space-1' },
    )
    expect(clientCampaignClientHref(mapping)).toBe('/clients/client-1')
    expect(clientCampaignSpaceHref(mapping)).toBe('/spaces?space=space-1')
    expect(clientCampaignSpaceHref({ ...mapping, roas_space_id: null })).toBeNull()
  })
})
