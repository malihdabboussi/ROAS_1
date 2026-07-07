import { isDocSurfaceKey, surfaceBg } from '@/components/ui/forms/rich-text-palettes'
import {
  PRESET_HEX,
  presetToHex,
} from '@/features/spaces/components/cells/field-color-presets-popover'
import { hexToRGB } from '@/lib/utils/colors/color-utils'

/**
 * Resolves a stored doc banner/badge/highlight value to a CSS `background` (or
 * `background-color`) suitable for a block/inline mark.
 * Accepts: legacy surface keys, tag preset ids, `#hex`, `linear-gradient(...)`.
 */
export function docBlockBackgroundCss(raw: string): string {
  const v = (raw || 'blue').trim()
  if (v.startsWith('linear-gradient')) return v
  if (v.startsWith('#')) {
    const full = v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v
    if (/^#[0-9a-fA-F]{6}$/.test(full)) {
      const { r, g, b } = hexToRGB(full)
      return `rgba(${r},${g},${b},0.22)`
    }
    return v
  }
  if (v in PRESET_HEX) {
    const full = PRESET_HEX[v as keyof typeof PRESET_HEX]
    if (full) {
      const { r, g, b } = hexToRGB(full)
      return `rgba(${r},${g},${b},0.22)`
    }
  }
  if (isDocSurfaceKey(v)) {
    return surfaceBg(v)
  }
  return `rgba(59, 130, 246, 0.22)`
}

/** Encode for `data-doc-bg` (gradients, `#`, etc.). */
export function encodeDocBackgroundAttr(v: string): string {
  return encodeURIComponent(v)
}

export function decodeDocBackgroundAttr(s: string | null): string {
  if (s == null || s === '') return 'blue'
  try {
    return decodeURIComponent(s)
  } catch {
    return 'blue'
  }
}

/**
 * For TipTap `mark` / `setHighlight` color string: use full gradient, rgba tint for
 * presets/hex, or legacy.
 */
export function docHighlightColorCss(raw: string): string {
  const v = (raw || 'blue').trim()
  if (v.startsWith('linear-gradient')) return v
  if (v.startsWith('#')) {
    const full = v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v
    if (/^#[0-9a-fA-F]{6}$/.test(full)) {
      const { r, g, b } = hexToRGB(full)
      return `rgba(${r},${g},${b},0.35)`
    }
    return v
  }
  if (v in PRESET_HEX) {
    const full = PRESET_HEX[v as keyof typeof PRESET_HEX]
    if (full) {
      const { r, g, b } = hexToRGB(full)
      return `rgba(${r},${g},${b},0.35)`
    }
  }
  if (isDocSurfaceKey(v)) {
    return surfaceBg(v)
  }
  return `rgba(59, 130, 246, 0.22)`
}

/** Solid text: `#rrggbb` for TipTap `setColor`, or from preset id. */
export function docTextSolidHex(raw: string): string {
  return presetToHex(raw)
}
