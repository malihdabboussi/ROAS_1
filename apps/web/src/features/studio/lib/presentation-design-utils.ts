export const PRESENTATION_FONT_SIZE_OPTIONS = [
  10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96,
] as const

export function parseFontFamilyName(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.match(/"([^"]+)"/) ?? value.match(/^([^,]+)/)
  const name = match?.[1]?.trim()
  return name && name !== 'inherit' ? name : null
}

export function formatFontFamilyValue(name: string | null): string {
  if (!name) return 'inherit'
  return `"${name}", sans-serif`
}

export function parsePx(value: string | null | undefined, fallback = 0): number {
  if (!value) return fallback
  const match = value.match(/(-?\d+(?:\.\d+)?)px/)
  return match ? Number(match[1]) : fallback
}

export function parseLineHeightRatio(
  lineHeight: string | null | undefined,
  fontSize: string | null | undefined,
): number {
  if (!lineHeight) return 1.2
  const unitless = Number(lineHeight)
  if (Number.isFinite(unitless) && unitless > 0 && unitless < 10) return unitless
  const linePx = parsePx(lineHeight, 0)
  const fontPx = parsePx(fontSize, 16)
  if (linePx > 0 && fontPx > 0) return Math.round((linePx / fontPx) * 100) / 100
  return 1.2
}

export function parseEm(value: string | null | undefined, fallback = 0): number {
  if (!value) return fallback
  const match = value.match(/(-?\d+(?:\.\d+)?)em/)
  return match ? Number(match[1]) : fallback
}

function expandShortHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return hex.slice(0, 7)
}

function isTransparentCssColor(color: string): boolean {
  const trimmed = color.trim().toLowerCase()
  if (!trimmed || trimmed === 'transparent') return true
  const alphaMatch = trimmed.match(
    /rgba?\(\s*[\d.]+\s*(?:,\s*|\s+)[\d.]+\s*(?:,\s*|\s+)[\d.]+\s*(?:,\s*|\s*\/\s*)\s*([\d.]+)\s*\)/,
  )
  return alphaMatch ? Number(alphaMatch[1]) === 0 : false
}

export function cssColorToHex(color: string | null | undefined): string | null {
  if (!color) return null
  const trimmed = color.trim()
  if (isTransparentCssColor(trimmed)) return null
  if (trimmed.startsWith('#')) {
    return expandShortHex(trimmed)
  }
  const rgb = trimmed.match(/rgba?\(\s*([\d.]+)\s*(?:,\s*|\s+)([\d.]+)\s*(?:,\s*|\s+)([\d.]+)/i)
  if (rgb) {
    const hex = (n: string) => Math.round(Number(n)).toString(16).padStart(2, '0')
    return `#${hex(rgb[1]!)}${hex(rgb[2]!)}${hex(rgb[3]!)}`
  }
  const hsl = trimmed.match(/hsla?\(\s*([\d.]+)\s*(?:,\s*|\s+)([\d.]+)%\s*(?:,\s*|\s+)([\d.]+)%/i)
  if (hsl) {
    const h = Number(hsl[1]) / 360
    const s = Number(hsl[2]) / 100
    const l = Number(hsl[3]) / 100
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t
      if (tt < 0) tt += 1
      if (tt > 1) tt -= 1
      if (tt < 1 / 6) return p + (q - p) * 6 * tt
      if (tt < 1 / 2) return q
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
      return p
    }
    let r: number
    let g: number
    let b: number
    if (s === 0) {
      r = g = b = l
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }
    const toHex = (x: number) =>
      Math.round(x * 255)
        .toString(16)
        .padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }
  return null
}

/** Fallback hex for ColorPicker when computed color is missing or transparent. */
export function cssColorToHexOrDefault(color: string | null | undefined, fallback: string): string {
  return cssColorToHex(color) ?? fallback
}

export function stylePropertyToCamel(property: string): string {
  return property.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}

export function buildLiveStylePatch(styles: Record<string, string | null | undefined>) {
  const patch: Record<string, string> = {}
  for (const [property, value] of Object.entries(styles)) {
    if (!value) continue
    patch[stylePropertyToCamel(property)] = value
  }
  return patch
}
