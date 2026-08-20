export type ChatSendFocusedMission = {
  id: string
  title: string
  status: string
}

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

/**
 * The mission detail panel can be open next to chat on any surface, so the open
 * mission is appended after surface resolution instead of inside one branch.
 */
export function appendFocusedMissionContext(
  context: string,
  mission: ChatSendFocusedMission | null | undefined,
): string {
  if (!mission) return context
  const line = `Open mission: ${mission.title.slice(0, 120)} (mission, id: ${mission.id}, status: ${mission.status}) — the user has this mission's detail panel open; mission messages likely refer to it.`
  return context ? `${context}\n${line}` : line
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
  focusedMission?: ChatSendFocusedMission | null
}): string {
  return appendFocusedMissionContext(resolveSurfaceAwarenessContext(input), input.focusedMission)
}

function resolveSurfaceAwarenessContext(
  input: Parameters<typeof resolveChatSendAwarenessContext>[0],
): string {
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
    campaignName: awarenessCampaignName(input),
    focusedArtifact: input.scopeMatchesVisibleSpace ? input.focusedArtifact : null,
  })
}

/** Home Choose Space is `spaces` with no visible Space title — use Connections. */
function awarenessCampaignName(
  input: Parameters<typeof resolveChatSendAwarenessContext>[0],
): string | null {
  const visible = input.scopeMatchesVisibleSpace ? input.campaignName?.trim() : ''
  const connected = input.connectedLocationLabel.trim()
  return visible || connected || null
}
