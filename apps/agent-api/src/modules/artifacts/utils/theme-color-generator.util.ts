/**
 * Color completion for theme updates — mirrors apps/api `generateCompleteThemeColors`
 * so agent `update_theme` matches REST behavior.
 */

export interface UserThemeColors {
  primary: string
  primaryForeground: string
  secondaryAccent1: string
  secondaryAccent2: string
  heading: string
  body: string
  pageBackground: string
  cardBackground: string
  border: string
  input: string
  primaryGradient?: string
  slideBackground?: string
  headingH1?: string
  headingH2?: string
  headingH3?: string
  headingH4?: string
  bodyLg?: string
  bodySm?: string
  calloutInfo?: string
  calloutSuccess?: string
  calloutWarning?: string
  calloutQuestion?: string
  calloutTip?: string
}

export interface CompleteThemeColors extends UserThemeColors {
  primaryLight: string
  primaryDark: string
  success: string
  warning: string
  danger: string
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToHex(h: number, s: number, l: number): string {
  h = h / 360
  s = s / 100
  l = l / 100
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function lightenColor(hex: string, percentage: number): string {
  const hsl = hexToHSL(hex)
  return hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + percentage))
}

function darkenColor(hex: string, percentage: number): string {
  const hsl = hexToHSL(hex)
  return hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - percentage))
}

function extractSolidColor(value: string): string {
  if (value.includes('gradient')) {
    const match = value.match(/#[0-9A-Fa-f]{6}/)
    return match ? match[0] : '#000000'
  }
  return value
}

export function generateCompleteThemeColors(userColors: UserThemeColors): CompleteThemeColors {
  const solidPrimary = extractSolidColor(userColors.primary)
  return {
    ...userColors,
    primaryLight: lightenColor(solidPrimary, 20),
    primaryDark: darkenColor(solidPrimary, 20),
    success: '#34C759',
    warning: '#FF9500',
    danger: '#EF4444',
  }
}
