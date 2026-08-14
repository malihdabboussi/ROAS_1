import { describe, expect, it } from 'vitest'
import {
  FLOW_CAPABILITY_CATALOG,
  getFlowCapability,
  searchFlowCapabilities,
} from './flow-capabilities'

describe('flow capabilities catalog', () => {
  it('returns bounded, paginated results instead of a flat full catalog', () => {
    const result = searchFlowCapabilities({ limit: 5 })

    expect(result.results).toHaveLength(5)
    expect(result.total).toBeGreaterThan(5)
    expect(result.limit).toBe(5)
    expect(result.next_cursor).toBe('5')
  })

  it('filters by query, kind, and category', () => {
    const result = searchFlowCapabilities({
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

  it('looks up a capability by stable id and exposes required fields', () => {
    const capability = getFlowCapability('action.add_comment')

    expect(capability).toMatchObject({
      id: 'action.add_comment',
      kind: 'action',
      type: 'add_comment',
      requiredFields: ['message_template'],
    })
    expect(getFlowCapability('action.custom_reusable_step')).toBeNull()
    expect(FLOW_CAPABILITY_CATALOG.some((item) => item.id.includes('custom_reusable'))).toBe(false)
  })

  it('exposes agent output and completion controls for agent-run flow steps', () => {
    const capability = getFlowCapability('action.send_to_agent')

    expect(capability).toMatchObject({
      id: 'action.send_to_agent',
      requiredFields: ['agent_key', 'prompt_template'],
    })
    expect(capability?.optionalFields).toEqual(
      expect.arrayContaining(['output_type', 'completed_status', 'continuation']),
    )
    expect(capability?.example).toMatchObject({
      type: 'send_to_agent',
      output_type: 'document_artifact',
      continuation: 'after_task_completes',
      completed_status: 'in_review',
    })
  })

  it('exposes first-party webhook triggers with the endpoint id contract', () => {
    const capability = getFlowCapability('trigger.webhook_received')

    expect(capability).toMatchObject({
      id: 'trigger.webhook_received',
      kind: 'trigger',
      type: 'webhook_received',
      category: 'Webhooks',
      requiredFields: ['webhook_endpoint_id'],
      example: {
        type: 'webhook_received',
        webhook_endpoint_id: 'webhook_endpoint_id',
      },
    })
  })

  it('describes Slack sender analysis separately from recipient and Person Brain scope', () => {
    const capability = getFlowCapability('action.observe_slack_team')

    expect(capability?.description).toContain('every non-Ignored sender')
    expect(capability?.description).toContain('person_ids restricts Active delivery')
  })
})
