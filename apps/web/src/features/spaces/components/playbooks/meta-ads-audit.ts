export const META_ADS_AUDIT_PLAYBOOK_ID = 'meta-ads-audit' as const

export type MetaAdsAuditKickoffFields = {
  reporting_period: string
  comparison_period: string
  selected_campaigns: string
  notes: string
}

function parseCampaignSelection(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function buildMetaAdsAuditMissionPayload(
  fields: MetaAdsAuditKickoffFields,
  pageGraderMetaContext?: Record<string, unknown> | null,
) {
  return {
    title: 'Meta Ads Audit & Optimization',
    brief:
      'Audit live Meta performance, recommend objective-specific actions, and apply only human-approved changes.',
    priority: 'high' as const,
    input: {
      playbook_id: META_ADS_AUDIT_PLAYBOOK_ID,
      playbook_kickoff: {
        reporting_period: fields.reporting_period.trim() || 'last_30d',
        comparison_period: fields.comparison_period.trim() || 'previous_30d',
        selected_campaigns: parseCampaignSelection(fields.selected_campaigns),
        notes: fields.notes.trim() || undefined,
        page_grader_meta_context: pageGraderMetaContext ?? undefined,
      },
    },
  }
}
