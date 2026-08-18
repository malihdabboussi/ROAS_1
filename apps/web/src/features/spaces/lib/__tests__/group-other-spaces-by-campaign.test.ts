import { describe, expect, it } from 'vitest'
import type { Campaign } from '@/lib/campaigns/campaign-api'
import type { Space } from '../../types'
import {
  countOtherSpaces,
  groupOtherSpacesByCampaign,
  orderCampaignsForSpacePicker,
} from '../group-other-spaces-by-campaign'

function campaign(id: string, name: string, config: Record<string, unknown> = {}): Campaign {
  return {
    id,
    user_id: 'user-1',
    name,
    campaign_type: 'standard',
    status: 'active',
    config,
    metrics: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function space(id: string, campaignId: string, level?: 'view' | 'edit' | 'admin'): Space {
  return {
    id,
    title: id,
    visibility: 'team',
    campaign_id: campaignId,
    effective_level: level,
  } as Space
}

describe('group-other-spaces-by-campaign', () => {
  it('orders campaigns A–Z, groups writable spaces, and excludes the current space', () => {
    const campaigns = [
      campaign('beta', 'Beta'),
      campaign('general', 'General', { system_kind: 'general' }),
      campaign('alpha', 'Alpha'),
    ]
    const spaces = [
      space('source', 'general', 'edit'),
      space('general-edit', 'general', 'edit'),
      space('general-view', 'general', 'view'),
      space('alpha-admin', 'alpha', 'admin'),
      space('beta-edit', 'beta', 'edit'),
    ]

    expect(orderCampaignsForSpacePicker(campaigns).map((c) => c.id)).toEqual([
      'alpha',
      'beta',
      'general',
    ])

    const groups = groupOtherSpacesByCampaign(spaces, campaigns, 'source')

    expect(groups.map((group) => [group.campaign.id, group.spaces.map((s) => s.id)])).toEqual([
      ['alpha', ['alpha-admin']],
      ['beta', ['beta-edit']],
      ['general', ['general-edit']],
    ])
    expect(countOtherSpaces(groups)).toBe(3)
  })

  it('hides a Page Grader client General space from the destination picker', () => {
    const campaigns = [campaign('client', '1DS Collective')]
    const spaces = [
      space('keep', 'client', 'edit'),
      {
        ...space('general', 'client', 'edit'),
        title: 'General',
        schema: {
          custom_data: { source: 'page_grader', space_role: 'general' },
        },
      } as unknown as Space,
    ]

    expect(
      groupOtherSpacesByCampaign(spaces, campaigns, 'unrelated').flatMap((group) =>
        group.spaces.map((row) => row.id),
      ),
    ).toEqual(['keep'])
  })
})
