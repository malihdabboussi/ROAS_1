export const IG_ORGANIC_VIDEO_PLAYBOOK_ID = 'ig-organic-video-ad' as const

export type IgOrganicVideoKickoffFields = {
  copyMode: 'write_for_me' | 'use_my_copy'
  sourceStrategy: 'reuse_when_available' | 'generate_new'
  selectedSceneIds: string[]
  pillLine: string
  headline: string
  highlightPhrase: string
  ctaLine: string
  emoji: string
  offerContext: string
  sourceMissionId?: string
  sourceDeliverableIds?: string[]
}

export function buildIgOrganicVideoMissionPayload(fields: IgOrganicVideoKickoffFields) {
  return {
    title: 'IG Organic Video Ads',
    brief:
      'Write or approve the sticker copy, then produce native-looking Instagram Story video ads.',
    priority: 'high' as const,
    input: {
      playbook_id: IG_ORGANIC_VIDEO_PLAYBOOK_ID,
      playbook_kickoff: {
        copy_mode: fields.copyMode,
        copy_approved: fields.copyMode === 'use_my_copy',
        source_strategy: fields.sourceStrategy,
        selected_scene_ids: fields.selectedSceneIds,
        pill_line: fields.pillLine.trim() || undefined,
        headline: fields.headline.trim() || undefined,
        highlight_phrase: fields.highlightPhrase.trim() || undefined,
        cta_line: fields.ctaLine.trim() || undefined,
        emoji: fields.emoji,
        offer_context: fields.offerContext.trim() || undefined,
        music_strategy: 'match_scene',
        source_mission_id: fields.sourceMissionId,
        source_deliverable_ids: fields.sourceDeliverableIds,
      },
    },
  }
}
