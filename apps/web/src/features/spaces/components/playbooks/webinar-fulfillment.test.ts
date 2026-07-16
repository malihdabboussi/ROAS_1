import { describe, expect, it } from 'vitest'
import {
  buildWebinarFulfillmentMissionPayload,
  WEBINAR_FULFILLMENT_PLAYBOOK_ID,
} from './webinar-fulfillment'

describe('buildWebinarFulfillmentMissionPayload', () => {
  it('embeds playbook_id and kickoff on mission input', () => {
    const payload = buildWebinarFulfillmentMissionPayload({
      start_at: 'post_call',
      client_context: 'Impact webinar',
      transcript_url: 'https://example.com/t',
      drive_links: '',
      notes: 'Focus offer',
    })
    expect(payload.title).toBe('Webinar Fulfillment')
    expect(payload.input.playbook_id).toBe(WEBINAR_FULFILLMENT_PLAYBOOK_ID)
    expect(payload.input.playbook_kickoff).toMatchObject({
      start_at: 'post_call',
      client_context: 'Impact webinar',
      transcript_url: 'https://example.com/t',
      notes: 'Focus offer',
    })
    expect(payload.brief).toContain('Start at: post_call')
  })
})
