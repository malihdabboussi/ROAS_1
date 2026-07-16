export const ROLE_TEAM: Record<string, { label: string; badge: string }> = {
  copywriter: { label: 'Marketing', badge: 'badge-glass badge-glass-sm badge-glass-purple' },
  designer: { label: 'Marketing', badge: 'badge-glass badge-glass-sm badge-glass-purple' },
  analyst: { label: 'Marketing', badge: 'badge-glass badge-glass-sm badge-glass-purple' },
  developer: { label: 'Product', badge: 'badge-glass badge-glass-sm badge-glass-blue' },
  widget_builder: { label: 'Product', badge: 'badge-glass badge-glass-sm badge-glass-blue' },
  pm_marketing: { label: 'Marketing', badge: 'badge-glass badge-glass-sm badge-glass-purple' },
  pm_product: { label: 'Product', badge: 'badge-glass badge-glass-sm badge-glass-blue' },
  pm_operations: { label: 'Operations', badge: 'badge-glass badge-glass-sm badge-glass-orange' },
  automation_integrations_engineer: {
    label: 'Product',
    badge: 'badge-glass badge-glass-sm badge-glass-blue',
  },
  product_manager: { label: 'Product', badge: 'badge-glass badge-glass-sm badge-glass-blue' },
  qa_engineer: { label: 'Product', badge: 'badge-glass badge-glass-sm badge-glass-blue' },
  media_producer: { label: 'Marketing', badge: 'badge-glass badge-glass-sm badge-glass-purple' },
  brand_manager: { label: 'Marketing', badge: 'badge-glass badge-glass-sm badge-glass-purple' },
  cfo: { label: 'Operations', badge: 'badge-glass badge-glass-sm badge-glass-orange' },
  coach: { label: 'Operations', badge: 'badge-glass badge-glass-sm badge-glass-orange' },
  ads_manager: { label: 'Marketing', badge: 'badge-glass badge-glass-sm badge-glass-purple' },
  strategist: { label: 'Agency', badge: 'badge-glass badge-glass-sm badge-glass-orange' },
  customer_support: { label: 'Support', badge: 'badge-glass badge-glass-sm badge-glass-green' },
  customer_success: { label: 'Support', badge: 'badge-glass badge-glass-sm badge-glass-green' },
  customer_coach: { label: 'Support', badge: 'badge-glass badge-glass-sm badge-glass-green' },
  brain_scholar: { label: 'Operations', badge: 'badge-glass badge-glass-sm badge-glass-orange' },
}

const TEAM_LABELS = [...new Set(Object.values(ROLE_TEAM).map((t) => t.label))]

export const PROJECT_MANAGER_ROLE_KEYS = new Set(['pm_marketing', 'pm_product', 'pm_operations'])

export const FILTER_TABS: { id: string; label: string; badge: string }[] = [
  { id: 'all', label: 'All', badge: 'badge-glass-green' },
  { id: 'manager', label: 'Manager', badge: 'badge-glass-red' },
  ...TEAM_LABELS.map((label) => {
    const sample = Object.entries(ROLE_TEAM).find(([, t]) => t.label === label)
    return {
      id: label,
      label,
      badge: sample
        ? (sample[1].badge.split(' ').pop() ?? 'badge-glass-muted')
        : 'badge-glass-muted',
    }
  }),
]
