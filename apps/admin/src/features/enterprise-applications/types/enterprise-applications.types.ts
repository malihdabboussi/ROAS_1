export type EnterpriseApplicationRow = {
  id: string
  user_id: string | null
  email: string
  name: string | null
  company_name: string
  company_size: string
  role_title: string | null
  use_case: string | null
  team_size: string | null
  phone: string | null
  website: string | null
  source: string
  status: string
  notes: string | null
  created_at: string
}

export type EnterpriseApplicationsResponse = {
  metrics: {
    total: number
    pending: number
    contacted: number
    approved: number
    declined: number
    fromApp: number
    fromWebsite: number
  }
  entries: EnterpriseApplicationRow[]
}
