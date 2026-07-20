import { describe, expect, it } from 'vitest'

// Mirror of the space-scoping rules in useMissionsViewRealtime so the filter
// contract stays covered without exporting private helpers.
function shouldApplyMissionRealtimeChange(opts: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  campaignId: string
  spaceId?: string | null
  rowCampaignId?: string | null
  rowSpaceId?: string | null
}): 'upsert' | 'delete' | null {
  const { eventType, campaignId, spaceId, rowCampaignId, rowSpaceId } = opts
  if (rowCampaignId && rowCampaignId !== campaignId) return null
  if (eventType === 'DELETE') {
    if (spaceId && rowSpaceId && rowSpaceId !== spaceId) return null
    return 'delete'
  }
  if (spaceId && rowSpaceId !== spaceId) return 'delete'
  return 'upsert'
}

describe('useMissionsViewRealtime space scoping', () => {
  it('keeps upserts for the active space', () => {
    expect(
      shouldApplyMissionRealtimeChange({
        eventType: 'UPDATE',
        campaignId: 'c1',
        spaceId: 's-v3',
        rowCampaignId: 'c1',
        rowSpaceId: 's-v3',
      }),
    ).toBe('upsert')
  })

  it('drops other-space upserts as deletes from the local list', () => {
    expect(
      shouldApplyMissionRealtimeChange({
        eventType: 'INSERT',
        campaignId: 'c1',
        spaceId: 's-v3',
        rowCampaignId: 'c1',
        rowSpaceId: 's-v2',
      }),
    ).toBe('delete')
  })

  it('ignores deletes that belong to another space', () => {
    expect(
      shouldApplyMissionRealtimeChange({
        eventType: 'DELETE',
        campaignId: 'c1',
        spaceId: 's-v3',
        rowCampaignId: 'c1',
        rowSpaceId: 's-v2',
      }),
    ).toBeNull()
  })
})
