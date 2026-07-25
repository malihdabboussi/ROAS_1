import type { TaskRollupItem } from '@/lib/tasks'
import { groupTasksForCalendar } from './task-view-helpers'

interface TaskCalendarViewProps {
  items: TaskRollupItem[]
  onOpenTask: (task: TaskRollupItem) => void
}

export function TaskCalendarView({ items, onOpenTask }: TaskCalendarViewProps) {
  return (
    <div className="gap-spacing-4 flex flex-col">
      {groupTasksForCalendar(items).map((group) => (
        <section key={group.key}>
          <h2 className="body-2 text-foreground mb-spacing-2 font-semibold">{group.label}</h2>
          <ul className="surface-card border-border rounded-spacing-3 overflow-hidden border">
            {group.items.map((item) => (
              <li key={item.id} className="border-border border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => onOpenTask(item)}
                  className="hover:bg-hover-subtle gap-spacing-3 p-spacing-3 flex w-full items-center text-left transition-colors"
                >
                  <span className="bg-primary h-spacing-2 w-spacing-2 shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="body-3 text-foreground block truncate font-medium">
                      {item.title}
                    </span>
                    <span className="body-4 text-muted-foreground block truncate">
                      {item.campaign_name ?? 'No campaign'} · {item.space_title}
                    </span>
                  </span>
                  <span className="body-4 text-muted-foreground capitalize">
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
