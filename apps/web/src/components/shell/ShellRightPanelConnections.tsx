'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { CalendarDays, FolderKanban, Layers, Plus, X, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from '@/components/conversations'
import { readConversationSpaceId } from '@/components/conversations/conversation-scope-picker-layout'
import { useConversationLocationLabel } from '@/components/conversations/use-conversation-location-label'
import { useConversationScopeCampaigns } from '@/components/conversations/use-conversation-scope-data'
import type {
  Conversation,
  ConversationConnection,
  MeetingConversationLink,
} from '@/lib/conversations'
import {
  CONVERSATION_ACTIONS_TOAST_ERRORS,
  fetchConversationConnections,
  removeConversationConnection,
} from '@/lib/conversations'
import { useCampaignCacheVersion } from '@/lib/home'
import { useOrgStore } from '@/lib/org'
import {
  capVisibleConnectionRows,
  extraConnectionTitle,
  extraConversationConnections,
} from './shell-right-panel-connection-rows'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'
import { ShellRightPanelEmpty } from './ShellRightPanelEmpty'
import { ShellRightPanelSection } from './ShellRightPanelSection'

type ConnectionRowKind = 'meeting' | 'location' | 'extra'

type ConnectionRow = {
  id: string
  kind: ConnectionRowKind
  title: string
  icon: LucideIcon
  removable: boolean
  openCampaignId?: string | null
  openSpaceId?: string | null
  extraType?: ConversationConnection['entity_type']
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
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const cacheVersion = useCampaignCacheVersion()
  const campaigns = useConversationScopeCampaigns(activeOrgId, cacheVersion)
  const [extraConnections, setExtraConnections] = useState<ConversationConnection[]>([])
  const showMeetingRow = Boolean(linkedMeeting)
  const hideMeetingHostSpace = Boolean(
    linkedMeeting && spaceId && spaceId === linkedMeeting.spaceId,
  )
  const locationSpaceId = hideMeetingHostSpace ? null : spaceId
  const location = useConversationLocationLabel(campaignId, locationSpaceId)

  useEffect(() => {
    if (!conversation?.id) {
      setExtraConnections([])
      return
    }
    let cancelled = false
    void fetchConversationConnections(conversation.id)
      .then((result) => {
        if (cancelled) return
        setExtraConnections(
          extraConversationConnections(result.connections, campaignId, locationSpaceId),
        )
      })
      .catch(() => {
        if (!cancelled) setExtraConnections([])
      })
    return () => {
      cancelled = true
    }
  }, [campaignId, conversation?.id, locationSpaceId])

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

    for (const connection of extraConnections) {
      next.push({
        id: `extra:${connection.entity_type}:${connection.entity_id}`,
        kind: 'extra',
        title: extraConnectionTitle(connection, campaigns),
        icon: connection.entity_type === 'space' ? Layers : FolderKanban,
        removable: true,
        extraType: connection.entity_type,
        openCampaignId: connection.entity_type === 'campaign' ? connection.entity_id : null,
        openSpaceId: connection.entity_type === 'space' ? connection.entity_id : null,
      })
    }

    return capVisibleConnectionRows(next)
  }, [
    campaigns,
    extraConnections,
    linkedMeeting,
    location.label,
    location.pending,
    location.resolvedCampaignId,
    locationSpaceId,
    meetingTitle,
    showMeetingRow,
  ])

  const applyRemovedConversation = (
    updated: Conversation,
    connections: ConversationConnection[],
    notifyScope: boolean,
  ) => {
    onConversationUpdated?.(updated)
    setExtraConnections(
      extraConversationConnections(
        connections,
        updated.campaign_id,
        readConversationSpaceId(updated),
      ),
    )
    if (notifyScope) {
      onScopeChanged?.({
        campaignId: updated.campaign_id,
        spaceId: readConversationSpaceId(updated),
      })
    }
  }

  const removeRow = (row: ConnectionRow) => {
    if (!row.removable) return
    if (row.kind === 'extra' && conversation && row.extraType) {
      const entityId = row.extraType === 'space' ? row.openSpaceId : row.openCampaignId
      if (!entityId) return
      void removeConversationConnection(conversation.id, row.extraType, entityId)
        .then((result) => applyRemovedConversation(result.conversation, result.connections, false))
        .catch(() => {
          toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.REMOVE_CONNECTION_FAILED.userMessage)
        })
      return
    }
    if (conversation && row.kind === 'location') {
      const entityType = row.openSpaceId ? 'space' : 'campaign'
      const entityId = row.openSpaceId ?? row.openCampaignId
      if (!entityId) return
      void removeConversationConnection(conversation.id, entityType, entityId)
        .then((result) => applyRemovedConversation(result.conversation, result.connections, true))
        .catch(() => {
          toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.REMOVE_CONNECTION_FAILED.userMessage)
        })
      return
    }
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
      <ConversationScopePicker
        ref={scopePickerRef}
        conversation={conversation}
        campaignId={campaignId}
        spaceId={spaceId}
        hideTrigger
        selectionMode="add"
        bannerAnchorRef={addButtonRef}
        onConversationUpdated={onConversationUpdated}
        onScopeChanged={onScopeChanged}
        onOpenCampaign={onOpenCampaign}
      />
    </>
  )
}
