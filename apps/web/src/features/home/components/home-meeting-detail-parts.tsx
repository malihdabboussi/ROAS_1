import type { ReactNode } from 'react'
import { Check, HelpCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { HOME_TOAST_SUCCESS } from '@/features/home/config/home-toast-errors.config'
import { attendeeStatusLabel } from '@/features/home/lib/home-meeting-detail'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'

export function MeetingSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="typo-caption text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
      {children}
    </p>
  )
}

export function MeetingTaskRow({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border hover:bg-hover-subtle body-3 text-foreground w-full rounded-lg border px-3 py-2 text-left"
    >
      {title}
    </button>
  )
}

export function MeetingAttendeeStatusIcon({
  status,
}: {
  status: CalendarAgendaEvent['attendees'][number]['status']
}) {
  if (status === 'accepted') {
    return <Check className="text-success h-3.5 w-3.5 shrink-0" aria-hidden />
  }
  if (status === 'declined') {
    return <XCircle className="text-destructive h-3.5 w-3.5 shrink-0" aria-hidden />
  }
  return <HelpCircle className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
}

export function copyMeetingJoinLink(url: string) {
  void navigator.clipboard.writeText(url).then(() => {
    toast.success(HOME_TOAST_SUCCESS.LINK_COPIED.userMessage)
  })
}

export { attendeeStatusLabel }
