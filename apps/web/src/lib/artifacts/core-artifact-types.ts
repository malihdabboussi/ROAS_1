export interface Sequence {
  id: string
  user_id: string
  campaign_id: string | null
  space_id?: string | null
  name: string | null
  status: 'draft' | 'active' | 'paused' | 'completed'
  trigger: Record<string, unknown>
  config: Record<string, unknown>
  metrics: Record<string, unknown>
  sequence_emails: SequenceEmail[]
  created_at: string
  updated_at: string
}

export interface SequenceEmail {
  id: string
  sequence_id: string
  subject: string | null
  body: string | null
  delay_hours: number
  order_index: number
  status: 'draft' | 'ready' | 'sent'
  created_at: string
}

export interface Avatar {
  id: string
  user_id: string
  /** Present on rows from campaign-scoped list/detail APIs; used for move/copy between campaigns. */
  campaign_id?: string | null
  space_id?: string | null
  offer_id: string | null
  name: string | null
  persona_data: Record<string, unknown>
  avatar_type: string | null
  created_at: string
  updated_at: string
}

export interface Presentation {
  id: string
  user_id: string
  campaign_id: string | null
  space_id?: string | null
  offer_id: string | null
  name: string | null
  slides: Record<string, unknown>[]
  /** Set on `fields=summary` list responses (slides themselves are stripped). */
  slides_count?: number
  /** TSX source code rendered via Sandpack (same pipeline as funnels) */
  generated_html: string | null
  theme_id: string | null
  file_url: string | null
  status: 'draft' | 'generated' | 'published'
  slug: string | null
  published_url: string | null
  domain_id: string | null
  hide_branding: boolean
  metadata: Record<string, unknown> | null
  source_mode?: 'html_bundle' | 'legacy_tsx' | string | null
  entry_file?: string | null
  created_at: string
  updated_at: string
}

export interface PresentationFile {
  id: string
  presentation_id: string
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

export interface PresentationAsset {
  id: string
  presentation_id: string
  media_asset_id: string
  user_id: string
  org_id: string | null
  path: string
  mime_type: string
  size_bytes: number
  role: 'asset' | 'image' | 'font' | 'video' | string
  url?: string | null
  signed_url?: string | null
  media_assets?: {
    id: string
    file_path: string
    bucket_name: string
    public_url: string | null
    mime_type: string
    file_size: number
  } | null
  created_at: string
  updated_at: string
}

export interface PresentationBundle {
  presentation: Presentation
  files: PresentationFile[]
  assets: PresentationAsset[]
  entry_file: string
  source_mode: 'html_bundle' | 'legacy_tsx' | string
  has_entry: boolean
}

export type PresentationEditMode = 'preview' | 'markup' | 'edit' | 'tweaks' | 'comments'

export interface Offer {
  id: string
  user_id: string
  campaign_id: string | null
  space_id?: string | null
  name: string | null
  processing_status: string
  step1_data: Record<string, unknown> | null
  step2_data: Record<string, unknown> | null
  step3_data: Record<string, unknown> | null
  step4_data: Record<string, unknown> | null
  step5_data: Record<string, unknown> | null
  step6_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface EmailArtifact {
  id: string
  subject: string
  body: string
  status: 'draft' | 'ready' | 'sent'
  campaign_id: string | null
  space_id: string
  source_item_id: string | null
  user_id: string
  org_id?: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface SocialPost {
  id: string
  user_id: string
  campaign_id: string | null
  space_id?: string | null
  platform: 'linkedin' | 'instagram'
  post_type: 'single_image' | 'carousel' | 'text_only' | 'story' | 'reel'
  caption: string | null
  headline: string | null
  generated_tsx: string | null
  image_url: string | null
  image_asset_id: string | null
  video_url: string | null
  video_asset_id: string | null
  carousel_slides: Array<{
    tsx?: string
    image_url?: string
    video_url?: string
    caption?: string
  }> | null
  hashtags: string[] | null
  cta_url: string | null
  status: 'draft' | 'ready' | 'scheduled' | 'published' | 'failed'
  scheduled_at: string | null
  published_at: string | null
  published_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ConversationDocument {
  id: string
  conversation_id: string
  campaign_id: string | null
  /** Linked artifact row id when set by backend. */
  resource_id?: string | null
  document_type:
    | 'offer'
    | 'avatar'
    | 'funnel'
    | 'presentation'
    | 'sequence'
    | 'email'
    | 'upload'
    | 'image_upload'
    | 'pdf'
  title: string | null
  content: { text?: string; file_url?: string; type?: string; html?: string } & Record<
    string,
    unknown
  >
  metadata?: Record<string, unknown>
  conversations?: {
    id: string
    title: string | null
    metadata: Record<string, unknown> | null
  } | null
  created_at: string
  updated_at: string
}
