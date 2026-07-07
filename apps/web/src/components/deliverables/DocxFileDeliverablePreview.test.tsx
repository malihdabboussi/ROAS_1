import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DocxFileDeliverablePreview } from './DocxFileDeliverablePreview'

vi.mock('@/components/vibey/vibey-chat-orb', () => ({
  VibeyChatOrb: () => <div data-testid="loading-orb" />,
}))

describe('DocxFileDeliverablePreview', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('loads the DOCX preview html and settles without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ html: '<p>Preview body</p>' }),
    })

    let renderCount = 0
    function Harness() {
      renderCount += 1
      return <DocxFileDeliverablePreview fileUrl="https://cdn.example.com/doc.docx" />
    }

    render(<Harness />)

    expect(screen.getByTestId('loading-orb')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Preview body')).toBeTruthy())

    expect(fetchMock).toHaveBeenCalledWith('/api/preview-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl: 'https://cdn.example.com/doc.docx' }),
    })
    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(renderCount).toBeLessThan(20)
    consoleErrorSpy.mockRestore()
  })

  it('shows the download fallback when preview generation fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'preview failed' }),
    })

    render(<DocxFileDeliverablePreview fileUrl="https://cdn.example.com/doc.docx" />)

    await waitFor(() =>
      expect(screen.getByText('Preview unavailable for this document. You can download it instead.')).toBeTruthy(),
    )

    expect(screen.getByRole('link', { name: 'Download' }).getAttribute('href')).toBe(
      'https://cdn.example.com/doc.docx',
    )
  })
})
