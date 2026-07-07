import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { SlackApiIntegration } from '../slack-api.integration'

describe('SlackApiIntegration.verifyRequestSignature', () => {
  it('accepts a valid Slack signature', () => {
    const integration = new SlackApiIntegration()
    const signingSecret = 'secret123'
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const rawBody = Buffer.from(
      JSON.stringify({ type: 'event_callback', event: { text: 'hello' } }),
    )
    const base = `v0:${timestamp}:${rawBody.toString('utf8')}`
    const sig = `v0=${createHmac('sha256', signingSecret).update(base).digest('hex')}`

    const valid = integration.verifyRequestSignature(rawBody, timestamp, sig, signingSecret)
    expect(valid).toBe(true)
  })

  it('rejects an invalid Slack signature', () => {
    const integration = new SlackApiIntegration()
    const signingSecret = 'secret123'
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const rawBody = Buffer.from(
      JSON.stringify({ type: 'event_callback', event: { text: 'hello' } }),
    )

    const valid = integration.verifyRequestSignature(rawBody, timestamp, 'v0=bad', signingSecret)
    expect(valid).toBe(false)
  })
})
