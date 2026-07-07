import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchMetaAdAccounts,
  fetchMetaInstagramAccountsForPage,
  fetchMetaPages,
  fetchMetaPixels,
  getMetaConnectionStatus,
} from '../../../services/artifact-preview.service'
import { useSettingsTabMetaAssets } from './use-settings-tab-meta-assets'

vi.mock('../../../services/artifact-preview.service', () => ({
  fetchMetaAdAccounts: vi.fn().mockResolvedValue([{ id: 'act-1', name: 'Main Account' }]),
  fetchMetaInstagramAccountsForPage: vi.fn().mockResolvedValue([{ id: 'ig-1', username: 'main' }]),
  fetchMetaPages: vi.fn().mockResolvedValue([{ id: 'page-1', name: 'Main Page' }]),
  fetchMetaPixels: vi.fn().mockResolvedValue([{ id: 'pixel-1', name: 'Pixel One' }]),
  getMetaConnectionStatus: vi.fn().mockResolvedValue({
    connected: true,
    adAccounts: [{ id: 'act-status', name: 'Status Account' }],
    pages: [{ id: 'page-status', name: 'Status Page' }],
  }),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('useSettingsTabMetaAssets', () => {
  it('derives unique Meta pixel dropdown options from cached account pixels', () => {
    const { result } = renderHook(() =>
      useSettingsTabMetaAssets({ activeSection: 'agent', campaignConfig: {} }),
    )

    act(() => {
      result.current.setMetaPixelsByAccount({
        'act-1': [
          { id: 'pixel-1', name: 'Pixel One' },
          { id: 'pixel-2', name: '' },
        ],
        'act-2': [{ id: 'pixel-1', name: 'Duplicate Pixel' }],
      })
    })

    expect(result.current.allMetaPixelOptions).toEqual([
      { value: 'pixel-1', label: 'Duplicate Pixel' },
      { value: 'pixel-2', label: 'pixel-2' },
    ])
  })

  it('loads Meta connection assets when ads settings become relevant', async () => {
    const { result } = renderHook(() =>
      useSettingsTabMetaAssets({ activeSection: 'ads', campaignConfig: {} }),
    )

    await waitFor(() => {
      expect(getMetaConnectionStatus).toHaveBeenCalled()
      expect(fetchMetaAdAccounts).toHaveBeenCalled()
      expect(fetchMetaPages).toHaveBeenCalled()
      expect(fetchMetaPixels).toHaveBeenCalledWith('act-1')
    })
    expect(result.current.metaConnected).toBe(true)
    expect(result.current.metaAdAccounts).toEqual([{ id: 'act-1', name: 'Main Account' }])
    expect(result.current.metaPages).toEqual([{ id: 'page-1', name: 'Main Page' }])
    expect(result.current.metaPixelsByAccount).toEqual({
      'act-1': [{ id: 'pixel-1', name: 'Pixel One' }],
    })
  })

  it('loads missing Instagram accounts for configured Meta asset profiles', async () => {
    const { result } = renderHook(() =>
      useSettingsTabMetaAssets({
        activeSection: 'ads',
        campaignConfig: {
          meta_asset_profiles: [{ id: 'default', page_id: 'page-1' }],
        },
      }),
    )

    act(() => {
      result.current.setMetaConnected(true)
    })

    await waitFor(() => {
      expect(fetchMetaInstagramAccountsForPage).toHaveBeenCalledWith('page-1')
      expect(result.current.metaInstagramAccountsByCampaign['profile-default']).toEqual([
        { id: 'ig-1', username: 'main' },
      ])
    })
  })
})
