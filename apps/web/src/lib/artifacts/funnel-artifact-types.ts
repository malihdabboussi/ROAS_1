export interface FunnelPage {
  id: string
  funnel_id: string
  slug?: string
  path?: string
  name: string
  page_type: string
  sort_order?: number
  generated_html: string | null
  generated_css: string | null
  source_mode?: 'tsx' | 'html_bundle' | string
  preview_contract?: {
    normalization_applied: string[]
    recovery_applied: string[]
    used_fallback: boolean
  }
  status: string
  created_at: string
  updated_at: string
}

export interface FunnelFile {
  id: string
  funnel_id: string
  funnel_page_id: string | null
  user_id: string
  org_id: string | null
  path: string
  content: string
  mime_type: string
  role: 'entry' | 'source' | 'style' | 'script' | 'manifest' | string
  size_bytes: number
  created_at: string
  updated_at: string
}

export interface FunnelAsset {
  id: string
  funnel_id: string
  media_asset_id: string
  user_id: string
  org_id: string | null
  path: string
  mime_type: string
  size_bytes: number
  role: 'asset' | 'image' | 'font' | 'video' | string
  url?: string | null
  signed_url?: string | null
  created_at: string
  updated_at: string
}

export interface FunnelPageBundle {
  page: FunnelPage
  files: FunnelFile[]
  shared_files: FunnelFile[]
  assets: FunnelAsset[]
  entry_file: string
  source_mode: 'tsx' | 'html_bundle' | string
  has_entry: boolean
}

export interface Funnel {
  id: string
  campaign_id: string
  theme_id?: string | null
  name: string
  slug: string
  funnel_type: string
  status: string
  tag_ids?: string[]
  hide_branding: boolean
  metadata?: Record<string, unknown> | null
  published_url?: string | null
  domain_id?: string | null
  layout?: Record<string, unknown> | null
  pages?: FunnelPage[]
  created_at: string
  updated_at: string
}

export interface BlogPost {
  id: string
  user_id: string
  funnel_id: string
  campaign_id: string | null
  title: string
  slug: string
  content: unknown
  excerpt: string | null
  cover_image: string | null
  author: string | null
  tags: string[]
  seo: Record<string, unknown>
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
