import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { FeatureUpdatesRepository } from '../repositories/feature-updates.repository'
import { FeatureUpdatesService } from '../services/feature-updates.service'
import { FeatureUpdatesController } from './feature-updates.controller'

const user = { id: 'user-1', email: 'user@example.com' }

function createQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: (value: Record<string, unknown>) => unknown) =>
      Promise.resolve(resolve(result)),
  }
  return query
}

function createSupabase(query: Record<string, any>) {
  return {
    from: vi.fn(() => query),
  }
}

describe('FeatureUpdatesController', () => {
  it('returns active feature updates ordered by sort order then creation date', async () => {
    const updates = [
      {
        id: 'update-1',
        title: 'Update',
        description: 'Description',
        video_url: null,
        try_now_path: null,
        learn_more_url: null,
        category: 'new',
        is_active: true,
        sort_order: 1,
        created_at: '2026-06-09T00:00:00.000Z',
      },
    ]
    const query = createQuery({ data: updates, error: null })
    const supabase = createSupabase(query)
    const controller = new FeatureUpdatesController(
      new FeatureUpdatesService(new FeatureUpdatesRepository()),
    )

    await expect(controller.listFeatureUpdates(user, supabase as never)).resolves.toEqual({
      updates,
    })

    expect(supabase.from).toHaveBeenCalledWith('feature_updates')
    expect(query.select).toHaveBeenCalledWith(
      'id,title,description,video_url,try_now_path,learn_more_url,category,is_active,sort_order,created_at',
    )
    expect(query.eq).toHaveBeenCalledWith('is_active', true)
    expect(query.order).toHaveBeenNthCalledWith(1, 'sort_order', { ascending: true })
    expect(query.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false })
  })

  it('throws a bad request when feature update loading fails', async () => {
    const query = createQuery({ data: null, error: { message: 'db failed' } })
    const supabase = createSupabase(query)
    const controller = new FeatureUpdatesController(
      new FeatureUpdatesService(new FeatureUpdatesRepository()),
    )

    await expect(controller.listFeatureUpdates(user, supabase as never)).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })
})
