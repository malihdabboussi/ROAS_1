import { describe, expect, it } from 'vitest'
import { renderTemplate } from './space-automation-template'

describe('renderTemplate', () => {
  it('renders task.description from the description column before legacy notes', () => {
    expect(
      renderTemplate('{{task.description}}', {
        item: { description: 'Current description', notes: 'Legacy notes' },
        space: {},
      }),
    ).toBe('Current description')
  })

  it('falls back task.description to legacy notes', () => {
    expect(
      renderTemplate('{{task.description}}', {
        item: { notes: 'Legacy notes' },
        space: {},
      }),
    ).toBe('Legacy notes')
  })

  it('resolves steps.0.output from the first step and falls back to mission output for agents', () => {
    expect(
      renderTemplate('{{steps.0.output}}', {
        item: {},
        space: {},
        steps: [{ type: 'send_to_agent', result: 'ok' }],
        mission: { output: 'Research summary' },
      }),
    ).toBe('Research summary')
  })

  it('resolves steps.1.output using one-based step indexing', () => {
    expect(
      renderTemplate('{{steps.1.output}}', {
        item: {},
        space: {},
        steps: [{ type: 'create_artifact', output: 'Client research package' }],
      }),
    ).toBe('Client research package')
  })
})
