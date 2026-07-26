type MissionContext = {
  missionId: string
  campaignId?: string | null
  orgId?: string | null
}

type MissionImageResultInput = {
  target: Record<string, any>
  missionContext: MissionContext
  userId: string
  campaignId: string | null
  missionAgentKey: string
  input: Record<string, unknown>
  prompt: string
  upload: Record<string, any>
  provider: string
  model: string
  aspectRatio: string
  avatarId: string
  avatarImageUrl: string
  avatarUpdated: boolean
}

export function persistMissionImageResult({
  target,
  missionContext,
  userId,
  campaignId,
  missionAgentKey,
  input,
  prompt,
  upload,
  provider,
  model,
  aspectRatio,
  avatarId,
  avatarImageUrl,
  avatarUpdated,
}: MissionImageResultInput) {
  const asset =
    upload.asset && typeof upload.asset === 'object'
      ? (upload.asset as Record<string, unknown>)
      : null

  return target.persistMissionDeliverable({
    missionId: missionContext.missionId,
    userId,
    campaignId: campaignId ?? missionContext.campaignId,
    orgId: missionContext.orgId ?? null,
    agentKey: missionAgentKey,
    type: 'image',
    title:
      typeof input.title === 'string' && input.title.trim().length > 0
        ? input.title.trim()
        : 'Generated image',
    sourceAction: 'generate_image',
    content: prompt,
    fileUrl: upload.url ?? null,
    fileName: (asset?.original_filename as string | undefined) ?? null,
    fileSize: typeof asset?.file_size === 'number' ? asset.file_size : null,
    mimeType: (asset?.mime_type as string | undefined) ?? null,
    metadata: {
      provider,
      provider_job_id: '',
      model,
      aspect_ratio: aspectRatio,
      media_asset_id: (asset?.id as string | undefined) ?? null,
      width: typeof asset?.width === 'number' ? asset.width : null,
      height: typeof asset?.height === 'number' ? asset.height : null,
      media_generation_status: 'succeeded',
      ...(avatarUpdated ? { avatar_id: avatarId, avatar_image_url: avatarImageUrl } : {}),
    },
  })
}

type ImageResultInput = {
  upload: Record<string, any>
  imageUrl: string
  imageAssetId: string | null
  spaceId: string | null
  campaignId: string | null
  avatarId: string
  avatarUpdated: boolean
}

export function buildGeneratedImageResult({
  upload,
  imageUrl,
  imageAssetId,
  spaceId,
  campaignId,
  avatarId,
  avatarUpdated,
}: ImageResultInput) {
  return {
    success: true,
    url: imageUrl,
    asset: upload.asset,
    asset_ref: upload.asset_ref,
    image_url: imageUrl,
    image_asset_id: imageAssetId,
    space_id: spaceId,
    campaign_id: campaignId,
    media_library:
      imageAssetId && spaceId
        ? 'registered_in_space_media'
        : imageAssetId
          ? 'registered_in_user_media'
          : 'url_only_no_asset_row',
    ...(avatarUpdated ? { avatar_id: avatarId, avatar_image_url: imageUrl } : {}),
  }
}

export async function updateCanvasWithGeneratedImage(input: {
  supabase: { from: (table: string) => any }
  userId: string
  canvasNodeId: string
  imageUrl: string
  imageAssetId: string | null
  upload: Record<string, any>
  prompt: string
  model: unknown
}) {
  const { ArtifactCanvasService } = await import('./artifact-canvas.service')
  const canvasService = new ArtifactCanvasService()
  await canvasService.patchCanvasNodeFromImage(
    input.supabase,
    input.userId,
    input.canvasNodeId,
    {
      url: input.imageUrl,
      image_url: input.imageUrl,
      image_asset_id: input.imageAssetId,
      asset: input.upload.asset,
    },
    input.prompt,
    input.model,
  )
}
