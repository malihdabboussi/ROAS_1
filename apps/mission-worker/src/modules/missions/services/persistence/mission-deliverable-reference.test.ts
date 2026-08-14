import { describe, expect, it } from 'vitest'
import { resolveMissionDeliverableReference } from './mission-deliverable-reference'

describe('resolveMissionDeliverableReference', () => {
  it('maps a linked Space document id back to its canonical mission deliverable', () => {
    expect(
      resolveMissionDeliverableReference(
        [
          {
            id: 'mission-deliverable-1',
            entity_id: 'space-document-1',
            metadata: { entity_id: 'space-document-1' },
          },
        ],
        'space-document-1',
      ),
    ).toBe('mission-deliverable-1')
  })

  it('rejects an unrelated Space document id', () => {
    expect(
      resolveMissionDeliverableReference(
        [{ id: 'mission-deliverable-1', entity_id: 'space-document-1', metadata: {} }],
        'unrelated-space-document',
      ),
    ).toBeNull()
  })
})
