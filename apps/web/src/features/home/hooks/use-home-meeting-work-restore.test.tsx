import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useShellStore } from '@/components/shell/use-shell-store'
import { HOME_MEETING_WORK_RESTORE_FEATURE } from '@/features/home/lib/home-meeting-work-restore'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { useHomeMeetingWorkRestore } from './use-home-meeting-work-restore'

const mocks = vi.hoisted(() => {
  const replace = vi.fn()
  return {
    pathname: '/home/meetings',
    params: new URLSearchParams(),
    replace,
    // Stable identity like Next's real router — an unstable mock re-runs
    // effects that key on it and hides ordering bugs.
    router: { replace },
    fetchCalendarAgenda: vi.fn(),
  }
})

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.params,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: null }) => unknown) =>
    selector({ activeOrgId: null }),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: (_key: string, fetcher: () => Promise<unknown>) => fetcher(),
}))

vi.mock('@/lib/services/calendar-api', () => ({
  fetchCalendarAgenda: (...args: unknown[]) => mocks.fetchCalendarAgenda(...args),
}))

const event: CalendarAgendaEvent = {
  id: 'evt-1',
  title: 'Aaron x Dylan x Nate',
  start: '2026-08-12T17:00:00.000Z',
  end: '2026-08-12T17:50:00.000Z',
  all_day: false,
  location: null,
  description: null,
  video_url: null,
  video_label: null,
  html_link: null,
  color_id: null,
  account_label: 'Mine',
  attendees: [],
  source: 'google_calendar',
}

describe('useHomeMeetingWorkRestore', () => {
  beforeEach(() => {
    mocks.pathname = '/home/meetings'
    mocks.params = new URLSearchParams()
    mocks.fetchCalendarAgenda.mockResolvedValue({ success: true, events: [] })
    useShellStore.setState({ pendingWorkRestore: null })
    vi.clearAllMocks()
  })

  afterEach(() => {
    useShellStore.setState({ pendingWorkRestore: null })
  })

  it('opens the meeting from the restore payload when the URL identifies it', () => {
    mocks.params = new URLSearchParams('meeting=evt-1')
    useShellStore.setState({
      pendingWorkRestore: { feature: HOME_MEETING_WORK_RESTORE_FEATURE, data: event },
    })
    const open = vi.fn()

    renderHook(() => useHomeMeetingWorkRestore(open, null))

    expect(open).toHaveBeenCalledWith(event)
    expect(useShellStore.getState().pendingWorkRestore).toBeNull()
    expect(mocks.fetchCalendarAgenda).not.toHaveBeenCalled()
  })

  it('matches a payload by its linked call item id', () => {
    const related = {
      ...event,
      related: {
        space_id: 'space-1',
        call_item_id: 'call-9',
        title: 'Support huddle',
        recording_url: null,
        follow_ups: [],
      },
    }
    mocks.params = new URLSearchParams('meeting=call-9')
    useShellStore.setState({
      pendingWorkRestore: { feature: HOME_MEETING_WORK_RESTORE_FEATURE, data: related },
    })
    const open = vi.fn()

    renderHook(() => useHomeMeetingWorkRestore(open, null))

    expect(open).toHaveBeenCalledWith(related)
  })

  it('drops a stale payload when the URL does not ask for a meeting', () => {
    useShellStore.setState({
      pendingWorkRestore: { feature: HOME_MEETING_WORK_RESTORE_FEATURE, data: event },
    })
    const open = vi.fn()

    renderHook(() => useHomeMeetingWorkRestore(open, null))

    expect(open).not.toHaveBeenCalled()
    expect(useShellStore.getState().pendingWorkRestore).toBeNull()
  })

  it('leaves payloads for other features untouched', () => {
    const foreign = { feature: 'space_dock', data: { id: 'x' } }
    useShellStore.setState({ pendingWorkRestore: foreign })
    const open = vi.fn()

    renderHook(() => useHomeMeetingWorkRestore(open, null))

    expect(useShellStore.getState().pendingWorkRestore).toEqual(foreign)
  })

  it('resolves the meeting from the agenda when no payload is pending', async () => {
    mocks.params = new URLSearchParams('meeting=evt-1')
    mocks.fetchCalendarAgenda.mockResolvedValue({ success: true, events: [event] })
    const open = vi.fn()

    renderHook(() => useHomeMeetingWorkRestore(open, null))

    await waitFor(() => expect(open).toHaveBeenCalledWith(event))
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('strips an unresolvable meeting param instead of looping', async () => {
    mocks.params = new URLSearchParams('meeting=gone&conv=conversation-1')
    const open = vi.fn()

    renderHook(() => useHomeMeetingWorkRestore(open, null))

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith('/home/meetings?conv=conversation-1', {
        scroll: false,
      }),
    )
    expect(open).not.toHaveBeenCalled()
  })

  it('writes the meeting id into the URL when a meeting opens in-page', () => {
    renderHook(() => useHomeMeetingWorkRestore(vi.fn(), event))

    expect(mocks.replace).toHaveBeenCalledWith('/home/meetings?meeting=evt-1', { scroll: false })
  })

  it('removes the meeting param when the meeting closes', () => {
    mocks.params = new URLSearchParams('meeting=evt-1')
    const open = vi.fn()
    const { rerender } = renderHook(
      ({ active }: { active: CalendarAgendaEvent | null }) =>
        useHomeMeetingWorkRestore(open, active),
      { initialProps: { active: event as CalendarAgendaEvent | null } },
    )

    expect(mocks.replace).not.toHaveBeenCalled()
    rerender({ active: null })

    expect(mocks.replace).toHaveBeenCalledWith('/home/meetings', { scroll: false })
    expect(open).toHaveBeenCalledTimes(0)
  })
})
