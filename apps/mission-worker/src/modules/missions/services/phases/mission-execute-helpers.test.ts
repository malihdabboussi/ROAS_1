import { describe, expect, it } from 'vitest'
import { extractToolDeliverableReceipt } from './mission-execute-helpers'

describe('mission execute helpers', () => {
  it('extracts a deliverable receipt from an MCP text result', () => {
    const result = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            deliverable_id: 'e964cf26-41fd-45d3-b1cd-25138480cfd9',
            title: 'Static Ads — Impact Elite Coaching',
            file_url: null,
          }),
        },
      ],
    }

    expect(extractToolDeliverableReceipt(result)).toEqual({
      deliverable_id: 'e964cf26-41fd-45d3-b1cd-25138480cfd9',
      title: 'Static Ads — Impact Elite Coaching',
      file_url: null,
      file_name: null,
    })
  })

  it('does not treat unrelated ids as deliverable receipts', () => {
    expect(extractToolDeliverableReceipt({ success: true, id: 'campaign-id' })).toBeNull()
  })
})
