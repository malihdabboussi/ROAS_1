export type OnboardingOverallStatus = 'working' | 'ready' | 'recoverable_error'

export type OnboardingStep =
  | 'joining_workspace'
  | 'building_team'
  | 'preparing_workspace'
  | 'turning_things_on'
  | 'running_final_check'

export type OnboardingRetryAction = 'provision_machine' | 'ensure_running' | 'onboard_org' | null

export interface OnboardingStatusResponse {
  overall: OnboardingOverallStatus
  current_step: OnboardingStep
  runtime: {
    ready: boolean
    machine_id: string | null
    state: string | null
  }
  org: {
    ready: boolean
    active_org_id: string | null
  }
  retry_action: OnboardingRetryAction
}
