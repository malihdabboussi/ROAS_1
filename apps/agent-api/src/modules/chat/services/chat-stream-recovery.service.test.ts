import { describe, expect, it } from 'vitest'
import { ChatStreamRecoveryService } from './chat-stream-recovery.service'

describe('ChatStreamRecoveryService', () => {
  const service = new ChatStreamRecoveryService()

  it('keeps generic runtime service unavailability out of provider-busy recovery', () => {
    expect(service.isRetryableProviderError('Service unavailable')).toBe(false)
    expect(service.classifyAgentStreamFailure('Service unavailable')).toEqual({
      code: 'temporary_unavailable',
    })
  })

  it('treats explicit provider overloads as busy', () => {
    expect(service.isRetryableProviderError('Provider temporarily overloaded')).toBe(true)
    expect(service.classifyAgentStreamFailure('Provider temporarily overloaded')).toEqual({
      code: 'busy',
    })
  })
})
