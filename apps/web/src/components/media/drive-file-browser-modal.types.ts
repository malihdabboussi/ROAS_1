import type { GoogleDriveFile } from '@/lib/services/google-drive-api'

export type DriveSource = 'my_drive' | 'shared_with_me' | 'shared_drives'
export type ViewMode = 'gallery' | 'table'

export type DriveTableColKey = 'name' | 'size' | 'owner' | 'modified' | 'actions'

export type DriveFileBrowserContext =
  | 'chat'
  | 'brain'
  | 'campaign_knowledge'
  | 'mission_inbox'
  | 'media_library'
  | 'ad_creative'
  | 'spaces_docs'

/** Open the Drive browser already scoped to a mapped folder (Spaces docs grid). */
export type DocsDriveBrowseSeed = {
  source: DriveSource
  workspaceDriveId?: string | null
  folderId: string
  folderName: string
}

export interface DriveFileBrowserModalProps {
  open: boolean
  onClose: () => void
  campaignId?: string
  context?: DriveFileBrowserContext
  pickFoldersOnly?: boolean
  onSelectFileForChat?: (file: File) => void
  onSelectDriveFile?: (file: {
    id: string
    name: string
    mimeType?: string
    source?: DriveSource
    driveId?: string
  }) => void
  /**
   * Insert the picked file as a link reference (vs uploading the binary).
   * When set, shows an "Insert link" action on every file row regardless of
   * mimeType. Used by chat composers that want a rich Drive `LinkPreviewCard`
   * on the message instead of an attached binary.
   */
  onInsertDriveLink?: (file: {
    id: string
    name: string
    mimeType?: string
    thumbnailLink?: string
  }) => void
  keepOpenAfterImport?: boolean
  /** When set, lists this folder directly and hides My Drive / Shared Drive source switching. */
  docsBrowseSeed?: DocsDriveBrowseSeed | null
  /** File click in gallery/table when selection mode is off (Spaces docs browse). */
  onSpacesDocsFileOpen?: (file: GoogleDriveFile) => void
}

export interface DriveFileBrowserContextConfig {
  selectLabel: string
  exportLabel: string
  showSelect: boolean
  showExport: boolean
  showRename: boolean
  showOpenInDrive: boolean
  showMoreMenu: boolean
}
