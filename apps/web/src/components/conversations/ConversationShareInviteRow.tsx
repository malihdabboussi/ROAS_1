import type { RefObject } from 'react'
import { SettingsDropdown } from '@/components/ui/forms/SettingsDropdown'
import type { ConversationShareLevel } from '@/lib/conversations/conversation.types'
import { ConversationShareMemberAvatar } from './ConversationShareMemberAvatar'
import {
  CONVERSATION_SHARE_PERMISSION_DROPDOWN_OPTIONS,
  type ConversationShareRosterEntry,
} from './ConversationShareTypes'

interface ConversationShareInviteRowProps {
  inviteCandidates: ConversationShareRosterEntry[]
  inviteInputRef: RefObject<HTMLInputElement | null>
  inviteLevel: ConversationShareLevel
  inviteQuery: string
  onInvite: () => void
  onInviteLevelChange: (level: ConversationShareLevel) => void
  onInviteQueryChange: (query: string) => void
}

export function ConversationShareInviteRow({
  inviteCandidates,
  inviteInputRef,
  inviteLevel,
  inviteQuery,
  onInvite,
  onInviteLevelChange,
  onInviteQueryChange,
}: ConversationShareInviteRowProps) {
  return (
    <div className="px-spacing-6 pt-spacing-3">
      <div className="gap-spacing-2 flex items-center">
        <input
          ref={inviteInputRef}
          type="text"
          value={inviteQuery}
          onChange={(event) => onInviteQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onInvite()
          }}
          aria-label="Invite by name or email"
          placeholder="Invite by name or email"
          className="input-glass body-3 text-foreground h-spacing-8 rounded-spacing-2 px-spacing-3 py-spacing-1 min-w-0 flex-1"
        />
        <div className="w-40 shrink-0">
          <SettingsDropdown
            value={inviteLevel}
            options={CONVERSATION_SHARE_PERMISSION_DROPDOWN_OPTIONS}
            onChange={(value) => onInviteLevelChange(value as ConversationShareLevel)}
            appearance="spaces"
            compact
            minWidth={160}
          />
        </div>
        <button
          type="button"
          disabled={!inviteQuery.trim()}
          onClick={onInvite}
          className="button-glass-accent body-3 h-spacing-8 rounded-spacing-2 px-spacing-3 shrink-0 font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Invite
        </button>
      </div>
      {inviteCandidates.length > 0 && (
        <div className="mt-2 space-y-1">
          {inviteCandidates.map((entry) => (
            <button
              key={entry.participant_id}
              type="button"
              onClick={() => onInviteQueryChange(entry.email || entry.display_name)}
              className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs"
            >
              <ConversationShareMemberAvatar entry={entry} size="sm" />
              <span className="text-foreground">{entry.display_name}</span>
              <span className="text-muted-foreground">{entry.email ?? ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
