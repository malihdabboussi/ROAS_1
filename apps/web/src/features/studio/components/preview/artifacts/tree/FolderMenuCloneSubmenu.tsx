'use client'

import { Copy } from 'lucide-react'
import type { AdSetOption } from './FolderMenuDropdown.types'
import type { TreeNode } from './types'

interface FolderMenuCloneSubmenuProps {
  adSets: AdSetOption[]
  node: TreeNode
  position: { top: number; left: number }
  onCloneToAdSet?: (node: TreeNode, adSetId: string) => void
  onClose: () => void
}

export function FolderMenuCloneSubmenu({
  adSets,
  node,
  position,
  onCloneToAdSet,
  onClose,
}: FolderMenuCloneSubmenuProps) {
  return (
    <div
      data-dropdown
      className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-52 overflow-y-auto border shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        maxHeight: `calc(100vh - ${position.top + 8}px)`,
      }}
    >
      <p className="typo-caption text-muted-foreground px-spacing-3 pb-spacing-1 font-medium opacity-60">
        Clone ad to ad set
      </p>
      {adSets.map((adSet) => (
        <button
          key={adSet.id}
          type="button"
          onClick={() => {
            onCloneToAdSet?.(node, adSet.id)
            onClose()
          }}
          className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
        >
          <Copy className="h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="block truncate">{adSet.name}</span>
            <span className="typo-caption text-muted-foreground/60 block truncate">
              {adSet.campaignName}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
