'use client'

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ConversationChannelIcon } from '@/components/chat/ConversationChannelIcon'

export function AgentsFlyoutPortal({
  anchorRef,
  conversations,
  activeConversationId,
  onSelectConversation,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  conversations: { id: string; title?: string | null; metadata?: Record<string, unknown> }[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onClose: () => void
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => (c.title ?? '').toLowerCase().includes(q))
  }, [conversations, query])

  useLayoutEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({ top: rect.top, left: rect.right + 8 })
  }, [anchorRef])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        !(e.target as HTMLElement).closest('[data-flyout-agents]') &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, anchorRef])

  return (
    <div
      data-flyout-agents
      className="fixed z-50 w-64 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg"
      style={{ top: pos.top, left: pos.left, maxHeight: '400px' }}
    >
      <div className="border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          All Tasks
        </span>
      </div>
      <div className="px-3 py-1">
        <div className="input-glass body-2 flex w-full items-center gap-2 py-1 pl-2 pr-3">
          <Search className="icon-md shrink-0 text-[var(--color-muted-foreground)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="min-w-0 flex-1 bg-transparent text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
          />
        </div>
      </div>
      <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: '300px' }}>
        {conversations.length === 0 ? (
          <p className="body-2 px-3 py-4 text-center text-[var(--color-muted-foreground)]">
            No tasks yet
          </p>
        ) : filtered.length === 0 ? (
          <p className="body-2 px-3 py-4 text-center text-[var(--color-muted-foreground)]">
            No matching tasks
          </p>
        ) : (
          <div className="py-1">
            {filtered.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 transition-all ${
                  activeConversationId === conv.id
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]'
                }`}
              >
                <ConversationChannelIcon metadata={conv.metadata} />
                <span className="body-2 truncate text-left">{conv.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
