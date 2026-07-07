import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EntityFullPreview, FunnelFullPreview } from './DeliverablePreviewEntityFull'

const previewMocks = vi.hoisted(() => ({
  fetchFunnelWithPages: vi.fn(),
  sandpackRenderCount: 0,
}))

vi.mock('@/lib/artifacts', () => ({
  fetchFunnelWithPages: previewMocks.fetchFunnelWithPages,
}))

vi.mock('@/components/deliverables/StandaloneEmailDeliverablePreview', () => ({
  StandaloneEmailDeliverablePreview: ({ emailId }: { emailId: string }) => (
    <div data-testid="email-preview">{emailId}</div>
  ),
}))

vi.mock('@/features/studio/components/preview/AdPreview', () => ({
  AdPreview: ({ adId }: { adId: string }) => <div data-testid="ad-preview">{adId}</div>,
}))

vi.mock('@/features/studio/components/preview/AvatarPreview', () => ({
  AvatarPreview: ({ avatarId }: { avatarId: string }) => (
    <div data-testid="avatar-preview">{avatarId}</div>
  ),
}))

vi.mock('@/features/studio/components/preview/BlogPostPreview', () => ({
  BlogPostPreview: ({ blogPostId }: { blogPostId: string }) => (
    <div data-testid="blog-post-preview">{blogPostId}</div>
  ),
}))

vi.mock('@/features/studio/components/preview/OfferPreview', () => ({
  OfferPreview: ({ offerId }: { offerId: string }) => (
    <div data-testid="offer-preview">{offerId}</div>
  ),
}))

vi.mock('@/features/studio/components/preview/PresentationPreview', () => ({
  PresentationPreview: ({ presentationId }: { presentationId: string }) => (
    <div data-testid="presentation-preview">{presentationId}</div>
  ),
}))

vi.mock('@/features/studio/components/preview/SandpackPreview', () => ({
  SandpackPreview: ({
    code,
    css,
    fileName,
    hideDownload,
  }: {
    code: string
    css?: string
    fileName?: string
    hideDownload?: boolean
  }) => {
    previewMocks.sandpackRenderCount += 1
    return (
      <div
        data-testid="sandpack-preview"
        data-code={code}
        data-css={css ?? ''}
        data-file-name={fileName ?? ''}
        data-hide-download={hideDownload ? 'true' : 'false'}
      />
    )
  },
}))

vi.mock('@/features/studio/components/preview/SequencePreview', () => ({
  SequencePreview: ({ sequenceId }: { sequenceId: string }) => (
    <div data-testid="sequence-preview">{sequenceId}</div>
  ),
}))

vi.mock('@/features/studio/components/preview/SocialPostPreview', () => ({
  default: ({ socialPostId }: { socialPostId: string }) => (
    <div data-testid="social-post-preview">{socialPostId}</div>
  ),
}))

function renderFunnelPreview() {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    return <FunnelFullPreview funnelId="funnel-1" />
  }

  render(<Harness />)
  return { getRenderCount: () => renderCount }
}

describe('DeliverablePreviewEntityFull', () => {
  beforeEach(() => {
    previewMocks.fetchFunnelWithPages.mockReset()
    previewMocks.sandpackRenderCount = 0
  })

  afterEach(() => {
    cleanup()
  })

  it('loads the first ordered funnel page into Sandpack and settles without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    previewMocks.fetchFunnelWithPages.mockResolvedValue({
      id: 'funnel-1',
      pages: [
        {
          id: 'page-2',
          name: 'Second',
          generated_html: '<h1>Second</h1>',
          generated_css: null,
          order_index: 2,
        },
        {
          id: 'page-1',
          name: 'Landing',
          generated_html: '<h1>First</h1>',
          generated_css: 'body { color: black; }',
          order_index: 1,
        },
      ],
    })

    const { getRenderCount } = renderFunnelPreview()

    await waitFor(() => expect(screen.getByTestId('sandpack-preview')).toBeTruthy())

    const preview = screen.getByTestId('sandpack-preview')
    expect(previewMocks.fetchFunnelWithPages).toHaveBeenCalledWith('funnel-1')
    expect(preview.dataset.code).toBe('<h1>First</h1>')
    expect(preview.dataset.css).toBe('body { color: black; }')
    expect(preview.dataset.fileName).toBe('Landing')
    expect(preview.dataset.hideDownload).toBe('true')

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(20)
    expect(previewMocks.sandpackRenderCount).toBeLessThan(10)
    consoleErrorSpy.mockRestore()
  })

  it('routes entity types to the existing preview components', () => {
    const { rerender } = render(<EntityFullPreview deliverableType="ad" entityId="ad-1" />)
    expect(screen.getByTestId('ad-preview').textContent).toBe('ad-1')

    rerender(<EntityFullPreview deliverableType="email" entityId="email-1" />)
    expect(screen.getByTestId('email-preview').textContent).toBe('email-1')

    rerender(<EntityFullPreview deliverableType="unknown" entityId="entity-1" />)
    expect(screen.getByText('Preview not available for this type')).toBeTruthy()
  })
})
