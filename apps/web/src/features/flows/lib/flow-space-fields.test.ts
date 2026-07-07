import { describe, expect, it } from 'vitest'
import { flowAutomationFieldsForSpace } from './flow-space-fields'

describe('flowAutomationFieldsForSpace', () => {
  it('returns no automation fields without a space schema', () => {
    expect(flowAutomationFieldsForSpace(null)).toEqual([])
  })

  it('merges missing default fields and hides field types disabled in the UI', () => {
    const fields = flowAutomationFieldsForSpace({
      version: 1,
      fields: [
        { id: 'title', name: 'Name', type: 'text', system: true, required: true },
        { id: 'duration', name: 'Duration', type: 'duration' },
        { id: 'custom', name: 'Custom', type: 'text' },
      ],
      views: [],
    })

    expect(fields.map((field) => field.id)).toContain('custom')
    expect(fields.map((field) => field.id)).toContain('status')
    expect(fields.map((field) => field.id)).not.toContain('duration')
  })
})
