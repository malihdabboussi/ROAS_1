import type { ExecutionContext } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { CreditsGuard } from './credits.guard'

function makeContext(params: { user?: { id: string }; body?: Record<string, unknown> }) {
  const setHeader = vi.fn()
  const request = {
    user: params.user,
    body: params.body ?? {},
  }
  const response = { setHeader }
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext
  return { context, setHeader }
}

describe('CreditsGuard subscription model bypass', () => {
  it('skips the credit balance gate for explicit subscription model requests', async () => {
    const creditsService = {
      isSubscriptionBackedModelId: vi.fn(() => true),
      assertHasAvailableCredits: vi.fn(),
    }
    const guard = new CreditsGuard(creditsService as any)
    const { context, setHeader } = makeContext({
      user: { id: 'user-1' },
      body: { model: 'openai-codex/gpt-5.5' },
    })

    await expect(guard.canActivate(context)).resolves.toBe(true)

    expect(creditsService.isSubscriptionBackedModelId).toHaveBeenCalledWith(
      'openai-codex/gpt-5.5',
    )
    expect(creditsService.assertHasAvailableCredits).not.toHaveBeenCalled()
    expect(setHeader).toHaveBeenCalledWith('x-credits-subscription-bypass', 'true')
  })

  it('keeps the normal credit balance gate for provider-paid requests', async () => {
    const creditsService = {
      isSubscriptionBackedModelId: vi.fn(() => false),
      assertHasAvailableCredits: vi.fn(async () => ({ totalAvailable: 50 })),
    }
    const guard = new CreditsGuard(creditsService as any)
    const { context, setHeader } = makeContext({
      user: { id: 'user-1' },
      body: { model: 'openai/gpt-5.5' },
    })

    await expect(guard.canActivate(context)).resolves.toBe(true)

    expect(creditsService.assertHasAvailableCredits).toHaveBeenCalledWith('user-1', undefined)
    expect(setHeader).toHaveBeenCalledWith('x-credits-low', 'true')
    expect(setHeader).toHaveBeenCalledWith('x-credits-remaining', '50')
  })
})
