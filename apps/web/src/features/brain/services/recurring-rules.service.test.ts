import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listRecurringTrainingRules, recurringTrainingKindLabel } from './recurring-rules.service'

const mocks = vi.hoisted(() => ({
  backendGet: vi.fn(),
  backendPost: vi.fn(),
  backendDelete: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: mocks.backendGet,
  backendPost: mocks.backendPost,
  backendDelete: mocks.backendDelete,
}))

vi.mock('@/lib/utils/org-storage', () => ({
  getActiveOrgIdFromStorage: () => null,
}))

describe('listRecurringTrainingRules', () => {
  beforeEach(() => {
    mocks.backendGet.mockReset()
  })

  it('derives the Read AI rule from the shared note-taker status endpoint', async () => {
    mocks.backendGet.mockImplementation(async (path: string) => {
      if (path === '/api/integrations/meetings/read_ai/status') {
        return {
          success: true,
          connected: true,
          status: 'connected',
          connectedAt: '2026-09-15T11:16:10Z',
        }
      }
      if (path === '/api/brain/training-destinations') return { destinations: [] }
      throw new Error(`not connected: ${path}`)
    })
    const { rules } = await listRecurringTrainingRules()
    const readAi = rules.find((rule) => rule.kind === 'read_ai_auto')
    expect(readAi).toMatchObject({
      id: 'read_ai:auto',
      name: 'Read AI meetings',
      connected: true,
      enabled: true,
      cadence: 'realtime',
      destinationKind: 'user',
      connectedAt: '2026-09-15T11:16:10Z',
    })
    expect(mocks.backendGet).toHaveBeenCalledWith('/api/integrations/meetings/read_ai/status')
    expect(recurringTrainingKindLabel('read_ai_auto')).toBe('Read AI')
  })

  it('shows Read AI as not connected when the status call fails', async () => {
    mocks.backendGet.mockRejectedValue(new Error('offline'))
    const { rules } = await listRecurringTrainingRules()
    expect(rules.find((rule) => rule.kind === 'read_ai_auto')).toMatchObject({
      connected: false,
      enabled: false,
    })
    const kinds = rules.map((rule) => rule.kind)
    expect(kinds.indexOf('read_ai_auto')).toBeGreaterThan(kinds.indexOf('fireflies_sync'))
    expect(kinds.indexOf('read_ai_auto')).toBeLessThan(kinds.indexOf('zoom_auto'))
  })
})
