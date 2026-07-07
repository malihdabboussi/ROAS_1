import { checkRuleFieldsComplete } from '@/lib/flows/automation-publishable'
import type { FlowAutomationSummary } from '../types/flow-automation.types'

export function flowNeedsAttention(
  flow: Pick<FlowAutomationSummary, 'name' | 'trigger' | 'actions'>,
): boolean {
  return !checkRuleFieldsComplete(flow.name, flow.trigger, flow.actions).ok
}
