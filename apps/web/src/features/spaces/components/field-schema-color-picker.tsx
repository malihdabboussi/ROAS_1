'use client'

import type { RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ColorPickerPanelStandalone } from '@/components/ui/ColorPicker'
import {
  ColorPickerPopover,
  initialTagPanelValueFromOption,
  MAX_CUSTOM_TAG_SWATCHES,
  positionTagFullPickerNextToPresets,
  shouldSaveAsNewCustom,
} from './cells/field-color-presets-popover'

export interface FieldSchemaColorPickerProps {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  value: string | undefined
  onChange: (color: string) => void
  customSwatches: string[]
  onCustomSwatchesChange?: (swatches: string[]) => void
}

/**
 * Same tag color UX as `MultiSelectCell`: preset glass grid, persisted custom swatches,
 * dashed + opens `ColorPickerPanelStandalone` (solid + gradient) beside the presets panel.
 */
export function FieldSchemaColorPicker({
  anchorRef,
  open,
  onClose,
  value,
  onChange,
  customSwatches,
  onCustomSwatchesChange,
}: FieldSchemaColorPickerProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const colorMenuRef = useRef<HTMLDivElement>(null)
  const tagFullPickerRef = useRef<HTMLDivElement>(null)
  const [tagThemePos, setTagThemePos] = useState<{ top: number; left: number } | null>(null)
  const [tagPanelValue, setTagPanelValue] = useState('#6366f1')
  const tagPanelValueRef = useRef(tagPanelValue)
  tagPanelValueRef.current = tagPanelValue
  const openFullPanelPendingCommitRef = useRef(false)

  const tryCommitCustomFromFullPanel = useCallback(() => {
    if (!openFullPanelPendingCommitRef.current) return
    openFullPanelPendingCommitRef.current = false
    const v = tagPanelValueRef.current.trim()
    if (!shouldSaveAsNewCustom(v, customSwatches)) return
    const next = [...customSwatches, v].slice(-MAX_CUSTOM_TAG_SWATCHES)
    onCustomSwatchesChange?.(next)
  }, [customSwatches, onCustomSwatchesChange])

  const updatePosition = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const menuW = 220
    const left = Math.min(Math.max(8, r.left), window.innerWidth - menuW - 8)
    setPos({ top: r.bottom + 4, left })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) {
      setTagThemePos(null)
      openFullPanelPendingCommitRef.current = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (tagThemePos) {
        e.stopPropagation()
        e.preventDefault()
        tryCommitCustomFromFullPanel()
        setTagThemePos(null)
        return
      }
      e.stopPropagation()
      e.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', handleKey, true)
    return () => document.removeEventListener('keydown', handleKey, true)
  }, [open, tagThemePos, tryCommitCustomFromFullPanel, onClose])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (tagFullPickerRef.current?.contains(t)) return

      if (tagThemePos) {
        tryCommitCustomFromFullPanel()
        setTagThemePos(null)
        if (colorMenuRef.current?.contains(t) || anchorRef.current?.contains(t)) {
          return
        }
        onClose()
        return
      }

      if (colorMenuRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return
      onClose()
    }
    const id = setTimeout(() => {
      document.addEventListener('mousedown', onDown, true)
    }, 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', onDown, true)
    }
  }, [open, tagThemePos, tryCommitCustomFromFullPanel, onClose, anchorRef])

  if (!open || typeof document === 'undefined') return null

  return (
    <>
      {createPortal(
        <ColorPickerPopover
          ref={colorMenuRef}
          top={pos.top}
          left={pos.left}
          customSwatches={customSwatches}
          onSelect={(c) => {
            if (tagThemePos) tryCommitCustomFromFullPanel()
            setTagThemePos(null)
            onChange(c)
          }}
          onOpenFullPicker={() => {
            openFullPanelPendingCommitRef.current = true
            setTagPanelValue(initialTagPanelValueFromOption(value))
            const menu = colorMenuRef.current
            if (!menu) return
            setTagThemePos(positionTagFullPickerNextToPresets(menu.getBoundingClientRect()))
          }}
        />,
        document.body,
      )}
      {tagThemePos &&
        createPortal(
          <div
            ref={tagFullPickerRef}
            className="fixed z-[100001]"
            style={{ top: tagThemePos.top, left: tagThemePos.left }}
          >
            <ColorPickerPanelStandalone
              value={tagPanelValue}
              onChange={(v) => {
                setTagPanelValue(v)
                onChange(v)
              }}
              allowGradient
            />
          </div>,
          document.body,
        )}
    </>
  )
}
