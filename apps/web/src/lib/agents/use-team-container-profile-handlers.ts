'use client'

import { useCallback } from 'react'
import { generateImageStream } from '@/lib/services/media-api'
import { buildAgentPortraitPrompt } from './agent-portrait-prompt'
import type { TeamContainerHandlersData } from './team-container-handlers.types'
import { renameAgent, updateAgentImage } from './mission-agents-api'

export function useTeamContainerProfileHandlers(data: TeamContainerHandlersData) {
  const handleRename = useCallback(
    async (agentKey: string, newName: string) => {
      await renameAgent(agentKey, newName)
      await data.loadAgents()
    },
    [data],
  )

  const handleNameSave = useCallback(async () => {
    const trimmed = data.nameValue.trim()
    if (data.selected && trimmed && trimmed !== data.selected.name) {
      await handleRename(data.selected.agent_key, trimmed)
    }
    data.setEditingName(false)
  }, [data, handleRename])

  const handleNameClick = useCallback(() => {
    if (data.selected) {
      data.setNameValue(data.selected.name)
      data.setEditingName(true)
    }
  }, [data])

  const handleGeneratePortrait = useCallback(async () => {
    if (!data.selected || data.generatingAvatarIds.has(data.selected.id)) return
    const agentId = data.selected.id
    const role = data.selected.role || 'team member'
    const stylePart = (data.selected.config as Record<string, string>)?.style_description || ''
    const prompt = buildAgentPortraitPrompt(data.selected.name, role, stylePart)
    data.setGeneratingAvatarIds((prev) => new Set(prev).add(agentId))
    try {
      await generateImageStream(
        {
          prompt,
          aspect_ratio: '1:1',
          category: 'agent-avatar',
          tags: ['ai-generated', 'agent-portrait'],
        },
        {
          onComplete: (result) => {
            if (result.url) {
              data.setAgents((prev) =>
                prev.map((a) => (a.id === agentId ? { ...a, image_url: result.url! } : a)),
              )
              void updateAgentImage(data.selected!.agent_key, result.url).catch(() => null)
            }
            data.setGeneratingAvatarIds((prev) => {
              const next = new Set(prev)
              next.delete(agentId)
              return next
            })
          },
          onError: () => {
            data.setGeneratingAvatarIds((prev) => {
              const next = new Set(prev)
              next.delete(agentId)
              return next
            })
          },
        },
      )
    } catch {
      data.setGeneratingAvatarIds((prev) => {
        const next = new Set(prev)
        next.delete(agentId)
        return next
      })
    }
  }, [data])

  return {
    handleRename,
    handleNameSave,
    handleNameClick,
    handleGeneratePortrait,
  }
}
