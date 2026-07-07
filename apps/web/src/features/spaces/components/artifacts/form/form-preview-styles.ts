import type { CSSProperties } from 'react'
import { glassSwatchStyle, PRESET_HEX } from '@/lib/ui/field-color-presets'

export type FormColorKey = 'background' | 'surface' | 'text' | 'input' | 'button'
export type FormColorStyleKey = Exclude<FormColorKey, 'text'>
export type FormColorRenderStyle = 'glass' | 'solid'

export function readColor(colors: unknown, key: FormColorKey): string | null {
  if (!colors || typeof colors !== 'object') return null
  const raw = (colors as Record<string, unknown>)[key]
  return typeof raw === 'string' && raw.trim() ? raw : null
}

export function readColorStyle(
  colors: unknown,
  key: FormColorStyleKey,
): FormColorRenderStyle | null {
  if (!colors || typeof colors !== 'object') return null
  const styles = (colors as Record<string, unknown>).styles
  if (!styles || typeof styles !== 'object') return null
  const raw = (styles as Record<string, unknown>)[key]
  return raw === 'glass' || raw === 'solid' ? raw : null
}

export function effectiveStyle(
  override: FormColorRenderStyle | null | undefined,
  theme: 'light' | 'dark',
): FormColorRenderStyle {
  if (override === 'glass' || override === 'solid') return override
  return theme === 'dark' ? 'glass' : 'solid'
}

export function presetHex(colorId: string | null): string | null {
  if (!colorId) return null
  if (colorId.startsWith('#')) return colorId
  if (colorId.startsWith('linear-gradient')) {
    return colorId.match(/#[0-9a-fA-F]{6}/)?.[0] ?? null
  }
  return PRESET_HEX[colorId] ?? null
}

export function isGradient(value: string | null): boolean {
  return typeof value === 'string' && value.startsWith('linear-gradient')
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const v = hex.startsWith('#') ? hex.slice(1) : hex
  const full =
    v.length === 3
      ? v
          .split('')
          .map((c) => c + c)
          .join('')
      : v
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

export function resolveSurfaceStyle(
  colorId: string | null,
  theme: 'light' | 'dark',
  styleOverride: FormColorRenderStyle | null,
): CSSProperties | undefined {
  if (isGradient(colorId)) return { background: colorId as string }
  const hex = presetHex(colorId)
  if (!hex) return undefined
  return effectiveStyle(styleOverride, theme) === 'glass'
    ? glassSwatchStyle(hex)
    : { backgroundColor: hex }
}

export function resolveCardStyle(
  colorId: string | null,
  theme: 'light' | 'dark',
  styleOverride: FormColorRenderStyle | null,
): CSSProperties | undefined {
  if (isGradient(colorId)) {
    return { background: colorId as string, borderColor: 'rgba(255,255,255,0.18)' }
  }
  const hex = presetHex(colorId)
  if (!hex) return undefined
  const { r, g, b } = hexToRgb(hex)
  if (effectiveStyle(styleOverride, theme) === 'glass') {
    return {
      background: `linear-gradient(135deg, rgba(${r},${g},${b},0.10) 0%, rgba(${r},${g},${b},0.18) 50%, rgba(${r},${g},${b},0.08) 100%)`,
      borderColor: `rgba(${r},${g},${b},0.25)`,
    }
  }
  return { backgroundColor: hex, borderColor: `rgba(${r},${g},${b},0.6)` }
}

export function resolveTextStyle(colorId: string | null): CSSProperties | undefined {
  const hex = presetHex(colorId)
  if (!hex) return undefined
  return { color: hex }
}

export function resolveInputStyle(
  colorId: string | null,
  theme: 'light' | 'dark',
  styleOverride: FormColorRenderStyle | null,
): CSSProperties | undefined {
  if (isGradient(colorId)) {
    return { background: colorId as string, borderColor: 'rgba(255,255,255,0.35)' }
  }
  const hex = presetHex(colorId)
  if (!hex) return undefined
  const { r, g, b } = hexToRgb(hex)
  if (effectiveStyle(styleOverride, theme) === 'glass') {
    return {
      backgroundColor: `rgba(${r},${g},${b},0.08)`,
      borderColor: `rgba(${r},${g},${b},0.45)`,
    }
  }
  return { backgroundColor: hex, borderColor: `rgba(${r},${g},${b},0.6)` }
}

export function resolveButtonStyle(
  colorId: string | null,
  theme: 'light' | 'dark',
  styleOverride: FormColorRenderStyle | null,
): CSSProperties | undefined {
  if (!colorId) return undefined
  if (isGradient(colorId)) return { background: colorId, color: '#fff' }
  const hex = presetHex(colorId) ?? '#6366f1'
  return effectiveStyle(styleOverride, theme) === 'glass'
    ? glassSwatchStyle(hex)
    : { backgroundColor: hex, color: '#fff' }
}

export function resolveButtonAccentHex(colorId: string | null): string {
  return colorId ? (presetHex(colorId) ?? '#a78bfa') : '#a78bfa'
}
