import { beforeEach, describe, expect, it, vi } from 'vitest'

const backendPost = vi.fn()
vi.mock('@/lib/api/backend-client', () => ({
  backendPost: (...args: unknown[]) => backendPost(...args),
}))

vi.mock('./composio-oauth', () => ({
  buildComposioProxyCallbackUrl: (id: string, redirectTo: string) =>
    `https://app.test/callback?id=${id}&to=${encodeURIComponent(redirectTo)}`,
}))

import { connectComposioIntegration } from './connect-composio-integration'

describe('connectComposioIntegration', () => {
  beforeEach(() => {
    backendPost.mockReset()
    vi.stubGlobal('open', vi.fn(() => ({ focus: vi.fn() })))
    vi.stubGlobal('location', { href: 'https://app.test/spaces', assign: vi.fn() })
  })

  it('posts connect and opens the authorize URL', async () => {
    backendPost.mockResolvedValue({
      success: true,
      redirect_url: 'https://oauth.example/canva',
    })

    await expect(connectComposioIntegration('canva')).resolves.toEqual({ status: 'oauth_opened' })

    expect(backendPost).toHaveBeenCalledWith(
      '/api/integrations/composio/connect',
      expect.objectContaining({
        integration_id: 'canva',
        long_redirect_url: true,
      }),
    )
    expect(window.open).toHaveBeenCalledWith(
      'https://oauth.example/canva',
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('treats reused connection with no redirect as already connected', async () => {
    backendPost.mockResolvedValue({
      success: true,
      redirect_url: null,
      reused: true,
      status: 'connected',
    })

    await expect(connectComposioIntegration('canva')).resolves.toEqual({
      status: 'already_connected',
    })
    expect(window.open).not.toHaveBeenCalled()
    expect(backendPost).toHaveBeenCalledTimes(1)
  })

  it('force_new when first connect has no redirect and is not reused', async () => {
    backendPost
      .mockResolvedValueOnce({ success: true, redirect_url: null, status: 'pending' })
      .mockResolvedValueOnce({
        success: true,
        redirect_url: 'https://oauth.example/canva-fresh',
      })

    await expect(connectComposioIntegration('canva')).resolves.toEqual({ status: 'oauth_opened' })

    expect(backendPost).toHaveBeenNthCalledWith(
      2,
      '/api/integrations/composio/connect',
      expect.objectContaining({ force_new: true }),
    )
    expect(window.open).toHaveBeenCalledWith(
      'https://oauth.example/canva-fresh',
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('falls back to same-tab navigate when popup is blocked', async () => {
    vi.stubGlobal('open', vi.fn(() => null))
    backendPost.mockResolvedValue({
      success: true,
      redirect_url: 'https://oauth.example/canva',
    })

    await expect(connectComposioIntegration('canva')).resolves.toEqual({ status: 'oauth_opened' })
    expect(window.location.assign).toHaveBeenCalledWith('https://oauth.example/canva')
  })

  it('throws when authorize URL is still missing after force_new', async () => {
    backendPost
      .mockResolvedValueOnce({ success: true, redirect_url: null })
      .mockResolvedValueOnce({ success: true, redirect_url: null })

    await expect(connectComposioIntegration('canva')).rejects.toThrow(/authorization URL/i)
  })
})
