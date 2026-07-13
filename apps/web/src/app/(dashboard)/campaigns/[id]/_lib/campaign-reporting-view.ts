import type { ViewDef } from '@/features/spaces/types/space-schema'

export function createCampaignReportingView(
  reportingType: ViewDef['type'],
  name: string,
): ViewDef {
  return {
    id: `campaign-reporting-${reportingType}`,
    type: reportingType,
    name,
    reporting_config: { time_range: '30d' },
  }
}
