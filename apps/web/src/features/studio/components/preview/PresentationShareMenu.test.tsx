import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PresentationShareMenu } from './PresentationShareMenu'

const backendMocks = vi.hoisted(() => ({ backendPost: vi.fn() }))

vi.mock('@/lib/api/backend-client', () => backendMocks)
vi.mock('./ConnectCustomDomainModal', () => ({ ConnectCustomDomainModal: () => null }))

describe('PresentationShareMenu', () => {
  beforeEach(() => {
    backendMocks.backendPost.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('opens a presentation in an isolated tab and labels the published URL', async () => {
    backendMocks.backendPost.mockResolvedValue({
      status: 'published',
      slug: 'launch-deck',
      published_url: 'https://present.example.com/launch-deck',
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(
      <PresentationShareMenu
        presentationId="presentation-1"
        status="published"
        publishedUrl="https://present.example.com/launch-deck"
        open
        copied={false}
        onOpenChange={vi.fn()}
        onStatusChange={vi.fn()}
        onCopy={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByLabelText('Published presentation URL')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Present (open in new tab)' }))

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        'https://present.example.com/launch-deck',
        '_blank',
        'noopener,noreferrer',
      )
    })
  })
})
