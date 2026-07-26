import { describe, expect, it, vi } from 'vitest'
import { ProviderBillingSettlementService } from './provider-billing-settlement.service'

describe('ProviderBillingSettlementService output validation', () => {
  it('closes a rejected dedicated image request as no-charge', async () => {
    const repository = {
      findById: vi.fn(async () => ({
        id: 'attempt-1',
        metadata_json: { existing: true },
      })),
      updateAttempt: vi.fn(async (_id: string, patch: Record<string, unknown>) => ({
        id: 'attempt-1',
        ...patch,
      })),
    }
    const service = new ProviderBillingSettlementService(
      repository as never,
      {} as never,
      {} as never,
    )

    await service.recordOutputValidation({
      attemptId: 'attempt-1',
      state: 'provider_failed',
      error: 'OpenRouter image request failed with status 502',
    })

    expect(repository.updateAttempt).toHaveBeenCalledWith(
      'attempt-1',
      expect.objectContaining({
        status: 'no_charge',
        final_cost_usd: 0,
        metadata_json: expect.objectContaining({
          image_output_validation: expect.objectContaining({
            state: 'provider_failed',
          }),
        }),
      }),
    )
  })
})
