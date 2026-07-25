import type { TaskRollupItem } from '@/lib/tasks'
import { formatTaskDue } from './task-view-helpers'

interface TaskListViewProps {
  items: TaskRollupItem[]
  onOpenTask: (task: TaskRollupItem) => void
}

export function TaskListView({ items, onOpenTask }: TaskListViewProps) {
  return (
    <div className="surface-card border-border rounded-spacing-3 overflow-hidden border">
      <div className="border-border text-muted-foreground body-4 hidden grid-cols-12 gap-2 border-b px-4 py-2 font-medium md:grid">
        <span className="col-span-4">Task</span>
        <span className="col-span-2">Campaign</span>
        <span className="col-span-2">Space</span>
        <span className="col-span-2">Status</span>
        <span className="col-span-2">Due</span>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="border-border border-b last:border-b-0">
            <button
              type="button"
              onClick={() => onOpenTask(item)}
              className="hover:bg-hover-subtle body-3 text-foreground grid w-full grid-cols-1 gap-1 px-4 py-3 text-left md:grid-cols-12 md:items-center md:gap-2"
            >
              <span className="col-span-4 truncate font-medium">{item.title}</span>
              <span className="text-muted-foreground col-span-2 truncate">
                {item.campaign_name ?? '—'}
              </span>
              <span className="text-muted-foreground col-span-2 truncate">{item.space_title}</span>
              <span className="text-muted-foreground col-span-2 truncate capitalize">
                {item.status.replace(/_/g, ' ')}
              </span>
              <span className="text-muted-foreground col-span-2 truncate">
                {formatTaskDue(item.due_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
