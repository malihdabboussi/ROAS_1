import type { MutableRefObject } from 'react'
import type { MediaAsset } from '@/lib/services/media-api'
import type { CampaignDeliverable } from '../../../services/artifact-preview.service'
import type { ConversationDocument } from '../../../types'

export interface MediaTabProps {
  campaignId: string
  mobilePreviewMode?: boolean
}

export type MediaViewMode = 'list' | 'grid'

export type MediaGridTab = 'deliverables' | 'documents' | 'media' | 'files' | 'links'

export type Selection =
  | { type: 'document'; doc: ConversationDocument }
  | { type: 'image'; asset: MediaAsset }
  | { type: 'video'; asset: MediaAsset }
  | { type: 'audio'; asset: MediaAsset }
  | { type: 'file'; asset: MediaAsset }
  | { type: 'deliverable'; deliverable: CampaignDeliverable }
  | null

export interface LinkRow {
  id: string
  url: string
  title: string
  messageId: string
  role: 'user' | 'assistant'
  createdAt: string
}

export interface MediaListSectionsProps {
  docs: ConversationDocument[]
  groupedDocs: Record<string, ConversationDocument[]>
  images: MediaAsset[]
  videos: MediaAsset[]
  fileAssets: MediaAsset[]
  linkRows: LinkRow[]
  deliverables: CampaignDeliverable[]
  deliverablesError: string | null
  selection: Selection
  setSelection: (s: Selection) => void
  docsCollapsed: boolean
  setDocsCollapsed: (v: boolean | ((p: boolean) => boolean)) => void
  imagesCollapsed: boolean
  setImagesCollapsed: (v: boolean | ((p: boolean) => boolean)) => void
  videosCollapsed: boolean
  setVideosCollapsed: (v: boolean | ((p: boolean) => boolean)) => void
  filesCollapsed: boolean
  setFilesCollapsed: (v: boolean | ((p: boolean) => boolean)) => void
  docsExpanded: Set<string>
  setDocsExpanded: (v: Set<string> | ((p: Set<string>) => Set<string>)) => void
  imagesExpanded: boolean
  setImagesExpanded: (v: boolean) => void
  videosExpanded: boolean
  setVideosExpanded: (v: boolean) => void
  filesExpanded: boolean
  setFilesExpanded: (v: boolean) => void
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
  editingId: string | null
  setEditingId: (id: string | null) => void
  menuBtnRef: MutableRefObject<HTMLButtonElement | null>
  handleRenameDoc: (doc: ConversationDocument) => void
  handleDeleteDoc: (doc: ConversationDocument) => Promise<void>
  handleConfirmRenameDoc: (id: string, title: string) => Promise<void>
  handleRenameAsset: (asset: MediaAsset) => void
  handleDeleteAsset: (asset: MediaAsset) => Promise<void>
  handleConfirmRenameAsset: (id: string, name: string) => Promise<void>
  docsError: string | null
  assetsError: string | null
  compact?: boolean
  bulkSelectMode?: boolean
  bulkSelectedIds?: Set<string>
  onToggleBulkSelectItem?: (
    id: string,
    entry: { kind: 'asset' | 'doc'; asset?: MediaAsset; doc?: ConversationDocument },
  ) => void
}
