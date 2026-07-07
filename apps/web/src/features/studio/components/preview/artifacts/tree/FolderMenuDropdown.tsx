'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Box,
  ChevronRight,
  Copy,
  Edit2,
  FolderInput,
  Layers,
  MoreVertical,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { ARTIFACT_TABLE_MAP } from './constants'
import { FolderMenuCloneSubmenu } from './FolderMenuCloneSubmenu'
import type { AdSetOption } from './FolderMenuDropdown.types'
import type { CampaignOption, TreeNode } from './types'

export type { AdSetOption } from './FolderMenuDropdown.types'

interface FolderMenuDropdownProps {
  node: TreeNode
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  campaigns: CampaignOption[]
  currentCampaignId: string
  onMoveToCampaign: (node: TreeNode, targetCampaignId: string) => void
  adSets?: AdSetOption[]
  onCloneToAdSet?: (node: TreeNode, adSetId: string) => void
  onCreateVariations?: (node: TreeNode) => void
  onOpenBulkCreator?: (adSetId: string) => void
  currentCampaignIdForAdd?: string
}

export function FolderMenuDropdown({
  node,
  anchorRef,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  campaigns,
  currentCampaignId,
  onMoveToCampaign,
  adSets,
  onCloneToAdSet,
  onCreateVariations,
  onOpenBulkCreator,
  currentCampaignIdForAdd: _currentCampaignIdForAdd,
}: FolderMenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const moveButtonRef = useRef<HTMLButtonElement>(null)
  const cloneButtonRef = useRef<HTMLButtonElement>(null)
  const [moveSubmenuOpen, setMoveSubmenuOpen] = useState(false)
  const [cloneSubmenuOpen, setCloneSubmenuOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [subPos, setSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [cloneSubPos, setCloneSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!anchorRef.current || !dropdownRef.current) return
    const anchorRect = anchorRef.current.getBoundingClientRect()
    const dropRect = dropdownRef.current.getBoundingClientRect()
    const vh = window.innerHeight
    const pad = 8

    let top = anchorRect.bottom + 4
    let left = anchorRect.right
    if (top + dropRect.height > vh - pad) top = anchorRect.top - dropRect.height - 4
    if (top < pad) top = pad
    if (left - dropRect.width < pad) left = anchorRect.left + dropRect.width
    setPos({ top, left })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!moveSubmenuOpen || !moveButtonRef.current) return
    const rect = moveButtonRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    const subWidth = 192
    let top = rect.top
    let left = rect.right + 4
    if (left + subWidth > vw - pad) left = rect.left - subWidth - 4
    if (top + 200 > vh - pad) top = Math.max(pad, vh - 200 - pad)
    setSubPos({ top, left })
  }, [moveSubmenuOpen])

  useLayoutEffect(() => {
    if (!cloneSubmenuOpen || !cloneButtonRef.current) return
    const rect = cloneButtonRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    const subWidth = 220
    let top = rect.top
    let left = rect.right + 4
    if (left + subWidth > vw - pad) left = rect.left - subWidth - 4
    if (top + 240 > vh - pad) top = Math.max(pad, vh - 240 - pad)
    setCloneSubPos({ top, left })
  }, [cloneSubmenuOpen])

  useEffect(() => {
    if (!anchorRef.current) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !anchorRef.current?.contains(target)) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, anchorRef])

  const otherCampaigns = campaigns.filter((c) => c.id !== currentCampaignId)
  const canMove = !!ARTIFACT_TABLE_MAP[node.type] && otherCampaigns.length > 0
  const canDuplicate =
    (node.type === 'ad' || node.type === 'ad-campaign' || node.type === 'ad-set') &&
    node.id !== 'ungrouped-ads' &&
    !!node.resourceId
  const canClone =
    node.type === 'ad' && !!node.resourceId && !!onCloneToAdSet && (adSets ?? []).length > 0

  const addAction = (() => {
    if (node.type === 'ad-campaign') {
      return {
        label: 'New Ad Set',
        prompt: 'Add a new ad set to this campaign. Help me create it.',
        type: 'new-ad-set' as const,
        campaignId: node.resourceId,
        adSetId: undefined,
        parentLabel: node.label,
      }
    }
    if (node.type === 'ad-set') {
      return {
        label: 'New Creative',
        prompt: 'Add a new ad creative to this ad set. Help me create it.',
        type: 'new-creative' as const,
        campaignId: undefined,
        adSetId: node.resourceId,
        parentLabel: node.label,
      }
    }
    return null
  })()

  const canBulkTest = node.type === 'ad-set' && !!onOpenBulkCreator

  return createPortal(
    <>
      <div
        data-dropdown
        ref={dropdownRef}
        className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-40 border shadow-lg"
        style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
      >
        <button
          type="button"
          onClick={() => {
            onEdit()
            onClose()
          }}
          className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
        >
          <Edit2 className="h-4 w-4" />
          <span>Edit name</span>
        </button>
        {canMove && (
          <button
            ref={moveButtonRef}
            type="button"
            onClick={() => setMoveSubmenuOpen(!moveSubmenuOpen)}
            className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
          >
            <FolderInput className="h-4 w-4" />
            <span className="flex-1">Move to Campaign</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
        {canDuplicate && (
          <button
            type="button"
            onClick={() => {
              onDuplicate()
              onClose()
            }}
            className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
          >
            <Box className="h-4 w-4" />
            <span>Duplicate</span>
          </button>
        )}
        {canClone && (
          <button
            ref={cloneButtonRef}
            type="button"
            onClick={() => {
              setCloneSubmenuOpen(!cloneSubmenuOpen)
              setMoveSubmenuOpen(false)
            }}
            className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
          >
            <Copy className="h-4 w-4" />
            <span className="flex-1">Clone to...</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
        {node.type === 'ad' && !!node.resourceId && onCreateVariations && (
          <button
            type="button"
            onClick={() => {
              onCreateVariations(node)
              onClose()
            }}
            className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
          >
            <Sparkles className="h-4 w-4" />
            <span>Create Variations</span>
          </button>
        )}
        {addAction && (
          <>
            <div className="border-border my-1 border-t" />
            <button
              type="button"
              onClick={() => {
                useChatStore.getState().setPendingComposerText(addAction.prompt)
                window.dispatchEvent(
                  new CustomEvent('studio-request-add-ads-artifact', {
                    detail: {
                      prompt: addAction.prompt,
                      type: addAction.type,
                      parentLabel: addAction.parentLabel,
                      campaignId: addAction.campaignId,
                      adSetId: addAction.adSetId,
                    },
                  }),
                )
                onClose()
              }}
              className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
            >
              <Plus className="h-4 w-4" />
              <span>{addAction.label}</span>
            </button>
          </>
        )}
        {canBulkTest && (
          <button
            type="button"
            onClick={() => {
              onOpenBulkCreator!(node.resourceId ?? node.id)
              onClose()
            }}
            className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
          >
            <Layers className="h-4 w-4" />
            <span>Bulk Test With Vibey</span>
          </button>
        )}
        <div className="border-border my-1 border-t" />
        <button
          type="button"
          onClick={() => {
            onDelete()
            onClose()
          }}
          className="gap-spacing-2 body-3 px-spacing-3 py-spacing-2 text-destructive hover:bg-destructive/10 flex w-full items-center text-left [&_svg]:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </button>
      </div>
      {moveSubmenuOpen && (
        <div
          data-dropdown
          className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-48 overflow-y-auto border shadow-lg"
          style={{
            top: subPos.top,
            left: subPos.left,
            maxHeight: `calc(100vh - ${subPos.top + 8}px)`,
          }}
        >
          {otherCampaigns.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onMoveToCampaign(node, c.id)
                onClose()
              }}
              className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
            >
              <LucideIcon name={c.icon} className="h-4 w-4 shrink-0" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
      {cloneSubmenuOpen && canClone && (
        <FolderMenuCloneSubmenu
          adSets={adSets ?? []}
          node={node}
          position={cloneSubPos}
          onCloneToAdSet={onCloneToAdSet}
          onClose={onClose}
        />
      )}
    </>,
    document.body,
  )
}

export function TreeItemMenuButton({
  isHovered,
  isMenuOpen,
  isSelected,
  count,
  menuBtnRef,
  onToggleMenu,
  statusDotClass,
  statusLabel,
}: {
  isHovered: boolean
  isMenuOpen: boolean
  isSelected: boolean
  count: number
  menuBtnRef: React.RefObject<HTMLButtonElement | null>
  onToggleMenu: () => void
  statusDotClass?: string
  statusLabel?: string
}) {
  const showMenu = isHovered || isMenuOpen
  return (
    <>
      {statusDotClass ? (
        <span
          className={`flex-shrink-0 rounded-full transition-opacity ${statusDotClass} ${showMenu ? 'absolute opacity-0' : 'opacity-100'}`}
          style={{ width: 6, height: 6, minWidth: 6 }}
          title={statusLabel}
        />
      ) : count > 0 ? (
        <span
          className={`body-3 transition-opacity ${
            isSelected ? 'text-inherit' : 'text-muted-foreground'
          } ${showMenu ? 'absolute opacity-0' : 'opacity-100'}`}
        >
          {count}
        </span>
      ) : null}
      <button
        ref={menuBtnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleMenu()
        }}
        className={`flex h-6 w-6 items-center justify-center rounded transition-opacity ${
          showMenu
            ? `opacity-100 ${isSelected ? 'hover:bg-secondary text-inherit' : 'text-muted-foreground hover:bg-secondary'}`
            : 'pointer-events-none absolute opacity-0'
        }`}
        title="More options"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
    </>
  )
}
