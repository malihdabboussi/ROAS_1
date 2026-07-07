export interface MetaPublishModalProps {
  open: boolean
  adId?: string
  adCampaignId?: string
  onClose: () => void
  onPublished?: () => void
  defaultAdAccountId?: string | null
  defaultPageId?: string | null
  defaultInstagramUserId?: string | null
  /** When set, chosen ad account/page/IG/pixel are saved as campaign defaults for this platform campaign. */
  platformCampaignId?: string | null
}

export interface ValidationCheck {
  id: string
  label: string
  status: 'pending' | 'checking' | 'passed' | 'failed'
  error?: string
}

export type MetaPublishStep = 'validating' | 'ready' | 'publishing' | 'success' | 'error'

export interface MetaPublishSummary {
  campaignName: string
  objective: string
  dailyBudget: number | null
  lifetimeBudget: number | null
  countries: string[]
  headline: string
  adName: string
  totalAdSets?: number
  totalAds?: number
}

export interface MetaPublishConfig {
  budgetType?: 'ABO' | 'CBO'
  scheduleType?: 'continuous' | 'one_time'
  bidStrategy?: string
  objective?: string
  dailyBudget?: number | null
  lifetimeBudget?: number | null
  startTime?: string | null
  endTime?: string | null
  campaignName?: string
}

export interface MetaPublishValidationMutable {
  adData: Record<string, unknown> | null
  adCampaignData: Record<string, unknown> | null
  campaignName: string
  objective: string
  dailyBudget: number | null
  lifetimeBudget: number | null
  countries: string[]
  fetchedAccounts: Array<{ id: string; name: string }>
  fetchedPages: Array<{ id: string; name: string }>
  preferredAccountId: string
  preferredPageId: string
  preferredInstagramUserId: string
  preferredPixelId: string
  preferredCustomEventType: string
  resolvedCampaignId: string | null
  budgetType: 'ABO' | 'CBO'
  scheduleType: 'continuous' | 'one_time'
  bidStrategy: string
  startTime: string | null
  endTime: string | null
  resolvedCampaignMetadata: Record<string, unknown>
}
