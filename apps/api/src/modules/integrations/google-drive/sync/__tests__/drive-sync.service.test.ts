import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DriveSyncDiffService } from '../drive-sync-diff.service'
import { DriveSyncService } from '../drive-sync.service'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

function createMapping(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mapping-1',
    space_id: 'space-1',
    org_id: 'org-1',
    user_id: 'user-1',
    drive_folder_id: 'root-drive',
    drive_id: null,
    drive_folder_name: 'Root',
    root_space_item_id: 'item-root',
    sync_status: 'idle',
    sync_interval_seconds: 600,
    ...overrides,
  }
}

describe('DriveSyncService', () => {
  const repo = {
    findSpaceById: vi.fn(),
    listMappings: vi.fn(),
    insertMapping: vi.fn(),
    createRootSpaceItem: vi.fn(),
    insertSpaceItem: vi.fn(),
    updateSpaceItem: vi.fn(),
    deleteSpaceItemsByIds: vi.fn(),
    updateMapping: vi.fn(),
    claimMappingForSync: vi.fn(),
    getMappingByIdForSync: vi.fn(),
    listSpaceItemsForMapping: vi.fn(),
    markMappingSynced: vi.fn(),
    markMappingError: vi.fn(),
    getPushChannelByChannelId: vi.fn(),
    markPushChannelNotified: vi.fn(),
    listExpiringPushChannels: vi.fn(),
    upsertPushChannel: vi.fn(),
  }

  const driveApi = {
    getFile: vi.fn(),
    listFiles: vi.fn(),
  }

  const errorReporter = {
    report: vi.fn(),
  }
  const adminClientRepository = {
    getClient: vi.fn(() => ({})),
  }

  let service: DriveSyncService

  beforeEach(() => {
    vi.resetAllMocks()
    const diffService = new DriveSyncDiffService(repo as any, driveApi as any, errorReporter as any)
    service = new DriveSyncService(
      repo as any,
      errorReporter as any,
      diffService,
      adminClientRepository as any,
    )
    ;(service as any).getAdminClient = vi.fn(() => ({}))
  })

  it('applies insert/rename/move/modified/delete diff in one pass', async () => {
    repo.insertSpaceItem
      .mockResolvedValueOnce({ id: 'item-new-folder' })
      .mockResolvedValueOnce({ id: 'item-new-file' })
    repo.updateSpaceItem.mockResolvedValue({ id: 'item-file-1' })
    repo.deleteSpaceItemsByIds.mockResolvedValue(undefined)

    const mapping = createMapping()
    const expected = new Map([
      [
        'root-drive',
        {
          driveId: 'root-drive',
          parentDriveId: null,
          name: 'Root',
          mimeType: FOLDER_MIME,
          modifiedTime: '2026-01-01T00:00:00.000Z',
          webViewLink: null,
          iconLink: null,
          thumbnailLink: null,
          kind: 'folder',
          depth: 0,
        },
      ],
      [
        'new-folder',
        {
          driveId: 'new-folder',
          parentDriveId: 'root-drive',
          name: 'New Folder',
          mimeType: FOLDER_MIME,
          modifiedTime: '2026-01-01T00:00:00.000Z',
          webViewLink: null,
          iconLink: null,
          thumbnailLink: null,
          kind: 'folder',
          depth: 1,
        },
      ],
      [
        'file-1',
        {
          driveId: 'file-1',
          parentDriveId: 'new-folder',
          name: 'Renamed File',
          mimeType: 'application/vnd.google-apps.document',
          modifiedTime: '2026-01-03T00:00:00.000Z',
          webViewLink: 'https://drive.google.com/file/d/file-1/view',
          iconLink: 'https://drive.google.com/icon/file-1',
          thumbnailLink: null,
          kind: 'file',
          depth: 2,
        },
      ],
      [
        'file-2',
        {
          driveId: 'file-2',
          parentDriveId: 'root-drive',
          name: 'Brand New',
          mimeType: 'application/vnd.google-apps.document',
          modifiedTime: '2026-01-02T00:00:00.000Z',
          webViewLink: 'https://drive.google.com/file/d/file-2/view',
          iconLink: 'https://drive.google.com/icon/file-2',
          thumbnailLink: null,
          kind: 'file',
          depth: 1,
        },
      ],
    ])

    const existingRows = [
      {
        id: 'item-root',
        title: 'Root',
        parent_item_id: null,
        custom_data: {
          _drive_file_id: 'root-drive',
          _drive_modified_time: '2026-01-01T00:00:00.000Z',
        },
      },
      {
        id: 'item-file-1',
        title: 'Old Name',
        parent_item_id: 'item-old-folder',
        custom_data: {
          _drive_file_id: 'file-1',
          _drive_modified_time: '2026-01-01T00:00:00.000Z',
          _drive_mime_type: 'application/vnd.google-apps.document',
          _drive_web_view_link: null,
          _drive_icon_link: null,
          _drive_thumbnail_link: null,
        },
      },
      {
        id: 'item-old-folder',
        title: 'Old Folder',
        parent_item_id: 'item-root',
        custom_data: {
          _drive_file_id: 'old-folder',
          _drive_modified_time: '2026-01-01T00:00:00.000Z',
        },
      },
      {
        id: 'item-stale',
        title: 'Stale',
        parent_item_id: 'item-root',
        custom_data: {
          _drive_file_id: 'stale-file',
          _drive_modified_time: '2026-01-01T00:00:00.000Z',
        },
      },
    ]

    const result = await (service as any).applyDiff({} as any, mapping, expected, existingRows)

    expect(result).toEqual({ inserted: 2, updated: 2, deleted: 2 })
    expect(repo.insertSpaceItem).toHaveBeenCalledTimes(2)
    expect(repo.updateSpaceItem).toHaveBeenCalledWith(
      expect.anything(),
      'item-file-1',
      expect.objectContaining({
        title: 'Renamed File',
        parent_item_id: 'item-new-folder',
      }),
    )
    expect(repo.deleteSpaceItemsByIds).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining(['item-old-folder', 'item-stale']),
    )
  })

  it('enforces recursion depth cap of 10', async () => {
    driveApi.getFile.mockResolvedValue({
      id: 'root-drive',
      name: 'Root',
      mimeType: FOLDER_MIME,
      modifiedTime: '2026-01-01T00:00:00.000Z',
    })
    driveApi.listFiles.mockImplementation(async (_admin: unknown, _user: string, opts: any) => {
      const folderId = String(opts?.folderId ?? '')
      const level = Number(folderId.replace('folder-', ''))
      if (!Number.isFinite(level) || level >= 10) {
        return { files: [], nextPageToken: undefined }
      }
      return {
        files: [
          {
            id: `folder-${level + 1}`,
            name: `Folder ${level + 1}`,
            mimeType: FOLDER_MIME,
            modifiedTime: '2026-01-01T00:00:00.000Z',
          },
        ],
        nextPageToken: undefined,
      }
    })

    const mapping = createMapping({ drive_folder_id: 'folder-0' })
    const nodes = await (service as any).walkDriveTree({} as any, mapping)

    expect([...nodes.values()].every((node: any) => node.depth <= 10)).toBe(true)
    expect(nodes.has('folder-11')).toBe(false)
  })

  it('enforces node cap of 5000', async () => {
    driveApi.getFile.mockResolvedValue({
      id: 'root-drive',
      name: 'Root',
      mimeType: FOLDER_MIME,
      modifiedTime: '2026-01-01T00:00:00.000Z',
    })
    driveApi.listFiles.mockResolvedValue({
      files: Array.from({ length: 5001 }, (_, index) => ({
        id: `file-${index + 1}`,
        name: `File ${index + 1}`,
        mimeType: 'application/pdf',
        modifiedTime: '2026-01-01T00:00:00.000Z',
      })),
      nextPageToken: undefined,
    })

    const mapping = createMapping()

    await expect((service as any).walkDriveTree({} as any, mapping)).rejects.toThrow('too_large')
  })

  it('skips runSyncForMapping when mapping already syncing', async () => {
    repo.claimMappingForSync.mockResolvedValue(null)
    repo.getMappingByIdForSync.mockResolvedValue({
      id: 'mapping-1',
      sync_status: 'syncing',
      enabled: true,
    })

    const result = await service.runSyncForMapping('mapping-1')

    expect(result).toEqual({
      success: true,
      mappingId: 'mapping-1',
      skipped: true,
      reason: 'already_syncing',
    })
  })

  it('rejects duplicate mapping creation for the same Drive folder', async () => {
    repo.findSpaceById.mockResolvedValue({ id: 'space-1' })
    repo.listMappings.mockResolvedValue([{ drive_folder_id: 'folder-1' }])

    await expect(
      service.createMapping(
        {} as any,
        'user-1',
        'space-1',
        { drive_folder_id: 'folder-1', drive_folder_name: 'Folder 1' } as any,
        'org-1',
      ),
    ).rejects.toThrow('mapping_exists')
  })

  it('enforces max mappings per space limit', async () => {
    repo.findSpaceById.mockResolvedValue({ id: 'space-1' })
    repo.listMappings.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => ({ drive_folder_id: `folder-${index}` })),
    )

    await expect(
      service.createMapping(
        {} as any,
        'user-1',
        'space-1',
        { drive_folder_id: 'new-folder', drive_folder_name: 'New Folder' } as any,
        'org-1',
      ),
    ).rejects.toThrow('too_many_mappings')
  })

  it('handles push webhook notifications and enqueues sync', async () => {
    repo.getPushChannelByChannelId.mockResolvedValue({
      mapping_id: 'mapping-1',
      user_id: 'user-1',
      channel_token: 'token-1',
    })
    repo.markPushChannelNotified.mockResolvedValue(undefined)
    const enqueueSpy = vi.spyOn(service, 'enqueueSync').mockResolvedValue(undefined)

    const result = await service.handleDrivePushNotification({
      channelId: 'channel-1',
      channelToken: 'token-1',
      resourceState: 'change',
    })

    expect(result).toEqual({ accepted: true, enqueued: true, mappingId: 'mapping-1' })
    expect(repo.markPushChannelNotified).toHaveBeenCalledWith(
      expect.anything(),
      'channel-1',
      expect.any(String),
    )
    expect(enqueueSpy).toHaveBeenCalledWith('mapping-1', 'push', 'user-1')
  })

  it('renews expiring push channels in batch', async () => {
    repo.listExpiringPushChannels.mockResolvedValue([
      {
        mapping_id: 'mapping-1',
        space_id: 'space-1',
        org_id: 'org-1',
        user_id: 'user-1',
        channel_id: 'channel-1',
        channel_token: 'token-1',
        resource_id: 'resource-1',
        resource_uri: 'uri-1',
      },
      {
        mapping_id: null,
        space_id: 'space-2',
      },
    ])
    repo.upsertPushChannel.mockResolvedValue({})

    const result = await service.renewDuePushChannels()

    expect(result).toEqual({ renewed: 1 })
    expect(repo.upsertPushChannel).toHaveBeenCalledTimes(1)
    expect(repo.upsertPushChannel).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mapping_id: 'mapping-1',
        channel_id: 'channel-1',
        channel_token: 'token-1',
        active: true,
      }),
    )
  })
})
