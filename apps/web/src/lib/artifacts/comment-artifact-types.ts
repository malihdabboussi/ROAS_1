export interface PresentationElementTrace {
  presentation_id: string
  anchor_id: string | null
  dom_path: string
  tag_chain: string[]
  text_snapshot: string | null
  bounds: {
    x: number
    y: number
    width: number
    height: number
  } | null
  slide_index: number | null
  source_file: string | null
  source_hint: string | null
  attributes?: {
    src: string | null
    alt: string | null
    href: string | null
  } | null
  computed_style?: {
    font_family: string | null
    font_size: string | null
    font_weight: string | null
    line_height: string | null
    letter_spacing: string | null
    color: string | null
    color_mixed?: boolean
    background_color: string | null
    background_color_mixed?: boolean
    padding: string | null
    margin: string | null
    border_radius: string | null
    width: string | null
    height: string | null
  } | null
}

export interface PresentationComment {
  id: string
  presentation_id: string
  user_id?: string
  org_id?: string | null
  space_id?: string | null
  slide_index: number | null
  body: string
  author_name: string
  created_at: string
  updated_at?: string
  resolved: boolean
  resolved_at?: string | null
  resolved_by?: string | null
  save_status?: 'saving' | 'saved' | 'failed'
  element_trace?: PresentationElementTrace | null
  replies?: Array<{
    id: string
    body: string
    author_name: string
    created_at: string
  }>
}

export type FunnelElementTrace = Omit<PresentationElementTrace, 'presentation_id'> & {
  funnel_id: string
  funnel_page_id: string
}

export interface FunnelComment {
  id: string
  funnel_id: string
  funnel_page_id: string | null
  body: string
  author_name: string
  created_at: string
  resolved: boolean
  element_trace?: FunnelElementTrace | null
  replies?: Array<{
    id: string
    body: string
    author_name: string
    created_at: string
  }>
}
