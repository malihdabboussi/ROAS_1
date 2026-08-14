'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, Plus, X } from 'lucide-react'
import { type ConversationScopePickerHandle } from '@/components/conversations'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { homeMeetingHref } from '@/features/home/lib/home-meeting-work-restore'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { Conversation } from '@/lib/conversations'
import { useQuickMissionsLauncher } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { isShellMissionCreateItem, type ShellCreateMenuItem } from './shell-create-menu.config'
import { ShellCreateMenuPanel } from './ShellCreateMenuPanel'
import { ShellRightPanelConnections } from './ShellRightPanelConnections'
import { ShellRightPanelFiles } from './ShellRightPanelFiles'
import { ShellRightPanelSources } from './ShellRightPanelSources'
import { ShellRightPanelTasks } from './ShellRightPanelTasks'
import { useRightEdgePresence } from './use-right-edge-presence'
import { useShellStore } from './use-shell-store'

const EMPTY_MESSAGES: never[] = []

/**
 * Work summary as a floating bubble anchored to the chat's top-right corner —
 * a content-height card that expands down when opened and collapses back up,
 * with Connections / Outputs / Sources / Tasks stacked as sections.
 */
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
  const { openLauncher } = useQuickMissionsLauncher()
  const open = useShellStore((s) => s.rightPanel.open)
  const setRightPanelOpen = useShellStore((s) => s.setRightPanelOpen)
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
  // The create catalog swaps the card body — inside the bubble it can never be
  // clipped by an overflow boundary the way the old rail dropdown was.
  const [createOpen, setCreateOpen] = useState(false)
  const handleCreateSelect = useCallback(
    (item: ShellCreateMenuItem) => {
      if (isShellMissionCreateItem(item)) {
        openLauncher()
        return
      }
      useGlobalChatStore.getState().seedComposer({
        content: item.prompt,
        seedMode: 'attach',
        quickStartId: item.id,
        workContext: spaceId ? { surface: 'spaces', spaceId } : undefined,
      })
    },
    [openLauncher, spaceId],
  )
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
    const spaceIdFromMeta = typeof meta.space_id === 'string' ? meta.space_id : null
    return meetingItemId && spaceIdFromMeta ? { meetingItemId, spaceId: spaceIdFromMeta } : null
  })()
  const linkedMeeting =
    meetingContext && conversationId && meetingContext.conversationId === conversationId
      ? { spaceId: meetingContext.spaceId, meetingItemId: meetingContext.meetingItemId }
      : metadataMeeting
  const handleOpenMeetingWorkspace = useCallback(() => {
    if (!linkedMeeting) return
    closeArtifactViewer()
    setWorkAreaOpen(true)
    router.push(homeMeetingHref({ id: linkedMeeting.meetingItemId }, linkedMeeting.spaceId))
  }, [closeArtifactViewer, linkedMeeting, router, setWorkAreaOpen])
  const { mounted, visible } = useRightEdgePresence(open)
  const scopeVisible = showScope && Boolean(conversationId)

  useEffect(() => {
    if (!open) setCreateOpen(false)
  }, [open])

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
    <div className="p-spacing-2 z-dropdown pointer-events-none absolute right-0 top-0">
      <aside
        className={cn(
          'dropdown-menu-solid w-spacing-72 pointer-events-auto flex max-h-[70vh] origin-top-right flex-col overflow-hidden transition duration-200 ease-out motion-reduce:transition-none',
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        )}
        aria-label="Work summary"
        aria-hidden={!visible}
      >
        <div
          className="border-border px-spacing-3 py-spacing-2 gap-spacing-2 flex shrink-0 items-start justify-end border-b"
          data-testid="work-summary-header"
        >
          <button
            type="button"
            onClick={() => setCreateOpen((prev) => !prev)}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground p-spacing-1 shrink-0 rounded-lg transition-colors"
            aria-label="Create"
            aria-expanded={createOpen}
            title="Create"
          >
            <Plus className="icon-sm" aria-hidden />
          </button>
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
        {linkedMeeting && !createOpen ? (
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
        {createOpen ? (
          <div className="scrollbar-hide py-spacing-1 min-h-0 flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="body-4 text-muted-foreground hover:text-foreground px-spacing-3 py-spacing-1 gap-spacing-1 flex items-center transition-colors"
            >
              <ChevronLeft className="icon-xs" aria-hidden />
              Back to summary
            </button>
            <ShellCreateMenuPanel
              onSelectCreateItem={handleCreateSelect}
              onCloseMenu={() => setCreateOpen(false)}
            />
          </div>
        ) : (
          <div className="scrollbar-hide p-spacing-3 gap-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
            {conversationId ? (
              <>
                {scopeVisible ? (
                  <ShellRightPanelConnections
                    conversation={conversation}
                    campaignId={campaignId}
                    spaceId={spaceId}
                    pickerRef={scopePickerRef}
                    onConversationUpdated={onConversationUpdated}
                    onScopeChanged={onScopeChanged}
                    onOpenCampaign={handleOpenCampaign}
                  />
                ) : null}
                <section aria-label="Outputs" className="gap-spacing-2 flex flex-col">
                  <h3 className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
                    Outputs
                  </h3>
                  <ShellRightPanelFiles conversationId={conversationId} messages={messages} />
                </section>
                <section aria-label="Sources" className="gap-spacing-2 flex flex-col">
                  <h3 className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
                    Sources
                  </h3>
                  <ShellRightPanelSources messages={messages} />
                </section>
              </>
            ) : null}
            <section aria-label="Tasks" className="gap-spacing-2 flex flex-col">
              <h3 className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
                Tasks
              </h3>
              <ShellRightPanelTasks conversationId={conversationId} messages={messages} />
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}
