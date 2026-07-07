'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchMessages, type Message } from '@/lib/chat/studio-chat-runtime-adapter'
import type { TeamOverviewAgent } from '../../services/team-overview.service'

interface TeamOverviewChatModalProps {
  open: boolean
  onClose: () => void
  conversationId: string
  conversationTitle: string
  agent: TeamOverviewAgent | null
}

export function TeamOverviewChatModal({
  open,
  onClose,
  conversationId,
  conversationTitle,
  agent,
}: TeamOverviewChatModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !conversationId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setMessages([])
    void fetchMessages(conversationId)
      .then((rows) => {
        if (cancelled) return
        setMessages(rows)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load chat')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, conversationId])

  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        const meta = m.metadata as Record<string, unknown> | undefined
        if (meta?.hidden) return false
        if (meta?.delegation_task) return false
        return true
      }),
    [messages],
  )

  useEffect(() => {
    if (!open || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [open, visibleMessages.length])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0 bg-modal-overlay" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="z-modal-content rounded-spacing-4 border-border surface-card fixed inset-4 mx-auto flex max-w-3xl flex-col overflow-hidden border shadow-xl sm:inset-y-8"
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{conversationTitle}</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="gap-spacing-3 border-border px-spacing-4 py-spacing-3 flex shrink-0 items-center border-b">
            {agent?.image_url ? (
              <img
                src={agent.image_url}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {(agent?.name?.[0] ?? '?').toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="body-3 text-foreground truncate font-medium">{conversationTitle}</p>
              <p className="body-4 text-muted-foreground truncate">
                {agent?.name ?? 'Agent'}
                {agent?.role ? ` · ${agent.role}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={scrollRef} className="px-spacing-4 py-spacing-4 min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-full min-h-[240px] items-center justify-center">
                <VibeyLoadingOrb text="Loading chat…" state="processing" size="md" />
              </div>
            ) : error ? (
              <p className="body-3 text-muted-foreground py-spacing-8 text-center">{error}</p>
            ) : visibleMessages.length === 0 ? (
              <p className="body-3 text-muted-foreground py-spacing-8 text-center">
                No messages yet.
              </p>
            ) : (
              <div className="gap-spacing-4 flex flex-col">
                {visibleMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    conversationIdOverride={conversationId}
                    agentKey={agent?.agent_key}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
