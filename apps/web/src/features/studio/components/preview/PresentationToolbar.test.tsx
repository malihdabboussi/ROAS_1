import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PresentationToolbar } from './PresentationToolbar'

const backendMocks = vi.hoisted(() => ({
  backendPost: vi.fn(),
}))

const serviceMocks = vi.hoisted(() => ({
  fetchPresentation: vi.fn(),
  fetchPresentationBundle: vi.fn(),
}))

const exportMocks = vi.hoisted(() => ({
  buildStandalonePresentationHtml: vi.fn(),
  downloadHTML: vi.fn(),
  downloadPresentationPDFFromIframe: vi.fn(),
  downloadPresentationPDFFromSlides: vi.fn(),
  downloadPresentationPPTFromIframe: vi.fn(),
  downloadPresentationPPTFromSlides: vi.fn(),
}))

const childRenderCounts = vi.hoisted(() => ({
  menu: 0,
}))

vi.mock('@/lib/api/backend-client', () => backendMocks)
vi.mock('../../services/artifact-preview.service', () => serviceMocks)
vi.mock('../../utils/artifact-export', () => exportMocks)

vi.mock('./StudioPresentationMenuDropdown', () => ({
  StudioPresentationMenuDropdown: () => {
    childRenderCounts.menu += 1
    return <div data-testid="presentation-menu" />
  },
}))

vi.mock('./ConnectCustomDomainModal', () => ({
  ConnectCustomDomainModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="connect-domain-modal" /> : null,
}))

describe('PresentationToolbar', () => {
  beforeEach(() => {
    backendMocks.backendPost.mockReset()
    serviceMocks.fetchPresentation.mockReset()
    serviceMocks.fetchPresentationBundle.mockReset()
    exportMocks.buildStandalonePresentationHtml.mockReset()
    exportMocks.downloadHTML.mockReset()
    exportMocks.downloadPresentationPDFFromIframe.mockReset()
    exportMocks.downloadPresentationPDFFromSlides.mockReset()
    exportMocks.downloadPresentationPPTFromIframe.mockReset()
    exportMocks.downloadPresentationPPTFromSlides.mockReset()
    childRenderCounts.menu = 0

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('handles viewport, download, publish, menu, and render stability', async () => {
    let renderCount = 0
    const onStatusChange = vi.fn()
    const onViewportChange = vi.fn()

    backendMocks.backendPost.mockResolvedValue({
      status: 'published',
      slug: 'deck',
      published_url: 'https://deck.example.com',
    })
    serviceMocks.fetchPresentation.mockResolvedValue({
      id: 'presentation-1',
      name: 'Launch Deck',
      slides: [{ title: 'Intro', body: 'Welcome' }],
      metadata: {},
    })
    serviceMocks.fetchPresentationBundle.mockResolvedValue({
      source_mode: 'html_bundle',
      has_entry: true,
    })
    exportMocks.buildStandalonePresentationHtml.mockResolvedValue('<html>deck</html>')

    function Harness() {
      renderCount += 1
      return (
        <PresentationToolbar
          presentationId="presentation-1"
          name="Launch Deck"
          status="generated"
          fileUrl="https://files.example.com/deck.pdf"
          generatedHtml="<html>legacy</html>"
          publishedUrl={null}
          onStatusChange={onStatusChange}
          viewport="desktop"
          onViewportChange={onViewportChange}
          campaignId="campaign-1"
        />
      )
    }

    render(<Harness />)

    expect(screen.getByText('Launch Deck')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Preview size: Desktop'))
    fireEvent.click(await screen.findByText('Mobile'))
    expect(onViewportChange).toHaveBeenCalledWith('mobile')

    fireEvent.click(screen.getByLabelText('Download'))
    fireEvent.click(await screen.findByText('Download HTML'))
    await waitFor(() => {
      expect(serviceMocks.fetchPresentationBundle).toHaveBeenCalledWith('presentation-1')
      expect(exportMocks.buildStandalonePresentationHtml).toHaveBeenCalled()
      expect(exportMocks.downloadHTML).toHaveBeenCalledWith('<html>deck</html>', 'Launch Deck')
    })

    fireEvent.click(screen.getByLabelText('Download'))
    fireEvent.click(await screen.findByText('Export as PDF'))
    await waitFor(() => {
      expect(serviceMocks.fetchPresentation).toHaveBeenCalledWith('presentation-1')
      expect(exportMocks.downloadPresentationPDFFromSlides).toHaveBeenCalledWith(
        [{ title: 'Intro', body: 'Welcome' }],
        'Launch Deck',
      )
    })

    fireEvent.click(screen.getByText('Share'))
    fireEvent.click(await screen.findByText('Publish'))
    await waitFor(() => {
      expect(backendMocks.backendPost).toHaveBeenCalledWith(
        '/api/presentations/presentation-1/publish',
        {},
      )
      expect(onStatusChange).toHaveBeenCalledWith('published', 'https://deck.example.com')
    })

    fireEvent.click(screen.getByLabelText('Presentation options'))
    expect(screen.getByTestId('presentation-menu')).toBeTruthy()
    expect(childRenderCounts.menu).toBe(1)
    expect(renderCount).toBeLessThan(30)
  })

  it('makes the full editor the primary action in compact preview mode', () => {
    const onOpenFullView = vi.fn()

    render(
      <PresentationToolbar
        presentationId="presentation-1"
        name="Launch Deck"
        status="draft"
        fileUrl={null}
        generatedHtml={null}
        publishedUrl={null}
        onStatusChange={vi.fn()}
        viewport="desktop"
        onViewportChange={vi.fn()}
        onOpenFullView={onOpenFullView}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit presentation' }))
    expect(onOpenFullView).toHaveBeenCalledTimes(1)
  })
})
