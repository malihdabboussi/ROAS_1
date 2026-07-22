import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export type ProgramSystemKind = 'clients' | 'roas_ops' | 'personal'

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
  created_at: string
  updated_at: string
  deleted_at: string | null
  campaign_count?: number
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
  },
): Promise<Program> {
  return backendPatch<Program>(`/api/programs/${encodeURIComponent(id)}`, input)
}

export async function deleteProgram(id: string): Promise<{ deleted: true }> {
  return backendDelete<{ deleted: true }>(`/api/programs/${encodeURIComponent(id)}`)
}
