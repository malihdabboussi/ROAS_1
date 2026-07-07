export interface Funnel {
  id: string
  name: string
  slug: string | null
  status: 'draft' | 'published' | 'paused' | 'archived'
  funnel_type: string
  title: string | null
  hide_branding: boolean
  user_id: string
  campaign_id: string | null
  published_url: string | null
  metadata: Record<string, unknown> | null
}

export interface FunnelPage {
  id: string
  funnel_id: string
  name: string
  page_type: 'opt-in' | 'confirmation' | 'thank-you' | 'offer' | 'pre-call'
  slug: string | null
  generated_html: string | null
  generated_css: string | null
  generation_mode: string
  content: Record<string, unknown>
  seo: {
    title?: string
    description?: string
  }
  is_published: boolean
  order_index: number
}

export interface Presentation {
  id: string
  name: string
  slides: PresentationSlide[]
  generated_html: string | null
  file_url: string | null
  slug: string | null
  published_url: string | null
  hide_branding: boolean
  status: string
  user_id: string
  campaign_id: string | null
  metadata: Record<string, unknown> | null
  bundle?: PresentationBundle | null
}

export interface PresentationFile {
  path: string
  content: string
  mime_type: string
  role: string
}

export interface PresentationAsset {
  path: string
  mime_type: string
  role: string
  url: string | null
}

export interface PresentationBundle {
  files: PresentationFile[]
  assets: PresentationAsset[]
  entry_file: string
  source_mode: string
  has_entry: boolean
}

export interface PresentationSlide {
  type: 'cover' | 'section' | 'chapter' | 'content' | 'stat' | 'cta' | 'closing'
  title?: string
  subtitle?: string
  body?: string
  bullets?: string[]
  tagline?: string
  author?: string
  note?: string
  chapter?: string
  stats?: Array<{ value: string; label: string }>
  cta_text?: string
  cta_url?: string
}
