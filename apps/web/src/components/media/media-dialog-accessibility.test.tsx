import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AddFromUrlModal } from './AddFromUrlModal'
import { DriveFileBrowserModal } from './DriveFileBrowserModal'
import { DriveFileBrowserModalHeader } from './DriveFileBrowserModalHeader'
import { DropboxFileBrowserModal } from './DropboxFileBrowserModal'
import { DropboxFileBrowserModalHeader } from './DropboxFileBrowserModalHeader'
import { MediaPickerModalHeader } from './MediaPickerModalHeader'

vi.mock('@/lib/api/backend-client', () => ({ backendPost: vi.fn() }))
vi.mock('@/components/media/DriveFileBrowserPanel', () => ({
  DriveFileBrowserPanel: () => <div>Drive files</div>,
}))
vi.mock('@/components/media/DropboxFileBrowserPanel', () => ({
  DropboxFileBrowserPanel: () => <div>Dropbox files</div>,
}))

afterEach(cleanup)

describe('media dialog accessibility', () => {
  it('names each icon-only close control', () => {
    const { rerender } = render(<DriveFileBrowserModalHeader onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Close Google Drive' })).toBeTruthy()

    rerender(<DropboxFileBrowserModalHeader onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Close Dropbox' })).toBeTruthy()

    rerender(
      <MediaPickerModalHeader
        adAccountId={null}
        mediaSource="library"
        onClose={vi.fn()}
        setMediaSource={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Close media library' })).toBeTruthy()
  })

  it('connects the URL import instructions and field label to the dialog', () => {
    render(<AddFromUrlModal open onClose={vi.fn()} onUploaded={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Add from URL' })
    const description = screen.getByText('Import an image from a public web address.')
    expect(dialog.getAttribute('aria-describedby')).toBe(description.id)
    expect(screen.getByRole('button', { name: 'Close URL import' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Image URL' })).toBeTruthy()
  })

  it('describes the cloud file browsers', () => {
    const { rerender } = render(<DriveFileBrowserModal open onClose={vi.fn()} />)
    const driveDialog = screen.getByRole('dialog', { name: 'Google Drive' })
    expect(driveDialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Browse and choose files from Google Drive.').id,
    )

    rerender(<DropboxFileBrowserModal open onClose={vi.fn()} />)
    const dropboxDialog = screen.getByRole('dialog', { name: 'Dropbox' })
    expect(dropboxDialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Browse and choose files from Dropbox.').id,
    )
  })
})
