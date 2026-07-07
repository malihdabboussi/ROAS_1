import type { FlowAutomationSummary } from './flow-automation.types'
import type { FlowBuildSessionLink } from './flow-build-session-link.types'

export type FlowsPanelTab = 'browse' | 'webhooks' | 'build' | 'clarifications'

/** Primary panel inside Browse (Templates, My Loops, Webhooks, etc.). */
export type FlowsBrowseSection =
  | 'templates'
  | 'my-templates'
  | 'my-loops'
  | 'history'
  | 'webhooks'

export type FlowsViewMode = 'grid' | 'list'

export type { FlowsGroupBy, FlowsGroupSort } from '@/lib/flows/flow-grouping-types'

export type FlowsDraftFilter = 'all' | 'draft' | 'published'

export type FlowsEnabledFilter = 'all' | 'on' | 'off'

export type FlowsSort = 'recent' | 'oldest' | 'name_asc' | 'name_desc'

export interface FlowsListGroup {
  key: string
  label: string
  color: string
  items: FlowAutomationSummary[]
  itemCount?: number
  orphanSessions?: FlowBuildSessionLink[]
}
