import { afterEach, describe, expect, it, vi } from 'vitest'
import { backendPost } from '@/lib/api/backend-client'
import { startOpenAICodexOAuth } from './openai-codex-oauth'

vi.mock('@/lib/api/backend-client', () => ({
  backendPost: vi.fn(),
}))

describe('startOpenAICodexOAuth', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the OpenAI Codex authorize URL', async () => {
    vi.mocked(backendPost).mockResolvedValue({
      success: true,
      authorizeUrl: 'https://auth.openai.com/oauth/authorize?state=state-1',
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    const started = await startOpenAICodexOAuth('https://app.vibey.test/chat')

    expect(started).toBe(true)
    expect(backendPost).toHaveBeenCalledWith('/api/integrations/openai-codex/connect', {
      redirectTo: 'https://app.vibey.test/chat',
    })
    expect(openSpy).toHaveBeenCalledWith(
      'https://auth.openai.com/oauth/authorize?state=state-1',
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('does not open a tab when the backend omits authorizeUrl', async () => {
    vi.mocked(backendPost).mockResolvedValue({ success: true })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    const started = await startOpenAICodexOAuth('https://app.vibey.test/chat')

    expect(started).toBe(false)
    expect(openSpy).not.toHaveBeenCalled()
  })
})
