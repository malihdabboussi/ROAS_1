import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SuggestedNextMoves } from './SuggestedNextMoves'

const mocks = vi.hoisted(() => ({
  fetchNextMoves: vi.fn(),
  push: vi.fn(),
  snoozeNextMove: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/features/home/services/next-moves.service', () => ({
  fetchNextMoves: mocks.fetchNextMoves,
  snoozeNextMove: mocks.snoozeNextMove,
}))
vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

describe('SuggestedNextMoves', () => {
  beforeEach(() => {
    mocks.fetchNextMoves.mockResolvedValue({
      suggestions: [
        {
          id: 'action-1',
          title: 'Send the revised offer',
          prompt: 'Use the call context and help me send the revised offer.',
          source: {
            type: 'meeting',
            title: 'August 5 offer call',
            occurredAt: '2026-08-05T12:00:00.000Z',
            spaceId: 'space-1',
            meetingItemId: 'meeting-1',
          },
        },
      ],
    })
    mocks.snoozeNextMove.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows a grounded suggestion and opens its source meeting', async () => {
    render(<SuggestedNextMoves />)

    expect(await screen.findByText('Send the revised offer')).toBeTruthy()
    expect(screen.getByText(/August 5 offer call/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open suggestion: Send the revised offer' }))
    expect(mocks.push).toHaveBeenCalledWith('/spaces?space=space-1&item=meeting-1')
  })

  it('removes a snoozed suggestion', async () => {
    render(<SuggestedNextMoves />)
    fireEvent.click(await screen.findByRole('button', { name: 'Snooze Send the revised offer' }))

    await waitFor(() => {
      expect(mocks.snoozeNextMove).toHaveBeenCalledWith('action-1', 'week')
    })
    expect(screen.queryByText('Send the revised offer')).toBeNull()
  })

  it('fills the composer instead of navigating when used on the new-chat screen', async () => {
    const onSelectPrompt = vi.fn()
    render(<SuggestedNextMoves onSelectPrompt={onSelectPrompt} />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Use suggestion: Send the revised offer' }),
    )

    expect(onSelectPrompt).toHaveBeenCalledWith(
      'Use the call context and help me send the revised offer.',
    )
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('keeps additional suggested actions behind See more', async () => {
    const first = (await mocks.fetchNextMoves()).suggestions[0]
    mocks.fetchNextMoves.mockResolvedValue({
      suggestions: Array.from({ length: 4 }, (_, index) => ({
        ...first,
        id: `action-${index + 1}`,
        title: `Suggested action ${index + 1}`,
      })),
    })

    render(<SuggestedNextMoves />)

    expect(await screen.findByText('Suggested action 3')).toBeTruthy()
    expect(screen.queryByText('Suggested action 4')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'See more (1)' }))

    expect(screen.getByText('Suggested action 4')).toBeTruthy()
  })
})
