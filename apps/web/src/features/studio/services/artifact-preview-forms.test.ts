import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  createForm,
  deleteForm,
  fetchCampaignFormAggregates,
  fetchCampaignForms,
  fetchForm,
  fetchFormResponses,
  fetchSpaceFormAggregates,
  fetchSpaceForms,
  publishForm,
  unpublishForm,
  updateForm,
} from './artifact-preview.service'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
  backendPut: vi.fn(),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
  invalidateCachedFetch: vi.fn(),
}))

const backendDeleteMock = vi.mocked(backendDelete)
const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)
const backendPostMock = vi.mocked(backendPost)
const cachedFetchMock = vi.mocked(cachedFetch)

describe('artifact preview form API', () => {
  beforeEach(() => {
    backendDeleteMock.mockReset()
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
    backendPostMock.mockReset()
    cachedFetchMock.mockReset()
    cachedFetchMock.mockImplementation((_key: string, fetcher: () => Promise<unknown>) =>
      fetcher(),
    )
  })

  it('fetches a form and its responses from the backend API', async () => {
    backendGetMock.mockResolvedValueOnce({ id: 'form-1', name: 'Lead Form' })
    backendGetMock.mockResolvedValueOnce([{ id: 'response-1', form_id: 'form-1' }])

    await expect(fetchForm('form-1')).resolves.toEqual({ id: 'form-1', name: 'Lead Form' })
    await expect(fetchFormResponses('form-1')).resolves.toEqual([
      { id: 'response-1', form_id: 'form-1' },
    ])

    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/forms/form-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(2, '/api/forms/form-1/responses')
  })

  it('lists campaign and space forms through artifact-list cache keys', async () => {
    backendGetMock.mockResolvedValueOnce([{ id: 'campaign-form' }])
    backendGetMock.mockResolvedValueOnce([{ id: 'space-form' }])

    await expect(fetchCampaignForms('campaign-1')).resolves.toEqual([{ id: 'campaign-form' }])
    await expect(fetchSpaceForms('campaign-1', 'space-1')).resolves.toEqual([
      { id: 'space-form' },
    ])

    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      1,
      'artifact-list:/api/forms?campaign_id=campaign-1',
      expect.any(Function),
    )
    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      2,
      'artifact-list:/api/forms?campaign_id=campaign-1&space_id=space-1',
      expect.any(Function),
    )
    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/forms?campaign_id=campaign-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(
      2,
      '/api/forms?campaign_id=campaign-1&space_id=space-1',
    )
  })

  it('fetches campaign and space form aggregates', async () => {
    backendGetMock.mockResolvedValueOnce([{ form_id: 'form-1', responses_count: 2 }])
    backendGetMock.mockResolvedValueOnce([{ form_id: 'form-2', responses_count: 1 }])

    await expect(fetchCampaignFormAggregates('campaign-1')).resolves.toEqual([
      { form_id: 'form-1', responses_count: 2 },
    ])
    await expect(fetchSpaceFormAggregates('campaign-1', 'space-1')).resolves.toEqual([
      { form_id: 'form-2', responses_count: 1 },
    ])

    expect(backendGetMock).toHaveBeenNthCalledWith(
      1,
      '/api/forms/aggregates?campaign_id=campaign-1',
    )
    expect(backendGetMock).toHaveBeenNthCalledWith(
      2,
      '/api/forms/aggregates?campaign_id=campaign-1&space_id=space-1',
    )
  })

  it('creates and updates forms with the existing payload shape', async () => {
    backendPostMock.mockResolvedValueOnce({ id: 'form-1', campaign_id: 'campaign-1' })
    backendPatchMock.mockResolvedValueOnce({ id: 'form-1', name: 'Updated Form' })

    await expect(
      createForm('campaign-1', { name: 'Lead Form', space_id: 'space-1' }),
    ).resolves.toEqual({
      id: 'form-1',
      campaign_id: 'campaign-1',
    })
    await expect(updateForm('form-1', { name: 'Updated Form' })).resolves.toEqual({
      id: 'form-1',
      name: 'Updated Form',
    })

    expect(backendPostMock).toHaveBeenCalledWith('/api/forms', {
      name: 'Lead Form',
      campaign_id: 'campaign-1',
      space_id: 'space-1',
    })
    expect(backendPatchMock).toHaveBeenCalledWith('/api/forms/form-1', {
      name: 'Updated Form',
    })
  })

  it('deletes, publishes, and unpublishes forms through existing routes', async () => {
    backendDeleteMock.mockResolvedValueOnce(undefined)
    backendPostMock.mockResolvedValueOnce({ success: true, url: 'https://form.test' })
    backendPostMock.mockResolvedValueOnce({ success: true, status: 'draft' })

    await expect(deleteForm('form-1')).resolves.toBeUndefined()
    await expect(publishForm('form-1')).resolves.toEqual({
      success: true,
      url: 'https://form.test',
    })
    await expect(unpublishForm('form-1')).resolves.toEqual({
      success: true,
      status: 'draft',
    })

    expect(backendDeleteMock).toHaveBeenCalledWith('/api/forms/form-1')
    expect(backendPostMock).toHaveBeenNthCalledWith(1, '/api/forms/form-1/publish', {})
    expect(backendPostMock).toHaveBeenNthCalledWith(2, '/api/forms/form-1/unpublish', {})
  })
})
