import type { ClassifiedArtifactContext } from './artifact-context-relevance.service'

export type ContextResponseMode = 'relevant' | 'accessible'
export type ContextDecision = 'clarify_before_using_shared_context'

export type ClassifiedContextItem = Record<string, unknown> & {
  context_relevance: ClassifiedArtifactContext
}

export interface BuildContextResponseInput {
  itemsKey: string
  items: ClassifiedContextItem[]
  mode?: ContextResponseMode
}

export type ContextResponse = Record<string, unknown> & {
  mode: ContextResponseMode
  shared_candidates: ClassifiedContextItem[]
  context_decision?: ContextDecision
}

function supportingKey(itemsKey: string): string {
  return `supporting_${itemsKey}`
}

export function buildContextResponse(input: BuildContextResponseInput): ContextResponse {
  const mode = input.mode ?? 'relevant'
  if (mode === 'accessible') {
    return {
      mode,
      [input.itemsKey]: input.items,
      [supportingKey(input.itemsKey)]: [],
      shared_candidates: [],
    }
  }

  const primary = input.items.filter((item) => item.context_relevance.confidence === 'strong')
  const supporting = input.items.filter((item) => item.context_relevance.confidence === 'medium')
  const shared = input.items.filter((item) => item.context_relevance.confidence === 'weak')
  const response: ContextResponse = {
    mode,
    [input.itemsKey]: primary,
    [supportingKey(input.itemsKey)]: supporting,
    shared_candidates: shared,
  }

  if (primary.length === 0 && supporting.length === 0 && shared.length > 0) {
    response.context_decision = 'clarify_before_using_shared_context'
  }

  return response
}
