'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { CalendarDays, X } from 'lucide-react'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from '@/components/conversations'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { Conversation } from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'
import { ShellRightPanelFiles } from './ShellRightPanelFiles'
import { ShellRightPanelSources } from './ShellRightPanelSources'
import { ShellRightPanelTasks } from './ShellRightPanelTasks'
import { useRightEdgePresence } from './use-right-edge-presence'
import { useShellStore, type ShellRightPanelTab } from './use-shell-store'

const TABS: { id: ShellRightPanelTab; label: string }[] = [
  { id: 'files', label: 'Outputs' },
  { id: 'sources', label: 'Sources' },
  { id: 'tasks', label: 'Tasks' },
]
const TASKS_ONLY_TABS = TABS.filter((tab) => tab.id === 'tasks')

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
  // The chat and its meeting are one unit — link the workspace from here too.
  // Prefer the live attach context, but fall back to the conversation's own
  // metadata (stamped at creation) so the link survives workspace close.
  const meetingContext = useGlobalChatStore((s) => s.meetingContext)
  const conversationMetadata = useChatStore((s) =>
    conversationId ? s.conversations.find((c) => c.id === conversationId)?.metadata : undefined,
  )
  const metadataMeeting = (() => {
    const meta = conversationMetadata as
      | { context_type?: unknown; meeting_item_id?: unknown; space_id?: unknown }
      | undefined
    if (!meta || meta.context_type !== 'meeting') return null
    const meetingItemId = typeof meta.meeting_item_id === 'string' ? meta.meeting_item_id : null
    const spaceId = typeof meta.space_id === 'string' ? meta.space_id : null
    return meetingItemId && spaceId ? { meetingItemId, spaceId } : null
  })()
  const linkedMeeting =
    meetingContext && conversationId && meetingContext.conversationId === conversationId
      ? { spaceId: meetingContext.spaceId, meetingItemId: meetingContext.meetingItemId }
      : metadataMeeting
  const handleOpenMeetingWorkspace = useCallback(() => {
    if (!linkedMeeting) return
    closeArtifactViewer()
    setWorkAreaOpen(true)
    router.push(
      `/spaces?space=${encodeURIComponent(linkedMeeting.spaceId)}&item=${encodeURIComponent(linkedMeeting.meetingItemId)}`,
    )
  }, [closeArtifactViewer, linkedMeeting, router, setWorkAreaOpen])
  const tabs = conversationId ? TABS : TASKS_ONLY_TABS
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
      {linkedMeeting ? (
        <div className="border-border px-spacing-3 py-spacing-2 shrink-0 border-b">
          <button
            type="button"
            onClick={handleOpenMeetingWorkspace}
            className="body-4 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center rounded-lg text-left transition-colors"
          >
            <CalendarDays className="icon-sm shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">Open meeting workspace</span>
          </button>
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
