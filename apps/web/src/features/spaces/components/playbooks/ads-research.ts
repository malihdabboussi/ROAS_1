export const ADS_RESEARCH_PLAYBOOK_ID = 'ads-research' as const

export type AdsResearchDepth = 'standard' | 'deep'
export type AdsResearchKickoffFields = {
  prompt: string
  depth: AdsResearchDepth
  reporting_period: string
  selected_campaigns: string
  competitors: string
  links: string
}

function splitLinesOrCommas(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function buildAdsResearchMissionPayload(fields: AdsResearchKickoffFields) {
  const prompt = fields.prompt.trim()
  return {
    title: 'Ads Research',
    brief: prompt || 'Analyze current ads and the market, then recommend new ads.',
    priority: 'high' as const,
    input: {
      playbook_id: ADS_RESEARCH_PLAYBOOK_ID,
      playbook_kickoff: {
        prompt: prompt || undefined,
        depth: fields.depth,
        reporting_period: fields.reporting_period,
        selected_campaigns: splitLinesOrCommas(fields.selected_campaigns),
        competitors: splitLinesOrCommas(fields.competitors),
        links: fields.links.trim() || undefined,
      },
    },
  }
}
