'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

const SUBMENU_WIDTH = 240

type SubmenuKind = 'move' | 'copy' | 'export' | null

type UseDocMenuDropdownPositionArgs = {
  anchorRef?: RefObject<HTMLElement | null>
  pointerPosition?: { x: number; y: number } | null
  openSubmenu: SubmenuKind
  moveButtonRef: RefObject<HTMLButtonElement | null>
  copyButtonRef: RefObject<HTMLButtonElement | null>
  exportButtonRef: RefObject<HTMLButtonElement | null>
}

export function useDocMenuDropdownPosition({
  anchorRef,
  pointerPosition,
  openSubmenu,
  moveButtonRef,
  copyButtonRef,
  exportButtonRef,
}: UseDocMenuDropdownPositionArgs) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 })
  const [subPos, setSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!dropdownRef.current) return
    const dropRect = dropdownRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8

    if (pointerPosition) {
      let top = pointerPosition.y
      let left = pointerPosition.x + dropRect.width
      if (top + dropRect.height > vh - pad) top = Math.max(pad, vh - dropRect.height - pad)
      if (top < pad) top = pad
      if (left > vw - pad) left = vw - pad
      if (left - dropRect.width < pad) left = pad + dropRect.width
      setPos({ top, left })
      return
    }

    if (!anchorRef?.current) return
    const anchorRect = anchorRef.current.getBoundingClientRect()
    let top = anchorRect.bottom + 4
    if (top + dropRect.height > vh - pad) top = anchorRect.top - dropRect.height - 4
    if (top < pad) top = pad
    const left = anchorRect.right
    setPos({ top, left })
  }, [anchorRef, pointerPosition])

  useLayoutEffect(() => {
    const anchor =
      openSubmenu === 'move'
        ? moveButtonRef.current
        : openSubmenu === 'copy'
          ? copyButtonRef.current
          : openSubmenu === 'export'
            ? exportButtonRef.current
            : null
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let top = rect.top
    let left = rect.right + 4
    if (left + SUBMENU_WIDTH > vw - pad) left = rect.left - SUBMENU_WIDTH - 4
    if (top + 240 > vh - pad) top = Math.max(pad, vh - 240 - pad)
    setSubPos({ top, left })
  }, [openSubmenu, moveButtonRef, copyButtonRef, exportButtonRef])

  return { dropdownRef, pos, subPos, submenuWidth: SUBMENU_WIDTH }
}
