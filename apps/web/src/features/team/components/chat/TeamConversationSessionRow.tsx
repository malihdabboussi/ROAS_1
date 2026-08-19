'use client'

import type { MutableRefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check, Edit2, Loader2, MoreHorizontal, Trash2, X } from 'lucide-react'
import { ConversationChannelIcon } from '@/components/chat/ConversationChannelIcon'
import { Tooltip } from '@/components/ui/tooltip'
import type { Conversation } from '@/lib/conversations'
import {
  getConversationDisplayTitle,
  type TeamConversationAgent,
} from './team-conversations-sidebar.logic'

type SessionActionsPosition = {
  top: number
  left: number
  minWidth: number
}

type SessionAvatarKind = 'agent' | 'creator' | 'none'

export interface TeamConversationSessionRowProps {
  session: Conversation
  isSelected: boolean
  isRenaming: boolean
  isDeleting: boolean
  renameValue: string
  onRenameValueChange: (value: string) => void
  onSubmitRename: () => void
  onCancelRename: () => void
  onSelectConversation: (id: string) => void
  onStartRename: (session: Conversation) => void
  onDeleteSession: (id: string) => void
  sessionActionsOpenId: string | null
  onSessionActionsOpenIdChange: (id: string | null) => void
  sessionActionsTriggerRef: MutableRefObject<HTMLElement | null>
  sessionActionsPos: SessionActionsPosition
  sessionTitleTypewriter?: { conversationId: string; text: string } | null
  agentByKey?: Map<string, TeamConversationAgent>
  avatarKind?: SessionAvatarKind
  currentUserId?: string | null
}

function readSessionMetadata(session: Conversation): Record<string, unknown> | null {
  return (session.metadata as Record<string, unknown> | undefined) ?? null
}

function shouldShowChannelGlyph(metadata: Record<string, unknown> | null): boolean {
  const source = metadata?.source
  return source === 'telegram' || source === 'slack'
}

function AgentAvatar({
  agent,
}: {
  agent: TeamConversationAgent | null
}) {
  if (!agent) return null
  return (
    <Tooltip label={agent.name} side="right">
      <span className="bg-secondary text-foreground typo-2xs flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-semibold uppercase">
        {agent.image_url ? (
          <img src={agent.image_url} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          agent.name.charAt(0)
        )}
      </span>
    </Tooltip>
  )
}

function CreatorAvatar({
  currentUserId,
  session,
}: {
  currentUserId?: string | null
  session: Conversation
}) {
  if (!session.creator || session.creator.id === currentUserId) return null
  const label = session.creator.full_name || 'Team member'
  return (
    <Tooltip label={label} side="right">
      <span className="bg-secondary text-foreground typo-2xs flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-semibold uppercase">
        {session.creator.avatar_url ? (
          <img
            src={session.creator.avatar_url}
            alt=""
            referrerPolicy="no-referrer"
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          label.charAt(0)
        )}
      </span>
    </Tooltip>
  )
}

function TeamConversationSessionActionsMenu({
  isDeleting,
  onDeleteSession,
  onSessionActionsOpenIdChange,
  onStartRename,
  session,
  sessionActionsPos,
}: {
  isDeleting: boolean
  onDeleteSession: (id: string) => void
  onSessionActionsOpenIdChange: (id: string | null) => void
  onStartRename: (session: Conversation) => void
  session: Conversation
  sessionActionsPos: SessionActionsPosition
}) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      data-session-actions-dropdown
      className="dropdown-menu-solid z-dropdown rounded-spacing-2 p-spacing-1 fixed"
      style={{
        top: sessionActionsPos.top,
        left: sessionActionsPos.left,
        minWidth: sessionActionsPos.minWidth,
      }}
    >
      <button
        type="button"
        onClick={() => {
          onSessionActionsOpenIdChange(null)
          onStartRename(session)
        }}
        className="px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 gap-spacing-2 hover:bg-hover-subtle text-muted-foreground hover:text-foreground flex w-full items-center text-left"
      >
        <Edit2 className="icon-xs" /> Rename
      </button>
      <button
        type="button"
        onClick={() => {
          onSessionActionsOpenIdChange(null)
          void onDeleteSession(session.id)
        }}
        disabled={isDeleting}
        className="px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 gap-spacing-2 text-destructive hover:bg-destructive/10 hover:text-destructive flex w-full items-center text-left disabled:opacity-50"
      >
        {isDeleting ? <Loader2 className="icon-xs animate-spin" /> : <Trash2 className="icon-xs" />}{' '}
        Delete
      </button>
    </div>,
    document.body,
  )
}

export function TeamConversationSessionRow({
  agentByKey,
  avatarKind = 'none',
  currentUserId,
  isDeleting,
  isRenaming,
  isSelected,
  onCancelRename,
  onDeleteSession,
  onRenameValueChange,
  onSelectConversation,
  onSessionActionsOpenIdChange,
  onStartRename,
  onSubmitRename,
  renameValue,
  session,
  sessionActionsOpenId,
  sessionActionsPos,
  sessionActionsTriggerRef,
  sessionTitleTypewriter,
}: TeamConversationSessionRowProps) {
  const sessionMeta = readSessionMetadata(session)
  const menuOpen = sessionActionsOpenId === session.id
  const agent = session.agent_id && agentByKey ? agentByKey.get(session.agent_id) ?? null : null

  return (
    <div className="group/row relative">
      {isRenaming ? (
        <div className="flex items-center gap-2 px-2">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onSubmitRename()
              if (e.key === 'Escape') onCancelRename()
            }}
            className="input-glass body-2 flex-1 rounded px-2 py-1"
            autoFocus
          />
          <button
            type="button"
            onClick={() => void onSubmitRename()}
            aria-label="Save name"
            title="Save name"
            className="btn-icon-glass btn-icon-glass-sm"
          >
            <Check className="icon-xs" />
          </button>
          <button
            type="button"
            onClick={onCancelRename}
            aria-label="Cancel rename"
            title="Cancel rename"
            className="btn-icon-glass btn-icon-glass-sm"
          >
            <X className="icon-xs" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void onSelectConversation(session.id)}
          className={`nav-glass-hover-purple flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-1 text-left transition-all ${
            isSelected ? 'nav-glass-selected-purple nav-glass-text-purple' : 'text-muted-foreground'
          }`}
        >
          {shouldShowChannelGlyph(sessionMeta) && <ConversationChannelIcon metadata={sessionMeta} />}
          {avatarKind === 'agent' && <AgentAvatar agent={agent} />}
          {avatarKind === 'creator' && (
            <CreatorAvatar currentUserId={currentUserId} session={session} />
          )}
          <span className="body-2 flex-1 truncate text-xs">
            {getConversationDisplayTitle(session, sessionTitleTypewriter)}
          </span>
          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                sessionActionsTriggerRef.current = e.currentTarget
                onSessionActionsOpenIdChange(menuOpen ? null : session.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  sessionActionsTriggerRef.current = e.currentTarget
                  onSessionActionsOpenIdChange(menuOpen ? null : session.id)
                }
              }}
              className="text-muted-foreground hover:text-foreground absolute rounded p-0.5 opacity-0 transition-opacity group-hover/row:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </span>
          </span>
        </button>
      )}
      {menuOpen && (
        <TeamConversationSessionActionsMenu
          isDeleting={isDeleting}
          onDeleteSession={onDeleteSession}
          onSessionActionsOpenIdChange={onSessionActionsOpenIdChange}
          onStartRename={onStartRename}
          session={session}
          sessionActionsPos={sessionActionsPos}
        />
      )}
    </div>
  )
}
