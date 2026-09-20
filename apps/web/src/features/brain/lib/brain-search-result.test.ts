import { describe, expect, it } from 'vitest'
import { searchHitToBrainMemory } from './brain-search-result'

describe('searchHitToBrainMemory', () => {
  it('maps significance_score onto significance so metric bars never receive NaN', () => {
    const memory = searchHitToBrainMemory({
      id: 'sk_1',
      content: '[technique] Tuesday Webinar Scheduling Rule',
      memory_type: 'sk:technique',
      significance_score: 0.3,
      confidence: 0.9,
      tags: ['webinars'],
    })
    expect(memory.significance).toBe(0.3)
    expect(memory.confidence).toBe(0.9)
    expect(Number.isNaN(memory.significance)).toBe(false)
    expect(memory.tags).toEqual(['webinars'])
    expect(memory.created_at).toBe('')
  })

  it('prefers an explicit significance and coerces numeric strings', () => {
    const memory = searchHitToBrainMemory({
      id: 'm_1',
      significance: '0.7',
      significance_score: 0.2,
      confidence: '0.55',
    })
    expect(memory.significance).toBe(0.7)
    expect(memory.confidence).toBe(0.55)
  })

  it('falls back to defaults when the hit carries no usable scores', () => {
    const memory = searchHitToBrainMemory({ id: 'm_2', significance_score: 'n/a' })
    expect(memory.significance).toBe(0.6)
    expect(memory.confidence).toBe(0.8)
    expect(memory.content).toBe('')
    expect(memory.memory_type).toBe('fact')
    expect(memory.recalled_count).toBe(0)
  })
})
