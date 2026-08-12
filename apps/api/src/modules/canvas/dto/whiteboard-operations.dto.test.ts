import { describe, expect, it } from 'vitest'
import { ApplyWhiteboardOperationsSchema } from './index'

describe('ApplyWhiteboardOperationsSchema', () => {
  it('accepts a versioned item and connector batch', () => {
    const parsed = ApplyWhiteboardOperationsSchema.parse({
      base_revision: 2,
      idempotency_key: 'pixel-run-1',
      operations: [
        {
          op: 'create_item',
          item: {
            id: '9bc5a461-6141-4c7f-ae63-a4e25baa6e6a',
            kind: 'sticky_note',
            position_x: 100,
            position_y: 200,
            content: { text: 'Launch idea' },
          },
        },
      ],
    })

    expect(parsed.operations).toHaveLength(1)
  })

  it('rejects an unbounded operation batch', () => {
    const operation = {
      op: 'delete_item',
      item_id: '9bc5a461-6141-4c7f-ae63-a4e25baa6e6a',
    }
    expect(() =>
      ApplyWhiteboardOperationsSchema.parse({
        base_revision: 0,
        idempotency_key: 'too-large',
        operations: Array.from({ length: 101 }, () => operation),
      }),
    ).toThrow()
  })
})
