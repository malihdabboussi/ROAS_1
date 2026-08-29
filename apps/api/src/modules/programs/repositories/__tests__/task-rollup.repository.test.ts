import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { TaskRollupRepository } from '../task-rollup.repository'

describe('TaskRollupRepository', () => {
  it('applies the current-user assignment filter before the result limit', async () => {
    const calls: string[] = []
    const query = {
      select: vi.fn(() => query),
      in: vi.fn(() => query),
      is: vi.fn(() => query),
      not: vi.fn(() => query),
      eq: vi.fn(() => query),
      contains: vi.fn(() => {
        calls.push('contains')
        return query
      }),
      order: vi.fn(() => {
        calls.push('order')
        return query
      }),
      limit: vi.fn(async () => {
        calls.push('limit')
        return { data: [], error: null }
      }),
    }
    const supabase = {
      from: vi.fn(() => query),
    } as unknown as SupabaseClient

    await new TaskRollupRepository().listOpenSpaceItems(supabase, {
      spaceIds: ['space-1'],
      orgId: 'org-1',
      assigneeUserId: 'user-1',
      limit: 5,
    })

    expect(query.contains).toHaveBeenCalledWith('assignees', '[{"type":"human","id":"user-1"}]')
    expect(query.limit).toHaveBeenCalledWith(5)
    expect(calls).toEqual(['contains', 'order', 'limit'])
  })
})
