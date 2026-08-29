import type { SourceTruthContract } from './artifact-source-truth-contract'

export function brainSearchSourceTruth(input: {
  receipts: unknown[]
  families: string[]
  contextSufficient: boolean
  resultCount: number
}): SourceTruthContract {
  return {
    canonical_source: { system: 'brain', owner: 'ns_memories', mutable: false },
    as_of: new Date().toISOString(),
    evidence: input.receipts,
    brain_context: {
      families: input.families,
      context_sufficient: input.contextSufficient,
      result_count: input.resultCount,
    },
  }
}

export function campaignBrainSourceTruth(input: {
  receipts: unknown[]
  brainId: string
  campaignId: string
  contextSufficient: boolean
  resultCount: number
}): SourceTruthContract {
  return {
    canonical_source: {
      system: 'brain',
      owner: 'ns_memories',
      mutable: false,
      campaign_id: input.campaignId,
    },
    as_of: new Date().toISOString(),
    evidence: input.receipts,
    brain_context: {
      family: 'campaign',
      brain_id: input.brainId,
      campaign_id: input.campaignId,
      context_sufficient: input.contextSufficient,
      result_count: input.resultCount,
    },
  }
}
