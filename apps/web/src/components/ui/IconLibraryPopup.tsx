'use client'

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, Search, X } from 'lucide-react'
import { searchIcons } from '@/lib/data/icon-library'
import { HUB_DOCK_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { getIconColor, ICON_COLORS, LucideIcon, type IconColorId } from './icon-picker-shared'

interface IconLibraryPopupProps {
  open: boolean
  onClose: () => void
  /** Element used to compute the popup position. */
  anchorRef: RefObject<HTMLElement | null>
  /** Element(s) whose clicks should NOT close the popup (e.g. the toggle trigger). Defaults to `anchorRef`. */
  triggerRef?: RefObject<HTMLElement | null>
  value: string
  onSelect: (iconName: string) => void
  color?: string
  onColorChange?: (colorId: IconColorId) => void
  /** `below` (default): under the anchor. `right`: to the right. `above`: always above the anchor. */
  placement?: 'below' | 'right' | 'above'
  /** When `placement='below'`, prefer placing above the anchor when room exists. */
  preferAbove?: boolean
  /** Clicks matching this selector do not close the popup (portaled parent menus). */
  outsideClickIgnoreSelector?: string
  zIndexClass?: string
}

const POPUP_WIDTH_PX = 300
const POPUP_HEIGHT_PX = 400
const POPUP_MARGIN_PX = 8
const POPUP_GAP_PX = 4

export function IconLibraryPopup({
  open,
  onClose,
  anchorRef,
  triggerRef,
  value,
  onSelect,
  color,
  onColorChange,
  placement = 'below',
  preferAbove = false,
  outsideClickIgnoreSelector,
  zIndexClass = 'z-[100000]',
}: IconLibraryPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const activeColor = getIconColor(color)

  const filteredIcons = useMemo(() => searchIcons(searchQuery, true), [searchQuery])

  const groupedIcons = useMemo(() => {
    const groups: Record<string, typeof filteredIcons> = {}
    for (const item of filteredIcons) {
      ;(groups[item.category] ??= []).push(item)
    }
    return groups
  }, [filteredIcons])

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
    if (!open) setSearchQuery('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (popupRef.current?.contains(target)) return
      const guard = triggerRef ?? anchorRef
      if (guard.current?.contains(target)) return
      if (
        outsideClickIgnoreSelector &&
        target instanceof Element &&
        target.closest(outsideClickIgnoreSelector)
      ) {
        return
      }
      onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose, triggerRef, anchorRef, outsideClickIgnoreSelector])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    function compute() {
      const el = anchorRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight

      let left: number
      let top: number

      if (placement === 'above') {
        left = rect.left
        if (left + POPUP_WIDTH_PX + POPUP_MARGIN_PX > vw) {
          left = Math.max(POPUP_MARGIN_PX, vw - POPUP_WIDTH_PX - POPUP_MARGIN_PX)
        }
        if (left < POPUP_MARGIN_PX) left = POPUP_MARGIN_PX
        top = rect.top - POPUP_HEIGHT_PX - POPUP_GAP_PX
        if (top < POPUP_MARGIN_PX) top = rect.bottom - POPUP_HEIGHT_PX - POPUP_GAP_PX
      } else if (placement === 'right') {
        left = rect.right + POPUP_GAP_PX
        if (left + POPUP_WIDTH_PX + POPUP_MARGIN_PX > vw) {
          left = rect.left - POPUP_WIDTH_PX - POPUP_GAP_PX
        }
        if (left < POPUP_MARGIN_PX) left = POPUP_MARGIN_PX
        top = rect.top
        if (top + POPUP_HEIGHT_PX + POPUP_MARGIN_PX > vh) {
          top = Math.max(POPUP_MARGIN_PX, vh - POPUP_HEIGHT_PX - POPUP_MARGIN_PX)
        }
      } else {
        left = rect.left
        if (left + POPUP_WIDTH_PX + POPUP_MARGIN_PX > vw) {
          left = Math.max(POPUP_MARGIN_PX, vw - POPUP_WIDTH_PX - POPUP_MARGIN_PX)
        }
        if (left < POPUP_MARGIN_PX) left = POPUP_MARGIN_PX
        const aboveTop = rect.top - POPUP_HEIGHT_PX - POPUP_GAP_PX
        const belowTop = rect.bottom + POPUP_GAP_PX
        if (preferAbove) {
          top = aboveTop >= POPUP_MARGIN_PX ? aboveTop : belowTop
          if (top + POPUP_HEIGHT_PX + POPUP_MARGIN_PX > vh) {
            top = Math.max(POPUP_MARGIN_PX, vh - POPUP_HEIGHT_PX - POPUP_MARGIN_PX)
          }
        } else {
          top = belowTop
          if (top + POPUP_HEIGHT_PX + POPUP_MARGIN_PX > vh) {
            top = Math.max(POPUP_MARGIN_PX, aboveTop)
          }
        }
      }
      setPos({ top, left })
    }
    compute()
    const onScroll = () => compute()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, anchorRef, placement, preferAbove])

  const handleSelect = (iconName: string) => {
    onSelect(iconName)
    setSearchQuery('')
  }

  if (!open || !pos || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={popupRef}
      data-icon-picker-popup
      {...{ [HUB_DOCK_PORTAL_GUARD]: '' }}
      className={`surface-card fixed ${zIndexClass} flex max-h-[400px] w-[300px] flex-col overflow-hidden rounded-xl border border-[var(--color-border)] shadow-2xl`}
      style={{ top: pos.top, left: pos.left }}
      onClick={(e: ReactMouseEvent) => e.stopPropagation()}
      onMouseDown={(e: ReactMouseEvent) => e.stopPropagation()}
    >
      {onColorChange && (
        <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] px-3 py-2">
          {ICON_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              onClick={() => onColorChange(c.id)}
              className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                c.id === 'default'
                  ? 'border border-[var(--color-border)] bg-[var(--color-secondary)]'
                  : c.glassClass
              }`}
            >
              {activeColor.id === c.id && <Check className="h-2.5 w-2.5" />}
            </button>
          ))}
        </div>
      )}

      <div className="p-2">
        <div className="input-glass flex items-center gap-2 rounded-lg px-3 py-1">
          <Search className="icon-sm flex-shrink-0 text-[var(--color-muted-foreground)]" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search icons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="typo-caption flex-1 border-none bg-transparent text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              <X className="icon-xs" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {Object.keys(groupedIcons).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(groupedIcons).map(([category, icons]) => (
              <div key={category}>
                <div className="typo-caption mb-1 px-1 font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  {category} <span className="opacity-50">({icons.length})</span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {icons
                    .slice(0, category === 'All Icons' && !searchQuery ? 48 : icons.length)
                    .map(({ icon }) => {
                      const isSelected = icon.name === value
                      return (
                        <button
                          key={icon.name}
                          type="button"
                          onClick={() => handleSelect(icon.name)}
                          title={icon.name}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                            isSelected
                              ? `${activeColor.glassClass} ${activeColor.textColor}`
                              : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]'
                          }`}
                        >
                          <LucideIcon name={icon.name} className="icon-sm" />
                        </button>
                      )
                    })}
                </div>
                {category === 'All Icons' && !searchQuery && icons.length > 48 && (
                  <p className="typo-caption mt-1 px-1 text-[var(--color-muted-foreground)] opacity-70">
                    Search to see all {icons.length} icons...
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-muted-foreground typo-caption">No icons match your search.</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
