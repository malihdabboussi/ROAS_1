import { describe, expect, it } from 'vitest'
import { buildLoopFlowsAwarenessContext } from './flows-loop-awareness-context'

describe('buildLoopFlowsAwarenessContext', () => {
  it('formats the current Flow page state without exposing manual session IDs', () => {
    const context = buildLoopFlowsAwarenessContext({
      spaceId: null,
      spaceName: 'Space',
      activeTab: 'browse',
      viewMode: 'grid',
      selectedFlowId: 'flow-1',
      selectedFlowName: 'Welcome lead',
      attachedFlowId: 'automation-1',
      attachedFlowDefinitionId: 'definition-1',
      attachedFlowInstallationId: 'installation-1',
      attachedFlowName: 'Reusable flow',
      attachedFlowSpaceId: 'space-1',
      attachedFlowSpaceName: 'Hadassah Limassol',
      attachedFlowInstallationCount: 2,
      flowCount: 3,
      validationValid: false,
      hasActiveBuildSession: true,
      buildSessionStatus: 'intake',
      hasBuildPlan: false,
      buildRequiredNextAction: 'draft_flow_plan',
      buildInspectorStage: 'target_selected',
    })

    expect(context).toContain('[Flows Context]')
    expect(context).toContain('space_id: none')
    expect(context).toContain('selected_flow_name: Welcome lead')
    expect(context).toContain('attached_flow_id: automation-1')
    expect(context).toContain('attached_flow_definition_id: definition-1')
    expect(context).toContain('attached_flow_installation_id: installation-1')
    expect(context).toContain('attached_flow_name: Reusable flow')
    expect(context).toContain('attached_flow_space_id: space-1')
    expect(context).toContain('attached_flow_space_name: Hadassah Limassol')
    expect(context).toContain('attached_flow_installation_count: 2')
    expect(context).toContain('validation_valid: no')
    expect(context).toContain('flow_build_session: server_managed_active')
    expect(context).toContain('flow_build_session_status: intake')
    expect(context).toContain('flow_build_has_plan: no')
    expect(context).toContain('flow_build_required_next_action: draft_flow_plan')
    expect(context).toContain('flow_build_inspector_stage: target_selected')
    expect(context).toContain('Omit session_id during normal plan continuation actions')
    expect(context).toContain(
      'If flow_build_required_next_action is draft_flow_plan, call create_flow_plan',
    )
    expect(context).toContain('do not validate, compile, or evaluate until structured steps exist')
    expect(context).toContain('Inspect workflow_capabilities from get_flow_build_context')
    expect(context).toContain('agent_action.* entries are platform-capable candidates')
  })

  it('tells Loop to compile when the server-required next action is compile_flow_plan', () => {
    const context = buildLoopFlowsAwarenessContext({
      spaceId: 'space-1',
      spaceName: 'Space',
      activeTab: 'build',
      viewMode: 'list',
      selectedFlowId: null,
      selectedFlowName: null,
      flowCount: 1,
      validationValid: null,
      hasActiveBuildSession: true,
      buildSessionStatus: 'validated',
      hasBuildPlan: true,
      buildRequiredNextAction: 'compile_flow_plan',
      buildInspectorStage: 'validated',
    })

    expect(context).toContain('flow_build_session_status: validated')
    expect(context).toContain('flow_build_has_plan: yes')
    expect(context).toContain('flow_build_required_next_action: compile_flow_plan')
    expect(context).toContain(
      'If flow_build_required_next_action is compile_flow_plan, call compile_flow_plan.',
    )
  })
})
