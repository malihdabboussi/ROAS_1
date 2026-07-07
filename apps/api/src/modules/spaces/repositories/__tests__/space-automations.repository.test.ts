import { ConflictException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationsRepository } from '../space-automations.repository'

function writeChain(result: unknown) {
  const api: Record<string, unknown> = {
    insert: vi.fn(() => api),
    update: vi.fn(() => api),
    delete: vi.fn(() => api),
    eq: vi.fn(() => api),
    select: vi.fn(() => api),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    error: null,
  }
  return api
}

describe('SpaceAutomationsRepository', () => {
  it('creates a persisted automation row with space ownership and created_by', async () => {
    const row = { id: 'automation-1', name: 'Notify', created_by: 'author-1' }
    const chain = writeChain({ data: row, error: null })
    const supabase = { from: vi.fn(() => chain) }
    const repo = new SpaceAutomationsRepository()

    const result = await repo.create(
      supabase as never,
      { id: 'space-1', user_id: 'owner-1', org_id: null },
      'author-1',
      {
        name: 'Notify',
        enabled: true,
        trigger: { type: 'task_created' },
        actions: [{ type: 'add_comment', message_template: 'Created' }],
      } as never,
    )

    expect(result).toEqual(row)
    expect(supabase.from).toHaveBeenCalledWith('space_automations')
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        space_id: 'space-1',
        user_id: 'owner-1',
        org_id: null,
        created_by: 'author-1',
      }),
    )
  })

  it('throws conflict when expectedUpdatedAt does not match an update row', async () => {
    const chain = writeChain({ data: null, error: null })
    const supabase = { from: vi.fn(() => chain) }
    const repo = new SpaceAutomationsRepository()

    await expect(
      repo.update(supabase as never, 'space-1', 'automation-1', { name: 'New name' } as never, {
        expectedUpdatedAt: 'old-timestamp',
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('deletes a persisted automation row by space and id', async () => {
    const chain = writeChain({ data: null, error: null })
    const supabase = { from: vi.fn(() => chain) }
    const repo = new SpaceAutomationsRepository()

    await expect(repo.delete(supabase as never, 'space-1', 'automation-1')).resolves.toEqual({
      deleted: true,
    })
    expect(supabase.from).toHaveBeenCalledWith('space_automations')
    expect(chain.delete).toHaveBeenCalled()
  })
})
