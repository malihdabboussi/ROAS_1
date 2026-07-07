import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StartBrainstormModal } from './StartBrainstormModal'

const mocks = vi.hoisted(() => ({
  listRoster: vi.fn(),
  onOpenChange: vi.fn(),
  onStart: vi.fn(),
}))

vi.mock('@/lib/org', () => ({
  orgService: {
    listRoster: mocks.listRoster,
  },
}))

const agents = [
  {
    kind: 'agent',
    id: 'agent-atlas',
    agent_key: 'atlas',
    display_name: 'Atlas',
    avatar_url: null,
  },
  {
    kind: 'agent',
    id: 'agent-nova',
    agent_key: 'nova',
    display_name: 'Nova',
    avatar_url: null,
  },
]

describe('StartBrainstormModal', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads agents, selects a turn order, and starts with selected keys', async () => {
    mocks.listRoster.mockResolvedValue(agents)

    render(<StartBrainstormModal open onOpenChange={mocks.onOpenChange} onStart={mocks.onStart} />)

    await waitFor(() => {
      expect(mocks.listRoster).toHaveBeenCalledWith({ kind: 'agent' })
    })

    fireEvent.change(screen.getByPlaceholderText(/search agents/i), { target: { value: 'a' } })
    fireEvent.mouseDown(await screen.findByRole('button', { name: /atlas/i }))

    fireEvent.change(screen.getByPlaceholderText(/search agents/i), { target: { value: 'n' } })
    fireEvent.mouseDown(await screen.findByRole('button', { name: /nova/i }))

    fireEvent.click(screen.getByRole('button', { name: /start brainstorm/i }))
    expect(mocks.onStart).toHaveBeenCalledWith(['atlas', 'nova'])
  })

  it('resets selection on close and delegates cancel', () => {
    mocks.listRoster.mockResolvedValue(agents)

    const { rerender } = render(
      <StartBrainstormModal open onOpenChange={mocks.onOpenChange} onStart={mocks.onStart} />,
    )

    rerender(
      <StartBrainstormModal open={false} onOpenChange={mocks.onOpenChange} onStart={mocks.onStart} />,
    )
    rerender(<StartBrainstormModal open onOpenChange={mocks.onOpenChange} onStart={mocks.onStart} />)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mocks.onOpenChange).toHaveBeenCalledWith(false)
  })
})
