import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { GraphRequestRepository } from '../repositories/graph-request.repository'
import { GraphRequestService } from '../services/graph-request.service'
import { GraphController } from './graph.controller'

const user = { id: 'user-1', email: 'user@example.com' }
const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' as const }

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return query
}

function createSupabase(queriesByTable: Record<string, Array<Record<string, any>>> = {}) {
  return {
    from: vi.fn((table: string) => {
      const query = queriesByTable[table]?.shift()
      if (query) return query
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

function createController() {
  const graphService = {
    buildGraph: vi.fn().mockResolvedValue({ nodes: [], connections: [], stats: {} }),
    buildSkGraph: vi.fn().mockResolvedValue({ nodes: [], connections: [], stats: {} }),
  }
  const brainPermissions = {
    assertCanViewBrain: vi.fn().mockResolvedValue('view'),
  }

  return {
    controller: new GraphController(
      new GraphRequestService(
        graphService as never,
        brainPermissions as never,
        new GraphRequestRepository(),
      ),
    ),
    graphService,
    brainPermissions,
  }
}

describe('GraphController', () => {
  it('rejects org viewers before loading graph data', async () => {
    const { controller, graphService, brainPermissions } = createController()
    const supabase = createSupabase()

    await expect(
      controller.getGraph(
        supabase as never,
        user,
        { userId: 'user-1', orgId: 'org-1', orgRole: 'viewer' },
        undefined,
        'brain-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(brainPermissions.assertCanViewBrain).not.toHaveBeenCalled()
    expect(graphService.buildGraph).not.toHaveBeenCalled()
    expect(graphService.buildSkGraph).not.toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('loads non-agent brain scope and builds the memory graph for brain_id routes', async () => {
    const brainQuery = createQuery({ data: { scope: 'customer' }, error: null })
    const supabase = createSupabase({ ns_brains: [brainQuery] })
    const { controller, graphService, brainPermissions } = createController()

    await controller.getGraph(
      supabase as never,
      user,
      scope,
      undefined,
      ' brain-1 ',
      '25',
      '0.4',
      'fact',
    )

    expect(brainPermissions.assertCanViewBrain).toHaveBeenCalledWith(
      supabase,
      'user-1',
      scope,
      'brain-1',
    )
    expect(brainQuery.select).toHaveBeenCalledWith('scope')
    expect(brainQuery.eq).toHaveBeenCalledWith('id', 'brain-1')
    expect(graphService.buildGraph).toHaveBeenCalledWith(supabase, {
      owner_id: 'user-1',
      org_id: 'org-1',
      brain_id: 'brain-1',
      limit: 25,
      node_window_capped: false,
      min_significance: 0.4,
      memory_type: 'fact',
    })
    expect(graphService.buildSkGraph).not.toHaveBeenCalled()
  })

  it('loads agent brain scope and builds the SK graph for brain_id routes', async () => {
    const brainQuery = createQuery({ data: { scope: 'agent' }, error: null })
    const supabase = createSupabase({ ns_brains: [brainQuery] })
    const { controller, graphService } = createController()

    await controller.getGraph(supabase as never, user, scope, undefined, 'brain-1', '50')

    expect(graphService.buildSkGraph).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'brain-1',
      'org-1',
      50,
      false,
    )
    expect(graphService.buildGraph).not.toHaveBeenCalled()
  })

  it('builds the owner graph directly when no brain_id is provided', async () => {
    const supabase = createSupabase()
    const { controller, graphService, brainPermissions } = createController()

    await controller.getGraph(supabase as never, user, scope, 'agent-1', undefined, '10')

    expect(brainPermissions.assertCanViewBrain).not.toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalled()
    expect(graphService.buildGraph).toHaveBeenCalledWith(supabase, {
      agent_id: 'agent-1',
      owner_id: 'user-1',
      org_id: 'org-1',
      limit: 10,
      node_window_capped: false,
      min_significance: undefined,
      memory_type: undefined,
    })
  })
})
