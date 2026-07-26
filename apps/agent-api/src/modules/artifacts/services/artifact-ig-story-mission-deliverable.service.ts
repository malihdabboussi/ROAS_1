type PersistIgStoryMissionDeliverableInput = {
  target: Record<string, any>
  userId: string
  campaignId: string | null | undefined
  sessionKey?: string
  processed: Record<string, any>
}

const IG_STORY_WIDTH = 1080
const IG_STORY_HEIGHT = 1920
const IG_STORY_DURATION_SECONDS = 10

export class ArtifactIgStoryMissionDeliverableService {
  async persist(input: PersistIgStoryMissionDeliverableInput) {
    const result: Record<string, any> = {
      ...input.processed,
      width: IG_STORY_WIDTH,
      height: IG_STORY_HEIGHT,
      duration_seconds: IG_STORY_DURATION_SECONDS,
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
      type: 'video',
      title: 'IG Story video',
      sourceAction: 'process_media',
      content: 'render_ig_story',
      fileUrl: result.url ?? null,
      fileName: `output.${String(result.format || 'mp4')}`,
      fileSize: typeof result.file_size === 'number' ? result.file_size : null,
      mimeType: 'video/mp4',
      metadata: {
        media_asset_id: result.media_asset_id ?? null,
        operation: 'render_ig_story',
        aspect_ratio: '9:16',
        width: IG_STORY_WIDTH,
        height: IG_STORY_HEIGHT,
        duration_seconds: IG_STORY_DURATION_SECONDS,
        media_generation_status: 'succeeded',
      },
    })

    return { ...result, deliverable_id: deliverable.deliverable_id }
  }
}
