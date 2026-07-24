export const STATIC_AD_PRODUCTION_PLAYBOOK_ID = 'static-ad-production' as const

export type StaticAdReferenceAsset = {
  id: string
  name: string
  url: string
  mimeType: string
}

export type StaticAdProductionKickoffFields = {
  selectedFormatIds: string[]
  quantity: number
  aspectRatio: '4:5' | '9:16'
  copyMode: 'write_for_me' | 'use_my_copy'
  exactCopy?: string
  offerContext: string
  personStrategy: 'use_uploaded' | 'generate'
  referenceAssets: StaticAdReferenceAsset[]
  sourceMissionId?: string
  sourceDeliverableIds?: string[]
}

export function buildStaticAdProductionMissionPayload(fields: StaticAdProductionKickoffFields) {
  return {
    title: 'Static Ad Production',
    brief: 'Write or approve the copy, then produce client-ready static ad images.',
    priority: 'high' as const,
    input: {
      playbook_id: STATIC_AD_PRODUCTION_PLAYBOOK_ID,
      playbook_kickoff: {
        selected_format_ids: fields.selectedFormatIds,
        quantity: Math.min(10, Math.max(1, Math.round(fields.quantity))),
        aspect_ratio: fields.aspectRatio,
        copy_mode: fields.copyMode,
        exact_copy: fields.exactCopy?.trim() || undefined,
        offer_context: fields.offerContext.trim() || undefined,
        person_strategy: fields.personStrategy,
        reference_assets: fields.referenceAssets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          url: asset.url,
          mime_type: asset.mimeType,
        })),
        source_mission_id: fields.sourceMissionId,
        source_deliverable_ids: fields.sourceDeliverableIds,
      },
    },
  }
}
