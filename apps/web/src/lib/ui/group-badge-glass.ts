import type { CSSProperties } from 'react'
import { hexToRGB } from '@/lib/utils/colors/color-utils'

export const SPACE_GROUP_BADGE_GLASS: Record<string, string> = {
  cyan: 'badge-glass-cyan',
  amber: 'badge-glass-yellow',
  violet: 'badge-glass-purple',
  emerald: 'badge-glass-green',
  slate: 'badge-glass-muted',
  blue: 'badge-glass-blue',
  orange: 'badge-glass-orange',
  red: 'badge-glass-red',
  muted: 'badge-glass-muted',
}

const SPACE_GROUP_PRESET_HEX: Record<string, string> = {
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

function expandShortHex(s: string): string {
  if (s.length !== 4) return s
  const a = s.slice(1)
  return `#${a[0]}${a[0]}${a[1]}${a[1]}${a[2]}${a[2]}`
}

function isCustomGroupColor(color: string): boolean {
  return (
    color.startsWith('linear-gradient') ||
    (color.startsWith('#') && (color.length === 7 || color.length === 4))
  )
}

function groupChipCustomStyle(color: string): CSSProperties {
  if (color.startsWith('linear-gradient')) {
    return {
      background: color,
      boxShadow: '0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.2)',
      color: '#fff',
    }
  }
  const full = color.length === 4 ? expandShortHex(color) : color
  if (!/^#[0-9a-fA-F]{6}$/.test(full)) {
    return {}
  }
  const { r, g, b } = hexToRGB(full)
  return {
    background: `linear-gradient(135deg, rgba(${r},${g},${b},0.16) 0%, rgba(${r},${g},${b},0.3) 50%, rgba(${r},${g},${b},0.12) 100%)`,
    boxShadow: `0 2px 10px rgba(${r},${g},${b},0.2), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.06)`,
    border: `1px solid rgba(${r},${g},${b},0.42)`,
    color: full,
  }
}

export type SpaceGroupBadgeChipProps = {
  chipClassName: string
  style?: CSSProperties
}

export function spaceGroupBadgeChipProps(color?: string): SpaceGroupBadgeChipProps {
  const muted = SPACE_GROUP_BADGE_GLASS.muted ?? 'badge-glass-muted'
  if (!color) {
    return { chipClassName: muted }
  }
  if (isCustomGroupColor(color)) {
    const style = groupChipCustomStyle(color)
    if (Object.keys(style).length === 0) {
      return { chipClassName: muted }
    }
    return { chipClassName: 'backdrop-blur-sm', style }
  }
  const mapped = SPACE_GROUP_BADGE_GLASS[color]
  if (mapped) return { chipClassName: mapped }
  const presetHex = SPACE_GROUP_PRESET_HEX[color]
  if (presetHex) {
    const style = groupChipCustomStyle(presetHex)
    if (Object.keys(style).length > 0) {
      return { chipClassName: 'backdrop-blur-sm', style }
    }
  }
  return { chipClassName: muted }
}

export function spaceGroupBadgeGlassClass(color?: string): string {
  return spaceGroupBadgeChipProps(color).chipClassName
}

function normalizeOptionHex(color: string): string | null {
  if (!color.startsWith('#')) return null
  const raw = color.length === 4 ? expandShortHex(color) : color
  if (!/^#[0-9a-fA-F]{6}$/.test(raw)) return null
  return raw
}

export function kanbanBoardColumnTintSource(
  headerColor: string | undefined,
  hasNamedColumnBackgroundClass: boolean,
): string | null {
  if (!headerColor || hasNamedColumnBackgroundClass) return null
  if (headerColor.startsWith('linear-gradient')) return headerColor
  const fromHash = normalizeOptionHex(headerColor)
  if (fromHash) return fromHash
  const preset = SPACE_GROUP_PRESET_HEX[headerColor]
  if (preset) return normalizeOptionHex(preset) ?? preset
  return null
}

export function selectOptionControlChrome(color: string): {
  pillClass: string
  pillStyle?: CSSProperties
  dividerClass: string
  dividerStyle?: CSSProperties
} {
  const fallbackPill = 'bg-[var(--color-muted)]/20 text-[var(--foreground)]'
  const fallbackDivider = 'border-[var(--color-border)]'

  if (!color) {
    return { pillClass: fallbackPill, dividerClass: fallbackDivider }
  }

  if (color.startsWith('linear-gradient')) {
    return {
      pillClass: 'text-white',
      pillStyle: {
        background: color,
        border: '1px solid rgba(255,255,255,0.18)',
      },
      dividerClass: 'border-l border-white/25',
      dividerStyle: undefined,
    }
  }

  let full = normalizeOptionHex(color)
  if (!full) {
    const preset = SPACE_GROUP_PRESET_HEX[color]
    if (preset) full = normalizeOptionHex(preset)
  }
  if (!full) {
    return { pillClass: fallbackPill, dividerClass: fallbackDivider }
  }

  const { r, g, b } = hexToRGB(full)
  return {
    pillClass: '',
    pillStyle: {
      backgroundColor: `rgba(${r},${g},${b},0.2)`,
      color: full,
    },
    dividerClass: 'border-l',
    dividerStyle: { borderColor: `rgba(${r},${g},${b},0.35)` },
  }
}
