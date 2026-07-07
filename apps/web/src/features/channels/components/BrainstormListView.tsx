'use client'

import { useMemo } from 'react'
import { Bot, Component, MessageSquare } from 'lucide-react'
import type { ChannelMessage } from '../services/channels.service'

interface BrainstormEntry {
  parentMessage: ChannelMessage
  agentKeys: string[]
  replyCount: number
  lastReplyTime: string | null
  lastReplyPreview: string | null
}

function AgentAvatarStack({
  agentKeys,
  rosterAvatars,
}: {
  agentKeys: string[]
  rosterAvatars?: Map<string, string>
}) {
  return (
    <div className="flex -space-x-1.5">
      {agentKeys.slice(0, 4).map((key) => {
        const url = rosterAvatars?.get(key)
        return url ? (
          <img
            key={key}
            src={url}
            alt={key}
            className="border-background h-6 w-6 rounded-full border object-cover"
          />
        ) : (
          <span
            key={key}
            className="bg-muted text-muted-foreground border-background inline-flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-semibold"
          >
            <Bot className="h-3 w-3" />
          </span>
        )
      })}
      {agentKeys.length > 4 && (
        <span className="bg-muted text-muted-foreground border-background inline-flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-semibold">
          +{agentKeys.length - 4}
        </span>
      )}
    </div>
  )
}

function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent ?? ''
}

export function BrainstormListView({
  messages,
  rosterAvatars,
  onOpenThread,
  emptyHint,
}: {
  messages: ChannelMessage[]
  rosterAvatars?: Map<string, string>
  onOpenThread?: (messageId: string) => void
  /** Full sentence when the list is empty (e.g. point to Spaces toolbar vs in-chat header). */
  emptyHint?: string
}) {
  const brainstorms = useMemo<BrainstormEntry[]>(() => {
    const parents = messages.filter((m) => {
      const meta = m.metadata as Record<string, unknown> | null
      return !!(meta?.brainstorm as { agent_keys?: string[] })?.agent_keys
    })

    return parents
      .map((parent) => {
        const meta = parent.metadata as Record<string, unknown>
        const brainstormConfig = meta.brainstorm as { agent_keys: string[] }
        const replies = messages.filter((m) => m.reply_to_id === parent.id)
        const lastReply = replies[replies.length - 1] ?? null

        return {
          parentMessage: parent,
          agentKeys: brainstormConfig.agent_keys,
          replyCount: replies.length,
          lastReplyTime: lastReply?.created_at ?? null,
          lastReplyPreview: lastReply?.content ? stripHtml(lastReply.content).slice(0, 120) : null,
        }
      })
      .reverse()
  }, [messages])

  if (brainstorms.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-3 md:px-8">
        <Component className="text-muted-foreground h-8 w-8" />
        <p className="body-2 text-muted-foreground text-center">
          {emptyHint ?? 'No brainstorms yet. Start one from the header.'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-8">
      <div className="flex flex-col gap-2">
        {brainstorms.map((entry) => (
          <button
            key={entry.parentMessage.id}
            type="button"
            onClick={() => onOpenThread?.(entry.parentMessage.id)}
            className="border-border hover:bg-hover-subtle flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors"
          >
            <AgentAvatarStack agentKeys={entry.agentKeys} rosterAvatars={rosterAvatars} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="body-3 text-foreground font-semibold">
                  {entry.parentMessage.thread_name || entry.agentKeys.join(', ')}
                </span>
                <span className="typo-caption text-muted-foreground">
                  {new Date(entry.parentMessage.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {entry.lastReplyPreview && (
                <p className="body-4 text-muted-foreground mt-0.5 truncate">
                  {entry.lastReplyPreview}
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-1.5">
                <MessageSquare className="text-muted-foreground h-3 w-3" />
                <span className="typo-caption text-muted-foreground">
                  {entry.replyCount} {entry.replyCount === 1 ? 'reply' : 'replies'}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
