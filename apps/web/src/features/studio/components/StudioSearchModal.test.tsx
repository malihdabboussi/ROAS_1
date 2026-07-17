import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudioSearchModal } from './StudioSearchModal'

const searchMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/studio/services/studio-search-api.service', () => ({
  fetchStudioGlobalSearch: searchMock,
}))

vi.mock('@/components/ui/IconPicker', () => ({
  LucideIcon: ({ name }: { name: string }) => <span>{name}</span>,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('StudioSearchModal', () => {
  it('renders server-backed tasks, docs, deliverables, conversations, campaigns, and artifacts', async () => {
    vi.useFakeTimers()
    searchMock.mockResolvedValue([
      { kind: 'task', id: 'task-1', label: 'Strategy task', subtitle: 'Task', url: '/spaces?space=s1&item=task-1' },
      { kind: 'doc', id: 'doc-1', label: 'Strategy doc', subtitle: 'Doc', url: '/spaces?space=s1&item=doc-1' },
      { kind: 'deliverable', id: 'del-1', label: 'Strategy output', subtitle: 'Deliverable', url: '/mission-control?mission=m1' },
      { kind: 'conversation', id: 'conv-1', label: 'Strategy chat', subtitle: 'Vibey', url: null },
      { kind: 'campaign', id: 'camp-1', label: 'Strategy campaign', subtitle: 'Campaign', url: null, campaignIcon: 'target' },
      { kind: 'artifact', id: 'offer-1', label: 'Strategy offer', subtitle: 'Offer', url: null, campaignId: 'camp-1', artifactKind: 'offer' },
    ])

    render(
      <StudioSearchModal
        open
        onClose={vi.fn()}
        campaigns={[{ id: 'camp-1', name: 'Strategy campaign', icon: 'target' }]}
        onSelect={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Search everything…'), {
      target: { value: 'strategy' },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(220)
      await Promise.resolve()
    })

    expect(screen.getByText('Strategy task')).toBeTruthy()
    expect(screen.getByText('Strategy doc')).toBeTruthy()
    expect(screen.getByText('Strategy output')).toBeTruthy()
    expect(screen.getByText('Strategy chat')).toBeTruthy()
    expect(screen.getByText('Strategy campaign')).toBeTruthy()
    expect(screen.getByText('Strategy offer')).toBeTruthy()
  })

  it('shows a useful failure state when global search fails', async () => {
    vi.useFakeTimers()
    searchMock.mockRejectedValue(new Error('network down'))

    render(
      <StudioSearchModal
        open
        onClose={vi.fn()}
        campaigns={[]}
        onSelect={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Search everything…'), {
      target: { value: 'strategy' },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(220)
      await Promise.resolve()
    })

    expect(screen.getByText("Search couldn't connect. Try again.")).toBeTruthy()
  })
})
