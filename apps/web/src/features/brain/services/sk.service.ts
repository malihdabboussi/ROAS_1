import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { presignPutUploadFile, type AssetRef } from '@/lib/media/presigned-client-upload'

export type SkEntryType =
  | 'concept'
  | 'framework'
  | 'protocol'
  | 'principle'
  | 'technique'
  | 'quote'
  | 'case_study'
  | 'definition'

export type SkDomain = 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'

export type SkSourceType =
  | 'book'
  | 'article'
  | 'course'
  | 'manual'
  | 'notes'
  | 'transcript'
  | 'website'
  | 'social'

export interface SkSource {
  id: string
  brain_id: string
  source_type: string
  title: string
  author: string | null
  url: string | null
  metadata: Record<string, unknown>
  status: string
  entries_count: number
  domain: string | null
  tags: string[]
  ingested_at: string | null
  created_at: string
}

export interface SkEntry {
  id: string
  title: string
  content: string
  entry_type: SkEntryType
  domain: string | null
  complexity: string
  confidence: number
  mastery: number
  recall_count: number
  tags: string[]
  source_id: string
  similarity?: number
}

export interface SkGap {
  id: string
  brain_id: string
  domain: string | null
  description: string
  detected_from: string
  severity: string
  suggested_sources: unknown[]
  status: string
  created_at: string
}

export interface SkStats {
  totalEntries: number
  avgMastery: number
  domainBreakdown: Record<string, number>
}

export type ExtractDocumentTextOptions = {
  /** Skip upload when the file is already in storage (e.g. after presigned upload). */
  fileUrl?: string
  assetId?: string | null
  assetRef?: AssetRef | null
}

export type ExtractDocumentTextResult = {
  text: string
  fileUrl?: string
  assetId?: string | null
  assetRef?: AssetRef | null
}

export async function extractDocumentTextWithAsset(
  file: File,
  options?: ExtractDocumentTextOptions,
): Promise<ExtractDocumentTextResult> {
  let fileUrl = options?.fileUrl?.trim()
  let assetId = options?.assetId ?? null
  let assetRef = options?.assetRef ?? null
  if (!fileUrl) {
    const confirmed = await presignPutUploadFile({
      file,
      name: file.name,
      category: 'brain_import',
    })
    fileUrl = confirmed.url || confirmed.asset?.public_url || undefined
    assetId = confirmed.asset?.id ?? confirmed.asset_ref?.asset_id ?? null
    assetRef = confirmed.asset_ref ?? null
  }
  if (!fileUrl) throw new Error("Couldn't upload that file. Try again.")

  const res = await backendPost<{ text: string }>('/api/brain/sk/extract-text', {
    fileUrl,
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    assetId,
    asset_ref: assetRef,
  })
  return { text: res.text ?? '', fileUrl, assetId, assetRef }
}

export async function extractDocumentText(
  file: File,
  options?: ExtractDocumentTextOptions,
): Promise<string> {
  return (await extractDocumentTextWithAsset(file, options)).text
}

export async function ingestSkKnowledge(
  brainId: string,
  input: {
    text: string
    sourceType: SkSourceType
    title: string
    domain?: SkDomain
    mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
    mediaUrl?: string
    mediaMimeType?: string
    mediaCaption?: string
    assetId?: string | null
    assetRef?: AssetRef | null
  },
): Promise<{ success: boolean; jobId: string; status: string; deduped?: boolean }> {
  return backendPost('/api/brain/import-jobs/sk-ingest', {
    brainId,
    text: input.text,
    sourceType: input.sourceType,
    title: input.title,
    domain: input.domain,
    mediaType: input.mediaType,
    mediaUrl: input.mediaUrl,
    mediaMimeType: input.mediaMimeType,
    mediaCaption: input.mediaCaption,
    assetId: input.assetId ?? null,
    assetRef: input.assetRef ?? null,
  })
}

export async function ingestSkLink(
  brainId: string,
  input: { url: string; sourceType?: SkSourceType; title?: string; domain?: SkDomain },
): Promise<{ success: boolean; jobId: string; status: string; deduped?: boolean }> {
  return backendPost('/api/brain/import-jobs/sk-ingest-link', { brainId, ...input })
}

export async function deleteSkEntry(entryId: string): Promise<{ success: boolean }> {
  return backendDelete(`/api/brain/sk/entries/${encodeURIComponent(entryId)}`)
}

export async function deleteSkSource(
  sourceId: string,
): Promise<{ success: boolean; deletedEntries: number }> {
  return backendDelete(`/api/brain/sk/sources/${encodeURIComponent(sourceId)}`)
}

export async function fetchSkSources(brainId: string): Promise<SkSource[]> {
  return backendGet(`/api/brain/sk/sources?brainId=${encodeURIComponent(brainId)}`)
}

export async function searchSkEntries(brainId: string, query: string): Promise<SkEntry[]> {
  return backendGet(
    `/api/brain/sk/search?brainId=${encodeURIComponent(brainId)}&q=${encodeURIComponent(query)}`,
  )
}

export async function fetchSkGaps(brainId: string): Promise<SkGap[]> {
  return backendGet(`/api/brain/sk/gaps?brainId=${encodeURIComponent(brainId)}`)
}

export async function fetchSkStats(brainId: string): Promise<SkStats> {
  return backendGet(`/api/brain/sk/stats?brainId=${encodeURIComponent(brainId)}`)
}

export async function updateSkMastery(entryId: string, score: number): Promise<SkEntry> {
  return backendPatch('/api/brain/sk/mastery', { entryId, score })
}
