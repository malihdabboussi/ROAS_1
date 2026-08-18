import { describe, expect, it } from 'vitest'
import {
  campaignIdFromMessageReferences,
  generalSpaceIdForCampaign,
  resolveConversationConnection,
  workContextFromConnection,
} from './conversation-scope-from-mentions'

const spaces = [
  { id: 'meetings', title: 'Meetings', campaign_id: 'general-camp' },
  { id: '1ds-general', title: 'General', campaign_id: '1ds' },
  { id: '1ds-webinar', title: 'Webinar', campaign_id: '1ds' },
]

describe('conversation-scope-from-mentions', () => {
  it('uses the last campaign @ mention as the connection, not earlier people chips', () => {
    expect(
      campaignIdFromMessageReferences([
        { kind: 'person', id: 'dylan' },
        { kind: 'artifact', id: 'doc-1' },
        { kind: 'campaign', id: '1ds' },
      ]),
    ).toBe('1ds')
  })

  it('does not treat a Meetings space as the 1DS Collective connection', () => {
    expect(
      resolveConversationConnection({
        mentionCampaignId: '1ds',
        chosenCampaignId: null,
        chosenSpaceId: null,
        spaces,
      }),
    ).toEqual({ campaignId: '1ds', spaceId: '1ds-general' })
    expect(generalSpaceIdForCampaign(spaces, '1ds')).toBe('1ds-general')
  })

  it('lets a later campaign @ beat a leftover Meetings Choose Space', () => {
    expect(
      resolveConversationConnection({
        mentionCampaignId: '1ds',
        chosenCampaignId: 'general-camp',
        chosenSpaceId: 'meetings',
        spaces,
      }),
    ).toEqual({ campaignId: '1ds', spaceId: '1ds-general' })
  })

  it('keeps an explicit Choose Space selection when nothing was @ mentioned', () => {
    expect(
      resolveConversationConnection({
        mentionCampaignId: null,
        chosenCampaignId: '1ds',
        chosenSpaceId: '1ds-webinar',
        spaces,
      }),
    ).toEqual({ campaignId: '1ds', spaceId: '1ds-webinar' })
  })

  it('does not invent an org General/Meetings space for a blank Home send', () => {
    expect(
      resolveConversationConnection({
        mentionCampaignId: null,
        chosenCampaignId: null,
        chosenSpaceId: null,
        spaces,
      }),
    ).toEqual({ campaignId: null, spaceId: null })
    expect(workContextFromConnection({ campaignId: null, spaceId: null })).toEqual({
      surface: 'general',
    })
  })
})
