import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FunnelToolbar } from './FunnelToolbar'

const backendPostMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api/backend-client', () => ({
  backendPost: backendPostMock,
}))

vi.mock('./ConnectCustomDomainModal', () => ({
  ConnectCustomDomainModal: () => null,
}))

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe('FunnelToolbar publishing', () => {
  beforeEach(() => {
    backendPostMock.mockReset()
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  })

  it('publishes a draft with one click', async () => {
    backendPostMock.mockResolvedValueOnce({
      status: 'published',
      slug: 'launch',
      url: 'https://launch.example.com',
    })
    const onStatusChange = vi.fn()

    render(
      <FunnelToolbar
        funnelId="funnel-1"
        funnelName="Launch"
        status="draft"
        slug="launch"
        onStatusChange={onStatusChange}
        viewport="desktop"
        onViewportChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))

    await waitFor(() =>
      expect(backendPostMock).toHaveBeenCalledWith('/api/funnels/funnel-1/publish', {}),
    )
    expect(onStatusChange).toHaveBeenCalledWith('published', 'launch', 'https://launch.example.com')
  })

  it('offers an explicit update action for a published funnel', async () => {
    backendPostMock.mockResolvedValueOnce({
      status: 'published',
      slug: 'launch',
      url: 'https://launch.example.com',
    })

    render(
      <FunnelToolbar
        funnelId="funnel-1"
        funnelName="Launch"
        status="published"
        slug="launch"
        publishedUrl="https://launch.example.com"
        onStatusChange={vi.fn()}
        viewport="desktop"
        onViewportChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Published' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publish updates' }))

    await waitFor(() =>
      expect(backendPostMock).toHaveBeenCalledWith('/api/funnels/funnel-1/publish', {}),
    )
  })
})
