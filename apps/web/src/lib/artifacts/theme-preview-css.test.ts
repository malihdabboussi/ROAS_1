import { describe, expect, it } from 'vitest'
import type { Theme } from '@/lib/themes/theme-types'
import { buildThemePreviewCss } from './theme-preview-css'

function makeTheme(overrides: Partial<Theme> = {}): Theme {
  return {
    id: 'theme-1',
    slug: 'theme-1',
    name: 'Theme 1',
    colors: {
      primary: '#10b981',
      primaryForeground: '#ffffff',
      secondaryAccent1: '',
      secondaryAccent2: '#7c3aed',
      heading: '#111827',
      body: '#4b5563',
      pageBackground: '#f9fafb',
      cardBackground: '#ffffff',
      border: '#e5e7eb',
      input: '#f3f4f6',
      primaryLight: '',
      primaryDark: '',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
    logo_asset_id: null,
    headshot_images: [],
    product_images: [],
    font_heading: 'Inter',
    font_body: null,
    brand_voice: null,
    brand_values: null,
    social_links: null,
    design_settings: null,
    image_style_prompt: null,
    preview_image_url: null,
    is_system: false,
    status: 'complete',
    user_id: 'user-1',
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildThemePreviewCss', () => {
  it('maps non-empty theme colors and fonts to preview CSS variables', () => {
    const css = buildThemePreviewCss(makeTheme())

    expect(css).toContain(':root {')
    expect(css).toContain('  --color-primary: #10b981;')
    expect(css).toContain('  --color-primary-foreground: #ffffff;')
    expect(css).toContain('  --color-accent: #7c3aed;')
    expect(css).toContain('  --color-foreground: #111827;')
    expect(css).toContain('  --color-muted-foreground: #4b5563;')
    expect(css).toContain('  --color-background: #f9fafb;')
    expect(css).toContain('  --color-card: #ffffff;')
    expect(css).toContain('  --color-border: #e5e7eb;')
    expect(css).toContain('  --color-input: #f3f4f6;')
    expect(css).toContain('  --color-success: #22c55e;')
    expect(css).toContain('  --color-warning: #f59e0b;')
    expect(css).toContain('  --color-danger: #ef4444;')
    expect(css).toContain('  --font-heading: Inter;')
    expect(css).not.toContain('--color-secondary:')
    expect(css).not.toContain('--font-body:')
  })

  it('returns an empty string when the theme has no previewable values', () => {
    const theme = makeTheme({
      colors: {
        primary: '',
        primaryForeground: '',
        secondaryAccent1: '',
        secondaryAccent2: '',
        heading: '',
        body: '',
        pageBackground: '',
        cardBackground: '',
        border: '',
        input: '',
        primaryLight: '',
        primaryDark: '',
        success: '',
        warning: '',
        danger: '',
      },
      font_heading: null,
      font_body: null,
    })

    expect(buildThemePreviewCss(theme)).toBe('')
  })
})
