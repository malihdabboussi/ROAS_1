import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchFunnelWithPagesCached } from './funnel-preview-api'
import { useFunnelPagePreview } from './use-funnel-page-preview'

vi.mock('./funnel-preview-api', () => ({
  fetchFunnelWithPagesCached: vi.fn(),
}))

const fetchFunnelWithPagesCachedMock = vi.mocked(fetchFunnelWithPagesCached)

function FunnelPreviewProbe({
  artifactId,
  funnelPageId,
}: {
  artifactId: string
  funnelPageId?: string
}) {
  const page = useFunnelPagePreview(artifactId, funnelPageId)

  return (
    <div>
      <span data-testid="code">{page?.code ?? 'none'}</span>
      <span data-testid="css">{page?.css ?? 'none'}</span>
      <span data-testid="mode">{page?.sourceMode ?? 'none'}</span>
    </div>
  )
}

describe('useFunnelPagePreview', () => {
  beforeEach(() => {
    fetchFunnelWithPagesCachedMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('uses the first generated page by order when no funnel page is requested', async () => {
    fetchFunnelWithPagesCachedMock.mockResolvedValue({
      pages: [
        {
          id: 'page-2',
          generated_html: '<main>Second</main>',
          generated_css: null,
          order_index: 2,
        },
        {
          id: 'page-1',
          generated_html: '<main>First</main>',
          generated_css: '.first{}',
          order_index: 1,
        },
      ],
    } as never)

    render(<FunnelPreviewProbe artifactId="funnel-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('code').textContent).toBe('<main>First</main>')
    })
    expect(screen.getByTestId('css').textContent).toBe('.first{}')
    expect(screen.getByTestId('mode').textContent).toBe('tsx')
    expect(fetchFunnelWithPagesCachedMock).toHaveBeenCalledWith('funnel-1')
  })

  it('marks HTML documents so cards do not compile them as TSX', async () => {
    fetchFunnelWithPagesCachedMock.mockResolvedValue({
      pages: [
        {
          id: 'page-1',
          generated_html: '<!DOCTYPE html><html><body>Hi</body></html>',
          generated_css: null,
          source_mode: 'html_bundle',
          order_index: 1,
        },
      ],
    } as never)

    render(<FunnelPreviewProbe artifactId="funnel-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('mode').textContent).toBe('html_bundle')
    })
  })

  it('uses the requested funnel page when one is provided', async () => {
    fetchFunnelWithPagesCachedMock.mockResolvedValue({
      pages: [
        {
          id: 'page-1',
          generated_html: '<main>First</main>',
          generated_css: '.first{}',
          order_index: 1,
        },
        {
          id: 'page-2',
          generated_html: '<main>Second</main>',
          generated_css: null,
          order_index: 2,
        },
      ],
    } as never)

    render(<FunnelPreviewProbe artifactId="funnel-1" funnelPageId="page-2" />)

    await waitFor(() => {
      expect(screen.getByTestId('code').textContent).toBe('<main>Second</main>')
    })
    expect(screen.getByTestId('css').textContent).toBe('none')
    expect(fetchFunnelWithPagesCachedMock).toHaveBeenCalledWith('funnel-1')
  })
})
