import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { createMockSupabaseChain } from '../../../test/setup'
import { MeetingMergeRepository } from './meeting-merge.repository'

describe('MeetingMergeRepository', () => {
  const repo = new MeetingMergeRepository()

  describe('listMeetingItems', () => {
    it('selects the requested items scoped to the space', async () => {
      const rows = [{ id: 'keep' }, { id: 'dup-1' }]
      const chain = createMockSupabaseChain({ data: rows, error: null })

      const result = await repo.listMeetingItems(chain as never, 'space-1', ['keep', 'dup-1'])

      expect(chain.from).toHaveBeenCalledWith('space_items')
      expect(chain.eq).toHaveBeenCalledWith('space_id', 'space-1')
      expect(chain.in).toHaveBeenCalledWith('id', ['keep', 'dup-1'])
      expect(result).toEqual(rows)
    })

    it('throws when the query fails', async () => {
      const chain = createMockSupabaseChain({ data: null, error: { message: 'boom' } })
      await expect(
        repo.listMeetingItems(chain as never, 'space-1', ['keep']),
      ).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  describe('mergeMeetingItems', () => {
    const input = {
      spaceId: 'space-1',
      survivorItemId: 'keep',
      duplicateItemIds: ['dup-1', 'dup-2'],
      survivorPatch: {
        custom_data: { entry_type: 'call' },
        description: null,
        notes: null,
      },
    }

    it('invokes the transactional merge_meeting_items RPC', async () => {
      const summary = { duplicates_merged: 2, recordings_moved: 1 }
      const rpc = vi.fn().mockResolvedValue({ data: summary, error: null })

      const result = await repo.mergeMeetingItems({ rpc } as never, input)

      expect(rpc).toHaveBeenCalledWith('merge_meeting_items', {
        p_space_id: 'space-1',
        p_survivor_item_id: 'keep',
        p_duplicate_item_ids: ['dup-1', 'dup-2'],
        p_survivor_patch: input.survivorPatch,
      })
      expect(result).toEqual(summary)
    })

    it('throws when the RPC fails', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'merge failed' } })
      await expect(repo.mergeMeetingItems({ rpc } as never, input)).rejects.toBeInstanceOf(
        BadRequestException,
      )
    })
  })
})
