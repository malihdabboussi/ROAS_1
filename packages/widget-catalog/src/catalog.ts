export type BindingValue<T = unknown> = { path: string } | { literal: T }

export type CatalogComponentType =
  | 'Text'
  | 'Image'
  | 'Icon'
  | 'Row'
  | 'Column'
  | 'List'
  | 'Card'
  | 'Tabs'
  | 'Divider'
  | 'Button'
  | 'TextField'
  | 'CheckBox'
  | 'DateTimeInput'
  | 'MultipleChoice'
  | 'Slider'
  | 'Modal'
  | 'KPICard'
  | 'BarChart'
  | 'LineChart'
  | 'PieChart'
  | 'AreaChart'
  | 'DataTable'
  | 'ProgressBar'
  | 'Gauge'
  | 'StatGrid'
  | 'Badge'
  | 'Timeline'
  | 'Avatar'
  | 'Sparkline'
  | 'StatusBreakdown'
  | 'CompletionsChart'
  | 'TeamGrid'
  | 'SprintMissionsList'
  | 'ActivityList'
  | 'MissionsActivityTabs'
  | 'RevenueOverview'
  | 'RevenueChart'
  | 'DangerZoneCard'
  | 'DeliverablesGrid'
  | 'KnowledgeStrategy'
  | 'KnowledgeAssets'
  | 'LeadsOverTime'
  | 'MissionsProgress'

export const CATALOG_COMPONENTS: ReadonlyArray<CatalogComponentType> = [
  'Text',
  'Image',
  'Icon',
  'Row',
  'Column',
  'List',
  'Card',
  'Tabs',
  'Divider',
  'Button',
  'TextField',
  'CheckBox',
  'DateTimeInput',
  'MultipleChoice',
  'Slider',
  'Modal',
  'KPICard',
  'BarChart',
  'LineChart',
  'PieChart',
  'AreaChart',
  'DataTable',
  'ProgressBar',
  'Gauge',
  'StatGrid',
  'Badge',
  'Timeline',
  'Avatar',
  'Sparkline',
  'StatusBreakdown',
  'CompletionsChart',
  'TeamGrid',
  'SprintMissionsList',
  'ActivityList',
  'MissionsActivityTabs',
  'RevenueOverview',
  'RevenueChart',
  'DeliverablesGrid',
  'KnowledgeStrategy',
  'KnowledgeAssets',
  'LeadsOverTime',
  'MissionsProgress',
] as const

export type ComponentNode = {
  id: string
  weight?: number
  component: Record<string, unknown>
}

export type ActionMapping = {
  name: string
  backendAction: string
  dataTemplate: Record<string, unknown>
}

export type WidgetDefinition = {
  version: 2
  root: string
  components: ComponentNode[]
  dataModel?: Array<{ path: string; value: unknown }>
  actions?: ActionMapping[]
  styles?: {
    font?: string
    primaryColor?: string
  }
}
