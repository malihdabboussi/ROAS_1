import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DocEditorHeaderActions } from './DocEditorHeaderActions'

const headerMocks = vi.hoisted(() => ({
  createGoogleDocFromHtml: vi.fn(),
  getGoogleDriveStatus: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/lib/services/google-drive-api', () => ({
  createGoogleDocFromHtml: headerMocks.createGoogleDocFromHtml,
  getGoogleDriveStatus: headerMocks.getGoogleDriveStatus,
}))

vi.mock('sonner', () => ({
  toast: { error: headerMocks.toastError, success: headerMocks.toastSuccess },
}))

describe('DocEditorHeaderActions', () => {
  beforeEach(() => {
    headerMocks.createGoogleDocFromHtml.mockReset()
    headerMocks.getGoogleDriveStatus.mockReset()
    headerMocks.getGoogleDriveStatus.mockResolvedValue({ connected: true })
    headerMocks.toastError.mockReset()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(cleanup)

  it('shows Google Docs and Copy as persistent header actions', async () => {
    render(
      <DocEditorHeaderActions
        title="Launch plan"
        getDocBody={() => '<h1>Launch plan</h1><p>Ship it.</p>'}
        customData={{}}
      />,
    )

    const googleButton = await screen.findByRole('button', { name: 'Export to Google Docs' })
    expect(googleButton.querySelector('img')?.getAttribute('src')).toBe(
      '/Integrations/GoogleDocs.png',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy document' }))
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Launch plan Ship it.'),
    )
    expect(screen.getByRole('button', { name: 'Copy document' }).textContent).toContain('Copied')

    fireEvent.click(screen.getByRole('button', { name: 'Export document' }))
    expect(screen.queryByRole('button', { name: 'Open in Google Docs' })).toBeNull()
    expect(screen.getByRole('button', { name: 'PDF' })).toBeTruthy()
  })

  it('explains a missing Drive connection without opening a disposable tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    headerMocks.getGoogleDriveStatus.mockResolvedValue({ connected: false })
    render(
      <DocEditorHeaderActions
        title="Launch plan"
        getDocBody={() => '<h1>Launch plan</h1><p>Ship it.</p>'}
        customData={{}}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Export to Google Docs' }))

    await waitFor(() =>
      expect(headerMocks.toastError).toHaveBeenCalledWith(
        'Google Drive is not connected. Connect it in Settings → Integrations, then try again.',
      ),
    )
    expect(openSpy).not.toHaveBeenCalled()
    expect(headerMocks.createGoogleDocFromHtml).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })
})
