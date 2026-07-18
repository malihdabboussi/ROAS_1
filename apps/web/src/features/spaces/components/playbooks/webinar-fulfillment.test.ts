import { describe, expect, it } from 'vitest'
import {
  buildWebinarFulfillmentMissionPayload,
  WEBINAR_FULFILLMENT_PLAYBOOK_ID,
} from './webinar-fulfillment'

describe('buildWebinarFulfillmentMissionPayload', () => {
  it('embeds playbook_id and kickoff on mission input', () => {
    const payload = buildWebinarFulfillmentMissionPayload({
      client_context: 'Impact webinar',
      transcript_url: 'https://example.com/t',
      drive_links: '',
      notes: 'Focus offer',
    })
    expect(payload.title).toBe('Webinar Fulfillment')
    expect(payload.input.playbook_id).toBe(WEBINAR_FULFILLMENT_PLAYBOOK_ID)
    expect(payload.input.playbook_kickoff).toMatchObject({
      client_context: 'Impact webinar',
      transcript_url: 'https://example.com/t',
      notes: 'Focus offer',
    })
    expect(payload.input.playbook_kickoff).not.toHaveProperty('start_at')
    expect(payload.brief).not.toContain('Start at:')
  })
})
