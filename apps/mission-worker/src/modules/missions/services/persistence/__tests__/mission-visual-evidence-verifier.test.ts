import { describe, expect, it, vi } from 'vitest'
import type { MissionOutputContract } from '../mission-output-contract.types'
import { verifyMissionVisualEvidence } from '../mission-visual-evidence-verifier'

const contract: MissionOutputContract = {
  artifact_kind: 'document_artifact',
  required_action: 'save_document',
  required_artifact_type: 'doc',
  expected: {
    minimum_saved_search_count: 3,
    minimum_visual_reference_count: 12,
  },
}

function supabaseWithSearches(searches: Array<Record<string, unknown>>) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        contains: vi.fn(async () => ({ data: searches, error: null })),
      })),
    })),
  } as any
}

const baseResult = {
  ok: true,
  expected_action: 'save_document',
  expected_artifact_type: 'doc',
  recovery: 'corrective_run' as const,
}

describe('mission visual evidence verifier', () => {
  it('rejects fewer than three mission-linked searches', async () => {
    const searches = Array.from({ length: 2 }, (_, searchIndex) => ({
      id: `search-${searchIndex}`,
      results: Array.from({ length: 6 }, (_, resultIndex) => ({
        ad_id: `ad-${searchIndex}-${resultIndex}`,
        image_url: `https://img.test/${searchIndex}-${resultIndex}.jpg`,
      })),
    }))

    const result = await verifyMissionVisualEvidence(
      supabaseWithSearches(searches),
      'mission-1',
      contract,
      baseResult,
    )

    expect(result).toMatchObject({
      ok: false,
      reason: expect.stringContaining('2 mission-linked saved searches'),
    })
  })

  it('accepts three searches with twelve unique visual references', async () => {
    const searches = Array.from({ length: 3 }, (_, searchIndex) => ({
      id: `search-${searchIndex}`,
      results: Array.from({ length: 4 }, (_, resultIndex) => ({
        ad_id: `ad-${searchIndex}-${resultIndex}`,
        image_url: `https://img.test/${searchIndex}-${resultIndex}.jpg`,
      })),
    }))

    const result = await verifyMissionVisualEvidence(
      supabaseWithSearches(searches),
      'mission-1',
      contract,
      baseResult,
    )

    expect(result).toEqual(baseResult)
  })
})
