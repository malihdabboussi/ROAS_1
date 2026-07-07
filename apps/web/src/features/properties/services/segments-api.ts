import { backendDelete, backendGet, backendPost, backendPut } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import type { CreateSegmentRequest, Segment, UpdateSegmentRequest } from '@/lib/properties/segments'

interface SegmentsListResponse {
  segments: Segment[]
}

const SEGMENTS_CACHE_PREFIX = 'segments:list'
const SEGMENTS_TTL_MS = 60_000

/** Drop every cached segments-list entry (all org/personal variants). */
function invalidateSegmentsCache(): void {
  invalidateCachedFetch(SEGMENTS_CACHE_PREFIX)
}

export const segmentsApi = {
  async getSegments(): Promise<Segment[]> {
    const response = await cachedFetch(
      getOrgScopedKey(SEGMENTS_CACHE_PREFIX),
      () => backendGet<SegmentsListResponse>('/api/segments'),
      { ttlMs: SEGMENTS_TTL_MS },
    )
    return response.segments || []
  },

  async getSegment(segmentId: string): Promise<Segment> {
    return backendGet<Segment>(`/api/segments/${segmentId}`)
  },

  async createSegment(data: CreateSegmentRequest): Promise<Segment> {
    const segment = await backendPost<Segment>('/api/segments', data)
    invalidateSegmentsCache()
    return segment
  },

  async updateSegment(segmentId: string, data: UpdateSegmentRequest): Promise<Segment> {
    const segment = await backendPut<Segment>(`/api/segments/${segmentId}`, data)
    invalidateSegmentsCache()
    return segment
  },

  async deleteSegment(segmentId: string): Promise<void> {
    await backendDelete(`/api/segments/${segmentId}`)
    invalidateSegmentsCache()
  },
}
