'use client'

import { Trash2 } from 'lucide-react'
import { getMetaStatusDotClass } from './buildArtifactTree'
import { FolderMenuDropdown, TreeItemMenuButton, type AdSetOption } from './FolderMenuDropdown'
import type { CampaignOption, TreeNode } from './types'

interface TreeItemActionsProps {
  node: TreeNode
  isHovered: boolean
  isMenuOpen: boolean
  isSelected: boolean
  isUngroupedAds: boolean
  hasMenu: boolean
  hasStatusDot: boolean
  count: number
  menuBtnRef: React.RefObject<HTMLButtonElement | null>
  onEditFolder?: (node: TreeNode) => void
  onDuplicateFolder?: (node: TreeNode) => void
  onDeleteFolder?: (node: TreeNode) => void
  onMenuOpenChange?: (id: string | null) => void
  campaigns?: CampaignOption[]
  currentCampaignId?: string
  onMoveToCampaign?: (node: TreeNode, targetCampaignId: string) => void
  adSets?: AdSetOption[]
  onCloneToAdSet?: (node: TreeNode, adSetId: string) => void
  onCreateVariations?: (node: TreeNode) => void
  onOpenBulkCreator?: (adSetId: string) => void
}

export function TreeItemActions({
  node,
  isHovered,
  isMenuOpen,
  isSelected,
  isUngroupedAds,
  hasMenu,
  hasStatusDot,
  count,
  menuBtnRef,
  onEditFolder,
  onDuplicateFolder,
  onDeleteFolder,
  onMenuOpenChange,
  campaigns,
  currentCampaignId,
  onMoveToCampaign,
  adSets,
  onCloneToAdSet,
  onCreateVariations,
  onOpenBulkCreator,
}: TreeItemActionsProps) {
  return (
    <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
      {isUngroupedAds && onDeleteFolder ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteFolder(node)
          }}
          className={`flex h-6 w-6 items-center justify-center rounded transition-opacity ${
            isHovered
              ? 'text-destructive opacity-100 hover:bg-destructive/10'
              : 'pointer-events-none opacity-0'
          }`}
          title="Delete all ungrouped ads"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : hasMenu && onEditFolder && onDeleteFolder ? (
        <>
          <TreeItemMenuButton
            isHovered={isHovered}
            isMenuOpen={isMenuOpen}
            isSelected={isSelected}
            count={count}
            menuBtnRef={menuBtnRef}
            onToggleMenu={() => onMenuOpenChange?.(isMenuOpen ? null : node.id)}
            statusDotClass={hasStatusDot ? getMetaStatusDotClass(node.metaStatus) : undefined}
            statusLabel={hasStatusDot ? (node.metaStatus ?? 'Draft') : undefined}
          />
          {isMenuOpen && (
            <FolderMenuDropdown
              node={node}
              anchorRef={menuBtnRef}
              onClose={() => onMenuOpenChange?.(null)}
              onEdit={() => onEditFolder(node)}
              onDuplicate={() => onDuplicateFolder?.(node)}
              onDelete={() => onDeleteFolder(node)}
              campaigns={campaigns ?? []}
              currentCampaignId={currentCampaignId ?? ''}
              onMoveToCampaign={onMoveToCampaign ?? (() => {})}
              adSets={adSets}
              onCloneToAdSet={onCloneToAdSet}
              onCreateVariations={onCreateVariations}
              onOpenBulkCreator={onOpenBulkCreator}
              currentCampaignIdForAdd={currentCampaignId}
            />
          )}
        </>
      ) : (
        <span className={`body-3 ${isSelected ? 'text-inherit' : 'text-muted-foreground'}`}>
          {count}
        </span>
      )}
    </div>
  )
}
