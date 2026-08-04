'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from '@/components/conversations'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { Conversation } from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'
import { ShellRightPanelFiles } from './ShellRightPanelFiles'
import { ShellRightPanelSources } from './ShellRightPanelSources'
import { ShellRightPanelTasks } from './ShellRightPanelTasks'
import { useRightEdgePresence } from './use-right-edge-presence'
import { useShellStore, type ShellRightPanelTab } from './use-shell-store'

const TABS: { id: ShellRightPanelTab; label: string }[] = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'files', label: 'Files' },
  { id: 'sources', label: 'Sources' },
]

const EMPTY_MESSAGES: never[] = []
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
  const router = useRouter()
  const open = useShellStore((s) => s.rightPanel.open)
  const tab = useShellStore((s) => s.rightPanel.tab)
  const setRightPanelOpen = useShellStore((s) => s.setRightPanelOpen)
  const setRightPanelTab = useShellStore((s) => s.setRightPanelTab)
  const setWorkAreaOpen = useShellStore((s) => s.setWorkAreaOpen)
  const closeArtifactViewer = useShellStore((s) => s.closeArtifactViewer)
  const conversationScopePickerRequestNonce = useShellStore(
    (s) => s.conversationScopePickerRequestNonce,
  )
  const scopePickerRef = useRef<ConversationScopePickerHandle>(null)
  const handleOpenCampaign = useCallback(
    (nextCampaignId: string) => {
      closeArtifactViewer()
      setWorkAreaOpen(true)
      router.push(`/campaigns/${nextCampaignId}`)
    },
    [closeArtifactViewer, router, setWorkAreaOpen],
  )
  const lastHandledScopePickerRequestRef = useRef(0)
  const messages = useChatStore((s) =>
    conversationId ? (s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  )
  const tabs = conversationId ? TABS : TABS.slice(0, 1)
  const activeTab = conversationId ? tab : 'tasks'
  const { mounted, visible } = useRightEdgePresence(open)
  const scopeVisible = showScope && Boolean(conversationId)
  useEffect(() => {
    if (open && !conversationId && tab !== 'tasks') setRightPanelTab('tasks')
  }, [conversationId, open, setRightPanelTab, tab])

  useEffect(() => {
    if (
      !mounted ||
      !open ||
      !scopeVisible ||
      conversationScopePickerRequestNonce <= lastHandledScopePickerRequestRef.current
    ) {
      return
    }

    lastHandledScopePickerRequestRef.current = conversationScopePickerRequestNonce
    scopePickerRef.current?.openMenuFromBanner()
  }, [conversationScopePickerRequestNonce, mounted, open, scopeVisible])

  if (!mounted) return null

  return (
    <aside
      className={cn(
        'border-border bg-background w-spacing-72 flex h-full shrink-0 flex-col overflow-hidden border-l transition-transform duration-300 ease-out motion-reduce:transition-none',
        visible ? 'translate-x-0' : 'translate-x-full',
      )}
      aria-label="Work summary"
      aria-hidden={!visible}
    >
      <div
        className="border-border px-spacing-3 py-spacing-3 gap-spacing-2 flex shrink-0 items-start border-b"
        data-testid="work-summary-header"
      >
        {scopeVisible ? (
          <div className="gap-spacing-2 flex min-w-0 flex-1 flex-col">
            <p className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
              Campaign & space
            </p>
            <ConversationScopePicker
              ref={scopePickerRef}
              conversation={conversation}
              campaignId={campaignId}
              spaceId={spaceId}
              showLabel
              onConversationUpdated={onConversationUpdated}
              onScopeChanged={onScopeChanged}
              onOpenCampaign={handleOpenCampaign}
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <button
          type="button"
          onClick={() => setRightPanelOpen(false)}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground p-spacing-1 shrink-0 rounded-lg transition-colors"
          aria-label="Close work summary"
          title="Close work summary"
        >
          <X className="icon-sm" aria-hidden />
        </button>
      </div>
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
