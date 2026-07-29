'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Box,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Filter,
  FolderInput,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { ArtifactFilterDropdown, type SourceFilterValue } from './ArtifactFilterDropdown'
import type { AdSetOption } from './FolderMenuDropdown'
import { TreeItem } from './TreeItem'
import type { ArtifactCategoryId, CampaignOption, TreeNode } from './types'

interface ArtifactTreePaneProps {
  selectedResource: unknown
  treeWidth: number
  isDragging: boolean
  activeCampaignName: string | null
  filterBtnRef: React.RefObject<HTMLButtonElement | null>
  filterSet: Set<ArtifactCategoryId> | null
  setFilterSet: React.Dispatch<React.SetStateAction<Set<ArtifactCategoryId> | null>>
  sourceFilter: SourceFilterValue
  setSourceFilter: React.Dispatch<React.SetStateAction<SourceFilterValue>>
  filterDropdownOpen: boolean
  setFilterDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  isFiltering: boolean
  isAllExpanded: boolean
  handleToggleExpandAll: () => void
  loading: boolean
  fetchError: string | null
  totalItems: number
  filteredTotalItems: number
  filteredTreeData: TreeNode[]
  selectedId: string | null
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  handleSelect: (node: TreeNode) => void
  addLoading: string | null
  handleStartAdd: (categoryId: string) => void
  handleConfirmAdd: (categoryId: string, name: string) => void
  handleCancelAdd: () => void
  pendingAdd: string | null
  handleReorderPages: (funnelId: string, pageIds: string[]) => Promise<void>
  handleReorderEmails: (sequenceId: string, emailIds: string[]) => Promise<void>
  handleMovePageToFunnel: (targetFunnelId: string, pageId: string) => Promise<void>
  handleMoveSequenceEmailToSequence: (targetSequenceId: string, emailId: string) => Promise<void>
  draggingType: string | null
  setDraggingType: React.Dispatch<React.SetStateAction<string | null>>
  handleEditFolder: (node: TreeNode) => void
  handleDuplicateFolder: (node: TreeNode) => Promise<void>
  handleDeleteFolder: (node: TreeNode) => void
  handleConfirmEdit: (node: TreeNode, name: string) => Promise<void>
  handleCancelEdit: () => void
  editingFolderId: string | null
  menuOpenId: string | null
  setMenuOpenId: React.Dispatch<React.SetStateAction<string | null>>
  campaignOptions: CampaignOption[]
  campaignId: string
  handleMoveToCampaign: (node: TreeNode, targetCampaignId: string) => Promise<void>
  bulkSelectMode: boolean
  bulkSelectedIds: Set<string>
  bulkSelectedCount: number
  onToggleBulkSelectMode: () => void
  onToggleBulkSelectNode: (node: TreeNode) => void
  onBulkDelete: () => void
  onBulkDuplicate: () => void
  onBulkMoveToCampaign: (targetCampaignId: string) => Promise<void>
  onExitBulkSelect: () => void
  onRefresh: () => Promise<unknown>
  adSetOptions: AdSetOption[]
  handleCloneToAdSet: (node: TreeNode, targetAdSetId: string) => Promise<void>
  onCreateVariations: (node: TreeNode) => void
  onOpenBulkCreator: (adSetId: string) => void
}

function filterTreeByName(nodes: TreeNode[], query: string): TreeNode[] {
  const q = query.toLowerCase().trim()
  if (!q) return nodes
  return nodes.reduce<TreeNode[]>((acc, node) => {
    const childMatches = filterTreeByName(node.children ?? [], q)
    const labelMatch = node.label.toLowerCase().includes(q)
    if (labelMatch || childMatches.length > 0) {
      acc.push({
        ...node,
        children: childMatches.length > 0 ? childMatches : (node.children ?? []),
      })
    }
    return acc
  }, [])
}

function countTreeNodes(nodes: TreeNode[]): number {
  return nodes.reduce((n, node) => n + 1 + countTreeNodes(node.children ?? []), 0)
}

export function ArtifactTreePane(props: ArtifactTreePaneProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const searchFilteredData = useMemo(
    () => filterTreeByName(props.filteredTreeData, searchQuery),
    [props.filteredTreeData, searchQuery],
  )

  const searchFilteredCount = useMemo(
    () => countTreeNodes(searchFilteredData),
    [searchFilteredData],
  )

  const isSearching = searchQuery.trim().length > 0

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await props.onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const searchBar = (
    <div className="relative flex items-center">
      <Search className="text-muted-foreground/50 pointer-events-none absolute left-1.5 h-3 w-3 shrink-0" />
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search…"
        className="body-4 text-foreground placeholder:text-muted-foreground/40 h-6 w-28 rounded-md bg-white/5 pl-5 pr-5 text-xs outline-none transition-all duration-200 focus:w-40 focus:bg-white/10"
      />
      {isSearching && (
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          className="text-muted-foreground hover:text-foreground absolute right-1 p-0.5"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )

  const actionIcons = (
    <>
      <Tooltip label={props.isAllExpanded ? 'Collapse all' : 'Expand all'} side="bottom">
        <button
          type="button"
          onClick={props.handleToggleExpandAll}
          className="text-muted-foreground hover:text-foreground p-1 transition-colors"
        >
          {props.isAllExpanded ? (
            <ChevronsUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronsDown className="h-3.5 w-3.5" />
          )}
        </button>
      </Tooltip>
      <div className="relative inline-flex">
        <Tooltip label="Filter artifact types" side="bottom">
          <button
            ref={props.filterBtnRef}
            type="button"
            onClick={() => props.setFilterDropdownOpen((p) => !p)}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        {props.isFiltering && (
          <span className="bg-primary pointer-events-none absolute right-0 top-0 h-1.5 w-1.5 rounded-full" />
        )}
        {props.filterDropdownOpen && (
          <ArtifactFilterDropdown
            filterSet={props.filterSet}
            onToggle={(id) => {
              props.setFilterSet((prev) => {
                if (!prev) return new Set([id])
                const next = new Set(prev)
                if (next.has(id)) {
                  next.delete(id)
                  return next.size === 0 ? null : next
                }
                next.add(id)
                return next
              })
            }}
            onShowAll={() => props.setFilterSet(null)}
            sourceFilter={props.sourceFilter}
            onSourceFilterChange={props.setSourceFilter}
            onClose={() => props.setFilterDropdownOpen(false)}
            anchorRef={props.filterBtnRef}
          />
        )}
      </div>
      <Tooltip label={props.bulkSelectMode ? 'Exit bulk edit' : 'Bulk edit'} side="bottom">
        <button
          type="button"
          onClick={props.onToggleBulkSelectMode}
          className={`rounded-spacing-1 p-1 transition-colors ${
            props.bulkSelectMode
              ? 'chip-glass-blue text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <Tooltip label="Refresh artifacts" side="bottom">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-muted-foreground hover:text-foreground p-1 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </Tooltip>
    </>
  )

  return (
    <div
      className={`card-glass-panel relative flex flex-shrink-0 flex-col overflow-hidden ${
        props.selectedResource ? 'border-r-glass' : ''
      } ${props.isDragging ? '' : 'transition-[width] duration-500 ease-in-out'}`}
      style={{ width: props.selectedResource ? props.treeWidth : '100%' }}
    >
      <div className="border-border border-b">
        {props.selectedResource ? (
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <span
              className="body-2 text-foreground min-w-0 truncate font-medium"
              title={props.activeCampaignName || 'Campaign'}
            >
              {props.activeCampaignName || 'Campaign'}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              {searchBar}
              <div className="flex shrink-0 items-center gap-1">{actionIcons}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-3">
            <span
              className="body-2 text-foreground truncate font-medium"
              title={props.activeCampaignName || 'Campaign'}
            >
              {props.activeCampaignName || 'Campaign'}
            </span>
            <div className="flex items-center gap-2">
              {searchBar}
              <div className="flex items-center gap-1">{actionIcons}</div>
            </div>
          </div>
        )}
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {props.loading ? (
          <div className="flex items-center justify-center py-8">
            <VibeyLoadingOrb size="sm" text="Loading artifacts..." />
          </div>
        ) : props.fetchError ? (
          <div className="px-3 py-8 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400/40" />
            <p className="body-3 text-muted-foreground">{STUDIO_INLINE_ERRORS.LOAD_ARTIFACTS}</p>
            <p className="typo-caption text-muted-foreground/60 mt-1">{props.fetchError}</p>
          </div>
        ) : props.totalItems === 0 ? (
          <div className="px-3 py-8 text-center">
            <Box className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
            <p className="body-3 text-muted-foreground">No artifacts yet</p>
            <p className="typo-caption text-muted-foreground mt-1">
              Chat with Pixel to create funnels, presentations, and more
            </p>
          </div>
        ) : (isSearching ? searchFilteredCount : props.filteredTotalItems) === 0 ? (
          <div className="px-3 py-8 text-center">
            <Box className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
            <p className="body-3 text-muted-foreground">
              {isSearching
                ? 'No matching artifacts'
                : props.isFiltering
                  ? 'No matching artifacts'
                  : 'No artifacts yet'}
            </p>
          </div>
        ) : (
          (isSearching ? searchFilteredData : props.filteredTreeData).map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              level={0}
              selectedId={props.selectedId}
              onSelect={props.handleSelect}
              expandedIds={props.expandedIds}
              onToggle={props.toggleExpand}
              onStartAdd={props.addLoading ? undefined : props.handleStartAdd}
              onConfirmAdd={props.addLoading ? undefined : props.handleConfirmAdd}
              onCancelAdd={props.handleCancelAdd}
              pendingAdd={props.pendingAdd}
              onReorderPages={props.handleReorderPages}
              onReorderEmails={props.handleReorderEmails}
              onMovePageToFunnel={props.handleMovePageToFunnel}
              onMoveSequenceEmailToSequence={props.handleMoveSequenceEmailToSequence}
              draggingType={props.draggingType}
              onDragStart={props.setDraggingType}
              onDragEnd={() => props.setDraggingType(null)}
              onEditFolder={props.handleEditFolder}
              onDuplicateFolder={(n) => void props.handleDuplicateFolder(n)}
              onDeleteFolder={props.handleDeleteFolder}
              onConfirmEdit={(n, name) => void props.handleConfirmEdit(n, name)}
              onCancelEdit={props.handleCancelEdit}
              editingFolderId={props.editingFolderId}
              menuOpenId={props.menuOpenId}
              onMenuOpenChange={props.setMenuOpenId}
              campaigns={props.campaignOptions}
              currentCampaignId={props.campaignId}
              onMoveToCampaign={(n, targetCampaignId) =>
                void props.handleMoveToCampaign(n, targetCampaignId)
              }
              bulkSelectMode={props.bulkSelectMode}
              bulkSelectedIds={props.bulkSelectedIds}
              onToggleBulkSelect={props.onToggleBulkSelectNode}
              adSets={props.adSetOptions}
              onCloneToAdSet={props.handleCloneToAdSet}
              onCreateVariations={props.onCreateVariations}
              onOpenBulkCreator={props.onOpenBulkCreator}
            />
          ))
        )}
      </div>
      {props.bulkSelectMode && (
        <BulkActionBar
          count={props.bulkSelectedCount}
          onCancel={props.onExitBulkSelect}
          onDelete={props.onBulkDelete}
          onDuplicate={props.onBulkDuplicate}
          onMoveToCampaign={props.onBulkMoveToCampaign}
          campaigns={props.campaignOptions}
          currentCampaignId={props.campaignId}
        />
      )}
    </div>
  )
}

function BulkActionBar({
  count,
  onCancel,
  onDelete,
  onDuplicate,
  onMoveToCampaign,
  campaigns,
  currentCampaignId,
}: {
  count: number
  onCancel: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveToCampaign: (targetCampaignId: string) => Promise<void>
  campaigns: CampaignOption[]
  currentCampaignId: string
}) {
  const [moveOpen, setMoveOpen] = useState(false)
  const [moving, setMoving] = useState(false)
  const moveBtnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moveOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!dropdownRef.current?.contains(target) && !moveBtnRef.current?.contains(target)) {
        setMoveOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moveOpen])

  const otherCampaigns = campaigns.filter((c) => c.id !== currentCampaignId)
  const disabled = count === 0 || moving

  const handleMove = async (targetId: string) => {
    setMoveOpen(false)
    setMoving(true)
    try {
      await onMoveToCampaign(targetId)
    } finally {
      setMoving(false)
    }
  }

  return (
    <div className="border-border flex items-center justify-between border-t px-3 py-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={moving}
        className="body-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
      >
        Cancel
      </button>
      <span className="body-3 text-muted-foreground">
        {moving ? 'Moving...' : `${count} selected`}
      </span>
      <div className="flex items-center gap-1">
        <Tooltip label="Duplicate" side="top">
          <button
            type="button"
            onClick={onDuplicate}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors disabled:opacity-40"
          >
            <Copy className="h-4 w-4" />
          </button>
        </Tooltip>
        {otherCampaigns.length > 0 && (
          <div className="relative inline-flex items-center">
            <Tooltip label="Move to Campaign" side="top">
              <button
                ref={moveBtnRef}
                type="button"
                onClick={() => setMoveOpen((p) => !p)}
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors disabled:opacity-40"
              >
                {moving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderInput className="h-4 w-4" />
                )}
              </button>
            </Tooltip>
            {moveOpen && (
              <div
                ref={dropdownRef}
                className="rounded-spacing-2 border-border surface-card p-spacing-2 absolute bottom-full right-0 z-50 mb-2 min-w-48 overflow-y-auto border shadow-lg"
                style={{ maxHeight: 240 }}
              >
                <p className="typo-caption text-muted-foreground px-spacing-3 pb-spacing-1 font-medium opacity-60">
                  Move to
                </p>
                {otherCampaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void handleMove(c.id)}
                    className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
                  >
                    <LucideIcon name={c.icon} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <Tooltip label="Delete" side="top">
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="text-destructive hover:text-destructive/80 p-1 transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
