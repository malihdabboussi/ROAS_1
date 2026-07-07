'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { AddArtifactInput } from './AddArtifactInput'
import { MENU_NODE_TYPES } from './constants'
import { EditArtifactInput } from './EditArtifactInput'
import type { AdSetOption } from './FolderMenuDropdown'
import { TreeItemActions } from './TreeItemActions'
import type { CampaignOption, TreeNode } from './types'

interface TreeItemProps {
  node: TreeNode
  level: number
  selectedId: string | null
  onSelect: (node: TreeNode) => void
  expandedIds: Set<string>
  onToggle: (id: string) => void
  siblings?: TreeNode[]
  onReorderPages?: (funnelId: string, pageIds: string[]) => Promise<void>
  onReorderEmails?: (sequenceId: string, emailIds: string[]) => Promise<void>
  onMovePageToFunnel?: (targetFunnelId: string, pageId: string) => Promise<void>
  onMoveSequenceEmailToSequence?: (targetSequenceId: string, emailId: string) => Promise<void>
  draggingType?: string | null
  onDragStart?: (type: string) => void
  onDragEnd?: () => void
  pendingAdd?: string | null
  onStartAdd?: (categoryId: string) => void
  onConfirmAdd?: (categoryId: string, name: string) => void
  onCancelAdd?: () => void
  onEditFolder?: (node: TreeNode) => void
  onDuplicateFolder?: (node: TreeNode) => void
  onDeleteFolder?: (node: TreeNode) => void
  onConfirmEdit?: (node: TreeNode, name: string) => void
  onCancelEdit?: () => void
  editingFolderId?: string | null
  menuOpenId?: string | null
  onMenuOpenChange?: (id: string | null) => void
  campaigns?: CampaignOption[]
  currentCampaignId?: string
  onMoveToCampaign?: (node: TreeNode, targetCampaignId: string) => void
  bulkSelectMode?: boolean
  bulkSelectedIds?: Set<string>
  onToggleBulkSelect?: (node: TreeNode) => void
  adSets?: AdSetOption[]
  onCloneToAdSet?: (node: TreeNode, adSetId: string) => void
  onCreateVariations?: (node: TreeNode) => void
  onOpenBulkCreator?: (adSetId: string) => void
  siblingIndex?: number
  parentNode?: TreeNode | null
}

export function TreeItem({
  node,
  level,
  selectedId,
  onSelect,
  expandedIds,
  onToggle,
  siblings: _siblings,
  onReorderPages,
  onReorderEmails,
  onMovePageToFunnel,
  onMoveSequenceEmailToSequence,
  draggingType,
  onDragStart,
  onDragEnd,
  pendingAdd,
  onStartAdd,
  onConfirmAdd,
  onCancelAdd,
  onEditFolder,
  onDuplicateFolder,
  onDeleteFolder,
  onConfirmEdit,
  onCancelEdit,
  editingFolderId,
  menuOpenId,
  onMenuOpenChange,
  campaigns,
  currentCampaignId,
  onMoveToCampaign,
  bulkSelectMode,
  bulkSelectedIds,
  onToggleBulkSelect,
  adSets,
  onCloneToAdSet,
  onCreateVariations,
  onOpenBulkCreator,
  siblingIndex: _siblingIndex = -1,
  parentNode: _parentNode = null,
}: TreeItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showAllPosts, setShowAllPosts] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const hasChildren =
    node.type === 'category' ||
    (node.type === 'funnel' && (node.children?.length ?? 0) > 0) ||
    node.type === 'offer' ||
    node.type === 'sequence' ||
    node.type === 'ad-campaign' ||
    node.type === 'ad-set' ||
    node.type === 'social-platform'
  const isCategory = node.type === 'category'
  const isUngroupedAds = node.id === 'ungrouped-ads'
  const hasMenu =
    isUngroupedAds ||
    (MENU_NODE_TYPES.includes(node.type as (typeof MENU_NODE_TYPES)[number]) &&
      (node.type === 'page' ? Boolean(node.funnelId && node.pageId) : Boolean(node.resourceId)))
  const isLeaf = !hasChildren && !isCategory
  const visualLevel = isLeaf ? Math.min(level, 2) : level
  const count = node.children?.length ?? 0
  const isEditing = editingFolderId === node.id
  const isMenuOpen = menuOpenId === node.id
  const isNewArtifact = useChatStore((s) => s.newArtifactIds.includes(node.id))
  const canBulkSelect = bulkSelectMode && hasMenu
  const isBulkSelected = bulkSelectedIds?.has(node.id) ?? false

  const hasStatusDot =
    (node.type === 'ad' || node.type === 'ad-campaign' || node.type === 'ad-set') && !isUngroupedAds

  return (
    <div className={node.type === 'category' && level === 0 ? 'mt-2' : ''}>
      {isEditing && onConfirmEdit && onCancelEdit ? (
        <EditArtifactInput
          node={node}
          level={level}
          initialValue={node.label}
          onConfirm={(name) => onConfirmEdit(node, name)}
          onCancel={onCancelEdit}
        />
      ) : (
        <div
          className="group flex w-full items-center"
          draggable={node.type !== 'category'}
          onDragStart={(e) => {
            if (node.type === 'category') return
            const payload = {
              id: node.resourceId ?? node.pageId ?? node.id,
              type: node.type,
              label: node.label,
            }
            e.dataTransfer.setData('application/x-vibey-artifact', JSON.stringify(payload))
            e.dataTransfer.effectAllowed = 'copy'
            onDragStart?.(node.type)
          }}
          onDragEnd={() => onDragEnd?.()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className={`flex min-w-0 flex-1 items-center rounded-lg py-0.5 pl-2 pr-1 transition-colors ${
              isSelected
                ? 'artifact-nav-glass-purple nav-glass-text-purple'
                : isNewArtifact
                  ? 'artifact-new-glass'
                  : ''
            }`}
            style={{ marginLeft: `${visualLevel * 16 + 8}px` }}
          >
            {canBulkSelect ? (
              <button
                onClick={() => onToggleBulkSelect?.(node)}
                className={`pr-spacing-2 flex min-w-0 flex-1 items-center gap-1 rounded-lg py-0.5 text-left transition-colors ${
                  isSelected ? 'text-inherit' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isBulkSelected}
                  readOnly
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleBulkSelect?.(node)
                  }}
                  className="checkbox-glass-primary flex-shrink-0 cursor-pointer"
                />
                <div className="min-w-0 flex-1 truncate" title={node.label}>
                  <span className="body-2 truncate">{node.label}</span>
                </div>
              </button>
            ) : (
              <div
                className={`pr-spacing-2 flex min-w-0 flex-1 items-center gap-0.5 rounded-lg py-0.5 ${
                  isSelected ? 'text-inherit' : 'text-muted-foreground'
                }`}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(node.id)
                    }}
                    className="hover:text-foreground flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="inline-block h-3.5 w-3.5 flex-shrink-0" />
                )}
                <button
                  onClick={() => {
                    if (bulkSelectMode && isCategory) {
                      onToggle(node.id)
                      return
                    }
                    const sectionMap: Record<string, string> = {
                      ads: 'ads',
                      funnels: 'funnel',
                      presentations: 'presentation',
                    }
                    if (node.type === 'category' && sectionMap[node.id]) {
                      onSelect(node)
                      return
                    }
                    if (hasChildren && isCategory) {
                      onToggle(node.id)
                      return
                    }
                    onSelect(node)
                    if (isNewArtifact) useChatStore.getState().markArtifactSeen(node.id)
                  }}
                  className={`flex min-w-0 flex-1 items-center gap-1 rounded-lg py-0.5 text-left transition-colors ${
                    isSelected ? 'text-inherit' : 'hover:bg-secondary'
                  }`}
                >
                  {!hasChildren && node.icon}
                  <div className="min-w-0 flex-1 truncate" title={node.label}>
                    <span className="body-2 truncate">{node.label}</span>
                    {node.subtitle && (
                      <span
                        className="typo-caption text-muted-foreground block truncate"
                        title={node.subtitle}
                      >
                        {node.subtitle}
                      </span>
                    )}
                  </div>
                  {node.source === 'meta' && (
                    <Tooltip label="Synced from Meta" side="top">
                      <span
                        className="typo-caption bg-primary/10 text-primary ml-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm font-bold leading-none opacity-70"
                      >
                        M
                      </span>
                    </Tooltip>
                  )}
                </button>
              </div>
            )}
            {(hasChildren || hasMenu) && (
              <TreeItemActions
                node={node}
                isHovered={isHovered}
                isMenuOpen={isMenuOpen}
                isSelected={isSelected}
                isUngroupedAds={isUngroupedAds}
                hasMenu={hasMenu}
                hasStatusDot={hasStatusDot}
                count={count}
                menuBtnRef={menuBtnRef}
                onEditFolder={onEditFolder}
                onDuplicateFolder={onDuplicateFolder}
                onDeleteFolder={onDeleteFolder}
                onMenuOpenChange={onMenuOpenChange}
                campaigns={campaigns}
                currentCampaignId={currentCampaignId}
                onMoveToCampaign={onMoveToCampaign}
                adSets={adSets}
                onCloneToAdSet={onCloneToAdSet}
                onCreateVariations={onCreateVariations}
                onOpenBulkCreator={onOpenBulkCreator}
              />
            )}
          </div>
        </div>
      )}
      {isExpanded && isCategory && pendingAdd === node.id && onConfirmAdd && onCancelAdd && (
        <AddArtifactInput
          categoryId={node.id}
          level={level + 1}
          onConfirm={onConfirmAdd}
          onCancel={onCancelAdd}
        />
      )}
      {isExpanded &&
        (() => {
          const allChildren = node.children ?? []
          const SOCIAL_LIMIT = 5
          const isSocialPlatform = node.type === 'social-platform'
          const visibleChildren =
            isSocialPlatform && !showAllPosts && allChildren.length > SOCIAL_LIMIT
              ? allChildren.slice(0, SOCIAL_LIMIT)
              : allChildren
          const hiddenCount = allChildren.length - visibleChildren.length
          return (
            <>
              {visibleChildren.map((child, index) => (
                <TreeItem
                  key={child.id}
                  node={child}
                  level={level + 1}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                  siblings={allChildren}
                  siblingIndex={index}
                  parentNode={node}
                  onReorderPages={onReorderPages}
                  onReorderEmails={onReorderEmails}
                  onMovePageToFunnel={onMovePageToFunnel}
                  onMoveSequenceEmailToSequence={onMoveSequenceEmailToSequence}
                  draggingType={draggingType}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  pendingAdd={pendingAdd}
                  onStartAdd={onStartAdd}
                  onConfirmAdd={onConfirmAdd}
                  onCancelAdd={onCancelAdd}
                  onEditFolder={onEditFolder}
                  onDuplicateFolder={onDuplicateFolder}
                  onDeleteFolder={onDeleteFolder}
                  onConfirmEdit={onConfirmEdit}
                  onCancelEdit={onCancelEdit}
                  editingFolderId={editingFolderId}
                  menuOpenId={menuOpenId}
                  onMenuOpenChange={onMenuOpenChange}
                  campaigns={campaigns}
                  currentCampaignId={currentCampaignId}
                  onMoveToCampaign={onMoveToCampaign}
                  bulkSelectMode={bulkSelectMode}
                  bulkSelectedIds={bulkSelectedIds}
                  onToggleBulkSelect={onToggleBulkSelect}
                  adSets={adSets}
                  onCloneToAdSet={onCloneToAdSet}
                  onCreateVariations={onCreateVariations}
                  onOpenBulkCreator={onOpenBulkCreator}
                />
              ))}
              {isSocialPlatform && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllPosts(true)}
                  className="body-4 text-muted-foreground hover:text-foreground mt-0.5 w-full py-1 text-left transition-colors"
                  style={{ paddingLeft: `${(level + 1) * 16 + 28}px` }}
                >
                  Show all ({allChildren.length})
                </button>
              )}
            </>
          )
        })()}
    </div>
  )
}
