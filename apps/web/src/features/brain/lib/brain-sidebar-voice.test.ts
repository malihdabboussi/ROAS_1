import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestBrainSidebarVoice } from './brain-sidebar-voice'

const requestVoiceStartMock = vi.fn()

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: {
    getState: () => ({
      requestVoiceStart: requestVoiceStartMock,
    }),
  },
}))

describe('requestBrainSidebarVoice', () => {
  afterEach(() => {
    requestVoiceStartMock.mockClear()
  })

  it('starts Atlas voice in the sidebar chat by default', () => {
    requestBrainSidebarVoice()
    expect(requestVoiceStartMock).toHaveBeenCalledWith('atlas', { surface: 'brain' })
  })

  it('uses the scoped agent when provided', () => {
    requestBrainSidebarVoice('brain_scholar')
    expect(requestVoiceStartMock).toHaveBeenCalledWith('brain_scholar', { surface: 'brain' })
  })
})
