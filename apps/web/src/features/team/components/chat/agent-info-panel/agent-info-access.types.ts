import type { AgentInfoPanelProps } from './agent-info-panel.types'

export type AgentInfoAccessTabProps = Pick<
  AgentInfoPanelProps,
  | 'selected'
  | 'selectedAgentKey'
  | 'setAgents'
  | 'hasBrain'
  | 'brainLoading'
  | 'brainError'
  | 'handleAddBrain'
  | 'setShowUpgradeModal'
> & {
  isEnterprise: boolean
  disabled?: boolean
  canAllowExtra?: boolean
  canSetTeam?: boolean
}
