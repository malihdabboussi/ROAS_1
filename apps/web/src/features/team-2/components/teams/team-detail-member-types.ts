export type TeamDetailOrgMember = {
  id: string
  user_id: string
  role: string
  profiles?: {
    full_name?: string | null
    email?: string | null
    avatar_url?: string | null
  }
}

export type RemoveTeamMemberTarget =
  | { type: 'human'; id: string; label: string }
  | { type: 'external'; id: string; label: string }
  | { type: 'agent'; id: string; label: string }
