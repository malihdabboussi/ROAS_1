export type ChatSendFocusedArtifact = {
  type: string
  id: string
  name: string
  spaceId?: string
  docSource?: string
  docKind?: string
}

interface BuildSpaceAwarenessContextInput {
  activeViewType?: string
  activeViewName?: string
  campaignName?: string | null
  focusedArtifact?: ChatSendFocusedArtifact | null
}

export function buildSpaceAwarenessContext({
  activeViewType,
  activeViewName,
  campaignName,
  focusedArtifact,
}: BuildSpaceAwarenessContextInput): string {
  const lines = [
    '[Space Context]',
    campaignName ? `Campaign: ${campaignName}` : 'Personal space',
    activeViewName || activeViewType
      ? `Active view: ${activeViewName ?? activeViewType}${activeViewType ? ` (${activeViewType})` : ''}`
      : '',
    focusedArtifact?.type === 'space_doc'
      ? `Focused doc: ${focusedArtifact.name} (space_doc, id: ${focusedArtifact.id}, space_id: ${focusedArtifact.spaceId ?? 'unknown'}, source: ${focusedArtifact.docSource ?? 'space'}, kind: ${focusedArtifact.docKind ?? 'file'})`
      : focusedArtifact
        ? `Focused: ${focusedArtifact.name} (${focusedArtifact.type}, id: ${focusedArtifact.id})`
        : '',
  ].filter(Boolean)
  return lines.join('\n').slice(0, 500)
}

export function resolveChatSendAwarenessContext(input: {
  awarenessContextOverride?: string | null
  isChannelScope: boolean
  channelAwareness?: string | null
  chatSurface?: string | null
  brainAwareness?: string | null
  teamAwareness?: string | null
  campaignId: string | null
  spaceId: string | null
  connectedLocationLabel: string
  scopeMatchesVisibleSpace: boolean
  campaignName?: string | null
  activeViewType?: string
  activeViewName?: string
  focusedArtifact?: BuildSpaceAwarenessContextInput['focusedArtifact']
}): string {
  const override = input.awarenessContextOverride?.trim()
  if (override) return override
  if (input.isChannelScope) return input.channelAwareness ?? ''
  if (input.chatSurface === 'brain') return input.brainAwareness ?? ''
  if (input.chatSurface === 'team' && input.teamAwareness) return input.teamAwareness
  if (input.chatSurface !== 'spaces') {
    if (!input.campaignId && !input.spaceId) return ''
    return buildSpaceAwarenessContext({ campaignName: input.connectedLocationLabel })
  }
  return buildSpaceAwarenessContext({
    activeViewType: input.scopeMatchesVisibleSpace ? input.activeViewType : undefined,
    activeViewName: input.scopeMatchesVisibleSpace ? input.activeViewName : undefined,
    campaignName: input.scopeMatchesVisibleSpace
      ? input.campaignName
      : input.connectedLocationLabel,
    focusedArtifact: input.scopeMatchesVisibleSpace ? input.focusedArtifact : null,
  })
}
