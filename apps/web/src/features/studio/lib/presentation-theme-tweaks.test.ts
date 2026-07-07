import { describe, expect, it } from 'vitest'
import type { Theme } from '@/features/themes/types'
import { buildPresentationTweakCss, DEFAULT_PRESENTATION_TWEAKS } from './presentation-theme-tweaks'

const baseTheme: Theme = {
  id: 'theme-1',
  slug: 'theme-one',
  name: 'Theme One',
  colors: {
    primary: '#111111',
    primaryForeground: '#ffffff',
    primaryLight: '#333333',
    primaryDark: '#000000',
    secondaryAccent1: '#222222',
    secondaryAccent2: '#444444',
    heading: '#050505',
    body: '#555555',
    pageBackground: '#f7f7f7',
    slideBackground: '#eeeeee',
    cardBackground: '#ffffff',
    border: '#dddddd',
    input: '#f0f0f0',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#EF4444',
  },
  logo_asset_id: null,
  headshot_images: [],
  product_images: [],
  font_heading: 'Playfair Display',
  font_body: 'Inter',
  brand_voice: null,
  brand_values: null,
  social_links: null,
  design_settings: {
    slides: {
      borderRadius: 'lg',
      shadow: 'lg',
      borderWidth: 'thin',
      transparency: 100,
      accentImageShape: 'hard',
    },
    blocks: {
      fillColorMode: 'subtle',
      borderRadius: 'xl',
      borderWidth: 'medium',
      shadow: 'md',
      transparency: 88,
    },
    buttons: { shape: 'pill', shadow: 'md' },
    links: { style: 'underline' },
    spacing: { sectionDensity: 'spacious', elementDensity: 'relaxed', paragraphDensity: 'compact' },
    typography: { scale: 'large' },
  },
  image_style_prompt: null,
  preview_image_url: null,
  is_system: false,
  status: 'complete',
  user_id: 'user-1',
  created_at: '2026-05-28T00:00:00.000Z',
}

describe('buildPresentationTweakCss', () => {
  it('uses the full theme contract by default', () => {
    const result = buildPresentationTweakCss(DEFAULT_PRESENTATION_TWEAKS, baseTheme)

    expect(result.css).toContain('--color-primary: #111111')
    expect(result.css).toContain('--font-heading: "Playfair Display", sans-serif;')
    expect(result.css).toContain('--design-slide-radius: 32px')
    expect(result.css).toContain('--design-button-radius: 9999px')
    expect(result.css).toContain('--spacing-section: 6rem')
    expect(result.css).toContain('--font-size-base: 1.125rem')
    expect(result.fontsUrl).toContain('Playfair')
  })

  it('falls back to default design settings for color-only themes', () => {
    const result = buildPresentationTweakCss(DEFAULT_PRESENTATION_TWEAKS, {
      ...baseTheme,
      font_heading: null,
      font_body: null,
      design_settings: null,
    })

    expect(result.css).toContain('--color-primary: #111111')
    expect(result.css).toContain('--design-slide-radius: 16px')
    expect(result.css).toContain('--design-button-radius: 8px')
    expect(result.fontsUrl).toBeNull()
  })

  it('lets deck-level typography and chrome override theme defaults', () => {
    const result = buildPresentationTweakCss(
      {
        ...DEFAULT_PRESENTATION_TWEAKS,
        pairing: 'editorial',
        chrome: 'quiet',
      },
      baseTheme,
    )

    expect(result.css).toContain('--font-heading: "Playfair Display", sans-serif;')
    expect(result.css).toContain('--font-body: "Inter", ui-sans-serif, system-ui, sans-serif;')
    expect(result.css).toContain('--design-slide-radius: 8px')
    expect(result.css).toContain('--design-button-radius: 4px')
  })

  it('can keep presentation slide sections canvas-only while styling inner cards', () => {
    const result = buildPresentationTweakCss(DEFAULT_PRESENTATION_TWEAKS, baseTheme, {
      applySlideChrome: false,
    })
    const sectionBlock = result.css.match(/section \{[\s\S]*?\n\}/)?.[0] ?? ''
    const cardBlock =
      result.css.match(
        /\.vibey-card, \[data-vibey-role="card"\], article, figure, aside \{[\s\S]*?\n\}/,
      )?.[0] ?? ''

    expect(sectionBlock).toContain('background: var(--color-slide-background)')
    expect(sectionBlock).not.toContain('border-radius')
    expect(sectionBlock).not.toContain('box-shadow')
    expect(sectionBlock).not.toContain('border:')
    expect(cardBlock).toContain('border-radius: var(--design-block-radius)')
    expect(cardBlock).toContain('box-shadow: var(--design-block-shadow)')
  })
})
