export interface SegmentFilters {
  campaigns?: string[]
  funnels?: string[]
  tags?: string[]
  contact_type?: string[]
  country?: string[]
  date_range?: {
    from?: string
    to?: string
  }
}

export interface Segment {
  id: string
  user_id: string
  name: string
  description: string | null
  filters: SegmentFilters
  lead_count: number
  created_at: string
  updated_at: string
}

export interface CreateSegmentRequest {
  name: string
  description?: string
  filters: SegmentFilters
}

export interface UpdateSegmentRequest {
  name?: string
  description?: string | null
  filters?: SegmentFilters
}
