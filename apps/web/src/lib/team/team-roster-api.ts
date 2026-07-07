import { backendGet } from '@/lib/api/backend-client'

export interface TeamRosterEntry {
  participant_id: string
  kind: 'agent' | 'human'
  org_id: string | null
  user_id: string | null
  agent_key: string | null
  display_name: string
  avatar_url: string | null
  role_label: string | null
  specialties: string[]
  accepts_assignments: boolean
  delegation_notes: string | null
  timezone: string | null
  working_hours: Record<string, { start: string; end: string }> | null
  out_of_office_until: string | null
  current_load: number
  is_ready: boolean
  agent_level: string | null
  org_role: string | null
  email: string | null
  created_at: string
  updated_at: string | null
}

export interface FetchTeamRosterOptions {
  kind?: 'agent' | 'human' | 'all'
  readyOnly?: boolean
}

export async function fetchTeamRoster(opts?: FetchTeamRosterOptions): Promise<TeamRosterEntry[]> {
  const params = new URLSearchParams()
  if (opts?.kind) params.set('kind', opts.kind)
  if (opts?.readyOnly) params.set('ready_only', 'true')
  const qs = params.toString()
  return backendGet<TeamRosterEntry[]>(`/api/team-roster${qs ? `?${qs}` : ''}`)
}
