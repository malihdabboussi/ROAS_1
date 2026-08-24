import { Rocket } from 'lucide-react'
import type { AgencyLaunch } from '@/lib/agency-clients'
import { cn } from '@/lib/utils/cn'
import { formatAgencyDate } from '../agency-client-format'
import { dateKey, eventTone, openLaunch, readable } from './launches-utils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function LaunchCalendar({
  calendarMode,
  days,
  month,
  launchesByDay,
  upcoming,
  visibleLaunches,
}: {
  calendarMode: boolean
  days: Date[]
  month: Date
  launchesByDay: Map<string, AgencyLaunch[]>
  upcoming: AgencyLaunch[]
  visibleLaunches: AgencyLaunch[]
}) {
  if (!calendarMode) return <LaunchList launches={visibleLaunches} />
  return (
    <div className="gap-spacing-4 grid min-h-0 grid-cols-1 xl:grid-cols-4">
      <section
        className="surface-card rounded-spacing-3 border-border overflow-hidden border xl:col-span-3"
        aria-label="Launch calendar"
      >
        <div className="border-border grid grid-cols-7 border-b">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="body-4 text-muted-foreground px-spacing-2 py-spacing-3 text-center font-medium"
            >
              {weekday}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = dateKey(day)
            const rows = launchesByDay.get(key) ?? []
            const inMonth = day.getMonth() === month.getMonth()
            const isToday = key === dateKey(new Date())
            return (
              <div
                key={key}
                className={cn(
                  'border-border p-spacing-2 min-h-32 border-b border-r',
                  !inMonth && 'bg-secondary/40 text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'body-4 inline-flex h-6 w-6 items-center justify-center rounded-full',
                    isToday && 'bg-primary text-primary-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="gap-spacing-1 mt-spacing-2 flex flex-col">
                  {rows.slice(0, 4).map((launch) => (
                    <LaunchEvent key={launch.id} launch={launch} />
                  ))}
                  {rows.length > 4 ? (
                    <span className="body-4 text-muted-foreground">+{rows.length - 4} more</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <aside className="surface-card rounded-spacing-3 border-border p-spacing-3 gap-spacing-2 flex max-h-screen flex-col overflow-y-auto border">
        <h2 className="body-2 text-foreground font-semibold">Upcoming</h2>
        {upcoming.map((launch) => (
          <button
            key={launch.id}
            type="button"
            onClick={() => openLaunch(launch)}
            className={cn('rounded-spacing-2 p-spacing-3 border text-left', eventTone(launch.kind))}
          >
            <span className="body-4 block opacity-80">
              {formatAgencyDate(launch.day_key)} · {readable(launch.kind)}
            </span>
            <span className="body-3 mt-spacing-1 block font-semibold">{launch.name}</span>
            <span className="body-4 mt-spacing-1 block opacity-80">
              {launch.client_name || 'Client'}
            </span>
          </button>
        ))}
      </aside>
    </div>
  )
}

function LaunchEvent({ launch }: { launch: AgencyLaunch }) {
  return (
    <button
      type="button"
      onClick={() => openLaunch(launch)}
      className={cn(
        'body-4 rounded-spacing-1 px-spacing-2 py-spacing-1 w-full truncate border text-left font-medium',
        eventTone(launch.kind),
      )}
    >
      {launch.kind === 'launch' ? <Rocket className="mr-spacing-1 inline h-3 w-3" /> : null}
      {launch.name}
    </button>
  )
}

function LaunchList({ launches }: { launches: AgencyLaunch[] }) {
  return (
    <div className="surface-card rounded-spacing-3 border-border overflow-hidden border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="body-4 text-muted-foreground border-border bg-secondary border-b text-left">
            <th className="px-spacing-4 py-spacing-3">Date</th>
            <th className="px-spacing-4 py-spacing-3">Kind</th>
            <th className="px-spacing-4 py-spacing-3">Launch</th>
            <th className="px-spacing-4 py-spacing-3">Client</th>
            <th className="px-spacing-4 py-spacing-3">Campaign</th>
          </tr>
        </thead>
        <tbody>
          {launches.map((launch) => (
            <tr
              key={launch.id}
              onClick={() => openLaunch(launch)}
              className="hover:bg-hover-subtle border-border cursor-pointer border-b"
            >
              <td className="body-3 px-spacing-4 py-spacing-3">
                {formatAgencyDate(launch.day_key)}
              </td>
              <td className="body-4 px-spacing-4 py-spacing-3 capitalize">
                {readable(launch.kind)}
              </td>
              <td className="body-3 px-spacing-4 py-spacing-3 font-medium">{launch.name}</td>
              <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3">
                {launch.client_name || 'Client'}
              </td>
              <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3">
                {launch.campaign_name || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
