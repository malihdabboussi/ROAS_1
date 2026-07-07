import { describe, expect, it, vi } from 'vitest'
import { ArtifactFlowsService } from './artifact-flows.service'

function makeTarget(flow: Record<string, unknown>) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: flow, error: null })),
    update: vi.fn(() => query),
  }
  const supabase = {
    from: vi.fn(() => query),
  }
  return {
    query,
    target: {
      resolveUserId: vi.fn(() => 'user-1'),
      getUserClient: vi.fn(async () => supabase),
    },
  }
}

describe('ArtifactFlowsService', () => {
  it('does not directly publish flows that require backend route or schedule sync', async () => {
    const { target, query } = makeTarget({
      id: 'automation-1',
      name: 'Daily digest',
      is_draft: true,
      enabled: false,
      trigger: {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'daily', time: '09:00' },
        timezone: 'UTC',
      },
      actions: [{ type: 'add_comment', message_template: 'Daily note' }],
    })
    const handlers = new ArtifactFlowsService().getHandlers(target)

    const result = await handlers.publish_flow({
      space_id: 'space-1',
      automation_id: 'automation-1',
    })

    expect(result).toMatchObject({
      success: false,
      validation: { valid: true },
    })
    expect(JSON.stringify(result)).toContain(
      'requires the admin Flows API for schedule trigger next-fire calculation',
    )
    expect(query.update).not.toHaveBeenCalled()
  })

  it('does not directly publish webhook flows without backend endpoint validation', async () => {
    const { target, query } = makeTarget({
      id: 'automation-1',
      name: 'Inbound lead',
      is_draft: true,
      enabled: false,
      trigger: {
        type: 'webhook_received',
        webhook_endpoint_id: '9b5f88f7-f572-4ceb-8abe-4ec4476f8b6f',
      },
      actions: [{ type: 'create_task', title_template: '{{trigger.fields.customer_email}}' }],
    })
    const handlers = new ArtifactFlowsService().getHandlers(target)

    const result = await handlers.publish_flow({
      space_id: 'space-1',
      automation_id: 'automation-1',
    })

    expect(result).toMatchObject({
      success: false,
      validation: { valid: true },
    })
    expect(JSON.stringify(result)).toContain(
      'requires the admin Flows API for webhook endpoint validation',
    )
    expect(query.update).not.toHaveBeenCalled()
  })

  it('validates webhook trigger required endpoint id in draft payloads', async () => {
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      getUserClient: vi.fn(),
    }
    const handlers = new ArtifactFlowsService().getHandlers(target)

    const result = (await handlers.validate_flow_draft({
      name: 'Inbound lead',
      trigger: { type: 'webhook_received' },
      actions: [{ type: 'create_task', title_template: '{{trigger.payload}}' }],
    })) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      validation: {
        valid: false,
        errors: ['Trigger webhook_received is missing: webhook_endpoint_id.'],
      },
    })
  })

  it('creates flow drafts with space ownership and validation metadata', async () => {
    let insertedPayload: Record<string, unknown> | null = null
    const supabase = {
      from: vi.fn((table: string) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          insert: vi.fn((payload: Record<string, unknown>) => {
            insertedPayload = payload
            return chain
          }),
          maybeSingle: vi.fn(async () => ({
            data: { id: 'space-1', org_id: 'org-1', user_id: 'owner-1' },
            error: null,
          })),
          single: vi.fn(async () => ({
            data: { id: 'flow-1', ...insertedPayload },
            error: null,
          })),
        }
        return chain
      }),
    }
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      getUserClient: vi.fn(async () => supabase),
    }
    const handlers = new ArtifactFlowsService().getHandlers(target)

    const result = (await handlers.create_flow_draft(
      {
        space_id: 'space-1',
        name: 'Welcome flow',
        trigger: {
          type: 'schedule',
          schedule: { mode: 'preset', preset: 'daily', time: '09:00' },
          timezone: 'UTC',
        },
        actions: [{ type: 'add_comment', message_template: 'Welcome' }],
      },
      'session',
    )) as Record<string, any>

    expect(result.success).toBe(true)
    expect(result.flow).toMatchObject({ id: 'flow-1', name: 'Welcome flow' })
    expect(insertedPayload).toMatchObject({
      actions: [{ type: 'add_comment', message_template: 'Welcome' }],
      created_by: 'user-1',
      enabled: false,
      is_draft: true,
      name: 'Welcome flow',
      org_id: 'org-1',
      space_id: 'space-1',
      trigger: {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'daily', time: '09:00' },
        timezone: 'UTC',
      },
      user_id: 'owner-1',
    })
    expect(result.validation).toMatchObject({ valid: true })
  })
})
