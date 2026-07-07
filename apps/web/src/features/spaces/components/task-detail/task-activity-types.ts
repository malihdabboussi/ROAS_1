import type { TeamRosterEntry } from '@/lib/team'

export interface MissionLog {
  id: string
  mission_id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  agent_key?: string
}

export interface TimelineEntry {
  id: string
  source: 'human' | 'agent'
  user_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  agent_key?: string
}

export type ActivityMeta = {
  label: string
  /** First-letter fallback for avatars (display name, not the word "You") */
  senderLabel: string
  avatarUrl: string | null
  isAgent: boolean
  isSystem: boolean
}

export interface TaskActivityAuthProfile {
  avatarUrl: string | null
  displayName: string
}

export interface TaskActivityMetaArgs {
  entry: TimelineEntry
  currentUserId: string | null
  roster: TeamRosterEntry[]
  rosterAvatars: Map<string, string>
  authDisplayName: string
  authAvatarUrl: string | null
}
