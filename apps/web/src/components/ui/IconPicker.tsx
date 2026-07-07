'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { getIconColor, ICON_COLORS, LucideIcon, type IconColorId } from './icon-picker-shared'
import { IconLibraryPopup } from './IconLibraryPopup'

export { ICON_COLORS, LucideIcon, getIconColor }
export type { IconColorId }

interface IconPickerProps {
  value: string
  onChange: (iconName: string) => void
  /** Lucide color ID from ICON_COLORS. Defaults to 'default'. */
  color?: string
  onColorChange?: (colorId: IconColorId) => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  /** Renders in place of the default bordered control; the wrapper opens the library on click. */
  customTrigger?: ReactNode
  /** Anchor the popup above the trigger when room exists (e.g. when used inside a header dropdown). */
  preferAbove?: boolean
  placement?: 'below' | 'right' | 'above'
  /** Popup position anchor (e.g. full menu row). Defaults to the trigger button. */
  positionAnchorRef?: RefObject<HTMLElement | null>
  /** Close library after picking an icon. Default true. */
  closeOnSelect?: boolean
  /** Controlled open state (e.g. row menu Escape closes library first). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Full-width row trigger (paid ads menu row only). Default: compact icon control. */
  triggerFullWidth?: boolean
  /** Extra outside-click ignore selector for portaled menus (e.g. `[data-paid-ads-row-menu]`). */
  outsideClickIgnoreSelector?: string
  /** Popup z-index class tailwind token. Default stacks with dropdown menus. */
  popupZIndexClass?: string
}

export function IconPicker({
  value,
  onChange,
  color,
  onColorChange,
  size = 'md',
  disabled = false,
  className,
  customTrigger,
  preferAbove = false,
  placement = 'below',
  positionAnchorRef,
  closeOnSelect = true,
  open: openControlled,
  onOpenChange,
  triggerFullWidth = false,
  outsideClickIgnoreSelector,
  popupZIndexClass = 'z-[100000]',
}: IconPickerProps) {
  const [openInternal, setOpenInternal] = useState(false)
  const isOpen = openControlled ?? openInternal

  const setOpen = (next: boolean) => {
    if (openControlled === undefined) setOpenInternal(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (openControlled === undefined) onOpenChange?.(openInternal)
  }, [openControlled, openInternal, onOpenChange])
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const activeColor = getIconColor(color)

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }[size]

  const iconSizeClasses = {
    sm: 'icon-xs',
    md: 'icon-sm',
    lg: 'icon-sm',
  }[size]

  const handleSelect = (iconName: string) => {
    onChange(iconName)
    if (closeOnSelect) setOpen(false)
  }

  const triggerBtnClass = triggerFullWidth
    ? 'flex w-full items-center justify-center rounded-md p-0.5 transition-colors hover:bg-[var(--color-hover-subtle)] disabled:cursor-not-allowed disabled:opacity-50'
    : 'inline-flex shrink-0 items-center justify-center rounded-md p-0.5 transition-colors hover:bg-[var(--color-hover-subtle)] disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div
      ref={containerRef}
      className={`relative ${triggerFullWidth ? 'flex w-full' : 'inline-flex'} ${className ?? ''}`}
    >
      {customTrigger != null ? (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen(!isOpen)
          }}
          className={triggerBtnClass}
          aria-label="Change icon"
        >
          {customTrigger}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen(!isOpen)
          }}
          className={`${activeColor.glassClass} flex items-center justify-center rounded-lg border border-[var(--color-border)] transition-all hover:border-[var(--color-muted-foreground)] ${sizeClasses} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <LucideIcon name={value} className={`${iconSizeClasses} ${activeColor.textColor}`} />
        </button>
      )}

      <IconLibraryPopup
        open={isOpen}
        onClose={() => setOpen(false)}
        anchorRef={positionAnchorRef ?? triggerRef}
        triggerRef={triggerRef}
        value={value}
        onSelect={handleSelect}
        color={color}
        onColorChange={onColorChange}
        placement={placement}
        preferAbove={placement === 'above' ? true : preferAbove}
        outsideClickIgnoreSelector={outsideClickIgnoreSelector}
        zIndexClass={popupZIndexClass}
      />
    </div>
  )
}
