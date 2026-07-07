/**
 * Theme DTOs with Zod Validation
 * Ported from: Vibey_legacy/apps/app-backend/src/modules/themes/dto/theme.dto.ts
 */

import { z } from 'zod'

const BrandVoiceSchema = z.object({
  tone: z.string(),
  style: z.string(),
  personality: z.string(),
})

const BrandValuesSchema = z.object({
  primary: z.string(),
  secondary: z.array(z.string()),
  tagline: z.string().nullable(),
})

const ThemeImageEntrySchema = z.object({
  asset_id: z.string().uuid(),
  url: z.string().url().optional(),
  name: z.string(),
  description: z.string(),
})

const SlideDesignSettingsSchema = z.object({
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl']),
  shadow: z.enum(['none', 'sm', 'md', 'lg']),
  shadowColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  shadowOpacity: z.number().min(0).max(100).optional(),
  borderWidth: z.enum(['none', 'thin', 'medium', 'thick']),
  borderColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  transparency: z.number().min(0).max(100),
  accentImageShape: z.enum(['hard', 'blur', 'angle-right', 'angle-left', 'rounded', 'wave']),
})

const BlockDesignSettingsSchema = z.object({
  fillColorMode: z.enum(['subtle', 'primary', 'custom']),
  customFillColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl']),
  borderWidth: z.enum(['none', 'thin', 'medium', 'thick']),
  shadow: z.enum(['none', 'sm', 'md', 'lg']),
  shadowColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  shadowOpacity: z.number().min(0).max(100).optional(),
  transparency: z.number().min(0).max(100),
})

const ButtonDesignSettingsSchema = z.object({
  shape: z.enum(['square', 'rounded-sm', 'rounded', 'pill']),
  shadow: z.enum(['none', 'sm', 'md', 'lg']),
})

const LinkDesignSettingsSchema = z.object({
  style: z.enum(['underline', 'none', 'hover-underline']),
})

const SocialLinksSchema = z.object({
  website: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  youtube: z.string().nullable().optional(),
  tiktok: z.string().nullable().optional(),
  pinterest: z.string().nullable().optional(),
  threads: z.string().nullable().optional(),
  bluesky: z.string().nullable().optional(),
})

const DesignSettingsSchema = z.object({
  slides: SlideDesignSettingsSchema,
  blocks: BlockDesignSettingsSchema,
  buttons: ButtonDesignSettingsSchema,
  links: LinkDesignSettingsSchema,
})

const UserThemeColorsSchema = z.object({
  primary: z.string().min(1),
  primaryForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryAccent1: z.string().min(1),
  secondaryAccent2: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  heading: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  body: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  pageBackground: z.string().min(1),
  slideBackground: z.string().min(1).optional(),
  cardBackground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  border: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  input: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  primaryGradient: z.string().optional(),
  headingH1: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  headingH2: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  headingH3: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  headingH4: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  bodyLg: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  bodySm: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  calloutInfo: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  calloutSuccess: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  calloutWarning: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  calloutQuestion: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  calloutTip: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
})

export const CreateThemeSchema = z.object({
  name: z.string().min(1).max(50),
  colors: UserThemeColorsSchema,
  logo_asset_id: z.string().uuid().nullable().optional(),
  headshot_images: z.array(ThemeImageEntrySchema).optional(),
  product_images: z.array(ThemeImageEntrySchema).optional(),
  font_heading: z.string().nullable().optional(),
  font_body: z.string().nullable().optional(),
  brand_voice: BrandVoiceSchema.nullable().optional(),
  brand_values: BrandValuesSchema.nullable().optional(),
  social_links: SocialLinksSchema.nullable().optional(),
  design_settings: DesignSettingsSchema.nullable().optional(),
  image_style_prompt: z.string().max(2000).nullable().optional(),
  status: z.enum(['draft', 'complete']).optional().default('draft'),
})

export const UpdateThemeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  colors: UserThemeColorsSchema.optional(),
  logo_asset_id: z.string().uuid().nullable().optional(),
  headshot_images: z.array(ThemeImageEntrySchema).optional(),
  product_images: z.array(ThemeImageEntrySchema).optional(),
  font_heading: z.string().nullable().optional(),
  font_body: z.string().nullable().optional(),
  brand_voice: BrandVoiceSchema.nullable().optional(),
  brand_values: BrandValuesSchema.nullable().optional(),
  social_links: SocialLinksSchema.nullable().optional(),
  design_settings: DesignSettingsSchema.nullable().optional(),
  image_style_prompt: z.string().max(2000).nullable().optional(),
  status: z.enum(['draft', 'complete', 'archived']).optional(),
})

export const ExtractWebsiteSchema = z.object({
  url: z.string().url({
    message: "That URL doesn't look quite right. Try something like https://stripe.com",
  }),
})

export const GenerateImageStyleSchema = z.object({
  brandVoice: BrandVoiceSchema.nullable(),
  brandValues: BrandValuesSchema.nullable(),
})

export type CreateThemeInput = z.infer<typeof CreateThemeSchema>
export type UpdateThemeInput = z.infer<typeof UpdateThemeSchema>
export type ExtractWebsiteInput = z.infer<typeof ExtractWebsiteSchema>
export type GenerateImageStyleInput = z.infer<typeof GenerateImageStyleSchema>
