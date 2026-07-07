'use client'

import { RxDoubleArrowRight } from 'react-icons/rx'
import { Plus, Search } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

const SKILL_TREE_RAIL_ICON_BUTTON_CLASS =
  'text-muted-foreground hover:text-foreground hover:bg-[var(--color-hover-subtle)] h-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center px-spacing-1 transition-colors'

export interface SkillTreeCollapsedRailProps {
  onExpand: () => void
  onAddFile: () => void
  onOpenSearch: () => void
}

/** Icon rail when the skill tree sidebar is collapsed (Team agent Conversations pattern). */
export function SkillTreeCollapsedRail({
  onExpand,
  onAddFile,
  onOpenSearch,
}: SkillTreeCollapsedRailProps) {
  return (
    <div className="gap-spacing-1 p-spacing-2 flex h-full min-h-0 w-full shrink-0 flex-col items-center">
      <Tooltip label="Expand skill tree" side="right">
        <button
          type="button"
          onClick={onExpand}
          className={SKILL_TREE_RAIL_ICON_BUTTON_CLASS}
          aria-label="Expand skill tree"
        >
          <RxDoubleArrowRight className="icon-sm" aria-hidden />
        </button>
      </Tooltip>
      <Tooltip label="Add file" side="right">
        <button
          type="button"
          onClick={onAddFile}
          className={SKILL_TREE_RAIL_ICON_BUTTON_CLASS}
          aria-label="Add file"
        >
          <Plus className="icon-sm" aria-hidden />
        </button>
      </Tooltip>
      <Tooltip label="Search files" side="right">
        <button
          type="button"
          onClick={onOpenSearch}
          className={SKILL_TREE_RAIL_ICON_BUTTON_CLASS}
          aria-label="Search files"
        >
          <Search className="icon-sm" aria-hidden />
        </button>
      </Tooltip>
      <div className="mt-auto flex shrink-0 items-center justify-center">
        <span
          className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Skill tree
        </span>
      </div>
    </div>
  )
}
