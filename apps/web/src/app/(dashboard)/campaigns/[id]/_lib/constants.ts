export { DELIVERABLE_ICONS, DELIVERABLE_TYPE_BADGE, DELIVERABLE_TYPE_LABEL } from '@/lib/missions'
import type { CampaignContext, CampaignResources } from './types'

export const defaultContext: CampaignContext = {
  purpose: '',
  result: '',
  strategy: '',
  off_limits: [],
}
export const defaultResources: CampaignResources = {
  website: null,
  drive_folder: null,
  x: null,
  linkedin: null,
  youtube: null,
  instagram: null,
  facebook: null,
}

export const NODE_TYPE_LABELS: Record<string, string> = {
  deliverable: 'Deliverable',
  document: 'Document',
  offer: 'Offer',
  avatar: 'Audience',
  theme: 'Brand',
  agent_learning: 'Insight',
  user_upload: 'Upload',
  url_import: 'Link',
}

export const AGENT_THEME_LABELS: Record<string, string> = {
  c_level: 'C-level',
  manager: 'Manager',
  marketing: 'Marketing',
  analyst: 'Analyst',
  developer: 'Product',
  shared: 'Operations',
}

/** Full titles for c-level agents, shown next to short label in library */
export const AGENT_FULL_TITLES: Record<string, string> = {
  vibey: 'Chief Executive Officer',
  cfo: 'Chief Financial Officer',
}

export const AGENT_THEME_BADGE: Record<string, string> = {
  'C-level': 'badge-glass badge-glass-sm badge-glass-yellow',
  Manager: 'badge-glass badge-glass-sm badge-glass-orange',
  Marketing: 'badge-glass badge-glass-sm badge-glass-purple',
  Analyst: 'badge-glass badge-glass-sm badge-glass-purple',
  Product: 'badge-glass badge-glass-sm badge-glass-blue',
  Operations: 'badge-glass badge-glass-sm badge-glass-orange',
}

export const COMPLETION_DAYS_LABELS: Record<number, string> = {
  1: 'Last 24h',
  3: 'Last 3 days',
  7: 'Last 7 days',
  14: 'Last 14 days',
  30: 'Last 30 days',
  60: 'Last 60 days',
  90: 'Last 90 days',
}

export const AGENT_KEY_TO_TEAM: Record<string, string> = {
  copywriter: 'Marketing',
  designer: 'Marketing',
  analyst: 'Marketing',
  developer: 'Product',
  widget_builder: 'Product',
  pm_marketing: 'Marketing',
  pm_product: 'Product',
  pm_operations: 'Operations',
  automation_integrations_engineer: 'Product',
  product_manager: 'Product',
  qa_engineer: 'Product',
  media_producer: 'Marketing',
  brand_manager: 'Marketing',
  ads_manager: 'Marketing',
  cfo: 'Operations',
  coach: 'Operations',
  brain_scholar: 'Operations',
  customer_support: 'Support',
  customer_success: 'Support',
  customer_coach: 'Support',
}
