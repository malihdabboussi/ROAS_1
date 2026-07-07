import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContactConversationItem } from '../../services/contact-communications.service'
import { ContactConversationThread } from './ContactConversationThread'

const mocks = vi.hoisted(() => ({
  fetchConversationMessages: vi.fn(),
  useCachedMissionAgents: vi.fn(),
}))

vi.mock('../../services/contact-communications.service', () => ({
  fetchConversationMessages: mocks.fetchConversationMessages,
}))

vi.mock('@/lib/agents', () => ({
  useCachedMissionAgents: mocks.useCachedMissionAgents,
}))

const conversation: ContactConversationItem = {
  id: 'conversation-1',
  title: 'Pricing question',
  agent_id: 'atlas',
  status: 'open',
  created_at: '2026-06-23T09:00:00.000Z',
  updated_at: '2026-06-23T09:10:00.000Z',
  metadata: null,
  channel: 'telegram',
  agent_name: 'Atlas',
  agent_image_url: null,
  preview_messages: [],
}

describe('ContactConversationThread', () => {
  beforeEach(() => {
    mocks.fetchConversationMessages.mockResolvedValue([
      {
        id: 'message-1',
        conversation_id: 'conversation-1',
        role: 'user',
        content: 'Can I get pricing?',
        created_at: '2026-06-23T09:01:00.000Z',
      },
      {
        id: 'message-2',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: 'Here are the current options.',
        created_at: '2026-06-23T09:02:00.000Z',
      },
    ])
    mocks.useCachedMissionAgents.mockReturnValue({
      data: [
        {
          id: 'agent-1',
          agent_key: 'atlas',
          name: 'Atlas',
          role: 'Research',
          status: 'online',
          image_url: 'https://cdn.example.com/atlas.png',
          is_active: true,
          updated_at: '2026-06-23T09:00:00.000Z',
          level: 'employee',
          team_id: 'team-1',
          sort_order: 1,
        },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders thread messages, resolves agent avatar fallback, and stays render-stable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onBack = vi.fn()
    let renderCount = 0

    function Harness() {
      renderCount += 1
      return <ContactConversationThread conversation={conversation} onBack={onBack} />
    }

    try {
      const { container } = render(<Harness />)

      expect(screen.getByText('Loading conversation…')).toBeTruthy()

      await waitFor(() => {
        expect(screen.getByText('Can I get pricing?')).toBeTruthy()
        expect(screen.getByText('Here are the current options.')).toBeTruthy()
      })

      expect(mocks.fetchConversationMessages).toHaveBeenCalledWith('conversation-1', {
        limit: 50,
      })
      expect(screen.getByText('Pricing question')).toBeTruthy()
      expect(screen.getByText('with Atlas')).toBeTruthy()
      expect(screen.getByText('Telegram')).toBeTruthy()
      expect(container.querySelector('img[src="https://cdn.example.com/atlas.png"]')).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Back to communications' }))
      expect(onBack).toHaveBeenCalledTimes(1)

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(renderCount).toBeLessThan(30)
    } finally {
      consoleError.mockRestore()
    }
  })
})
