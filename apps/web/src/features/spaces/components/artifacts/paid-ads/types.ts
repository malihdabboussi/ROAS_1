export type PaidAdsTreeSelection =
  | { kind: 'campaign'; id: string; title: string }
  | { kind: 'ad_set'; id: string; title: string; adCampaignId: string }
  | { kind: 'ad'; id: string; title: string }
  | { kind: 'ungrouped' }
