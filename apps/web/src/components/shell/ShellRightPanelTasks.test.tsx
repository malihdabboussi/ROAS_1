import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '@/lib/conversations'
import { ShellRightPanelTasks } from './ShellRightPanelTasks'

vi.mock('@/features/spaces/hooks/use-your-turn-feed', () => ({
  useYourTurnFeed: () => ({ loading: false, items: [], reload: vi.fn() }),
}))

vi.mock('@/features/home/components/HomeTaskDetailHost', () => ({
  HomeTaskDetailHost: () => null,
}))

vi.mock('@/features/home/hooks/use-home-feed-open', () => ({
  useHomeFeedOpen: () => ({
    activeYourTurnItem: null,
    openYourTurnItem: vi.fn(),
    closeYourTurnItem: vi.fn(),
  }),
}))

afterEach(cleanup)

describe('ShellRightPanelTasks', () => {
  it('shows the latest detail for active chat work', () => {
    const messages: Message[] = [
      {
        id: 'message-1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: null,
        content_blocks: null,
        metadata: {
          content_blocks_ordered: [
            {
              type: 'tool',
              id: 'tool-1',
              label: 'Building campaign blueprint',
              state: 'active',
              progress: [
                { detail: 'Reading Client Brain', at: 1784937500000 },
                { detail: 'Creating Canvas nodes', at: 1784937600000 },
              ],
            },
          ],
        },
        created_at: '2026-08-28T20:00:00.000Z',
      },
    ]

    render(<ShellRightPanelTasks conversationId="conversation-1" messages={messages} />)

    expect(screen.getByText('Building campaign blueprint')).toBeInTheDocument()
    expect(screen.getByText('Creating Canvas nodes')).toBeInTheDocument()
  })
})
