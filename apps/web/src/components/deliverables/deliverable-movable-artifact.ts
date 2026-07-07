import type { MissionDeliverable } from '@/lib/missions'

/** Tables supported by PATCH /api/artifacts/:table/:id/move (see api ArtifactsService.MOVABLE_TABLES). */
const DELIVERABLE_TYPE_TO_TABLE: Partial<Record<MissionDeliverable['type'], string>> = {
  offer: 'offers',
  funnel: 'funnels',
  website: 'funnels',
  presentation: 'presentations',
  sequence: 'sequences',
  avatar: 'avatars',
  ad: 'ads',
}

export function getMovableArtifactTarget(
  deliverable: MissionDeliverable,
): { table: string; artifactId: string } | null {
  const id = deliverable.entity_id?.trim()
  if (!id) return null
  const table = DELIVERABLE_TYPE_TO_TABLE[deliverable.type]
  if (!table) return null
  return { table, artifactId: id }
}
