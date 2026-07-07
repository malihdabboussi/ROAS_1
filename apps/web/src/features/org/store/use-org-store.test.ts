import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { useOrgStore, type OrgMembership } from './use-org-store'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)

function membership(overrides: Partial<OrgMembership> = {}): OrgMembership {
  const orgId = overrides.org_id ?? 'org-1'
  return {
    id: `membership-${orgId}`,
    role: 'admin',
    status: 'active',
    org_id: orgId,
    organizations: {
      id: orgId,
      name: `Org ${orgId}`,
      slug: orgId,
      avatar_url: null,
      account_type: 'workspace',
      status: 'active',
    },
    ...overrides,
  }
}

function resetOrgStore() {
  useOrgStore.setState({
    activeOrgId: null,
    actualRole: null,
    myRole: null,
    roleOverride: null,
    memberships: [],
    isLoaded: false,
    isOrgOnly: false,
    defaultAccountMode: 'personal',
    defaultOrgId: null,
  })
}

describe('org context store', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    sessionStorage.clear()
    resetOrgStore()
  })

  it('preserves active org role override when memberships refresh', () => {
    useOrgStore
      .getState()
      .setMemberships([
        membership({ org_id: 'org-1', role: 'admin' }),
        membership({ org_id: 'org-2', role: 'viewer' }),
      ])
    useOrgStore.getState().setActiveOrg('org-1')
    useOrgStore.getState().setRoleOverride('viewer')

    useOrgStore
      .getState()
      .setMemberships([
        membership({ org_id: 'org-1', role: 'owner' }),
        membership({ org_id: 'org-2', role: 'editor' }),
      ])

    expect(useOrgStore.getState()).toMatchObject({
      activeOrgId: 'org-1',
      actualRole: 'owner',
      myRole: 'viewer',
      roleOverride: 'viewer',
      isLoaded: true,
    })
  })

  it('fetches memberships without org headers and selects the first org for org-only accounts', async () => {
    backendGetMock.mockResolvedValueOnce({ account_mode: 'org_only' }).mockResolvedValueOnce({
      success: true,
      memberships: [
        membership({ org_id: 'org-primary', role: 'creator' }),
        membership({ org_id: 'org-secondary', role: 'viewer' }),
      ],
    })

    await useOrgStore.getState().fetchMemberships({ preferProfileDefault: true })

    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/profile', { orgId: null })
    expect(backendGetMock).toHaveBeenNthCalledWith(2, '/api/org/my', { orgId: null })
    expect(useOrgStore.getState()).toMatchObject({
      activeOrgId: 'org-primary',
      actualRole: 'creator',
      myRole: 'creator',
      roleOverride: null,
      isLoaded: true,
      isOrgOnly: true,
      defaultAccountMode: 'personal',
      defaultOrgId: null,
    })
  })

  it('selects the saved default org for personal accounts on normal load', async () => {
    backendGetMock
      .mockResolvedValueOnce({
        account_mode: 'personal',
        default_account_mode: 'org',
        default_org_id: 'org-secondary',
      })
      .mockResolvedValueOnce({
        success: true,
        memberships: [
          membership({ org_id: 'org-primary', role: 'creator' }),
          membership({ org_id: 'org-secondary', role: 'viewer' }),
        ],
      })

    await useOrgStore.getState().fetchMemberships({ preferProfileDefault: true })

    expect(useOrgStore.getState()).toMatchObject({
      activeOrgId: 'org-secondary',
      actualRole: 'viewer',
      myRole: 'viewer',
      roleOverride: null,
      defaultAccountMode: 'org',
      defaultOrgId: 'org-secondary',
      isLoaded: true,
      isOrgOnly: false,
    })
  })

  it('keeps an explicit url org selection ahead of the saved default', async () => {
    useOrgStore.getState().setActiveOrg('org-primary')
    backendGetMock
      .mockResolvedValueOnce({
        account_mode: 'personal',
        default_account_mode: 'org',
        default_org_id: 'org-secondary',
      })
      .mockResolvedValueOnce({
        success: true,
        memberships: [
          membership({ org_id: 'org-primary', role: 'creator' }),
          membership({ org_id: 'org-secondary', role: 'viewer' }),
        ],
      })

    await useOrgStore.getState().fetchMemberships({ preferProfileDefault: false })

    expect(useOrgStore.getState()).toMatchObject({
      activeOrgId: 'org-primary',
      actualRole: 'creator',
      myRole: 'creator',
      defaultAccountMode: 'org',
      defaultOrgId: 'org-secondary',
      isLoaded: true,
    })
  })

  it('preserves the current session org when the saved default is personal', async () => {
    useOrgStore.setState({
      activeOrgId: 'org-primary',
      actualRole: 'admin',
      myRole: 'viewer',
      roleOverride: 'viewer',
    })
    backendGetMock
      .mockResolvedValueOnce({
        account_mode: 'personal',
        default_account_mode: 'personal',
        default_org_id: null,
      })
      .mockResolvedValueOnce({
        success: true,
        memberships: [
          membership({ org_id: 'org-primary', role: 'creator' }),
          membership({ org_id: 'org-secondary', role: 'viewer' }),
        ],
      })

    await useOrgStore.getState().fetchMemberships({ preferProfileDefault: true })

    expect(useOrgStore.getState()).toMatchObject({
      activeOrgId: 'org-primary',
      actualRole: 'creator',
      myRole: 'viewer',
      roleOverride: 'viewer',
      defaultAccountMode: 'personal',
      defaultOrgId: null,
      isLoaded: true,
    })
  })
})
