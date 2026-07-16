import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { cachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { resolveMeetingsSpaceId } from './resolve-meetings-space-id'

function formatWhen(ev: CalendarAgendaEvent): string {
  const start = new Date(ev.start)
  const end = new Date(ev.end)
  if (ev.all_day) return 'All day'
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  return `${start.toLocaleString('en-US', opts)} – ${end.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/** Open left-rail chat (DiBi/Vibey) scoped to Meetings for this calendar event. */
export function askAboutMeetingInChat(ev: CalendarAgendaEvent): void {
  const spaceId = resolveMeetingsSpaceId()
  const space = spaceId
    ? (cachedSpaces.peek() ?? []).find((row) => row.id === spaceId)
    : null
  const attendees = ev.attendees
    .map((a) => a.name?.trim() || a.email)
    .filter(Boolean)
    .join(', ')

  const lines = [
    `Help me with this meeting: ${ev.title}`,
    `When: ${formatWhen(ev)}`,
    attendees ? `Who: ${attendees}` : null,
    ev.location?.trim() ? `Where: ${ev.location.trim()}` : null,
    ev.video_url ? `Join: ${ev.video_url}` : null,
    ev.prep
      ? `Prep item: ${ev.prep.title ?? 'Prep'} (${ev.prep.status}) — space item ${ev.prep.space_item_id}`
      : 'Prep: not started yet.',
    ev.related
      ? `Linked call recording: ${ev.related.title}${ev.related.recording_url ? ` — ${ev.related.recording_url}` : ''}`
      : null,
    '',
    'Use Meetings space context. Help with prep, talking points, notes, and follow-ups. Never send messages or emails unless I explicitly ask.',
    '',
  ].filter((line): line is string => line !== null)

  useGlobalChatStore.getState().seedComposer({
    content: lines.join('\n'),
    agentKey: 'vibey',
    railIntent: 'new',
    workContext: spaceId
      ? {
          surface: 'spaces',
          spaceId,
          campaignId: space?.campaign_id ?? null,
        }
      : { surface: 'general' },
  })

  if (ev.prep?.space_item_id) {
    window.dispatchEvent(
      new CustomEvent('space:artifact-focus', {
        detail: {
          type: 'space_task',
          id: ev.prep.space_item_id,
          name: ev.prep.title ?? ev.title,
        },
      }),
    )
  }
}
