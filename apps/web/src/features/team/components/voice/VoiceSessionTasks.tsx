'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AudioWaveform,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  XCircle,
} from 'lucide-react'
import { MessageBubble } from '@/features/studio/components/MessageBubble'
import type { Message } from '@/features/studio/types'

function TaskStatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5 text-red-400" />
  if (status === 'running')
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" />
  return <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
}

function DelegationTaskCard({
  message,
  conversationId,
  expanded,
  onToggle,
}: {
  message: Message
  conversationId: string | null
  expanded: boolean
  onToggle: () => void
}) {
  const meta = message.metadata as Record<string, unknown> | undefined
  const label = (meta?.voice_task_label as string) ?? message.content ?? ''
  const status = (meta?.voice_task_status as string) ?? 'completed'
  const truncated = label.length > 100 ? label.slice(0, 100) + '...' : label

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        className="surface-card flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <TaskStatusIcon status={status} />
        {expanded ? (
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        )}
        <span className="body-3 text-muted-foreground min-w-0 flex-1 truncate font-medium">
          {truncated}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className="overflow-hidden"
          >
            <div className="border-border border-t px-2 py-2">
              <MessageBubble
                message={message}
                isStreaming={false}
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

export function VoiceSessionTasks({
  messages,
  conversationId,
}: {
  messages: Message[]
  conversationId: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null)

  if (messages.length === 0) return null

  let completedCount = 0
  let runningCount = 0
  for (const m of messages) {
    const s = (m.metadata as Record<string, unknown>)?.voice_task_status
    if (s === 'completed') completedCount++
    else if (s === 'running') runningCount++
  }

  return (
    <div className="card-glass rounded-spacing-3 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        {runningCount > 0 ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
        ) : (
          <AudioWaveform className="h-4 w-4 text-emerald-400" />
        )}
        <span className="body-2 flex-1 font-medium">Voice Session Tasks</span>
        <span className="text-muted-foreground body-4">
          {runningCount > 0
            ? `${runningCount} running, ${completedCount}/${messages.length} completed`
            : `${completedCount}/${messages.length} completed`}
        </span>
        {expanded ? (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="tasks"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className="overflow-hidden"
          >
            <div className="border-border flex flex-col gap-2 border-t px-3 py-3">
              {messages.map((m) => (
                <DelegationTaskCard
                  key={m.id}
                  message={m}
                  conversationId={conversationId}
                  expanded={expandedMsgId === m.id}
                  onToggle={() => setExpandedMsgId(expandedMsgId === m.id ? null : m.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
