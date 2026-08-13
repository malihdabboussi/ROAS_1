import { describe, expect, it } from 'vitest'
import {
  buildClientStrategyMissionPayload,
  CLIENT_STRATEGY_PLAYBOOK_ID,
} from './client-strategy'

describe('buildClientStrategyMissionPayload', () => {
  it('starts the standalone client strategy playbook with campaign context', () => {
    const payload = buildClientStrategyMissionPayload({
      client_context: 'Acme coaching launch',
      transcript_url: '',
      drive_links: 'https://drive.example/brief',
      notes: 'Confirm the offer stack before the call',
    })

    expect(payload.title).toBe('Client Strategy')
    expect(payload.input.playbook_id).toBe(CLIENT_STRATEGY_PLAYBOOK_ID)
    expect(payload.input.playbook_kickoff).toMatchObject({
      client_context: 'Acme coaching launch',
      drive_links: 'https://drive.example/brief',
      notes: 'Confirm the offer stack before the call',
    })
  })
})
