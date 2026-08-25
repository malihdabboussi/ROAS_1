import { describe, expect, it } from 'vitest'
import { clientScopeMatchesActionUrl, clientScopeMatchesRecord } from './client-scoped-record'

const scope = {
  clientId: 'client-1',
  clientName: 'Acme',
  campaignId: 'campaign-1',
  spaceIds: ['space-1'],
}

describe('client scoped records', () => {
  it('matches canonical client metadata and nested meeting attribution', () => {
    expect(
      clientScopeMatchesRecord(scope, { metadata: { page_grader_client_id: 'client-1' } }),
    ).toBe(true)
    expect(
      clientScopeMatchesRecord(scope, {
        custom_data: { client_campaign: { client_id: 'client-1' } },
      }),
    ).toBe(true)
  })

  it('matches campaign and Space attribution but rejects missing attribution', () => {
    expect(clientScopeMatchesRecord(scope, { campaign_id: 'campaign-1' })).toBe(true)
    expect(clientScopeMatchesRecord(scope, { space_id: 'space-1' })).toBe(true)
    expect(clientScopeMatchesRecord(scope, { related: { space_id: 'space-1' } })).toBe(true)
    expect(clientScopeMatchesRecord(scope, {})).toBe(false)
  })

  it('matches Inbox source URLs by campaign or Space', () => {
    expect(clientScopeMatchesActionUrl(scope, '/spaces?space=space-1&item=task-1')).toBe(true)
    expect(clientScopeMatchesActionUrl(scope, '/home?campaign=campaign-2')).toBe(false)
  })
})
