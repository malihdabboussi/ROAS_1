import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DropboxFileBrowserModal } from './DropboxFileBrowserModal'
import type { DropboxFile } from '@/lib/services/dropbox-api'

const mocks = vi.hoisted(() => ({
  backendFetch: vi.fn(),
  backendUpload: vi.fn(),
  deleteDropboxFile: vi.fn(),
  listDropboxFiles: vi.fn(),
  searchDropboxFiles: vi.fn(),
  shareDropboxFile: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div>{text}</div>,
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendFetch: mocks.backendFetch,
  backendUpload: mocks.backendUpload,
}))

vi.mock('@/lib/services/dropbox-api', () => ({
  deleteDropboxFile: mocks.deleteDropboxFile,
  listDropboxFiles: mocks.listDropboxFiles,
  searchDropboxFiles: mocks.searchDropboxFiles,
  shareDropboxFile: mocks.shareDropboxFile,
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

const folderFile: DropboxFile = {
  id: 'folder-projects',
  name: 'Projects',
  path_lower: '/projects',
  path_display: '/Projects',
  '.tag': 'folder',
}

const documentFile: DropboxFile = {
  id: 'doc-brief',
  name: 'Brief.pdf',
  path_lower: '/brief.pdf',
  path_display: '/Brief.pdf',
  '.tag': 'file',
  size: 2048,
  server_modified: '2026-06-01T12:00:00Z',
}

const imageFile: DropboxFile = {
  id: 'img-logo',
  name: 'Logo.png',
  path_lower: '/logo.png',
  path_display: '/Logo.png',
  '.tag': 'file',
  size: 1024,
  server_modified: '2026-06-02T12:00:00Z',
}

function renderDropboxModal(props: Partial<React.ComponentProps<typeof DropboxFileBrowserModal>> = {}) {
  const onClose = vi.fn()
  const onSelectFileForChat = vi.fn()
  let commitCount = 0

  render(
    <Profiler id="dropbox-file-browser" onRender={() => commitCount++}>
      <DropboxFileBrowserModal
        open
        embedded
        onClose={props.onClose ?? onClose}
        onSelectFileForChat={props.onSelectFileForChat ?? onSelectFileForChat}
        {...props}
      />
    </Profiler>,
  )

  return { onClose, onSelectFileForChat, getCommitCount: () => commitCount }
}

describe('DropboxFileBrowserModal', () => {
  beforeEach(() => {
    mocks.listDropboxFiles.mockResolvedValue({
      entries: [documentFile, folderFile, imageFile],
      cursor: 'cursor-1',
      has_more: false,
      success: true,
    })
    mocks.searchDropboxFiles.mockResolvedValue({
      matches: [imageFile],
      success: true,
    })
    mocks.backendFetch.mockResolvedValue(new Response(new Blob(['file-body'], { type: 'application/pdf' })))
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads Dropbox files, navigates folders, and searches inside the current path', async () => {
    const { getCommitCount } = renderDropboxModal()

    await waitFor(() =>
      expect(mocks.listDropboxFiles).toHaveBeenCalledWith({ path: '', cursor: undefined, limit: 50 }),
    )
    expect(screen.queryByText('Projects')).not.toBeNull()
    expect(screen.queryByText('Brief.pdf')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }))

    await waitFor(() =>
      expect(mocks.listDropboxFiles).toHaveBeenCalledWith({
        path: '/projects',
        cursor: undefined,
        limit: 50,
      }),
    )

    fireEvent.change(screen.getByPlaceholderText('Search files...'), {
      target: { value: 'logo' },
    })

    await waitFor(() => expect(mocks.searchDropboxFiles).toHaveBeenCalledWith('logo', '/projects'))
    expect(screen.queryByText('Logo.png')).not.toBeNull()
    expect(getCommitCount()).toBeLessThan(25)
  })

  it('batch imports selected files through the chat callback and settles without render churn', async () => {
    const { onClose, onSelectFileForChat, getCommitCount } = renderDropboxModal({
      keepOpenAfterImport: true,
    })

    await screen.findByText('Brief.pdf')

    fireEvent.click(screen.getByText('Brief.pdf'))
    expect(screen.queryByText('1 selected')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Import 1 Selected' }))

    await waitFor(() =>
      expect(mocks.backendFetch).toHaveBeenCalledWith(
        '/api/integrations/dropbox/files/download?path=%2Fbrief.pdf',
      ),
    )
    await waitFor(() => expect(onSelectFileForChat).toHaveBeenCalledTimes(1))

    const selectedFile = onSelectFileForChat.mock.calls[0]?.[0] as File
    expect(selectedFile.name).toBe('Brief.pdf')
    expect(mocks.toastSuccess).toHaveBeenCalledWith('1 file(s) queued for import')
    expect(onClose).not.toHaveBeenCalled()
    expect(getCommitCount()).toBeLessThan(25)
  })
})
