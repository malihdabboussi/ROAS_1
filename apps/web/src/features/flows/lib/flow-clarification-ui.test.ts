import { describe, expect, it } from 'vitest'
import {
  buildFlowClarificationContentBlock,
  formatFlowClarificationAnswersForLoop,
  mapOpenFlowClarificationQuestions,
} from './flow-clarification-ui'

describe('flow-clarification-ui', () => {
  it('maps open build-session clarifications to card questions', () => {
    const questions = mapOpenFlowClarificationQuestions([
      {
        id: 'row-1',
        session_id: 'session-1',
        space_id: 'space-1',
        status: 'open',
        question: {
          id: 'slack_channel',
          text: 'Which Slack channel should get the notification?',
          type: 'single_choice',
          options: [{ id: 'general', label: '#general' }],
          required: true,
        },
      },
    ])

    expect(questions).toHaveLength(1)
    expect(questions[0]?.id).toBe('slack_channel')
  })

  it('builds a pending clarification content block for chat sync', () => {
    const block = buildFlowClarificationContentBlock([
      {
        id: 'row-1',
        session_id: 'session-1',
        space_id: 'space-1',
        status: 'open',
        question: {
          id: 'process_mode',
          text: 'What should process it mean?',
          type: 'single_choice',
          options: [
            { id: 'summary', label: 'Summarize the call' },
            { id: 'tasks', label: 'Create follow-up tasks' },
          ],
          required: true,
        },
      },
    ])

    expect(block).toMatchObject({
      type: 'clarification',
      source: 'flow',
      status: 'pending',
    })
    expect(block?.questions).toHaveLength(1)
  })

  it('formats answers for Loop follow-up', () => {
    const text = formatFlowClarificationAnswersForLoop(
      [
        {
          id: 'process_mode',
          text: 'What should process it mean?',
          type: 'single_choice',
          options: [{ id: 'summary', label: 'Summarize the call' }],
          required: true,
        },
      ],
      { process_mode: 'summary' },
    )

    expect(text).toContain('Flow clarification answers:')
    expect(text).toContain('What should process it mean?')
    expect(text).toContain('summary')
  })
})
