export type AssetRefType = 'image' | 'document' | 'video' | 'audio' | 'other'

export type ExternalAssetProvider =
  | 'google_drive'
  | 'dropbox'
  | 'slack'
  | 'wordpress'
  | 'composio'

export interface VibeyAssetRef {
  kind: 'vibey_asset'
  asset_id: string
  bucket_name: string
  file_path: string
  url: string | null
  mime_type: string
  asset_type: AssetRefType
  name: string
  original_filename: string
  file_size: number
  campaign_id: string | null
  space_id: string | null
  org_id: string | null
  source: string | null
  source_surface: string | null
}

export interface StorageAssetRef {
  kind: 'storage_asset'
  bucket_name: string
  file_path: string
  url: string | null
  mime_type: string
  asset_type: AssetRefType
  name: string
  original_filename: string
  file_size: number
  user_id: string | null
  org_id: string | null
  source: string | null
  source_surface: string | null
  metadata?: Record<string, unknown>
}

export interface ExternalAssetRef {
  kind: 'external_asset'
  provider: ExternalAssetProvider
  external_id: string | null
  file_path: string | null
  url: string | null
  mime_type: string
  asset_type: AssetRefType
  name: string
  original_filename: string
  file_size: number | null
  org_id: string | null
  source: string | null
  source_surface: string | null
  metadata?: Record<string, unknown>
}

export type AssetRef = VibeyAssetRef | StorageAssetRef | ExternalAssetRef

export type VibeyAssetRefInput = {
  id: string
  bucket_name: string
  file_path: string
  mime_type?: string | null
  asset_type?: string | null
  name?: string | null
  original_filename?: string | null
  file_size?: number | null
  campaign_id?: string | null
  space_id?: string | null
  org_id?: string | null
  source?: string | null
  source_surface?: string | null
  public_url?: string | null
}

export type StorageAssetRefInput = {
  bucket_name: string
  file_path: string
  url?: string | null
  mime_type?: string | null
  asset_type?: string | null
  name?: string | null
  original_filename?: string | null
  file_size?: number | null
  user_id?: string | null
  org_id?: string | null
  source?: string | null
  source_surface?: string | null
  metadata?: Record<string, unknown>
}

export type ExternalAssetRefInput = {
  provider: ExternalAssetProvider
  external_id?: string | null
  file_path?: string | null
  url?: string | null
  mime_type?: string | null
  asset_type?: string | null
  name?: string | null
  original_filename?: string | null
  file_size?: number | null
  org_id?: string | null
  source?: string | null
  source_surface?: string | null
  metadata?: Record<string, unknown>
}

const ASSET_REF_TYPES = new Set<AssetRefType>(['image', 'document', 'video', 'audio', 'other'])

function stringOrNull(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed.length > 0 ? trimmed : null
}

function stringOrFallback(value: string | null | undefined, fallback: string): string {
  return stringOrNull(value) ?? fallback
}

function numberOrZero(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0
}

function numberOrNull(value: number | null | undefined): number | null {
  return Number.isFinite(value) ? Number(value) : null
}

export function inferAssetRefType(mimeType?: string | null, fallback?: string | null): AssetRefType {
  const normalized = stringOrNull(fallback)
  if (normalized && ASSET_REF_TYPES.has(normalized as AssetRefType)) {
    return normalized as AssetRefType
  }
  const mime = stringOrNull(mimeType)?.toLowerCase() ?? ''
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (
    mime === 'application/pdf' ||
    mime.includes('document') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation') ||
    mime.startsWith('text/')
  ) {
    return 'document'
  }
  return 'other'
}

export function buildVibeyAssetRef(
  asset: VibeyAssetRefInput,
  urlOverride?: string | null,
): VibeyAssetRef {
  const originalFilename = stringOrFallback(asset.original_filename, asset.name ?? 'upload')
  return {
    kind: 'vibey_asset',
    asset_id: asset.id,
    bucket_name: asset.bucket_name,
    file_path: asset.file_path,
    url: stringOrNull(urlOverride) ?? stringOrNull(asset.public_url),
    mime_type: stringOrFallback(asset.mime_type, 'application/octet-stream'),
    asset_type: inferAssetRefType(asset.mime_type, asset.asset_type),
    name: stringOrFallback(asset.name, originalFilename),
    original_filename: originalFilename,
    file_size: numberOrZero(asset.file_size),
    campaign_id: stringOrNull(asset.campaign_id),
    space_id: stringOrNull(asset.space_id),
    org_id: stringOrNull(asset.org_id),
    source: stringOrNull(asset.source),
    source_surface: stringOrNull(asset.source_surface),
  }
}

export function buildStorageAssetRef(input: StorageAssetRefInput): StorageAssetRef {
  const originalFilename = stringOrFallback(input.original_filename, input.name ?? 'upload')
  return {
    kind: 'storage_asset',
    bucket_name: input.bucket_name,
    file_path: input.file_path,
    url: stringOrNull(input.url),
    mime_type: stringOrFallback(input.mime_type, 'application/octet-stream'),
    asset_type: inferAssetRefType(input.mime_type, input.asset_type),
    name: stringOrFallback(input.name, originalFilename),
    original_filename: originalFilename,
    file_size: numberOrZero(input.file_size),
    user_id: stringOrNull(input.user_id),
    org_id: stringOrNull(input.org_id),
    source: stringOrNull(input.source),
    source_surface: stringOrNull(input.source_surface),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  }
}

export function buildExternalAssetRef(input: ExternalAssetRefInput): ExternalAssetRef {
  const originalFilename = stringOrFallback(input.original_filename, input.name ?? 'upload')
  return {
    kind: 'external_asset',
    provider: input.provider,
    external_id: stringOrNull(input.external_id),
    file_path: stringOrNull(input.file_path),
    url: stringOrNull(input.url),
    mime_type: stringOrFallback(input.mime_type, 'application/octet-stream'),
    asset_type: inferAssetRefType(input.mime_type, input.asset_type),
    name: stringOrFallback(input.name, originalFilename),
    original_filename: originalFilename,
    file_size: numberOrNull(input.file_size),
    org_id: stringOrNull(input.org_id),
    source: stringOrNull(input.source),
    source_surface: stringOrNull(input.source_surface),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  }
}
