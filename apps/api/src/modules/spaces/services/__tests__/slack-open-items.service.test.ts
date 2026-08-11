import { describe, expect, it, vi } from 'vitest'
import { SlackOpenItemsService } from '../slack-open-items.service'

describe('SlackOpenItemsService', () => {
  it('writes unanswered questions and client risks without weakening signal gates', async () => {
    const items = {
      upsert: vi.fn().mockResolvedValue(undefined),
      listDueForResolution: vi.fn().mockResolvedValue([]),
      enforceRetention: vi.fn().mockResolvedValue(undefined),
    }
    const service = new SlackOpenItemsService(items as never, {} as never)
    const base = {
      orgId: 'org-1',
      subjectPersonId: 'person-1',
      clientLabel: 'Christian Osgood',
      channelId: 'C1',
      sourceMessageTs: '1786400000.001',
      shadowActionId: 'action-1',
      now: new Date('2026-08-10T20:00:00Z'),
    }

    await service.record({} as never, {
      ...base,
      signalKind: 'unanswered_question',
      summary: 'Can someone confirm the launch date?',
    })
    await service.record({} as never, {
      ...base,
      sourceMessageTs: '1786400001.001',
      signalKind: 'client_risk',
      summary: 'Client is blocked on tracking.',
    })

    expect(items.upsert).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ kind: 'question', first_seen_at: '2026-08-10T20:00:00.000Z' }),
    )
    expect(items.upsert).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ kind: 'risk' }),
    )
  })

  it('rechecks due rows and persists resolved outcomes every fifteen minutes', async () => {
    const item = {
      id: 'item-1',
      kind: 'question',
      status: 'open',
      last_activity_at: '2026-08-09T20:00:00Z',
      metadata: { shadow_action_id: 'action-1' },
    }
    const items = {
      listDueForResolution: vi.fn().mockResolvedValue([item]),
      saveResolution: vi.fn().mockResolvedValue(undefined),
      enforceRetention: vi.fn().mockResolvedValue(undefined),
    }
    const resolution = {
      refresh: vi.fn().mockResolvedValue({
        resolution: {
          resolved: true,
          reason: 'A later human reply was found.',
          checked_at: '2026-08-10T20:00:00.000Z',
        },
      }),
    }
    const service = new SlackOpenItemsService(items as never, resolution as never)

    await service.reconcile({} as never, 'org-1', new Date('2026-08-10T20:00:00Z'))

    expect(items.listDueForResolution).toHaveBeenCalledWith(
      expect.anything(),
      'org-1',
      '2026-08-10T19:45:00.000Z',
    )
    expect(items.saveResolution).toHaveBeenCalledWith(
      expect.anything(),
      item,
      expect.objectContaining({ resolved: true }),
    )
    expect(items.enforceRetention).toHaveBeenCalled()
  })
})
