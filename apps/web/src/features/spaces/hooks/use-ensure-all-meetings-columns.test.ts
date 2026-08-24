import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEnsureAllMeetingsColumns } from './use-ensure-all-meetings-columns'

const mocks = vi.hoisted(() => ({
  updateSpace: vi.fn(),
  patchActiveSpaceSchema: vi.fn(),
  spaces: [] as Array<{ id: string; schema: Record<string, unknown> }>,
}))

vi.mock('../services/spaces.service', () => ({
  updateSpace: mocks.updateSpace,
}))

vi.mock('../store/use-spaces-store', () => ({
  useSpacesStore: {
    getState: () => ({
      spaces: mocks.spaces,
      patchActiveSpaceSchema: mocks.patchActiveSpaceSchema,
    }),
  },
}))

describe('useEnsureAllMeetingsColumns', () => {
  beforeEach(() => {
    mocks.updateSpace.mockReset()
    mocks.patchActiveSpaceSchema.mockReset()
    mocks.updateSpace.mockResolvedValue(undefined)
    mocks.spaces = []
  })

  it('persists Host, Attendees, and Call status when All Meetings has old columns', () => {
    mocks.spaces = [
      {
        id: 'meetings-space',
        schema: {
          fields: [{ id: 'title', name: 'Name', type: 'text' }],
          views: [{ id: 'all-meetings', visible_fields: ['title', 'priority', 'status'] }],
        },
      },
    ]

    renderHook(() => useEnsureAllMeetingsColumns('meetings-space'))

    expect(mocks.patchActiveSpaceSchema).toHaveBeenCalledTimes(1)
    expect(mocks.updateSpace).toHaveBeenCalledWith(
      'meetings-space',
      expect.objectContaining({
        schema: expect.objectContaining({
          views: [
            expect.objectContaining({
              visible_fields: [
                'title',
                'call_kind',
                'campaign_name',
                'space_title',
                'host',
                'attendees',
                'call_date',
                'call_status',
                'recording_url',
              ],
            }),
          ],
        }),
      }),
    )
  })

  it('does not patch a Meetings space that already has the one-room columns', () => {
    mocks.spaces = [
      {
        id: 'meetings-space',
        schema: {
          fields: [
            { id: 'title', name: 'Name', type: 'text' },
            { id: 'client_campaign', name: 'Client / Campaign', type: 'text' },
            { id: 'campaign_name', name: 'Client Workspace', type: 'text' },
            { id: 'space_title', name: 'Campaign Space', type: 'text' },
            { id: 'host', name: 'Host', type: 'text' },
            {
              id: 'attendees',
              name: 'Attendees',
              type: 'multi_select',
              required: false,
              options: [],
            },
            { id: 'call_status', name: 'Call status', type: 'select' },
          ],
          views: [
            {
              id: 'all-meetings',
              visible_fields: [
                'title',
                'call_kind',
                'campaign_name',
                'space_title',
                'host',
                'attendees',
                'call_date',
                'call_status',
                'recording_url',
              ],
            },
          ],
        },
      },
    ]

    renderHook(() => useEnsureAllMeetingsColumns('meetings-space'))

    expect(mocks.patchActiveSpaceSchema).not.toHaveBeenCalled()
    expect(mocks.updateSpace).not.toHaveBeenCalled()
  })
})
