import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CanvasPixelPanel } from './CanvasPixelPanel'

vi.mock('@/features/team', () => ({
  AgentChatPanel: ({
    systemContext,
    initialCampaignId,
    composerSeed,
  }: {
    systemContext: string
    initialCampaignId: string
    composerSeed?: { text: string; nonce: string } | null
  }) => (
    <div
      data-testid="pixel-chat"
      data-context={systemContext}
      data-campaign-id={initialCampaignId}
      data-composer-seed={composerSeed?.text}
    />
  ),
}))

vi.mock('@/lib/agents', () => ({
  fetchMissionAgents: vi.fn(async () => [
    {
      id: 'pixel-id',
      user_id: 'user-1',
      agent_key: 'vibey',
      name: 'Pixel',
      role: 'Designer',
      status: 'online',
      skills: [],
      created_at: '2026-08-10T00:00:00Z',
      updated_at: '2026-08-10T00:00:00Z',
    },
  ]),
}))

describe('CanvasPixelPanel', () => {
  it('attaches the current board revision and selection to Pixel chat', async () => {
    render(
      <CanvasPixelPanel
        boardId="board-1"
        campaignId="campaign-1"
        revision={7}
        viewport={{ x: 120, y: 80, zoom: 1.25 }}
        selectedIds={['item-1', 'item-2']}
        composerSeed={{ text: 'Create the missing reminder sequence.', nonce: 'seed-1' }}
        onClose={vi.fn()}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('pixel-chat')).toBeInTheDocument())
    const context = screen.getByTestId('pixel-chat').getAttribute('data-context')
    expect(screen.getByTestId('pixel-chat')).toHaveAttribute('data-campaign-id', 'campaign-1')
    expect(context).toContain('campaign_id=campaign-1')
    expect(context).toContain('board_id=board-1')
    expect(context).toContain('board_revision=7')
    expect(context).toContain('canvas_viewport={"x":120,"y":80,"zoom":1.25}')
    expect(context).toContain('selected_canvas_item_ids=item-1,item-2')
    expect(context).toContain('build_campaign_blueprint')
    expect(context).toContain('playbook_id=webinar-fulfillment')
    expect(context).toContain('do not use create_strategy_node')
    expect(screen.getByTestId('pixel-chat')).toHaveAttribute(
      'data-composer-seed',
      'Create the missing reminder sequence.',
    )
  })
})
