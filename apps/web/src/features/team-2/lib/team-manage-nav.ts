export const TEAM_MANAGE_SECTIONS = ['teams', 'agents'] as const
export type TeamManageSection = (typeof TEAM_MANAGE_SECTIONS)[number]

export type TeamAgentsViewKey = 'all' | string

export function isTeamManageSection(value: string | null | undefined): value is TeamManageSection {
  return value === 'agents' || value === 'teams'
}
