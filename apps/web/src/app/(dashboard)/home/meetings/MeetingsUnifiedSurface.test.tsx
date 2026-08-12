import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingsUnifiedSurface } from './MeetingsUnifiedSurface'

const mocks = vi.hoisted(() => {
  const state = {
    spaces: [] as Array<Record<string, unknown>>,
    loadSpaces: vi.fn<() => Promise<void>>(),
    loadRoster: vi.fn<() => Promise<void>>(),
    setActiveSpace: vi.fn(),
    setActiveView: vi.fn(),
  }
  return { state, spaceItemsContainer: vi.fn() }
})

vi.mock('@/features/spaces', () => {
  const useSpacesStore = Object.assign(
    (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
    { getState: () => mocks.state },
  )
  return {
    useSpacesStore,
    SpaceItemsContainer: (props: { embed?: { overrideView?: { content?: React.ReactNode } } }) => {
      mocks.spaceItemsContainer(props)
      return <div data-testid="space-views">{props.embed?.overrideView?.content}</div>
    },
  }
})

describe('MeetingsUnifiedSurface', () => {
  afterEach(() => {
    cleanup()
    mocks.state.spaces = []
    mocks.state.loadSpaces.mockReset()
    mocks.state.loadRoster.mockReset()
    mocks.state.setActiveSpace.mockReset()
    mocks.state.setActiveView.mockReset()
    mocks.spaceItemsContainer.mockReset()
  })

  it('opens the canonical Meetings Space with Agenda first and selected', async () => {
    mocks.state.loadSpaces.mockImplementation(async () => {
      mocks.state.spaces = [
        {
          id: 'other-space',
          title: 'Other',
          schema: { fields: [] },
        },
        {
          id: 'meetings-space',
          title: 'Meetings',
          schema: { icon: 'video', fields: [{ id: 'entry_type' }] },
        },
      ]
    })
    mocks.state.loadRoster.mockResolvedValue()

    render(<MeetingsUnifiedSurface agenda={<div>Live calendar agenda</div>} />)

    await waitFor(() => expect(screen.getByTestId('space-views')).toBeInTheDocument())
    expect(mocks.state.setActiveSpace).toHaveBeenCalledWith('meetings-space')
    expect(mocks.state.setActiveView).toHaveBeenCalledWith('agenda')
    expect(mocks.spaceItemsContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        embed: expect.objectContaining({
          hideBreadcrumbHeader: true,
          leadingViewId: 'agenda',
          overrideView: expect.objectContaining({ id: 'agenda' }),
        }),
      }),
    )
    expect(screen.getByText('Live calendar agenda')).toBeInTheDocument()
  })

  it('keeps the live Agenda available when a Meetings Space has not been created', async () => {
    mocks.state.loadSpaces.mockResolvedValue()
    mocks.state.loadRoster.mockResolvedValue()

    render(<MeetingsUnifiedSurface agenda={<div>Live calendar agenda</div>} />)

    await waitFor(() => expect(screen.getByText('Live calendar agenda')).toBeInTheDocument())
    expect(screen.queryByTestId('space-views')).not.toBeInTheDocument()
  })
})
