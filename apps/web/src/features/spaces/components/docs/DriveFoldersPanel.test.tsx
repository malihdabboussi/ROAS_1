import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { DriveFoldersPanel } from './DriveFoldersPanel'
import {
  createDriveFolderMapping,
  deleteDriveFolderMapping,
  listDriveFolderMappings,
  syncDriveFolderMappingNow,
  updateDriveFolderMapping,
  type DriveFolderMapping,
} from '@/lib/services/drive-mappings-api'
import { getGoogleDriveStatus } from '@/lib/services/google-drive-api'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/components/media/DriveFileBrowserModal', () => ({
  DriveFileBrowserModal: ({
    open,
    onClose,
    onSelectDriveFile,
  }: {
    open: boolean
    onClose: () => void
    onSelectDriveFile: (file: {
      id: string
      name: string
      source: 'my_drive' | 'shared_with_me' | 'shared_drives'
      driveId?: string
    }) => void
  }) =>
    open ? (
      <div role="dialog" aria-label="Google Drive picker">
        <button
          type="button"
          onClick={() =>
            onSelectDriveFile({
              id: 'folder-2',
              name: 'Growth Folder',
              source: 'shared_drives',
              driveId: 'drive-2',
            })
          }
        >
          Pick Growth Folder
        </button>
        <button type="button" onClick={onClose}>
          Close picker
        </button>
      </div>
    ) : null,
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: (_key: string, fetcher: () => Promise<unknown>) => fetcher(),
}))

vi.mock('@/lib/services/google-drive-api', () => ({
  getGoogleDriveStatus: vi.fn(),
}))

vi.mock('@/lib/services/drive-mappings-api', () => ({
  createDriveFolderMapping: vi.fn(),
  deleteDriveFolderMapping: vi.fn(),
  listDriveFolderMappings: vi.fn(),
  syncDriveFolderMappingNow: vi.fn(),
  updateDriveFolderMapping: vi.fn(),
}))

const getGoogleDriveStatusMock = vi.mocked(getGoogleDriveStatus)
const listDriveFolderMappingsMock = vi.mocked(listDriveFolderMappings)
const createDriveFolderMappingMock = vi.mocked(createDriveFolderMapping)
const deleteDriveFolderMappingMock = vi.mocked(deleteDriveFolderMapping)
const syncDriveFolderMappingNowMock = vi.mocked(syncDriveFolderMappingNow)
const updateDriveFolderMappingMock = vi.mocked(updateDriveFolderMapping)
const toastSuccessMock = vi.mocked(toast.success)

function makeMapping(overrides: Partial<DriveFolderMapping> = {}): DriveFolderMapping {
  return {
    id: 'mapping-1',
    space_id: 'space-1',
    org_id: 'org-1',
    user_id: 'user-1',
    provider: 'google_drive',
    drive_folder_id: 'folder-1',
    drive_id: null,
    drive_folder_name: 'Launch Docs',
    source: 'my_drive',
    root_space_item_id: 'item-1',
    enabled: true,
    sync_status: 'idle',
    last_synced_at: '2026-06-30T09:00:00.000Z',
    last_sync_error: null,
    next_sync_at: null,
    sync_interval_seconds: 300,
    created_at: '2026-06-30T08:00:00.000Z',
    updated_at: '2026-06-30T09:00:00.000Z',
    ...overrides,
  }
}

describe('DriveFoldersPanel', () => {
  beforeEach(() => {
    getGoogleDriveStatusMock.mockResolvedValue({
      success: true,
      connected: true,
      status: 'connected',
      email: 'user@example.com',
      displayName: 'User',
      connectedAt: '2026-06-30T08:00:00.000Z',
    })
    listDriveFolderMappingsMock.mockResolvedValue([makeMapping()])
    createDriveFolderMappingMock.mockResolvedValue(makeMapping({ id: 'mapping-2' }))
    syncDriveFolderMappingNowMock.mockResolvedValue(undefined)
    updateDriveFolderMappingMock.mockResolvedValue(makeMapping({ enabled: false }))
    deleteDriveFolderMappingMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('loads mappings, opens the dropdown, and runs mapping actions', async () => {
    const onMappingsChanged = vi.fn()
    window.confirm = vi.fn(() => true)

    render(
      <DriveFoldersPanel
        spaceId="space-1"
        onMappingsChanged={onMappingsChanged}
        onSyncingStateChange={vi.fn()}
      />,
    )

    expect(await screen.findByRole('button', { name: 'Drive folders' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Drive folders' }))
    expect(await screen.findByText('Launch Docs')).toBeTruthy()

    fireEvent.click(screen.getByTitle('Sync now'))
    await waitFor(() =>
      expect(syncDriveFolderMappingNowMock).toHaveBeenCalledWith('space-1', 'mapping-1'),
    )

    fireEvent.click(screen.getByTitle('Disable sync'))
    await waitFor(() =>
      expect(updateDriveFolderMappingMock).toHaveBeenCalledWith('space-1', 'mapping-1', {
        enabled: false,
      }),
    )

    fireEvent.click(screen.getByTitle('Remove mapping'))
    await waitFor(() =>
      expect(deleteDriveFolderMappingMock).toHaveBeenCalledWith('space-1', 'mapping-1', true),
    )
    expect(onMappingsChanged).toHaveBeenCalledTimes(1)
  })

  it('opens the folder picker and maps the selected Drive folder', async () => {
    const onMappingsChanged = vi.fn()

    render(<DriveFoldersPanel spaceId="space-1" onMappingsChanged={onMappingsChanged} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Drive folders' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Add folder' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Pick Growth Folder' }))

    await waitFor(() =>
      expect(createDriveFolderMappingMock).toHaveBeenCalledWith('space-1', {
        drive_folder_id: 'folder-2',
        drive_folder_name: 'Growth Folder',
        source: 'shared_drives',
        drive_id: 'drive-2',
      }),
    )
    expect(toastSuccessMock).toHaveBeenCalledWith('Drive folder added — syncing files…')
    expect(onMappingsChanged).toHaveBeenCalledTimes(1)
  })

  it('reports syncing state and settles without render-loop errors', async () => {
    listDriveFolderMappingsMock.mockResolvedValue([makeMapping({ sync_status: 'syncing' })])
    const onSyncingStateChange = vi.fn()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0

    render(
      <Profiler id="drive-folders-panel" onRender={() => (commits += 1)}>
        <DriveFoldersPanel
          spaceId="space-1"
          onMappingsChanged={vi.fn()}
          onSyncingStateChange={onSyncingStateChange}
        />
      </Profiler>,
    )

    await waitFor(() => expect(onSyncingStateChange).toHaveBeenCalledWith(true))
    expect(commits).toBeLessThan(20)
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toMatch(
      /maximum update depth|too many re-renders/i,
    )

    consoleErrorSpy.mockRestore()
  })
})
