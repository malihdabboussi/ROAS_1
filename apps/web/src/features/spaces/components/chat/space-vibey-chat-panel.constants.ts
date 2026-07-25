import {
  DEFAULT_AGENT_AVATAR_URL,
  DEFAULT_AGENT_DISPLAY_NAME,
} from '@/lib/team/default-agent-identity'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { DEFAULT_SPACE_CHAT_AGENT_KEY } from './space-vibey-chat-panel.logic'

/** Local empty defaults — keep structural, avoid cross-feature type imports. */
export const EMPTY_MESSAGES: never[] = []
export const EMPTY_QUEUE: Array<{
  id: string
  content: string
  documents?: unknown[]
  artifacts?: unknown[]
  model?: string
}> = []
export const BOTTOM_SCROLL_THRESHOLD = 80

export const VIBEY_ROSTER_FALLBACK: TeamRosterEntry = {
  participant_id: 'agent:vibey',
  kind: 'agent',
  org_id: null,
  user_id: null,
  agent_key: DEFAULT_SPACE_CHAT_AGENT_KEY,
  display_name: DEFAULT_AGENT_DISPLAY_NAME,
  avatar_url: DEFAULT_AGENT_AVATAR_URL,
  role_label: null,
  specialties: [],
  accepts_assignments: true,
  delegation_notes: null,
  timezone: null,
  working_hours: null,
  out_of_office_until: null,
  current_load: 0,
  is_ready: true,
  agent_level: null,
  org_role: null,
  email: null,
  created_at: '',
  updated_at: null,
}
