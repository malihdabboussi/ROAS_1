/**
 * Seed + sync IG Research tracked accounts via apps/api (ScrapeCreators + space items).
 */
import type { ApiClient } from './api'

const REELS_WINDOW_DAYS = 30
const PAGE_DELAY_MS = 1500
const PAGE_RETRY_DELAYS = [2000, 3000]
const MAX_PAGES = 10
const ACCOUNT_DELAY_MS = 2000
const IG_VIEW_TYPE = 'instagram_research'

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function parseIgHandle(input: string): string {
  let val = input.trim()
  try {
    const url = new URL(val.startsWith('http') ? val : `https://${val}`)
    const host = url.hostname.replace('www.', '').toLowerCase()
    if (host === 'instagram.com') {
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length > 0) return segments[0]!
    }
  } catch {
    // not a URL
  }
  val = val.replace(/^@/, '')
  return val.split('/')[0]!.trim().toLowerCase()
}

function unwrapUpstreamPayload(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const o = body as Record<string, unknown>
  if ('data' in o && o.data !== undefined) return o.data
  return body
}

function computeOutlierScores<T extends { play_count: number }>(
  items: T[],
): (T & { outlier_score: number })[] {
  if (items.length === 0) return []
  const counts = items.map((i) => i.play_count).sort((a, b) => a - b)
  const mid = Math.floor(counts.length / 2)
  const median = counts.length % 2 === 0 ? (counts[mid - 1]! + counts[mid]!) / 2 : counts[mid]!
  if (median === 0) return items.map((i) => ({ ...i, outlier_score: 0 }))
  return items.map((i) => ({
    ...i,
    outlier_score: Math.round((i.play_count / median) * 100) / 100,
  }))
}

interface ScReelMedia {
  taken_at: number
  pk: string
  id: string
  code: string
  media_type: number
  play_count?: number
  ig_play_count?: number
  like_count?: number
  comment_count?: number
  caption?: { text?: string } | null
  display_uri?: string
  video_versions?: Array<{ url: string }>
  image_versions2?: { candidates?: Array<{ url: string }> }
}

interface IgContentItem {
  ig_media_id: string
  shortcode: string
  media_type: 'reel' | 'image' | 'carousel' | 'post'
  play_count: number
  like_count: number | null
  comment_count: number | null
  thumbnail_url: string | null
  video_url: string | null
  taken_at: string
  caption: string | null
  outlier_score: number
}

interface ScProfileResponse {
  success: boolean
  data: {
    user?: {
      profile_pic_url_hd?: string
      profile_pic_url?: string
      edge_followed_by?: { count?: number }
      id?: string
    }
  }
}

interface ScPostsResponse {
  success: boolean
  num_results?: number
  more_available?: boolean
  next_max_id?: string
  items?: ScReelMedia[]
  data?: ScReelMedia[] | { items?: ScReelMedia[]; more_available?: boolean; next_max_id?: string }
}

interface SocialTrackedAccount {
  handle: string
  user_id_ig?: string
  follower_count?: number
  last_synced_at?: string
  profile_pic_url?: string
  profile_pic_source_url?: string
  profile_pic_asset_id?: string
  profile_pic_storage_path?: string
  profile_pic_cached_at?: string
  profile_pic_cache_status?: string
  profile_pic_cache_error?: string | null
}

interface SpaceItem {
  id: string
  custom_data?: Record<string, unknown>
}

interface CachedSocialImageResult {
  cacheKey: string
  ok: boolean
  assetId?: string
  url?: string
  filePath?: string
  cachedAt?: string
  error?: string
}

interface CacheSocialImagesResponse {
  success: boolean
  results: CachedSocialImageResult[]
}

interface SpaceSchema {
  version: number
  views: Array<Record<string, unknown>>
  [key: string]: unknown
}

function socialImageCacheKey(handle: string, id: string, kind: 'thumbnail' | 'profile'): string {
  return `ig/${handle.toLowerCase()}/${id}/${kind}`
}

function thumbnailCachePatch(
  sourceUrl: string | null,
  cacheResult: CachedSocialImageResult | undefined,
): Record<string, unknown> {
  if (!sourceUrl) return { thumbnail_url: null }
  if (cacheResult?.ok) {
    return {
      thumbnail_url: cacheResult.url ?? null,
      thumbnail_source_url: sourceUrl,
      thumbnail_asset_id: cacheResult.assetId,
      thumbnail_storage_path: cacheResult.filePath,
      thumbnail_cached_at: cacheResult.cachedAt,
      thumbnail_cache_status: 'ready',
      thumbnail_cache_error: null,
    }
  }
  return {
    thumbnail_url: null,
    thumbnail_source_url: sourceUrl,
    thumbnail_cache_status: 'failed',
    thumbnail_cache_error: cacheResult?.error ?? 'Image cache failed',
  }
}

function profilePicCachePatch(
  sourceUrl: string | null,
  cacheResult: CachedSocialImageResult | undefined,
): Partial<SocialTrackedAccount> {
  if (!sourceUrl) return {}
  if (cacheResult?.ok) {
    return {
      profile_pic_url: cacheResult.url,
      profile_pic_source_url: sourceUrl,
      profile_pic_asset_id: cacheResult.assetId,
      profile_pic_storage_path: cacheResult.filePath,
      profile_pic_cached_at: cacheResult.cachedAt,
      profile_pic_cache_status: 'ready',
    }
  }
  return {
    profile_pic_source_url: sourceUrl,
    profile_pic_cache_status: 'failed',
    profile_pic_cache_error: cacheResult?.error ?? 'Image cache failed',
  }
}

function socialContentCustomData(
  handle: string,
  item: IgContentItem,
  cacheResult: CachedSocialImageResult | undefined,
): Record<string, unknown> {
  return {
    _view_type: IG_VIEW_TYPE,
    _platform: 'instagram',
    _handle: handle,
    media_id: item.ig_media_id,
    ig_media_id: item.ig_media_id,
    shortcode: item.shortcode,
    media_type: item.media_type,
    play_count: item.play_count,
    like_count: item.like_count,
    comment_count: item.comment_count,
    ...thumbnailCachePatch(item.thumbnail_url, cacheResult),
    video_url: item.video_url,
    taken_at: item.taken_at,
    outlier_score: item.outlier_score,
    caption: item.caption,
    transcript: null,
  }
}

async function fetchIgProfile(
  api: ApiClient,
  handle: string,
  auth: ApiAuth,
): Promise<{
  profile_pic_url: string | null
  follower_count: number
  user_id_ig: string | null
}> {
  const res = await api.get<ScProfileResponse>(
    `/api/integrations/scrapecreators/instagram/profile?handle=${encodeURIComponent(handle)}`,
    auth,
  )
  const block = unwrapUpstreamPayload(res?.data) as
    | { user?: ScProfileResponse['data']['user'] }
    | undefined
  const user = block?.user
  return {
    profile_pic_url: user?.profile_pic_url_hd ?? user?.profile_pic_url ?? null,
    follower_count: user?.edge_followed_by?.count ?? 0,
    user_id_ig: user?.id ?? null,
  }
}

async function fetchIgPosts(
  api: ApiClient,
  handle: string,
  auth: ApiAuth,
): Promise<IgContentItem[]> {
  const cutoff = Date.now() - REELS_WINDOW_DAYS * 86_400_000
  const rawItems: ScReelMedia[] = []
  let nextMaxId: string | undefined
  let pages = 0

  while (pages < MAX_PAGES) {
    const params = new URLSearchParams({ handle })
    if (nextMaxId) params.set('next_max_id', nextMaxId)
    if (pages > 0) await wait(PAGE_DELAY_MS)

    let res: ScPostsResponse | undefined
    let lastErr: unknown
    for (let attempt = 0; attempt <= PAGE_RETRY_DELAYS.length; attempt++) {
      try {
        res = await api.get<ScPostsResponse>(
          `/api/integrations/scrapecreators/instagram/posts?${params.toString()}`,
          auth,
        )
        lastErr = undefined
        break
      } catch (err) {
        lastErr = err
        if (attempt < PAGE_RETRY_DELAYS.length) await wait(PAGE_RETRY_DELAYS[attempt]!)
      }
    }
    if (lastErr) {
      if (pages === 0) throw lastErr
      break
    }

    let pageItems: ScReelMedia[] = []
    let moreAvailable = false
    let responseNextMaxId: string | undefined

    if (res?.items && Array.isArray(res.items)) {
      pageItems = res.items
      moreAvailable = res.more_available ?? false
      responseNextMaxId = res.next_max_id
    } else if (res?.data) {
      const d = res.data
      if (Array.isArray(d)) {
        pageItems = d
      } else if (d && typeof d === 'object') {
        const obj = d as Record<string, unknown>
        if (Array.isArray(obj.items)) pageItems = obj.items as ScReelMedia[]
        moreAvailable = (obj.more_available as boolean) ?? false
        responseNextMaxId = obj.next_max_id as string | undefined
      }
    }

    pages++
    for (const m of pageItems) rawItems.push(m)
    if (pageItems.length === 0 || !moreAvailable) break
    nextMaxId = responseNextMaxId ?? pageItems[pageItems.length - 1]?.pk
    if (!nextMaxId) break
  }

  const mapped = rawItems
    .filter((m) => (m.taken_at ?? 0) * 1000 >= cutoff)
    .map((m): Omit<IgContentItem, 'outlier_score'> => {
      const thumb = m.display_uri ?? m.image_versions2?.candidates?.[0]?.url ?? null
      return {
        ig_media_id: m.id || m.pk,
        shortcode: m.code,
        media_type: m.media_type === 2 ? 'reel' : m.media_type === 8 ? 'carousel' : 'image',
        play_count: m.play_count ?? m.ig_play_count ?? 0,
        like_count: m.like_count ?? null,
        comment_count: m.comment_count ?? null,
        thumbnail_url: thumb,
        video_url: m.video_versions?.[0]?.url ?? null,
        taken_at: new Date(m.taken_at * 1000).toISOString(),
        caption: m.caption?.text ?? null,
      }
    })

  return computeOutlierScores(mapped.map((m) => ({ ...m, outlier_score: 0 })))
}

async function cacheSocialImages(
  api: ApiClient,
  auth: ApiAuth,
  targets: Array<{ sourceUrl: string; cacheKey: string; name?: string }>,
): Promise<Map<string, CachedSocialImageResult>> {
  const unique = new Map<string, { sourceUrl: string; cacheKey: string; name?: string }>()
  for (const target of targets) {
    if (!target.sourceUrl || unique.has(target.cacheKey)) continue
    unique.set(target.cacheKey, target)
  }
  if (unique.size === 0) return new Map()

  try {
    const res = await api.post<{ platform: string; images: unknown[] }, CacheSocialImagesResponse>(
      '/api/media/cache-social-images',
      { platform: 'instagram', images: [...unique.values()] },
      auth,
    )
    return new Map(res.results.map((r) => [r.cacheKey, r]))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cache request failed'
    return new Map(
      [...unique.keys()].map((cacheKey) => [
        cacheKey,
        { cacheKey, ok: false, error: message } satisfies CachedSocialImageResult,
      ]),
    )
  }
}

export interface ApiAuth {
  userId: string
  orgId: string
}

export function ensureIgResearchView(
  schema: SpaceSchema,
  viewId: string,
  viewName: string,
): SpaceSchema {
  const hasView = schema.views.some((v) => v.id === viewId || v.type === IG_VIEW_TYPE)
  if (hasView) return schema
  return {
    ...schema,
    views: [
      ...schema.views,
      {
        id: viewId,
        type: IG_VIEW_TYPE,
        name: viewName,
        icon: 'instagram',
        ig_research_config: {
          tracked_accounts: [],
          sort_by: 'outlier_score',
          sort_dir: 'desc',
          media_filter: 'all',
          time_range: '30d',
          display_mode: 'grid',
        },
      },
    ],
  }
}

function getIgResearchConfig(
  schema: SpaceSchema,
  viewId: string,
): {
  viewIndex: number
  config: { tracked_accounts: SocialTrackedAccount[] }
} {
  const viewIndex = schema.views.findIndex((v) => v.id === viewId || v.type === IG_VIEW_TYPE)
  if (viewIndex < 0) throw new Error('IG Research view missing from schema')
  const view = schema.views[viewIndex]!
  const config = (view.ig_research_config as { tracked_accounts?: SocialTrackedAccount[] }) ?? {}
  return {
    viewIndex,
    config: { tracked_accounts: config.tracked_accounts ?? [] },
  }
}

export async function syncIgAccountForSpace(opts: {
  api: ApiClient
  auth: ApiAuth
  spaceId: string
  handle: string
  existingItems?: SpaceItem[]
}): Promise<{ account: SocialTrackedAccount; itemsCreated: number; itemsUpdated: number }> {
  const { api, auth, spaceId } = opts
  const handle = parseIgHandle(opts.handle)

  const profile = await fetchIgProfile(api, handle, auth)
  const posts = await fetchIgPosts(api, handle, auth)

  const allItems =
    opts.existingItems ?? (await api.get<SpaceItem[]>(`/api/spaces/${spaceId}/items`, auth))

  const existing = allItems.filter(
    (item) =>
      item.custom_data?._view_type === IG_VIEW_TYPE &&
      String(item.custom_data?._handle ?? '').toLowerCase() === handle,
  )
  const existingMediaIds = new Set(
    existing
      .map((item) => {
        const cd = item.custom_data
        return (cd?.media_id ?? cd?.ig_media_id) as string | undefined
      })
      .filter((id): id is string => Boolean(id)),
  )

  const profileId = profile.user_id_ig ?? handle
  const imageTargets = [
    ...(profile.profile_pic_url
      ? [
          {
            sourceUrl: profile.profile_pic_url,
            cacheKey: socialImageCacheKey(handle, profileId, 'profile'),
            name: `Instagram profile @${handle}`,
          },
        ]
      : []),
    ...posts
      .filter((item) => item.thumbnail_url)
      .filter((item) => {
        if (!existingMediaIds.has(item.ig_media_id)) return true
        const match = existing.find((ex) => {
          const cd = ex.custom_data
          return (cd?.media_id ?? cd?.ig_media_id) === item.ig_media_id
        })
        return !match?.custom_data?.thumbnail_asset_id
      })
      .map((item) => ({
        sourceUrl: item.thumbnail_url!,
        cacheKey: socialImageCacheKey(handle, item.ig_media_id, 'thumbnail'),
        name: `Instagram @${handle} ${item.shortcode || item.ig_media_id}`,
      })),
  ]
  const imageCache = await cacheSocialImages(api, auth, imageTargets)

  let itemsCreated = 0
  let itemsUpdated = 0
  for (const item of posts) {
    if (existingMediaIds.has(item.ig_media_id)) {
      const match = existing.find((ex) => {
        const cd = ex.custom_data
        return (cd?.media_id ?? cd?.ig_media_id) === item.ig_media_id
      })
      if (match) {
        const hasCachedThumbnail = Boolean(match.custom_data?.thumbnail_asset_id)
        await api.patch(
          `/api/spaces/${spaceId}/items/${match.id}`,
          {
            custom_data: {
              play_count: item.play_count,
              outlier_score: item.outlier_score,
              like_count: item.like_count,
              comment_count: item.comment_count,
              ...(!hasCachedThumbnail
                ? thumbnailCachePatch(
                    item.thumbnail_url,
                    imageCache.get(socialImageCacheKey(handle, item.ig_media_id, 'thumbnail')),
                  )
                : {}),
            },
          },
          auth,
        )
        itemsUpdated++
      }
      continue
    }
    await api.post(
      `/api/spaces/${spaceId}/items`,
      {
        title: item.shortcode || item.ig_media_id,
        custom_data: socialContentCustomData(
          handle,
          item,
          imageCache.get(socialImageCacheKey(handle, item.ig_media_id, 'thumbnail')),
        ),
      },
      auth,
    )
    itemsCreated++
  }

  const profileCacheKey = socialImageCacheKey(handle, profileId, 'profile')
  const account: SocialTrackedAccount = {
    handle,
    user_id_ig: profile.user_id_ig ?? undefined,
    follower_count: profile.follower_count,
    ...profilePicCachePatch(profile.profile_pic_url, imageCache.get(profileCacheKey)),
    last_synced_at: new Date().toISOString(),
  }

  return { account, itemsCreated, itemsUpdated }
}

export async function persistIgResearchSchema(opts: {
  api: ApiClient
  auth: ApiAuth
  spaceId: string
  schema: SpaceSchema
  viewId: string
  accounts: SocialTrackedAccount[]
}): Promise<void> {
  const { viewIndex, config } = getIgResearchConfig(opts.schema, opts.viewId)
  const nextViews = [...opts.schema.views]
  nextViews[viewIndex] = {
    ...nextViews[viewIndex]!,
    ig_research_config: { ...config, tracked_accounts: opts.accounts },
  }
  await opts.api.patch(
    `/api/spaces/${opts.spaceId}`,
    { schema: { ...opts.schema, views: nextViews } },
    opts.auth,
  )
}

export async function syncIgResearchSpace(opts: {
  api: ApiClient
  auth: ApiAuth
  spaceId: string
  schema: SpaceSchema
  viewId: string
  viewName: string
  handles: string[]
  log: (msg: string) => void
}): Promise<{ accounts: number; itemsCreated: number; itemsUpdated: number }> {
  let schema = ensureIgResearchView(opts.schema, opts.viewId, opts.viewName)
  const { config } = getIgResearchConfig(schema, opts.viewId)

  let itemsCreated = 0
  let itemsUpdated = 0
  const accounts: SocialTrackedAccount[] = [...config.tracked_accounts]
  let existingItems: SpaceItem[] | undefined

  for (const rawHandle of opts.handles) {
    const handle = parseIgHandle(rawHandle)
    opts.log(`  syncing @${handle}…`)
    const result = await syncIgAccountForSpace({
      api: opts.api,
      auth: opts.auth,
      spaceId: opts.spaceId,
      handle,
      existingItems,
    })
    itemsCreated += result.itemsCreated
    itemsUpdated += result.itemsUpdated
    existingItems = undefined

    const idx = accounts.findIndex((a) => a.handle.toLowerCase() === handle)
    if (idx >= 0) accounts[idx] = result.account
    else accounts.push(result.account)

    await wait(ACCOUNT_DELAY_MS)
  }

  await persistIgResearchSchema({
    api: opts.api,
    auth: opts.auth,
    spaceId: opts.spaceId,
    schema,
    viewId: opts.viewId,
    accounts,
  })

  return { accounts: accounts.length, itemsCreated, itemsUpdated }
}
