'use client'

import { useMemo } from 'react'
import { toast } from 'sonner'
import { AllMeetingsNativeList } from '@/components/work-views/AllMeetingsNativeList'
import { HOME_AGENDA_MESSAGES } from '@/features/home/config/home-agenda-messages.config'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { spaceItemFromRecord } from '@/features/home/lib/space-item-from-record'
import {
  fetchMeetingWorkspaceEvent,
  type MeetingRelatedCall,
} from '@/features/home/services/meeting-workspace-api'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { updateSpaceItem, type SpaceItem } from '@/lib/spaces'

export function MeetingRelatedCallsSection({
  spaceId,
  calls,
  onOpenRelated,
  onReload,
}: {
  spaceId: string
  calls: MeetingRelatedCall[]
  onOpenRelated?: (event: CalendarAgendaEvent) => void
  onReload: () => Promise<void>
}) {
  const items = useMemo(
    () =>
      calls
        .map((call) =>
          spaceItemFromRecord(
            call.item ?? {
              id: call.meeting_item_id,
              space_id: spaceId,
              title: call.title,
              custom_data: {
                entry_type: 'call',
                call_date: call.call_date,
                call_status: call.call_status,
                recording_url: call.recording_url,
              },
            },
            spaceId,
          ),
        )
        .filter((item): item is SpaceItem => Boolean(item)),
    [calls, spaceId],
  )
  if (items.length === 0) return null

  return (
    <section className="gap-spacing-3 flex w-full min-w-0 flex-col">
      <div className="flex items-center justify-between">
        <h2 className="body-3 text-foreground font-semibold">
          {HOME_AGENDA_MESSAGES.RELATED_CALLS.message}
        </h2>
        <span className="body-4 text-muted-foreground">{items.length}</span>
      </div>
      <AllMeetingsNativeList
        items={items}
        reload={onReload}
        persistItem={(item, payload) => updateSpaceItem(item.space_id, item.id, payload)}
        onOpenItem={(item) => {
          if (!onOpenRelated) return
          void fetchMeetingWorkspaceEvent(spaceId, item.id)
            .then((event) => onOpenRelated(event))
            .catch(() => toast.error(HOME_TOAST_ERRORS.MEETING_WORKSPACE_LOAD_FAILED.userMessage))
        }}
      />
    </section>
  )
}
