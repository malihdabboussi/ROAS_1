import type {
  AutomationActionLike,
  AutomationTriggerLike,
} from '@/lib/flows/automation-publishable'

export type FlowAutomationTriggerSummary = {
  type: string
  to?: string
  from?: string
  in_status?: string
  field_id?: string
  assignee_type?: string
  tag?: string
  webhook_endpoint_id?: string
}

export type FlowAutomationStatusSummary = {
  is_draft?: boolean
  enabled: boolean
}

export type FlowInstallationValidationStatus = 'unknown' | 'healthy' | 'needs_setup' | 'invalid'

export type FlowInstallationSummary = FlowAutomationStatusSummary & {
  id: string
  automation_id?: string | null
  flow_definition_id?: string | null
  flow_installation_id?: string | null
  flow_version_id?: string | null
  name: string
  description?: string | null
  trigger: FlowAutomationTriggerSummary
  actions: readonly AutomationActionLike[]
  created_at?: string
  updated_at?: string
  space_id?: string
  space_title?: string
  campaign_id?: string | null
  campaign_name?: string | null
  validation_status?: FlowInstallationValidationStatus
  validation_errors?: readonly unknown[]
}

export type FlowAutomationSummary = FlowAutomationStatusSummary & {
  id: string
  automation_id?: string | null
  flow_definition_id?: string | null
  flow_installation_id?: string | null
  flow_version_id?: string | null
  name: string
  description?: string | null
  trigger: FlowAutomationTriggerSummary
  actions: readonly AutomationActionLike[]
  created_at?: string
  updated_at?: string
  space_id?: string
  space_title?: string
  campaign_id?: string | null
  campaign_name?: string | null
  installation_count?: number
  healthy_installation_count?: number
  needs_setup_installation_count?: number
  unknown_installation_count?: number
  installations?: readonly FlowInstallationSummary[]
}

export type FlowAutomationContext = {
  space_id: string
  space_title: string
  campaign_id: string | null
  campaign_name: string | null
}

export type FlowAutomation = FlowAutomationStatusSummary & {
  id: string
  automation_id?: string | null
  flow_definition_id?: string | null
  flow_installation_id?: string | null
  flow_version_id?: string | null
  name: string
  description?: string | null
  trigger: AutomationTriggerLike
  actions: AutomationActionLike[]
  created_at?: string
  updated_at?: string
  created_by?: string | null
  space_id?: string
  space_title?: string
  campaign_id?: string | null
  campaign_name?: string | null
  installation_count?: number
  installations?: readonly FlowInstallationSummary[]
}

export type FlowAutomationPayload = Pick<
  FlowAutomation,
  'name' | 'description' | 'trigger' | 'actions'
>
