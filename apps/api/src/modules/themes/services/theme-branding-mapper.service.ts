import { Injectable } from '@nestjs/common'
import type {
  BorderRadiusOption,
  BrandVoice,
  ButtonShapeOption,
  DesignSettings,
  FirecrawlBrandingData,
  MappedThemeData,
  UserThemeColors,
} from '../types'
import { DEFAULT_DESIGN_SETTINGS } from '../types'

@Injectable()
export class ThemeBrandingMapperService {
  mapBrandingToTheme(
    branding: FirecrawlBrandingData,
    websiteUrl: string,
    metadata?: Record<string, unknown>,
  ): MappedThemeData {
    const suggestedName = this.generateThemeName(websiteUrl, metadata)

    const colors: UserThemeColors = {
      primary: branding.colors?.primary || '#6237C8',
      primaryForeground: this.getContrastColor(branding.colors?.primary || '#6237C8'),
      secondaryAccent1: branding.colors?.secondary || branding.colors?.accent || '#F9598D',
      secondaryAccent2: branding.colors?.accent || branding.colors?.secondary || '#FB8B61',
      heading: branding.colors?.textPrimary || '#272525',
      body: branding.colors?.textSecondary || '#5A5858',
      pageBackground: branding.colors?.background || '#FFFFFF',
      cardBackground: this.deriveCardBackground(branding.colors?.background || '#FFFFFF'),
      border: this.deriveBorderColor(branding.colors?.background || '#FFFFFF'),
      input: this.deriveInputColor(branding.colors?.background || '#FFFFFF'),
    }

    const fontHeading = this.extractFontHeading(branding)
    const fontBody = this.extractFontBody(branding)
    const logoUrl = branding.images?.logo || branding.logo || null
    const faviconUrl = branding.images?.favicon || null
    const ogImageUrl = branding.images?.ogImage || null
    const brandVoice = this.extractBrandVoice(branding)
    const designSettings = this.extractDesignSettings(branding)

    return {
      colors,
      fontHeading,
      fontBody,
      suggestedName,
      logoUrl,
      faviconUrl,
      ogImageUrl,
      brandVoice,
      designSettings,
    }
  }

  private generateThemeName(url: string, metadata?: Record<string, unknown>): string {
    if (metadata) {
      const ogSiteName = this.readMetadataString(metadata, 'og:site_name', 'ogSiteName')
      if (ogSiteName) return ogSiteName

      const ogTitle = this.readMetadataString(metadata, 'og:title', 'ogTitle', 'title')
      if (ogTitle) {
        const titleMatch = ogTitle.match(/^([^-]+)/)
        if (titleMatch?.[1]) {
          const brandName = titleMatch[1].trim()
          if (brandName.length > 0 && brandName.length < 100) return brandName
        }
      }
    }

    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname.replace('www.', '')
      const name = domain.split('.')[0]!
      return name.charAt(0).toUpperCase() + name.slice(1)
    } catch {
      return 'Imported'
    }
  }

  private getContrastColor(bgColor: string): string {
    const hex = bgColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#FFFFFF'
  }

  private deriveCardBackground(pageBackground: string): string {
    const hex = pageBackground.replace('#', '').toUpperCase()
    if (hex === 'FFFFFF' || hex === 'FFF') return '#FDFAF7'
    if (hex === '000000' || hex === '000') return '#0A0A0A'

    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const avg = (r + g + b) / 3
    const delta = avg > 128 ? -10 : 10

    return `#${this.clampHex(r + delta)}${this.clampHex(g + delta)}${this.clampHex(b + delta)}`
  }

  private deriveBorderColor(pageBackground: string): string {
    const hex = pageBackground.replace('#', '').toUpperCase()
    if (hex === 'FFFFFF' || hex === 'FFF') return '#E8E3DF'
    if (hex === '000000' || hex === '000') return '#1F0A0A'

    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `#${this.clampHex(r - 20)}${this.clampHex(g - 20)}${this.clampHex(b - 20)}`
  }

  private deriveInputColor(pageBackground: string): string {
    const hex = pageBackground.replace('#', '').toUpperCase()
    if (hex === 'FFFFFF' || hex === 'FFF') return '#F5F1ED'
    if (hex === '000000' || hex === '000') return '#150505'

    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `#${this.clampHex(r - 15)}${this.clampHex(g - 15)}${this.clampHex(b - 15)}`
  }

  private clampHex(n: number): string {
    return Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  }

  private readMetadataString(metadata: Record<string, unknown>, ...keys: string[]): string | null {
    for (const key of keys) {
      const value = metadata[key]
      if (typeof value !== 'string') continue
      const trimmed = value.trim()
      if (trimmed.length > 0) return trimmed
    }
    return null
  }

  private extractFontHeading(branding: FirecrawlBrandingData): string | null {
    if (branding.typography?.fontFamilies?.heading) return branding.typography.fontFamilies.heading
    if (branding.typography?.fontFamilies?.primary) return branding.typography.fontFamilies.primary
    if (branding.fonts?.length) return branding.fonts[0]!.family
    return null
  }

  private extractFontBody(branding: FirecrawlBrandingData): string | null {
    if (branding.typography?.fontFamilies?.primary) return branding.typography.fontFamilies.primary
    if (branding.fonts && branding.fonts.length > 1) return branding.fonts[1]!.family
    if (branding.fonts?.length) return branding.fonts[0]!.family
    return null
  }

  private extractBrandVoice(branding: FirecrawlBrandingData): BrandVoice | null {
    if (!branding.personality) return null
    const { tone, energy, targetAudience } = branding.personality
    if (!tone && !energy && !targetAudience) return null

    return {
      tone: tone || '',
      style: energy || '',
      personality: targetAudience ? `Target audience: ${targetAudience}` : '',
    }
  }

  private extractDesignSettings(branding: FirecrawlBrandingData): DesignSettings | null {
    const globalRadius = branding.spacing?.borderRadius
    const buttonRadius = branding.components?.buttonPrimary?.borderRadius || globalRadius

    if (!globalRadius && !buttonRadius) return null

    const radiusOption = this.cssRadiusToBorderRadiusOption(globalRadius)
    const buttonShape = this.cssRadiusToButtonShape(buttonRadius)

    return {
      ...DEFAULT_DESIGN_SETTINGS,
      slides: { ...DEFAULT_DESIGN_SETTINGS.slides, borderRadius: radiusOption },
      blocks: { ...DEFAULT_DESIGN_SETTINGS.blocks, borderRadius: radiusOption },
      buttons: { ...DEFAULT_DESIGN_SETTINGS.buttons, shape: buttonShape },
    }
  }

  private cssRadiusToBorderRadiusOption(cssValue?: string): BorderRadiusOption {
    if (!cssValue) return 'md'
    const px = parseInt(cssValue, 10)
    if (isNaN(px)) return 'md'
    if (px === 0) return 'none'
    if (px <= 4) return 'sm'
    if (px <= 8) return 'md'
    if (px <= 16) return 'lg'
    return 'xl'
  }

  private cssRadiusToButtonShape(cssValue?: string): ButtonShapeOption {
    if (!cssValue) return 'rounded'
    const px = parseInt(cssValue, 10)
    if (isNaN(px)) return 'rounded'
    if (px === 0) return 'square'
    if (px <= 4) return 'rounded-sm'
    if (px <= 12) return 'rounded'
    return 'pill'
  }
}
