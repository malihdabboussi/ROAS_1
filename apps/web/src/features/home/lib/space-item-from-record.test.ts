import { describe, expect, it } from 'vitest'
import { spaceItemFromRecord } from './space-item-from-record'

describe('spaceItemFromRecord', () => {
  it('maps a related-call row onto a Space item', () => {
    const item = spaceItemFromRecord(
      {
        id: 'call-2',
        space_id: 'space-1',
        title: 'Cydcor weekly last week',
        status: 'done',
        custom_data: { entry_type: 'call', client_campaign: { campaign_name: 'Launch' } },
      },
      'fallback-space',
    )
    expect(item).toMatchObject({
      id: 'call-2',
      space_id: 'space-1',
      title: 'Cydcor weekly last week',
      status: 'done',
      custom_data: { entry_type: 'call', client_campaign: { campaign_name: 'Launch' } },
    })
  })
})
