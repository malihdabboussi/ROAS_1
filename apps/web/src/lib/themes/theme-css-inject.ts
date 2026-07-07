/**
 * Theme CSS utilities for ThemePreview and funnel rendering.
 * Ported from Vibey_legacy/apps/app/src/lib/utils/ui/theme-css-inject.ts
 */

import type {
  DesignSettings,
  SpacingSettings,
  ThemeColors,
  TypographySettings,
  UserThemeColors,
} from './theme-types'
import {
  DEFAULT_DESIGN_SETTINGS,
  DEFAULT_SPACING_SETTINGS,
  DEFAULT_TYPOGRAPHY_SETTINGS,
} from './theme-types'

const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: '#10B981',
  primaryForeground: '#000000',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  secondaryAccent1: '#7AF0FF',
  secondaryAccent2: '#120336',
  heading: '#161616',
  body: '#666666',
  pageBackground: '#FAF9F6',
  slideBackground: '#FAF9F6',
  cardBackground: '#FFFFFF',
  border: '#E5E5E5',
  input: '#F2F2F2',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#EF4444',
  calloutInfo: '#3b82f6',
  calloutSuccess: '#22c55e',
  calloutWarning: '#f59e0b',
  calloutQuestion: '#10B981',
  calloutTip: '#06b6d4',
}

function hexToRGB(hex: string): string {
  if (hex.includes('gradient')) {
    const match = hex.match(/#[0-9A-Fa-f]{6}/)
    hex = match ? match[0] : '#000000'
  }
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

function extractSolidColor(color: string): string {
  if (color.includes('gradient')) {
    const match = color.match(/#[0-9A-Fa-f]{6}/)
    return match ? match[0] : '#000000'
  }
  return color
}

function hexToHSL(hex: string): string {
  if (hex.includes('gradient')) {
    const match = hex.match(/#[0-9A-Fa-f]{6}/)
    hex = match ? match[0] : '#000000'
  }
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16) / 255
  const g = parseInt(cleaned.substring(2, 4), 16) / 255
  const b = parseInt(cleaned.substring(4, 6), 16) / 255
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
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export interface ThemeFonts {
  fontHeading: string | null
  fontBody: string | null
}

export function resolveThemeColors(
  dbColors: Partial<UserThemeColors> | Partial<ThemeColors> | null | undefined,
  fallbackColors: ThemeColors = DEFAULT_THEME_COLORS,
): ThemeColors {
  if (!dbColors) return fallbackColors
  return { ...fallbackColors, ...dbColors } as ThemeColors
}

export function generateThemeCSS(
  colors: ThemeColors,
  scopeSelector: string = ':root',
  fonts?: ThemeFonts | null,
): string {
  const selectors =
    scopeSelector === ':root'
      ? 'html, :root, .dark'
      : `${scopeSelector}, ${scopeSelector}.dark, html.dark ${scopeSelector}`
  const fontCSS = fonts
    ? `
  ${fonts.fontHeading ? `--font-heading: "${fonts.fontHeading}", sans-serif;` : ''}
  ${fonts.fontHeading ? `--font-heading-condensed: "${fonts.fontHeading}", sans-serif;` : ''}
  ${fonts.fontBody ? `--font-body: "${fonts.fontBody}", ui-sans-serif, system-ui, sans-serif;` : ''}
  ${fonts.fontBody ? `--font-sans: "${fonts.fontBody}", ui-sans-serif, system-ui, sans-serif;` : ''}`
    : ''

  const pageHex = extractSolidColor(colors.pageBackground).replace('#', '')
  const r = parseInt(pageHex.substring(0, 2), 16) / 255
  const g = parseInt(pageHex.substring(2, 4), 16) / 255
  const b = parseInt(pageHex.substring(4, 6), 16) / 255
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  const pageIsDark = luminance < 0.5
  const darkBgColor = pageIsDark ? colors.pageBackground : '#1f2937'

  return `
${selectors} {
  --color-primary: ${colors.primary};
  --color-primary-solid: ${extractSolidColor(colors.primary)};
  --color-primary-foreground: ${colors.primaryForeground};
  --color-primary-light: ${colors.primaryLight};
  --color-primary-dark: ${colors.primaryDark};
  --color-primary-rgb: ${hexToRGB(colors.primary)};
  --color-primary-foreground-rgb: ${hexToRGB(colors.primaryForeground)};
  --primary: ${hexToHSL(colors.primary)};
  --primary-foreground: ${hexToHSL(colors.primaryForeground)};
  --color-secondary-accent-1: ${colors.secondaryAccent1};
  --color-secondary-accent-1-solid: ${extractSolidColor(colors.secondaryAccent1)};
  --color-secondary-accent-2: ${colors.secondaryAccent2};
  --color-secondary-accent-1-rgb: ${hexToRGB(colors.secondaryAccent1)};
  --color-secondary-accent-2-rgb: ${hexToRGB(colors.secondaryAccent2)};
  --color-accent: ${colors.primaryDark};
  --color-accent-rgb: ${hexToRGB(colors.primaryDark)};
  --accent: ${hexToHSL(colors.secondaryAccent1)};
  --color-foreground: ${colors.heading};
  --color-heading: ${colors.heading};
  --color-muted-foreground: ${colors.body};
  --color-body: ${colors.body};
  --color-heading-rgb: ${hexToRGB(colors.heading)};
  --color-body-rgb: ${hexToRGB(colors.body)};
  --color-heading-h1: ${(colors as ThemeColors & Partial<UserThemeColors>).headingH1 || colors.heading};
  --color-heading-h2: ${(colors as ThemeColors & Partial<UserThemeColors>).headingH2 || colors.heading};
  --color-heading-h3: ${(colors as ThemeColors & Partial<UserThemeColors>).headingH3 || colors.heading};
  --color-heading-h4: ${(colors as ThemeColors & Partial<UserThemeColors>).headingH4 || colors.heading};
  --color-body-lg: ${(colors as ThemeColors & Partial<UserThemeColors>).bodyLg || colors.body};
  --color-body-sm: ${(colors as ThemeColors & Partial<UserThemeColors>).bodySm || colors.body};
  --color-text: ${colors.heading};
  --color-text-secondary: ${colors.body};
  --color-text-light: ${colors.primaryForeground};
  --color-background: ${colors.pageBackground} !important;
  --color-page-background: ${colors.pageBackground} !important;
  --color-slide-background: ${colors.slideBackground || colors.pageBackground} !important;
  --color-card: ${colors.cardBackground} !important;
  --color-card-background: ${colors.cardBackground} !important;
  --color-background-rgb: ${hexToRGB(colors.pageBackground)};
  --color-slide-background-rgb: ${hexToRGB(colors.slideBackground || colors.pageBackground)};
  --color-card-rgb: ${hexToRGB(colors.cardBackground)};
  --background: ${hexToHSL(colors.pageBackground)};
  --card: ${hexToHSL(colors.cardBackground)};
  --card-foreground: ${hexToHSL(colors.heading)};
  --color-border: ${colors.border} !important;
  --color-input: ${colors.input} !important;
  --border: ${hexToHSL(colors.border)};
  --input: ${hexToHSL(colors.input)};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-danger: ${colors.danger};
  --color-danger-rgb: ${hexToRGB(colors.danger)};
  --color-callout-info: ${colors.calloutInfo || '#3b82f6'};
  --color-callout-success: ${colors.calloutSuccess || '#22c55e'};
  --color-callout-warning: ${colors.calloutWarning || '#f59e0b'};
  --color-callout-question: ${colors.calloutQuestion || colors.primary};
  --color-callout-tip: ${colors.calloutTip || '#06b6d4'};
  --color-primary-hover: ${colors.primaryDark};
  --color-secondary: ${colors.secondaryAccent1};
  --color-error: ${colors.danger};
  --color-background-alt: ${colors.cardBackground};
  --color-background-dark: ${darkBgColor};
  --font-button: var(--font-heading);
${fontCSS}
}
`.trim()
}

export function generateGoogleFontsUrl(fonts: ThemeFonts | null | undefined): string | null {
  if (!fonts) return null
  const fontFamilies: string[] = []
  if (fonts.fontHeading) {
    fontFamilies.push(`family=${encodeURIComponent(fonts.fontHeading)}:wght@400;500;600;700;800`)
  }
  if (fonts.fontBody && fonts.fontBody !== fonts.fontHeading) {
    fontFamilies.push(`family=${encodeURIComponent(fonts.fontBody)}:wght@400;500;600;700`)
  }
  if (fontFamilies.length === 0) return null
  return `https://fonts.googleapis.com/css2?${fontFamilies.join('&')}&display=swap`
}

function hexToRgbForShadow(hex: string | undefined): string {
  if (!hex) return '0, 0, 0'
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

export function generateShadowWithColor(
  size: 'none' | 'sm' | 'md' | 'lg',
  color?: string,
  opacity?: number,
): string {
  if (size === 'none') return 'none'
  const rgb = hexToRgbForShadow(color)
  const baseOpacity = (opacity ?? 30) / 100
  const primaryOpacity = Math.min(baseOpacity + 0.05, 1).toFixed(2)
  const secondaryOpacity = Math.max(baseOpacity - 0.05, 0).toFixed(2)
  const shadows: Record<'sm' | 'md' | 'lg', string> = {
    sm: `0 2px 4px 0 rgba(${rgb}, ${primaryOpacity}), 0 1px 2px -1px rgba(${rgb}, ${secondaryOpacity})`,
    md: `0 4px 8px -1px rgba(${rgb}, ${primaryOpacity}), 0 2px 4px -2px rgba(${rgb}, ${secondaryOpacity})`,
    lg: `0 10px 20px -3px rgba(${rgb}, ${primaryOpacity}), 0 4px 8px -4px rgba(${rgb}, ${secondaryOpacity})`,
  }
  return shadows[size]
}

export const DESIGN_TOKENS = {
  borderRadius: {
    none: '0px',
    sm: '8px',
    md: '16px',
    lg: '32px',
    xl: '64px',
  },
  shadow: {
    none: 'none',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  },
  borderWidth: {
    none: '0px',
    thin: '1px',
    medium: '2px',
    thick: '3px',
  },
  buttonShape: {
    square: '0px',
    'rounded-sm': '4px',
    rounded: '8px',
    pill: '9999px',
  },
  linkStyle: {
    underline: 'underline',
    none: 'none',
    'hover-underline': 'none',
  },
} as const

const SPACING_DENSITY_TOKENS = {
  section: { compact: '2rem', normal: '4rem', relaxed: '5rem', spacious: '6rem' },
  card: { compact: '1rem', normal: '1.5rem', relaxed: '2rem', spacious: '2.5rem' },
  grid: { compact: '1rem', normal: '1.5rem', relaxed: '2rem', spacious: '2.5rem' },
  paragraph: { compact: '0.75rem', normal: '1rem', relaxed: '1.25rem', spacious: '1.5rem' },
  list: { compact: '0.25rem', normal: '0.5rem', relaxed: '0.75rem', spacious: '1rem' },
} as const

const TYPOGRAPHY_SCALE_TOKENS = {
  xs: { small: '0.625rem', normal: '0.75rem', large: '0.875rem' },
  sm: { small: '0.75rem', normal: '0.875rem', large: '1rem' },
  base: { small: '0.875rem', normal: '1rem', large: '1.125rem' },
  lg: { small: '1rem', normal: '1.125rem', large: '1.25rem' },
  xl: { small: '1.125rem', normal: '1.25rem', large: '1.5rem' },
  '2xl': { small: '1.25rem', normal: '1.5rem', large: '1.75rem' },
  '3xl': { small: '1.5rem', normal: '1.875rem', large: '2.25rem' },
  '4xl': { small: '1.875rem', normal: '2.25rem', large: '3rem' },
} as const

export function generateDesignCSS(
  settings: DesignSettings | null | undefined,
  scopeSelector: string = ':root',
): string {
  const s = settings ?? DEFAULT_DESIGN_SETTINGS
  return `
${scopeSelector} {
  --design-slide-radius: ${DESIGN_TOKENS.borderRadius[s.slides.borderRadius]};
  --design-slide-shadow: ${generateShadowWithColor(s.slides.shadow, s.slides.shadowColor, s.slides.shadowOpacity)};
  --design-slide-border-width: ${DESIGN_TOKENS.borderWidth[s.slides.borderWidth]};
  --design-block-radius: ${DESIGN_TOKENS.borderRadius[s.blocks.borderRadius]};
  --design-block-border-width: ${DESIGN_TOKENS.borderWidth[s.blocks.borderWidth]};
  --design-block-shadow: ${generateShadowWithColor(s.blocks.shadow, s.blocks.shadowColor, s.blocks.shadowOpacity)};
  --design-block-opacity: ${s.blocks.transparency / 100};
  --design-button-radius: ${DESIGN_TOKENS.buttonShape[s.buttons.shape]};
  --design-button-shadow: ${DESIGN_TOKENS.shadow[s.buttons.shadow] || 'none'};
  --design-link-decoration: ${DESIGN_TOKENS.linkStyle[s.links.style]};
}`.trim()
}

export function generateSpacingCSS(
  settings: SpacingSettings | null | undefined,
  scopeSelector: string = ':root',
): string {
  const s = settings ?? DEFAULT_SPACING_SETTINGS
  return `
${scopeSelector} {
  --spacing-section: ${SPACING_DENSITY_TOKENS.section[s.sectionDensity]};
  --spacing-card: ${SPACING_DENSITY_TOKENS.card[s.elementDensity]};
  --spacing-grid: ${SPACING_DENSITY_TOKENS.grid[s.elementDensity]};
  --spacing-paragraph: ${SPACING_DENSITY_TOKENS.paragraph[s.paragraphDensity]};
  --spacing-list: ${SPACING_DENSITY_TOKENS.list[s.paragraphDensity]};
}`.trim()
}

export function generateTypographyCSS(
  settings: TypographySettings | null | undefined,
  scopeSelector: string = ':root',
): string {
  const s = settings ?? DEFAULT_TYPOGRAPHY_SETTINGS
  const scale = s.scale
  return `
${scopeSelector} {
  --font-size-xs: ${TYPOGRAPHY_SCALE_TOKENS.xs[scale]};
  --font-size-sm: ${TYPOGRAPHY_SCALE_TOKENS.sm[scale]};
  --font-size-base: ${TYPOGRAPHY_SCALE_TOKENS.base[scale]};
  --font-size-lg: ${TYPOGRAPHY_SCALE_TOKENS.lg[scale]};
  --font-size-xl: ${TYPOGRAPHY_SCALE_TOKENS.xl[scale]};
  --font-size-2xl: ${TYPOGRAPHY_SCALE_TOKENS['2xl'][scale]};
  --font-size-3xl: ${TYPOGRAPHY_SCALE_TOKENS['3xl'][scale]};
  --font-size-4xl: ${TYPOGRAPHY_SCALE_TOKENS['4xl'][scale]};
}`.trim()
}

export function hexToRgb(hex: string): string {
  if (hex.includes('gradient')) {
    const match = hex.match(/#[0-9A-Fa-f]{6}/)
    hex = match ? match[0] : '#000000'
  }
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}
