import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { peekPersonalMeetingsCampaignId, resolveMeetingsSpaceId } from './resolve-meetings-space-id'

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

/**
 * Open left-rail chat (Pixel) scoped to Meetings for this calendar event.
 * Auto-sends so Pixel asks whether to prep beforehand or guide live on the call.
 */
export function askAboutMeetingInChat(ev: CalendarAgendaEvent): void {
  void (async () => {
    const spaceId = await resolveMeetingsSpaceId()
    const campaignId = peekPersonalMeetingsCampaignId()
    const attendees = ev.attendees
      .map((a) => {
        const label = a.name?.trim() || a.email
        const status = a.status && a.status !== 'unknown' ? ` (${a.status})` : ''
        return `${label}${status}`
      })
      .filter(Boolean)
      .join(', ')

    const lines = [
      `I'm looking at this meeting and need your help.`,
      '',
      `Meeting: ${ev.title}`,
      `When: ${formatWhen(ev)}`,
      attendees ? `Who: ${attendees}` : null,
      ev.location?.trim() ? `Where: ${ev.location.trim()}` : null,
      ev.video_url ? `Join: ${ev.video_url}` : null,
      ev.account_label ? `Calendar: ${ev.account_label}` : null,
      ev.prep
        ? `Existing prep doc: ${ev.prep.title ?? 'Prep'} (${ev.prep.status}) — space item ${ev.prep.space_item_id}`
        : null,
      ev.related
        ? `Linked call recording: ${ev.related.title}${ev.related.recording_url ? ` — ${ev.related.recording_url}` : ''}`
        : null,
      '',
      'First, ask me which mode I want:',
      '1) Prepare beforehand — talking points, open loops, suggested approach, and a short prep doc.',
      '2) Guide me live — I am on (or about to join) the call; keep answers short and tactical.',
      '',
      'Then follow my choice. Use Meetings space context. Never send Slack, email, or DMs unless I explicitly ask.',
    ].filter((line): line is string => line !== null)

    useGlobalChatStore.getState().seedComposer({
      content: lines.join('\n'),
      agentKey: 'vibey',
      railIntent: 'new',
      workContext: spaceId
        ? {
            surface: 'spaces',
            spaceId,
            campaignId,
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
  })()
}
