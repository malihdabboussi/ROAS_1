export type ContextConfidence = 'strong' | 'medium' | 'weak'
export type ContextUsePolicy = 'answer_directly' | 'support_only' | 'ask_first'

export type ContextRelationship =
  | 'explicit_reference'
  | 'active_session'
  | 'owner'
  | 'creator'
  | 'assignee'
  | 'current_agent'
  | 'current_conversation'
  | 'mission_session'
  | 'linked_campaign'
  | 'linked_space'
  | 'parent_child_link'
  | 'recent_user_activity'
  | 'org_viewer'
  | 'org_editor'
  | 'shared_space_visible'
  | 'broad_access'

export interface ArtifactContextSignals {
  userId: string
  orgId?: string | null
  agentKey?: string | null
  activeCampaignId?: string | null
  activeSpaceId?: string | null
  activeConversationId?: string | null
  activeMissionId?: string | null
}

export interface ClassifiedArtifactContext {
  object_type: string
  object_id: string
  relationship: ContextRelationship
  confidence: ContextConfidence
  reason: string
  agent_context_eligible: boolean
  use_policy: ContextUsePolicy
}

export interface ClassifyArtifactContextInput {
  objectType: string
  row: Record<string, unknown>
  context: ArtifactContextSignals
  explicitIds?: string[]
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function idFromRow(row: Record<string, unknown>): string {
  return (
    stringValue(row.id) ??
    stringValue(row.object_id) ??
    stringValue(row.source_id) ??
    stringValue(row.campaign_id) ??
    'unknown'
  )
}

function buildClassification(
  input: ClassifyArtifactContextInput,
  relationship: ContextRelationship,
  confidence: ContextConfidence,
  reason: string,
): ClassifiedArtifactContext {
  const usePolicy: ContextUsePolicy =
    confidence === 'strong'
      ? 'answer_directly'
      : confidence === 'medium'
        ? 'support_only'
        : 'ask_first'
  return {
    object_type: input.objectType,
    object_id: idFromRow(input.row),
    relationship,
    confidence,
    reason,
    agent_context_eligible: confidence !== 'weak',
    use_policy: usePolicy,
  }
}

export function classifyArtifactContext(
  input: ClassifyArtifactContextInput,
): ClassifiedArtifactContext {
  const rowId = idFromRow(input.row)
  const { row, context } = input
  const userId = stringValue(row.user_id)
  const createdBy = stringValue(row.created_by)
  const assigneeId = stringValue(row.assignee_id)
  const agentKey = stringValue(row.agent_key)
  const assignedAgentKey = stringValue(row.assigned_agent_key)
  const currentAgentKey = stringValue(row.current_agent_key)
  const campaignId = stringValue(row.campaign_id)
  const spaceId = stringValue(row.space_id)
  const conversationId = stringValue(row.conversation_id)
  const missionId = stringValue(row.mission_id)
  const permission = stringValue(row.permission)
  const rowOrgId = stringValue(row.org_id)

  if (input.explicitIds?.includes(rowId)) {
    return buildClassification(
      input,
      'explicit_reference',
      'strong',
      'Explicitly referenced by the action input.',
    )
  }
  if (
    rowId === context.activeCampaignId ||
    rowId === context.activeSpaceId ||
    rowId === context.activeConversationId ||
    rowId === context.activeMissionId
  ) {
    return buildClassification(
      input,
      'active_session',
      'strong',
      'Matches the active session context.',
    )
  }
  if (userId && userId === context.userId) {
    return buildClassification(input, 'owner', 'strong', 'Owned by the current user.')
  }
  if (createdBy && createdBy === context.userId) {
    return buildClassification(input, 'creator', 'strong', 'Created by the current user.')
  }
  if (assigneeId && assigneeId === context.userId) {
    return buildClassification(input, 'assignee', 'strong', 'Assigned to the current user.')
  }
  if (
    context.agentKey &&
    (agentKey === context.agentKey ||
      assignedAgentKey === context.agentKey ||
      currentAgentKey === context.agentKey)
  ) {
    return buildClassification(input, 'current_agent', 'strong', 'Assigned to the current agent.')
  }
  if (conversationId && conversationId === context.activeConversationId) {
    return buildClassification(
      input,
      'current_conversation',
      'strong',
      'Belongs to the current conversation.',
    )
  }
  if (missionId && missionId === context.activeMissionId) {
    return buildClassification(input, 'mission_session', 'strong', 'Belongs to the active mission.')
  }
  if (campaignId && campaignId === context.activeCampaignId) {
    return buildClassification(input, 'linked_campaign', 'medium', 'Linked to the active campaign.')
  }
  if (spaceId && spaceId === context.activeSpaceId) {
    return buildClassification(input, 'linked_space', 'medium', 'Linked to the active Space.')
  }
  if (permission === 'editor' || permission === 'edit') {
    return buildClassification(input, 'org_editor', 'weak', 'Visible through shared editor access.')
  }
  if (permission === 'viewer' || permission === 'view') {
    return buildClassification(input, 'org_viewer', 'weak', 'Visible through shared viewer access.')
  }
  if (rowOrgId && rowOrgId === context.orgId) {
    return buildClassification(
      input,
      'broad_access',
      'weak',
      'Visible through broad organization access.',
    )
  }

  return buildClassification(
    input,
    'broad_access',
    'weak',
    'No active, owned, assigned, or explicit relationship found.',
  )
}
