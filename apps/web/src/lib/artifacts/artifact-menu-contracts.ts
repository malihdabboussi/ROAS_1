export interface PresentationMenuTarget {
  id: string
  name: string | null
  campaign_id: string | null
}

export interface AvatarMenuTarget {
  id: string
  name: string | null
  campaign_id: string | null
}

export interface AdMenuTarget {
  id: string
  headline: string
  primary_text: string
  campaign_id: string | null
  ad_set_id: string | null
}

export interface EmailMenuTarget {
  id: string
  subject: string | null
  campaign_id: string | null
}

export interface FunnelMenuTarget {
  id: string
  name: string
  status: string
  slug: string
  published_url?: string | null
  campaign_id?: string | null
}

export interface FormMenuTarget {
  id: string
  name: string
  status: 'draft' | 'published' | 'archived'
  share_token: string
  visibility: 'public' | 'auth' | 'embed_only'
  published_url?: string | null
  campaign_id?: string | null
  space_id?: string | null
  target_space_id?: string | null
}

export interface SequenceMenuTarget {
  id: string
  name: string | null
  campaign_id: string | null
}

export type PresentationViewportSize = 'desktop' | 'tablet' | 'mobile'

export interface PresentationPreviewOverflowMenuProps {
  viewport: PresentationViewportSize
  onViewportChange: (viewport: PresentationViewportSize) => void
  fileUrl: string | null
  exporting: 'pdf' | 'ppt' | null
  copied: boolean
  onExportPdf: () => void
  onExportPpt: () => void
  onDownloadHtml: () => void
  onCopyDownloadLink?: () => void
}
