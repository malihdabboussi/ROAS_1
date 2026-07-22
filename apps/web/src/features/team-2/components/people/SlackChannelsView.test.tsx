import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchSlackChannelActivity,
  fetchSlackChannelCoverage,
  fetchSlackChannels,
  patchSlackChannelExclusion,
} from '../../services/slack-people.service'
import { SlackChannelsView } from './SlackChannelsView'

vi.mock('../../services/slack-people.service', () => ({
  fetchSlackChannels: vi.fn(),
  fetchSlackChannelActivity: vi.fn(),
  fetchSlackChannelCoverage: vi.fn(),
  patchSlackChannelExclusion: vi.fn(),
}))

describe('SlackChannelsView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists the Slack channels Pixel belongs to', async () => {
    vi.mocked(fetchSlackChannels).mockResolvedValue({
      connected: true,
      channels: [{ id: 'C1', name: 'client-alpha', is_private: false }],
    })
    vi.mocked(fetchSlackChannelCoverage).mockResolvedValue({
      summary: { discovered: 1, joined: 1, observed: 1, excluded: 0, inaccessible: 0 },
      channels: [
        {
          channel_id: 'C1',
          channel_name: 'client-alpha',
          is_private: false,
          is_member: true,
          is_excluded: false,
          join_status: 'observed',
          join_error: null,
          last_reconciled_at: '2026-07-22T12:00:00.000Z',
        },
      ],
    })
    const onSelectChannel = vi.fn()

    render(
      <SlackChannelsView
        selectedChannelId={null}
        onSelectChannel={onSelectChannel}
        onBack={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /client-alpha/i }))
    expect(onSelectChannel).toHaveBeenCalledWith('C1')
    expect(screen.getByText('1 observed')).toBeVisible()
  })

  it('renders Pixel on the left and human replies on the right with thread evidence', async () => {
    vi.mocked(fetchSlackChannelActivity).mockResolvedValue({
      channel: { id: 'C1', name: 'client-alpha' },
      messages: [
        {
          ts: '1721000000.000100',
          text: 'Here is the proposed follow-up.',
          sender_name: 'Pixel',
          direction: 'outbound',
          thread_ts: null,
          is_thread_reply: false,
        },
        {
          ts: '1721000100.000200',
          text: 'Please revise the second point.',
          sender_name: 'Avery',
          direction: 'inbound',
          thread_ts: '1721000000.000100',
          is_thread_reply: true,
        },
      ],
    })

    render(<SlackChannelsView selectedChannelId="C1" onSelectChannel={vi.fn()} onBack={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Here is the proposed follow-up.')).toBeVisible())
    expect(screen.getByText('Here is the proposed follow-up.').closest('article')).toHaveClass(
      'mr-auto',
    )
    expect(screen.getByText('Please revise the second point.').closest('article')).toHaveClass(
      'ml-auto',
    )
    expect(screen.getByText('Thread reply')).toBeVisible()
  })
})
