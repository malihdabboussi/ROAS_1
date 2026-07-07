import {
  createAgentSkill,
  createAgentSkillResource,
  fetchAgentSkills,
} from '@/features/mission-control/services/missions.service'
import type { MissionAgentSkill } from '@/features/mission-control/types'
import { formatSkillName } from '@/features/team/constants/team.constants'

/**
 * Summary list rows (from the batched `fields=summary` endpoint) omit
 * `markdown_content` and resource bodies. Resolve the full row before any
 * action that copies or exports skill content, so clones never end up empty.
 */
export async function ensureFullSkill(skill: MissionAgentSkill): Promise<MissionAgentSkill> {
  if (skill.markdown_content !== undefined) return skill
  const fullRows = await fetchAgentSkills(skill.agent_key)
  return fullRows.find((row) => row.id === skill.id) ?? skill
}

async function cloneSkillResources(
  targetAgentKey: string,
  targetSkillKey: string,
  skill: MissionAgentSkill,
): Promise<void> {
  for (const resource of skill.resources ?? []) {
    if (resource.storage_url) {
      await createAgentSkillResource(targetAgentKey, targetSkillKey, {
        file_path: resource.file_path,
        content_type: resource.content_type ?? undefined,
        storage_url: resource.storage_url,
      })
      continue
    }
    await createAgentSkillResource(targetAgentKey, targetSkillKey, {
      file_path: resource.file_path,
      content: resource.content ?? undefined,
      content_type: resource.content_type ?? undefined,
    })
  }
}

export function uniqueSkillKey(base: string, suffix: string): string {
  const trimmed = `${base}${suffix}`.slice(0, 64)
  return trimmed.replace(/-+$/g, '') || 'skill-copy'
}

export async function createSkillClone(
  skill: MissionAgentSkill,
  targetAgentKey: string,
  opts: { name: string; skillKey: string },
): Promise<MissionAgentSkill> {
  const fullSkill = await ensureFullSkill(skill)
  const created = await createAgentSkill(targetAgentKey, {
    skill_key: opts.skillKey,
    name: opts.name,
    description: fullSkill.description,
    markdown_content: fullSkill.markdown_content ?? '',
    is_enabled: fullSkill.is_enabled,
  })
  await cloneSkillResources(targetAgentKey, created.skill_key, fullSkill)
  return created
}

export async function copySkillToAgent(
  skill: MissionAgentSkill,
  targetAgentKey: string,
): Promise<void> {
  try {
    await createSkillClone(skill, targetAgentKey, {
      name: formatSkillName(skill.name),
      skillKey: skill.skill_key,
    })
  } catch {
    await createSkillClone(skill, targetAgentKey, {
      name: formatSkillName(skill.name),
      skillKey: uniqueSkillKey(skill.skill_key, '-copy'),
    })
  }
}
