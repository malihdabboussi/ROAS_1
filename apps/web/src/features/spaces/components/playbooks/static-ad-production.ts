export const STATIC_AD_PRODUCTION_PLAYBOOK_ID = 'static-ad-production' as const

export type StaticAdReferenceAsset = {
  id: string
  name: string
  url: string
  mimeType: string
}

export type StaticAdProductionMode = 'validate_messaging' | 'image_brief' | 'static_ad_book'

export type StaticAdProductionKickoffFields = {
  productionMode?: StaticAdProductionMode
  selectedFormatIds: string[]
  formatVariationCounts?: Record<string, number>
  quantity: number
  aspectRatio: '4:5' | '9:16'
  copyMode: 'write_for_me' | 'use_my_copy'
  exactCopy?: string
  exactCopyBySelection?: Record<string, string[]>
  offerContext: string
  personStrategy: 'use_uploaded' | 'generate'
  referenceAssets: StaticAdReferenceAsset[]
  sourceMissionId?: string
  sourceDeliverableIds?: string[]
}

export function getStaticAdOutputCount(fields: StaticAdProductionKickoffFields): number {
  if ((fields.productionMode ?? 'static_ad_book') !== 'static_ad_book') {
    return clampOutputCount(fields.quantity)
  }
  if (!fields.formatVariationCounts) return clampOutputCount(fields.quantity)
  const total = fields.selectedFormatIds.reduce(
    (sum, formatId) => sum + clampOutputCount(fields.formatVariationCounts?.[formatId] ?? 1),
    0,
  )
  return Math.min(10, Math.max(1, total))
}

export function buildStaticAdProductionMissionPayload(fields: StaticAdProductionKickoffFields) {
  const productionMode = fields.productionMode ?? 'static_ad_book'
  return {
    title: 'Static Ad Production',
    brief: 'Write or approve the copy, then produce client-ready static ad images.',
    priority: 'high' as const,
    input: {
      playbook_id: STATIC_AD_PRODUCTION_PLAYBOOK_ID,
      playbook_kickoff: {
        production_mode: productionMode,
        selected_format_ids: fields.selectedFormatIds,
        format_variations: fields.formatVariationCounts,
        quantity: getStaticAdOutputCount(fields),
        aspect_ratio: fields.aspectRatio,
        copy_mode: fields.copyMode,
        exact_copy: fields.exactCopy?.trim() || undefined,
        exact_copy_by_selection: normalizeExactCopy(fields.exactCopyBySelection),
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

function clampOutputCount(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)))
}

function normalizeExactCopy(
  values: Record<string, string[]> | undefined,
): Record<string, string[]> | undefined {
  if (!values) return undefined
  return Object.fromEntries(
    Object.entries(values).map(([key, copy]) => [key, copy.map((value) => value.trim())]),
  )
}
