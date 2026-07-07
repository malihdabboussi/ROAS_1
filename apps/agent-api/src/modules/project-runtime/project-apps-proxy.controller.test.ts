import { GUARDS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it, vi } from 'vitest'
import { AuthGuard, OrgContextGuard, OrgRoleGuard, type RequestScope } from '@vibey/api-shared'
import { ProjectAppsProxyController } from './controllers/project-apps-proxy.controller'
import { ProjectRuntimeRepository } from './repositories/project-runtime.repository'
import { ProjectAppsProxyService } from './services/project-apps-proxy.service'

function createProjectQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return query
}

function createResponse() {
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  }
  return res
}

const personalScope: RequestScope = {
  userId: 'user-1',
  orgId: null,
  orgRole: null,
}

describe('ProjectAppsProxyController', () => {
  it('requires authenticated scoped access for restart mutations', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ProjectAppsProxyController) ?? []

    expect(guards).toEqual(expect.arrayContaining([AuthGuard, OrgContextGuard, OrgRoleGuard]))
  })

  it('checks project ownership before marking a project as restarting', async () => {
    const query = createProjectQuery({ data: null, error: null })
    const update = vi.fn()
    const supabase = {
      from: vi.fn(() => ({
        ...query,
        update,
      })),
    }
    const service = new ProjectAppsProxyService(
      { get: vi.fn() } as never,
      new ProjectRuntimeRepository({ client: supabase } as never),
    )
    const controller = new ProjectAppsProxyController(service)
    const res = createResponse()

    await controller.restart(personalScope, 'project-1', res as never)

    expect(query.eq).toHaveBeenCalledWith('id', 'project-1')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(query.is).toHaveBeenCalledWith('org_id', null)
    expect(update).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
  })
})
