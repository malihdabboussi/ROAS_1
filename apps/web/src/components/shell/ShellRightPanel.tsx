'use client'

import { useEffect, useState } from 'react'
import { ConversationScopePicker } from '@/components/conversations'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { Conversation } from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'
import { ShellRightPanelFiles } from './ShellRightPanelFiles'
import { ShellRightPanelSources } from './ShellRightPanelSources'
import { ShellRightPanelTasks } from './ShellRightPanelTasks'
import { useShellStore, type ShellRightPanelTab } from './use-shell-store'

const TABS: { id: ShellRightPanelTab; label: string }[] = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'files', label: 'Files' },
  { id: 'sources', label: 'Sources' },
]

const EMPTY_MESSAGES: never[] = []
const PANEL_TRANSITION_MS = 300

export function ShellRightPanel({
  conversationId,
  conversation = null,
  campaignId = null,
  spaceId = null,
  showScope = false,
  onConversationUpdated,
  onScopeChanged,
}: {
  conversationId: string | null
  conversation?: Conversation | null
  campaignId?: string | null
  spaceId?: string | null
  showScope?: boolean
  onConversationUpdated?: (conversation: Conversation) => void
  onScopeChanged?: (scope: { campaignId: string | null; spaceId: string | null }) => void
}) {
  const open = useShellStore((s) => s.rightPanel.open)
  const tab = useShellStore((s) => s.rightPanel.tab)
  const setRightPanelTab = useShellStore((s) => s.setRightPanelTab)
  const messages = useChatStore((s) =>
    conversationId ? (s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  )
  const tabs = conversationId ? TABS : TABS.slice(0, 1)
  const activeTab = conversationId ? tab : 'tasks'
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open)
  const scopeVisible = showScope && Boolean(conversationId)
  useEffect(() => {
    if (open && !conversationId && tab !== 'tasks') setRightPanelTab('tasks')
  }, [conversationId, open, setRightPanelTab, tab])

  useEffect(() => {
    if (open) {
      setMounted(true)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    const timer = setTimeout(() => setMounted(false), PANEL_TRANSITION_MS)
    return () => clearTimeout(timer)
  }, [open])

  if (!mounted) return null

  return (
    <aside
      className={cn(
        'border-border bg-background w-spacing-72 z-dropdown absolute inset-y-0 right-0 flex h-full shrink-0 flex-col overflow-hidden border-l shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none',
        visible ? 'translate-x-0' : 'translate-x-full',
      )}
      aria-label="Work summary"
      aria-hidden={!visible}
    >
      {scopeVisible ? (
        <div className="border-border px-spacing-3 py-spacing-3 gap-spacing-2 flex shrink-0 flex-col border-b">
          <p className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
            Campaign & space
          </p>
          <ConversationScopePicker
            conversation={conversation}
            campaignId={campaignId}
            spaceId={spaceId}
            showLabel
            onConversationUpdated={onConversationUpdated}
            onScopeChanged={onScopeChanged}
          />
        </div>
      ) : null}
      <div
        className="border-border gap-spacing-1 p-spacing-2 flex shrink-0 border-b"
        role="tablist"
        aria-label="Work summary sections"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setRightPanelTab(t.id)}
            role="tab"
            aria-selected={activeTab === t.id}
            className={cn(
              'body-3 px-spacing-2 py-spacing-1 flex-1 rounded-lg transition-colors',
              activeTab === t.id
                ? 'bg-secondary text-foreground font-medium'
                : 'text-muted-foreground hover:bg-hover-subtle',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="scrollbar-hide p-spacing-3 min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'tasks' ? (
          <ShellRightPanelTasks conversationId={conversationId} messages={messages} />
        ) : null}
        {activeTab === 'files' && conversationId ? (
          <ShellRightPanelFiles conversationId={conversationId} messages={messages} />
        ) : null}
        {activeTab === 'sources' && conversationId ? (
          <ShellRightPanelSources messages={messages} />
        ) : null}
      </div>
    </aside>
  )
}
