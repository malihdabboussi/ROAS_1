'use client'

import { useMemo, useRef, type RefObject } from 'react'
import { CalendarDays, FolderKanban, Layers, Plus, X, type LucideIcon } from 'lucide-react'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from '@/components/conversations'
import { programNameForCampaign } from '@/components/conversations/conversation-scope-groups'
import { conversationScopeDisplayLabel } from '@/components/conversations/conversation-scope-picker-layout'
import {
  useConversationScopeCampaigns,
  useConversationScopeFallbackCampaign,
  useConversationScopeFallbackSpace,
  useConversationScopePrograms,
} from '@/components/conversations/use-conversation-scope-data'
import type { Conversation, MeetingConversationLink } from '@/lib/conversations'
import { assignConversationScope } from '@/lib/conversations'
import { useCampaignCacheVersion } from '@/lib/home'
import { useOrgStore } from '@/lib/org'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'
import { ShellRightPanelEmpty } from './ShellRightPanelEmpty'
import { ShellRightPanelSection } from './ShellRightPanelSection'

/** Stable empty map — a fresh `{}` each render re-fires the fallback space fetch. */
const EMPTY_SPACES_BY_CAMPAIGN: Record<string, never> = {}

type ConnectionRowKind = 'meeting' | 'location'

type ConnectionRow = {
  id: string
  kind: ConnectionRowKind
  title: string
  icon: LucideIcon
  openCampaignId?: string | null
  openSpaceId?: string | null
}

export function ShellRightPanelConnections({
  conversation,
  campaignId,
  spaceId,
  linkedMeeting = null,
  meetingTitle = null,
  pickerRef,
  open,
  onOpenChange,
  onConversationUpdated,
  onScopeChanged,
  onOpenCampaign,
  onOpenSpace,
  onOpenMeeting,
  onClearMeeting,
}: {
  conversation: Conversation | null
  campaignId: string | null
  spaceId: string | null
  linkedMeeting?: MeetingConversationLink | null
  meetingTitle?: string | null
  pickerRef?: RefObject<ConversationScopePickerHandle | null>
  open: boolean
  onOpenChange: (open: boolean) => void
  onConversationUpdated?: (conversation: Conversation) => void
  onScopeChanged?: (scope: { campaignId: string | null; spaceId: string | null }) => void
  onOpenCampaign?: (campaignId: string) => void
  onOpenSpace?: (spaceId: string) => void
  onOpenMeeting?: () => void
  onClearMeeting?: () => void
}) {
  const localPickerRef = useRef<ConversationScopePickerHandle>(null)
  const scopePickerRef = pickerRef ?? localPickerRef
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const cacheVersion = useCampaignCacheVersion()
  const campaigns = useConversationScopeCampaigns(activeOrgId, cacheVersion)
  const programs = useConversationScopePrograms(activeOrgId)
  const fallbackCampaign = useConversationScopeFallbackCampaign(campaignId, campaigns)
  const campaign = campaigns.find((row) => row.id === campaignId) ?? fallbackCampaign
  const space = useConversationScopeFallbackSpace({
    activeOrgId,
    selectedCampaignId: null,
    selectedSpaceId: spaceId,
    spacesByCampaign: EMPTY_SPACES_BY_CAMPAIGN,
  })

  // Meeting chats are scoped to the Meetings space — show the specific meeting
  // name instead of the generic space title, and open that meeting on click.
  // Require the live scope space to match so clearing Connections hides the row
  // even when meeting metadata remains on the conversation.
  const showMeetingRow = Boolean(linkedMeeting && spaceId && spaceId === linkedMeeting.spaceId)
  const hideMeetingHostSpace = showMeetingRow

  const rows = useMemo((): ConnectionRow[] => {
    const next: ConnectionRow[] = []

    if (showMeetingRow && linkedMeeting) {
      next.push({
        id: 'meeting',
        kind: 'meeting',
        title: meetingTitle?.trim() || 'Meeting',
        icon: CalendarDays,
      })
    }

    const locationSpaceId = hideMeetingHostSpace ? null : spaceId
    if (campaignId || locationSpaceId) {
      const title = conversationScopeDisplayLabel({
        campaignName: campaign?.name,
        spaceTitle: locationSpaceId ? space?.title : null,
        programName: programNameForCampaign(campaign, programs),
        campaignId,
        spaceId: locationSpaceId,
        emptyLabel: 'General',
      })
      next.push({
        id: 'location',
        kind: 'location',
        title,
        icon: locationSpaceId ? Layers : FolderKanban,
        openCampaignId: campaignId,
        openSpaceId: locationSpaceId,
      })
    }

    return next
  }, [
    campaign,
    campaignId,
    hideMeetingHostSpace,
    linkedMeeting,
    meetingTitle,
    programs,
    showMeetingRow,
    space?.title,
    spaceId,
  ])

  const clearScope = async () => {
    if (!conversation) {
      onScopeChanged?.({ campaignId: null, spaceId: null })
      return
    }
    const updated = await assignConversationScope(conversation.id, null, null)
    onConversationUpdated?.(updated)
    onScopeChanged?.({ campaignId: null, spaceId: null })
  }

  const openRow = (row: ConnectionRow) => {
    if (row.kind === 'meeting') {
      onOpenMeeting?.()
      return
    }
    if (row.openCampaignId) {
      onOpenCampaign?.(row.openCampaignId)
      return
    }
    if (row.openSpaceId) onOpenSpace?.(row.openSpaceId)
  }

  const removeRow = (row: ConnectionRow) => {
    if (row.kind === 'meeting') onClearMeeting?.()
    void clearScope()
  }

  // Adding from a collapsed section would drop the new row out of sight, so
  // opening the picker expands the section first.
  const handleAdd = () => {
    onOpenChange(true)
    scopePickerRef.current?.openMenuFromBanner()
  }

  return (
    <>
      <ShellRightPanelSection
        title="Connections"
        open={open}
        onToggle={() => onOpenChange(!open)}
        action={
          <button
            ref={addButtonRef}
            type="button"
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground p-spacing-1 shrink-0 rounded-lg transition-colors"
            aria-label="Add connection"
            title="Add connection"
            onClick={handleAdd}
          >
            <Plus className="icon-sm" aria-hidden />
          </button>
        }
      >
        {rows.length === 0 ? (
          <ShellRightPanelEmpty
            art="connections"
            message={SHELL_RIGHT_PANEL_MESSAGES.connectionsEmpty}
          />
        ) : (
          <ul>
            {rows.map((row) => {
              const Icon = row.icon
              const canOpen =
                row.kind === 'meeting'
                  ? Boolean(onOpenMeeting)
                  : Boolean(row.openCampaignId ? onOpenCampaign : row.openSpaceId && onOpenSpace)
              return (
                <li key={row.id}>
                  {/* Click opens the linked artifact; X stays for remove only. */}
                  <div className="gap-spacing-2 px-spacing-3 py-spacing-1-5 hover:bg-hover-subtle group flex items-center rounded-lg transition-colors">
                    {canOpen ? (
                      <button
                        type="button"
                        className="gap-spacing-2 flex min-w-0 flex-1 items-center text-left"
                        onClick={() => openRow(row)}
                        aria-label={`Open ${row.title}`}
                      >
                        <Icon className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                        <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                          {row.title}
                        </span>
                      </button>
                    ) : (
                      <>
                        <Icon className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                        <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                          {row.title}
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Remove ${row.title} connection`}
                      onClick={(event) => {
                        event.stopPropagation()
                        removeRow(row)
                      }}
                    >
                      <X className="icon-sm" aria-hidden />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </ShellRightPanelSection>
      {/* Outside the collapsible body on purpose: collapsing the section must
          not unmount the picker, or the "+" and the shell's open-picker
          request would both break. */}
      <ConversationScopePicker
        ref={scopePickerRef}
        conversation={conversation}
        campaignId={campaignId}
        spaceId={spaceId}
        hideTrigger
        bannerAnchorRef={addButtonRef}
        onConversationUpdated={onConversationUpdated}
        onScopeChanged={onScopeChanged}
        onOpenCampaign={onOpenCampaign}
      />
    </>
  )
}
