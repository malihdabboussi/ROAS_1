'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTeams, type AgentMenuContext, type MissionAgent } from '@/lib/agents'
import type { ChatModelSettings } from '@/lib/chat/chat-model-settings'
import { fetchLlmModels, type LlmModelOption } from '@/lib/chat/llm-models-api'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { useTeam2Perms } from '../hooks/use-team2-perms'
import { useTeamFocusStore, type TeamAgentsPageContext } from '../store/use-team-focus-store'
import { AgentGridCard } from './AgentGridCard'
import { AgentsGroupSectionHeader } from './AgentsGroupSectionHeader'
import { AgentsListView } from './AgentsListView'
import {
  agentMatchesModels,
  agentMatchesSearch,
  agentMatchesStatus,
  agentToSummary,
  groupAgents,
  MAX_VISIBLE_AGENTS_IN_HR_CONTEXT,
  sortAgents,
} from './agents-grid-utils'
import {
  Team2Toolbar,
  type Team2GroupBy,
  type Team2GroupSort,
  type Team2Sort,
  type Team2StatusFilter,
  type Team2ViewMode,
} from './Team2Toolbar'

interface AgentsGridProps {
  agents: MissionAgent[]
  teamFilterId?: string | null
  onOpenAgent: (agentKey: string) => void
  onOpenAgentChat: (agentKey: string) => void
  getAgentMenuContext: (agent: MissionAgent) => AgentMenuContext
  onRenameAgent: (agentKey: string, name: string) => void | Promise<void>
  onChangeAgentModel: (
    agentKey: string,
    modelId: string,
    modelSettings: ChatModelSettings | null,
  ) => void | Promise<void>
  onOpenAgentLibrary: () => void
  onStartAgentFromScratch: () => void
  selectedAgentKey: string | null
  assignedCampaignIdsForSelected: string[] | undefined
  hasBrainForSelected: boolean
  focusByAgentKey?: Record<string, string>
  onAssignWork?: (agent: MissionAgent) => void
}

export function AgentsGrid({
  agents,
  teamFilterId = null,
  onOpenAgent,
  onOpenAgentChat,
  getAgentMenuContext,
  onRenameAgent,
  onChangeAgentModel,
  onOpenAgentLibrary,
  onStartAgentFromScratch,
  selectedAgentKey,
  assignedCampaignIdsForSelected,
  hasBrainForSelected,
  focusByAgentKey = {},
  onAssignWork,
}: AgentsGridProps) {
  const [view, setView] = useState<Team2ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [statusFilters, setStatusFilters] = useState<Team2StatusFilter[]>([])
  const [modelFilters, setModelFilters] = useState<string[]>([])
  const [sort, setSort] = useState<Team2Sort>('recent')
  const [groupBy, setGroupBy] = useState<Team2GroupBy>('none')
  const [groupSort, setGroupSort] = useState<Team2GroupSort>('asc')
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(() => new Set())
  const [modelOptions, setModelOptions] = useState<LlmModelOption[]>([])
  const { teams } = useTeams()
  const perms = useTeam2Perms()
  const setAgentsContext = useTeamFocusStore((s) => s.setAgentsContext)
  const teamLookup = useMemo(() => {
    const m = new Map<string, { name: string; color: string; icon: string }>()
    for (const t of teams) m.set(t.id, { name: t.name, color: t.color, icon: t.icon || 'users' })
    return m
  }, [teams])

  useEffect(() => {
    let cancelled = false
    cachedFetch('llm-models', fetchLlmModels, { ttlMs: 300_000 })
      .then((rows) => {
        if (!cancelled) setModelOptions(rows)
      })
      .catch(() => {
        if (!cancelled) setModelOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setCollapsedGroupKeys(new Set())
  }, [groupBy, groupSort, teamFilterId])

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }, [])

  const scopedAgents = useMemo(() => {
    if (!teamFilterId) return agents
    return agents.filter((agent) => agent.team_id === teamFilterId)
  }, [agents, teamFilterId])

  const visibleAgents = useMemo(() => {
    const filtered = scopedAgents.filter(
      (a) =>
        agentMatchesStatus(a, statusFilters) &&
        agentMatchesModels(a, modelFilters) &&
        agentMatchesSearch(a, search),
    )
    return sortAgents(filtered, sort)
  }, [scopedAgents, statusFilters, modelFilters, search, sort])

  const groups = useMemo(
    () => groupAgents(visibleAgents, groupBy, groupSort, modelOptions, teamLookup),
    [visibleAgents, groupBy, groupSort, modelOptions, teamLookup],
  )

  const agentsContext = useMemo<TeamAgentsPageContext>(
    () => ({
      panel: 'agent-list',
      view,
      searchQuery: search.trim(),
      statusFilters,
      modelFilters,
      sort,
      groupBy,
      totalAgentCount: scopedAgents.length,
      visibleAgentCount: visibleAgents.length,
      visibleAgents: visibleAgents
        .slice(0, MAX_VISIBLE_AGENTS_IN_HR_CONTEXT)
        .map((agent) =>
          agentToSummary(
            agent,
            modelOptions,
            teamLookup,
            perms.canEditAgent(agent) || perms.canManageSystemPreferences(agent),
          ),
        ),
      visibleAgentsTruncated: visibleAgents.length > MAX_VISIBLE_AGENTS_IN_HR_CONTEXT,
      visibleGroups:
        groups?.map((group) => ({
          key: group.key,
          label: group.label,
          count: group.items.length,
        })) ?? [],
      selectedAgentKey,
      selectedAgent: null,
      modalState: {
        readyEmployeesOpen: false,
        fireConfirmOpen: false,
        telegramSetupOpen: false,
        slackSetupOpen: false,
        upgradeOpen: false,
      },
    }),
    [
      agents.length,
      scopedAgents.length,
      groupBy,
      groups,
      modelFilters,
      modelOptions,
      perms,
      search,
      selectedAgentKey,
      sort,
      statusFilters,
      teamLookup,
      view,
      visibleAgents,
    ],
  )

  useEffect(() => {
    setAgentsContext(agentsContext)
    return () => setAgentsContext(null)
  }, [agentsContext, setAgentsContext])

  const toggleStatus = (id: Team2StatusFilter) =>
    setStatusFilters((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))

  const toggleModel = (id: string) =>
    setModelFilters((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))

  const renderCard = (agent: MissionAgent) => {
    const isSelected = selectedAgentKey !== null && agent.agent_key === selectedAgentKey
    const ctx = getAgentMenuContext(agent)
    return (
      <AgentGridCard
        key={agent.id}
        agent={agent}
        onOpen={() => onOpenAgent(agent.agent_key)}
        onOpenChat={() => onOpenAgentChat(agent.agent_key)}
        onRenameSubmit={(agentKey, name) => onRenameAgent(agentKey, name)}
        menuActions={ctx.menuActions}
        nonGeneralCampaigns={ctx.nonGeneralCampaigns}
        teams={ctx.teams}
        onSelectTeam={(teamId) => ctx.onSelectTeam(agent.agent_key, teamId)}
        assignedCampaignIds={isSelected ? assignedCampaignIdsForSelected : undefined}
        showAccess={ctx.showAccess}
        hasBrain={isSelected ? hasBrainForSelected : ctx.hasBrain}
        fireLabel={ctx.fireLabel}
        canRename={ctx.canRename}
        canDeactivate={ctx.canDeactivate}
        canMoveTeam={ctx.canMoveTeam}
        canFireAgent={ctx.canFireAgent}
        canManageCampaigns={ctx.canManageCampaigns}
        isFavorite={ctx.isFavorite}
        onToggleFavorite={ctx.onToggleFavorite}
        canFavorite={ctx.canFavorite}
        focusLabel={focusByAgentKey[agent.agent_key] ?? null}
        onAssignWork={onAssignWork ? () => onAssignWork(agent) : undefined}
      />
    )
  }

  return (
    <div className="gap-spacing-3 flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <Team2Toolbar
        agents={scopedAgents}
        modelOptions={modelOptions}
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        statusFilters={statusFilters}
        onToggleStatus={toggleStatus}
        modelFilters={modelFilters}
        onToggleModel={toggleModel}
        sort={sort}
        onSortChange={setSort}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupSort={groupSort}
        onGroupSortChange={setGroupSort}
        onOpenAgentLibrary={onOpenAgentLibrary}
        onStartAgentFromScratch={onStartAgentFromScratch}
        canHire={perms.canHire}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        {visibleAgents.length === 0 ? (
          <div className="body-3 text-muted-foreground p-spacing-6 text-center">
            No agents match the current filters.
          </div>
        ) : view === 'grid' ? (
          groups ? (
            <div className="gap-spacing-1 flex flex-col">
              {groups.map((group) => {
                const expanded = !collapsedGroupKeys.has(group.key)
                return (
                  <section key={group.key} className="flex flex-col">
                    <AgentsGroupSectionHeader
                      group={group}
                      expanded={expanded}
                      onToggle={() => toggleGroup(group.key)}
                    />
                    {expanded ? (
                      <div className="gap-spacing-3 pt-spacing-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                        {group.items.map(renderCard)}
                      </div>
                    ) : null}
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="gap-spacing-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {visibleAgents.map(renderCard)}
            </div>
          )
        ) : (
          <AgentsListView
            agents={visibleAgents}
            groups={groups}
            collapsedGroupKeys={collapsedGroupKeys}
            onToggleGroup={toggleGroup}
            modelOptions={modelOptions}
            onOpen={(agentKey) => onOpenAgent(agentKey)}
            onRenameAgent={onRenameAgent}
            onModelChange={onChangeAgentModel}
            canChangeModel={(agent) =>
              perms.canEditAgent(agent) || perms.canManageSystemPreferences(agent)
            }
            getAgentMenuContext={getAgentMenuContext}
            selectedAgentKey={selectedAgentKey}
            assignedCampaignIdsForSelected={assignedCampaignIdsForSelected}
            hasBrainForSelected={hasBrainForSelected}
          />
        )}
      </div>
    </div>
  )
}
