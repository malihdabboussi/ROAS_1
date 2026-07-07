import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PresentationCardHeroPreview } from './PresentationCardHeroPreview'

const mocks = vi.hoisted(() => ({
  preview: { payload: null as PreviewPayload | null, loading: false },
  usePresentationCardPreview: vi.fn(),
}))

type PreviewPayload =
  | { mode: 'tsx'; code: string; css: string }
  | { mode: 'html'; srcDoc: string }
  | { mode: 'iframe'; url: string }

vi.mock('@/lib/presentations/use-presentation-card-preview', () => ({
  usePresentationCardPreview: (presentationId: string) => {
    mocks.usePresentationCardPreview(presentationId)
    return mocks.preview
  },
}))

vi.mock('@/components/artifacts/TsxMiniIframe', () => ({
  TsxMiniIframe: ({ code, css, title }: { code: string; css?: string; title: string }) => (
    <div data-testid="tsx-mini-iframe" data-css={css} title={title}>
      {code}
    </div>
  ),
}))

vi.mock('@/components/presentations/PresentationSlideMiniPreview', () => ({
  PresentationSlideMiniPreview: ({ srcDoc, title }: { srcDoc: string; title: string }) => (
    <div data-testid="presentation-slide-mini-preview" title={title}>
      {srcDoc}
    </div>
  ),
}))

describe('PresentationCardHeroPreview', () => {
  beforeEach(() => {
    mocks.preview = { payload: null, loading: false }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the loading hero while the preview payload is pending', () => {
    mocks.preview = { payload: null, loading: true }

    const { container } = render(<PresentationCardHeroPreview presentationId="presentation-1" />)

    expect(mocks.usePresentationCardPreview).toHaveBeenCalledWith('presentation-1')
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
    expect(screen.queryByTestId('tsx-mini-iframe')).toBeNull()
    expect(screen.queryByTestId('presentation-slide-mini-preview')).toBeNull()
  })

  it('renders the TSX mini iframe payload', () => {
    mocks.preview = {
      payload: { mode: 'tsx', code: '<Presentation />', css: '.slide{}' },
      loading: false,
    }

    render(<PresentationCardHeroPreview presentationId="presentation-1" />)

    expect(screen.getByTestId('tsx-mini-iframe').textContent).toBe('<Presentation />')
    expect(screen.getByTestId('tsx-mini-iframe').getAttribute('data-css')).toBe('.slide{}')
  })

  it('renders the HTML slide preview payload', () => {
    mocks.preview = {
      payload: { mode: 'html', srcDoc: '<html><body>Slide</body></html>' },
      loading: false,
    }

    render(<PresentationCardHeroPreview presentationId="presentation-1" />)

    expect(screen.getByTestId('presentation-slide-mini-preview').textContent).toContain('Slide')
  })

  it('renders the iframe payload', () => {
    mocks.preview = {
      payload: { mode: 'iframe', url: 'https://example.test/presentation' },
      loading: false,
    }

    render(<PresentationCardHeroPreview presentationId="presentation-1" />)

    const iframe = screen.getByTitle('Presentation hero preview') as HTMLIFrameElement
    expect(iframe.src).toBe('https://example.test/presentation')
  })

  it('renders the empty hero when loading is complete without a payload', () => {
    const { container } = render(<PresentationCardHeroPreview presentationId="presentation-1" />)

    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('.animate-pulse')).toBeNull()
    expect(screen.queryByTestId('tsx-mini-iframe')).toBeNull()
    expect(screen.queryByTestId('presentation-slide-mini-preview')).toBeNull()
  })
})
