import { describe, expect, it, vi } from 'vitest'
import {
  AUTH_LOGIN_TIMEOUT_MESSAGE,
  resolveAuthLoginErrorMessage,
  withAuthLoginTimeout,
} from './auth-login'

describe('auth login resilience', () => {
  it('replaces empty serialized errors with an actionable message', () => {
    expect(resolveAuthLoginErrorMessage({})).toBe(AUTH_LOGIN_TIMEOUT_MESSAGE)
    expect(resolveAuthLoginErrorMessage(new Error('{}'))).toBe(AUTH_LOGIN_TIMEOUT_MESSAGE)
  })

  it('keeps specific credential and verification guidance', () => {
    expect(resolveAuthLoginErrorMessage(new Error('Invalid login credentials'))).toBe(
      'Invalid email or password.',
    )
    expect(resolveAuthLoginErrorMessage(new Error('Email not confirmed'))).toBe(
      'Please verify your email.',
    )
  })

  it('stops waiting when the auth provider does not respond', async () => {
    vi.useFakeTimers()
    const pending = new Promise<never>(() => {})
    const result = withAuthLoginTimeout(pending)
    const assertion = expect(result).rejects.toThrow(AUTH_LOGIN_TIMEOUT_MESSAGE)

    await vi.advanceTimersByTimeAsync(15_000)

    await assertion
    vi.useRealTimers()
  })
})
