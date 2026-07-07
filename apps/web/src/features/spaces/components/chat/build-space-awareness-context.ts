interface BuildSpaceAwarenessContextInput {
  activeViewType?: string
  activeViewName?: string
  campaignName?: string | null
  focusedArtifact?: {
    type: string
    id: string
    name: string
    spaceId?: string
    docSource?: string
    docKind?: string
  } | null
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
