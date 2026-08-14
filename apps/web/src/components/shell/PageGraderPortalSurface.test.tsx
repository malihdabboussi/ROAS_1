import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageGraderPortalSurface } from './PageGraderPortalSurface'

const mocks = vi.hoisted(() => ({
  pathname: '/clients',
  params: new URLSearchParams(),
  spaces: [] as Array<{ id: string; schema?: { custom_data?: Record<string, unknown> } }>,
  activeSpaceId: null as string | null,
  backendPost: vi.fn().mockResolvedValue({
    success: true,
    code: 'embed-code',
    embed_url: 'https://portal.example.com/embed',
    expires_at: '2026-07-30T20:00:00.000Z',
  }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => mocks.params,
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (
    selector: (state: { spaces: typeof mocks.spaces; activeSpaceId: string | null }) => unknown,
  ) => selector({ spaces: mocks.spaces, activeSpaceId: mocks.activeSpaceId }),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendPost: mocks.backendPost,
}))

describe('PageGraderPortalSurface', () => {
  beforeEach(() => {
    mocks.pathname = '/clients'
    mocks.params = new URLSearchParams()
    mocks.spaces = []
    mocks.activeSpaceId = null
    mocks.backendPost.mockResolvedValue({
      success: true,
      code: 'embed-code',
      embed_url: 'https://portal.example.com/embed',
      expires_at: '2026-07-30T20:00:00.000Z',
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('anchors the Portal controls in the bottom-right corner', async () => {
    render(<PageGraderPortalSurface active />)

    const refreshButton = await screen.findByRole('button', { name: 'Refresh Portal' })
    const controls = refreshButton.parentElement

    await waitFor(() => expect(mocks.backendPost).toHaveBeenCalledTimes(1))
    expect(controls?.parentElement).toHaveClass(
      'absolute',
      'inset-0',
      'items-end',
      'justify-end',
      'p-spacing-3',
    )
    expect(controls).not.toHaveClass('top-3', 'right-3')
  })

  it('opens Portal on the selected Page Grader client', async () => {
    mocks.pathname = '/clients/11111111-1111-1111-1111-111111111111'
    render(<PageGraderPortalSurface active />)

    await waitFor(() =>
      expect(mocks.backendPost).toHaveBeenCalledWith(
        '/api/integrations/page-grader/embed-session',
        expect.objectContaining({
          target_path: '/clients/11111111-1111-1111-1111-111111111111',
        }),
      ),
    )
  })

  it('opens Portal on the selected Page Grader campaign', async () => {
    mocks.pathname = '/client-campaigns'
    mocks.params = new URLSearchParams(
      'surface=portal&portal_path=/campaigns/22222222-2222-2222-2222-222222222222',
    )
    render(<PageGraderPortalSurface active />)

    await waitFor(() =>
      expect(mocks.backendPost).toHaveBeenCalledWith(
        '/api/integrations/page-grader/embed-session',
        expect.objectContaining({
          target_path: '/campaigns/22222222-2222-2222-2222-222222222222',
        }),
      ),
    )
  })
})
