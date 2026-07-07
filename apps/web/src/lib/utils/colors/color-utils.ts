/**
 * Pure color conversion utilities
 *
 * Converts between HEX, RGB, and HSL color formats
 * Used by ColorPicker components
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

/**
 * Convert hex color to HSL
 */
export const hexToHSL = (hex: string): HSL => {
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

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Convert HSL to hex color
 */
export const hslToHex = (h: number, s: number, l: number): string => {
  h = h / 360
  s = s / 100
  l = l / 100

  let r, g, b

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

/**
 * Convert hex color to RGB
 */
export const hexToRGB = (hex: string): RGB => {
  hex = hex.replace('#', '')
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  }
}

/**
 * Convert RGB to hex color
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (x: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Interpolate between two colors
 */
export const interpolateColor = (color1: string, color2: string, ratio: number): string => {
  const rgb1 = hexToRGB(color1)
  const rgb2 = hexToRGB(color2)

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio)
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio)
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio)

  return rgbToHex(r, g, b)
}

/**
 * Convert HSV to HSL
 */
export const hsvToHSL = (h: number, s: number, v: number): HSL => {
  const sNorm = s / 100
  const vNorm = v / 100

  const l = vNorm * (1 - sNorm / 2)
  let sHsl = 0

  if (l > 0 && l < 1) {
    sHsl = (vNorm - l) / Math.min(l, 1 - l)
  }

  return {
    h: Math.round(h),
    s: Math.round(sHsl * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Convert HSL to HSV
 */
export const hslToHSV = (h: number, s: number, l: number): { h: number; s: number; v: number } => {
  const sNorm = s / 100
  const lNorm = l / 100

  const v = lNorm + sNorm * Math.min(lNorm, 1 - lNorm)
  let sHsv = 0

  if (v > 0) {
    sHsv = 2 * (1 - lNorm / v)
  }

  return {
    h: Math.round(h),
    s: Math.round(Math.max(0, Math.min(100, sHsv * 100))),
    v: Math.round(Math.max(0, Math.min(100, v * 100))),
  }
}
