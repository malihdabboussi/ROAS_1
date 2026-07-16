import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPatch } from '@/lib/api/backend-client'
import {
  fetchFacebookPages,
  fetchLinkedInCompanyPages,
  fetchYoutubeChannels,
  saveFacebookPage,
  saveLinkedInCompanyPage,
  saveYoutubeChannel,
} from './social-reporting-pages-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)

describe('social reporting provider page APIs', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
  })

  it('fetches and normalizes selectable Facebook pages', async () => {
    backendGetMock.mockResolvedValue({
      success: true,
      pages: [{ id: 'page-1', name: 'ROAS Page' }],
      hint: 'Pick a page',
    })

    await expect(fetchFacebookPages('integration-1')).resolves.toEqual({
      success: true,
      pages: [{ id: 'page-1', name: 'ROAS Page' }],
      hint: 'Pick a page',
    })
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/integrations/facebook/pages?user_integration_id=integration-1',
    )
  })

  it('saves the selected Facebook page', async () => {
    backendPatchMock.mockResolvedValue({ success: true })

    await expect(
      saveFacebookPage({
        user_integration_id: 'integration-1',
        page_id: 'page-1',
        page_name: 'ROAS Page',
      }),
    ).resolves.toEqual({ success: true, error: undefined })
    expect(backendPatchMock).toHaveBeenCalledWith('/api/integrations/facebook/page', {
      user_integration_id: 'integration-1',
      page_id: 'page-1',
      page_name: 'ROAS Page',
    })
  })

  it('fetches and normalizes LinkedIn company pages', async () => {
    backendGetMock.mockResolvedValue({
      success: true,
      organizations: [{ urn: 'urn:li:org:1', name: 'ROAS', role: 'ADMINISTRATOR' }],
    })

    await expect(fetchLinkedInCompanyPages('integration-2')).resolves.toEqual({
      success: true,
      organizations: [{ urn: 'urn:li:org:1', name: 'ROAS', role: 'ADMINISTRATOR' }],
      error: undefined,
      hint: undefined,
    })
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/integrations/linkedin/company-pages?user_integration_id=integration-2',
    )
  })

  it('saves the selected LinkedIn company page', async () => {
    backendPatchMock.mockResolvedValue({ success: true })

    await expect(
      saveLinkedInCompanyPage({
        user_integration_id: 'integration-2',
        organization_urn: 'urn:li:org:1',
        organization_name: 'ROAS',
      }),
    ).resolves.toEqual({ success: true, error: undefined })
    expect(backendPatchMock).toHaveBeenCalledWith('/api/integrations/linkedin/company-page', {
      user_integration_id: 'integration-2',
      organization_urn: 'urn:li:org:1',
      organization_name: 'ROAS',
    })
  })

  it('fetches and normalizes YouTube channels', async () => {
    backendGetMock.mockResolvedValue({
      success: true,
      channels: [{ id: 'channel-1', name: 'ROAS', handle: '@vibey' }],
    })

    await expect(fetchYoutubeChannels('integration-3')).resolves.toEqual({
      success: true,
      channels: [{ id: 'channel-1', name: 'ROAS', handle: '@vibey' }],
      error: undefined,
      hint: undefined,
    })
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/integrations/youtube/channels?user_integration_id=integration-3',
    )
  })

  it('saves the selected YouTube channel', async () => {
    backendPatchMock.mockResolvedValue({ success: true })

    await expect(
      saveYoutubeChannel({
        user_integration_id: 'integration-3',
        channel_id: 'channel-1',
        channel_name: 'ROAS',
      }),
    ).resolves.toEqual({ success: true, error: undefined })
    expect(backendPatchMock).toHaveBeenCalledWith('/api/integrations/youtube/channel', {
      user_integration_id: 'integration-3',
      channel_id: 'channel-1',
      channel_name: 'ROAS',
    })
  })
})
