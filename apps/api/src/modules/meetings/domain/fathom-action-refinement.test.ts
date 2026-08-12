import { describe, expect, it } from 'vitest'
import type { FathomSourceAction } from '../providers/fathom-meeting-source'
import {
  applyFathomActionRefinement,
  buildFathomActionRefinementPrompt,
} from './fathom-action-refinement'

function action(overrides: Partial<FathomSourceAction> = {}): FathomSourceAction {
  return {
    sourceKey: 'key-1',
    sourceText: 'Monitor and optimize webinar ads over the weekend',
    assigneeName: null,
    assigneeEmail: null,
    recordingTimestamp: '5:31',
    recordingPlaybackUrl: null,
    completed: false,
    userGenerated: false,
    raw: {},
    ...overrides,
  }
}

describe('applyFathomActionRefinement', () => {
  const actions = [
    action({ sourceKey: 'k0', sourceText: 'Monitor ads over the weekend' }),
    action({ sourceKey: 'k1', sourceText: 'Send video scripts to Yasir' }),
    action({ sourceKey: 'k2', sourceText: 'Raise the VIP offer price to $97' }),
  ]

  it('drops keep=false items and rewrites kept ones with owner and refinement metadata', () => {
    const refined = applyFathomActionRefinement(actions, {
      items: [
        { index: 0, keep: false },
        {
          index: 1,
          keep: true,
          title: 'Send video scripts to Yasir by Thu Aug 14',
          assignee_name: 'Aaron Mckeague',
          why: 'Yasir needs approved scripts before spend scales',
        },
        { index: 2, keep: true, completed: true },
      ],
    })

    expect(refined).toHaveLength(2)
    expect(refined[0]).toMatchObject({
      sourceKey: 'k1',
      sourceText: 'Send video scripts to Yasir by Thu Aug 14',
      assigneeName: 'Aaron Mckeague',
      refinement: {
        original_text: 'Send video scripts to Yasir',
        why: 'Yasir needs approved scripts before spend scales',
      },
    })
    // completed can be set by the model, and evidence linkage survives.
    expect(refined[1]).toMatchObject({ sourceKey: 'k2', completed: true })
    expect(refined[1]!.refinement).toMatchObject({
      original_text: 'Raise the VIP offer price to $97',
    })
  })

  it('keeps raw actions untouched for indexes the model skipped', () => {
    const refined = applyFathomActionRefinement(actions, {
      items: [{ index: 1, keep: false }],
    })
    expect(refined.map((row) => row.sourceKey)).toEqual(['k0', 'k2'])
    expect(refined[0]!.refinement).toBeUndefined()
  })

  it('falls back to the full raw list on malformed output', () => {
    for (const malformed of [null, 'nope', {}, { items: 'x' }, []]) {
      const refined = applyFathomActionRefinement(actions, malformed)
      expect(refined).toHaveLength(3)
      expect(refined[0]!.sourceText).toBe('Monitor ads over the weekend')
    }
  })

  it('never lets an empty rewritten title erase the original text', () => {
    const refined = applyFathomActionRefinement(actions, {
      items: [{ index: 0, keep: true, title: '   ' }],
    })
    expect(refined[0]!.sourceText).toBe('Monitor ads over the weekend')
  })
})

describe('buildFathomActionRefinementPrompt', () => {
  it('numbers actions, includes meeting context, and caps the transcript', () => {
    const prompt = buildFathomActionRefinementPrompt({
      actions: [
        action({ sourceText: 'Send chat-data extract to Yasir', assigneeName: 'Nate Tilley' }),
      ],
      transcript: [
        { speakerName: 'Dylan', speakerEmail: null, timestamp: '0:01', text: 'x'.repeat(20_000) },
        { speakerName: 'Nate', speakerEmail: null, timestamp: '0:02', text: 'should be cut' },
      ],
      providerSummary: 'Webinar review call',
      meetingTitle: 'Kennedy, Nate and Aaron',
      meetingStart: '2026-08-11T20:00:00Z',
    })
    expect(prompt).toContain('0. Send chat-data extract to Yasir (suggested assignee: Nate Tilley)')
    expect(prompt).toContain('Meeting: Kennedy, Nate and Aaron')
    expect(prompt).toContain('Meeting date: 2026-08-11T20:00:00Z')
    expect(prompt).toContain('Webinar review call')
    expect(prompt).not.toContain('should be cut')
  })
})
