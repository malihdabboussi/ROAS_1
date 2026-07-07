'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { FolderKanban, MoreHorizontal, Settings2 } from 'lucide-react'
import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import type { Campaign } from '@/lib/campaigns/campaign-api'
import { updateSpace } from '../../services/spaces.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { Space } from '../../types'
import type { SpaceSchema } from '../../types/space-schema'
import { SwitcherSection } from './SwitcherSection'

export type SwitcherTree = {
  byCampaign: Map<string, { campaign: Campaign; spaces: Space[] }>
}

export type SpaceSwitcherDropdownProps = {
  open: boolean
  dropdownPos: { top: number; left: number } | null
  dropdownRef: RefObject<HTMLDivElement | null>
  moreMenuBtnRef: RefObject<HTMLButtonElement | null>
  activeSpace: Space
  activeSpaceId: string | null
  activeSchema: SpaceSchema
  spaceIconName: string
  spaceIconColor: ReturnType<typeof getIconColor>
  titleDraft: string
  setTitleDraft: (v: string) => void
  schemaEditorOpen: boolean
  switcherTree: SwitcherTree
  expandedSwitcherIds: Set<string>
  setExpandedSwitcherIds: Dispatch<SetStateAction<Set<string>>>
  setActiveSpace: (id: string) => void
  setSwitcherOpen: (v: boolean) => void
  patchActiveSpaceSchema: (patch: Partial<SpaceSchema>) => void
  closeCustomizePanel: () => void
  openCustomizeFromToolbar: (initial?: 'main' | 'fields' | 'people' | 'ig_format') => void
  moreMenuOpen: boolean
  setMoreMenuOpen: (v: boolean) => void
  setMoreMenuPos: (p: { top: number; left: number }) => void
}

export function SpaceSwitcherDropdown(p: SpaceSwitcherDropdownProps) {
  const {
    open,
    dropdownPos,
    dropdownRef,
    moreMenuBtnRef,
    activeSpace,
    activeSpaceId,
    activeSchema,
    spaceIconName,
    spaceIconColor,
    titleDraft,
    setTitleDraft,
    schemaEditorOpen,
    switcherTree,
    expandedSwitcherIds,
    setExpandedSwitcherIds,
    setActiveSpace,
    setSwitcherOpen,
    patchActiveSpaceSchema,
    closeCustomizePanel,
    openCustomizeFromToolbar,
    moreMenuOpen,
    setMoreMenuOpen,
    setMoreMenuPos,
  } = p

  if (!open || !dropdownPos || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[99999] w-[280px]"
      style={{ top: dropdownPos.top, left: dropdownPos.left }}
    >
      <div className="dropdown-menu-solid flex max-w-full flex-col rounded-xl border border-[var(--border)] shadow-xl">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <IconPicker
            className="z-10 shrink-0"
            value={spaceIconName}
            color={activeSchema.icon_color}
            size="sm"
            preferAbove
            onChange={(name) => {
              patchActiveSpaceSchema({ icon: name })
              void updateSpace(activeSpace.id, {
                schema: { ...activeSchema, icon: name },
              })
            }}
            onColorChange={(colorId: IconColorId) => {
              patchActiveSpaceSchema({ icon_color: colorId })
              void updateSpace(activeSpace.id, {
                schema: { ...activeSchema, icon_color: colorId },
              })
            }}
            customTrigger={
              <LucideIcon name={spaceIconName} className={`h-4 w-4 ${spaceIconColor.textColor}`} />
            }
          />
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              const trimmed = titleDraft.trim()
              if (!trimmed) {
                setTitleDraft(activeSpace.title ?? '')
                return
              }
              if (trimmed !== activeSpace.title) {
                useSpacesStore.setState((s) => ({
                  spaces: s.spaces.map((sp) =>
                    sp.id === activeSpace.id ? { ...sp, title: trimmed } : sp,
                  ),
                }))
                void updateSpace(activeSpace.id, { title: trimmed })
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            className="min-w-0 flex-1 rounded-md bg-[var(--color-secondary)] px-2 py-0.5 text-sm font-medium text-[var(--foreground)] outline-none"
            aria-label="Space name"
          />
          <button
            type="button"
            onClick={() => {
              if (schemaEditorOpen) {
                closeCustomizePanel()
              } else {
                openCustomizeFromToolbar('main')
              }
            }}
            className={`shrink-0 rounded p-1 transition-colors ${
              schemaEditorOpen
                ? 'text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            title="Settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
          <button
            ref={moreMenuBtnRef}
            type="button"
            onClick={() => {
              if (moreMenuOpen) {
                setMoreMenuOpen(false)
              } else {
                if (dropdownRef.current) {
                  const dr = dropdownRef.current.getBoundingClientRect()
                  const btnR = moreMenuBtnRef.current?.getBoundingClientRect()
                  const menuW = 180
                  let left = dr.right + 6
                  if (left + menuW > window.innerWidth - 8) {
                    left = dr.left - menuW - 6
                  }
                  setMoreMenuPos({ top: btnR?.top ?? dr.top, left })
                }
                setMoreMenuOpen(true)
              }
            }}
            className="shrink-0 rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
            title="More"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="max-h-[320px] overflow-y-auto px-3 py-2">
          {[...switcherTree.byCampaign.entries()].map(([cId, { campaign, spaces: cSpaces }]) => (
            <SwitcherSection
              key={cId}
              label={campaign.name}
              icon={<FolderKanban className="h-3.5 w-3.5" />}
              sectionSpaces={cSpaces}
              activeSpaceId={activeSpaceId}
              expanded={expandedSwitcherIds.has(cId)}
              onToggle={() =>
                setExpandedSwitcherIds((prev) => {
                  const next = new Set(prev)
                  if (next.has(cId)) next.delete(cId)
                  else next.add(cId)
                  return next
                })
              }
              onSelect={(id) => {
                setActiveSpace(id)
                setSwitcherOpen(false)
              }}
            />
          ))}

          {switcherTree.byCampaign.size === 0 && (
            <p className="py-3 text-center text-xs text-[var(--color-muted-foreground)]">
              No spaces yet
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
