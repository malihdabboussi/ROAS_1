import { describe, expect, it } from 'vitest'
import { TransferExecuteSchema, TransferPreviewSchema } from '../transfer.dto'

describe('transfer dto schemas', () => {
  it('accepts space and view preview entities', () => {
    expect(
      TransferPreviewSchema.safeParse({
        entity_type: 'space',
        entity_id: '3751b23a-68f9-47f1-bb84-4d64af02f18c',
        target_context: { org_id: null },
        mode: 'move',
      }).success,
    ).toBe(true)

    expect(
      TransferPreviewSchema.safeParse({
        entity_type: 'view',
        entity_id: '3751b23a-68f9-47f1-bb84-4d64af02f18c:list',
        target_context: { org_id: '2fc39907-7d70-492b-ac31-25235f8d1b10' },
        mode: 'copy',
      }).success,
    ).toBe(true)
  })

  it('accepts target_space_id in execute options', () => {
    const parsed = TransferExecuteSchema.safeParse({
      entity_type: 'view',
      entity_ids: ['3751b23a-68f9-47f1-bb84-4d64af02f18c:list'],
      target_context: { org_id: null },
      mode: 'copy',
      options: {
        target_space_id: '11111111-1111-4111-8111-111111111111',
      },
    })

    expect(parsed.success).toBe(true)
  })
})
