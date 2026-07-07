import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendPost } from '@/lib/api/backend-client'
import {
  applySkillRecommendation,
  evaluateSkillRecommendationExperiment,
} from './skill-recommendations.service'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendPostMock = vi.mocked(backendPost)

describe('skill recommendations service learning-loop actions', () => {
  beforeEach(() => {
    backendPostMock.mockReset()
  })

  it('calls the guarded apply endpoint', async () => {
    backendPostMock.mockResolvedValue({
      recommendation: { id: 'recommendation-1' },
      checkpoint_id: 'checkpoint-1',
      experiment_id: 'experiment-1',
    })

    const result = await applySkillRecommendation('recommendation-1')

    expect(backendPostMock).toHaveBeenCalledWith(
      '/api/skill-recommendations/recommendation-1/apply',
      {},
    )
    expect(result).toMatchObject({
      checkpoint_id: 'checkpoint-1',
      experiment_id: 'experiment-1',
    })
  })

  it('calls the experiment evaluation endpoint', async () => {
    backendPostMock.mockResolvedValue({
      decision: 'keep',
      primary_change_pct: 34,
      max_guardrail_worsening_pct: 0,
      reasons: ['strong_primary_improvement'],
    })

    const result = await evaluateSkillRecommendationExperiment('recommendation-1')

    expect(backendPostMock).toHaveBeenCalledWith(
      '/api/skill-recommendations/recommendation-1/experiment/evaluate',
      {},
    )
    expect(result).toEqual({
      decision: 'keep',
      primary_change_pct: 34,
      max_guardrail_worsening_pct: 0,
      reasons: ['strong_primary_improvement'],
    })
  })
})
