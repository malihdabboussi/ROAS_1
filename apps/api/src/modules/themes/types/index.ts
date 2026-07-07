/**
 * Theme Types
 *
 * Ported from: Vibey_legacy/apps/app-backend/src/modules/themes/types/themes.types.ts
 */

export interface ThemeColors {
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
  calloutInfo?: string
  calloutSuccess?: string
  calloutWarning?: string
  calloutQuestion?: string
  calloutTip?: string
  primaryLight: string
  primaryDark: string
  success: string
  warning: string
  danger: string
}

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

export interface BrandVoice {
  tone: string
  style: string
  personality: string
}

export interface BrandValues {
  primary: string
  secondary: string[]
  tagline: string | null
}

export interface SocialLinks {
  website?: string | null
  instagram?: string | null
  facebook?: string | null
  twitter?: string | null
  linkedin?: string | null
  youtube?: string | null
  tiktok?: string | null
  pinterest?: string | null
  threads?: string | null
  bluesky?: string | null
}

export interface ThemeImageEntry {
  asset_id: string
  url?: string
  name: string
  description: string
}

export type BorderRadiusOption = 'none' | 'sm' | 'md' | 'lg' | 'xl'
export type ShadowOption = 'none' | 'sm' | 'md' | 'lg'
export type BorderWidthOption = 'none' | 'thin' | 'medium' | 'thick'
export type ButtonShapeOption = 'square' | 'rounded-sm' | 'rounded' | 'pill'
export type FillColorModeOption = 'subtle' | 'primary' | 'custom'
export type LinkStyleOption = 'underline' | 'none' | 'hover-underline'
export type AccentImageShapeOption =
  | 'hard'
  | 'blur'
  | 'angle-right'
  | 'angle-left'
  | 'rounded'
  | 'wave'

export interface SlideDesignSettings {
  borderRadius: BorderRadiusOption
  shadow: ShadowOption
  shadowColor?: string
  shadowOpacity?: number
  borderWidth: BorderWidthOption
  borderColor?: string
  transparency: number
  accentImageShape: AccentImageShapeOption
}

export interface BlockDesignSettings {
  fillColorMode: FillColorModeOption
  customFillColor?: string
  borderRadius: BorderRadiusOption
  borderWidth: BorderWidthOption
  shadow: ShadowOption
  shadowColor?: string
  shadowOpacity?: number
  transparency: number
}

export interface ButtonDesignSettings {
  shape: ButtonShapeOption
  shadow: ShadowOption
}

export interface LinkDesignSettings {
  style: LinkStyleOption
}

export interface DesignSettings {
  slides: SlideDesignSettings
  blocks: BlockDesignSettings
  buttons: ButtonDesignSettings
  links: LinkDesignSettings
}

export const DEFAULT_DESIGN_SETTINGS: DesignSettings = {
  slides: {
    borderRadius: 'md',
    shadow: 'sm',
    shadowOpacity: 30,
    borderWidth: 'none',
    transparency: 100,
    accentImageShape: 'hard',
  },
  blocks: {
    fillColorMode: 'subtle',
    borderRadius: 'md',
    borderWidth: 'none',
    shadow: 'none',
    shadowOpacity: 30,
    transparency: 100,
  },
  buttons: { shape: 'rounded', shadow: 'none' },
  links: { style: 'hover-underline' },
}

export interface Theme {
  id: string
  slug: string
  name: string
  colors: ThemeColors
  logo_asset_id: string | null
  logo_url?: string | null
  headshot_images: ThemeImageEntry[]
  product_images: ThemeImageEntry[]
  font_heading: string | null
  font_body: string | null
  brand_voice: BrandVoice | null
  brand_values: BrandValues | null
  social_links: SocialLinks | null
  design_settings: DesignSettings | null
  image_style_prompt: string | null
  preview_image_url: string | null
  is_system: boolean
  status: 'draft' | 'complete' | 'archived' | null
  user_id: string | null
  created_at: string
  updated_at?: string
}

export interface CreateThemeData {
  user_id: string
  slug: string
  name: string
  colors: CompleteThemeColors
  logo_asset_id?: string | null
  headshot_images?: ThemeImageEntry[]
  product_images?: ThemeImageEntry[]
  font_heading?: string | null
  font_body?: string | null
  brand_voice?: BrandVoice | null
  brand_values?: BrandValues | null
  social_links?: SocialLinks | null
  design_settings?: DesignSettings | null
  image_style_prompt?: string | null
  is_system: boolean
  status: 'draft' | 'complete'
}

export interface UpdateThemeData {
  name?: string
  slug?: string
  colors?: CompleteThemeColors
  logo_asset_id?: string | null
  headshot_images?: ThemeImageEntry[]
  product_images?: ThemeImageEntry[]
  font_heading?: string | null
  font_body?: string | null
  brand_voice?: BrandVoice | null
  brand_values?: BrandValues | null
  social_links?: SocialLinks | null
  design_settings?: DesignSettings | null
  image_style_prompt?: string | null
  status?: 'draft' | 'complete' | 'archived'
}

export interface FirecrawlBrandingData {
  colorScheme?: 'light' | 'dark'
  logo?: string
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
    background?: string
    textPrimary?: string
    textSecondary?: string
    link?: string
    success?: string
    warning?: string
    error?: string
  }
  fonts?: Array<{ family: string }>
  typography?: {
    fontFamilies?: {
      primary?: string
      heading?: string
      code?: string
    }
    fontSizes?: {
      h1?: string
      h2?: string
      h3?: string
      body?: string
    }
    fontWeights?: {
      regular?: number
      medium?: number
      bold?: number
    }
    lineHeights?: Record<string, string>
  }
  spacing?: {
    baseUnit?: number
    borderRadius?: string
    padding?: Record<string, string>
    margins?: Record<string, string>
  }
  components?: {
    buttonPrimary?: {
      background?: string
      textColor?: string
      borderRadius?: string
    }
    buttonSecondary?: {
      background?: string
      textColor?: string
      borderColor?: string
      borderRadius?: string
    }
    input?: Record<string, string>
  }
  images?: {
    logo?: string
    favicon?: string
    ogImage?: string
  }
  personality?: {
    tone?: string
    energy?: string
    targetAudience?: string
  }
}

export interface MappedThemeData {
  colors: UserThemeColors
  fontHeading: string | null
  fontBody: string | null
  suggestedName: string
  logoUrl: string | null
  faviconUrl: string | null
  ogImageUrl: string | null
  brandVoice: BrandVoice | null
  designSettings: DesignSettings | null
}
