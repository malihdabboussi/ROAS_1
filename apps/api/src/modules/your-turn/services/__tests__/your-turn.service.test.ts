import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { YourTurnQuery } from '../../dto'
import { YourTurnRepository } from '../../repositories/your-turn.repository'
import { YourTurnService } from '../your-turn.service'

function createQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gt: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: Record<string, unknown>) => unknown) =>
      Promise.resolve(resolve(result)),
  }
  return query
}

describe('YourTurnService', () => {
  it('filters workspace results to the active workspace org and personal rows', async () => {
    const rows = [
      { id: 'personal', org_id: null, space_id: null },
      { id: 'workspace', org_id: 'org-1', space_id: null },
      { id: 'other', org_id: 'org-2', space_id: null },
    ]
    const itemsQuery = createQuery({ data: rows, error: null })
    const supabase = { from: vi.fn(() => itemsQuery) }
    const service = new YourTurnService(new YourTurnRepository())
    const query = { limit: 100, feed_scope: 'workspace' } as YourTurnQuery

    await expect(service.list(supabase as never, query, 'org-1', 'user-1')).resolves.toEqual([
      rows[0],
      rows[1],
    ])

    expect(supabase.from).toHaveBeenCalledWith('your_turn_items')
  })

  it('rejects org feed access when membership is missing', async () => {
    const membershipQuery = createQuery({ data: null, error: null })
    const supabase = { from: vi.fn(() => membershipQuery) }
    const service = new YourTurnService(new YourTurnRepository())
    const query = {
      limit: 100,
      feed_scope: 'org',
      feed_org_id: '00000000-0000-0000-0000-000000000001',
    } as YourTurnQuery

    await expect(service.list(supabase as never, query, null, 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })
})
