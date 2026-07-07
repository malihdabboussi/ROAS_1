export type FeatureUpdateCategory = 'new' | 'improvement' | 'tip'

export interface FeatureUpdate {
  id: string
  title: string
  description: string
  video_url: string | null
  try_now_path: string | null
  learn_more_url: string | null
  category: FeatureUpdateCategory
  is_active: boolean
  sort_order: number
  created_at: string
}

export const TRY_NOW_OPEN_CREATE_ORG = 'action:open-create-org'
export const TRY_NOW_OPEN_WORKSPACE_SKILLS = '/team/skills'
export const TRY_NOW_OPEN_WORKSPACE_SKILLS_LEGACY = 'action:open-workspace-skills'

export const FEATURE_UPDATES_LAST_SEEN_KEY = 'vibey-feature-updates-last-seen'
