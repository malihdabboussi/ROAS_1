'use client'

import type { MutableRefObject } from 'react'
import type { Conversation } from '@/lib/conversations'
import {
  type TeamConversationAgent,
  type TeamConversationCampaignGroup,
} from './team-conversations-sidebar.logic'
import { TeamConversationSessionRow } from './TeamConversationSessionRow'

type SessionActionsPosition = {
  top: number
  left: number
  minWidth: number
}

export interface TeamConversationSearchResultsProps {
  agentByKey: Map<string, TeamConversationAgent>
  deletingSessionId: string | null
  groups: TeamConversationCampaignGroup[]
  renameValue: string
  renamingSessionId: string | null
  searchQuery: string
  selectedSessionId: string | null
  sessionActionsOpenId: string | null
  sessionActionsPos: SessionActionsPosition
  sessionActionsTriggerRef: MutableRefObject<HTMLElement | null>
  sessionTitleTypewriter?: { conversationId: string; text: string } | null
  onCancelRename: () => void
  onDeleteSession: (id: string) => void
  onRenameValueChange: (value: string) => void
  onSelectConversation: (id: string) => void
  onSessionActionsOpenIdChange: (id: string | null) => void
  onStartRename: (session: Conversation) => void
  onSubmitRename: () => void
}

export function TeamConversationSearchResults({
  agentByKey,
  deletingSessionId,
  groups,
  onCancelRename,
  onDeleteSession,
  onRenameValueChange,
  onSelectConversation,
  onSessionActionsOpenIdChange,
  onStartRename,
  onSubmitRename,
  renameValue,
  renamingSessionId,
  searchQuery,
  selectedSessionId,
  sessionActionsOpenId,
  sessionActionsPos,
  sessionActionsTriggerRef,
  sessionTitleTypewriter,
}: TeamConversationSearchResultsProps) {
  const groupsWithConversations = groups.filter((group) => group.conversations.length > 0)

  if (groupsWithConversations.length === 0) {
    return (
      <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-4 text-center">
        No conversations match "{searchQuery.trim()}"
      </p>
    )
  }

  return (
    <>
      {groupsWithConversations.map((group) => (
        <div key={group.key}>
          <div className="px-spacing-2 pb-spacing-1 pt-spacing-2 typo-2xs text-muted-foreground font-medium uppercase tracking-wider">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.conversations.map((session) => (
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
                agentByKey={agentByKey}
                avatarKind="agent"
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
