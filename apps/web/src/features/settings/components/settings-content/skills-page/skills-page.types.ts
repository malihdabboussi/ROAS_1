import type { MissionAgentSkill } from '@/lib/agents/agent-skill-types'

export interface DraftResource {
  id: string
  file_path: string
  content: string | null
  content_type: string | null
  file: File | null
}

export interface ResourceTreeNode {
  name: string
  path: string
  resourceId?: string
  children: ResourceTreeNode[]
}

export type SkillTypeFilter = 'custom' | 'official'

export const DEFAULT_SKILL_TYPE_FILTERS: SkillTypeFilter[] = ['custom', 'official']

export type SkillsGroupBy = 'none' | 'agent' | 'status' | 'type' | 'alphabetical' | 'folder'

export const DEFAULT_SKILLS_GROUP_BY: SkillsGroupBy = 'none'

export type SkillsGroupSort = 'asc' | 'desc'

export const DEFAULT_SKILLS_GROUP_SORT: SkillsGroupSort = 'asc'

export type SkillsCatalogSection = {
  id: string
  label: string
  /** Preset id for `spaceGroupBadgeChipProps` — matches Spaces group-by chips. */
  color?: string
  agentKey?: string
  skills: MissionAgentSkill[]
}
