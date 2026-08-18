'use client'

import { useMemo, useRef, type RefObject } from 'react'
import { CalendarDays, FolderKanban, Layers, Plus, X, type LucideIcon } from 'lucide-react'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from '@/components/conversations'
import { useConversationLocationLabel } from '@/components/conversations/use-conversation-location-label'
import type { Conversation, MeetingConversationLink } from '@/lib/conversations'
import { assignConversationScope } from '@/lib/conversations'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'
import { ShellRightPanelEmpty } from './ShellRightPanelEmpty'
import { ShellRightPanelSection } from './ShellRightPanelSection'

type ConnectionRowKind = 'meeting' | 'location'

type ConnectionRow = {
  id: string
  kind: ConnectionRowKind
  title: string
  icon: LucideIcon
  removable: boolean
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
}) {
  const localPickerRef = useRef<ConversationScopePickerHandle>(null)
  const scopePickerRef = pickerRef ?? localPickerRef
  const addButtonRef = useRef<HTMLButtonElement>(null)
  // Meeting chats are scoped to the Meetings space — show the specific meeting
  // name instead of the generic space title, and open that meeting on click.
  // The meeting workspace is the main artifact, so it stays linked.
  const showMeetingRow = Boolean(linkedMeeting)
  const hideMeetingHostSpace = Boolean(
    linkedMeeting && spaceId && spaceId === linkedMeeting.spaceId,
  )
  const locationSpaceId = hideMeetingHostSpace ? null : spaceId
  const location = useConversationLocationLabel(campaignId, locationSpaceId)

  const rows = useMemo((): ConnectionRow[] => {
    const next: ConnectionRow[] = []

    if (showMeetingRow && linkedMeeting) {
      next.push({
        id: 'meeting',
        kind: 'meeting',
        title: meetingTitle?.trim() || 'Meeting',
        icon: CalendarDays,
        removable: false,
      })
    }

    if (!location.pending && (location.resolvedCampaignId || locationSpaceId)) {
      next.push({
        id: 'location',
        kind: 'location',
        title: location.label,
        icon: locationSpaceId ? Layers : FolderKanban,
        removable: true,
        openCampaignId: location.resolvedCampaignId,
        openSpaceId: locationSpaceId,
      })
    }

    return next
  }, [
    linkedMeeting,
    location.label,
    location.pending,
    location.resolvedCampaignId,
    locationSpaceId,
    meetingTitle,
    showMeetingRow,
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
    if (row.openSpaceId) {
      onOpenSpace?.(row.openSpaceId)
      return
    }
    if (row.openCampaignId) onOpenCampaign?.(row.openCampaignId)
  }

  const removeRow = (row: ConnectionRow) => {
    if (!row.removable) return
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
        {location.pending ? null : rows.length === 0 ? (
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
                  : Boolean(row.openSpaceId ? onOpenSpace : row.openCampaignId && onOpenCampaign)
              return (
                <li key={row.id}>
                  {/* Click opens the linked artifact. Campaign/Space rows can be
                      unlinked; the meeting workspace cannot. */}
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
                    {row.removable ? (
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
                    ) : null}
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
