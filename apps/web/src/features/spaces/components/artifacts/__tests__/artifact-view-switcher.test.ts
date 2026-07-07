import { describe, expect, it } from 'vitest'
import type { ViewDef } from '../../../types/space-schema'
import { buildNewViewDef, findReusableTaskView } from '../../ViewSwitcher'

const artifactTypes: Array<{ type: ViewDef['type']; label: string; configKey: keyof ViewDef }> = [
  { type: 'funnels', label: 'Funnels', configKey: 'funnels_config' },
  { type: 'websites', label: 'Websites', configKey: 'websites_config' },
  { type: 'emails', label: 'Emails', configKey: 'emails_config' },
  { type: 'offers', label: 'Offers', configKey: 'offers_config' },
  { type: 'avatars', label: 'Avatars', configKey: 'avatars_config' },
  { type: 'ads', label: 'Paid Ads', configKey: 'ads_config' },
  { type: 'ad_campaigns', label: 'Ad Campaigns', configKey: 'ad_campaigns_config' },
  { type: 'sequences', label: 'Sequences', configKey: 'sequences_config' },
  { type: 'presentations', label: 'Presentations', configKey: 'presentations_config' },
  { type: 'social_posts', label: 'Social Posts', configKey: 'social_posts_config' },
]

describe('artifact view defaults', () => {
  it('creates each artifact view with its nested config blob', () => {
    for (const item of artifactTypes) {
      const view = buildNewViewDef({
        type: item.type,
        label: item.label,
        icon: 'layout-grid',
        description: item.label,
        newViewId: item.type,
      })
      expect(view.type).toBe(item.type)
      const expected: Record<string, unknown> = { display_mode: 'grid', time_range: 'all' }
      if (item.type === 'ads') expected.paid_ads_mode = 'structure'
      expect(view[item.configKey]).toMatchObject(expected)
    }
  })
})

describe('task view reuse', () => {
  const views: ViewDef[] = [
    { id: 'list', type: 'list', name: 'List' },
    { id: 'table', type: 'table', name: 'Table' },
    { id: 'kanban', type: 'kanban', name: 'Board' },
  ]

  it('reuses existing list, table, and board views instead of creating duplicates', () => {
    expect(findReusableTaskView('list', views)?.id).toBe('list')
    expect(findReusableTaskView('table', views)?.id).toBe('table')
    expect(findReusableTaskView('kanban', views)?.id).toBe('kanban')
  })

  it('does not reuse non-task catalog views', () => {
    expect(findReusableTaskView('calendar', views)).toBeNull()
    expect(findReusableTaskView('all_artifacts', views)).toBeNull()
  })
})
