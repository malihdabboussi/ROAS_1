'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bot, CalendarClock, CheckSquare, Video } from 'lucide-react'
import { fetchTaskRollup, type TaskRollupItem } from '@/lib/tasks'
import { SHELL_NEW_CHAT_TASKS_MESSAGES } from './shell-new-chat-tasks.config'

const TASK_LIMIT = 5

function sourceLabel(item: TaskRollupItem): string {
  if (item.source === 'fathom') return SHELL_NEW_CHAT_TASKS_MESSAGES.meetingSource
  if (item.source === 'agent' || item.source === 'agent_suggested') {
    return SHELL_NEW_CHAT_TASKS_MESSAGES.agentSource
  }
  return SHELL_NEW_CHAT_TASKS_MESSAGES.taskSource
}

function dueLabel(dueAt: string | null): string {
  if (!dueAt) return SHELL_NEW_CHAT_TASKS_MESSAGES.noDueDate
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return SHELL_NEW_CHAT_TASKS_MESSAGES.noDueDate
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(due)
}

function TaskSourceIcon({ item }: { item: TaskRollupItem }) {
  if (item.source === 'fathom') return <Video className="icon-sm" aria-hidden />
  if (item.source === 'agent' || item.source === 'agent_suggested') {
    return <Bot className="icon-sm" aria-hidden />
  }
  return <CheckSquare className="icon-sm" aria-hidden />
}

export function ShellNewChatTasks() {
  const router = useRouter()
  const [items, setItems] = useState<TaskRollupItem[]>([])

  useEffect(() => {
    let cancelled = false
    void fetchTaskRollup({ view: 'my', focus: 'current', limit: TASK_LIMIT })
      .then((tasks) => {
        if (!cancelled) setItems(tasks.slice(0, TASK_LIMIT))
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (items.length === 0) return null

  return (
    <section className="mt-spacing-6 mx-auto w-full max-w-3xl" aria-labelledby="new-chat-tasks">
      <div className="mb-spacing-2 flex items-center justify-between">
        <h2 id="new-chat-tasks" className="body-3 text-foreground font-semibold">
          {SHELL_NEW_CHAT_TASKS_MESSAGES.title}
        </h2>
        <button
          type="button"
          className="body-4 text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-1 font-medium transition-colors"
          onClick={() => router.push('/all-tasks')}
        >
          {SHELL_NEW_CHAT_TASKS_MESSAGES.openAll}
        </button>
      </div>
      <ul className="gap-spacing-1 flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="surface-card border-border hover:bg-hover-subtle rounded-spacing-2 gap-spacing-3 p-spacing-3 flex w-full items-center border text-left transition-colors"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('vibey-open-artifact', {
                    detail: {
                      artifactType: 'task',
                      artifactId: item.id,
                      spaceId: item.space_id,
                      name: item.title,
                    },
                  }),
                )
              }}
            >
              <span className="text-muted-foreground shrink-0">
                <TaskSourceIcon item={item} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="body-3 text-foreground block truncate font-medium">
                  {item.title}
                </span>
                <span className="body-4 text-muted-foreground block truncate">
                  {[sourceLabel(item), item.campaign_name, item.space_title]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className="body-4 text-muted-foreground gap-spacing-1 flex shrink-0 items-center">
                <CalendarClock className="icon-xs" aria-hidden />
                {dueLabel(item.due_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
