import type { MediaAsset } from '@/lib/services/media-api'

export type MediaSource = 'library' | 'google_drive' | 'dropbox' | 'meta'

export type CampaignFilter = 'current' | 'all'

export type TypeFilter = 'all' | 'image' | 'video' | 'document'

export interface MediaPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
  onSelectAsset?: (asset: MediaAsset) => void
  onSelectAssets?: (assets: MediaAsset[]) => void
  campaignId?: string
  multiSelect?: boolean
  initialMediaSource?: MediaSource
  onUploadedUrl?: (url: string) => void
  onUploadedAsset?: (asset: MediaAsset) => void
  /** When set, show Meta tab with ad account images. */
  adAccountId?: string | null
  /** When user selects a file from Google Drive (e.g. for ad creative); closes modal. */
  onSelectDriveFile?: (file: { id: string; name: string; mimeType?: string }) => void
  /** When user selects a file from Dropbox; closes modal. */
  onSelectDropboxFile?: (file: { id: string; name: string }) => void
  /** When true, modal stays open after confirm so user can queue more files. */
  keepOpenAfterImport?: boolean
}
