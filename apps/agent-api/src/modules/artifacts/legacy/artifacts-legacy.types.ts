export type ArtifactLegacyPersistMissionDeliverableInput = {
  missionId: string
  userId: string
  campaignId: string | null
  orgId?: string | null
  agentKey: string
  type: 'doc' | 'text' | 'image' | 'video' | 'pdf' | 'file'
  title: string
  sourceAction: string
  content?: string | null
  contentJson?: Record<string, unknown> | null
  fileUrl?: string | null
  fileName?: string | null
  fileSize?: number | null
  mimeType?: string | null
  metadata?: Record<string, unknown>
  updateId?: string | null
  source?: 'mission' | 'chat'
}

export type ArtifactLegacyPersistMissionDeliverableResult = {
  success: true
  id: string
  deliverable_id: string
  type: string
  title: string
  file_url: string | null
  file_name: string | null
  metadata: Record<string, unknown>
}
