import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendDelete, backendPost } from '@/lib/api/backend-client'
import {
  addTrackedSocialAccount,
  removeTrackedSocialAccountItems,
  syncTrackedSocialAccount,
} from '../social-research.service'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPost: vi.fn(),
  backendDelete: vi.fn(),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn(),
}))

describe('social research API client', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls add account API and maps response', async () => {
    vi.mocked(backendPost).mockResolvedValue({
      success: true,
      account: {
        handle: 'creator',
        profile_pic_asset_id: 'ig/creator/ig-user-1/profile-asset',
        profile_pic_source_url: 'https://instagram.fadd2-1.fna.fbcdn.net/profile.jpg',
      },
      item_count: 1,
    } as never)

    const result = await addTrackedSocialAccount('instagram', 'space-1', '@Creator')

    expect(backendPost).toHaveBeenCalledWith(
      '/api/spaces/space-1/social-research/instagram/accounts',
      { handle: '@Creator' },
      { resilient: true },
    )
    expect(result.account.handle).toBe('creator')
    expect(result.itemCount).toBe(1)
    expect(result.account.profile_pic_asset_id).toBe('ig/creator/ig-user-1/profile-asset')
  })

  it('calls sync account API and maps response', async () => {
    vi.mocked(backendPost).mockResolvedValue({
      success: true,
      item_count: 0,
      last_synced_at: '2026-05-20T12:00:00.000Z',
      account_patch: { follower_count: 999 },
    } as never)

    const result = await syncTrackedSocialAccount('instagram', 'space-1', 'creator')

    expect(backendPost).toHaveBeenCalledWith(
      '/api/spaces/space-1/social-research/instagram/accounts/creator/sync',
      {},
      { resilient: true },
    )
    expect(result.lastSyncedAt).toBe('2026-05-20T12:00:00.000Z')
    expect(result.accountPatch?.follower_count).toBe(999)
  })

  it('forwards explicit org context for account mutations', async () => {
    vi.mocked(backendPost).mockResolvedValue({
      success: true,
      account: { handle: 'creator' },
      item_count: 0,
      last_synced_at: '2026-05-20T12:00:00.000Z',
    } as never)
    vi.mocked(backendDelete).mockResolvedValue({ success: true, deleted_count: 0 } as never)
    const backend = { orgId: 'org-1' }

    await addTrackedSocialAccount('instagram', 'space-1', 'creator', backend)
    await syncTrackedSocialAccount('instagram', 'space-1', 'creator', backend)
    await removeTrackedSocialAccountItems('instagram', 'space-1', 'creator', backend)

    expect(backendPost).toHaveBeenNthCalledWith(
      1,
      '/api/spaces/space-1/social-research/instagram/accounts',
      { handle: 'creator' },
      { orgId: 'org-1', resilient: true },
    )
    expect(backendPost).toHaveBeenNthCalledWith(
      2,
      '/api/spaces/space-1/social-research/instagram/accounts/creator/sync',
      {},
      { orgId: 'org-1', resilient: true },
    )
    expect(backendDelete).toHaveBeenCalledWith(
      '/api/spaces/space-1/social-research/instagram/accounts/creator',
      undefined,
      { orgId: 'org-1' },
    )
  })
})
