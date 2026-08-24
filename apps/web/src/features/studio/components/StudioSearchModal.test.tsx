import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudioSearchModal } from './StudioSearchModal'

const mocks = vi.hoisted(() => ({
  searchMock: vi.fn(),
  idleMock: vi.fn(),
}))

vi.mock('@/features/studio/services/studio-search-api.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/studio/services/studio-search-api.service')
  >('@/features/studio/services/studio-search-api.service')
  return {
    ...actual,
    fetchStudioGlobalSearch: mocks.searchMock,
    fetchStudioSearchIdle: mocks.idleMock,
  }
})

vi.mock('@/components/ui/IconPicker', () => ({
  LucideIcon: ({ name }: { name: string }) => <span>{name}</span>,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('StudioSearchModal', () => {
  it('shows recents and presets when opened with an empty query', async () => {
    mocks.idleMock.mockResolvedValue({
      recents: [
        {
          kind: 'client',
          id: 'client-1',
          label: '1DS Collective',
          subtitle: 'Client',
          url: '/clients/client-1',
        },
      ],
      presets: [
        {
          kind: 'preset',
          id: 'clients',
          label: 'Clients',
          subtitle: 'Client workspaces',
          url: '/clients',
        },
        {
          kind: 'preset',
          id: 'create-campaign',
          label: 'New Campaign',
          subtitle: 'Build with Pixel',
          url: 'action:create-campaign',
        },
      ],
    })

    render(<StudioSearchModal open onClose={vi.fn()} campaigns={[]} onSelect={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('1DS Collective')).toBeTruthy()
    })
    expect(screen.getByText('Recent clients')).toBeTruthy()
    expect(screen.getByText('Navigate')).toBeTruthy()
    expect(screen.getByText('Clients')).toBeTruthy()
    expect(screen.getByText('Create')).toBeTruthy()
    expect(screen.getByText('New Campaign')).toBeTruthy()
    expect(mocks.searchMock).not.toHaveBeenCalled()
    expect(mocks.idleMock).toHaveBeenCalled()
  })

  it('renders server-backed tasks, docs, deliverables, conversations, campaigns, and artifacts', async () => {
    vi.useFakeTimers()
    mocks.idleMock.mockResolvedValue({ recents: [], presets: [] })
    mocks.searchMock.mockResolvedValue([
      {
        kind: 'task',
        id: 'task-1',
        label: 'Strategy task',
        subtitle: 'Task',
        url: '/spaces?space=s1&item=task-1',
      },
      {
        kind: 'doc',
        id: 'doc-1',
        label: 'Strategy doc',
        subtitle: 'Doc',
        url: '/spaces?space=s1&item=doc-1',
      },
      {
        kind: 'deliverable',
        id: 'del-1',
        label: 'Strategy output',
        subtitle: 'Deliverable',
        url: '/mission-control?mission=m1',
      },
      { kind: 'conversation', id: 'conv-1', label: 'Strategy chat', subtitle: 'ROAS', url: null },
      {
        kind: 'campaign',
        id: 'camp-1',
        label: 'Strategy campaign',
        subtitle: 'Campaign',
        url: null,
        campaignIcon: 'target',
      },
      {
        kind: 'artifact',
        id: 'offer-1',
        label: 'Strategy offer',
        subtitle: 'Offer',
        url: null,
        campaignId: 'camp-1',
        artifactKind: 'offer',
      },
    ])

    render(
      <StudioSearchModal
        open
        onClose={vi.fn()}
        campaigns={[{ id: 'camp-1', name: 'Strategy campaign', icon: 'target' }]}
        onSelect={vi.fn()}
      />,
    )

    fireEvent.change(
      screen.getByPlaceholderText('Search clients, campaigns, requests, or chats…'),
      {
        target: { value: 'strategy' },
      },
    )
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
    mocks.idleMock.mockResolvedValue({ recents: [], presets: [] })
    mocks.searchMock.mockRejectedValue(new Error('network down'))

    render(<StudioSearchModal open onClose={vi.fn()} campaigns={[]} onSelect={vi.fn()} />)

    fireEvent.change(
      screen.getByPlaceholderText('Search clients, campaigns, requests, or chats…'),
      {
        target: { value: 'strategy' },
      },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(220)
      await Promise.resolve()
    })

    expect(screen.getByText("Search couldn't connect. Try again.")).toBeTruthy()
  })
})
