import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DropboxFile } from '@/lib/services/dropbox-api'
import { DropboxFileBrowserGalleryView } from './DropboxFileBrowserGalleryView'

const file: DropboxFile = {
  id: 'file-1',
  name: 'Launch brief.pdf',
  path_lower: '/launch brief.pdf',
  path_display: '/Launch brief.pdf',
  '.tag': 'file',
  size: 2048,
  server_modified: '2026-06-01T12:00:00Z',
}

describe('DropboxFileBrowserGalleryView', () => {
  afterEach(cleanup)

  it('makes selectable files operable from the keyboard', () => {
    const toggleFileSelection = vi.fn()
    const { rerender } = render(
      <DropboxFileBrowserGalleryView
        files={[file]}
        selectionEnabled
        importedFileIds={new Set()}
        selectedFileIds={new Set()}
        toggleFileSelection={toggleFileSelection}
        navigateToFolder={vi.fn()}
        renderRowActions={() => null}
      />,
    )

    const fileOption = screen.getByRole('button', { name: 'Select Launch brief.pdf' })
    expect(fileOption.getAttribute('aria-pressed')).toBe('false')
    fireEvent.keyDown(fileOption, { key: 'Enter' })
    fireEvent.keyDown(fileOption, { key: ' ' })
    expect(toggleFileSelection).toHaveBeenCalledTimes(2)

    rerender(
      <DropboxFileBrowserGalleryView
        files={[file]}
        selectionEnabled
        importedFileIds={new Set()}
        selectedFileIds={new Set([file.id])}
        toggleFileSelection={toggleFileSelection}
        navigateToFolder={vi.fn()}
        renderRowActions={() => null}
      />,
    )
    expect(screen.getByRole('button', { name: 'Deselect Launch brief.pdf' })).toBeTruthy()
  })
})
