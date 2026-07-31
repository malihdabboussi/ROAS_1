import { describe, expect, it, vi } from 'vitest'
import { withOpenRouterRetry } from './retry.js'

describe('withOpenRouterRetry', () => {
  it('retries transient OpenRouter failures', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('OpenRouter returned 429'))
      .mockResolvedValue('ok')
    const wait = vi.fn<() => Promise<void>>().mockResolvedValue()

    await expect(withOpenRouterRetry(operation, wait)).resolves.toBe('ok')
    expect(operation).toHaveBeenCalledTimes(2)
    expect(wait).toHaveBeenCalledWith(500)
  })

  it('does not retry permanent failures', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('Unauthorized 401'))
    const wait = vi.fn<() => Promise<void>>().mockResolvedValue()

    await expect(withOpenRouterRetry(operation, wait)).rejects.toThrow('Unauthorized 401')
    expect(operation).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })
})
