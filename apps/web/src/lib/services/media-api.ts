'use client'

import {
  backendDelete,
  backendFetch,
  backendGet,
  backendPatch,
  backendPost,
} from '@/lib/api/backend-client'

// ── Types ───────────────────────────────────────────────────────────────────

export interface MediaAsset {
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
  space_id?: string | null
  conversation_id?: string | null
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
}

export const IMAGE_GENERATION_MODEL_IDS_WEB = [
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
  'gpt-5.4-image-2',
] as const

export type ImageGenerationModelIdWeb = (typeof IMAGE_GENERATION_MODEL_IDS_WEB)[number]

export interface ImageGenerationModelMeta {
  id: ImageGenerationModelIdWeb
  name: string
  tier: 'free' | 'pro'
  description: string
  supportedAspectRatios: readonly string[]
  defaultAspectRatio: string
}

export interface GenerateImageParams {
  prompt: string
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '3:4' | '3:2' | '4:3'
  campaign_id?: string
  space_id?: string
  conversation_id?: string
  category?: string
  tags?: string[]
  /** Gemini image model id (same list as GET /api/media/generate/models). */
  model?: ImageGenerationModelIdWeb
  /** Sequential generations (streaming only); 1–4 — each billed separately. */
  count?: number
}

export async function fetchImageGenerationModels(): Promise<{
  success: boolean
  models: ImageGenerationModelMeta[]
  defaultModel: string
  tier: string
}> {
  return backendGet(`/api/media/generate/models`)
}

export interface GenerationProgress {
  stage: 'generating' | 'uploading' | 'complete' | 'loading_parent'
  message: string
  progress: number
}

export interface GenerationResult {
  asset?: MediaAsset
  url?: string
  index?: number
  total?: number
}

export interface ListAssetsParams {
  campaign_id?: string
  space_id?: string
  conversation_id?: string
  asset_type?: string
  category?: string
  search?: string
  limit?: number
  offset?: number
}

// ── Streaming Image Generation ──────────────────────────────────────────────

export async function generateAdConcepts(params: {
  audience?: string
  offer_cta?: string
  brand_guidelines?: string
  attached_asset_instructions?: string
  reference_description?: string
}): Promise<{ success: boolean; text: string; model?: string }> {
  return backendPost<{ success: boolean; text: string; model?: string }>(
    '/api/media/generate-ad-concepts',
    params,
  )
}

export async function generateImageStream(
  params: GenerateImageParams,
  callbacks: {
    onStart?: () => void
    onProgress?: (progress: GenerationProgress) => void
    onComplete?: (result: GenerationResult) => void
    onError?: (error: string) => void
  },
  signal?: AbortSignal,
): Promise<GenerationResult | null> {
  const response = await backendFetch('/api/media/generate-stream', {
    method: 'POST',
    body: JSON.stringify(params),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    callbacks.onError?.(`Generation failed: ${response.status}`)
    throw new Error(`Media API error: ${response.status} ${text}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let result: GenerationResult | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        try {
          const event = JSON.parse(data) as {
            type: string
            stage?: string
            message?: string
            progress?: number
            asset?: MediaAsset
            url?: string
            error?: string
            index?: number
            total?: number
          }

          switch (event.type) {
            case 'generation_start':
              callbacks.onStart?.()
              break
            case 'generation_progress':
              callbacks.onProgress?.({
                stage: (event.stage ?? 'generating') as GenerationProgress['stage'],
                message: event.message ?? '',
                progress: event.progress ?? 0,
              })
              break
            case 'generation_complete':
              result = {
                asset: event.asset,
                url: event.url,
                index: event.index,
                total: event.total,
              }
              callbacks.onComplete?.(result)
              break
            case 'error':
              callbacks.onError?.(event.error ?? 'Unknown error')
              break
          }
        } catch {
          // Skip parse errors
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return result
}

export interface EditImageParams extends GenerateImageParams {
  parent_image_url?: string
  parent_image_asset_id?: string
  reference_image_asset_ids?: string[]
}

export async function editImageStream(
  params: EditImageParams,
  callbacks: {
    onStart?: () => void
    onProgress?: (progress: GenerationProgress) => void
    onComplete?: (result: GenerationResult) => void
    onError?: (error: string) => void
  },
  signal?: AbortSignal,
): Promise<GenerationResult | null> {
  const response = await backendFetch('/api/media/edit-image-stream', {
    method: 'POST',
    body: JSON.stringify(params),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    callbacks.onError?.(`Edit failed: ${response.status}`)
    throw new Error(`Media API error: ${response.status} ${text}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let result: GenerationResult | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        try {
          const event = JSON.parse(data) as {
            type: string
            stage?: string
            message?: string
            progress?: number
            asset?: MediaAsset
            url?: string
            error?: string
          }

          switch (event.type) {
            case 'generation_start':
              callbacks.onStart?.()
              break
            case 'generation_progress':
              callbacks.onProgress?.({
                stage: (event.stage ?? 'generating') as GenerationProgress['stage'],
                message: event.message ?? '',
                progress: event.progress ?? 0,
              })
              break
            case 'generation_complete':
              result = { asset: event.asset, url: event.url }
              callbacks.onComplete?.(result)
              break
            case 'error':
              callbacks.onError?.(event.error ?? 'Unknown error')
              break
          }
        } catch {
          // Skip parse errors
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return result
}

// ── CRUD Operations ─────────────────────────────────────────────────────────

export async function listAssets(
  params?: ListAssetsParams,
): Promise<{ assets: MediaAsset[]; total: number }> {
  const query = new URLSearchParams()
  if (params?.campaign_id) query.set('campaign_id', params.campaign_id)
  if (params?.space_id) query.set('space_id', params.space_id)
  if (params?.conversation_id) query.set('conversation_id', params.conversation_id)
  if (params?.asset_type) query.set('asset_type', params.asset_type)
  if (params?.category) query.set('category', params.category)
  if (params?.search) query.set('search', params.search)
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.offset) query.set('offset', String(params.offset))

  const qs = query.toString()
  return backendGet<{ assets: MediaAsset[]; total: number }>(
    `/api/media/assets${qs ? `?${qs}` : ''}`,
  )
}

export async function getAsset(id: string): Promise<MediaAsset> {
  return backendGet<MediaAsset>(`/api/media/assets/${id}`)
}

export async function updateAsset(
  id: string,
  data: { name?: string; category?: string; tags?: string[]; description?: string },
): Promise<MediaAsset> {
  return backendPatch<MediaAsset>(`/api/media/assets/${id}`, data)
}

export async function deleteAsset(id: string): Promise<void> {
  return backendDelete(`/api/media/assets/${id}`)
}

export async function copyAssetToCampaign(
  assetId: string,
  campaignId: string,
): Promise<MediaAsset> {
  const { backendPost } = await import('@/lib/api/backend-client')
  return backendPost<MediaAsset>(`/api/media/assets/${assetId}/copy`, { campaign_id: campaignId })
}

export async function refreshAssetUrl(id: string): Promise<{ url: string }> {
  const response = await backendFetch(`/api/media/assets/${id}/refresh-url`, {
    method: 'POST',
  })
  return response.json()
}

export type MediaCanvaHandoffResponse =
  | { success: true; edit_url: string; design_id?: string }
  | { success: false; error?: string; code?: 'NOT_CONNECTED' | 'HANDOFF_FAILED' }

export async function openMediaAssetInCanva(assetId: string): Promise<MediaCanvaHandoffResponse> {
  const { backendPost } = await import('@/lib/api/backend-client')
  try {
    return await backendPost<MediaCanvaHandoffResponse>(
      `/api/media/assets/${assetId}/canva-handoff`,
      {},
    )
  } catch (err) {
    return {
      success: false,
      code: 'HANDOFF_FAILED',
      error: err instanceof Error ? err.message : "Couldn't open in Canva. Try again.",
    }
  }
}

export async function resolveMediaAssetIdByUrl(url: string): Promise<string | null> {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const res = await backendGet<{ id: string }>(
      `/api/media/assets/resolve-by-url?url=${encodeURIComponent(trimmed)}`,
    )
    if (typeof res?.id === 'string' && res.id.trim()) return res.id
    return null
  } catch {
    return null
  }
}
