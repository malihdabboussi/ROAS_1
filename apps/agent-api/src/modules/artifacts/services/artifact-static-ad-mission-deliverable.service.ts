type PersistStaticAdMissionDeliverableInput = {
  target: Record<string, any>
  userId: string
  campaignId: string | null | undefined
  sessionKey?: string
  processed: Record<string, any>
  templateId: string
  aspectRatio: '4:5' | '9:16'
}

const STATIC_AD_WIDTH = 1080
const STATIC_AD_HEIGHTS = { '4:5': 1350, '9:16': 1920 } as const

export class ArtifactStaticAdMissionDeliverableService {
  async persist(input: PersistStaticAdMissionDeliverableInput) {
    const height = STATIC_AD_HEIGHTS[input.aspectRatio]
    const result: Record<string, any> = {
      ...input.processed,
      template_id: input.templateId,
      aspect_ratio: input.aspectRatio,
      width: STATIC_AD_WIDTH,
      height,
    }
    if (!input.target.isMissionSessionKey(input.sessionKey ?? '')) return result

    const missionContext = await input.target.resolveMissionContext(
      input.sessionKey ?? '',
      input.userId,
    )
    const deliverable = await input.target.persistMissionDeliverable({
      missionId: missionContext.missionId,
      userId: input.userId,
      campaignId: input.campaignId ?? missionContext.campaignId,
      orgId: missionContext.orgId ?? null,
      agentKey: input.target.parseAgentIdFromSessionKey(input.sessionKey ?? '') ?? 'unknown',
      type: 'image',
      title: `Static ad — ${input.templateId}`,
      sourceAction: 'process_media',
      content: 'render_static_ad',
      fileUrl: result.url ?? null,
      fileName: 'output.png',
      fileSize: typeof result.file_size === 'number' ? result.file_size : null,
      mimeType: 'image/png',
      metadata: {
        media_asset_id: result.media_asset_id ?? null,
        operation: 'render_static_ad',
        template_id: input.templateId,
        aspect_ratio: input.aspectRatio,
        width: STATIC_AD_WIDTH,
        height,
        media_generation_status: 'succeeded',
      },
    })

    return { ...result, deliverable_id: deliverable.deliverable_id }
  }
}
