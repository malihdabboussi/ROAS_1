import { describe, expect, it, vi } from 'vitest'
import { buildMeetingConversationId } from '../domain/meeting-conversation-id'
import {
  MeetingWorkspaceService,
  normalizeWorkspaceDisplayTitles,
} from './meeting-workspace.service'

describe('MeetingWorkspaceService', () => {
  it('normalizes legacy generic Fathom titles across recordings and deliverables', () => {
    const result = normalizeWorkspaceDisplayTitles({
      recordings: [
        {
          id: 'recording-1',
          title: 'Impromptu Call',
          is_primary: true,
          provider_summary: '## Meeting Purpose\nReview the August campaign launch.',
        },
      ],
      deliverables: [
        {
          id: 'transcript-1',
          title: 'Transcript — Impromptu Call',
          custom_data: {
            entry_type: 'meeting_transcript',
            meeting_recording_id: 'recording-1',
          },
        },
        {
          id: 'recap-1',
          title: 'Meeting recap — Impromptu Call',
          custom_data: { entry_type: 'meeting_recap' },
        },
      ],
    })

    expect(result.recordings).toEqual([
      expect.objectContaining({ title: 'Review the August campaign launch' }),
    ])
    expect(result.deliverables).toEqual([
      expect.objectContaining({ title: 'Transcript — Review the August campaign launch' }),
      expect.objectContaining({ title: 'Meeting recap — Review the August campaign launch' }),
    ])
  })

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
    const conversations = {
      createConversation: vi.fn(),
    }
    const deduplication = { archiveDuplicates: vi.fn().mockResolvedValue(0) }
    const messages = { create: vi.fn() }
    const service = new MeetingWorkspaceService(
      repository as never,
      resolutionRepository as never,
      readRepository as never,
      stateRepository as never,
      conversations as never,
      messages as never,
      undefined,
      deduplication as never,
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
    expect(deduplication.archiveDuplicates).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        meetingItemId: 'meeting-1',
        keepConversationId: 'conversation-1',
      }),
    )
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
      findSpaceCampaignId: vi.fn().mockResolvedValue('campaign-1'),
      findCallIdentityProfile: vi.fn().mockResolvedValue({
        email: 'owner@roas.co',
        fathomAliases: [],
        fullName: 'Owner',
        internalDomains: ['roas.co'],
      }),
      findByCalendarEvent: vi.fn().mockResolvedValue(null),
      findBestExistingCallForEvent: vi.fn().mockResolvedValue(null),
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
    expect(resolutionRepository.findBestExistingCallForEvent).toHaveBeenCalled()
    expect(resolutionRepository.createScheduledMeeting).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ callKind: 'client' }),
    )
    expect(repository.upsertParticipantContextLinks).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ participantEmails: ['client@example.com'] }),
    )
    expect(conversations.createConversation).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({
        id: buildMeetingConversationId('meeting-1'),
        title: 'Client review',
        campaign_id: 'campaign-1',
        metadata: expect.objectContaining({ space_id: 'space-1' }),
      }),
      null,
    )
  })

  it('reuses the workspace found by ical_uid when the agenda event id flips', async () => {
    const repository = {
      upsertWorkspace: vi.fn(),
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
      findByIcalUid: vi.fn().mockResolvedValue({
        meeting_item_id: 'meeting-1',
        phase: 'scheduled',
        conversation_id: 'conversation-1',
      }),
      findBestExistingCallForEvent: vi.fn(),
      findMeetingItemCustomData: vi.fn().mockResolvedValue({
        entry_type: 'call',
        call_kind: 'client',
        call_kind_source: 'manual',
      }),
      createScheduledMeeting: vi.fn(),
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
        calendarEventId: 'workspace:person-1:event-1',
        icalUid: 'uid-1@google.com',
        title: 'Client review',
        start: '2026-07-30T17:00:00.000Z',
        end: '2026-07-30T18:00:00.000Z',
        attendees: [],
      },
    })

    expect(result).toEqual({
      space_id: 'space-1',
      meeting_item_id: 'meeting-1',
      conversation_id: 'conversation-1',
    })
    expect(resolutionRepository.findByIcalUid).toHaveBeenCalledWith(
      expect.anything(),
      'space-1',
      'uid-1@google.com',
    )
    expect(resolutionRepository.findBestExistingCallForEvent).not.toHaveBeenCalled()
    expect(resolutionRepository.createScheduledMeeting).not.toHaveBeenCalled()
    expect(repository.upsertWorkspace).not.toHaveBeenCalled()
  })

  it('stamps the ical_uid natural key onto a newly created workspace', async () => {
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
      findSpaceCampaignId: vi.fn().mockResolvedValue(null),
      findCallIdentityProfile: vi.fn().mockResolvedValue({
        email: 'owner@roas.co',
        fathomAliases: [],
        fullName: 'Owner',
        internalDomains: ['roas.co'],
      }),
      findByCalendarEvent: vi.fn().mockResolvedValue(null),
      findByIcalUid: vi.fn().mockResolvedValue(null),
      findBestExistingCallForEvent: vi.fn().mockResolvedValue(null),
      createScheduledMeeting: vi.fn().mockResolvedValue({
        id: 'meeting-1',
        title: 'Client review',
      }),
    }
    const stateRepository = {
      updateWorkspace: vi.fn().mockResolvedValue({
        meeting_item_id: 'meeting-1',
        phase: 'scheduled',
        conversation_id: 'conversation-1',
      }),
    }
    const service = new MeetingWorkspaceService(
      repository as never,
      resolutionRepository as never,
      {} as never,
      stateRepository as never,
      { createConversation: vi.fn().mockResolvedValue({ id: 'conversation-1' }) } as never,
      { create: vi.fn() } as never,
    )

    await service.resolveScheduledMeeting({} as never, {
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: null,
      event: {
        calendarEventId: 'google:event-1',
        icalUid: 'uid-1@google.com',
        title: 'Client review',
        start: '2026-07-30T17:00:00.000Z',
        end: '2026-07-30T18:00:00.000Z',
        attendees: [],
      },
    })

    expect(resolutionRepository.findBestExistingCallForEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ icalUid: 'uid-1@google.com' }),
    )
    expect(repository.upsertWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ icalUid: 'uid-1@google.com' }),
    )
  })

  it('reuses an existing Fathom Meetings call instead of creating a calendar stub', async () => {
    const repository = {
      upsertWorkspace: vi.fn().mockResolvedValue({
        meeting_item_id: 'fathom-call-1',
        phase: 'scheduled',
        conversation_id: null,
      }),
      upsertParticipantContextLinks: vi.fn().mockResolvedValue(undefined),
    }
    const resolutionRepository = {
      findSpaceOrgId: vi.fn().mockResolvedValue(null),
      findSpaceCampaignId: vi.fn().mockResolvedValue(null),
      findCallIdentityProfile: vi.fn().mockResolvedValue({
        email: 'owner@roas.co',
        fathomAliases: [],
        fullName: 'Owner',
        internalDomains: ['roas.co'],
      }),
      findByCalendarEvent: vi.fn().mockResolvedValue(null),
      findBestExistingCallForEvent: vi.fn().mockResolvedValue({
        id: 'fathom-call-1',
        title: 'Leadership alignment on account manager workflow',
        source: 'fathom',
        custom_data: {
          entry_type: 'call',
          recording_url: 'https://fathom.video/calls/1',
          external_automation: { provider: 'fathom', meeting_id: '170082749' },
        },
      }),
      findMeetingItemCustomData: vi.fn().mockResolvedValue({
        entry_type: 'call',
        call_kind: 'team',
        call_kind_source: 'manual',
      }),
      updateMeetingItemCallKind: vi.fn().mockResolvedValue(undefined),
      createScheduledMeeting: vi.fn(),
    }
    const stateRepository = {
      updateWorkspace: vi.fn().mockResolvedValue({
        meeting_item_id: 'fathom-call-1',
        phase: 'scheduled',
        conversation_id: 'conversation-1',
      }),
    }
    const conversations = {
      createConversation: vi.fn().mockResolvedValue({ id: 'conversation-1' }),
    }
    const service = new MeetingWorkspaceService(
      repository as never,
      resolutionRepository as never,
      {} as never,
      stateRepository as never,
      conversations as never,
      { create: vi.fn() } as never,
    )

    const result = await service.resolveScheduledMeeting({} as never, {
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: null,
      event: {
        calendarEventId: 'google:aaron',
        title: 'AARON X DYLAN X NATE',
        start: '2026-08-04T17:00:00.000Z',
        end: '2026-08-04T17:30:00.000Z',
        attendees: [],
      },
    })

    expect(result.meeting_item_id).toBe('fathom-call-1')
    expect(resolutionRepository.createScheduledMeeting).not.toHaveBeenCalled()
    expect(repository.upsertWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        meetingItemId: 'fathom-call-1',
        calendarEventId: 'google:aaron',
      }),
    )
  })

  it('creates a live impromptu workspace and its persistent conversation', async () => {
    const repository = {
      upsertWorkspace: vi.fn().mockResolvedValue({
        meeting_item_id: 'meeting-instant',
        phase: 'live',
        conversation_id: null,
      }),
      upsertParticipantContextLinks: vi.fn().mockResolvedValue(undefined),
    }
    const resolutionRepository = {
      findSpaceOrgId: vi.fn().mockResolvedValue(null),
      findSpaceCampaignId: vi.fn().mockResolvedValue(null),
      createInstantMeeting: vi.fn().mockResolvedValue({
        id: 'meeting-instant',
        title: 'Client strategy call',
      }),
    }
    const stateRepository = {
      updateWorkspace: vi.fn().mockResolvedValue({
        meeting_item_id: 'meeting-instant',
        phase: 'live',
        conversation_id: 'conversation-instant',
      }),
    }
    const conversations = {
      createConversation: vi.fn().mockResolvedValue({ id: 'conversation-instant' }),
    }
    const service = new MeetingWorkspaceService(
      repository as never,
      resolutionRepository as never,
      {} as never,
      stateRepository as never,
      conversations as never,
      { create: vi.fn() } as never,
    )

    const result = await service.createInstantMeeting({} as never, {
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: null,
      title: 'Client strategy call',
      attendeeEmails: ['client@example.com'],
    })

    expect(result).toEqual({
      space_id: 'space-1',
      meeting_item_id: 'meeting-instant',
      conversation_id: 'conversation-instant',
    })
    expect(repository.upsertWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        meetingItemId: 'meeting-instant',
        calendarEventId: null,
        phase: 'live',
        liveStartedAt: expect.any(String),
      }),
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
      findBestExistingCallForEvent: vi.fn().mockResolvedValue(null),
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
      {
        createConversation: vi.fn(),
      } as never,
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

  it('recovers the winning workspace by ical_uid when the race lost on the natural key', async () => {
    const repository = {
      upsertWorkspace: vi.fn().mockRejectedValue(new Error('ical conflict')),
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
      findByIcalUid: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
        meeting_item_id: 'meeting-winner',
        phase: 'scheduled',
        conversation_id: 'conversation-winner',
      }),
      findBestExistingCallForEvent: vi.fn().mockResolvedValue(null),
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
        calendarEventId: 'workspace:person-1:event-1',
        icalUid: 'uid-1@google.com',
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
      'workspace:person-1:event-1',
    )
  })

  it('archives chats from sibling duplicate call items sharing a natural key', async () => {
    const readRepository = {
      getWorkspaceBundle: vi.fn().mockResolvedValue({
        meeting: {
          id: 'meeting-1',
          title: 'Client review',
          custom_data: {
            entry_type: 'call',
            ical_uid: 'uid-1@google.com',
            external_automation: { provider: 'fathom', meeting_id: '170082749' },
          },
        },
        workspace: {
          meeting_item_id: 'meeting-1',
          phase: 'complete',
          conversation_id: 'conversation-1',
        },
        recordings: [{ id: 'recording-1', title: 'Client review' }],
      }),
    }
    const resolutionRepository = {
      listDuplicateCallItemIds: vi.fn().mockResolvedValue(['dup-item-1']),
    }
    const deduplication = { archiveDuplicates: vi.fn().mockResolvedValue(1) }
    const service = new MeetingWorkspaceService(
      {} as never,
      resolutionRepository as never,
      readRepository as never,
      {} as never,
      { createConversation: vi.fn() } as never,
      { create: vi.fn() } as never,
      undefined,
      deduplication as never,
    )

    await service.getWorkspace({} as never, {
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      userId: 'user-1',
      orgId: 'org-request-scope',
    })

    expect(resolutionRepository.listDuplicateCallItemIds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        spaceId: 'space-1',
        meetingItemId: 'meeting-1',
        icalUid: 'uid-1@google.com',
        fathomMeetingId: '170082749',
      }),
    )
    expect(deduplication.archiveDuplicates).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        meetingItemId: 'meeting-1',
        keepConversationId: 'conversation-1',
        duplicateMeetingItemIds: ['dup-item-1'],
      }),
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
    const conversations = {
      createConversation: vi.fn(),
    }
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

  it('creates a manual action item without changing call phase', async () => {
    const created = {
      id: 'action-1',
      title: 'Send recap to Nate',
      source_type: 'manual',
      status: 'confirmed',
    }
    const readRepository = {
      getWorkspaceBundle: vi.fn().mockResolvedValue({
        meeting: { id: 'meeting-1', title: 'Strategy call' },
        workspace: {
          meeting_item_id: 'meeting-1',
          phase: 'live',
          conversation_id: 'conversation-1',
        },
      }),
    }
    const stateRepository = {
      createManualAction: vi.fn().mockResolvedValue(created),
    }
    const service = new MeetingWorkspaceService(
      {} as never,
      {} as never,
      readRepository as never,
      stateRepository as never,
      {
        createConversation: vi.fn(),
      } as never,
      { create: vi.fn() } as never,
    )

    const result = await service.createManualAction({} as never, {
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      userId: 'user-1',
      orgId: 'org-1',
      title: 'Send recap to Nate',
    })

    expect(stateRepository.createManualAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        meetingItemId: 'meeting-1',
        spaceId: 'space-1',
        userId: 'user-1',
        orgId: 'org-1',
        title: 'Send recap to Nate',
      }),
    )
    expect(result).toEqual(created)
  })
})
