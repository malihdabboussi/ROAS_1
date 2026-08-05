import { describe, expect, it } from 'vitest'
import { resolveMeetingWorkspaceLinks } from './resolve-meeting-workspace-links'

describe('resolveMeetingWorkspaceLinks', () => {
  it('links the meeting space and campaign from the space roster', () => {
    expect(
      resolveMeetingWorkspaceLinks({
        spaceId: 'space-1',
        spaces: [{ id: 'space-1', title: 'Meetings', campaign_id: 'campaign-1' }],
        contextLinks: [],
      }),
    ).toEqual({
      space: {
        id: 'space-1',
        label: 'Meetings',
        href: '/spaces?space=space-1',
      },
      campaign: {
        id: 'campaign-1',
        label: 'Campaign',
        href: '/campaigns/campaign-1',
      },
      linkedSpaces: [],
    })
  })

  it('falls back to a campaign context link when the space has no campaign', () => {
    expect(
      resolveMeetingWorkspaceLinks({
        spaceId: 'space-1',
        spaces: [{ id: 'space-1', title: 'Meetings', campaign_id: null }],
        contextLinks: [{ entity_type: 'campaign', entity_id: 'campaign-2' }],
      }).campaign,
    ).toEqual({
      id: 'campaign-2',
      label: 'Campaign',
      href: '/campaigns/campaign-2',
    })
  })

  it('omits campaign when neither space nor context links provide one', () => {
    expect(
      resolveMeetingWorkspaceLinks({
        spaceId: 'space-1',
        spaces: [],
        contextLinks: [{ entity_type: 'space', entity_id: 'space-1' }],
      }).campaign,
    ).toBeNull()
  })

  it('includes additional linked spaces from context links', () => {
    expect(
      resolveMeetingWorkspaceLinks({
        spaceId: 'space-1',
        spaces: [
          { id: 'space-1', title: 'Meetings', campaign_id: null },
          { id: 'space-2', title: 'Client Ops', campaign_id: null },
        ],
        contextLinks: [{ entity_type: 'space', entity_id: 'space-2' }],
      }).linkedSpaces,
    ).toEqual([
      {
        id: 'space-2',
        label: 'Client Ops',
        href: '/spaces?space=space-2',
      },
    ])
  })
})
