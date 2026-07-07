'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ColorPickerPanelStandalone } from '@/components/ui/ColorPicker'
import Switch from '@/components/ui/forms/switch'
import {
  ColorPickerPopover,
  getProgressBarCellFill,
  initialTagPanelValueFromOption,
  positionTagFullPickerNextToPresets,
  resolveProgressBarFill,
  swatchVisualStyle,
} from '@/lib/ui/field-color-presets'
import { cn } from '@/lib/utils/cn'

function pctFromSubtasks(total: number, done: number): number {
  if (total <= 0) return 0
  return Math.round((done / total) * 100)
}

function effectiveFillKey(
  total: number,
  done: number,
  userFill: string | null | undefined,
): string {
  if (userFill != null && userFill !== '') return userFill
  return total > 0 && done >= total ? 'emerald' : 'blue'
}

export function MissionListProgressCell({
  total,
  done,
  showNumber,
  barFill,
  configurable,
  onPatch,
}: {
  total: number
  done: number
  showNumber: boolean
  barFill: string | null
  configurable: boolean
  onPatch?: (patch: {
    progress_show_number?: boolean
    progress_bar_fill?: string | null
  }) => void | Promise<void>
}) {
  const pct = pctFromSubtasks(total, done)
  const displayFill = effectiveFillKey(total, done, barFill)
  const cellFill = getProgressBarCellFill(displayFill)
  const showCount = showNumber && total > 0

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [barColorPicker, setBarColorPicker] = useState<{ top: number; left: number } | null>(null)
  const [tagThemePos, setTagThemePos] = useState<{ top: number; left: number } | null>(null)
  const [tagPanelValue, setTagPanelValue] = useState('#6366f1')
  const [draftShowNumber, setDraftShowNumber] = useState(showNumber)
  const [draftBarFill, setDraftBarFill] = useState<string | null>(barFill)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const colorMenuRef = useRef<HTMLDivElement>(null)
  const barColorTriggerRef = useRef<HTMLButtonElement>(null)
  const tagFullPickerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 220
    const maxLeft = window.innerWidth - dropW - 8
    setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, maxLeft)) })
  }, [open])

  useEffect(() => {
    if (open) {
      setDraftShowNumber(showNumber)
      setDraftBarFill(barFill)
    }
  }, [open, showNumber, barFill])

  useEffect(() => {
    if (open) return
    setBarColorPicker(null)
    setTagThemePos(null)
  }, [open])

  useEffect(() => {
    if (!barColorPicker) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (tagFullPickerRef.current?.contains(t)) return
      if (tagThemePos) {
        setTagThemePos(null)
        if (
          colorMenuRef.current?.contains(t) ||
          dropdownRef.current?.contains(t) ||
          triggerRef.current?.contains(t)
        ) {
          return
        }
        setBarColorPicker(null)
        return
      }
      if (colorMenuRef.current?.contains(t)) return
      if (barColorTriggerRef.current?.contains(t)) return
      setBarColorPicker(null)
    }
    const id = setTimeout(() => document.addEventListener('mousedown', onDown, true), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', onDown, true)
    }
  }, [barColorPicker, tagThemePos])

  useEffect(() => {
    if (!open) return
    const eventInsideMenuUi = (e: MouseEvent) => {
      for (const node of e.composedPath()) {
        if (node === document || node === window) continue
        if (!(node instanceof Element)) continue
        if (dropdownRef.current?.contains(node)) return true
        if (triggerRef.current?.contains(node)) return true
        if (colorMenuRef.current?.contains(node)) return true
        if (tagFullPickerRef.current?.contains(node)) return true
        if (barColorTriggerRef.current?.contains(node)) return true
      }
      return false
    }
    const handleOutside = (e: MouseEvent) => {
      if (eventInsideMenuUi(e)) return
      setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tagThemePos) {
          e.stopPropagation()
          e.preventDefault()
          setTagThemePos(null)
          return
        }
        if (barColorPicker) {
          e.stopPropagation()
          e.preventDefault()
          setBarColorPicker(null)
          return
        }
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleOutside, true)
    document.addEventListener('keydown', handleKey, true)
    return () => {
      document.removeEventListener('pointerdown', handleOutside, true)
      document.removeEventListener('keydown', handleKey, true)
    }
  }, [open, barColorPicker, tagThemePos])

  function openMenu() {
    setBarColorPicker(null)
    setTagThemePos(null)
    setOpen(true)
  }

  const displayFillDraft = open ? draftBarFill : barFill
  const fillForSwatch = resolveProgressBarFill(
    effectiveFillKey(total, done, displayFillDraft ?? null),
  )

  function applyBarColorChoice(c: string) {
    setDraftBarFill(c)
    setTagThemePos(null)
    void onPatch?.({ progress_bar_fill: c })
  }

  const body = (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="w-14 min-w-0 shrink-0">
        <div className="bg-[var(--color-muted-foreground)]/20 h-1.5 w-full min-w-0 max-w-full overflow-hidden rounded-full">
          <div
            className={cn(
              'h-full max-w-full rounded-full transition-[width] duration-150',
              'className' in cellFill ? cellFill.className : undefined,
            )}
            style={{
              width: `${pct}%`,
              ...('style' in cellFill ? cellFill.style : {}),
            }}
          />
        </div>
      </div>
      {showCount && (
        <span className="body-4 tabular-nums text-[var(--foreground)]">
          {done}/{total}
        </span>
      )}
    </div>
  )

  if (!configurable || !onPatch) {
    return body
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-dropdown
        onClick={(e) => {
          e.stopPropagation()
          if (open) setOpen(false)
          else openMenu()
        }}
        className="flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 text-left"
        title="Progress column options"
      >
        {body}
      </button>
      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid fixed z-[99999] w-[220px] overflow-hidden rounded-xl"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="typo-caption text-[var(--color-muted-foreground)]">
                  Show number
                </span>
                <Switch
                  checked={draftShowNumber}
                  onCheckedChange={(v) => {
                    setDraftShowNumber(v)
                    void onPatch({ progress_show_number: v })
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="typo-caption text-[var(--color-muted-foreground)]">Color</span>
                <button
                  ref={barColorTriggerRef}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    const el = e.currentTarget
                    const r = el.getBoundingClientRect()
                    const w = 220
                    const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8)
                    setBarColorPicker((p) => (p ? null : { top: r.bottom + 4, left }))
                    setTagThemePos(null)
                    setTagPanelValue(
                      initialTagPanelValueFromOption(
                        (draftBarFill ?? barFill) === ''
                          ? undefined
                          : (draftBarFill ?? barFill ?? undefined),
                      ),
                    )
                  }}
                  className="h-5 w-5 shrink-0 rounded-md transition-opacity hover:opacity-90"
                  style={swatchVisualStyle(fillForSwatch)}
                  title="Bar color"
                  aria-label="Bar color"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}

      {barColorPicker &&
        typeof document !== 'undefined' &&
        createPortal(
          <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <ColorPickerPopover
              ref={colorMenuRef}
              top={barColorPicker.top}
              left={barColorPicker.left}
              customSwatches={[]}
              onSelect={(c) => applyBarColorChoice(c)}
              onOpenFullPicker={() => {
                setTagPanelValue(
                  initialTagPanelValueFromOption((draftBarFill ?? barFill) || undefined),
                )
                const menu = colorMenuRef.current
                if (!menu) return
                setTagThemePos(positionTagFullPickerNextToPresets(menu.getBoundingClientRect()))
              }}
            />
          </div>,
          document.body,
        )}

      {tagThemePos &&
        barColorPicker &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tagFullPickerRef}
            className="fixed z-[100001]"
            style={{ top: tagThemePos.top, left: tagThemePos.left }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ColorPickerPanelStandalone
              value={tagPanelValue}
              onChange={(v) => {
                setTagPanelValue(v)
                setDraftBarFill(v)
                void onPatch({ progress_bar_fill: v })
              }}
              allowGradient
            />
          </div>,
          document.body,
        )}
    </>
  )
}
