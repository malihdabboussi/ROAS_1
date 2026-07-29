import { describe, expect, it, vi } from 'vitest'
import { MeetingWorkspaceService } from './meeting-workspace.service'

describe('MeetingWorkspaceService', () => {
  it('reopens a completed meeting conversation without marking the call live', async () => {
    const repository = { upsertWorkspace: vi.fn() }
    const readRepository = {
      getWorkspaceBundle: vi.fn().mockResolvedValue({
        meeting: { id: 'meeting-1', title: 'Strategy call' },
        workspace: {
          meeting_item_id: 'meeting-1',
          phase: 'complete',
          conversation_id: 'conversation-1',
        },
      }),
    }
    const stateRepository = {
      updateWorkspace: vi.fn().mockResolvedValue({
        meeting_item_id: 'meeting-1',
        phase: 'complete',
        conversation_id: 'conversation-1',
      }),
    }
    const conversations = { createConversation: vi.fn() }
    const service = new MeetingWorkspaceService(
      repository as never,
      readRepository as never,
      stateRepository as never,
      conversations as never,
    )

    await service.startCall({} as never, {
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      userId: 'user-1',
      orgId: null,
    })

    expect(stateRepository.updateWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      'meeting-1',
      {
        phase: 'complete',
        conversation_id: 'conversation-1',
      },
    )
    expect(conversations.createConversation).not.toHaveBeenCalled()
  })
})
