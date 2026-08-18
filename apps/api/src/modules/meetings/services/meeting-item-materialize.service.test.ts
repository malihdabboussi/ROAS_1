import { describe, expect, it, vi } from 'vitest'
import { MeetingItemMaterializeService } from './meeting-item-materialize.service'

function event(partial?: Record<string, unknown>) {
  return {
    calendarEventId: 'google:event-1',
    icalUid: 'uid-1@google.com',
    title: 'Client review',
    start: '2026-08-18T17:00:00.000Z',
    end: '2026-08-18T18:00:00.000Z',
    attendees: [{ email: 'client@example.com', name: 'Client' }],
    organizer: { email: 'dylan@roas.co', name: 'Dylan' },
    ...partial,
  }
}

describe('MeetingItemMaterializeService', () => {
  it('creates an All Meetings row without opening a workspace conversation', async () => {
    const resolutionRepository = {
      findSpaceOrgId: vi.fn().mockResolvedValue(null),
      findCallIdentityProfile: vi.fn().mockResolvedValue({
        email: 'dylan@roas.co',
        fathomAliases: [],
        fullName: 'Dylan',
        internalDomains: ['roas.co'],
      }),
      findCallItemByCalendarEventId: vi.fn().mockResolvedValue(null),
      findCallItemByIcalUid: vi.fn().mockResolvedValue(null),
      findBestExistingCallForEvent: vi.fn().mockResolvedValue(null),
      createScheduledMeeting: vi.fn().mockResolvedValue({ id: 'meeting-1' }),
    }
    const service = new MeetingItemMaterializeService(resolutionRepository as never)

    await expect(
      service.materializeScheduledMeetings({} as never, {
        spaceId: 'space-1',
        userId: 'user-1',
        orgId: null,
        events: [event()],
      }),
    ).resolves.toEqual({ created: 1, linked: 0, skipped: 0 })
    expect(resolutionRepository.createScheduledMeeting).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        callKind: 'client',
        event: expect.objectContaining({
          calendarEventId: 'google:event-1',
          organizer: { email: 'dylan@roas.co', name: 'Dylan' },
        }),
      }),
    )
  })

  it('links a Fathom row and does not create a second calendar stub', async () => {
    const resolutionRepository = {
      findSpaceOrgId: vi.fn().mockResolvedValue(null),
      findCallIdentityProfile: vi.fn().mockResolvedValue({
        email: 'dylan@roas.co',
        fathomAliases: [],
        fullName: 'Dylan',
        internalDomains: ['roas.co'],
      }),
      findCallItemByCalendarEventId: vi.fn().mockResolvedValue(null),
      findCallItemByIcalUid: vi.fn().mockResolvedValue(null),
      findBestExistingCallForEvent: vi.fn().mockResolvedValue({
        id: 'fathom-1',
        title: 'Client review',
        custom_data: { entry_type: 'call', recording_url: 'https://fathom.video/calls/1' },
      }),
      createScheduledMeeting: vi.fn(),
      patchMeetingItemCustomData: vi.fn().mockResolvedValue(undefined),
    }
    const service = new MeetingItemMaterializeService(resolutionRepository as never)

    await expect(
      service.materializeScheduledMeetings({} as never, {
        spaceId: 'space-1',
        userId: 'user-1',
        orgId: null,
        events: [event()],
      }),
    ).resolves.toEqual({ created: 0, linked: 1, skipped: 0 })
    expect(resolutionRepository.createScheduledMeeting).not.toHaveBeenCalled()
    expect(resolutionRepository.patchMeetingItemCustomData).toHaveBeenCalledWith(
      expect.anything(),
      'fathom-1',
      expect.anything(),
      expect.objectContaining({
        calendar_event_id: 'google:event-1',
        ical_uid: 'uid-1@google.com',
        host: 'Dylan',
        host_email: 'dylan@roas.co',
      }),
    )
  })
})
