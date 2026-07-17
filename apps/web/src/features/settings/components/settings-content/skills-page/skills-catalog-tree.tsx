'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, MoreVertical, ShieldCheck } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import { formatSkillName } from '@/lib/agents/agent-display'
import type { MissionAgent, MissionAgentSkill } from '@/lib/agents/agent-skill-types'
import { spaceGroupBadgeChipProps } from '@/lib/ui/group-badge-glass'
import { SkillAgentAvatarStack } from './skill-agent-avatar-stack'
import { SkillAgentAvatar } from './skill-menu/skill-agent-avatar'
import { buildSkillsCatalogSections } from './skills-catalog-sections'
import type { SkillsGroupBy, SkillsGroupSort } from './skills-page.types'
import { formatSkillListDescription, isOfficialSkill } from './skills-page.utils'

function sortAgentKeys(keys: string[], agents: MissionAgent[]): string[] {
  const order = new Map(agents.map((agent, index) => [agent.agent_key, index]))
  return [...keys].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999))
}

function resolveAgentsForKeys(
  agentKeys: string[],
  agents: MissionAgent[],
  agentsByKey: Map<string, MissionAgent>,
): MissionAgent[] {
  return sortAgentKeys(agentKeys, agents)
    .map((key) => agentsByKey.get(key))
    .filter((agent): agent is MissionAgent => !!agent)
}

type SkillListEntry = {
  key: string
  representative: MissionAgentSkill
  skills: MissionAgentSkill[]
  agentKeys: string[]
}

function groupSkillsForAllView(
  skills: MissionAgentSkill[],
  agents: MissionAgent[],
): SkillListEntry[] {
  const map = new Map<string, MissionAgentSkill[]>()
  for (const skill of skills) {
    const groupKey = skill.skill_key
    const existing = map.get(groupKey) ?? []
    existing.push(skill)
    map.set(groupKey, existing)
  }
  return [...map.entries()].map(([key, groupSkills]) => {
    const agentKeys = sortAgentKeys([...new Set(groupSkills.map((s) => s.agent_key))], agents)
    return {
      key,
      representative: groupSkills[0]!,
      skills: groupSkills,
      agentKeys,
    }
  })
}

type SkillEnabledState = 'on' | 'off' | 'mixed'

function resolveSkillEnabledState(skills: MissionAgentSkill[]): {
  state: SkillEnabledState
  showSwitch: boolean
} {
  const custom = skills.filter((s) => !isOfficialSkill(s))
  if (custom.length === 0) return { state: 'off', showSwitch: false }
  const enabledCount = custom.filter((s) => s.is_enabled).length
  if (enabledCount === custom.length) return { state: 'on', showSwitch: true }
  if (enabledCount === 0) return { state: 'off', showSwitch: true }
  return { state: 'mixed', showSwitch: false }
}

function buildSectionEntries(
  sectionSkills: MissionAgentSkill[],
  skillsViewKey: 'all' | string,
  agents: MissionAgent[],
): SkillListEntry[] {
  if (skillsViewKey === 'all') return groupSkillsForAllView(sectionSkills, agents)
  return sectionSkills.map((skill) => ({
    key: skill.id,
    representative: skill,
    skills: [skill],
    agentKeys: [skill.agent_key],
  }))
}

function SkillsCatalogSectionHeader({
  label,
  agent,
  color,
  count,
  expanded,
  onToggle,
}: {
  label: string
  agent?: MissionAgent
  color?: string
  count: number
  expanded: boolean
  onToggle: () => void
}) {
  const groupChip = spaceGroupBadgeChipProps(color)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="rounded-spacing-2 px-spacing-2 pb-spacing-1 pt-spacing-2 gap-spacing-2 flex w-full min-w-0 items-center text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
    >
      <ChevronRight
        className={`icon-xs text-muted-foreground shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
      />
      {agent ? (
        <>
          <SkillAgentAvatar agent={agent} className="h-4 w-4 shrink-0" />
          <span className="body-3 min-w-0 truncate font-medium">{label}</span>
        </>
      ) : (
        <span
          className={`rounded-spacing-2 inline-flex shrink-0 items-center px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider ${groupChip.chipClassName}`}
          style={groupChip.style}
        >
          {label}
        </span>
      )}
      <span className="body-4 text-muted-foreground shrink-0 tabular-nums">{count}</span>
    </button>
  )
}

function SkillCatalogRow({
  skill,
  entrySkills,
  description,
  selected,
  showAgentStack,
  stackAgents,
  allAgents,
  toggleBusyId,
  onSkillsChanged,
  onSelectSkill,
  canViewOfficialSkillContent,
  onToggleEnabled,
  onOpenSkillMenu,
}: {
  skill: MissionAgentSkill
  entrySkills: MissionAgentSkill[]
  description: string
  selected: boolean
  showAgentStack: boolean
  stackAgents: MissionAgent[]
  allAgents: MissionAgent[]
  toggleBusyId: string | null
  onSkillsChanged: () => void
  onSelectSkill: (skill: MissionAgentSkill) => void
  canViewOfficialSkillContent: boolean
  onToggleEnabled: (skill: MissionAgentSkill, enabled: boolean) => void | Promise<void>
  onOpenSkillMenu: (skill: MissionAgentSkill, position: { x: number; y: number }) => void
}) {
  const official = isOfficialSkill(skill)
  const canOpen = !official || canViewOfficialSkillContent
  const { state: enabledState, showSwitch } = resolveSkillEnabledState(entrySkills)
  const busy = entrySkills.some((s) => toggleBusyId === s.id)
  const muted = !official && enabledState === 'off'

  const openMenuFromEvent = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onOpenSkillMenu(skill, { x: e.clientX, y: e.clientY })
  }

  const openMenuFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    onOpenSkillMenu(skill, { x: rect.right, y: rect.bottom })
  }

  const handleToggleEnabled = (enabled: boolean) => {
    void (async () => {
      for (const entrySkill of entrySkills) {
        if (isOfficialSkill(entrySkill)) continue
        if (entrySkill.is_enabled === enabled) continue
        await onToggleEnabled(entrySkill, enabled)
      }
    })()
  }

  const nameBlock = (
    <>
      <span className="body-3 gap-spacing-1 flex min-w-0 items-center font-medium">
        <span className="truncate">{formatSkillName(skill.name)}</span>
        {official ? <ShieldCheck className="icon-xs text-muted-foreground shrink-0" /> : null}
      </span>
      {description ? (
        <span className="body-4 text-muted-foreground mt-spacing-0.5 line-clamp-1 block">
          {description}
        </span>
      ) : null}
    </>
  )

  return (
    <div
      className={`group/skill rounded-spacing-2 px-spacing-2 py-spacing-2 gap-spacing-2 flex min-w-0 items-center overflow-hidden ${
        selected ? 'chip-glass-blue' : canOpen ? 'hover:bg-hover-subtle' : 'opacity-80'
      }`}
      onContextMenu={official ? undefined : openMenuFromEvent}
    >
      {!canOpen ? (
        <div className="min-w-0 flex-1">{nameBlock}</div>
      ) : (
        <button
          type="button"
          onClick={() => onSelectSkill(skill)}
          className={`min-w-0 flex-1 text-left ${muted ? 'opacity-60' : ''}`}
        >
          {nameBlock}
        </button>
      )}

      <div
        className="gap-spacing-4 flex shrink-0 items-center"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {showAgentStack ? (
          <div className="w-spacing-20 flex shrink-0 items-center justify-center">
            <SkillAgentAvatarStack
              skill={skill}
              agentsWithSkill={stackAgents}
              allAgents={allAgents}
              onSkillsChanged={onSkillsChanged}
            />
          </div>
        ) : null}

        <div className="flex h-5 w-9 shrink-0 items-center justify-center">
          {showSwitch ? (
            <Switch
              checked={enabledState === 'on'}
              disabled={busy}
              onCheckedChange={(v) => handleToggleEnabled(v)}
            />
          ) : null}
        </div>

        {!official ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={openMenuFromButton}
            className="btn-icon-bare !h-[18px] !w-[18px] shrink-0 opacity-100 md:opacity-0 md:group-hover/skill:opacity-100"
            aria-label="Skill options"
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function SkillsCatalogTree({
  skills,
  skillsViewKey,
  skillsGroupBy,
  skillsGroupSort,
  agents,
  detailSkillId,
  detailResourceId,
  toggleBusyId,
  onSkillsChanged,
  onSelectSkill,
  canViewOfficialSkillContent,
  onToggleEnabled,
  onOpenSkillMenu,
  catalogFolders,
  skillKeyToFolderId,
}: {
  skills: MissionAgentSkill[]
  skillsViewKey: 'all' | string
  skillsGroupBy: SkillsGroupBy
  skillsGroupSort: SkillsGroupSort
  agents: MissionAgent[]
  detailSkillId: string | null
  detailResourceId: string | null
  toggleBusyId: string | null
  onSkillsChanged: () => void
  onSelectSkill: (skill: MissionAgentSkill) => void
  canViewOfficialSkillContent: boolean
  onToggleEnabled: (skill: MissionAgentSkill, enabled: boolean) => void | Promise<void>
  onOpenSkillMenu: (skill: MissionAgentSkill, position: { x: number; y: number }) => void
  catalogFolders?: Array<{ id: string; name: string }>
  skillKeyToFolderId?: Record<string, string>
}) {
  const agentsByKey = useMemo(
    () => new Map(agents.map((agent) => [agent.agent_key, agent])),
    [agents],
  )

  const sections = useMemo(
    () =>
      buildSkillsCatalogSections(
        skills,
        skillsGroupBy,
        skillsViewKey,
        agents,
        skillsGroupSort,
        catalogFolders && skillKeyToFolderId
          ? { folders: catalogFolders, skillKeyToFolderId }
          : undefined,
      ),
    [skills, skillsGroupBy, skillsGroupSort, skillsViewKey, agents, catalogFolders, skillKeyToFolderId],
  )

  const showAgentStack = skillsViewKey === 'all' && skillsGroupBy !== 'agent'
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setCollapsedSectionIds(new Set())
  }, [skillsGroupBy, skillsViewKey])

  const toggleSection = (sectionId: string) => {
    setCollapsedSectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  return (
    <div className="gap-spacing-1 flex min-w-0 flex-col">
      {sections.map((section) => {
        const entries = buildSectionEntries(section.skills, skillsViewKey, agents)
        const sectionAgent = section.agentKey ? agentsByKey.get(section.agentKey) : undefined
        const hasHeader = !!section.label
        const expanded = !collapsedSectionIds.has(section.id)

        return (
          <div key={section.id}>
            {hasHeader ? (
              <SkillsCatalogSectionHeader
                label={section.label}
                agent={sectionAgent}
                color={section.color}
                count={entries.length}
                expanded={expanded}
                onToggle={() => toggleSection(section.id)}
              />
            ) : null}
            {expanded ? (
              <div className="gap-spacing-1 flex flex-col">
                {entries.map((entry) => {
                  const selected = entry.skills.some(
                    (s) => s.id === detailSkillId && detailResourceId === null,
                  )
                  const description = formatSkillListDescription(entry.representative.description)

                  const stackAgents = resolveAgentsForKeys(entry.agentKeys, agents, agentsByKey)

                  return (
                    <SkillCatalogRow
                      key={entry.key}
                      skill={entry.representative}
                      entrySkills={entry.skills}
                      description={description}
                      selected={selected}
                      showAgentStack={showAgentStack}
                      stackAgents={stackAgents}
                      allAgents={agents}
                      toggleBusyId={toggleBusyId}
                      onSkillsChanged={onSkillsChanged}
                      onSelectSkill={onSelectSkill}
                      canViewOfficialSkillContent={canViewOfficialSkillContent}
                      onToggleEnabled={onToggleEnabled}
                      onOpenSkillMenu={onOpenSkillMenu}
                    />
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
