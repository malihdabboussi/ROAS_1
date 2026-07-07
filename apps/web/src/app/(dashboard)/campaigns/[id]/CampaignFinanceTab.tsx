'use client'

import { CampaignFinanceTabContainer } from './finance/CampaignFinanceTabContainer'

interface Props {
  campaignId: string
  campaignName?: string | null
}

export function CampaignFinanceTab({ campaignId, campaignName }: Props) {
  return <CampaignFinanceTabContainer campaignId={campaignId} campaignName={campaignName} />
}
