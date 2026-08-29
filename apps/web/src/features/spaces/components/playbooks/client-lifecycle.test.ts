import { describe, expect, it } from 'vitest'
import {
  buildClientLifecycleMissionPayload,
  CLIENT_LIFECYCLE_PLAYBOOK_ID,
} from './client-lifecycle'

describe('buildClientLifecycleMissionPayload', () => {
  it('starts a client lifecycle mission with canonical client context and source links', () => {
    const payload = buildClientLifecycleMissionPayload({
      client_context: 'Power Circle client lifecycle',
      transcript_url: 'https://fathom.video/share/onboarding-call',
      drive_links: 'https://drive.google.com/drive/folders/client',
      notes: 'Begin with onboarding and preserve every approval.',
    })

    expect(payload.title).toBe('Client Lifecycle')
    expect(payload.input.playbook_id).toBe(CLIENT_LIFECYCLE_PLAYBOOK_ID)
    expect(payload.input.playbook_kickoff).toEqual({
      client_context: 'Power Circle client lifecycle',
      transcript_url: 'https://fathom.video/share/onboarding-call',
      drive_links: 'https://drive.google.com/drive/folders/client',
      notes: 'Begin with onboarding and preserve every approval.',
    })
  })
})
