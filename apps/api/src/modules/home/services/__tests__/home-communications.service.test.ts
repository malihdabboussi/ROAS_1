import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { HomeCommunicationsRepository } from '../../repositories/home-communications.repository'
import { HomeCommunicationsService } from '../home-communications.service'

function createQuery(result: Record<string, unknown>) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

describe('HomeCommunicationsService', () => {
  it('requires an organization scope', async () => {
    const service = new HomeCommunicationsService(
      { client: {} } as never,
      {} as never,
      {} as never,
      new HomeCommunicationsRepository(),
    )

    await expect(
      service.listRecent(
        {} as never,
        { userId: 'user-1', orgId: null, orgRole: null },
        { limit: 15 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('returns an empty recent communication list when scoped rows are empty', async () => {
    const membershipQuery = createQuery({ data: [], error: null })
    const channelMessagesQuery = createQuery({ data: [], error: null })
    const dmMessagesQuery = createQuery({ data: [], error: null })
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(membershipQuery)
        .mockReturnValueOnce(channelMessagesQuery)
        .mockReturnValueOnce(dmMessagesQuery),
    }
    const channelsService = { getUnreadCounts: vi.fn().mockResolvedValue({ counts: {} }) }
    const dmService = { getUnreadCounts: vi.fn().mockResolvedValue({ counts: {} }) }
    const service = new HomeCommunicationsService(
      { client: { from: vi.fn() } } as never,
      channelsService as never,
      dmService as never,
      new HomeCommunicationsRepository(),
    )

    await expect(
      service.listRecent(
        supabase as never,
        { userId: 'user-1', orgId: 'org-1', orgRole: 'member' },
        { limit: 15 },
      ),
    ).resolves.toEqual({ items: [] })

    expect(membershipQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(channelMessagesQuery.in).toHaveBeenCalledWith('channel_id', [])
  })
})
