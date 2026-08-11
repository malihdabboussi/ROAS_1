import { describe, expect, it, vi } from 'vitest'
import { SlackContextStakesService } from '../slack-context-stakes.service'

describe('SlackContextStakesService', () => {
  it('joins matching calendar and Fathom stakes to client labels', async () => {
    const calendar = {
      getAgenda: vi.fn().mockResolvedValue({
        events: [
          {
            title: 'PascalZone premium event',
            description: '',
            start: '2026-08-18T17:00:00Z',
            attendees: [],
          },
        ],
      }),
    }
    const moduleRef = { get: vi.fn().mockReturnValue(calendar) }
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockResolvedValue({
      data: [
        {
          title: 'Send PascalZone recap',
          status: 'in_progress',
          custom_data: { action_ledger: { created_from: 'meeting_follow_up' } },
        },
      ],
      error: null,
    })
    const service = new SlackContextStakesService(moduleRef as never)
    const stakes = await service.build({
      supabase: { from: vi.fn().mockReturnValue(query) } as never,
      userId: 'user-1',
      orgId: 'org-1',
      timezone: 'America/Los_Angeles',
      now: new Date('2026-08-10T20:00:00Z'),
      items: [{ client_label: 'PascalZone', summary: 'Recap is open' }],
    })
    expect(stakes).toEqual([
      expect.stringContaining('Next relevant event for PascalZone'),
      'Fathom follow-up for PascalZone [in_progress]: Send PascalZone recap',
    ])
  })

  it('does not fetch cross-context data without a grounded client label', async () => {
    const moduleRef = { get: vi.fn() }
    const service = new SlackContextStakesService(moduleRef as never)
    await expect(
      service.build({
        supabase: {} as never,
        userId: 'user-1',
        orgId: 'org-1',
        timezone: 'America/Los_Angeles',
        now: new Date(),
        items: [{ client_label: null, summary: 'Unlabeled item' }],
      }),
    ).resolves.toEqual([])
    expect(moduleRef.get).not.toHaveBeenCalled()
  })
})
