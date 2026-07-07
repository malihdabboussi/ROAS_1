'use client'

import type { MutableRefObject } from 'react'
import { ChevronDown, ChevronRight, MoreHorizontal, Pin, Plus } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import type { SidebarCampaignRow } from '@/components/layout/sidebar/sidebar-types'
import type { Conversation } from '@/lib/conversations'
import {
  type TeamConversationCampaignGroup,
} from './team-conversations-sidebar.logic'
import { TeamConversationSessionRow } from './TeamConversationSessionRow'

type SessionActionsPosition = {
  top: number
  left: number
  minWidth: number
}

export interface TeamConversationCampaignGroupSectionProps {
  group: TeamConversationCampaignGroup
  isOpen: boolean
  selectedIdx: number
  visibleConversations: Conversation[]
  hasMoreConversations: boolean
  campaignRow: SidebarCampaignRow | null
  creatingSession: boolean
  currentUserId?: string | null
  deletingSessionId: string | null
  renamingSessionId: string | null
  renameValue: string
  selectedSessionId: string | null
  sessionActionsOpenId: string | null
  sessionActionsPos: SessionActionsPosition
  sessionActionsTriggerRef: MutableRefObject<HTMLElement | null>
  sessionTitleTypewriter?: { conversationId: string; text: string } | null
  showAllOrgConversations: boolean
  onCancelRename: () => void
  onCreateConversationInGroup: (groupKey: string) => void
  onDeleteSession: (id: string) => void
  onLoadMoreConversations: (groupKey: string) => void
  onRenameValueChange: (value: string) => void
  onSelectConversation: (id: string) => void
  onSessionActionsOpenIdChange: (id: string | null) => void
  onStartRename: (session: Conversation) => void
  onSubmitRename: () => void
  onToggleCampaignGroup: (groupKey: string) => void
  onToggleCampaignMenu: (groupKey: string, target: HTMLElement) => void
}

export function TeamConversationCampaignGroupSection({
  campaignRow,
  creatingSession,
  currentUserId,
  deletingSessionId,
  group,
  hasMoreConversations,
  isOpen,
  onCancelRename,
  onCreateConversationInGroup,
  onDeleteSession,
  onLoadMoreConversations,
  onRenameValueChange,
  onSelectConversation,
  onSessionActionsOpenIdChange,
  onStartRename,
  onSubmitRename,
  onToggleCampaignGroup,
  onToggleCampaignMenu,
  renameValue,
  renamingSessionId,
  selectedIdx,
  selectedSessionId,
  sessionActionsOpenId,
  sessionActionsPos,
  sessionActionsTriggerRef,
  sessionTitleTypewriter,
  showAllOrgConversations,
  visibleConversations,
}: TeamConversationCampaignGroupSectionProps) {
  return (
    <div className="group/folder">
      <button
        type="button"
        onClick={() => onToggleCampaignGroup(group.key)}
        className={`nav-glass-hover-purple flex w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-left transition-all ${
          selectedIdx >= 0
            ? 'nav-glass-selected-purple nav-glass-text-purple'
            : 'text-muted-foreground'
        }`}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        )}
        <LucideIcon name={group.icon ?? 'folder-kanban'} className="icon-md flex-shrink-0" />
        <span className="body-2 flex-1 truncate">{group.label}</span>
        <span className="flex shrink-0 items-center gap-1">
          {campaignRow?.isPinned && (
            <span
              className="text-muted-foreground flex h-3 w-3 shrink-0 items-center justify-center"
              aria-hidden
            >
              <Pin className="h-2.5 w-2.5 fill-current" />
            </span>
          )}
          {campaignRow ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onToggleCampaignMenu(group.key, e.currentTarget)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  onToggleCampaignMenu(group.key, e.currentTarget)
                }
              }}
              className="text-muted-foreground hover:text-foreground flex h-4 w-4 shrink-0 items-center justify-center rounded p-0.5 opacity-0 transition-opacity group-hover/folder:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </span>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'max-h-0 overflow-hidden opacity-0'
        }`}
      >
        <div className="space-y-0.5 py-0.5 pl-4">
          <button
            type="button"
            onClick={() => onCreateConversationInGroup(group.key)}
            disabled={creatingSession}
            className="body-2 nav-glass-hover-green text-muted-foreground flex w-full items-center gap-2 rounded-lg px-3 py-1 text-left transition-all"
          >
            <Plus className="h-3 w-3" />
            New Chat
          </button>
          {visibleConversations.map((session) => (
            <TeamConversationSessionRow
              key={session.id}
              session={session}
              isSelected={selectedSessionId === session.id}
              isRenaming={renamingSessionId === session.id}
              isDeleting={deletingSessionId === session.id}
              renameValue={renameValue}
              onRenameValueChange={onRenameValueChange}
              onSubmitRename={onSubmitRename}
              onCancelRename={onCancelRename}
              onSelectConversation={onSelectConversation}
              onStartRename={onStartRename}
              onDeleteSession={onDeleteSession}
              sessionActionsOpenId={sessionActionsOpenId}
              onSessionActionsOpenIdChange={onSessionActionsOpenIdChange}
              sessionActionsTriggerRef={sessionActionsTriggerRef}
              sessionActionsPos={sessionActionsPos}
              sessionTitleTypewriter={sessionTitleTypewriter}
              avatarKind={showAllOrgConversations ? 'creator' : 'none'}
              currentUserId={currentUserId}
            />
          ))}
          {hasMoreConversations && (
            <button
              type="button"
              onClick={() => onLoadMoreConversations(group.key)}
              className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground w-full rounded-lg px-3 py-1.5 text-left transition-colors"
            >
              See more
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
