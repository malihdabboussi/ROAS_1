import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { positionFloatingMenuFromAnchorRect } from '../../utils/floating-menu-anchor'
import {
  positionModelEditPanelFromMenuAnchor,
  resolveModelPickerMenuAnchorRect,
} from '../../utils/model-picker-edit-panel-position'
import {
  MODEL_DROPDOWN_HEIGHT_CAP,
  MODEL_DROPDOWN_WIDTH,
  MODEL_EDIT_PANEL_WIDTH,
  MODEL_HOVER_CARD_WIDTH,
  PLUS_MENU_GAP,
} from './chat-input-constants'
import type { ModelHoverTarget } from './chat-input-model-settings'

const VIEWPORT_MARGIN = 8

function samePosition(a: { top: number; left: number }, b: { top: number; left: number }) {
  return a.top === b.top && a.left === b.left
}

export function useChatInputModelMenu({ modelOptionsLength }: { modelOptionsLength: number }) {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [modelDropdownPos, setModelDropdownPos] = useState({ top: 0, left: 0 })
  const modelButtonRef = useRef<HTMLButtonElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const subscriptionSubmenuRef = useRef<HTMLDivElement>(null)
  const modelHoverCardRef = useRef<HTMLDivElement>(null)
  const modelEditPanelRef = useRef<HTMLDivElement>(null)
  const [modelHoverTarget, setModelHoverTarget] = useState<ModelHoverTarget | null>(null)
  const [modelHoverPos, setModelHoverPos] = useState({ top: 0, left: 0 })
  const [modelEditId, setModelEditId] = useState<string | null>(null)
  const [modelEditPos, setModelEditPos] = useState({ top: 0, left: 0 })
  const [modelEditTooltip, setModelEditTooltip] = useState<{
    text: string
    top: number
    left: number
  } | null>(null)

  const updateModelDropdownPosition = useCallback(() => {
    if (!modelButtonRef.current) return
    const rect = modelButtonRef.current.getBoundingClientRect()
    const measured = modelDropdownRef.current?.offsetHeight
    const menuHeight = Math.min(
      measured && measured > 0 ? measured : MODEL_DROPDOWN_HEIGHT_CAP,
      MODEL_DROPDOWN_HEIGHT_CAP,
    )
    const nextPosition = positionFloatingMenuFromAnchorRect(rect, {
      menuWidth: MODEL_DROPDOWN_WIDTH,
      menuHeight,
      gap: PLUS_MENU_GAP,
      viewportMargin: VIEWPORT_MARGIN,
    })
    setModelDropdownPos((prev) => (samePosition(prev, nextPosition) ? prev : nextPosition))
  }, [])

  const positionModelHoverCard = useCallback((rowElement: HTMLElement) => {
    const rowRect = rowElement.getBoundingClientRect()
    const dropdownRect = modelDropdownRef.current?.getBoundingClientRect()
    const anchorRight = dropdownRect?.right ?? rowRect.right
    const gap = 8
    const left =
      anchorRight + gap + MODEL_HOVER_CARD_WIDTH + VIEWPORT_MARGIN <= window.innerWidth
        ? anchorRight + gap
        : Math.max(
            VIEWPORT_MARGIN,
            (dropdownRect?.left ?? rowRect.left) - MODEL_HOVER_CARD_WIDTH - gap,
          )
    const top = Math.min(
      Math.max(VIEWPORT_MARGIN, rowRect.top),
      Math.max(VIEWPORT_MARGIN, window.innerHeight - 180 - VIEWPORT_MARGIN),
    )
    const nextPosition = { top, left }
    setModelHoverPos((prev) => (samePosition(prev, nextPosition) ? prev : nextPosition))
  }, [])

  const positionModelEditPanel = useCallback(() => {
    const anchorRect = resolveModelPickerMenuAnchorRect(
      modelDropdownRef.current?.getBoundingClientRect(),
      subscriptionSubmenuRef.current?.getBoundingClientRect(),
    )
    if (!anchorRect) return
    const nextPosition = positionModelEditPanelFromMenuAnchor(
      anchorRect,
      MODEL_EDIT_PANEL_WIDTH,
      MODEL_DROPDOWN_HEIGHT_CAP,
      VIEWPORT_MARGIN,
    )
    setModelEditPos((prev) => (samePosition(prev, nextPosition) ? prev : nextPosition))
  }, [])

  const openModelEditPanel = useCallback(
    (modelId: string) => {
      setModelEditId(modelId)
      setModelHoverTarget(null)
      positionModelEditPanel()
    },
    [positionModelEditPanel],
  )

  const showModelEditTooltip = useCallback((rowElement: HTMLElement, text: string) => {
    const rowRect = rowElement.getBoundingClientRect()
    const panelRect = modelEditPanelRef.current?.getBoundingClientRect()
    const anchorRight = panelRect?.right ?? rowRect.right
    const gap = 8
    const tooltipWidth = 220
    const left =
      anchorRight + gap + tooltipWidth + VIEWPORT_MARGIN <= window.innerWidth
        ? anchorRight + gap
        : Math.max(VIEWPORT_MARGIN, (panelRect?.left ?? rowRect.left) - tooltipWidth - gap)
    const top = Math.min(
      Math.max(VIEWPORT_MARGIN, rowRect.top),
      Math.max(VIEWPORT_MARGIN, window.innerHeight - 80 - VIEWPORT_MARGIN),
    )
    const nextTooltip = { text, top, left }
    setModelEditTooltip((prev) =>
      prev &&
      prev.text === nextTooltip.text &&
      prev.top === nextTooltip.top &&
      prev.left === nextTooltip.left
        ? prev
        : nextTooltip,
    )
  }, [])

  const clearModelEditTooltip = useCallback(() => setModelEditTooltip(null), [])

  const toggleModelDropdown = useCallback(() => {
    setModelDropdownOpen((prev) => {
      return !prev
    })
  }, [modelOptionsLength])

  const closeModelDropdown = useCallback(() => {
    setModelDropdownOpen(false)
  }, [])

  useLayoutEffect(() => {
    if (!modelDropdownOpen) return
    updateModelDropdownPosition()
  }, [modelDropdownOpen, modelOptionsLength, updateModelDropdownPosition])

  useEffect(() => {
    if (!modelDropdownOpen) return
    const reposition = () => updateModelDropdownPosition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [modelDropdownOpen, updateModelDropdownPosition])

  useEffect(() => {
    if (!modelDropdownOpen) {
      setModelHoverTarget(null)
      setModelEditId(null)
      setModelEditTooltip(null)
    }
  }, [modelDropdownOpen])

  useEffect(() => {
    if (!modelEditId) setModelEditTooltip(null)
  }, [modelEditId])

  useLayoutEffect(() => {
    if (!modelEditId) return
    positionModelEditPanel()
  }, [modelEditId, positionModelEditPanel])

  return {
    modelDropdownOpen,
    setModelDropdownOpen,
    modelDropdownPos,
    modelButtonRef,
    modelDropdownRef,
    subscriptionSubmenuRef,
    modelHoverCardRef,
    modelEditPanelRef,
    modelHoverTarget,
    setModelHoverTarget,
    modelHoverPos,
    modelEditId,
    modelEditPos,
    modelEditTooltip,
    toggleModelDropdown,
    closeModelDropdown,
    positionModelHoverCard,
    openModelEditPanel,
    showModelEditTooltip,
    clearModelEditTooltip,
  }
}
