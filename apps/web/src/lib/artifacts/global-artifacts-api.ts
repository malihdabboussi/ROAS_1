import { backendGet } from '@/lib/api/backend-client'
import type { DeliverableType } from '@/lib/missions'
import type {
  CampaignResult,
  EntityResult,
  GlobalArtifactCategory,
  GlobalArtifactItem,
  GlobalArtifactKind,
  MediaResult,
  SpaceResult,
} from './global-artifacts-contracts'

export type { GlobalArtifactCategory, GlobalArtifactItem } from './global-artifacts-contracts'

const ARTIFACT_TYPE: Record<GlobalArtifactKind, DeliverableType> = {
  offer: 'offer',
  funnel: 'funnel',
  website: 'website',
  sequence: 'sequence',
  email: 'email',
  presentation: 'presentation',
  avatar: 'avatar',
  ad: 'ad',
  ad_campaign: 'ad_campaign',
  ad_set: 'ad_set',
  social_post: 'social_post',
  blog_post: 'blog_post',
  page: 'funnel',
}

function entitySearchPath(kind: 'doc' | 'artifact', query: string, offset = 0): string {
  const params = new URLSearchParams({ q: query, types: kind, limit: '50' })
  if (offset > 0) params.set('offset', String(offset))
  return `/api/entity-search?${params.toString()}`
}

function mediaPath(query: string, offset = 0): string {
  const params = new URLSearchParams({ limit: '100' })
  if (query) params.set('search', query)
  if (offset > 0) params.set('offset', String(offset))
  return `/api/media/assets?${params.toString()}`
}

async function fetchAllDocuments(query: string, options?: { signal: AbortSignal }) {
  const results: EntityResult[] = []
  for (let offset = 0; offset <= 2000; offset += 50) {
    const response = await backendGet<{ results: EntityResult[] }>(
      entitySearchPath('doc', query, offset),
      options,
    )
    results.push(...response.results)
    if (response.results.length < 100) break
  }
  return { results }
}

async function fetchAllMedia(query: string, options?: { signal: AbortSignal }) {
  const assets: MediaResult[] = []
  let total = 0
  for (let offset = 0; ; offset += 100) {
    const response = await backendGet<{ assets: MediaResult[]; total: number }>(
      mediaPath(query, offset),
      options,
    )
    assets.push(...response.assets)
    total = response.total
    if (assets.length >= total || response.assets.length === 0) break
  }
  return { assets, total }
}

function spaceRoute(url: string | null): { spaceId: string; itemId: string } | null {
  if (!url) return null
  const parsed = new URL(url, 'https://roas.local')
  const spaceId = parsed.searchParams.get('space')
  const itemId = parsed.searchParams.get('item')
  return spaceId && itemId ? { spaceId, itemId } : null
}

function isSheetMime(mimeType: string): boolean {
  const mime = mimeType.toLowerCase()
  return mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')
}

function mediaType(asset: MediaResult): DeliverableType {
  if (asset.asset_type === 'image') return 'image'
  if (asset.asset_type === 'video') return 'video'
  if (asset.asset_type === 'audio') return 'audio'
  if (asset.mime_type === 'application/pdf') return 'pdf'
  return 'file'
}

function mediaCategory(asset: MediaResult): GlobalArtifactCategory {
  if (asset.asset_type === 'image') return 'images'
  if (isSheetMime(asset.mime_type)) return 'sheets'
  if (asset.asset_type === 'document') return 'docs'
  return 'files'
}

function mediaBadge(asset: MediaResult): string {
  if (asset.asset_type === 'image') return 'Image'
  if (asset.asset_type === 'video') return 'Video'
  if (asset.asset_type === 'audio') return 'Audio'
  if (isSheetMime(asset.mime_type)) return 'Sheet'
  if (asset.asset_type === 'document') return 'Doc'
  return 'File'
}

function mediaSourceKind(asset: MediaResult): 'uploaded' | 'generated' {
  const source = (asset.source ?? '').toLowerCase()
  const category = (asset.category ?? '').toLowerCase()
  const tags = asset.tags ?? []
  const generated =
    source === 'generated' ||
    category === 'generated' ||
    category === 'ai-generated' ||
    Boolean(asset.source_model || asset.source_prompt) ||
    tags.some((tag) => tag.includes('ai-generated') || tag.includes('ai-edited'))
  return generated ? 'generated' : 'uploaded'
}

function contextLabel(
  spaceId: string | null | undefined,
  campaignId: string | null | undefined,
  spaces: Map<string, SpaceResult>,
  campaigns: Map<string, CampaignResult>,
): string {
  return (
    (spaceId ? spaces.get(spaceId)?.title : null) ??
    (campaignId ? campaigns.get(campaignId)?.name : null) ??
    'General'
  )
}

function mapDocument(row: EntityResult, spaces: Map<string, SpaceResult>): GlobalArtifactItem {
  const route = spaceRoute(row.url)
  const space = route ? spaces.get(route.spaceId) : null
  const label = space?.title ?? (route ? 'Space' : 'Conversation')
  return {
    id: row.id,
    title: row.label,
    badge: 'Doc',
    category: 'docs',
    contextLabel: label,
    sourceKind: 'created',
    updatedAt: row.updatedAt ?? null,
    viewer: {
      id: row.id,
      title: row.label,
      type: 'doc',
      entityId: route?.itemId ?? row.id,
      entityTable: route ? 'space_items' : 'conversation_documents',
      spaceId: route?.spaceId,
      campaignId: space?.campaign_id ?? undefined,
      contextLabel: label,
      contextUrl: route ? `/spaces?space=${encodeURIComponent(route.spaceId)}` : row.url,
      internalUrl: row.url,
    },
  }
}

function mapArtifact(
  row: EntityResult,
  campaigns: Map<string, CampaignResult>,
): GlobalArtifactItem | null {
  if (!row.artifactKind) return null
  const campaignLabel = row.campaignId
    ? (campaigns.get(row.campaignId)?.name ?? 'Campaign')
    : 'General'
  const entityId = row.artifactKind === 'page' ? (row.funnelId ?? row.id) : row.id
  const category: GlobalArtifactCategory =
    row.artifactKind === 'presentation'
      ? 'presentations'
      : row.artifactKind === 'funnel' ||
          row.artifactKind === 'website' ||
          row.artifactKind === 'page'
        ? 'funnels'
        : 'artifacts'
  return {
    id: row.id,
    title: row.label,
    badge: row.subtitle ?? 'Artifact',
    category,
    contextLabel: campaignLabel,
    sourceKind: 'created',
    updatedAt: row.updatedAt ?? null,
    viewer: {
      id: entityId,
      title: row.label,
      type: ARTIFACT_TYPE[row.artifactKind],
      entityId,
      campaignId: row.campaignId,
      contextLabel: campaignLabel,
      contextUrl: row.campaignId ? `/campaigns/${encodeURIComponent(row.campaignId)}` : undefined,
    },
  }
}

function mapMedia(
  asset: MediaResult,
  spaces: Map<string, SpaceResult>,
  campaigns: Map<string, CampaignResult>,
): GlobalArtifactItem {
  const label = contextLabel(asset.space_id, asset.campaign_id, spaces, campaigns)
  const contextUrl = asset.space_id
    ? `/spaces?space=${encodeURIComponent(asset.space_id)}`
    : asset.campaign_id
      ? `/campaigns/${encodeURIComponent(asset.campaign_id)}`
      : undefined
  return {
    id: asset.id,
    title: asset.name || asset.original_filename || 'Untitled file',
    badge: mediaBadge(asset),
    category: mediaCategory(asset),
    contextLabel: label,
    sourceKind: mediaSourceKind(asset),
    thumbnailUrl: asset.asset_type === 'image' ? asset.public_url : null,
    updatedAt: asset.created_at,
    viewer: {
      id: asset.id,
      title: asset.name || asset.original_filename || 'Untitled file',
      type: mediaType(asset),
      fileUrl: asset.public_url,
      fileName: asset.original_filename,
      mimeType: asset.mime_type,
      mediaAssetId: asset.id,
      campaignId: asset.campaign_id,
      spaceId: asset.space_id,
      conversationId: asset.conversation_id,
      contextLabel: label,
      contextUrl,
    },
  }
}

export async function fetchGlobalArtifacts(
  rawQuery: string,
  signal?: AbortSignal,
): Promise<GlobalArtifactItem[]> {
  const query = rawQuery.trim()
  const options = signal ? { signal } : undefined
  const [docsResult, artifactsResult, mediaResult, campaignsResult, spacesResult] =
    await Promise.allSettled([
      fetchAllDocuments(query, options),
      backendGet<{ results: EntityResult[] }>(entitySearchPath('artifact', query), options),
      fetchAllMedia(query, options),
      backendGet<CampaignResult[]>('/api/campaigns', options),
      backendGet<SpaceResult[]>('/api/spaces?limit=100', options),
    ])

  const results = [docsResult, artifactsResult, mediaResult, campaignsResult, spacesResult]
  if (results.every((result) => result.status === 'rejected')) {
    const firstFailure = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    throw firstFailure?.reason ?? new Error('Failed to load artifacts')
  }

  const docsResponse = docsResult.status === 'fulfilled' ? docsResult.value : { results: [] }
  const artifactsResponse =
    artifactsResult.status === 'fulfilled' ? artifactsResult.value : { results: [] }
  const mediaResponse =
    mediaResult.status === 'fulfilled' ? mediaResult.value : { assets: [], total: 0 }
  const campaignsResponse = campaignsResult.status === 'fulfilled' ? campaignsResult.value : []
  const spacesResponse = spacesResult.status === 'fulfilled' ? spacesResult.value : []

  const campaigns = new Map(campaignsResponse.map((campaign) => [campaign.id, campaign]))
  const spaces = new Map(spacesResponse.map((space) => [space.id, space]))
  const docs = docsResponse.results.map((row) => mapDocument(row, spaces))
  const artifacts = artifactsResponse.results.flatMap((row) => {
    const item = mapArtifact(row, campaigns)
    return item ? [item] : []
  })
  const media = mediaResponse.assets.map((asset) => mapMedia(asset, spaces, campaigns))

  return [...docs, ...artifacts, ...media].sort((a, b) => {
    const dateOrder = (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
    return dateOrder || a.title.localeCompare(b.title)
  })
}

export async function fetchCampaignArtifacts(
  campaignId: string,
  rawQuery: string,
  signal?: AbortSignal,
): Promise<GlobalArtifactItem[]> {
  const items = await fetchGlobalArtifacts(rawQuery, signal)
  return items.filter((item) => item.viewer.campaignId === campaignId)
}
