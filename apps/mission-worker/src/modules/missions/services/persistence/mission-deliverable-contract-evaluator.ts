import type {
  MissionContractVerificationResult,
  MissionOutputContract,
} from './mission-output-contract.types'

export type DeliverableContractRow = {
  id?: string | null
  entity_id?: string | null
  entity_table?: string | null
  type?: string | null
  title?: string | null
  metadata?: Record<string, unknown> | null
  mime_type?: string | null
  source_action?: string | null
}

function failure(
  contract: MissionOutputContract,
  reason: string,
): MissionContractVerificationResult {
  return {
    ok: false,
    reason,
    expected_action: contract.required_action,
    expected_artifact_type: contract.required_artifact_type,
    recovery: 'corrective_run',
  }
}

export function evaluateDeliverableContractRow(
  data: DeliverableContractRow | null,
  contract: MissionOutputContract,
): MissionContractVerificationResult {
  const foundType = data?.type ? String(data.type) : ''
  if (!data?.id || foundType !== contract.required_artifact_type) {
    return failure(
      contract,
      data?.id && foundType
        ? `Found ${foundType} deliverable, expected ${contract.required_artifact_type}`
        : `Missing required ${contract.required_artifact_type} deliverable`,
    )
  }

  const expectedTitle =
    typeof contract.expected?.title === 'string' ? contract.expected.title.trim() : ''
  const actualTitle = typeof data.title === 'string' ? data.title.trim() : ''
  if (expectedTitle && actualTitle !== expectedTitle) {
    return failure(
      contract,
      `Found ${foundType} deliverable titled ${actualTitle || 'untitled'}, expected title ${expectedTitle}`,
    )
  }

  const expectedMime =
    typeof contract.expected?.mime_type === 'string' ? contract.expected.mime_type.trim() : ''
  const actualMime = typeof data.mime_type === 'string' ? data.mime_type.trim() : ''
  if (expectedMime && actualMime !== expectedMime) {
    return failure(
      contract,
      `Found ${foundType} deliverable with mime_type ${actualMime || 'none'}, expected ${expectedMime}`,
    )
  }

  const metadata =
    data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
      ? data.metadata
      : {}
  const expectedSourceAction =
    typeof contract.expected?.source_action === 'string' && contract.expected.source_action.trim()
      ? contract.expected.source_action.trim()
      : contract.required_action
  const actualSourceAction =
    typeof metadata.source_action === 'string'
      ? metadata.source_action.trim()
      : typeof data.source_action === 'string'
        ? data.source_action.trim()
        : ''
  if (expectedSourceAction && actualSourceAction && actualSourceAction !== expectedSourceAction) {
    return failure(
      contract,
      `Found ${foundType} deliverable from ${actualSourceAction || 'unknown action'}, expected ${expectedSourceAction}`,
    )
  }

  return {
    ok: true,
    expected_action: contract.required_action,
    expected_artifact_type: contract.required_artifact_type,
    found_artifact_id: String(data.id),
    recovery: 'corrective_run',
  }
}
