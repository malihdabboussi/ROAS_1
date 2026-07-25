import { ListTodo } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { TaskRollupItem } from '@/lib/tasks'
import type { TaskWorkViewId } from '@/lib/work-views'
import { TaskBoardView } from './TaskBoardView'
import { TaskCalendarView } from './TaskCalendarView'
import { TaskListView } from './TaskListView'

interface TaskWorkViewContentProps {
  view: TaskWorkViewId
  items: TaskRollupItem[]
  loading: boolean
  emptyMessage: string
  onOpenTask: (task: TaskRollupItem) => void
}

export function TaskWorkViewContent({
  view,
  items,
  loading,
  emptyMessage,
  onOpenTask,
}: TaskWorkViewContentProps) {
  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <VibeyLoadingOrb text="Loading tasks..." state="processing" size="sm" />
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="surface-card border-border rounded-spacing-3 p-spacing-6 border text-center">
        <ListTodo className="text-muted-foreground mb-spacing-2 mx-auto h-8 w-8" />
        <p className="body-2 text-foreground font-medium">No open tasks</p>
        <p className="body-3 text-muted-foreground mt-spacing-1">{emptyMessage}</p>
      </div>
    )
  }
  if (view === 'board') return <TaskBoardView items={items} onOpenTask={onOpenTask} />
  if (view === 'calendar') return <TaskCalendarView items={items} onOpenTask={onOpenTask} />
  return <TaskListView items={items} onOpenTask={onOpenTask} />
}
