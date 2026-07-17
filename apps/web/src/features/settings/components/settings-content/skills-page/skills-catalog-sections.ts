import type { MissionAgent, MissionAgentSkill } from '@/features/mission-control/types'
import { formatSkillName } from '@/features/team/constants/team.constants'
import type { SkillsCatalogSection, SkillsGroupBy, SkillsGroupSort } from './skills-page.types'
import { isOfficialSkill } from './skills-page.utils'

function skillsSectionColor(sectionId: string, groupBy: SkillsGroupBy): string {
  if (groupBy === 'status') {
    if (sectionId === 'enabled') return 'emerald'
    if (sectionId === 'disabled') return 'slate'
  }
  if (groupBy === 'type') {
    if (sectionId === 'official') return 'blue'
    if (sectionId === 'custom') return 'violet'
  }
  if (groupBy === 'alphabetical') return sectionId === '#' ? 'muted' : 'slate'
  return 'muted'
}

function alphaBucket(name: string): string {
  const letter = formatSkillName(name).trim().charAt(0).toUpperCase()
  return /^[A-Z]$/.test(letter) ? letter : '#'
}

export function skillsGroupByLabel(
  groupBy: SkillsGroupBy,
  _skillsViewKey: 'all' | string,
): string | null {
  if (groupBy === 'none') return null
  if (groupBy === 'folder') return 'Folder'
  if (groupBy === 'agent') return 'Agent'
  if (groupBy === 'status') return 'Status'
  if (groupBy === 'type') return 'Type'
  if (groupBy === 'alphabetical') return 'A–Z'
  return null
}

export function skillsGroupByOptions(skillsViewKey: 'all' | string): {
  id: SkillsGroupBy
  label: string
}[] {
  const base = [
    { id: 'none' as const, label: 'None' },
    { id: 'folder' as const, label: 'Folder' },
    ...(skillsViewKey === 'all' ? [{ id: 'agent' as const, label: 'Agent' }] : []),
    { id: 'status' as const, label: 'Status' },
    { id: 'type' as const, label: 'Type' },
    { id: 'alphabetical' as const, label: 'A–Z' },
  ]
  return base
}

function applyGroupSectionSort(
  sections: SkillsCatalogSection[],
  groupBy: SkillsGroupBy,
  groupSort: SkillsGroupSort,
): SkillsCatalogSection[] {
  if (groupSort === 'asc') return sections
  const reversed = [...sections].reverse()
  if (groupBy === 'alphabetical') {
    return reversed.map((section) => ({
      ...section,
      skills: [...section.skills].reverse(),
    }))
  }
  return reversed
}

export function buildSkillsCatalogSections(
  skills: MissionAgentSkill[],
  groupBy: SkillsGroupBy,
  skillsViewKey: 'all' | string,
  agents: MissionAgent[],
  groupSort: SkillsGroupSort = 'asc',
  folderMeta?: {
    folders: Array<{ id: string; name: string }>
    skillKeyToFolderId: Record<string, string>
  },
): SkillsCatalogSection[] {
  if (groupBy === 'none' || skills.length === 0) {
    return [{ id: 'all', label: '', skills }]
  }

  if (groupBy === 'folder') {
    const folders = folderMeta?.folders ?? []
    const map = folderMeta?.skillKeyToFolderId ?? {}
    const byFolder = new Map<string, MissionAgentSkill[]>()
    const unfiled: MissionAgentSkill[] = []
    for (const skill of skills) {
      const folderId = map[skill.skill_key]
      if (!folderId) {
        unfiled.push(skill)
        continue
      }
      const list = byFolder.get(folderId) ?? []
      list.push(skill)
      byFolder.set(folderId, list)
    }
    const sections: SkillsCatalogSection[] = folders
      .filter((folder) => (byFolder.get(folder.id)?.length ?? 0) > 0)
      .map((folder) => ({
        id: folder.id,
        label: folder.name,
        color: 'violet',
        skills: byFolder.get(folder.id) ?? [],
      }))
    if (unfiled.length > 0) {
      sections.push({ id: 'unfiled', label: 'Unfiled', color: 'muted', skills: unfiled })
    }
    return applyGroupSectionSort(sections, groupBy, groupSort)
  }

  if (groupBy === 'agent' && skillsViewKey === 'all') {
    const knownAgentKeys = new Set(agents.map((a) => a.agent_key))
    const byAgent = new Map<string, MissionAgentSkill[]>()
    for (const skill of skills) {
      const agentKey = skill.agent_key
      if (!agentKey || !knownAgentKeys.has(agentKey)) continue
      const list = byAgent.get(agentKey) ?? []
      list.push(skill)
      byAgent.set(agentKey, list)
    }
    const sections = agents
      .filter((agent) => (byAgent.get(agent.agent_key)?.length ?? 0) > 0)
      .map((agent) => ({
        id: agent.agent_key,
        label: agent.name,
        agentKey: agent.agent_key,
        skills: byAgent.get(agent.agent_key) ?? [],
      }))
    return applyGroupSectionSort(sections, groupBy, groupSort)
  }

  if (groupBy === 'status') {
    const enabled = skills.filter((s) => s.is_enabled)
    const disabled = skills.filter((s) => !s.is_enabled)
    const sections: SkillsCatalogSection[] = []
    if (enabled.length) {
      sections.push({
        id: 'enabled',
        label: 'Enabled',
        color: skillsSectionColor('enabled', 'status'),
        skills: enabled,
      })
    }
    if (disabled.length) {
      sections.push({
        id: 'disabled',
        label: 'Disabled',
        color: skillsSectionColor('disabled', 'status'),
        skills: disabled,
      })
    }
    return sections.length
      ? applyGroupSectionSort(sections, groupBy, groupSort)
      : [{ id: 'all', label: '', skills }]
  }

  if (groupBy === 'type') {
    const official = skills.filter((s) => isOfficialSkill(s))
    const custom = skills.filter((s) => !isOfficialSkill(s))
    const sections: SkillsCatalogSection[] = []
    if (official.length) {
      sections.push({
        id: 'official',
        label: 'Official',
        color: skillsSectionColor('official', 'type'),
        skills: official,
      })
    }
    if (custom.length) {
      sections.push({
        id: 'custom',
        label: 'Custom',
        color: skillsSectionColor('custom', 'type'),
        skills: custom,
      })
    }
    return sections.length
      ? applyGroupSectionSort(sections, groupBy, groupSort)
      : [{ id: 'all', label: '', skills }]
  }

  if (groupBy === 'alphabetical') {
    const buckets = new Map<string, MissionAgentSkill[]>()
    for (const skill of skills) {
      const key = alphaBucket(skill.name)
      const list = buckets.get(key) ?? []
      list.push(skill)
      buckets.set(key, list)
    }
    const letters = [...buckets.keys()].sort((a, b) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
    const sections = letters.map((letter) => ({
      id: letter,
      label: letter,
      color: skillsSectionColor(letter, 'alphabetical'),
      skills: (buckets.get(letter) ?? []).sort((a, b) =>
        formatSkillName(a.name).localeCompare(formatSkillName(b.name)),
      ),
    }))
    return applyGroupSectionSort(sections, groupBy, groupSort)
  }

  return [{ id: 'all', label: '', skills }]
}
