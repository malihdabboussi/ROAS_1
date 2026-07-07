import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  positionModelEditPanelFromMenuAnchor,
  resolveModelPickerMenuAnchorRect,
} from '@/lib/chat/model-picker-edit-panel-position'
import type { ComposerModelEditTooltip } from './composer-model-picker.types'

const VIEWPORT_MARGIN = 8
const MODEL_DROPDOWN_WIDTH = 240
const MODEL_DROPDOWN_HEIGHT_CAP = 360
const MODEL_HOVER_CARD_WIDTH = 280
const MODEL_EDIT_PANEL_WIDTH = 240
const MODEL_EDIT_TOOLTIP_WIDTH = 220
const Z_DROPDOWN = 100000
const Z_EDIT_PANEL = 100001
const Z_HOVER_CARD = 100002
const Z_TOOLTIP = 100003

function consumePointerEvent(event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function positionRightOfAnchor(
  anchorRect: DOMRect,
  rowRect: DOMRect,
  width: number,
  maxHeight = 180,
): { top: number; left: number } {
  const gap = 8
  let left = anchorRect.right + gap
  if (left + width + VIEWPORT_MARGIN > window.innerWidth) {
    left = anchorRect.left - width - gap
  }
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN))
  const top = Math.min(
    Math.max(VIEWPORT_MARGIN, rowRect.top),
    Math.max(VIEWPORT_MARGIN, window.innerHeight - maxHeight - VIEWPORT_MARGIN),
  )
  return { top, left }
}

function positionEditPanelTooltip(
  panelRect: DOMRect,
  rowRect: DOMRect,
  dropdownRect: DOMRect | null,
  width: number,
): { top: number; left: number } {
  const gap = 8
  const top = Math.min(
    Math.max(VIEWPORT_MARGIN, rowRect.top),
    Math.max(VIEWPORT_MARGIN, window.innerHeight - 80 - VIEWPORT_MARGIN),
  )

  const panelLeftOfDropdown = dropdownRect != null && panelRect.right <= dropdownRect.left + 1
  const panelRightOfDropdown = dropdownRect != null && panelRect.left >= dropdownRect.right - 1
  const leftOfPanel = panelRect.left - width - gap
  const rightOfPanel = panelRect.right + gap

  const overlapsDropdown = (left: number) =>
    dropdownRect != null &&
    left < dropdownRect.right + gap &&
    left + width > dropdownRect.left - gap

  let left: number
  if (panelLeftOfDropdown) {
    left = leftOfPanel
  } else if (panelRightOfDropdown) {
    left = rightOfPanel
  } else if (overlapsDropdown(rightOfPanel)) {
    left = leftOfPanel
  } else {
    left = rightOfPanel
  }

  if (left + width + VIEWPORT_MARGIN > window.innerWidth) left = leftOfPanel
  if (left < VIEWPORT_MARGIN) left = rightOfPanel
  if (overlapsDropdown(left)) {
    left = panelLeftOfDropdown || !panelRightOfDropdown ? leftOfPanel : rightOfPanel
  }

  left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN))
  return { top, left }
}

export function useComposerModelPickerPositioning({
  open,
  modelEditId,
  onOutsideClose,
  setModelEditTooltip,
}: {
  open: boolean
  modelEditId: string | null
  onOutsideClose: () => void
  setModelEditTooltip: Dispatch<SetStateAction<ComposerModelEditTooltip | null>>
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const editPanelRef = useRef<HTMLDivElement>(null)
  const hoverCardRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const subscriptionSubmenuRef = useRef<HTMLDivElement>(null)
  const outsideClickBlockerRef = useRef<((event: MouseEvent) => void) | null>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [modelHoverPos, setModelHoverPos] = useState({ top: 0, left: 0 })
  const [modelEditPos, setModelEditPos] = useState({ top: 0, left: 0 })

  const positionDropdown = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.left),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - MODEL_DROPDOWN_WIDTH - VIEWPORT_MARGIN),
    )
    const top = Math.min(
      rect.bottom + 4,
      Math.max(VIEWPORT_MARGIN, window.innerHeight - MODEL_DROPDOWN_HEIGHT_CAP - VIEWPORT_MARGIN),
    )
    setDropdownPos({ top, left })
  }, [])

  const positionModelHoverCard = useCallback((rowEl: HTMLElement) => {
    const rowRect = rowEl.getBoundingClientRect()
    const dropdownRect = dropdownRef.current?.getBoundingClientRect()
    if (!dropdownRect) return
    const { top, left } = positionRightOfAnchor(dropdownRect, rowRect, MODEL_HOVER_CARD_WIDTH)
    setModelHoverPos({ top, left })
  }, [])

  const positionModelEditPanel = useCallback(() => {
    const anchorRect = resolveModelPickerMenuAnchorRect(
      dropdownRef.current?.getBoundingClientRect(),
      subscriptionSubmenuRef.current?.getBoundingClientRect(),
    )
    if (!anchorRect) return
    setModelEditPos(
      positionModelEditPanelFromMenuAnchor(
        anchorRect,
        MODEL_EDIT_PANEL_WIDTH,
        MODEL_DROPDOWN_HEIGHT_CAP,
        VIEWPORT_MARGIN,
      ),
    )
  }, [])

  const showModelEditTooltip = useCallback(
    (rowEl: HTMLElement, text: string) => {
      const position = () => {
        const panelRect = editPanelRef.current?.getBoundingClientRect()
        if (!panelRect) return false
        const rowRect = rowEl.getBoundingClientRect()
        const dropdownRect = dropdownRef.current?.getBoundingClientRect() ?? null
        const { top, left } = positionEditPanelTooltip(
          panelRect,
          rowRect,
          dropdownRect,
          MODEL_EDIT_TOOLTIP_WIDTH,
        )
        setModelEditTooltip({ text, top, left })
        return true
      }
      if (!position()) requestAnimationFrame(() => position())
    },
    [setModelEditTooltip],
  )

  useLayoutEffect(() => {
    if (!open) return
    positionDropdown()
  }, [open, positionDropdown])

  useLayoutEffect(() => {
    if (!modelEditId) return
    positionModelEditPanel()
  }, [modelEditId, positionModelEditPanel])

  useEffect(() => {
    if (!open) return
    const blockNextOutsideClick = () => {
      if (outsideClickBlockerRef.current) {
        window.removeEventListener('click', outsideClickBlockerRef.current, true)
      }
      const handler = (event: MouseEvent) => {
        consumePointerEvent(event)
        window.removeEventListener('click', handler, true)
        outsideClickBlockerRef.current = null
      }
      outsideClickBlockerRef.current = handler
      window.addEventListener('click', handler, true)
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target) ||
        editPanelRef.current?.contains(target) ||
        hoverCardRef.current?.contains(target) ||
        tooltipRef.current?.contains(target) ||
        subscriptionSubmenuRef.current?.contains(target)
      ) {
        return
      }
      consumePointerEvent(event)
      blockNextOutsideClick()
      onOutsideClose()
    }
    window.addEventListener('mousedown', handlePointerDown, true)
    return () => window.removeEventListener('mousedown', handlePointerDown, true)
  }, [onOutsideClose, open])

  return {
    buttonRef,
    dropdownRef,
    editPanelRef,
    hoverCardRef,
    tooltipRef,
    subscriptionSubmenuRef,
    dropdownPos,
    modelHoverPos,
    modelEditPos,
    positionModelHoverCard,
    positionModelEditPanel,
    showModelEditTooltip,
    zIndexes: {
      dropdown: Z_DROPDOWN,
      editPanel: Z_EDIT_PANEL,
      hoverCard: Z_HOVER_CARD,
      tooltip: Z_TOOLTIP,
    },
  }
}
