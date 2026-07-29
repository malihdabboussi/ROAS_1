import { z } from 'zod'
import type {
  AssetRef,
  AssetRefType,
  DocumentIntelligenceMetadata,
  VibeyAssetRef,
} from '@vibey/api-shared'

// ── Generate Image ──────────────────────────────────────────────────────────

export const IMAGE_GENERATION_MODEL_IDS = [
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
  'gpt-5.4-image-2',
] as const

export type ImageGenerationModelId = (typeof IMAGE_GENERATION_MODEL_IDS)[number]

/** Static list for GET /api/media/generate/models (Gemini via Google API; GPT Image 2 via OpenRouter). */
export const IMAGE_GENERATION_MODELS_PUBLIC = [
  {
    id: 'gpt-5.4-image-2' as const,
    name: 'ChatGPT',
    tier: 'pro' as const,
    description: 'OpenAI GPT Image 2 — ChatGPT images (not GPT-5.6 chat).',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:5', '3:4', '3:2', '4:3'] as const,
    defaultAspectRatio: '16:9' as const,
  },
  {
    id: 'gemini-3.1-flash-image-preview' as const,
    name: 'Nano Banana 2',
    tier: 'free' as const,
    description: 'Best for fast drafts and iteration.',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:5', '3:4', '3:2', '4:3'] as const,
    defaultAspectRatio: '16:9' as const,
  },
  {
    id: 'gemini-3-pro-image-preview' as const,
    name: 'Nano Banana',
    tier: 'pro' as const,
    description: 'Best for polished, final assets.',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:5', '3:4', '3:2', '4:3'] as const,
    defaultAspectRatio: '16:9' as const,
  },
]

export const GenerateImageSchema = z.object({
  prompt: z.string().min(3).max(12000),
  aspect_ratio: z.enum(['1:1', '16:9', '9:16', '4:5', '3:4', '3:2', '4:3']).default('16:9'),
  campaign_id: z.string().uuid().optional(),
  space_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  /** When set, that Gemini model id is used (no tier switcher in API — client may pair with entitlement checks later). */
  model: z.enum(IMAGE_GENERATION_MODEL_IDS).optional(),
  /** Number of images to generate sequentially (streaming only); each charges credits separately. */
  count: z.number().int().min(1).max(4).optional().default(1),
})

/** Caller-facing input (optional `count`/`model` before defaults). Parsed API body is `z.infer`. */
export type GenerateImageInput = z.input<typeof GenerateImageSchema>

/** After Zod parse — all defaults applied (e.g. `count` always present). */
export type GenerateImageParsed = z.infer<typeof GenerateImageSchema>

export const EditImageSchema = z
  .object({
    prompt: z.string().min(3).max(12000),
    parent_image_url: z.string().url().optional(),
    parent_image_asset_id: z.string().uuid().optional(),
    reference_image_asset_ids: z.array(z.string().uuid()).max(4).optional(),
    aspect_ratio: z.enum(['1:1', '16:9', '9:16', '4:5', '3:4', '3:2', '4:3']).default('16:9'),
    campaign_id: z.string().uuid().optional(),
    space_id: z.string().uuid().optional(),
    conversation_id: z.string().uuid().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    model: z.enum(IMAGE_GENERATION_MODEL_IDS).optional(),
  })
  .refine((data) => Boolean(data.parent_image_url || data.parent_image_asset_id), {
    message: 'parent_image_url or parent_image_asset_id is required',
    path: ['parent_image_url'],
  })

export type EditImageInput = z.input<typeof EditImageSchema>
export type EditImageParsed = z.infer<typeof EditImageSchema>

export type MediaAssetRefType = AssetRefType
export type MediaAssetRef = VibeyAssetRef
export type NormalizedAssetRef = AssetRef

export interface GenerateImageResult {
  success: boolean
  asset?: MediaAssetRow
  asset_ref?: MediaAssetRef
  url?: string
  error?: string
}

/** POST /api/media/upload — optional fields alongside multipart file. */
export type MediaDirectUploadOpts = {
  category?: string
  name?: string
  campaign_id?: string
  space_id?: string
}

export const ImportUrlSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(255).optional(),
  campaign_id: z.string().uuid().optional(),
  space_id: z.string().uuid().optional(),
  category: z.string().optional(),
})

export type ImportUrlInput = z.infer<typeof ImportUrlSchema>

// ── Media Asset (DB row) ────────────────────────────────────────────────────

export interface MediaAssetRow {
  id: string
  user_id: string
  name: string
  original_filename: string
  file_path: string
  bucket_name: string
  file_size: number
  mime_type: string
  width: number | null
  height: number | null
  asset_type: string
  category: string | null
  subcategory: string | null
  campaign_id: string | null
  org_id?: string | null
  tags: string[]
  description: string | null
  is_public: boolean
  public_url: string | null
  source: string | null
  source_model: string | null
  source_prompt: string | null
  usage_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
  space_id?: string | null
  conversation_id?: string | null
  status?: string | null
  deletable_after?: string | null
  page_count?: number | null
  outline?: unknown[] | null
  text_layer?: string | null
  indexed_at?: string | null
  index_error?: string | null
  source_surface?: string | null
  document_intelligence?: DocumentIntelligenceMetadata | null
}

// ── Query ───────────────────────────────────────────────────────────────────

export const QueryAssetsSchema = z.object({
  campaign_id: z.string().uuid().optional(),
  space_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
  asset_type: z.enum(['image', 'document', 'video', 'audio', 'other']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type QueryAssetsInput = z.infer<typeof QueryAssetsSchema>

// ── Update Asset ────────────────────────────────────────────────────────────

export const UpdateAssetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
})

export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>

// ── Presigned Upload ───────────────────────────────────────────────────────

export const PresignUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  category: z.string().optional(),
  name: z.string().min(1).max(255).optional(),
  campaign_id: z.string().uuid().optional(),
  space_id: z.string().uuid().optional(),
})

export type PresignUploadInput = z.infer<typeof PresignUploadSchema>

export const ConfirmUploadSchema = z.object({
  assetId: z.string().uuid(),
  aiAnalysis: z.boolean().optional(),
})

export type ConfirmUploadInput = z.infer<typeof ConfirmUploadSchema>

export const SocialPlatformSchema = z.enum(['instagram', 'tiktok', 'youtube', 'twitter'])
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>

const SocialImageInputSchema = z.object({
  sourceUrl: z.string().url(),
  cacheKey: z.string().min(1).max(300),
  name: z.string().min(1).max(255).optional(),
})

export const CacheSocialImagesSchema = z.object({
  platform: SocialPlatformSchema,
  images: z.array(SocialImageInputSchema).min(1).max(100),
})

export type CacheSocialImagesInput = z.infer<typeof CacheSocialImagesSchema>

export const CacheInstagramImagesSchema = z.object({
  images: z.array(SocialImageInputSchema).min(1).max(100),
})

export type CacheInstagramImagesInput = z.infer<typeof CacheInstagramImagesSchema>

export interface CachedSocialImageResult {
  cacheKey: string
  ok: boolean
  assetId?: string
  url?: string
  filePath?: string
  cachedAt?: string
  error?: string
}

export type CachedInstagramImageResult = CachedSocialImageResult

export interface PresignUploadResult {
  success: boolean
  assetId?: string
  uploadUrl?: string
  path?: string
  token?: string
  error?: string
}

export interface ConfirmUploadResult {
  success: boolean
  asset?: MediaAssetRow
  asset_ref?: MediaAssetRef
  url?: string
  error?: string
}
