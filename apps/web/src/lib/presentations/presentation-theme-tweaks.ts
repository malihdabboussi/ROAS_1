import {
  generateDesignCSS,
  generateGoogleFontsUrl,
  generateSpacingCSS,
  generateThemeCSS,
  generateTypographyCSS,
  resolveThemeColors,
} from '@/lib/themes/theme-css-inject'
import {
  DEFAULT_DESIGN_SETTINGS,
  type DesignSettings,
  type Theme,
  type ThemeColors,
} from '@/lib/themes/theme-types'

export type PresentationChrome = 'quiet' | 'composed' | 'maximal'

export type PresentationChromeOverride = 'theme' | PresentationChrome

export type PresentationTypefacePairing = 'theme' | 'editorial' | 'classical' | 'modern' | 'custom'

/**
 * Per-presentation theme overrides ("Tweaks"). Persisted on
 * `presentations.metadata.tweaks` so they never mutate the shared campaign theme.
 */
export interface PresentationTweaks {
  themeId: string | null
  pairing: PresentationTypefacePairing
  fontHeading: string | null
  fontBody: string | null
  chrome: PresentationChromeOverride
}

export const DEFAULT_PRESENTATION_TWEAKS: PresentationTweaks = {
  themeId: null,
  pairing: 'theme',
  fontHeading: null,
  fontBody: null,
  chrome: 'theme',
}

export const TYPEFACE_PAIRINGS: Record<
  Exclude<PresentationTypefacePairing, 'theme' | 'custom'>,
  { label: string; heading: string; body: string }
> = {
  editorial: { label: 'Editorial', heading: 'Playfair Display', body: 'Inter' },
  classical: { label: 'Classical', heading: 'Merriweather', body: 'PT Serif' },
  modern: { label: 'Modern', heading: 'Poppins', body: 'Inter' },
}

export const CHROME_PRESETS: Record<PresentationChrome, { label: string; design: DesignSettings }> =
  {
    quiet: {
      label: 'Quiet',
      design: {
        ...DEFAULT_DESIGN_SETTINGS,
        slides: { ...DEFAULT_DESIGN_SETTINGS.slides, borderRadius: 'sm', shadow: 'none' },
        blocks: { ...DEFAULT_DESIGN_SETTINGS.blocks, borderRadius: 'sm', shadow: 'none' },
        buttons: { shape: 'rounded-sm', shadow: 'none' },
        spacing: {
          sectionDensity: 'compact',
          elementDensity: 'compact',
          paragraphDensity: 'compact',
        },
      },
    },
    composed: {
      label: 'Composed',
      design: {
        ...DEFAULT_DESIGN_SETTINGS,
        slides: { ...DEFAULT_DESIGN_SETTINGS.slides, borderRadius: 'md', shadow: 'sm' },
        blocks: { ...DEFAULT_DESIGN_SETTINGS.blocks, borderRadius: 'md', shadow: 'sm' },
        buttons: { shape: 'rounded', shadow: 'sm' },
        spacing: {
          sectionDensity: 'normal',
          elementDensity: 'normal',
          paragraphDensity: 'normal',
        },
      },
    },
    maximal: {
      label: 'Maximal',
      design: {
        ...DEFAULT_DESIGN_SETTINGS,
        slides: { ...DEFAULT_DESIGN_SETTINGS.slides, borderRadius: 'lg', shadow: 'lg' },
        blocks: { ...DEFAULT_DESIGN_SETTINGS.blocks, borderRadius: 'lg', shadow: 'md' },
        buttons: { shape: 'pill', shadow: 'md' },
        spacing: {
          sectionDensity: 'spacious',
          elementDensity: 'relaxed',
          paragraphDensity: 'relaxed',
        },
      },
    },
  }

export function normalizePresentationTweaks(input: unknown): PresentationTweaks {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ...DEFAULT_PRESENTATION_TWEAKS }
  }
  const raw = input as Record<string, unknown>
  const pairing =
    raw.pairing === 'theme' ||
    raw.pairing === 'editorial' ||
    raw.pairing === 'classical' ||
    raw.pairing === 'modern' ||
    raw.pairing === 'custom'
      ? raw.pairing
      : DEFAULT_PRESENTATION_TWEAKS.pairing
  const chrome =
    raw.chrome === 'theme' ||
    raw.chrome === 'quiet' ||
    raw.chrome === 'composed' ||
    raw.chrome === 'maximal'
      ? raw.chrome
      : DEFAULT_PRESENTATION_TWEAKS.chrome
  return {
    themeId: typeof raw.themeId === 'string' && raw.themeId ? raw.themeId : null,
    pairing,
    fontHeading: typeof raw.fontHeading === 'string' && raw.fontHeading ? raw.fontHeading : null,
    fontBody: typeof raw.fontBody === 'string' && raw.fontBody ? raw.fontBody : null,
    chrome,
  }
}

export function resolveTweakFonts(tweaks: PresentationTweaks): {
  fontHeading: string | null
  fontBody: string | null
} {
  if (tweaks.pairing === 'theme') {
    return { fontHeading: null, fontBody: null }
  }
  if (tweaks.pairing !== 'custom') {
    const preset = TYPEFACE_PAIRINGS[tweaks.pairing]
    return { fontHeading: preset.heading, fontBody: preset.body }
  }
  return { fontHeading: tweaks.fontHeading, fontBody: tweaks.fontBody }
}

const TWEAK_STYLE_ID = 'vibey-tweaks-theme'

/**
 * Mapping layer that points common generated-slide elements at theme tokens.
 * Uses !important so it wins over the deck's non-important inline styles, while
 * still letting users escape via direct element edits (which set inline !important).
 */
interface PresentationTweakCssOptions {
  applySlideChrome?: boolean
}

function buildMappingCss(options: PresentationTweakCssOptions = {}): string {
  const applySlideChrome = options.applySlideChrome ?? true
  const slideChromeCss = applySlideChrome
    ? `
  border-radius: var(--design-slide-radius) !important;
  box-shadow: var(--design-slide-shadow) !important;
  border: var(--design-slide-border-width) solid var(--color-border) !important;`
    : ''

  return `
html, body, main {
  background: var(--color-page-background) !important;
  color: var(--color-body) !important;
  font-family: var(--font-body) !important;
}
section {
  background: var(--color-slide-background) !important;
  color: var(--color-body) !important;
${slideChromeCss}
}
h1, h2, h3, h4, h5, h6 {
  color: var(--color-heading) !important;
  font-family: var(--font-heading) !important;
}
p, li, blockquote, figcaption, dd, dt, label, small, td, th {
  color: var(--color-body) !important;
  font-family: var(--font-body) !important;
}
a { color: var(--color-primary-solid, var(--color-primary)) !important; }
.vibey-card, [data-vibey-role="card"], article, figure, aside {
  background: color-mix(in srgb, var(--color-card-background) calc(var(--design-block-opacity) * 100%), transparent) !important;
  border-radius: var(--design-block-radius) !important;
  box-shadow: var(--design-block-shadow) !important;
  border: var(--design-block-border-width) solid var(--color-border) !important;
}
button, [role="button"] {
  background: var(--color-primary) !important;
  color: var(--color-primary-foreground) !important;
  border-color: var(--color-primary-solid, var(--color-primary)) !important;
  border-radius: var(--design-button-radius) !important;
  box-shadow: var(--design-button-shadow) !important;
}
`.trim()
}

export interface PresentationTweakCss {
  css: string
  fontsUrl: string | null
}

/**
 * Resolves tweaks + the selected theme into a single injectable stylesheet plus
 * an optional Google Fonts URL. Returns null colors fall back to theme defaults.
 */
export function buildPresentationTweakCss(
  tweaks: PresentationTweaks,
  theme: Theme | null,
  options: PresentationTweakCssOptions = {},
): PresentationTweakCss {
  const overrideFonts = resolveTweakFonts(tweaks)
  const fonts = {
    fontHeading: overrideFonts.fontHeading ?? theme?.font_heading ?? null,
    fontBody: overrideFonts.fontBody ?? theme?.font_body ?? null,
  }
  const colors: ThemeColors = resolveThemeColors(theme?.colors ?? null)
  const designSettings =
    tweaks.chrome === 'theme'
      ? (theme?.design_settings ?? DEFAULT_DESIGN_SETTINGS)
      : CHROME_PRESETS[tweaks.chrome].design
  const themeCss = generateThemeCSS(colors, ':root', {
    fontHeading: fonts.fontHeading,
    fontBody: fonts.fontBody,
  })
  const designCss = generateDesignCSS(designSettings, ':root')
  const spacingCss = generateSpacingCSS(designSettings.spacing, ':root')
  const typographyCss = generateTypographyCSS(designSettings.typography, ':root')
  const css = [themeCss, designCss, spacingCss, typographyCss, buildMappingCss(options)].join(
    '\n\n',
  )
  return {
    css: `/* ${TWEAK_STYLE_ID} */\n${css}`,
    fontsUrl: generateGoogleFontsUrl({
      fontHeading: fonts.fontHeading,
      fontBody: fonts.fontBody,
    }),
  }
}

export const PRESENTATION_TWEAK_STYLE_ID = TWEAK_STYLE_ID
