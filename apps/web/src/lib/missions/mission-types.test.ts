import { describe, expect, it } from 'vitest'
import {
  CORE_DELIVERABLE_TYPES,
  EXTRA_DELIVERABLE_TYPES,
  getDeliverableCategory,
  groupDeliverablesByCategory,
  type MissionDeliverable,
} from './mission-types'

function deliverableFixture(overrides: Partial<MissionDeliverable>): MissionDeliverable {
  return {
    id: 'deliverable-1',
    mission_id: 'mission-1',
    campaign_id: null,
    user_id: 'user-1',
    agent_key: 'agent-1',
    type: 'doc',
    title: 'Deliverable',
    content: null,
    file_url: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    metadata: {},
    created_at: '2026-06-23T00:00:00.000Z',
    ...overrides,
  }
}

describe('mission shared types', () => {
  it('preserves deliverable type sets used by Mission Control carousels', () => {
    expect(CORE_DELIVERABLE_TYPES.has('offer')).toBe(true)
    expect(CORE_DELIVERABLE_TYPES.has('form')).toBe(true)
    expect(CORE_DELIVERABLE_TYPES.has('flow')).toBe(true)
    expect(CORE_DELIVERABLE_TYPES.has('visual_doc')).toBe(true)
    expect(CORE_DELIVERABLE_TYPES.has('pdf')).toBe(true)
    expect(EXTRA_DELIVERABLE_TYPES.has('doc')).toBe(true)
    expect(EXTRA_DELIVERABLE_TYPES.has('video')).toBe(true)
    expect(EXTRA_DELIVERABLE_TYPES.has('audio')).toBe(true)
  })

  it('groups deliverables by category without changing type mapping', () => {
    expect(getDeliverableCategory('pdf')).toBe('documents')
    expect(getDeliverableCategory('image')).toBe('media')
    expect(getDeliverableCategory('audio')).toBe('media')
    expect(getDeliverableCategory('ad')).toBe('artifacts')

    const grouped = groupDeliverablesByCategory([
      deliverableFixture({ id: 'doc', type: 'doc' }),
      deliverableFixture({ id: 'audio', type: 'audio' }),
      deliverableFixture({ id: 'ad', type: 'ad' }),
    ])

    expect(grouped.documents.map((d) => d.id)).toEqual(['doc'])
    expect(grouped.media.map((d) => d.id)).toEqual(['audio'])
    expect(grouped.artifacts.map((d) => d.id)).toEqual(['ad'])
  })
})
