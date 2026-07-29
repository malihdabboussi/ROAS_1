import { describe, expect, it, vi } from 'vitest'
import { MeetingWorkspaceRepository } from './meeting-workspace.repository'

describe('MeetingWorkspaceRepository context links', () => {
  it('writes required metadata for every generated context link', async () => {
    const contextUpsert = vi.fn(async () => ({ error: null }))
    const spacesQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({
        data: { campaign_id: 'campaign-1' },
        error: null,
      })),
    }
    spacesQuery.select.mockReturnValue(spacesQuery)
    spacesQuery.eq.mockReturnValue(spacesQuery)

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'spaces') return spacesQuery
        if (table === 'meeting_context_links') return { upsert: contextUpsert }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
    const repository = new MeetingWorkspaceRepository()

    await repository.upsertParticipantContextLinks(supabase as never, {
      meetingItemId: 'meeting-1',
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: 'org-1',
      participantEmails: [],
    })

    expect(contextUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          entity_type: 'space',
          metadata: {},
        }),
        expect.objectContaining({
          entity_type: 'campaign',
          metadata: {},
        }),
      ],
      { onConflict: 'meeting_item_id,entity_type,entity_id' },
    )
  })
})
