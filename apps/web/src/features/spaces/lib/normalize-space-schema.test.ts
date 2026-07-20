import { describe, expect, it } from 'vitest'
import { DEFAULT_SPACE_SCHEMA } from '../types/space-schema'
import { normalizeSpaceSchema } from './normalize-space-schema'

describe('normalizeSpaceSchema', () => {
  it('preserves imported views while restoring required fields and version', () => {
    const normalized = normalizeSpaceSchema({
      views: [{ id: 'missions', type: 'missions', name: 'Missions' }],
      custom_data: { source: 'page_grader' },
    })

    expect(normalized.version).toBe(1)
    expect(normalized.fields).toEqual(DEFAULT_SPACE_SCHEMA.fields)
    expect(normalized.views).toEqual([{ id: 'missions', type: 'missions', name: 'Missions' }])
    expect((normalized as unknown as { custom_data?: unknown }).custom_data).toEqual({
      source: 'page_grader',
    })
  })

  it('merges missing canonical fields without replacing valid custom fields', () => {
    const normalized = normalizeSpaceSchema({
      version: 1,
      fields: [{ id: 'client_stage', name: 'Client stage', type: 'select' }],
      views: [],
    })

    expect(normalized.fields[0]).toMatchObject({ id: 'client_stage' })
    expect(normalized.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'title' })]),
    )
    expect(normalized.views).toEqual(DEFAULT_SPACE_SCHEMA.views)
  })
})
