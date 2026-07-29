import type { ExecutionContext } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { OrgContextGuard } from './org-context.guard'

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext
}

function createServiceClient(membership: Record<string, unknown> | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: membership, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return {
    client: {
      from: vi.fn().mockReturnValue(query),
    },
  }
}

describe('OrgContextGuard AI data access', () => {
  it('enables organization-wide data access for an active owner', async () => {
    const request = {
      headers: { 'x-org-id': 'org-1' },
      user: { id: 'user-1' },
    }
    const serviceClient = createServiceClient({
      id: 'member-1',
      role: 'owner',
      status: 'active',
      ai_data_admin: false,
    })

    await new OrgContextGuard(serviceClient as never).canActivate(createContext(request))

    expect(request).toMatchObject({
      orgId: 'org-1',
      orgRole: 'owner',
      orgMemberId: 'member-1',
      organizationWideDataAccess: true,
    })
  })

  it('enables organization-wide data access for an explicitly authorized member', async () => {
    const request = {
      headers: { 'x-org-id': 'org-1' },
      user: { id: 'user-2' },
    }
    const serviceClient = createServiceClient({
      id: 'member-2',
      role: 'admin',
      status: 'active',
      ai_data_admin: true,
    })

    await new OrgContextGuard(serviceClient as never).canActivate(createContext(request))

    expect(request).toMatchObject({
      orgMemberId: 'member-2',
      organizationWideDataAccess: true,
    })
  })

  it('keeps a regular active member scoped to attached and normally authorized data', async () => {
    const request = {
      headers: { 'x-org-id': 'org-1' },
      user: { id: 'user-3' },
    }
    const serviceClient = createServiceClient({
      id: 'member-3',
      role: 'admin',
      status: 'active',
      ai_data_admin: false,
    })

    await new OrgContextGuard(serviceClient as never).canActivate(createContext(request))

    expect(request).toMatchObject({
      orgMemberId: 'member-3',
      organizationWideDataAccess: false,
    })
  })

  it('disables organization-wide data access in personal context', async () => {
    const request = {
      headers: {},
      user: { id: 'user-1' },
    }
    const serviceClient = createServiceClient(null)

    await new OrgContextGuard(serviceClient as never).canActivate(createContext(request))

    expect(request).toMatchObject({
      orgId: null,
      orgRole: null,
      orgMemberId: null,
      organizationWideDataAccess: false,
    })
  })
})
