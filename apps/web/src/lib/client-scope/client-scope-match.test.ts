import { describe, expect, it } from 'vitest'
import { clientScopeHref, clientScopeMatches, resolveClientScope } from './client-scope-match'

describe('client scope', () => {
  const client = {
    id: 'client-1',
    name: 'Acme',
    display_name: 'Acme Co',
    status: 'active',
    mapping: { campaign_id: 'campaign-1', space_id: 'space-general' },
  }
  const resolved = resolveClientScope(client, {
    client,
    campaigns: [],
    tasks: [],
    requests: [],
    mapping: client.mapping,
    campaign_spaces: [
      {
        page_grader_campaign_id: 'portal-campaign-1',
        space_id: 'space-launch',
        space_title: 'Launch',
      },
    ],
  })

  it('combines the Client Workspace campaign with every Campaign Space', () => {
    expect(resolved).toEqual({
      clientId: 'client-1',
      clientName: 'Acme Co',
      campaignId: 'campaign-1',
      spaceIds: ['space-general', 'space-launch'],
    })
  })

  it('matches records by Client Workspace or Campaign Space and rejects unattributed records', () => {
    expect(clientScopeMatches(resolved, { campaignId: 'campaign-1' })).toBe(true)
    expect(clientScopeMatches(resolved, { spaceId: 'space-launch' })).toBe(true)
    expect(clientScopeMatches(resolved, {})).toBe(false)
    expect(clientScopeMatches(resolved, { campaignId: 'campaign-2' })).toBe(false)
  })

  it('preserves existing route state while applying or clearing client scope', () => {
    expect(clientScopeHref('/home/meetings?meeting=call-1', 'client-1')).toBe(
      '/home/meetings?meeting=call-1&client=client-1',
    )
    expect(clientScopeHref('/home/meetings?meeting=call-1&client=client-1', null)).toBe(
      '/home/meetings?meeting=call-1',
    )
  })
})
