export function buildBrainChatAwarenessContext(input: {
  scopeLabel: string
  brainId: string | null
  campaignId?: string | null
  scopeType?: string | null
  totalMemories?: number | null
  totalConnections?: number | null
}): string {
  const lines = [`Active Brain scope: ${input.scopeLabel.trim() || 'User Brain'}.`]
  const isCampaignKnowledge =
    input.scopeType === 'campaign_knowledge' || input.scopeType === 'campaign'
  const campaignId =
    typeof input.campaignId === 'string' && input.campaignId.trim() ? input.campaignId.trim() : null

  if (isCampaignKnowledge && campaignId) {
    lines.push(`campaign_id: ${campaignId}`)
  }
  if (input.brainId) {
    lines.push(`brain_id: ${input.brainId}`)
  }
  if (typeof input.totalMemories === 'number' && Number.isFinite(input.totalMemories)) {
    const connectionPart =
      typeof input.totalConnections === 'number' && Number.isFinite(input.totalConnections)
        ? ` and ${input.totalConnections} connections`
        : ''
    lines.push(`The Brain graph on screen shows ${input.totalMemories} memories${connectionPart}.`)
  }

  if (isCampaignKnowledge && campaignId) {
    lines.push(
      'This is Campaign Knowledge (client package / Page Grader intel), not a user or agent Brain.',
    )
    lines.push(
      'When answering from this scope, call search_campaign_brain with this campaign_id and query terms from the user question. Do not use search_user_brain, search_agent_brain, or list_brain_domains — campaign brains have no SK domains.',
    )
  } else {
    lines.push(
      'When answering from this Brain, call search_user_brain with brain_id when provided and query terms from the user question.',
    )
  }
  return lines.join('\n')
}
