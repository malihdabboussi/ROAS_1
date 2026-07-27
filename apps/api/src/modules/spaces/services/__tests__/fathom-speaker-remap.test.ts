import { describe, expect, it, vi } from 'vitest'
import { applySpeakerRemapToMeetingItem } from '../fathom-speaker-remap'

describe('fathom-speaker-remap', () => {
  it('persists speaker remaps and refreshes attendee option ids', async () => {
    const updateSpace = vi.fn(async () => ({}))
    const updateItem = vi.fn(async (_sb, _uid, _sid, _iid, patch) => ({
      id: 'item-1',
      custom_data: patch.custom_data,
    }))
    const result = await applySpeakerRemapToMeetingItem({
      supabase: {} as never,
      repo: {
        findSpaceById: async () => ({
          schema: {
            fields: [
              {
                id: 'attendees',
                type: 'multi_select',
                options: [{ id: 'att_speaker_1', label: 'Speaker 1' }],
              },
            ],
          },
        }),
        updateSpace,
        updateItem,
      },
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      itemId: 'item-1',
      item: {
        id: 'item-1',
        custom_data: {
          entry_type: 'call',
          attendees: ['att_speaker_1'],
          unresolved_speakers: ['Speaker 1'],
        },
      },
      speakerKey: 'Speaker 1',
      binding: { label: 'Nate Tilley', email: 'nate@roas.co' },
    })

    expect(updateSpace).toHaveBeenCalled()
    expect(updateItem).toHaveBeenCalled()
    const patch = updateItem.mock.calls[0]![4] as {
      custom_data: {
        speaker_remaps: Record<string, { label: string }>
        unresolved_speakers: string[]
        attendees: string[]
      }
    }
    expect(patch.custom_data.speaker_remaps['Speaker 1']?.label).toBe('Nate Tilley')
    expect(patch.custom_data.unresolved_speakers).toEqual([])
    expect(patch.custom_data.attendees.length).toBeGreaterThan(0)
    expect(result.custom_data).toBeTruthy()
  })
})
