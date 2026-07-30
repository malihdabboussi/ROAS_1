import { describe, expect, it, vi } from 'vitest'
import { MeetingWorkspaceService } from './meeting-workspace.service'

describe('MeetingWorkspaceService', () => {
  it('reopens a completed meeting conversation without marking the call live', async () => {
    const repository = { upsertWorkspace: vi.fn() }
    const resolutionRepository = {}
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
    const messages = { create: vi.fn() }
    const service = new MeetingWorkspaceService(
      repository as never,
      resolutionRepository as never,
      readRepository as never,
      stateRepository as never,
      conversations as never,
      messages as never,
    )

    await service.startCall({} as never, {
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      userId: 'user-1',
      orgId: null,
    })

    expect(stateRepository.updateWorkspace).toHaveBeenCalledWith(expect.anything(), 'meeting-1', {
      phase: 'complete',
      conversation_id: 'conversation-1',
    })
    expect(conversations.createConversation).not.toHaveBeenCalled()
  })

  it('creates one reusable scheduled workspace and its persistent conversation', async () => {
    const repository = {
      upsertWorkspace: vi.fn().mockResolvedValue({
        meeting_item_id: 'meeting-1',
        phase: 'scheduled',
        conversation_id: null,
      }),
      upsertParticipantContextLinks: vi.fn().mockResolvedValue(undefined),
    }
    const resolutionRepository = {
      findSpaceOrgId: vi.fn().mockResolvedValue(null),
      findCallIdentityProfile: vi.fn().mockResolvedValue({
        email: 'owner@roas.co',
        fathomAliases: [],
        fullName: 'Owner',
        internalDomains: ['roas.co'],
      }),
      findByCalendarEvent: vi.fn().mockResolvedValue(null),
      createScheduledMeeting: vi.fn().mockResolvedValue({
        id: 'meeting-1',
        title: 'Client review',
      }),
    }
    const readRepository = { getWorkspaceBundle: vi.fn() }
    const stateRepository = {
      updateWorkspace: vi.fn().mockResolvedValue({
        meeting_item_id: 'meeting-1',
        phase: 'scheduled',
        conversation_id: 'conversation-1',
      }),
    }
    const conversations = {
      createConversation: vi.fn().mockResolvedValue({ id: 'conversation-1' }),
    }
    const messages = { create: vi.fn() }
    const service = new MeetingWorkspaceService(
      repository as never,
      resolutionRepository as never,
      readRepository as never,
      stateRepository as never,
      conversations as never,
      messages as never,
    )

    const result = await service.resolveScheduledMeeting({} as never, {
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: null,
      event: {
        calendarEventId: 'calendar-1',
        title: 'Client review',
        start: '2026-07-30T17:00:00.000Z',
        end: '2026-07-30T18:00:00.000Z',
        description: 'Review launch.',
        location: null,
        videoUrl: 'https://meet.google.com/abc',
        htmlLink: null,
        attendees: [{ email: 'client@example.com', name: 'Client' }],
      },
    })

    expect(result).toEqual({
      space_id: 'space-1',
      meeting_item_id: 'meeting-1',
      conversation_id: 'conversation-1',
    })
    expect(resolutionRepository.createScheduledMeeting).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ callKind: 'client' }),
    )
    expect(repository.upsertParticipantContextLinks).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ participantEmails: ['client@example.com'] }),
    )
  })

  it('reuses the winning scheduled workspace when two opens race', async () => {
    const repository = {
      upsertWorkspace: vi.fn().mockRejectedValue(new Error('calendar event conflict')),
      upsertParticipantContextLinks: vi.fn().mockResolvedValue(undefined),
    }
    const resolutionRepository = {
      findSpaceOrgId: vi.fn().mockResolvedValue(null),
      findCallIdentityProfile: vi.fn().mockResolvedValue({
        email: 'owner@roas.co',
        fathomAliases: [],
        fullName: 'Owner',
        internalDomains: ['roas.co'],
      }),
      findByCalendarEvent: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
        meeting_item_id: 'meeting-winner',
        phase: 'scheduled',
        conversation_id: 'conversation-winner',
      }),
      createScheduledMeeting: vi.fn().mockResolvedValue({
        id: 'meeting-orphan',
        title: 'Client review',
      }),
      deleteScheduledMeeting: vi.fn().mockResolvedValue(undefined),
    }
    const service = new MeetingWorkspaceService(
      repository as never,
      resolutionRepository as never,
      {} as never,
      {} as never,
      { createConversation: vi.fn() } as never,
      { create: vi.fn() } as never,
    )

    const result = await service.resolveScheduledMeeting({} as never, {
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: null,
      event: {
        calendarEventId: 'calendar-1',
        title: 'Client review',
        start: '2026-07-30T17:00:00.000Z',
        end: '2026-07-30T18:00:00.000Z',
        attendees: [],
      },
    })

    expect(result).toEqual({
      space_id: 'space-1',
      meeting_item_id: 'meeting-winner',
      conversation_id: 'conversation-winner',
    })
    expect(resolutionRepository.deleteScheduledMeeting).toHaveBeenCalledWith(
      expect.anything(),
      'meeting-orphan',
      'calendar-1',
    )
    expect(repository.upsertParticipantContextLinks).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ meetingItemId: 'meeting-winner' }),
    )
  })

  it('writes a note to both meeting snippets and the same persistent chat', async () => {
    const repository = { upsertWorkspace: vi.fn() }
    const resolutionRepository = {}
    const readRepository = {
      getWorkspaceBundle: vi.fn().mockResolvedValue({
        meeting: { id: 'meeting-1', title: 'Client review', custom_data: {} },
        workspace: {
          meeting_item_id: 'meeting-1',
          phase: 'live',
          conversation_id: 'conversation-1',
        },
      }),
    }
    const snippet = {
      id: 'snippet-1',
      text: 'Customer needs the revised scope.',
      source_type: 'call_quote',
    }
    const stateRepository = {
      createSnippet: vi.fn().mockResolvedValue(snippet),
      updateWorkspace: vi.fn(),
    }
    const conversations = { createConversation: vi.fn() }
    const messages = { create: vi.fn().mockResolvedValue({ id: 'message-1' }) }
    const service = new MeetingWorkspaceService(
      repository as never,
      resolutionRepository as never,
      readRepository as never,
      stateRepository as never,
      conversations as never,
      messages as never,
    )

    const result = await service.addSnippet({} as never, {
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      userId: 'user-1',
      orgId: null,
      sourceType: 'call_quote',
      text: 'Customer needs the revised scope.',
      sourceLabel: 'Call snippet',
    })

    expect(messages.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        conversation_id: 'conversation-1',
        role: 'user',
        content: 'Customer needs the revised scope.',
        metadata: expect.objectContaining({
          meeting_item_id: 'meeting-1',
          meeting_entry_type: 'call_quote',
          meeting_snippet_id: 'snippet-1',
        }),
      }),
    )
    expect(result).toEqual({
      snippet,
      conversation_id: 'conversation-1',
      message_id: 'message-1',
    })
  })
})
