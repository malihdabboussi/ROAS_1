import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendPatch } from '@/lib/api/backend-client'
import {
  setCustomerBrainEnabled,
  toggleCortexMax,
  updateCompanyCortexSettings,
} from './brain-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendPatch: vi.fn(),
}))

const backendPatchMock = vi.mocked(backendPatch)

describe('brain api', () => {
  beforeEach(() => {
    backendPatchMock.mockReset()
  })

  it('toggles Cortex Max with an encoded brain id', async () => {
    const response = { success: true, cortex_max: true, initial_sync_triggered: false } as const
    backendPatchMock.mockResolvedValue(response)

    await expect(toggleCortexMax('brain/id 1', true)).resolves.toBe(response)

    expect(backendPatchMock).toHaveBeenCalledWith('/api/brain/brain%2Fid%201/cortex-max', {
      enabled: true,
    })
  })

  it('updates Customer Brain enabled state', async () => {
    const response = { success: true, brain_id: 'brain-1', enabled: true }
    backendPatchMock.mockResolvedValue(response)

    await expect(setCustomerBrainEnabled(true)).resolves.toBe(response)

    expect(backendPatchMock).toHaveBeenCalledWith('/api/brain/customer/enabled', {
      enabled: true,
    })
  })

  it('updates Company Cortex settings', async () => {
    const input = { enabled: true, schedule: 'daily' as const }
    const response = {
      success: true,
      brain_id: 'brain-1',
      enabled: true,
      settings: {
        org_id: 'org-1',
        brain_id: 'brain-1',
        enabled: true,
        schedule: 'daily' as const,
        local_time: '02:00',
        timezone: 'UTC',
        lookback_hours: 24,
        include_sources: [],
        min_activity_threshold: 1,
        last_successful_dream_at: null,
      },
    }
    backendPatchMock.mockResolvedValue(response)

    await expect(updateCompanyCortexSettings(input)).resolves.toBe(response)

    expect(backendPatchMock).toHaveBeenCalledWith('/api/brain/company/settings', input)
  })
})
