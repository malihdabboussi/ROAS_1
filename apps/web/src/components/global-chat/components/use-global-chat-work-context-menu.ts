'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PLUS_MENU_GAP } from '@/features/studio/components/ChatInput/chat-input-constants'
import { positionFloatingMenuFromAnchorRect } from '@/lib/ui/floating-menu-anchor'

const WORK_MENU_WIDTH = 200
const WORK_MENU_HEIGHT_CAP = 280
const SPACE_SUBMENU_WIDTH = 320
const SPACE_SUBMENU_HEIGHT_CAP = 320
const VIEWPORT_MARGIN = 8
const HOVER_CLOSE_MS = 150

function samePosition(a: { top: number; left: number }, b: { top: number; left: number }) {
  return a.top === b.top && a.left === b.left
}

export function useGlobalChatWorkContextMenu() {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [spacesSubmenuOpen, setSpacesSubmenuOpen] = useState(false)
  const [spacesSubmenuPos, setSpacesSubmenuPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const spacesRowRef = useRef<HTMLDivElement>(null)
  const spacesSubmenuRef = useRef<HTMLDivElement>(null)
  const spacesCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const measured = menuRef.current?.offsetHeight
    const menuHeight = Math.min(
      measured && measured > 0 ? measured : WORK_MENU_HEIGHT_CAP,
      WORK_MENU_HEIGHT_CAP,
    )
    const nextPosition = positionFloatingMenuFromAnchorRect(rect, {
      menuWidth: WORK_MENU_WIDTH,
      menuHeight,
      gap: PLUS_MENU_GAP,
      viewportMargin: VIEWPORT_MARGIN,
    })
    setMenuPos((prev) => (samePosition(prev, nextPosition) ? prev : nextPosition))
  }, [])

  const positionSpacesSubmenu = useCallback(() => {
    if (!spacesRowRef.current || !menuRef.current) return
    const rowRect = spacesRowRef.current.getBoundingClientRect()
    const menuRect = menuRef.current.getBoundingClientRect()
    const gap = 4
    const rightEdge = menuRect.right + gap
    const fitsRight = rightEdge + SPACE_SUBMENU_WIDTH + VIEWPORT_MARGIN <= window.innerWidth
    const left = fitsRight
      ? rightEdge
      : Math.max(VIEWPORT_MARGIN, menuRect.left - SPACE_SUBMENU_WIDTH - gap)
    const measured = spacesSubmenuRef.current?.offsetHeight
    const submenuHeight = Math.min(
      measured && measured > 0 ? measured : SPACE_SUBMENU_HEIGHT_CAP,
      SPACE_SUBMENU_HEIGHT_CAP,
    )
    const top = Math.min(
      Math.max(VIEWPORT_MARGIN, rowRect.top),
      Math.max(VIEWPORT_MARGIN, window.innerHeight - submenuHeight - VIEWPORT_MARGIN),
    )
    const nextPosition = { top, left }
    setSpacesSubmenuPos((prev) => (samePosition(prev, nextPosition) ? prev : nextPosition))
  }, [])

  const clearSpacesCloseTimer = useCallback(() => {
    if (!spacesCloseTimerRef.current) return
    clearTimeout(spacesCloseTimerRef.current)
    spacesCloseTimerRef.current = null
  }, [])

  const scheduleSpacesSubmenuClose = useCallback(() => {
    clearSpacesCloseTimer()
    spacesCloseTimerRef.current = setTimeout(() => {
      setSpacesSubmenuOpen(false)
      spacesCloseTimerRef.current = null
    }, HOVER_CLOSE_MS)
  }, [clearSpacesCloseTimer])

  const openSpacesSubmenu = useCallback(() => {
    clearSpacesCloseTimer()
    setSpacesSubmenuOpen(true)
    positionSpacesSubmenu()
  }, [clearSpacesCloseTimer, positionSpacesSubmenu])

  const toggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setSpacesSubmenuOpen(false)
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
  }, [open, updateMenuPosition])

  useLayoutEffect(() => {
    if (!spacesSubmenuOpen) return
    positionSpacesSubmenu()
  }, [spacesSubmenuOpen, positionSpacesSubmenu])

  useEffect(() => {
    if (!open) {
      setSpacesSubmenuOpen(false)
      return
    }
    const reposition = () => updateMenuPosition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, updateMenuPosition])

  useEffect(() => () => clearSpacesCloseTimer(), [clearSpacesCloseTimer])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      if (spacesSubmenuRef.current?.contains(target)) return
      close()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [close, open])

  return {
    open,
    menuPos,
    spacesSubmenuOpen,
    spacesSubmenuPos,
    buttonRef,
    menuRef,
    spacesRowRef,
    spacesSubmenuRef,
    toggle,
    close,
    openSpacesSubmenu,
    scheduleSpacesSubmenuClose,
    clearSpacesCloseTimer,
  }
}
