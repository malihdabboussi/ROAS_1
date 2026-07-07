import type { TeamDetailTab } from './agent-team-detail-tabs'

export function teamPageUrl(teamId: string, tab?: TeamDetailTab, opts?: { addMembers?: boolean }) {
  const base = `/team/teams/${teamId}`
  const params = new URLSearchParams()
  if (tab && tab !== 'overview') params.set('tab', tab)
  if (opts?.addMembers) params.set('addMembers', '1')
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export function teamAbsoluteUrl(
  teamId: string,
  tab?: TeamDetailTab,
  opts?: { addMembers?: boolean },
) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${teamPageUrl(teamId, tab, opts)}`
}
