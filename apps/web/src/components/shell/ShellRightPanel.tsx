'use client'

import { useEffect } from 'react'
import { useChatStore } from '@/features/studio/store/use-chat-store'
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

export function ShellRightPanel({ conversationId }: { conversationId: string | null }) {
  const open = useShellStore((s) => s.rightPanel.open)
  const tab = useShellStore((s) => s.rightPanel.tab)
  const setRightPanelTab = useShellStore((s) => s.setRightPanelTab)
  const messages = useChatStore((s) =>
    conversationId ? (s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  )
  const tabs = conversationId ? TABS : TABS.slice(0, 1)
  const activeTab = conversationId ? tab : 'tasks'

  useEffect(() => {
    if (open && !conversationId && tab !== 'tasks') setRightPanelTab('tasks')
  }, [conversationId, open, setRightPanelTab, tab])

  if (!open) return null

  return (
    <aside className="border-border bg-background w-spacing-72 flex h-full shrink-0 flex-col overflow-hidden border-l">
      <div className="border-border gap-spacing-1 p-spacing-2 flex shrink-0 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setRightPanelTab(t.id)}
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
