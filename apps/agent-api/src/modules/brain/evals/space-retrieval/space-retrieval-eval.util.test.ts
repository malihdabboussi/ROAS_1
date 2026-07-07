import { describe, expect, it } from 'vitest'
import type { BrainEvalCase } from '../brain-eval.types'
import {
  DEMO_SPACE_IDS,
  parseDecoyTag,
  parseSourceTag,
  resolveSourceRefsInCases,
  tagValue,
} from './space-retrieval-eval.util'

describe('space-retrieval-eval.util', () => {
  it('parses source and decoy tags', () => {
    expect(parseSourceTag('source:space_doc:abc-123')).toEqual({
      sourceType: 'space_doc',
      sourceId: 'abc-123',
    })
    expect(parseDecoyTag('decoy:mission:mission-id')).toEqual({
      sourceType: 'mission',
      sourceId: 'mission-id',
    })
  })

  it('reads space tag from eval case', () => {
    const evalCase: BrainEvalCase = {
      id: 'x',
      level: 'yc_demo',
      family: 'user',
      question: 'q',
      expectedAnswer: 'a',
      expectedEvidenceIds: [],
      expectedContextSufficient: true,
      category: 'factual_recall',
      difficulty: 'easy',
      tags: ['space:9ccdb39d-2369-5b87-a35c-fe504369ef0e'],
    }
    expect(tagValue(evalCase, 'space:')).toBe('9ccdb39d-2369-5b87-a35c-fe504369ef0e')
  })

  it('exposes deterministic demo space ids', () => {
    expect(DEMO_SPACE_IDS['company-wiki']).toBe('9ccdb39d-2369-5b87-a35c-fe504369ef0e')
    expect(DEMO_SPACE_IDS['helmsmark-workspace']).toBe('8ffb35ec-4728-5821-9926-7cfddde683f4')
  })

  it('resolves source and decoy tags to semantic chunk ids', async () => {
    const supabase = {
      from: () => {
        const filters = new Map<string, string>()
        const builder = {
          select: () => builder,
          eq: (key: string, value: string) => {
            filters.set(key, value)
            return builder
          },
          order: async () => {
            const sourceId = filters.get('source_id')
            return {
              data:
                sourceId === 'source-doc'
                  ? [{ id: 'chunk-1' }, { id: 'chunk-2' }]
                  : [{ id: 'decoy-1' }],
              error: null,
            }
          },
        }
        return builder
      },
    }
    const evalCase: BrainEvalCase = {
      id: 'source-resolution',
      level: 'yc_demo',
      family: 'user',
      question: 'q',
      expectedAnswer: 'a',
      expectedEvidenceIds: [],
      decoyEvidenceIds: [],
      expectedContextSufficient: true,
      category: 'factual_recall',
      difficulty: 'easy',
      tags: ['source:space_doc:source-doc', 'decoy:space_doc:decoy-doc'],
    }

    const [resolved] = await resolveSourceRefsInCases(supabase as any, [evalCase])

    expect(resolved?.expectedEvidenceIds).toEqual(['chunk-1', 'chunk-2'])
    expect(resolved?.decoyEvidenceIds).toEqual(['decoy-1'])
  })
})
