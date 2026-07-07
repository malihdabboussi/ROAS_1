import { describe, expect, it } from 'vitest'
import { FLOW_WORKFLOW_CAPABILITIES } from '@vibey/api-shared/types/workflow-capabilities'
import { ACTIVE_PROMPTMODE_ACTIONS } from './artifact-action-lifecycle'
import {
  AGENT_ACTION_WORKFLOW_CAPABILITIES,
  ARTIFACT_WORKFLOW_CAPABILITY_GRAPH,
  getArtifactWorkflowCapability,
  searchArtifactWorkflowCapabilities,
} from './artifact-workflow-capability-graph'

describe('artifact workflow capability graph', () => {
  it('combines compile-ready Flow capabilities with active agent action candidates', () => {
    expect(AGENT_ACTION_WORKFLOW_CAPABILITIES).toHaveLength(ACTIVE_PROMPTMODE_ACTIONS.length)
    expect(ARTIFACT_WORKFLOW_CAPABILITY_GRAPH).toHaveLength(
      FLOW_WORKFLOW_CAPABILITIES.length + ACTIVE_PROMPTMODE_ACTIONS.length,
    )

    expect(getArtifactWorkflowCapability('action.create_task')).toMatchObject({
      id: 'action.create_task',
      execution: { executor: 'space_automation', status: 'available' },
      contract_quality: 'catalog_fields_only',
    })
    expect(getArtifactWorkflowCapability('trigger.webhook_received')).toMatchObject({
      id: 'trigger.webhook_received',
      execution: { executor: 'space_automation', status: 'available' },
      input_schema: {
        required_fields: ['webhook_endpoint_id'],
      },
    })
  })

  it('marks active agent actions as schema-backed candidates that need a Flow executor bridge', () => {
    const capability = getArtifactWorkflowCapability('agent_action.create_task')

    expect(capability).toMatchObject({
      id: 'agent_action.create_task',
      source_capability_id: 'create_task',
      kind: 'action',
      contract_quality: 'schema_backed',
      input_schema: {
        source: 'agent_action_schema',
        required_fields: ['title'],
      },
      execution: {
        executor: 'agent_action',
        status: 'needs_executor',
      },
      side_effect: 'platform_write',
      approval_policy: 'user_review',
    })
    expect(capability?.contract_gaps).toContain('flow_runtime_executor_bridge')
    expect(capability?.ui_schema.fields).toContainEqual(
      expect.objectContaining({ field: 'title', required: true, control: 'text' }),
    )
  })

  it('preserves one-of action schema requirements for blueprint authorship', () => {
    const capability = getArtifactWorkflowCapability('agent_action.attach_funnel_asset')

    expect(capability?.input_schema.required_fields).toContainEqual(['media_asset_id', 'asset_ref'])
    expect(capability?.ui_schema.fields).toContainEqual(
      expect.objectContaining({
        field: 'media_asset_id',
        required: false,
        required_group: ['media_asset_id', 'asset_ref'],
      }),
    )
    expect(capability?.ui_schema.fields).toContainEqual(
      expect.objectContaining({
        field: 'asset_ref',
        required: false,
        required_group: ['media_asset_id', 'asset_ref'],
      }),
    )
  })

  it('searches across labels, schema fields, and categories with bounded pagination', () => {
    const result = searchArtifactWorkflowCapabilities({ query: 'task', limit: 8 })
    const exactResult = searchArtifactWorkflowCapabilities({ query: 'agent_action.create_task' })

    expect(result.results).toHaveLength(8)
    expect(result.total).toBeGreaterThan(8)
    expect(result.next_cursor).toBe('8')
    expect(result.flow_capability_total).toBe(FLOW_WORKFLOW_CAPABILITIES.length)
    expect(result.agent_action_total).toBe(ACTIVE_PROMPTMODE_ACTIONS.length)
    expect(exactResult.results.some((item) => item.id === 'agent_action.create_task')).toBe(true)
  })

  it('classifies Flow control-plane actions separately from workflow runtime steps', () => {
    expect(getArtifactWorkflowCapability('agent_action.create_flow_plan')).toMatchObject({
      kind: 'control',
      execution: { executor: 'agent_action', status: 'available' },
      side_effect: 'platform_write',
    })
  })
})
