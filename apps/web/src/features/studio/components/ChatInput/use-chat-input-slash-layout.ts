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

  const [slashPlaybooksExpanded, setSlashPlaybooksExpanded] = useState(false)

  const slashMenuLayout = useMemo(() => {
    const playbookItems = slashItems.filter((i) => i.type === 'playbook')
    const skillItems = slashItems.filter((i) => i.type === 'skill')
    const workflowItems = slashItems.filter((i) => i.type === 'workflow')
    const playbookVisible = slashPlaybooksExpanded
      ? playbookItems
      : playbookItems.slice(0, SLASH_SECTION_PREVIEW)
    const skillVisible = slashSkillsExpanded
      ? skillItems
      : skillItems.slice(0, SLASH_SECTION_PREVIEW)
    const workflowVisible = slashWorkflowsExpanded
      ? workflowItems
      : workflowItems.slice(0, SLASH_SECTION_PREVIEW)
    return {
      playbookItems,
      skillItems,
      workflowItems,
      playbookVisible,
      skillVisible,
      workflowVisible,
      visibleFlat: [...playbookVisible, ...skillVisible, ...workflowVisible] as SlashItem[],
      playbookMoreCount: Math.max(0, playbookItems.length - SLASH_SECTION_PREVIEW),
      skillMoreCount: Math.max(0, skillItems.length - SLASH_SECTION_PREVIEW),
      workflowMoreCount: Math.max(0, workflowItems.length - SLASH_SECTION_PREVIEW),
      showPlaybookMore: !slashPlaybooksExpanded && playbookItems.length > SLASH_SECTION_PREVIEW,
      showSkillMore: !slashSkillsExpanded && skillItems.length > SLASH_SECTION_PREVIEW,
      showWorkflowMore: !slashWorkflowsExpanded && workflowItems.length > SLASH_SECTION_PREVIEW,
    }
  }, [slashItems, slashPlaybooksExpanded, slashSkillsExpanded, slashWorkflowsExpanded])

  useEffect(() => {
    setSlashPlaybooksExpanded(false)
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
    slashPlaybooksExpanded,
    slashSkillsExpanded,
    slashWorkflowsExpanded,
    setSlashHighlight,
  ])

  return {
    slashPlaybooksExpanded,
    slashSkillsExpanded,
    slashWorkflowsExpanded,
    setSlashPlaybooksExpanded,
    setSlashSkillsExpanded,
    setSlashWorkflowsExpanded,
    slashMenuLayout,
  }
}
