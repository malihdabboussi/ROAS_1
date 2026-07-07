export type DropboxFileBrowserContext =
  | 'chat'
  | 'brain'
  | 'campaign_knowledge'
  | 'mission_inbox'
  | 'media_library'

export type DropboxViewMode = 'gallery' | 'table'

export type DropboxTableColKey = 'name' | 'size' | 'modified' | 'actions'

export interface DropboxFileBrowserModalProps {
  open: boolean
  onClose: () => void
  campaignId?: string
  context?: DropboxFileBrowserContext
  /** When provided, adds "Add to chat" action; callback receives the file for chat attachment. */
  onSelectFileForChat?: (file: File) => void
  /** When true, modal stays open after import so user can queue more files. */
  keepOpenAfterImport?: boolean
  /** Render listing UI without the outer dialog (e.g. embedded in Train Brain). */
  embedded?: boolean
}

export interface DropboxFileBrowserContextConfig {
  selectLabel: string
  exportLabel: string
  showSelect: boolean
  showExport: boolean
  showShare: boolean
  showDelete: boolean
}
