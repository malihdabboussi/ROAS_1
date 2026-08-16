'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { type ConversationScopePickerHandle } from '@/components/conversations'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { homeMeetingHref } from '@/features/home/lib/home-meeting-work-restore'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { readMeetingConversationLink, type Conversation } from '@/lib/conversations'
import { useQuickMissionsLauncher } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import {
  extractConversationMissionRows,
  extractConversationSourceRows,
  extractConversationTaskRows,
} from './shell-conversation-summary'
import type { ShellCreateMenuItem } from './shell-create-menu.config'
import { ShellCreateMenuPanel } from './ShellCreateMenuPanel'
import { ShellRightPanelConnections } from './ShellRightPanelConnections'
import { ShellRightPanelFiles } from './ShellRightPanelFiles'
import { ShellRightPanelProgress } from './ShellRightPanelProgress'
import { ShellRightPanelSection } from './ShellRightPanelSection'
import { ShellRightPanelSources } from './ShellRightPanelSources'
import { ShellRightPanelTasks } from './ShellRightPanelTasks'
import { useRightEdgePresence } from './use-right-edge-presence'
import { useShellStore } from './use-shell-store'

const EMPTY_MESSAGES: never[] = []

type ShellRightPanelSectionId = 'progress' | 'connections' | 'outputs' | 'sources' | 'tasks'

/**
 * Work summary as a floating bubble anchored to the chat's top-right corner —
 * a content-height card that expands down when opened and collapses back up,
 * with Progress / Connections / Outputs / Sources / Tasks stacked as
 * collapsible sections.
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
  // Collapse state lives here rather than in each section: this component
  // returns null while the panel is closed but stays mounted, so a section the
  // user collapsed is still collapsed when they reopen the panel.
  const [collapsedSections, setCollapsedSections] = useState<
    Partial<Record<ShellRightPanelSectionId, true>>
  >({})
  const [expandedSections, setExpandedSections] = useState<
    Partial<Record<ShellRightPanelSectionId, true>>
  >({})
  // A section with nothing in it opens collapsed so it costs no height; one
  // with content opens expanded. An explicit toggle always wins over the
  // default, which is why collapsed/expanded are tracked separately rather
  // than as one boolean seeded from emptiness.
  const isSectionOpen = useCallback(
    (id: ShellRightPanelSectionId, hasContent = true) => {
      if (collapsedSections[id]) return false
      if (expandedSections[id]) return true
      return hasContent
    },
    [collapsedSections, expandedSections],
  )
  const setSectionOpen = useCallback((id: ShellRightPanelSectionId, open: boolean) => {
    setCollapsedSections((prev) => {
      const next = { ...prev }
      if (open) delete next[id]
      else next[id] = true
      return next
    })
    setExpandedSections((prev) => {
      const next = { ...prev }
      if (open) next[id] = true
      else delete next[id]
      return next
    })
  }, [])
  const toggleSection = useCallback(
    (id: ShellRightPanelSectionId, hasContent = true) =>
      setSectionOpen(id, !isSectionOpen(id, hasContent)),
    [isSectionOpen, setSectionOpen],
  )
  // The create catalog swaps the card body — inside the bubble it can never be
  // clipped by an overflow boundary the way the old rail dropdown was.
  const [createOpen, setCreateOpen] = useState(false)
  const handleCreateSelect = useCallback(
    (item: ShellCreateMenuItem) => {
      useGlobalChatStore.getState().seedComposer({
        content: item.typePicker ? '' : item.prompt,
        seedMode: 'attach',
        quickStartId: item.id,
        workContext: spaceId ? { surface: 'spaces', spaceId } : undefined,
      })
    },
    [spaceId],
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
  const metadataMeeting = readMeetingConversationLink(conversationMetadata)
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
  // Missions have no conversation_id, so the thread's own receipts are the
  // conversation-scoped link. See extractConversationMissionRows.
  const missionRows = useMemo(() => extractConversationMissionRows(messages), [messages])
  // Emptiness decides a section's default open state, so each one needs to
  // know whether it has anything before it renders.
  const hasSources = useMemo(() => extractConversationSourceRows(messages).length > 0, [messages])
  const hasTasks = useMemo(
    () => !conversationId || extractConversationTaskRows(messages).length > 0,
    [conversationId, messages],
  )
  const hasConnections = Boolean(campaignId || spaceId)

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
    // Sits below the chat header row so the top-bar summary toggle stays
    // visible and owns open/close — the card carries no chrome of its own.
    <div className="px-spacing-2 top-spacing-12 z-dropdown pointer-events-none absolute right-0">
      <aside
        className={cn(
          'dropdown-menu-solid w-spacing-72 pointer-events-auto flex max-h-[70vh] origin-top-right flex-col overflow-hidden transition duration-200 ease-out motion-reduce:transition-none',
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        )}
        aria-label="Work summary"
        aria-hidden={!visible}
      >
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
          <div className="scrollbar-thin py-spacing-1 min-h-0 flex-1 overflow-y-auto">
            <ShellCreateMenuPanel
              onSelectCreateItem={handleCreateSelect}
              onSelectMissionPlaybook={(playbookKey) => openLauncher(playbookKey)}
              onCloseMenu={() => setCreateOpen(false)}
              onBack={() => setCreateOpen(false)}
            />
          </div>
        ) : (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {conversationId ? (
              <>
                {missionRows.length > 0 ? (
                  <ShellRightPanelSection
                    title="Mission Progress"
                    open={isSectionOpen('progress')}
                    onToggle={() => toggleSection('progress')}
                  >
                    <ShellRightPanelProgress missions={missionRows} />
                  </ShellRightPanelSection>
                ) : null}
                {scopeVisible ? (
                  <ShellRightPanelConnections
                    conversation={conversation}
                    campaignId={campaignId}
                    spaceId={spaceId}
                    pickerRef={scopePickerRef}
                    open={isSectionOpen('connections', hasConnections)}
                    onOpenChange={(next) => setSectionOpen('connections', next)}
                    onConversationUpdated={onConversationUpdated}
                    onScopeChanged={onScopeChanged}
                    onOpenCampaign={handleOpenCampaign}
                  />
                ) : null}
                <ShellRightPanelSection
                  title="Outputs"
                  open={isSectionOpen('outputs')}
                  onToggle={() => toggleSection('outputs')}
                  action={
                    <button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground p-spacing-1 shrink-0 rounded-lg transition-colors"
                      aria-label="Create"
                      aria-expanded={createOpen}
                      title="Create"
                    >
                      <Plus className="icon-sm" aria-hidden />
                    </button>
                  }
                >
                  <ShellRightPanelFiles conversationId={conversationId} messages={messages} />
                </ShellRightPanelSection>
                <ShellRightPanelSection
                  title="Sources"
                  open={isSectionOpen('sources', hasSources)}
                  onToggle={() => toggleSection('sources', hasSources)}
                >
                  <ShellRightPanelSources messages={messages} />
                </ShellRightPanelSection>
              </>
            ) : null}
            <ShellRightPanelSection
              title="Tasks"
              open={isSectionOpen('tasks', hasTasks)}
              onToggle={() => toggleSection('tasks', hasTasks)}
            >
              <ShellRightPanelTasks conversationId={conversationId} messages={messages} />
            </ShellRightPanelSection>
          </div>
        )}
      </aside>
    </div>
  )
}
