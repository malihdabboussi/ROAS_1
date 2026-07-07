'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { ColorPickerPanelStandalone } from '@/components/ui/ColorPicker'
import Switch from '@/components/ui/forms/switch'
import { cn } from '@/lib/utils/cn'
import { SPACES_CELL_TOAST_SUCCESS } from '../../config/spaces-toast-errors.config'
import type { BaseCellProps } from './cell-types'
import {
  ColorPickerPopover,
  getProgressBarCellFill,
  initialTagPanelValueFromOption,
  MAX_CUSTOM_TAG_SWATCHES,
  positionTagFullPickerNextToPresets,
  readCustomSwatchesFromStorage,
  resolveProgressBarFill,
  shouldSaveAsNewCustom,
  swatchVisualStyle,
  tagCustomSwatchesKey,
} from './field-color-presets-popover'

function clampPct(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)))
}

function parseProgressValue(v: unknown): {
  pct: number | null
  showNumber: boolean
  fill: string | null
} {
  if (v == null) return { pct: null, showNumber: true, fill: null }
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return { pct: null, showNumber: true, fill: null }
    return { pct: clampPct(v), showNumber: true, fill: null }
  }
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (Number.isNaN(n)) return { pct: null, showNumber: true, fill: null }
    return { pct: clampPct(n), showNumber: true, fill: null }
  }
  if (typeof v === 'object' && v !== null && 'v' in v) {
    const o = v as { v: unknown; showNumber?: boolean; fill?: string | null }
    const raw = o.v
    const num = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
    if (Number.isNaN(num)) return { pct: null, showNumber: true, fill: null }
    return {
      pct: clampPct(num),
      showNumber: o.showNumber !== false,
      fill: o.fill == null || o.fill === '' ? null : o.fill,
    }
  }
  return { pct: null, showNumber: true, fill: null }
}

function serializeProgress(pct: number, showNumber: boolean, fill: string | null): unknown {
  if (showNumber && (fill == null || fill === '')) {
    return pct
  }
  return {
    v: pct,
    ...(showNumber ? {} : { showNumber: false }),
    ...(fill ? { fill } : {}),
  }
}

function progressPayloadEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function ProgressBar({ pct, fillKey }: { pct: number; fillKey: string | null }) {
  const cellFill = getProgressBarCellFill(fillKey)
  return (
    <div className="bg-[var(--color-muted-foreground)]/20 h-1.5 w-full min-w-0 overflow-hidden rounded-full">
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
  )
}

export interface ProgressCellProps extends BaseCellProps {
  fieldRowVariant?: 'default' | 'kanban'
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
}

export function ProgressCell({
  field,
  value,
  onChange,
  readonly,
  fieldRowVariant = 'default',
  onTagCustomSwatchesChange,
  openOnMount,
  bulkInlineEditor,
}: ProgressCellProps) {
  const parsed = useMemo(() => parseProgressValue(value), [value])
  const externalPct = parsed.pct
  const isKanban = fieldRowVariant === 'kanban'
  const [open, setOpen] = useState(!!openOnMount && !bulkInlineEditor)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [localPct, setLocalPct] = useState<number | null>(externalPct)
  const [showNumber, setShowNumber] = useState(() => parsed.showNumber)
  const [barFill, setBarFill] = useState<string | null>(() => parsed.fill)
  const didMigrateFromLocalStorage = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const colorMenuRef = useRef<HTMLDivElement>(null)
  const tagFullPickerRef = useRef<HTMLDivElement>(null)
  const barColorTriggerRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [barColorPicker, setBarColorPicker] = useState<{ top: number; left: number } | null>(null)
  const [tagThemePos, setTagThemePos] = useState<{ top: number; left: number } | null>(null)
  const [tagPanelValue, setTagPanelValue] = useState('#6366f1')
  const tagPanelValueRef = useRef(tagPanelValue)
  tagPanelValueRef.current = tagPanelValue
  const openFullPanelPendingCommitRef = useRef(false)
  const [customSwatches, setCustomSwatches] = useState<string[]>(
    () => field.tag_custom_swatches ?? [],
  )
  const tagFromServer = JSON.stringify(field.tag_custom_swatches ?? [])

  useEffect(() => {
    setCustomSwatches([...(field.tag_custom_swatches ?? [])])
  }, [field.id, tagFromServer])

  useEffect(() => {
    if (didMigrateFromLocalStorage.current) return
    if ((field.tag_custom_swatches?.length ?? 0) > 0) {
      didMigrateFromLocalStorage.current = true
      return
    }
    if (!onTagCustomSwatchesChange) {
      return
    }
    const fromLs = readCustomSwatchesFromStorage(field.id)
    if (fromLs.length === 0) {
      didMigrateFromLocalStorage.current = true
      return
    }
    didMigrateFromLocalStorage.current = true
    onTagCustomSwatchesChange(field.id, fromLs)
    try {
      localStorage.removeItem(tagCustomSwatchesKey(field.id))
    } catch {
      // ignore
    }
  }, [field.id, field.tag_custom_swatches, onTagCustomSwatchesChange])

  useEffect(() => {
    if (externalPct != null) setLocalPct(externalPct)
  }, [externalPct])

  useEffect(() => {
    if (open) return
    setShowNumber(parsed.showNumber)
    setBarFill(parsed.fill)
  }, [open, parsed.showNumber, parsed.fill])

  useEffect(() => {
    if (open) return
    const src = localPct ?? externalPct
    setDraft(src != null ? String(src) : '')
  }, [externalPct, localPct, open])

  useEffect(() => {
    if (!open) setError('')
  }, [open])

  const draftPct = useMemo(() => {
    if (draft.trim() === '') return null
    const n = parseFloat(draft)
    if (Number.isNaN(n)) return null
    return clampPct(n)
  }, [draft])

  const displayFill = open ? barFill : (barFill ?? parsed.fill)
  const pct = open ? (draftPct ?? localPct ?? externalPct) : (localPct ?? externalPct)

  const showPercentInCell = !isKanban && showNumber && pct != null

  const baseDraftFromSaved = useCallback(
    () => (externalPct != null ? String(externalPct) : localPct != null ? String(localPct) : ''),
    [externalPct, localPct],
  )

  const openMenu = useCallback(() => {
    const p = parseProgressValue(value)
    setShowNumber(p.showNumber)
    setBarFill(p.fill)
    setBarColorPicker(null)
    setTagThemePos(null)
    setDraft(p.pct != null ? String(p.pct) : localPct != null ? String(localPct) : '')
    setOpen(true)
  }, [value, localPct])

  useEffect(() => {
    if (open) return
    setBarColorPicker(null)
    setTagThemePos(null)
  }, [open])

  const tryCommitCustomFromFullPanel = useCallback(() => {
    if (!openFullPanelPendingCommitRef.current) return
    openFullPanelPendingCommitRef.current = false
    const v = tagPanelValueRef.current.trim()
    setCustomSwatches((prev) => {
      if (!shouldSaveAsNewCustom(v, prev)) return prev
      const next = [...prev, v].slice(-MAX_CUSTOM_TAG_SWATCHES)
      onTagCustomSwatchesChange?.(field.id, next)
      return next
    })
  }, [field.id, onTagCustomSwatchesChange])

  const buildPayload = useCallback(
    (clamped: number) => serializeProgress(clamped, showNumber, barFill),
    [barFill, showNumber],
  )

  const closeAndApply = useCallback(() => {
    const trimmed = draft.trim()
    if (!trimmed) {
      if (localPct != null || externalPct != null) {
        setLocalPct(null)
        onChange(null)
      }
      setOpen(false)
      setError('')
      return
    }
    const p = Number(trimmed)
    if (Number.isNaN(p)) {
      setDraft(baseDraftFromSaved())
      setOpen(false)
      setError('')
      return
    }
    const clamped = clampPct(p)
    setError('')
    setLocalPct(clamped)
    const next = buildPayload(clamped)
    if (!progressPayloadEquals(next, value)) onChange(next)
    setOpen(false)
  }, [baseDraftFromSaved, buildPayload, draft, externalPct, localPct, onChange, value])

  const commitFromEnter = useCallback(() => {
    const trimmed = draft.trim()
    if (!trimmed) {
      if (pct != null) {
        setLocalPct(null)
        onChange(null)
        toast.success(SPACES_CELL_TOAST_SUCCESS.PROGRESS_CLEARED.userMessage)
      }
      setOpen(false)
      setError('')
      return
    }
    const p = Number(trimmed)
    if (Number.isNaN(p)) {
      setError('Enter a valid number (0–100)')
      toast.error('Enter a valid number (0–100)')
      return
    }
    const clamped = clampPct(p)
    setError('')
    setLocalPct(clamped)
    const next = buildPayload(clamped)
    if (!progressPayloadEquals(next, value)) {
      onChange(next)
      toast.success(SPACES_CELL_TOAST_SUCCESS.PROGRESS_SAVED.userMessage)
    }
    setOpen(false)
  }, [buildPayload, draft, onChange, pct, value])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 220
    const maxLeft = window.innerWidth - dropW - 8
    setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, maxLeft)) })
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (bulkInlineEditor) setTimeout(() => inputRef.current?.focus(), 50)
  }, [bulkInlineEditor])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (dropdownRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      if (colorMenuRef.current?.contains(t)) return
      if (tagFullPickerRef.current?.contains(t)) return
      closeAndApply()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tagThemePos) {
          e.stopPropagation()
          e.preventDefault()
          tryCommitCustomFromFullPanel()
          setTagThemePos(null)
          return
        }
        if (barColorPicker) {
          e.stopPropagation()
          e.preventDefault()
          setBarColorPicker(null)
          return
        }
        closeAndApply()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey, true)
    }
  }, [open, barColorPicker, closeAndApply, tagThemePos, tryCommitCustomFromFullPanel])

  useEffect(() => {
    if (!barColorPicker) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (tagFullPickerRef.current?.contains(t)) return
      if (tagThemePos) {
        tryCommitCustomFromFullPanel()
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
  }, [barColorPicker, tagThemePos, tryCommitCustomFromFullPanel])

  function applyBarColorChoice(c: string) {
    if (tagThemePos) tryCommitCustomFromFullPanel()
    setBarFill(c)
    setTagThemePos(null)
  }

  if (!readonly && bulkInlineEditor) {
    return (
      <div
        className="w-full overflow-hidden rounded-lg p-1"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitFromEnter()
                }
              }}
              onBlur={() => commitFromEnter()}
              placeholder="0"
              className={`min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
            />
            <span className="text-xs text-[var(--color-muted-foreground)]">%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={draft === '' ? 0 : Number(draft) || 0}
            onChange={(e) => {
              const v = e.target.value
              setDraft(v)
              setError('')
              const n = Number(v)
              if (!Number.isNaN(n)) {
                const clamped = clampPct(n)
                setLocalPct(clamped)
                const next = buildPayload(clamped)
                if (!progressPayloadEquals(next, value)) onChange(next)
              }
            }}
            className="h-1.5 w-full cursor-pointer accent-[var(--color-primary)]"
          />
        </div>
        {error && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {error}
          </div>
        )}
      </div>
    )
  }

  if (readonly) {
    if (pct == null) return <span className="text-xs text-[var(--color-muted-foreground)]">-</span>
    return (
      <div className="flex w-full min-w-0 items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <ProgressBar pct={pct} fillKey={displayFill} />
        </div>
        {!isKanban && parsed.showNumber && (
          <span className="shrink-0 text-xs text-[var(--foreground)]">{pct}%</span>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (open) {
            closeAndApply()
          } else {
            openMenu()
          }
        }}
        className="flex w-full min-w-0 items-center gap-1.5 text-left"
        title={pct != null ? `${pct}%` : 'Set progress'}
      >
        {pct != null ? (
          <>
            <div className="min-w-0 flex-1">
              <ProgressBar pct={pct} fillKey={displayFill} />
            </div>
            {showPercentInCell && (
              <span className="shrink-0 text-xs text-[var(--foreground)]">{pct}%</span>
            )}
          </>
        ) : (
          <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
        )}
      </button>
      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid fixed z-[99999] w-[220px] overflow-hidden rounded-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="flex flex-col gap-2 p-2">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitFromEnter()
                    }
                  }}
                  placeholder="0"
                  className={`min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
                />
                <span className="text-xs text-[var(--color-muted-foreground)]">%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={draft === '' ? 0 : Number(draft) || 0}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setError('')
                }}
                className="h-1.5 w-full cursor-pointer accent-[var(--color-primary)]"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--color-muted-foreground)]">
                  Show number
                </span>
                <Switch checked={showNumber} onCheckedChange={setShowNumber} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--color-muted-foreground)]">Color</span>
                <button
                  ref={barColorTriggerRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const el = e.currentTarget
                    const r = el.getBoundingClientRect()
                    const w = 220
                    const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8)
                    openFullPanelPendingCommitRef.current = false
                    setBarColorPicker((p) => (p ? null : { top: r.bottom + 4, left }))
                    setTagThemePos(null)
                    setTagPanelValue(initialTagPanelValueFromOption(barFill ?? undefined))
                  }}
                  className="h-5 w-5 shrink-0 rounded-md transition-opacity hover:opacity-90"
                  style={swatchVisualStyle(resolveProgressBarFill(displayFill))}
                  title="Bar color"
                  aria-label="Bar color"
                />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 border-t border-[var(--color-border)] px-2 py-1.5 text-[11px] text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {error}
              </div>
            )}
          </div>,
          document.body,
        )}

      {barColorPicker &&
        typeof document !== 'undefined' &&
        createPortal(
          <ColorPickerPopover
            ref={colorMenuRef}
            top={barColorPicker.top}
            left={barColorPicker.left}
            customSwatches={customSwatches}
            onSelect={(c) => applyBarColorChoice(c)}
            onOpenFullPicker={() => {
              openFullPanelPendingCommitRef.current = true
              setTagPanelValue(initialTagPanelValueFromOption(barFill ?? undefined))
              const menu = colorMenuRef.current
              if (!menu) return
              setTagThemePos(positionTagFullPickerNextToPresets(menu.getBoundingClientRect()))
            }}
          />,
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
          >
            <ColorPickerPanelStandalone
              value={tagPanelValue}
              onChange={(v) => {
                setTagPanelValue(v)
                setBarFill(v)
              }}
              allowGradient
            />
          </div>,
          document.body,
        )}
    </>
  )
}
