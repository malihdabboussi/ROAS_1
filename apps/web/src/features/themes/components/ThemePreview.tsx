'use client'

import { useId, useMemo, type CSSProperties } from 'react'
import {
  DESIGN_TOKENS,
  generateDesignCSS,
  generateGoogleFontsUrl,
  generateShadowWithColor,
  generateSpacingCSS,
  generateThemeCSS,
  generateTypographyCSS,
  hexToRgb,
  resolveThemeColors,
  DEFAULT_DESIGN_SETTINGS,
  type DesignSettings,
  type UserThemeColors,
} from '@/lib/themes'
import { ThemePreviewSections } from './ThemePreviewSections'

interface ThemePreviewProps {
  colors: UserThemeColors
  designSettings?: DesignSettings
  fontHeading?: string | null
  fontBody?: string | null
}

/**
 * Theme Preview - Educational Landing Page Showcase
 *
 * Shows how theme colors and design settings apply to funnel pages.
 * Uses CSS injection for consistent styling with published funnels.
 */
export function ThemePreview({ colors, designSettings, fontHeading, fontBody }: ThemePreviewProps) {
  const settings = designSettings ?? DEFAULT_DESIGN_SETTINGS
  const previewId = useId().replace(/:/g, '-')
  const scopeClass = `theme-preview-${previewId}`

  const resolvedColors = useMemo(() => resolveThemeColors(colors), [colors])

  const fonts = useMemo(() => {
    if (!fontHeading && !fontBody) return null
    return { fontHeading: fontHeading ?? null, fontBody: fontBody ?? null }
  }, [fontHeading, fontBody])

  const scopedCSS = useMemo(() => {
    const colorCSS = generateThemeCSS(resolvedColors, `.${scopeClass}`, fonts)
    const designCSS = generateDesignCSS(settings, `.${scopeClass}`)
    const spacingCSS = generateSpacingCSS(settings.spacing, `.${scopeClass}`)
    const typographyCSS = generateTypographyCSS(settings.typography, `.${scopeClass}`)
    return `${colorCSS}\n\n${designCSS}\n\n${spacingCSS}\n\n${typographyCSS}`
  }, [resolvedColors, settings, scopeClass, fonts])

  const googleFontsUrl = useMemo(() => generateGoogleFontsUrl(fonts), [fonts])

  // Theme preview cards render user-selected colors and design tokens, not app chrome.
  const blockCardStyles = useMemo<CSSProperties>(
    () => ({
      backgroundColor: `rgba(${hexToRgb(colors.cardBackground)}, ${settings.blocks.transparency / 100})`,
      borderRadius: DESIGN_TOKENS.borderRadius[settings.blocks.borderRadius],
      boxShadow: generateShadowWithColor(
        settings.blocks.shadow,
        settings.blocks.shadowColor,
        settings.blocks.shadowOpacity,
      ),
      borderWidth: DESIGN_TOKENS.borderWidth[settings.blocks.borderWidth],
      borderStyle: settings.blocks.borderWidth !== 'none' ? 'solid' : 'none',
      borderColor: colors.border,
    }),
    [colors, settings],
  )

  const buttonStyles = useMemo<CSSProperties>(
    () => ({
      borderRadius: DESIGN_TOKENS.buttonShape[settings.buttons.shape],
      boxShadow: DESIGN_TOKENS.shadow[settings.buttons.shadow],
    }),
    [settings],
  )

  const headingFont: CSSProperties = fontHeading
    ? { fontFamily: `"${fontHeading}", sans-serif` }
    : {}
  const bodyFont: CSSProperties = fontBody ? { fontFamily: `"${fontBody}", sans-serif` } : {}

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scopedCSS }} />
      {googleFontsUrl && <link rel="stylesheet" href={googleFontsUrl} />}

      <ThemePreviewSections
        scopeClass={scopeClass}
        colors={colors}
        settings={settings}
        blockCardStyles={blockCardStyles}
        buttonStyles={buttonStyles}
        headingFont={headingFont}
        bodyFont={bodyFont}
      />
    </>
  )
}
