import { describe, expect, it, vi } from 'vitest'
import { MeetingCallMatchingRepository } from './meeting-call-matching.repository'
import { MeetingWorkspaceResolutionRepository } from './meeting-workspace-resolution.repository'

type QueryMock = Record<string, ReturnType<typeof vi.fn>> & {
  then: (resolve: (value: { data: unknown; error: unknown }) => void) => void
}

function queryMock(result: { data?: unknown; error?: unknown } = {}): QueryMock {
  const query = {} as QueryMock
  for (const method of ['select', 'insert', 'eq', 'neq', 'in', 'gte', 'lte', 'limit']) {
    query[method] = vi.fn().mockReturnValue(query)
  }
  query.maybeSingle = vi.fn(async () => ({
    data: result.data ?? null,
    error: result.error ?? null,
  }))
  query.single = vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }))
  query.then = (resolve) => resolve({ data: result.data ?? null, error: result.error ?? null })
  return query
}

function supabaseMock(...queries: QueryMock[]) {
  const from = vi.fn()
  for (const query of queries) from.mockReturnValueOnce(query)
  return { supabase: { from } as never, from }
}

describe('MeetingWorkspaceResolutionRepository.listMeetingCandidates', () => {
  it('includes fathom-sourced calls when scanning for an existing meeting', async () => {
    const query = queryMock({ data: [] })
    const { supabase } = supabaseMock(query)
    const repository = new MeetingWorkspaceResolutionRepository(new MeetingCallMatchingRepository())

    await repository.listMeetingCandidates(supabase, {
      spaceId: 'space-1',
      userId: 'user-1',
      anchorAt: '2026-08-04T17:00:00.000Z',
    })

    expect(query.in).toHaveBeenCalledWith('source', ['calendar', 'manual', 'fathom'])
  })
})

describe('MeetingWorkspaceResolutionRepository.findBestExistingCallForEvent', () => {
  const input = {
    spaceId: 'space-1',
    userId: 'user-1',
    calendarEventId: 'workspace:person-1:event-1',
    title: 'Aaron x Dylan x Nate',
    start: '2026-08-04T17:00:00.000Z',
  }

  it('links a prior calendar stub on a strong title + time-proximity match', async () => {
    const stub = {
      id: 'stub-1',
      title: 'AARON X DYLAN X NATE',
      source: 'calendar',
      custom_data: {
        entry_type: 'call',
        calendar_event_id: 'google:event-1',
        call_date: '2026-08-04T17:03:00.000Z',
      },
    }
    const byCalendar = queryMock({ data: null })
    const candidates = queryMock({ data: [stub] })
    const { supabase } = supabaseMock(byCalendar, candidates)
    const repository = new MeetingWorkspaceResolutionRepository(new MeetingCallMatchingRepository())

    await expect(repository.findBestExistingCallForEvent(supabase, input)).resolves.toBe(stub)
  })

  it('still ignores a nearby call whose title does not match', async () => {
    const unrelated = {
      id: 'other-1',
      title: 'Marketing sync',
      source: 'calendar',
      custom_data: {
        entry_type: 'call',
        call_date: '2026-08-04T17:03:00.000Z',
      },
    }
    const byCalendar = queryMock({ data: null })
    const candidates = queryMock({ data: [unrelated] })
    const { supabase } = supabaseMock(byCalendar, candidates)
    const repository = new MeetingWorkspaceResolutionRepository(new MeetingCallMatchingRepository())

    await expect(repository.findBestExistingCallForEvent(supabase, input)).resolves.toBeNull()
  })

  it('links a stub stamped with the same ical_uid even when titles diverge', async () => {
    const stub = {
      id: 'stub-ical',
      title: 'Renamed invite',
      source: 'calendar',
      custom_data: {
        entry_type: 'call',
        ical_uid: 'uid-1@google.com',
        call_date: '2026-08-04T17:00:00.000Z',
      },
    }
    const byCalendar = queryMock({ data: null })
    const candidates = queryMock({ data: [stub] })
    const { supabase } = supabaseMock(byCalendar, candidates)
    const repository = new MeetingWorkspaceResolutionRepository(new MeetingCallMatchingRepository())

    await expect(
      repository.findBestExistingCallForEvent(supabase, {
        ...input,
        icalUid: 'uid-1@google.com',
      }),
    ).resolves.toBe(stub)
  })
})

describe('MeetingWorkspaceResolutionRepository.createScheduledMeeting', () => {
  const input = {
    spaceId: 'space-1',
    userId: 'user-1',
    orgId: null,
    callKind: 'client' as const,
    event: {
      calendarEventId: 'google:event-1',
      icalUid: 'uid-1@google.com',
      title: 'Client review',
      start: '2026-08-04T17:00:00.000Z',
      end: '2026-08-04T18:00:00.000Z',
      attendees: [{ email: 'client@example.com', name: 'Client' }],
    },
  }

  it('persists the ical_uid natural key alongside the agenda event id', async () => {
    const created = { id: 'meeting-1', title: 'Client review' }
    const insertQuery = queryMock({ data: created })
    const { supabase } = supabaseMock(insertQuery)
    const repository = new MeetingWorkspaceResolutionRepository(new MeetingCallMatchingRepository())

    await expect(repository.createScheduledMeeting(supabase, input)).resolves.toBe(created)
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_data: expect.objectContaining({
          calendar_event_id: 'google:event-1',
          ical_uid: 'uid-1@google.com',
        }),
      }),
    )
  })

  it('returns the existing call when the ical_uid natural key already won', async () => {
    const existing = { id: 'meeting-existing', title: 'Client review' }
    const insertQuery = queryMock({ error: { code: '23505', message: 'duplicate key value' } })
    const existingQuery = queryMock({ data: existing })
    const { supabase } = supabaseMock(insertQuery, existingQuery)
    const repository = new MeetingWorkspaceResolutionRepository(new MeetingCallMatchingRepository())

    await expect(repository.createScheduledMeeting(supabase, input)).resolves.toBe(existing)
    expect(existingQuery.eq).toHaveBeenCalledWith('custom_data->>ical_uid', 'uid-1@google.com')
  })

  it('rethrows insert failures that are not natural-key conflicts', async () => {
    const insertQuery = queryMock({ error: { code: '42P01', message: 'boom' } })
    const { supabase } = supabaseMock(insertQuery)
    const repository = new MeetingWorkspaceResolutionRepository(new MeetingCallMatchingRepository())

    await expect(repository.createScheduledMeeting(supabase, input)).rejects.toThrow('boom')
  })
})

describe('MeetingWorkspaceResolutionRepository.listDuplicateCallItemIds', () => {
  it('finds sibling call items sharing any natural key in the same space', async () => {
    const byIcal = queryMock({ data: [{ id: 'dup-ical' }] })
    const byFathom = queryMock({ data: [{ id: 'dup-fathom' }] })
    const byCalendar = queryMock({ data: [{ id: 'dup-ical' }] })
    const { supabase } = supabaseMock(byIcal, byFathom, byCalendar)
    const repository = new MeetingWorkspaceResolutionRepository(new MeetingCallMatchingRepository())

    await expect(
      repository.listDuplicateCallItemIds(supabase, {
        spaceId: 'space-1',
        meetingItemId: 'meeting-1',
        icalUid: 'uid-1@google.com',
        fathomMeetingId: '170082749',
        calendarEventId: 'google:event-1',
      }),
    ).resolves.toEqual(['dup-ical', 'dup-fathom'])
  })

  it('skips the lookup entirely when the meeting has no natural keys', async () => {
    const { supabase, from } = supabaseMock()
    const repository = new MeetingWorkspaceResolutionRepository(new MeetingCallMatchingRepository())

    await expect(
      repository.listDuplicateCallItemIds(supabase, {
        spaceId: 'space-1',
        meetingItemId: 'meeting-1',
        icalUid: null,
        fathomMeetingId: null,
        calendarEventId: null,
      }),
    ).resolves.toEqual([])
    expect(from).not.toHaveBeenCalled()
  })
})
