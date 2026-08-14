export function resolveCompletedSubtaskDeliverableId(input: {
  canonicalOutputDeliverableId: string | null
  existingDeliverableId: string | null
  latestDeliverableId: string | null
  isRevision: boolean
}): string | null {
  return (
    input.canonicalOutputDeliverableId ||
    (input.isRevision ? input.existingDeliverableId : null) ||
    input.latestDeliverableId ||
    null
  )
}

export function buildRevisionArtifactContext(subtask: Record<string, unknown>): string {
  const deliverableId =
    typeof subtask.deliverable_id === 'string' ? subtask.deliverable_id.trim() : ''
  if (subtask.status !== 'revision' || !deliverableId) return ''

  return [
    '\nREVISION_ARTIFACT_CONTRACT:',
    `- canonical_mission_deliverable_id: ${deliverableId}`,
    '- Revise this exact mission deliverable. Read or update it using the canonical mission deliverable id above.',
    '- Do not substitute another Space document, standalone document, or unrelated artifact discovered during context lookup.',
    '- Preserve the canonical mission deliverable id in artifact_manifest after the revision.',
    '- A tool response may also include space_item_id or document_id for its linked editable view; never return a space_item_id or document_id as deliverable_id.',
  ].join('\n')
}
