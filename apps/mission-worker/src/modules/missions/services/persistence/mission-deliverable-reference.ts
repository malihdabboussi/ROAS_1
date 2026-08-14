export type MissionDeliverableReferenceRow = {
  id: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
}

export function resolveMissionDeliverableReference(
  rows: MissionDeliverableReferenceRow[],
  candidateId: string,
): string | null {
  const normalizedCandidate = candidateId.trim()
  if (!normalizedCandidate) return null

  const match = rows.find((row) => {
    const metadataEntityId =
      row.metadata && typeof row.metadata.entity_id === 'string'
        ? row.metadata.entity_id.trim()
        : ''
    return (
      String(row.id || '') === normalizedCandidate ||
      String(row.entity_id || '') === normalizedCandidate ||
      metadataEntityId === normalizedCandidate
    )
  })
  return match?.id ? String(match.id) : null
}
