'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronDown, ChevronRight, XCircle } from 'lucide-react'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import { useChatStore, type Message } from '@/lib/chat/studio-chat-runtime-adapter'

interface DelegationTask {
  delegationId: string
  messageId: string
  task: string
  status: 'running' | 'completed' | 'failed'
}

interface VoiceTaskPanelProps {
  conversationId: string | null
  tasks: DelegationTask[]
}

const EMPTY_MESSAGES: Message[] = []

function TaskStatusIcon({ status }: { status: DelegationTask['status'] }) {
  if (status === 'running') {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center overflow-visible">
        <VibeyChatOrb state="executing" style="elastic" />
      </div>
    )
  }
  if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5 text-success" />
  return <XCircle className="h-3.5 w-3.5 text-destructive" />
}

function TaskCard({
  task,
  message,
  conversationId,
  expanded,
  onToggle,
}: {
  task: DelegationTask
  message: Message | undefined
  conversationId: string | null
  expanded: boolean
  onToggle: () => void
}) {
  const label = task.task.length > 80 ? task.task.slice(0, 80) + '...' : task.task

  return (
    <div>
      <div className="border-border surface-card sticky top-0 z-10 rounded-lg border">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
        >
          <TaskStatusIcon status={task.status} />
          {expanded ? (
            <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          )}
          <span
            className={`body-3 min-w-0 flex-1 truncate font-medium ${task.status === 'running' ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {label}
          </span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && message && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          >
            <div className="border-border rounded-b-lg border-x border-b px-2 py-2">
              <MessageBubble
                message={message}
                isStreaming={task.status === 'running'}
                isEditable={false}
                conversationIdOverride={conversationId}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function VoiceTaskPanel({ conversationId, tasks }: VoiceTaskPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const messages = useChatStore((s) =>
    conversationId ? (s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  )

  const messageMap = useMemo(() => {
    const map = new Map<string, Message>()
    for (const m of messages) map.set(m.id, m)
    return map
  }, [messages])

  useEffect(() => {
    if (tasks.length === 0) return
    const latest = tasks[tasks.length - 1]!
    if (latest.status === 'running') setExpandedId(latest.delegationId)
  }, [tasks.length, tasks])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [tasks.length])

  const hasRunning = tasks.some((t) => t.status === 'running')

  if (tasks.length === 0) return null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pt-3">
        <div className="card-glass rounded-spacing-3 flex items-center gap-2 px-4 py-2.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
            {hasRunning ? (
              <VibeyChatOrb state="executing" style="elastic" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            )}
          </div>
          <span className="body-2 font-medium">Tasks</span>
          <span className="text-muted-foreground body-4">{tasks.length}</span>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
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
      </div>
    </div>
  )
}
