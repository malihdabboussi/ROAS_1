import { describe, expect, it } from 'vitest'
import { shouldEnableInProcessScheduling } from './cron-runtime-policy'

describe('in-process cron runtime policy', () => {
  it('disables Nest timers on Vercel serverless invocations', () => {
    expect(shouldEnableInProcessScheduling({ VERCEL: '1' })).toBe(false)
  })

  it('keeps Nest timers enabled on persistent hosts', () => {
    expect(shouldEnableInProcessScheduling({})).toBe(true)
  })
})
