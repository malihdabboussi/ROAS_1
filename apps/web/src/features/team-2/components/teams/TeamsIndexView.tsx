'use client'

import { useCallback, useMemo, useState } from 'react'
import { IconPicker, type IconColorId } from '@/components/ui/IconPicker'
import {
  useCachedMissionAgents,
  useTeam2Perms,
  useTeams,
  type AgentTeam,
  type MissionAgentSidebar,
} from '@/lib/agents'
import { AgentsGroupSectionHeader } from '../AgentsGroupSectionHeader'
import { TeamIndexCard, TeamListRow, TeamsListHeader } from './TeamsIndexItems'
import { groupTeams, sortTeams, teamMatchesSearch } from './teams-index.utils'
import {
  TeamsToolbar,
  type TeamsGroupBy,
  type TeamsGroupSort,
  type TeamsViewMode,
} from './TeamsToolbar'

function buildAgentsByTeamId(agents: MissionAgentSidebar[]): Map<string, MissionAgentSidebar[]> {
  const map = new Map<string, MissionAgentSidebar[]>()
  for (const agent of agents) {
    if (!agent.team_id) continue
    const list = map.get(agent.team_id) ?? []
    list.push(agent)
    map.set(agent.team_id, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
  }
  return map
}

export function TeamsIndexView({
  embedded = false,
  onSelectTeam,
}: {
  embedded?: boolean
  onSelectTeam?: (teamId: string) => void
}) {
  const { teams, loading, error, create } = useTeams()
  const { data: agents = [] } = useCachedMissionAgents()
  const perms = useTeam2Perms()
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftIcon, setDraftIcon] = useState('users')
  const [draftColor, setDraftColor] = useState<IconColorId>('default')
  const [view, setView] = useState<TeamsViewMode>('grid')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [groupBy, setGroupBy] = useState<TeamsGroupBy>('none')
  const [groupSort, setGroupSort] = useState<TeamsGroupSort>('asc')
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(() => new Set())

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }, [])

  const agentsByTeamId = useMemo(() => buildAgentsByTeamId(agents), [agents])

  const visibleTeams = useMemo(
    () => sortTeams(teams.filter((team) => teamMatchesSearch(team, search))),
    [search, teams],
  )

  const groups = useMemo(
    () => groupTeams(visibleTeams, groupBy, groupSort),
    [groupBy, groupSort, visibleTeams],
  )

  const submit = async () => {
    const name = draft.trim()
    if (!name) {
      setCreating(false)
      return
    }
    const created = await create({ name, icon: draftIcon, color: draftColor })
    setDraft('')
    setDraftIcon('users')
    setDraftColor('default')
    setCreating(false)
    if (embedded && onSelectTeam) onSelectTeam(created.id)
  }

  const renderGridTeam = (team: AgentTeam) => (
    <TeamIndexCard
      key={team.id}
      team={team}
      teamAgents={agentsByTeamId.get(team.id) ?? []}
      embedded={embedded}
      onSelectTeam={onSelectTeam}
    />
  )

  const renderListTeam = (team: AgentTeam) => (
    <TeamListRow
      key={team.id}
      team={team}
      teamAgents={agentsByTeamId.get(team.id) ?? []}
      embedded={embedded}
      onSelectTeam={onSelectTeam}
    />
  )

  const renderGroupHeaders = (sticky = false) =>
    groups?.map((group) => {
      const expanded = !collapsedGroupKeys.has(group.key)
      return (
        <div key={group.key}>
          <AgentsGroupSectionHeader
            group={{
              key: group.key,
              label: group.label,
              color: group.color,
              icon: group.icon,
              items: [],
            }}
            itemCount={group.teams.length}
            expanded={expanded}
            onToggle={() => toggleGroup(group.key)}
            sticky={sticky}
          />
          {expanded ? group.teams.map(renderListTeam) : null}
        </div>
      )
    })

  const gridContent =
    groups && groups.length > 0 ? (
      <div className="gap-spacing-1 flex flex-col">
        {groups.map((group) => {
          const expanded = !collapsedGroupKeys.has(group.key)
          return (
            <section key={group.key}>
              <AgentsGroupSectionHeader
                group={{
                  key: group.key,
                  label: group.label,
                  color: group.color,
                  icon: group.icon,
                  items: [],
                }}
                itemCount={group.teams.length}
                expanded={expanded}
                onToggle={() => toggleGroup(group.key)}
              />
              {expanded ? (
                <div className="gap-spacing-3 pt-spacing-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {group.teams.map(renderGridTeam)}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
    ) : (
      <div className="gap-spacing-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTeams.map(renderGridTeam)}
      </div>
    )

  const listContent =
    groups && groups.length > 0 ? (
      <div className="surface-card border-subtle rounded-spacing-3 overflow-hidden border">
        <TeamsListHeader />
        <div>{renderGroupHeaders(true)}</div>
      </div>
    ) : (
      <div className="surface-card border-subtle rounded-spacing-3 overflow-hidden border">
        <TeamsListHeader />
        <div>{visibleTeams.map(renderListTeam)}</div>
      </div>
    )

  const content = (
    <>
      {embedded ? (
        <div className="px-spacing-3 pt-spacing-3 shrink-0">
          <TeamsToolbar
            view={view}
            onViewChange={setView}
            search={search}
            onSearchChange={setSearch}
            searchOpen={searchOpen}
            onSearchOpenChange={setSearchOpen}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupSort={groupSort}
            onGroupSortChange={setGroupSort}
            onNewTeam={() => setCreating(true)}
            canCreateTeam={perms.canCreateTeam}
          />
        </div>
      ) : (
        <div className="border-border px-spacing-4 py-spacing-3 flex shrink-0 flex-col gap-3 border-b">
          <TeamsToolbar
            view={view}
            onViewChange={setView}
            search={search}
            onSearchChange={setSearch}
            searchOpen={searchOpen}
            onSearchOpenChange={setSearchOpen}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            groupSort={groupSort}
            onGroupSortChange={setGroupSort}
            onNewTeam={() => setCreating(true)}
            canCreateTeam={perms.canCreateTeam}
          />
        </div>
      )}

      <div className="p-spacing-3 min-h-0 flex-1 overflow-auto">
        {perms.canCreateTeam && creating ? (
          <div className="surface-card border-subtle rounded-spacing-3 mb-spacing-3 p-spacing-3 flex items-center gap-2 border">
            <IconPicker
              value={draftIcon}
              onChange={setDraftIcon}
              color={draftColor}
              onColorChange={(color) => setDraftColor(color as IconColorId)}
              size="md"
            />
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit()
                if (event.key === 'Escape') {
                  setDraft('')
                  setDraftIcon('users')
                  setDraftColor('default')
                  setCreating(false)
                }
              }}
              placeholder="Team name (e.g. Marketing)"
              className="body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => void submit()}
              className="badge-glass badge-glass-green rounded-spacing-2 body-3 px-3 py-1 font-semibold"
            >
              Create
            </button>
          </div>
        ) : null}

        {loading ? (
          <p className="body-3 text-muted-foreground p-spacing-6 text-center">Loading teams…</p>
        ) : null}
        {error ? <p className="body-3 text-destructive p-spacing-6 text-center">{error}</p> : null}
        {!loading && !error && visibleTeams.length === 0 ? (
          <div className="surface-card border-subtle rounded-spacing-3 p-spacing-8 border text-center">
            <p className="body-2 text-foreground font-semibold">
              {teams.length === 0 ? 'No teams yet' : 'No teams match your search'}
            </p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {teams.length === 0
                ? perms.canCreateTeam
                  ? 'Create your first team to govern what agents can do.'
                  : 'Ask an admin to create a team.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : null}
        {!loading && visibleTeams.length > 0 ? (view === 'grid' ? gridContent : listContent) : null}
      </div>
    </>
  )

  if (embedded) {
    return (
      <div className="gap-spacing-3 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {content}
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border">
        {content}
      </div>
    </div>
  )
}
