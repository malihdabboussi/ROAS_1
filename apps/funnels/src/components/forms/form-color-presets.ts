/**
 * Mirror of `PRESET_HEX` from
 * `apps/web/src/features/spaces/components/cells/field-color-presets-popover.tsx`.
 * Keep in sync: the form Settings panel writes the TAG_COLORS id (e.g. `'blue'`)
 * to `settings.colors.{background,surface,text,input,button}`; the public renderer
 * resolves it through this table.
 */
export const FORM_PRESET_HEX: Record<string, string> = {
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

export type FormColorKey = 'background' | 'surface' | 'text' | 'input' | 'button'

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

function presetToHex(colorId: string | null): string | null {
  if (!colorId) return null
  if (colorId.startsWith('#')) return colorId
  if (colorId.startsWith('linear-gradient')) {
    return colorId.match(/#[0-9a-fA-F]{6}/)?.[0] ?? null
  }
  return FORM_PRESET_HEX[colorId] ?? null
}

function isGradient(value: string | null): boolean {
  return typeof value === 'string' && value.startsWith('linear-gradient')
}

/** Glass-style soft tint background (matches the `glassSwatchStyle` used in the web app). */
export function glassFormSurfaceStyle(hex: string): React.CSSProperties {
  const { r, g, b } = hexToRgb(hex)
  return {
    background: `linear-gradient(135deg, rgba(${r},${g},${b},0.16) 0%, rgba(${r},${g},${b},0.3) 50%, rgba(${r},${g},${b},0.12) 100%)`,
  }
}

export function readFormColor(
  colors: Record<string, unknown> | undefined,
  key: FormColorKey,
): string | null {
  if (!colors || typeof colors !== 'object') return null
  const raw = colors[key]
  return typeof raw === 'string' && raw.trim() ? raw : null
}

export type FormColorRenderStyle = 'glass' | 'solid'

function effectiveStyle(
  override: FormColorRenderStyle | null | undefined,
  theme: 'light' | 'dark',
): FormColorRenderStyle {
  if (override === 'glass' || override === 'solid') return override
  return theme === 'dark' ? 'glass' : 'solid'
}

/** Page-around-the-form background. Glass tint or solid based on per-slot style override (default: theme). */
export function resolveFormSurfaceStyle(
  colorId: string | null,
  theme: 'light' | 'dark',
  styleOverride?: FormColorRenderStyle | null,
): React.CSSProperties | undefined {
  if (isGradient(colorId)) return { background: colorId as string }
  const hex = presetToHex(colorId)
  if (!hex) return undefined
  return effectiveStyle(styleOverride, theme) === 'glass'
    ? glassFormSurfaceStyle(hex)
    : { backgroundColor: hex }
}

/** Form card (the panel the questions live in). Inline style merges with default border. */
export function resolveFormCardStyle(
  colorId: string | null,
  theme: 'light' | 'dark',
  styleOverride?: FormColorRenderStyle | null,
): React.CSSProperties | undefined {
  if (isGradient(colorId)) {
    return { background: colorId as string, borderColor: 'rgba(255,255,255,0.18)' }
  }
  const hex = presetToHex(colorId)
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

/** Form-wide text color. */
export function resolveFormTextStyle(colorId: string | null): React.CSSProperties | undefined {
  const hex = presetToHex(colorId)
  if (!hex) return undefined
  return { color: hex }
}

/** Inputs / textareas / radio + checkbox surrounds. */
export function resolveFormInputStyle(
  colorId: string | null,
  theme: 'light' | 'dark',
  styleOverride?: FormColorRenderStyle | null,
): React.CSSProperties | undefined {
  if (isGradient(colorId)) {
    return { background: colorId as string, borderColor: 'rgba(255,255,255,0.35)' }
  }
  const hex = presetToHex(colorId)
  if (!hex) return undefined
  const { r, g, b } = hexToRgb(hex)
  if (effectiveStyle(styleOverride, theme) === 'glass') {
    return {
      backgroundColor: `rgba(${r},${g},${b},0.08)`,
      borderColor: `rgba(${r},${g},${b},0.35)`,
    }
  }
  return {
    backgroundColor: hex,
    borderColor: `rgba(${r},${g},${b},0.6)`,
  }
}

export function resolveFormButtonStyle(
  colorId: string | null,
  theme: 'light' | 'dark',
  styleOverride?: FormColorRenderStyle | null,
): React.CSSProperties | undefined {
  if (isGradient(colorId)) {
    return { background: colorId as string, color: '#fff' }
  }
  const hex = presetToHex(colorId)
  if (!hex) return undefined
  return effectiveStyle(styleOverride, theme) === 'glass'
    ? glassFormSurfaceStyle(hex)
    : { backgroundColor: hex, color: '#fff' }
}

/** Read per-slot style override (`'glass' | 'solid'`) from `settings.colors.styles`. */
export function readFormColorStyle(
  colors: Record<string, unknown> | undefined,
  key: 'background' | 'surface' | 'input' | 'button',
): FormColorRenderStyle | null {
  if (!colors || typeof colors !== 'object') return null
  const styles = (colors as Record<string, unknown>).styles
  if (!styles || typeof styles !== 'object') return null
  const value = (styles as Record<string, unknown>)[key]
  return value === 'glass' || value === 'solid' ? value : null
}

/** Raw hex for places that need a single color (e.g. `accentColor`, signature stroke). */
export function resolveFormButtonHex(colorId: string | null): string | null {
  return presetToHex(colorId)
}

/** Raw hex of the user's text color (for signature stroke fallback). */
export function resolveFormTextHex(colorId: string | null): string | null {
  return presetToHex(colorId)
}
