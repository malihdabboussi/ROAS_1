import { describe, expect, it } from 'vitest'
import { FLOW_CAPABILITY_CATALOG } from './flow-capabilities'
import {
  FLOW_WORKFLOW_CAPABILITIES,
  getWorkflowCapability,
  searchWorkflowCapabilities,
} from './workflow-capabilities'

describe('workflow capabilities catalog', () => {
  it('wraps every current flow capability without changing stable ids', () => {
    expect(FLOW_WORKFLOW_CAPABILITIES).toHaveLength(FLOW_CAPABILITY_CATALOG.length)
    expect(getWorkflowCapability('action.add_comment')).toMatchObject({
      id: 'action.add_comment',
      source_capability_id: 'action.add_comment',
      contract_quality: 'catalog_fields_only',
      input_schema: {
        source: 'flow_capability_catalog',
        required_fields: ['message_template'],
      },
      ui_schema: {
        source: 'derived_default',
      },
    })
  })

  it('returns bounded, paginated workflow capabilities', () => {
    const result = searchWorkflowCapabilities({ limit: 5 })

    expect(result.results).toHaveLength(5)
    expect(result.total).toBeGreaterThan(5)
    expect(result.limit).toBe(5)
    expect(result.next_cursor).toBe('5')
  })

  it('marks schedule triggers as event sources with schedule UI controls', () => {
    const capability = getWorkflowCapability('trigger.schedule')

    expect(capability).toMatchObject({
      kind: 'trigger',
      side_effect: 'event_source',
      approval_policy: 'none',
    })
    expect(capability?.ui_schema.fields).toContainEqual({
      field: 'schedule',
      label: 'Schedule',
      required: true,
      control: 'schedule_builder',
    })
  })

  it('marks webhook triggers as compile-ready event sources with endpoint picker UI', () => {
    const capability = getWorkflowCapability('trigger.webhook_received')

    expect(capability).toMatchObject({
      kind: 'trigger',
      type: 'webhook_received',
      execution: {
        executor: 'space_automation',
        status: 'available',
      },
      side_effect: 'event_source',
      approval_policy: 'none',
    })
    expect(capability?.ui_schema.fields).toContainEqual({
      field: 'webhook_endpoint_id',
      label: 'Webhook Endpoint Id',
      required: true,
      control: 'resource_picker',
    })
  })

  it('marks external communication actions for user review', () => {
    const capability = getWorkflowCapability('action.send_email')

    expect(capability).toMatchObject({
      kind: 'action',
      side_effect: 'external_communication',
      approval_policy: 'user_review',
      input_schema: {
        required_fields: ['tool_slug', 'connected_account_id', 'to'],
        optional_fields: expect.arrayContaining(['subject_template', 'body_template']),
      },
    })
    expect(capability?.ui_schema.fields).toContainEqual({
      field: 'to',
      label: 'To',
      required: true,
      control: 'text',
    })
  })

  it('filters by query, kind, and category', () => {
    const result = searchWorkflowCapabilities({
      query: 'status',
      kind: 'trigger',
      category: 'Tasks',
      limit: 10,
    })

    expect(result.results.length).toBeGreaterThan(0)
    expect(result.results.every((capability) => capability.kind === 'trigger')).toBe(true)
    expect(result.results.every((capability) => capability.category === 'Tasks')).toBe(true)
    expect(result.results.some((capability) => capability.id === 'trigger.status_change')).toBe(
      true,
    )
  })

  it('returns null for unknown workflow capabilities', () => {
    expect(getWorkflowCapability('action.custom_reusable_step')).toBeNull()
  })
})
