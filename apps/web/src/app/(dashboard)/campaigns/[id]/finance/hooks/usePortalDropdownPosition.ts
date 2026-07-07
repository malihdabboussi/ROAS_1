import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Options {
  open: boolean
  align?: 'left' | 'right'
  offset?: number
  placeAboveWhenTight?: boolean
  estimatedHeight?: number
}

export function usePortalDropdownPosition(options: Options) {
  const {
    open,
    align = 'left',
    offset = 4,
    placeAboveWhenTight = false,
    estimatedHeight = 240,
  } = options
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const placeAbove =
      placeAboveWhenTight &&
      window.innerHeight - rect.bottom < estimatedHeight + offset &&
      rect.top > estimatedHeight + offset
    const top = placeAbove ? rect.top - estimatedHeight - offset : rect.bottom + offset
    const left = align === 'right' ? rect.right : rect.left
    setPos({ top, left, width: rect.width })
  }, [open, align, offset, placeAboveWhenTight, estimatedHeight])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!dropdownRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setPos((prev) => prev)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return { triggerRef, dropdownRef, pos, setPos }
}
