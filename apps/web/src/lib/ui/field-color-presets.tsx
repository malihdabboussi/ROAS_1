'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { hexToRGB } from '@/lib/utils/colors/color-utils'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'

export const TAG_COLORS = [
  { id: 'cyan', label: 'Cyan' },
  { id: 'sky', label: 'Sky' },
  { id: 'blue', label: 'Blue' },
  { id: 'indigo', label: 'Indigo' },
  { id: 'violet', label: 'Violet' },
  { id: 'purple', label: 'Purple' },
  { id: 'fuchsia', label: 'Fuchsia' },
  { id: 'pink', label: 'Pink' },
  { id: 'rose', label: 'Rose' },
  { id: 'red', label: 'Red' },
  { id: 'orange', label: 'Orange' },
  { id: 'amber', label: 'Amber' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'lime', label: 'Lime' },
  { id: 'green', label: 'Green' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'teal', label: 'Teal' },
  { id: 'slate', label: 'Slate' },
] as const

export const PRESET_HEX: Record<string, string> = {
  cyan: '#22d3ee',
  sky: '#38bdf8',
  blue: '#60a5fa',
  indigo: '#818cf8',
  violet: '#a78bfa',
  purple: '#c084fc',
  fuchsia: '#e879f9',
  pink: '#f472b6',
  rose: '#fb7185',
  red: '#f87171',
  orange: '#fb923c',
  amber: '#fbbf24',
  yellow: '#facc15',
  lime: '#a3e635',
  green: '#4ade80',
  emerald: '#34d399',
  teal: '#2dd4bf',
  slate: '#94a3b8',
}

const BUILTIN_HEX_SET = new Set(Object.values(PRESET_HEX).map((h) => h.toLowerCase()))

export const MAX_CUSTOM_TAG_SWATCHES = 36

export const tagCustomSwatchesKey = (fieldId: string) => `vibey.spaces.tagCustomSwatches:${fieldId}`

export function readCustomSwatchesFromStorage(fieldId: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(tagCustomSwatchesKey(fieldId))
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    if (!Array.isArray(p)) return []
    return p.filter(
      (x): x is string =>
        typeof x === 'string' && (x.startsWith('#') || x.startsWith('linear-gradient')),
    )
  } catch {
    return []
  }
}

function expandShortHex(s: string): string {
  if (s.length !== 4) return s
  const a = s.slice(1)
  return `#${a[0]}${a[0]}${a[1]}${a[1]}${a[2]}${a[2]}`
}

export function presetToHex(color?: string): string {
  if (!color) return '#6366f1'
  if (color.startsWith('#') || color.startsWith('linear-gradient')) return color
  return PRESET_HEX[color] ?? '#6366f1'
}

/** CSS background for a progress bar fill (preset id, hex, gradient, or theme primary). */
export function resolveProgressBarFill(fill: string | null | undefined): string {
  if (fill == null || fill === '') return 'var(--color-primary)'
  if (fill.startsWith('#') || fill.startsWith('linear-gradient')) return fill
  return PRESET_HEX[fill] ?? 'var(--color-primary)'
}

/** Preset id → `bar-glass-*` utility from `globals.css` (horizontal glass gradient, light/dark). */
const PRESET_ID_TO_BAR_GLASS: Record<string, string> = {
  cyan: 'bar-glass-blue',
  sky: 'bar-glass-blue',
  blue: 'bar-glass-blue',
  indigo: 'bar-glass-blue',
  violet: 'bar-glass-purple',
  purple: 'bar-glass-purple',
  fuchsia: 'bar-glass-purple',
  pink: 'bar-glass-purple',
  rose: 'bar-glass-purple',
  red: 'bar-glass-red',
  orange: 'bar-glass-orange',
  amber: 'bar-glass-orange',
  yellow: 'bar-glass-orange',
  green: 'bar-glass-green',
  emerald: 'bar-glass-green',
  lime: 'bar-glass-green',
  teal: 'bar-glass-green',
  slate: 'bar-glass-muted',
}

export type ProgressBarCellFill = { className: string } | { style: React.CSSProperties }

/**
 * Renders the **in-cell** progress track fill with glass (gradient + light inset) like
 * `bar-glass-blue` in globals — not a flat `background` swatch. Custom hex/linear-gradient
 * get a 90° glass-matched gradient or gradient + inset.
 */
export function getProgressBarCellFill(fill: string | null | undefined): ProgressBarCellFill {
  if (fill == null || fill === '') {
    return { className: 'bar-glass-blue' }
  }
  if (fill.startsWith('linear-gradient')) {
    return {
      style: {
        background: fill,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
      },
    }
  }
  if (fill.startsWith('#')) {
    const full = fill.length === 4 ? expandShortHex(fill) : fill
    if (!/^#[0-9a-fA-F]{6}$/.test(full)) {
      return { className: 'bar-glass-blue' }
    }
    const { r, g, b } = hexToRGB(full)
    return {
      style: {
        background: `linear-gradient(90deg, rgba(${r},${g},${b},0.5) 0%, rgba(${r},${g},${b},0.28) 100%)`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.06)',
      },
    }
  }
  const cls = PRESET_ID_TO_BAR_GLASS[fill]
  if (cls) return { className: cls }
  return { className: 'bar-glass-blue' }
}

export function glassSwatchStyle(hex: string): React.CSSProperties {
  const { r, g, b } = hexToRGB(hex)
  return {
    background: `linear-gradient(135deg, rgba(${r},${g},${b},0.16) 0%, rgba(${r},${g},${b},0.3) 50%, rgba(${r},${g},${b},0.12) 100%)`,
    boxShadow: `0 2px 10px rgba(${r},${g},${b},0.2), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.06)`,
    border: `1px solid rgba(${r},${g},${b},0.42)`,
  }
}

export function swatchVisualStyle(swatch: string): React.CSSProperties {
  if (swatch.startsWith('linear-gradient')) {
    return {
      background: swatch,
      boxShadow: '0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.2)',
    }
  }
  if (swatch.startsWith('#') && (swatch.length === 7 || swatch.length === 4)) {
    return glassSwatchStyle(swatch.length === 4 ? expandShortHex(swatch) : swatch)
  }
  return {
    background: swatch,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
  }
}

export function shouldSaveAsNewCustom(v: string, list: string[]): boolean {
  const t = v.trim()
  if (!t) return false
  if (t.startsWith('#')) {
    if (BUILTIN_HEX_SET.has(t.toLowerCase())) return false
    for (const p of list) {
      if (p === t) return false
      if (p.startsWith('#') && p.toLowerCase() === t.toLowerCase()) return false
    }
    return true
  }
  if (t.startsWith('linear-gradient')) {
    if (list.includes(t)) return false
    return true
  }
  return false
}

export function initialTagPanelValueFromOption(color: string | undefined): string {
  if (!color) return '#6366f1'
  if (color.startsWith('linear-gradient') || color.startsWith('#')) return color
  return presetToHex(color)
}

const TAG_FULL_PICKER_W = 320
const TAG_FULL_PICKER_MIN_EST_H = 520
const TAG_POPOVER_GAP = 8

/** Place the full theme color panel to the right of the presets popover (or left if no room). */
export function positionTagFullPickerNextToPresets(presetsRect: DOMRect): {
  top: number
  left: number
} {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = presetsRect.right + TAG_POPOVER_GAP
  if (left + TAG_FULL_PICKER_W > vw - TAG_POPOVER_GAP) {
    left = presetsRect.left - TAG_FULL_PICKER_W - TAG_POPOVER_GAP
  }
  left = Math.max(TAG_POPOVER_GAP, Math.min(left, vw - TAG_POPOVER_GAP - TAG_FULL_PICKER_W))

  let top = presetsRect.top
  top = Math.min(top, vh - TAG_POPOVER_GAP - TAG_FULL_PICKER_MIN_EST_H)
  top = Math.max(TAG_POPOVER_GAP, top)
  return { top, left }
}

export function TagSwatchButton({
  title,
  onClick,
  swatchStyle,
}: {
  title?: string
  onClick: () => void
  swatchStyle: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="group relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-md"
    >
      <span className="absolute inset-0 rounded-md" style={swatchStyle} aria-hidden />
      <span
        className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-white/25 to-transparent bg-[length:200%_100%] opacity-0 transition-opacity duration-200 group-hover:animate-[shimmer_1.1s_ease-in-out_infinite] group-hover:opacity-100 motion-reduce:group-hover:animate-none"
        aria-hidden
      />
    </button>
  )
}

export const ColorPickerPopover = React.forwardRef<
  HTMLDivElement,
  {
    top: number
    left: number
    customSwatches: string[]
    onSelect: (color: string) => void
    onOpenFullPicker: () => void
  }
>(function ColorPickerPopover({ top, left, customSwatches, onSelect, onOpenFullPicker }, ref) {
  return (
    <div
      ref={ref}
      {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
      className="dropdown-menu-solid fixed z-[100000] w-[220px] overflow-hidden rounded-xl shadow-lg"
      style={{ top, left }}
    >
      <div className="p-2">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Presets
        </p>
        <div className="max-h-[200px] overflow-y-auto pr-0.5">
          <div className="grid grid-cols-6 gap-1.5">
            {TAG_COLORS.map((c) => {
              const presetHex = PRESET_HEX[c.id] ?? '#6366f1'
              return (
                <TagSwatchButton
                  key={c.id}
                  title={c.label}
                  onClick={() => onSelect(c.id)}
                  swatchStyle={glassSwatchStyle(presetHex)}
                />
              )
            })}
            {customSwatches.map((swatch, idx) => {
              return (
                <TagSwatchButton
                  key={`custom-swatch-${idx}-${swatch.slice(0, 64)}`}
                  title="Custom"
                  onClick={() => onSelect(swatch)}
                  swatchStyle={swatchVisualStyle(swatch)}
                />
              )
            })}
            <button
              type="button"
              onClick={() => onOpenFullPicker()}
              className="bg-[var(--color-card)]/40 hover:border-[var(--foreground)]/40 flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-all hover:text-[var(--foreground)]"
              title="Custom color"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
