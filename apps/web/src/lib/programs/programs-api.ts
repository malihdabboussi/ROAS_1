import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export type ProgramSystemKind = 'clients' | 'roas_ops' | 'personal'
export type ProgramVisibility = 'workspace' | 'private' | 'selected'
export type ProgramShareLevel = 'view' | 'edit'
export type ProgramWorkView = 'overview' | 'list' | 'board' | 'calendar'

export type Program = {
  id: string
  org_id: string | null
  user_id: string | null
  name: string
  slug: string
  system_kind: ProgramSystemKind | null
  icon: string | null
  icon_color: string | null
  sort_order: number
  config: Record<string, unknown>
  visibility: ProgramVisibility
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  campaign_count?: number
  effective_level?: ProgramShareLevel | null
}

export type ProgramShare = {
  id: string
  program_id: string
  org_id: string | null
  entity_type: 'user'
  entity_id: string
  level: ProgramShareLevel
  created_by: string
  created_at: string
}

export type ProgramSharesResponse = {
  effective_level: ProgramShareLevel
  visibility: ProgramVisibility
  created_by: string | null
  can_manage_shares: boolean
  shares: ProgramShare[]
}

export async function fetchPrograms(): Promise<Program[]> {
  return backendGet<Program[]>('/api/programs')
}

export async function fetchProgram(id: string): Promise<Program> {
  return backendGet<Program>(`/api/programs/${encodeURIComponent(id)}`)
}

export async function createProgram(input: {
  name: string
  slug?: string
  icon?: string | null
  icon_color?: string | null
  sort_order?: number
  visibility?: ProgramVisibility
}): Promise<Program> {
  return backendPost<Program>('/api/programs', input)
}

export async function updateProgram(
  id: string,
  input: {
    name?: string
    icon?: string | null
    icon_color?: string | null
    sort_order?: number
    visibility?: ProgramVisibility
    config?: {
      visible_program_views: ProgramWorkView[]
    }
  },
): Promise<Program> {
  return backendPatch<Program>(`/api/programs/${encodeURIComponent(id)}`, input)
}

export async function deleteProgram(id: string): Promise<{ deleted: true }> {
  return backendDelete<{ deleted: true }>(`/api/programs/${encodeURIComponent(id)}`)
}

export async function listProgramShares(id: string): Promise<ProgramSharesResponse> {
  return backendGet<ProgramSharesResponse>(`/api/programs/${encodeURIComponent(id)}/shares`)
}

export async function upsertProgramShare(
  id: string,
  input: { entity_type: 'user'; entity_id: string; level: ProgramShareLevel },
): Promise<ProgramShare> {
  return backendPost<ProgramShare>(`/api/programs/${encodeURIComponent(id)}/shares`, input)
}

export async function deleteProgramShare(id: string, shareId: string): Promise<{ deleted: true }> {
  return backendDelete<{ deleted: true }>(
    `/api/programs/${encodeURIComponent(id)}/shares/${encodeURIComponent(shareId)}`,
  )
}
