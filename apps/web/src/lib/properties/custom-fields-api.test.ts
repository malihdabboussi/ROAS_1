import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { customFieldsApi } from './custom-fields-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
  invalidateCachedFetch: vi.fn(),
}))

vi.mock('@/lib/utils/org-storage', () => ({
  getOrgScopedKey: (baseKey: string) => `${baseKey}:org-1`,
}))

const backendDeleteMock = vi.mocked(backendDelete)
const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)
const backendPostMock = vi.mocked(backendPost)
const cachedFetchMock = vi.mocked(cachedFetch)
const invalidateCachedFetchMock = vi.mocked(invalidateCachedFetch)

describe('custom fields api', () => {
  beforeEach(() => {
    backendDeleteMock.mockReset()
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
    backendPostMock.mockReset()
    cachedFetchMock.mockReset()
    invalidateCachedFetchMock.mockReset()
    cachedFetchMock.mockImplementation((_key: string, fetcher: () => Promise<unknown>) =>
      fetcher(),
    )
  })

  it('fetches custom fields through the existing org-scoped cache key', async () => {
    const fields = [{ id: 'field-1', name: 'Budget' }]
    backendGetMock.mockResolvedValue({ fields })

    await expect(customFieldsApi.getCustomFields()).resolves.toEqual(fields)

    expect(cachedFetchMock).toHaveBeenCalledWith(
      'custom-fields:org-1',
      expect.any(Function),
      { ttlMs: 60_000 },
    )
    expect(backendGetMock).toHaveBeenCalledWith('/api/custom-fields')
  })

  it('returns an empty field list when the API response omits fields', async () => {
    backendGetMock.mockResolvedValue({})

    await expect(customFieldsApi.getCustomFields()).resolves.toEqual([])
  })

  it('creates, updates, and deletes fields through the existing routes', async () => {
    backendPostMock.mockResolvedValueOnce({ field: { id: 'field-1', name: 'Budget' } })
    backendPatchMock.mockResolvedValueOnce({ field: { id: 'field-1', name: 'Budget Updated' } })
    backendDeleteMock.mockResolvedValueOnce(undefined)

    await expect(
      customFieldsApi.createCustomField({ name: 'Budget', field_type: 'number' }),
    ).resolves.toEqual({ id: 'field-1', name: 'Budget' })
    await expect(
      customFieldsApi.updateCustomField('field-1', { name: 'Budget Updated' }),
    ).resolves.toEqual({ id: 'field-1', name: 'Budget Updated' })
    await expect(customFieldsApi.deleteCustomField('field-1')).resolves.toBeUndefined()

    expect(backendPostMock).toHaveBeenCalledWith('/api/custom-fields', {
      name: 'Budget',
      field_type: 'number',
    })
    expect(backendPatchMock).toHaveBeenCalledWith('/api/custom-fields/field-1', {
      name: 'Budget Updated',
    })
    expect(backendDeleteMock).toHaveBeenCalledWith('/api/custom-fields/field-1')
    expect(invalidateCachedFetchMock).toHaveBeenCalledTimes(3)
    expect(invalidateCachedFetchMock).toHaveBeenCalledWith('custom-fields')
  })
})
