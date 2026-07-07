'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Table2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { CalendarView } from './schedule/CalendarView'
import { TableView } from './schedule/TableView'
import type { ScheduleView } from './schedule/types'
import { useScheduleData } from './schedule/useScheduleData'

interface ScheduleTabProps {
  campaignId: string
}

function getSavedView(): ScheduleView {
  if (typeof window === 'undefined') return 'calendar'
  const raw = window.localStorage.getItem('schedule-tab-view')
  if (raw === 'calendar' || raw === 'table') return raw
  return 'calendar'
}

export function ScheduleTab({ campaignId }: ScheduleTabProps) {
  const [view, setView] = useState<ScheduleView>(() => getSavedView())
  const state = useScheduleData({ campaignId })

  const scheduledCount = useMemo(
    () => state.rows.filter((row) => Boolean(row.scheduled_at)).length,
    [state.rows],
  )

  const handleViewChange = (next: string) => {
    const v = next as ScheduleView
    setView(v)
    if (typeof window !== 'undefined') window.localStorage.setItem('schedule-tab-view', v)
  }

  return (
    <div className="card-glass flex h-full min-h-0 flex-col overflow-hidden rounded-2xl">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="icon-sm text-muted-foreground" />
          <span className="body-2 text-foreground font-medium">Content Schedule</span>
          <span className="typo-caption text-muted-foreground">{scheduledCount} scheduled</span>
        </div>
        <Tabs value={view} onValueChange={handleViewChange}>
          <TabsList variant="liquid">
            <TabsTrigger value="calendar" className="px-spacing-2">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="body-4">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="px-spacing-2">
              <Table2 className="h-3.5 w-3.5" />
              <span className="body-4">Table</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        {state.loading ? (
          <div className="flex h-full items-center justify-center">
            <VibeyLoadingOrb size="sm" text="Loading schedule..." />
          </div>
        ) : state.error ? (
          <div className="flex h-full items-center justify-center">
            <p className="body-3 text-danger">{state.error}</p>
          </div>
        ) : view === 'calendar' ? (
          <CalendarView
            rows={state.rows}
            onSchedule={state.schedulePost}
            onUnschedule={state.unschedulePost}
          />
        ) : (
          <TableView
            rows={state.rows}
            onSchedule={state.schedulePost}
            onUnschedule={state.unschedulePost}
          />
        )}
      </div>
    </div>
  )
}
