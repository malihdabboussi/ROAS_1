export type LinkPreviewProvider =
  | 'drive'
  | 'youtube'
  | 'loom'
  | 'vimeo'
  | 'figma'
  | 'internal'
  | 'generic'

export interface LinkPreview {
  url: string
  provider: LinkPreviewProvider
  title: string | null
  description: string | null
  imageUrl: string | null
  iconUrl: string | null
  siteName: string | null
  driveFileId?: string
  mimeType?: string
  entityKind?: string
  entityId?: string
}
