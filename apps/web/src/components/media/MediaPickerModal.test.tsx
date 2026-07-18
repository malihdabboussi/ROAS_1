import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useWorkspaceSettingsModal,
  WorkspaceSettingsModalProvider,
} from '@/lib/settings/workspace-settings-modal-context'
import { MediaPickerModal } from './MediaPickerModal'

const mocks = vi.hoisted(() => ({
  listAssets: vi.fn(),
  useCloudAttach: vi.fn(),
}))

let capturedCloudAttachOptions: {
  onDriveDisconnectedAction?: { onClick: () => void }
} | null = null

vi.mock('@/lib/services/media-api', () => ({
  listAssets: mocks.listAssets,
}))

vi.mock('@/lib/hooks/use-cloud-attach', () => ({
  useCloudAttach: (options: { onDriveDisconnectedAction?: { onClick: () => void } }) => {
    capturedCloudAttachOptions = options
    mocks.useCloudAttach(options)
    return {
      showDrivePicker: false,
      setShowDrivePicker: vi.fn(),
      showDropboxPicker: false,
      setShowDropboxPicker: vi.fn(),
      openDrive: vi.fn(),
      openDropbox: vi.fn(),
    }
  },
}))

vi.mock('@/components/media/DriveFileBrowserModal', () => ({
  DriveFileBrowserModal: ({ open }: { open: boolean }) => (
    <div data-testid="drive-browser-modal">{open ? 'open' : 'closed'}</div>
  ),
}))

vi.mock('@/components/media/DropboxFileBrowserModal', () => ({
  DropboxFileBrowserModal: ({ open }: { open: boolean }) => (
    <div data-testid="dropbox-browser-modal">{open ? 'open' : 'closed'}</div>
  ),
}))

vi.mock('@/components/media/AddFromUrlModal', () => ({
  AddFromUrlModal: ({ open }: { open: boolean }) => (
    <div data-testid="add-from-url-modal">{open ? 'open' : 'closed'}</div>
  ),
}))

let settingsStatusRenderCount = 0

function WorkspaceSettingsStatus() {
  settingsStatusRenderCount += 1
  const { isOpen, initialSection } = useWorkspaceSettingsModal()
  return <span data-testid="workspace-settings-status">{isOpen ? initialSection : 'closed'}</span>
}

function renderMediaPicker(options: { onClose?: () => void } = {}) {
  const onClose = options.onClose ?? vi.fn()

  const result = render(
    <WorkspaceSettingsModalProvider>
      <MediaPickerModal
        open
        initialMediaSource="google_drive"
        onClose={onClose}
        onSelect={vi.fn()}
      />
      <WorkspaceSettingsStatus />
    </WorkspaceSettingsModalProvider>,
  )

  return { onClose, ...result }
}

describe('MediaPickerModal', () => {
  beforeEach(() => {
    capturedCloudAttachOptions = null
    settingsStatusRenderCount = 0
    mocks.listAssets.mockResolvedValue({ assets: [], total: 0 })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens workspace integrations through the shared settings provider when Drive is disconnected', async () => {
    const { onClose } = renderMediaPicker()

    await waitFor(() => expect(mocks.listAssets).toHaveBeenCalledTimes(1))

    const dialog = screen.getByRole('dialog', { name: 'Media Library' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Browse, upload, and manage campaign media assets.').id,
    )
    expect(screen.getByTestId('workspace-settings-status').textContent).toBe('closed')
    expect(settingsStatusRenderCount).toBeLessThan(8)

    act(() => {
      capturedCloudAttachOptions?.onDriveDisconnectedAction?.onClick()
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('workspace-settings-status').textContent).toBe('integrations')
    expect(settingsStatusRenderCount).toBeLessThan(12)
  })
})
