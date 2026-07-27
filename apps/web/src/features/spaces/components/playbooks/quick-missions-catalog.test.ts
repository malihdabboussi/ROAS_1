import { describe, expect, it } from 'vitest'
import {
  findQuickMissionByKey,
  QUICK_MISSION_PLAYBOOKS,
} from './quick-missions-catalog'

describe('quick-missions-catalog', () => {
  it('lists playbooks for slash and hub', () => {
    expect(QUICK_MISSION_PLAYBOOKS.length).toBeGreaterThanOrEqual(5)
    expect(QUICK_MISSION_PLAYBOOKS.every((entry) => entry.key && entry.name)).toBe(true)
  })

  it('resolves playbooks by key or id', () => {
    expect(findQuickMissionByKey('webinar-fulfillment')?.name).toBe('Webinar Fulfillment')
    expect(findQuickMissionByKey('meta-ads-audit')?.id).toBe('meta-ads-audit')
    expect(findQuickMissionByKey('missing')).toBeUndefined()
  })
})
