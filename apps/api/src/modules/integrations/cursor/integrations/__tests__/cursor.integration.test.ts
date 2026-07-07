import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { CursorIntegration } from '../cursor.integration'

describe('CursorIntegration', () => {
  const integration = new CursorIntegration()

  it('verifyWebhookSignature accepts valid signature', () => {
    const secret = 'test-secret'
    const body = Buffer.from('{"event":"statusChange","id":"agent_1"}')
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
    expect(integration.verifyWebhookSignature(secret, body, signature)).toBe(true)
  })

  it('verifyWebhookSignature rejects tampered body', () => {
    const secret = 'test-secret'
    const body = Buffer.from('{"event":"statusChange","id":"agent_1"}')
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
    const tampered = Buffer.from('{"event":"statusChange","id":"agent_2"}')
    expect(integration.verifyWebhookSignature(secret, tampered, signature)).toBe(false)
  })

  it('verifyWebhookSignature rejects missing signature', () => {
    const body = Buffer.from('{}')
    expect(integration.verifyWebhookSignature('secret', body, undefined)).toBe(false)
  })
})
