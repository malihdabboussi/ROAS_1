import { describe, expect, it } from 'vitest'
import { MergeMeetingsSchema } from './meeting-merge.controller'

const SURVIVOR = '11111111-1111-4111-8111-111111111111'
const DUP_1 = '22222222-2222-4222-8222-222222222222'
const DUP_2 = '33333333-3333-4333-8333-333333333333'

describe('MergeMeetingsSchema', () => {
  it('accepts a survivor plus duplicate ids', () => {
    expect(
      MergeMeetingsSchema.parse({
        survivor_item_id: SURVIVOR,
        duplicate_item_ids: [DUP_1, DUP_2],
      }),
    ).toEqual({
      survivor_item_id: SURVIVOR,
      duplicate_item_ids: [DUP_1, DUP_2],
    })
  })

  it('rejects an empty duplicate list', () => {
    expect(() =>
      MergeMeetingsSchema.parse({ survivor_item_id: SURVIVOR, duplicate_item_ids: [] }),
    ).toThrow()
  })

  it('rejects the survivor appearing in the duplicate list', () => {
    expect(() =>
      MergeMeetingsSchema.parse({
        survivor_item_id: SURVIVOR,
        duplicate_item_ids: [SURVIVOR],
      }),
    ).toThrow()
  })

  it('rejects non-uuid ids', () => {
    expect(() =>
      MergeMeetingsSchema.parse({ survivor_item_id: 'keep', duplicate_item_ids: [DUP_1] }),
    ).toThrow()
  })

  it('rejects more than 9 duplicates per merge', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `44444444-4444-4444-8444-44444444440${i}`)
    expect(() =>
      MergeMeetingsSchema.parse({ survivor_item_id: SURVIVOR, duplicate_item_ids: ids }),
    ).toThrow()
  })
})
