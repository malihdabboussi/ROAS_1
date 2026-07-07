import type { LegacyCapabilityRow } from './composio-capability-catalog.types'

export const YOUTUBE_LEGACY_CAPABILITIES: LegacyCapabilityRow[] = [
  {
    integration_id: 'youtube',
    action_slug: 'get_analytics_report',
    execution_mode: 'legacy',
    display_name: 'Get YouTube Analytics Report',
    description:
      'Query YouTube Analytics for time-windowed channel metrics. Returns daily/weekly/monthly data including views, watch time, subscribers gained/lost, likes, shares, comments, and more for any date range. Use dimensions=day for daily breakdown. Requires yt-analytics.readonly OAuth scope.',
    parameters: {
      startDate: { type: 'string', required: true },
      endDate: { type: 'string', required: true },
      metrics: { type: 'string' },
      dimensions: { type: 'string' },
      filters: { type: 'string' },
      sort: { type: 'string' },
      maxResults: { type: 'number' },
    },
    examples: [],
    metadata: {},
    domains: [],
  }
]
