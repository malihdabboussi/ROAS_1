import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageGraderPortalSurface } from './PageGraderPortalSurface'

const mocks = vi.hoisted(() => ({
  backendPost: vi.fn().mockResolvedValue({
    success: true,
    code: 'embed-code',
    embed_url: 'https://portal.example.com/embed',
    expires_at: '2026-07-30T20:00:00.000Z',
  }),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendPost: mocks.backendPost,
}))

describe('PageGraderPortalSurface', () => {
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
})
