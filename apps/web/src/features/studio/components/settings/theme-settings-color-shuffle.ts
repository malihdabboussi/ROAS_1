import type { Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'
import { THEME_TOAST_SUCCESS } from '@/features/themes/config/theme-errors.config'
import type { UserThemeColors } from '@/features/themes/types'

function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const saturation = Math.floor(Math.random() * 40) + 60
  const lightness = Math.floor(Math.random() * 30) + 40
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (!match) return '#000000'
  const h = parseInt(match[1] ?? '0') / 360
  const s = parseInt(match[2] ?? '0') / 100
  const l = parseInt(match[3] ?? '0') / 100
  let r: number
  let g: number
  let b: number
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

function generateGradient(): string {
  const numStops = Math.floor(Math.random() * 3) + 2
  const angle = [0, 45, 90, 135, 180, 225, 270, 315][Math.floor(Math.random() * 8)]
  const stops: string[] = []
  for (let i = 0; i < numStops; i++) {
    const position = Math.round((i / (numStops - 1)) * 100)
    const color = hslToHex(generateRandomColor())
    stops.push(`${color} ${position}%`)
  }
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`
}

export function shuffleThemeColors(
  colors: UserThemeColors,
  setColors: Dispatch<SetStateAction<UserThemeColors>>,
): void {
  const useGradientPrimary = Math.random() > 0.5
  const useGradientAccent1 = Math.random() > 0.5
  const primary = useGradientPrimary ? generateGradient() : hslToHex(generateRandomColor())
  const primaryForeground = '#FFFFFF'
  const secondaryAccent1 = useGradientAccent1 ? generateGradient() : hslToHex(generateRandomColor())
  const secondaryAccent2 = hslToHex(generateRandomColor())
  const heading = '#0F0F0F'
  const body = '#5C5C5C'
  const pageBackground = '#FAFAFA'
  const slideBackground = '#FAFAFA'
  const cardBackground = '#FFFFFF'
  const border = '#E0E0E0'
  const input = '#F5F5F5'
  setColors({
    ...colors,
    primary,
    primaryForeground,
    secondaryAccent1,
    secondaryAccent2,
    heading,
    body,
    pageBackground,
    slideBackground,
    cardBackground,
    border,
    input,
  })
  toast.success(THEME_TOAST_SUCCESS.COLORS_SHUFFLED.userMessage)
}
