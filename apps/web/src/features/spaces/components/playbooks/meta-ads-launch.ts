export const META_ADS_LAUNCH_PLAYBOOK_ID = 'meta-ads-launch' as const
export type MetaAdsLaunchKickoffFields = {
  asset_links: string
  ad_copy: string
  creative_links: string
  destination_url: string
  notes: string
}

export function buildMetaAdsLaunchMissionPayload(
  fields: MetaAdsLaunchKickoffFields,
  pageGraderMetaContext?: Record<string, unknown> | null,
) {
  return {
    title: 'Meta Ads Launch',
    brief: 'Compile approved assets and build the Meta campaign in paused state.',
    priority: 'high' as const,
    input: {
      playbook_id: META_ADS_LAUNCH_PLAYBOOK_ID,
      playbook_kickoff: {
        asset_links: fields.asset_links.trim() || undefined,
        ad_copy: fields.ad_copy.trim() || undefined,
        creative_links: fields.creative_links.trim() || undefined,
        destination_url: fields.destination_url.trim() || undefined,
        notes: fields.notes.trim() || undefined,
        page_grader_meta_context: pageGraderMetaContext ?? undefined,
      },
    },
  }
}
