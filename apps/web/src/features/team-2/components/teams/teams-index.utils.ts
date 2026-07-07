import type { AgentTeam } from '@/lib/agents'
import type { TeamsGroupBy, TeamsGroupSort } from './TeamsToolbar'

export interface TeamsListGroup {
  key: string
  label: string
  color: string
  icon?: string | null
  sortRank: number
  teams: AgentTeam[]
}

export function teamAgentCount(team: AgentTeam): number {
  return team.member_count ?? 0
}

export function teamPeopleCount(team: AgentTeam): number {
  return team.user_member_count ?? 0
}

export function teamMatchesSearch(team: AgentTeam, query: string): boolean {
  if (!query.trim()) return true
  const normalized = query.trim().toLowerCase()
  return team.name.toLowerCase().includes(normalized)
}

export function sortTeams(list: AgentTeam[]): AgentTeam[] {
  return [...list].sort((a, b) => {
    if (a.is_system && !b.is_system) return -1
    if (!a.is_system && b.is_system) return 1
    return a.name.localeCompare(b.name)
  })
}

function teamTypeBucket(team: AgentTeam) {
  if (team.is_system) {
    return { key: 'system', label: 'System', color: 'muted', icon: 'shield', sortRank: 0 }
  }
  return { key: 'custom', label: 'Custom', color: 'blue', icon: 'users', sortRank: 1 }
}

function teamRosterBucket(team: AgentTeam) {
  const agents = teamAgentCount(team)
  const people = teamPeopleCount(team)
  if (agents === 0 && people === 0) {
    return { key: 'empty', label: 'Empty', color: 'muted', icon: 'circle-dashed', sortRank: 0 }
  }
  if (agents > 0 && people === 0) {
    return { key: 'agents_only', label: 'Agents only', color: 'blue', icon: 'bot', sortRank: 1 }
  }
  if (agents === 0 && people > 0) {
    return { key: 'people_only', label: 'People only', color: 'purple', icon: 'user', sortRank: 2 }
  }
  return { key: 'mixed', label: 'Agents & people', color: 'emerald', icon: 'users', sortRank: 3 }
}

function teamAccessBucket(team: AgentTeam) {
  const grants = team.grant_count ?? 0
  if (grants === 0) {
    return {
      key: 'no_access',
      label: 'No access rules',
      color: 'orange',
      icon: 'shield-off',
      sortRank: 0,
    }
  }
  return {
    key: 'has_access',
    label: 'Has access rules',
    color: 'green',
    icon: 'shield',
    sortRank: 1,
  }
}

function resolveTeamBucket(team: AgentTeam, groupBy: TeamsGroupBy) {
  if (groupBy === 'type') return teamTypeBucket(team)
  if (groupBy === 'roster') return teamRosterBucket(team)
  return teamAccessBucket(team)
}

export function groupTeams(
  teams: AgentTeam[],
  groupBy: TeamsGroupBy,
  groupSort: TeamsGroupSort,
): TeamsListGroup[] | null {
  if (groupBy === 'none') return null

  const buckets = new Map<string, TeamsListGroup>()
  for (const team of teams) {
    const bucketMeta = resolveTeamBucket(team, groupBy)
    const bucket = buckets.get(bucketMeta.key)
    if (bucket) bucket.teams.push(team)
    else {
      buckets.set(bucketMeta.key, {
        key: bucketMeta.key,
        label: bucketMeta.label,
        color: bucketMeta.color,
        icon: bucketMeta.icon,
        sortRank: bucketMeta.sortRank,
        teams: [team],
      })
    }
  }

  const groups = [...buckets.values()].map((group) => ({
    ...group,
    teams: sortTeams(group.teams),
  }))

  groups.sort((a, b) => {
    if (a.sortRank !== b.sortRank) {
      return groupSort === 'asc' ? a.sortRank - b.sortRank : b.sortRank - a.sortRank
    }
    const cmp = a.label.localeCompare(b.label)
    return groupSort === 'asc' ? cmp : -cmp
  })

  return groups
}

export function formatTeamRosterSummary(team: AgentTeam): string {
  const agents = teamAgentCount(team)
  const people = teamPeopleCount(team)
  if (agents === 0 && people === 0) return 'No members yet'
  const parts: string[] = []
  if (agents > 0) parts.push(`${agents} agent${agents === 1 ? '' : 's'}`)
  if (people > 0) parts.push(`${people} ${people === 1 ? 'person' : 'people'}`)
  return parts.join(' · ')
}

export function formatTeamAccessSummary(team: AgentTeam): string {
  const grants = team.grant_count ?? 0
  if (grants === 0) return 'No access rules'
  return `${grants} access rule${grants === 1 ? '' : 's'}`
}

export function formatTeamUpdatedAt(team: AgentTeam): string {
  const updated = new Date(team.updated_at)
  if (Number.isNaN(updated.getTime())) return '—'
  const diffDays = Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return updated.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatTeamAccessCount(team: AgentTeam): string {
  const grants = team.grant_count ?? 0
  if (grants === 0) return '—'
  return String(grants)
}
