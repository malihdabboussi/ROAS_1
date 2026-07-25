import type { TaskRollupItem } from '@/lib/tasks'
import { formatTaskDue, groupTasksForBoard } from './task-view-helpers'

interface TaskBoardViewProps {
  items: TaskRollupItem[]
  onOpenTask: (task: TaskRollupItem) => void
}

export function TaskBoardView({ items, onOpenTask }: TaskBoardViewProps) {
  return (
    <div className="gap-spacing-4 grid grid-cols-1 lg:grid-cols-3">
      {groupTasksForBoard(items).map((group) => (
        <section key={group.id} className="surface-card border-border rounded-spacing-3 border p-3">
          <div className="mb-spacing-3 flex items-center justify-between">
            <h2 className="body-2 text-foreground font-semibold">{group.label}</h2>
            <span className="badge-glass badge-glass-sm badge-glass-muted">
              {group.items.length}
            </span>
          </div>
          <ul className="gap-spacing-2 flex flex-col">
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenTask(item)}
                  className="bg-secondary hover:bg-hover-subtle rounded-spacing-2 p-spacing-3 flex w-full flex-col text-left transition-colors"
                >
                  <span className="body-3 text-foreground font-medium">{item.title}</span>
                  <span className="body-4 text-muted-foreground mt-spacing-1">
                    {item.campaign_name ?? item.space_title} · {formatTaskDue(item.due_at)}
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
