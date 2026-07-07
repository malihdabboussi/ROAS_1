/**
 * Studio layout types — Panel state, tabs, campaign mode
 */

export type TabType =
  | 'artifacts'
  | 'workflow'
  | 'dashboard'
  | 'leads'
  | 'media'
  | 'schedule'
  | 'settings'

export interface CampaignModeState {
  activeCampaignId: string | null
  activeCampaignName: string | null
  activeCampaignIcon: string | null
  isPanelMinimized: boolean
  isPanelExpanded: boolean
  sidebarMode: 'studio' | 'hq'
  activePreviewTab: TabType
  hasSocialContent: boolean
  bulkCreatorAdSetId: string | null
  bulkCreatorSession: BulkCreatorSession | null
}

export interface BulkCreatorSession {
  step: 'setup' | 'generating' | 'review' | 'copy' | 'done'
  adSetId: string | null
  variations: Array<{
    id: string
    imageUrl: string
    status: 'pending' | 'accepted' | 'rejected'
    strategy: string
    isGenerating?: boolean
  }>
  copyVariations: Array<{
    headline: string
    primaryText: string
    description: string
  }>
  selectedCopyIndex: number | null
  baseImageUrl: string
}

export interface TabDefinition {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
  campaignOnly?: boolean
}
