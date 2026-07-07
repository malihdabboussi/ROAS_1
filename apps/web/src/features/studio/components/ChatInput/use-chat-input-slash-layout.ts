import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { SLASH_SECTION_PREVIEW } from './chat-input-constants'
import type { SlashItem } from './chat-input-slash-menu'

export interface UseChatInputSlashLayoutOptions {
  slashMenuOpen: boolean
  slashItems: SlashItem[]
  slashHighlight: number
  setSlashHighlight: Dispatch<SetStateAction<number>>
}

export function useChatInputSlashLayout({
  slashMenuOpen,
  slashItems,
  setSlashHighlight,
}: UseChatInputSlashLayoutOptions) {
  const [slashSkillsExpanded, setSlashSkillsExpanded] = useState(false)
  const [slashWorkflowsExpanded, setSlashWorkflowsExpanded] = useState(false)

  const slashMenuLayout = useMemo(() => {
    const skillItems = slashItems.filter((i) => i.type === 'skill')
    const workflowItems = slashItems.filter((i) => i.type === 'workflow')
    const skillVisible = slashSkillsExpanded
      ? skillItems
      : skillItems.slice(0, SLASH_SECTION_PREVIEW)
    const workflowVisible = slashWorkflowsExpanded
      ? workflowItems
      : workflowItems.slice(0, SLASH_SECTION_PREVIEW)
    return {
      skillItems,
      workflowItems,
      skillVisible,
      workflowVisible,
      visibleFlat: [...skillVisible, ...workflowVisible] as SlashItem[],
      skillMoreCount: Math.max(0, skillItems.length - SLASH_SECTION_PREVIEW),
      workflowMoreCount: Math.max(0, workflowItems.length - SLASH_SECTION_PREVIEW),
      showSkillMore: !slashSkillsExpanded && skillItems.length > SLASH_SECTION_PREVIEW,
      showWorkflowMore: !slashWorkflowsExpanded && workflowItems.length > SLASH_SECTION_PREVIEW,
    }
  }, [slashItems, slashSkillsExpanded, slashWorkflowsExpanded])

  useEffect(() => {
    setSlashSkillsExpanded(false)
    setSlashWorkflowsExpanded(false)
  }, [slashItems])

  useEffect(() => {
    if (!slashMenuOpen) return
    const n = slashMenuLayout.visibleFlat.length
    if (n === 0) {
      setSlashHighlight(0)
      return
    }
    setSlashHighlight((h) => Math.min(h, n - 1))
  }, [
    slashMenuOpen,
    slashMenuLayout.visibleFlat.length,
    slashSkillsExpanded,
    slashWorkflowsExpanded,
    setSlashHighlight,
  ])

  return {
    slashSkillsExpanded,
    slashWorkflowsExpanded,
    setSlashSkillsExpanded,
    setSlashWorkflowsExpanded,
    slashMenuLayout,
  }
}
