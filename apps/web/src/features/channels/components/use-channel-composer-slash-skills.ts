'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAgentSkillsForAgents } from '@/lib/agents'
import type { ChannelMember } from '@/lib/channels'

export interface SlashSkillEntry {
  id: string
  key: string
  name: string
  description: string
  isEnabled?: boolean
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value)),
  ].sort()
}

export function extractSkillKeysFromText(text: string, knownSkillKeys: Set<string>): string[] {
  if (knownSkillKeys.size === 0) return []
  const matches = text.match(/(?:^|\s)\/([\w][\w-]*)/g)
  if (!matches) return []
  return [
    ...new Set(
      matches
        .map((match) => match.trim().slice(1))
        .filter((key) => knownSkillKeys.has(key)),
    ),
  ]
}

export function useChannelComposerSlashSkills({
  skillAgentKeys,
  commandContextKind,
  members,
}: {
  skillAgentKeys?: string[]
  commandContextKind?: 'task'
  members: ChannelMember[]
}) {
  const enabledSkillAgentKeys = useMemo(() => {
    const scoped = skillAgentKeys ? uniqueNonEmpty(skillAgentKeys) : []
    if (scoped.length > 0) return scoped
    if (commandContextKind !== 'task') return []
    return uniqueNonEmpty(members.map((member) => member.agent_key))
  }, [skillAgentKeys, commandContextKind, members])
  const [slashSkillItems, setSlashSkillItems] = useState<SlashSkillEntry[]>([])

  useEffect(() => {
    let cancelled = false
    if (enabledSkillAgentKeys.length === 0) {
      setSlashSkillItems([])
      return
    }
    fetchAgentSkillsForAgents(enabledSkillAgentKeys, { summary: true })
      .then((skills) => {
        if (cancelled) return
        const byKey = new Map<string, SlashSkillEntry>()
        for (const skill of skills) {
          if (skill.is_enabled === false) continue
          const key = skill.skill_key?.trim()
          if (!key || byKey.has(key)) continue
          byKey.set(key, {
            id: `skill-${key}`,
            key,
            name: skill.name || key,
            description: skill.description || '',
            isEnabled: skill.is_enabled,
          })
        }
        setSlashSkillItems([...byKey.values()].sort((a, b) => a.key.localeCompare(b.key)))
      })
      .catch(() => {
        if (!cancelled) setSlashSkillItems([])
      })
    return () => {
      cancelled = true
    }
  }, [enabledSkillAgentKeys])

  return { slashSkillItems }
}
