export type PresentationInitialFileInput = {
  path: string
  content: string
  role?: string
}

export type PresentationCommentRow = {
  id: string
  presentation_id: string
  user_id: string
  org_id: string | null
  space_id: string | null
  slide_index: number | null
  body: string
  element_trace: Record<string, unknown> | null
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}
