'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from 'lucide-react'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import type { ChatRenderMessage } from '@/lib/chat/chat-render-message'
import { cn } from '@/lib/utils/cn'

export interface SpaceVoiceRunTask {
  delegationId: string
  messageId: string
  task: string
  status: 'running' | 'completed' | 'failed'
}

interface SpaceVoiceRunsViewProps {
  conversationId: string | null
  tasks: SpaceVoiceRunTask[]
  messages: ChatRenderMessage[]
  onBack: () => void
}

function TaskStatusIcon({ status }: { status: SpaceVoiceRunTask['status'] }) {
  if (status === 'running') {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-warning" />
  }
  if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5 text-success" />
  return <XCircle className="h-3.5 w-3.5 text-destructive" />
}

function taskLabel(task: SpaceVoiceRunTask, message: ChatRenderMessage | undefined): string {
  const meta = message?.metadata as Record<string, unknown> | undefined
  const fromMeta = typeof meta?.voice_task_label === 'string' ? meta.voice_task_label : ''
  const label = task.task || fromMeta || message?.content || 'Agent task'
  return label.length > 110 ? `${label.slice(0, 110)}...` : label
}

function statusLabel(status: SpaceVoiceRunTask['status']): string {
  if (status === 'running') return 'Running'
  if (status === 'completed') return 'Done'
  return 'Failed'
}

function VoiceRunRow({
  task,
  message,
  conversationId,
  expanded,
  onToggle,
}: {
  task: SpaceVoiceRunTask
  message: ChatRenderMessage | undefined
  conversationId: string | null
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-border rounded-spacing-3 surface-card overflow-hidden border">
      <button
        type="button"
        onClick={onToggle}
        className="gap-spacing-2 px-spacing-3 py-spacing-3 flex w-full items-start text-left"
      >
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <TaskStatusIcon status={task.status} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'body-3 min-w-0 truncate font-medium',
              task.status === 'running' ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {taskLabel(task, message)}
          </p>
          <p className="body-4 text-muted-foreground mt-spacing-0-5">{statusLabel(task.status)}</p>
        </div>
        <div className="text-muted-foreground mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          {expanded ? <ChevronDown className="icon-sm" /> : <ChevronRight className="icon-sm" />}
        </div>
      </button>
      {expanded && message ? (
        <div className="border-border px-spacing-2 py-spacing-3 border-t">
          <MessageBubble
            message={message}
            isStreaming={task.status === 'running'}
            isEditable={false}
            conversationIdOverride={conversationId}
          />
        </div>
      ) : null}
    </div>
  )
}

export function SpaceVoiceRunsView({
  conversationId,
  tasks,
  messages,
  onBack,
}: SpaceVoiceRunsViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const messageMap = useMemo(() => {
    const map = new Map<string, ChatRenderMessage>()
    for (const message of messages) map.set(message.id, message)
    return map
  }, [messages])

  useEffect(() => {
    if (tasks.length === 0) return
    const latest = tasks[tasks.length - 1]
    if (latest?.status === 'running') setExpandedId(latest.delegationId)
  }, [tasks])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [tasks.length])

  const runningCount = tasks.filter((task) => task.status === 'running').length

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="gap-spacing-2 p-spacing-3 flex shrink-0 items-center border-b border-[var(--border)]">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-hover-subtle)]"
          aria-label="Back to voice"
          title="Back to voice"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="body-3 text-foreground truncate font-semibold">Tasks & Runs</p>
          <p className="body-4 text-muted-foreground truncate">
            {runningCount > 0 ? `${runningCount} running` : `${tasks.length} total`}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-3">
        {tasks.length === 0 ? (
          <div className="flex h-full min-h-0 flex-col items-center justify-center text-center">
            <CheckCircle2 className="text-muted-foreground h-6 w-6" />
            <p className="body-3 mt-spacing-2 font-semibold">No running tasks</p>
            <p className="body-4 text-muted-foreground mt-spacing-1 max-w-xs">
              When the agent starts work during the call, it will show up here.
            </p>
          </div>
        ) : (
          <div className="gap-spacing-2 flex flex-col">
            {tasks.map((task) => (
              <VoiceRunRow
                key={task.delegationId}
                task={task}
                message={messageMap.get(task.messageId)}
                conversationId={conversationId}
                expanded={expandedId === task.delegationId}
                onToggle={() =>
                  setExpandedId(expandedId === task.delegationId ? null : task.delegationId)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
