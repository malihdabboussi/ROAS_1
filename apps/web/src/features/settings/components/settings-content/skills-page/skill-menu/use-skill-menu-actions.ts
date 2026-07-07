'use client'

import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  deleteAgentSkill,
  updateAgentSkill,
} from '@/features/mission-control/services/missions.service'
import type { MissionAgentSkill } from '@/features/mission-control/types'
import { formatSkillName } from '@/features/team/constants/team.constants'
import { isSkillWriteLockedAgent } from '@/lib/agents/system-agent-contracts'
import { downloadJSON, downloadMarkdown } from '../skills-export-utils'
import { buildSkillMarkdown, isOfficialSkill, safeSkillFilename } from '../skills-page.utils'
import {
  copySkillToAgent,
  createSkillClone,
  ensureFullSkill,
  uniqueSkillKey,
} from './skill-copy.util'
import type { SkillMenuActionsContext } from './skill-menu.types'

async function copyToClipboard(value: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`)
  }
}

export function useSkillMenuActions({
  skill,
  agents,
  onSelectSkill,
  onToggleEnabled,
  onSkillsChanged,
  onRequestDelete,
}: SkillMenuActionsContext & { skill: MissionAgentSkill }) {
  const official = isOfficialSkill(skill)
  const sourceAgentKey = skill.agent_key

  const writableTargetAgents = useMemo(
    () =>
      agents.filter((a) => a.agent_key !== sourceAgentKey && !isSkillWriteLockedAgent(a.agent_key)),
    [agents, sourceAgentKey],
  )

  const canWrite = !official && !isSkillWriteLockedAgent(sourceAgentKey)
  const canTransfer = canWrite && writableTargetAgents.length > 0

  const copyKey = useCallback(async () => {
    await copyToClipboard(skill.skill_key, 'Skill key')
  }, [skill.skill_key])

  const copyId = useCallback(async () => {
    await copyToClipboard(skill.id, 'Skill ID')
  }, [skill.id])

  const openSkill = useCallback(() => {
    onSelectSkill(skill)
  }, [onSelectSkill, skill])

  const rename = useCallback(async () => {
    if (!canWrite) return
    const next = window.prompt('Rename skill', formatSkillName(skill.name))?.trim()
    if (!next || next === skill.name) return
    try {
      await updateAgentSkill(sourceAgentKey, skill.id, { name: next })
      toast.success('Skill renamed')
      onSkillsChanged()
    } catch {
      toast.error('Failed to rename skill')
    }
  }, [canWrite, sourceAgentKey, skill.id, skill.name, onSkillsChanged])

  const duplicate = useCallback(async () => {
    if (!canWrite) return
    try {
      const copyName = `${formatSkillName(skill.name)} (copy)`
      const copyKeyValue = uniqueSkillKey(skill.skill_key, '-copy')
      await createSkillClone(skill, sourceAgentKey, {
        name: copyName,
        skillKey: copyKeyValue,
      })
      toast.success('Skill duplicated')
      onSkillsChanged()
    } catch {
      toast.error('Failed to duplicate skill')
    }
  }, [canWrite, skill, sourceAgentKey, onSkillsChanged])

  const exportMarkdown = useCallback(async () => {
    try {
      const fullSkill = await ensureFullSkill(skill)
      downloadMarkdown(
        buildSkillMarkdown(fullSkill),
        formatSkillName(fullSkill.name),
        safeSkillFilename(fullSkill.skill_key),
      )
    } catch {
      toast.error('Failed to export skill')
    }
  }, [skill])

  const exportJson = useCallback(async () => {
    try {
      const fullSkill = await ensureFullSkill(skill)
      downloadJSON(
        fullSkill,
        formatSkillName(fullSkill.name),
        safeSkillFilename(fullSkill.skill_key),
      )
    } catch {
      toast.error('Failed to export skill')
    }
  }, [skill])

  const copyToAgent = useCallback(
    async (targetAgentKey: string) => {
      if (!canWrite || targetAgentKey === sourceAgentKey) return
      try {
        await copySkillToAgent(skill, targetAgentKey)
        toast.success('Skill copied to agent')
        onSkillsChanged()
      } catch {
        toast.error('Failed to copy skill')
      }
    },
    [canWrite, skill, sourceAgentKey, onSkillsChanged],
  )

  const moveToAgent = useCallback(
    async (targetAgentKey: string) => {
      if (!canWrite || targetAgentKey === sourceAgentKey) return
      try {
        try {
          await createSkillClone(skill, targetAgentKey, {
            name: formatSkillName(skill.name),
            skillKey: skill.skill_key,
          })
        } catch {
          const fallbackKey = uniqueSkillKey(skill.skill_key, '-copy')
          await createSkillClone(skill, targetAgentKey, {
            name: formatSkillName(skill.name),
            skillKey: fallbackKey,
          })
        }
        await deleteAgentSkill(sourceAgentKey, skill.id)
        toast.success('Skill moved to agent')
        onSkillsChanged()
      } catch {
        toast.error('Failed to move skill')
      }
    },
    [canWrite, skill, sourceAgentKey, onSkillsChanged],
  )

  const toggleEnabled = useCallback(
    async (enabled: boolean) => {
      if (official) return
      await onToggleEnabled(skill, enabled)
    },
    [official, onToggleEnabled, skill],
  )

  const requestDelete = useCallback(() => {
    if (!canWrite) return
    onRequestDelete(skill)
  }, [canWrite, onRequestDelete, skill])

  return {
    official,
    canWrite,
    canTransfer,
    writableTargetAgents,
    copyKey,
    copyId,
    openSkill,
    rename,
    duplicate,
    exportMarkdown,
    exportJson,
    copyToAgent,
    moveToAgent,
    toggleEnabled,
    requestDelete,
    isEnabled: skill.is_enabled,
  }
}
