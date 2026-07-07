import { vi } from 'vitest'
import { SocialResearchAccountSyncService } from '../social-research-account-sync.service'
import { SocialResearchOrchestrationService } from '../social-research-orchestration.service'

type MockFn = ReturnType<typeof vi.fn>
export type SocialResearchTestItem = { id: string; custom_data?: Record<string, unknown> }
export type SocialResearchTestHarness = {
  service: SocialResearchOrchestrationService
  repo: Record<string, MockFn>
  scrapeCreators: Record<string, MockFn>
  transcriptFallback: { fetchTranscriptViaAgent: MockFn }
  media: { cacheSocialImage: MockFn }
  spaceRetrievalIndex: Record<string, MockFn>
  items: SocialResearchTestItem[]
}

export function makeService(overrides?: {
  items?: Array<{ id: string; custom_data?: Record<string, unknown> }>
  space?: Record<string, unknown>
}): SocialResearchTestHarness {
  const items = overrides?.items ?? []
  const repo = {
    findSpaceByIdForAccess: vi.fn().mockResolvedValue(
      overrides?.space ?? {
        schema: {
          views: [
            {
              id: 'v1',
              type: 'instagram_research',
              ig_research_config: { tracked_accounts: [{ handle: 'creator' }] },
            },
          ],
        },
      },
    ),
    findSpaceById: vi.fn().mockResolvedValue(
      overrides?.space ?? {
        schema: {
          views: [
            {
              id: 'v1',
              type: 'instagram_research',
              ig_research_config: { tracked_accounts: [{ handle: 'creator' }] },
            },
          ],
        },
      },
    ),
    findItemsBySpaceIdForAccess: vi.fn().mockResolvedValue(items),
    findItemsBySpaceId: vi.fn().mockResolvedValue(items),
    findItemById: vi.fn(async (_s, _spaceId, itemId) => items.find((i) => i.id === itemId)),
    createItem: vi.fn(async () => ({ id: 'created-item' })),
    updateItem: vi.fn(),
    updateSpace: vi.fn(),
    deleteItem: vi.fn(),
  }
  const scrapeCreators = {
    fetchSocialPosts: vi.fn(),
    fetchSocialProfile: vi.fn(),
    fetchSocialPostInfo: vi.fn(),
    fetchSocialTranscript: vi.fn(),
  }
  const transcriptFallback = {
    fetchTranscriptViaAgent: vi.fn().mockResolvedValue(null),
  }
  const media = { cacheSocialImage: vi.fn() }
  const spaceRetrievalIndex = {
    indexSource: vi.fn(),
    deleteSource: vi.fn(),
  }
  const accountSync = new SocialResearchAccountSyncService(
    repo as never,
    scrapeCreators as never,
    media as never,
    spaceRetrievalIndex as never,
  )
  const service = new SocialResearchOrchestrationService(
    repo as never,
    scrapeCreators as never,
    transcriptFallback as never,
    accountSync,
    spaceRetrievalIndex as never,
  )
  return { service, repo, scrapeCreators, transcriptFallback, media, spaceRetrievalIndex, items }
}
