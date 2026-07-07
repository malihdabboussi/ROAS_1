import type { ConversationShareLevel } from '@/lib/conversations/conversation.types'

export interface ConversationShareRosterEntry {
  participant_id: string
  kind: string
  user_id: string | null
  display_name: string
  email?: string | null
  avatar_url?: string | null
}

export const CONVERSATION_SHARE_PERMISSION_OPTIONS: ReadonlyArray<{
  value: ConversationShareLevel
  label: string
}> = [
  { value: 'admin', label: 'Admin' },
  { value: 'edit', label: 'Edit' },
  { value: 'view', label: 'View only' },
]

export const CONVERSATION_SHARE_PERMISSION_DROPDOWN_OPTIONS =
  CONVERSATION_SHARE_PERMISSION_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }))

export const CONVERSATION_SHARE_TOAST_ERRORS = {
  LOAD_CONVERSATION_SHARES_FAILED: { userMessage: 'Failed to load shares — try again.' },
  SELECT_MEMBER_REQUIRED: { userMessage: 'Select a workspace member by name or email.' },
  INVITE_USER_FAILED: { userMessage: 'Failed to invite user — try again.' },
  CHANGE_PERMISSION_FAILED: { userMessage: 'Failed to change permission — try again.' },
  UPDATE_CONVERSATION_SHARE_FAILED: { userMessage: 'Failed to update share — try again.' },
  UPDATE_ORG_SHARE_FAILED: { userMessage: 'Failed to update organization share — try again.' },
} as const

export const CONVERSATION_SHARE_TOAST_SUCCESS = {
  SHARE_UPDATED: { userMessage: 'Share updated.' },
} as const
