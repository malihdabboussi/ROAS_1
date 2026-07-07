import type { ReactNode } from 'react'

export type ViewMode = 'wide' | 'a4'

export type DeliverableEntityExportFormat = 'pdf' | 'md' | 'json' | 'html' | 'ppt'

export type DeliverableEntityPreviewRenderer = (args: {
  deliverableType: string
  entityId: string
}) => ReactNode

export interface BrainOption {
  id: string
  label: string
  type: 'user' | 'campaign' | 'agent'
  brainId?: string | null
  campaignId?: string | null
}
