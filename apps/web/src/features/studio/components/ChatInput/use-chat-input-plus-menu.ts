import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { positionFloatingMenuFromAnchorRect } from '../../utils/floating-menu-anchor'
import {
  PLUS_MENU_GAP,
  PLUS_MENU_HEIGHT_CAP,
  PLUS_MENU_HEIGHT_ESTIMATE,
  PLUS_MENU_WIDTH,
  PLUS_SUBMENU_CLOSE_DELAY_MS,
  PLUS_SUBMENU_GAP,
} from './chat-input-constants'
import type { ComposerPlusInfoCard, ComposerPlusSubmenu } from './chat-input-policy'

const VIEWPORT_MARGIN = 8

export function useChatInputPlusMenu() {
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [plusMenuPos, setPlusMenuPos] = useState({ top: 0, left: 0 })
  const [plusSubmenu, setPlusSubmenu] = useState<ComposerPlusSubmenu>(null)
  const [plusSubmenuPos, setPlusSubmenuPos] = useState({ top: 0, left: 0 })
  const [plusInfoCard, setPlusInfoCard] = useState<ComposerPlusInfoCard | null>(null)
  const plusButtonRef = useRef<HTMLButtonElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)
  const plusSubmenuRef = useRef<HTMLDivElement>(null)
  const plusSubmenuAnchorRefs = useRef<
    Record<Exclude<ComposerPlusSubmenu, null>, HTMLButtonElement | null>
  >({
    space: null,
    files: null,
    attach: null,
    integrations: null,
    skills: null,
    access: null,
  })
  const plusSubmenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePlusMenuPosition = useCallback(() => {
    if (!plusButtonRef.current) return
    const rect = plusButtonRef.current.getBoundingClientRect()
    const measured = plusMenuRef.current?.offsetHeight
    const menuHeight = Math.min(
      measured && measured > 0 ? measured : PLUS_MENU_HEIGHT_ESTIMATE,
      PLUS_MENU_HEIGHT_CAP,
    )
    const { top, left } = positionFloatingMenuFromAnchorRect(rect, {
      menuWidth: PLUS_MENU_WIDTH,
      menuHeight,
      gap: PLUS_MENU_GAP,
      viewportMargin: VIEWPORT_MARGIN,
    })
    const nextPosition = { top, left }
    setPlusMenuPos((prev) =>
      prev.top === nextPosition.top && prev.left === nextPosition.left ? prev : nextPosition,
    )
  }, [])

  const updatePlusSubmenuPosition = useCallback((submenu: Exclude<ComposerPlusSubmenu, null>) => {
    const anchor = plusSubmenuAnchorRefs.current[submenu]
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const menuWidth =
      submenu === 'access' || submenu === 'integrations' || submenu === 'space' ? 280 : 240
    const fallbackHeight =
      submenu === 'access' || submenu === 'skills' ? 360 : submenu === 'space' ? 320 : 280
    const measured = plusSubmenuRef.current?.offsetHeight
    const menuHeight = Math.min(
      measured && measured > 0 ? measured : fallbackHeight,
      window.innerHeight - VIEWPORT_MARGIN * 2,
    )
    const openRight =
      rect.right + PLUS_SUBMENU_GAP + menuWidth + VIEWPORT_MARGIN <= window.innerWidth
    const left = openRight
      ? rect.right + PLUS_SUBMENU_GAP
      : Math.max(VIEWPORT_MARGIN, rect.left - menuWidth - PLUS_SUBMENU_GAP)
    const bottomAlignedTop = rect.bottom - menuHeight
    const top = Math.min(
      Math.max(VIEWPORT_MARGIN, bottomAlignedTop),
      Math.max(VIEWPORT_MARGIN, window.innerHeight - menuHeight - VIEWPORT_MARGIN),
    )
    setPlusSubmenuPos((prev) => (prev.top === top && prev.left === left ? prev : { top, left }))
  }, [])

  const closePlusMenu = useCallback(() => {
    if (plusSubmenuCloseTimerRef.current) {
      clearTimeout(plusSubmenuCloseTimerRef.current)
      plusSubmenuCloseTimerRef.current = null
    }
    setPlusMenuOpen(false)
    setPlusSubmenu(null)
    setPlusInfoCard(null)
  }, [])

  const togglePlusMenu = useCallback(() => {
    setPlusMenuOpen((prev) => !prev)
    setPlusSubmenu(null)
    setPlusInfoCard(null)
  }, [])

  const cancelPlusSubmenuClose = useCallback(() => {
    if (!plusSubmenuCloseTimerRef.current) return
    clearTimeout(plusSubmenuCloseTimerRef.current)
    plusSubmenuCloseTimerRef.current = null
  }, [])

  const schedulePlusSubmenuClose = useCallback(() => {
    cancelPlusSubmenuClose()
    plusSubmenuCloseTimerRef.current = setTimeout(() => {
      setPlusSubmenu(null)
      setPlusInfoCard(null)
      plusSubmenuCloseTimerRef.current = null
    }, PLUS_SUBMENU_CLOSE_DELAY_MS)
  }, [cancelPlusSubmenuClose])

  const openPlusSubmenu = useCallback(
    (submenu: Exclude<ComposerPlusSubmenu, null>) => {
      cancelPlusSubmenuClose()
      setPlusSubmenu(submenu)
      setPlusInfoCard(null)
      requestAnimationFrame(() => updatePlusSubmenuPosition(submenu))
    },
    [cancelPlusSubmenuClose, updatePlusSubmenuPosition],
  )

  const showPlusInfoCard = useCallback(
    (target: HTMLElement, title: string, description: string) => {
      const rect = target.getBoundingClientRect()
      const cardWidth = 280
      const estimatedCardHeight = 132
      const gap = 8
      const left =
        rect.right + gap + cardWidth + VIEWPORT_MARGIN <= window.innerWidth
          ? rect.right + gap
          : Math.max(VIEWPORT_MARGIN, rect.left - cardWidth - gap)
      const top = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.top + rect.height / 2 - estimatedCardHeight / 2),
        Math.max(VIEWPORT_MARGIN, window.innerHeight - estimatedCardHeight - VIEWPORT_MARGIN),
      )
      setPlusInfoCard({ title, description, top, left })
    },
    [],
  )

  const clearPlusInfoCard = useCallback(() => setPlusInfoCard(null), [])

  useLayoutEffect(() => {
    if (!plusMenuOpen) return
    updatePlusMenuPosition()
  }, [plusMenuOpen, updatePlusMenuPosition])

  useLayoutEffect(() => {
    if (!plusSubmenu) return
    updatePlusSubmenuPosition(plusSubmenu)
  }, [plusSubmenu, updatePlusSubmenuPosition])

  useLayoutEffect(() => {
    if (!plusSubmenu || typeof ResizeObserver === 'undefined') return
    const node = plusSubmenuRef.current
    if (!node) return

    let frame = 0
    const reposition = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        updatePlusSubmenuPosition(plusSubmenu)
      })
    }
    const observer = new ResizeObserver(reposition)
    observer.observe(node)
    reposition()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [plusSubmenu, updatePlusSubmenuPosition])

  useEffect(() => {
    if (!plusMenuOpen) return
    const reposition = () => {
      updatePlusMenuPosition()
      if (plusSubmenu) updatePlusSubmenuPosition(plusSubmenu)
    }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [plusMenuOpen, plusSubmenu, updatePlusMenuPosition, updatePlusSubmenuPosition])

  useEffect(() => {
    return () => {
      if (plusSubmenuCloseTimerRef.current) {
        clearTimeout(plusSubmenuCloseTimerRef.current)
        plusSubmenuCloseTimerRef.current = null
      }
    }
  }, [])

  return {
    plusMenuOpen,
    setPlusMenuOpen,
    plusMenuPos,
    plusSubmenu,
    setPlusSubmenu,
    plusSubmenuPos,
    plusInfoCard,
    plusButtonRef,
    plusMenuRef,
    plusSubmenuRef,
    plusSubmenuAnchorRefs,
    updatePlusSubmenuPosition,
    closePlusMenu,
    togglePlusMenu,
    cancelPlusSubmenuClose,
    schedulePlusSubmenuClose,
    openPlusSubmenu,
    showPlusInfoCard,
    clearPlusInfoCard,
  }
}
