import { describe, expect, it } from 'vitest'
import {
  clientMatchesScopeName,
  ensurePageGraderTagOption,
  resolveDefaultPageGraderClientId,
} from './page-grader-client-tag'

describe('page-grader-client-tag', () => {
  it('defaults client from mapped tag id on selected tasks', () => {
    const clientId = resolveDefaultPageGraderClientId({
      clients: [
        { id: 'c1', name: 'Impact Elite Coaching', status: 'active' },
        { id: 'c2', name: '1DS Collective', status: 'active' },
      ],
      clientTagMap: {
        c1: { tag_id: 'impact_elite_coaching', tag_label: 'Impact Elite Coaching' },
      },
      selectedTagIds: ['impact_elite_coaching'],
      tagOptions: [{ id: 'impact_elite_coaching', label: 'Impact Elite Coaching' }],
    })
    expect(clientId).toBe('c1')
  })

  it('defaults client from matching tag label when map is empty', () => {
    const clientId = resolveDefaultPageGraderClientId({
      clients: [{ id: 'c1', name: 'Impact Elite Coaching', status: 'active' }],
      clientTagMap: {},
      selectedTagIds: ['impact_elite_coaching'],
      tagOptions: [{ id: 'impact_elite_coaching', label: 'Impact Elite Coaching' }],
    })
    expect(clientId).toBe('c1')
  })

  it('defaults client from space scope map before tags', () => {
    const clientId = resolveDefaultPageGraderClientId({
      clients: [
        { id: 'c1', name: 'Impact Elite Coaching', status: 'active' },
        { id: 'c2', name: '1DS Collective', status: 'active' },
      ],
      clientTagMap: {
        c2: { tag_id: 'one_ds', tag_label: '1DS Collective' },
      },
      clientScopeMap: {
        c1: { campaign_id: 'camp-impact', space_id: 'space-impact' },
      },
      selectedTagIds: ['one_ds'],
      tagOptions: [{ id: 'one_ds', label: '1DS Collective' }],
      spaceId: 'space-impact',
      campaignId: 'camp-impact',
    })
    expect(clientId).toBe('c1')
  })

  it('defaults client from campaign name match (Impact → Impact Elite)', () => {
    const clientId = resolveDefaultPageGraderClientId({
      clients: [
        { id: 'c1', name: 'Impact Elite Coaching', status: 'active' },
        { id: 'c2', name: '1DS Collective', status: 'active' },
      ],
      clientTagMap: {},
      selectedTagIds: [],
      tagOptions: [],
      campaignName: 'Impact',
    })
    expect(clientId).toBe('c1')
  })

  it('matches short campaign names inside longer client names', () => {
    expect(clientMatchesScopeName('Impact Elite Coaching', 'Impact')).toBe(true)
    expect(clientMatchesScopeName('1DS Collective', 'Impact')).toBe(false)
  })

  it('reuses an existing tag option by label', () => {
    const option = ensurePageGraderTagOption('Impact Elite Coaching', [
      { id: 'impact_elite_coaching', label: 'Impact Elite Coaching', color: 'green' },
    ])
    expect(option.id).toBe('impact_elite_coaching')
    expect(option.color).toBe('green')
  })
})
