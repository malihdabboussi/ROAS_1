import { describe, expect, it, vi } from 'vitest'
import { verifyMissionDocumentContent } from '../mission-document-content-verifier'
import type { MissionOutputContract } from '../mission-output-contract.types'

const contract: MissionOutputContract = {
  artifact_kind: 'document_artifact',
  required_action: 'save_document',
  required_artifact_type: 'doc',
  expected: { forbid_em_dash: true },
}
const baseResult = {
  ok: true,
  expected_action: 'save_document',
  expected_artifact_type: 'doc',
  recovery: 'corrective_run' as const,
}

function supabaseWithContent(content: string) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: { content }, error: null })),
        })),
      })),
    })),
  } as any
}

describe('mission document content verifier', () => {
  it('rejects client-facing copy containing em dashes', async () => {
    const result = await verifyMissionDocumentContent(
      supabaseWithContent('One — two &mdash; three'),
      'deliverable-1',
      contract,
      baseResult,
    )

    expect(result).toMatchObject({
      ok: false,
      reason: 'Document contains 2 em dash characters; expected zero',
    })
  })

  it('accepts client-facing copy without em dashes', async () => {
    const result = await verifyMissionDocumentContent(
      supabaseWithContent('One, two, and three.'),
      'deliverable-1',
      contract,
      baseResult,
    )

    expect(result).toEqual(baseResult)
  })

  it('verifies the current linked Space document instead of a stale mission copy', async () => {
    const supabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data:
                table === 'space_items'
                  ? { doc_body: 'Fresh copy with no forbidden punctuation.' }
                  : { content: 'Stale copy — with an em dash.' },
              error: null,
            })),
          })),
        })),
      })),
    } as any

    const result = await verifyMissionDocumentContent(
      supabase,
      'deliverable-1',
      contract,
      baseResult,
      { entityId: 'space-doc-1', entityTable: 'space_items' },
    )

    expect(result).toEqual(baseResult)
    expect(supabase.from).toHaveBeenCalledWith('space_items')
  })
})
