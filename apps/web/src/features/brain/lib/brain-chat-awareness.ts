export function buildBrainChatAwarenessContext(input: {
  scopeLabel: string
  brainId: string | null
  totalMemories?: number | null
  totalConnections?: number | null
}): string {
  const lines = [`Active Brain scope: ${input.scopeLabel.trim() || 'User Brain'}.`]
  if (input.brainId) {
    lines.push(`brain_id: ${input.brainId}`)
  }
  if (typeof input.totalMemories === 'number' && Number.isFinite(input.totalMemories)) {
    const connectionPart =
      typeof input.totalConnections === 'number' && Number.isFinite(input.totalConnections)
        ? ` and ${input.totalConnections} connections`
        : ''
    lines.push(
      `The Brain graph on screen shows ${input.totalMemories} memories${connectionPart}.`,
    )
  }
  lines.push(
    'When answering from this Brain, call search_user_brain with brain_id when provided and query terms from the user question.',
  )
  return lines.join('\n')
}
