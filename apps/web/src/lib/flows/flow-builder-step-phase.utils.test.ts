import { describe, expect, it } from 'vitest'
import { Zap } from 'lucide-react'
import type { AutomationTrigger } from '@/features/spaces/types/space-schema'
import type { FlowBuilderCanvasStep } from './flow-builder-canvas.utils'
import {
  isFlowBuilderStepConfigureComplete,
  resolveFlowBuilderStepConfigurationStatus,
} from './flow-builder-step-phase.utils'

const triggerStep: FlowBuilderCanvasStep = {
  id: 'trigger',
  stepNumber: 1,
  label: 'Trigger',
  config: '',
  typeLabel: 'Trigger',
  badgeVariant: 'muted',
  icon: Zap,
  selection: { kind: 'trigger' },
}

const actionStep: FlowBuilderCanvasStep = {
  id: 'action-0',
  stepNumber: 2,
  label: 'Run agent',
  config: '',
  typeLabel: 'Agent',
  badgeVariant: 'green',
  icon: Zap,
  selection: { kind: 'action', index: 0 },
}

describe('resolveFlowBuilderStepConfigurationStatus', () => {
  it('marks placeholder triggers as empty', () => {
    expect(
      resolveFlowBuilderStepConfigurationStatus({
        step: { ...triggerStep, isPlaceholder: true },
        trigger: { type: 'choose_action' },
        actions: [],
      }),
    ).toBe('empty')
  })

  it('marks configured fathom trigger as complete when tested', () => {
    expect(
      resolveFlowBuilderStepConfigurationStatus({
        step: triggerStep,
        trigger: { type: 'external_fathom_recording_ready' },
        actions: [],
        tested: true,
      }),
    ).toBe('complete')
  })

  it('marks agent action missing prompt as needs_configure', () => {
    const input = {
      step: actionStep,
      trigger: { type: 'external_fathom_recording_ready' } satisfies AutomationTrigger,
      actions: [{ type: 'send_to_agent' as const, agent_key: 'vibey', prompt_template: '' }],
    }
    expect(isFlowBuilderStepConfigureComplete(input)).toBe(false)
    expect(resolveFlowBuilderStepConfigurationStatus(input)).toBe('needs_configure')
  })
})
