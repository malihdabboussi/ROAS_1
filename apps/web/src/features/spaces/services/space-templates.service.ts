import { backendGet, backendPost } from '@/lib/api/backend-client'
import type { Space } from '../types'
import type { SpaceSchema } from '../types/space-schema'
import type { SpaceShareLevel } from './spaces.service'

export interface SpaceTemplate {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  icon_color: string
  category: string
  persona: string | null
  badge: string | null
  featured: boolean
  is_new: boolean
  schema: SpaceSchema
  channel_name: string | null
  channel_description: string | null
  sort_order: number
}

export interface SpaceTemplateDetail extends SpaceTemplate {
  task_count: number
  doc_count: number
  automation_count: number
  has_channel: boolean
}

export interface InstantiateTemplateInput {
  title?: string
  campaign_id?: string | null
  visibility?: 'private' | 'team'
  default_share_level?: SpaceShareLevel
  include_tasks?: boolean
  include_docs?: boolean
  include_channel?: boolean
  include_automations?: boolean
}

export async function listSpaceTemplates(): Promise<SpaceTemplate[]> {
  return backendGet<SpaceTemplate[]>('/api/space-templates')
}

export async function getSpaceTemplate(slug: string): Promise<SpaceTemplateDetail> {
  return backendGet<SpaceTemplateDetail>(`/api/space-templates/${slug}`)
}

export async function instantiateSpaceTemplate(
  slug: string,
  input: InstantiateTemplateInput,
): Promise<Space> {
  return backendPost<Space>(`/api/space-templates/${slug}/instantiate`, input)
}
