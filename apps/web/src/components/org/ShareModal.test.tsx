import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { orgService, useOrgStore } from '@/lib/org'
import { createClient } from '@/lib/supabase/client'
import { ShareModal } from './ShareModal'

const orgServiceMocks = vi.hoisted(() => ({
  invite: vi.fn(),
  listBrainShares: vi.fn(),
  listCampaignPermissions: vi.fn(),
  listMembers: vi.fn(),
  removeBrainShare: vi.fn(),
  removeCampaignPermission: vi.fn(),
  upsertBrainShare: vi.fn(),
  upsertCampaignPermission: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/org/org-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/org/org-api')>()
  return {
    ...actual,
    orgService: orgServiceMocks,
  }
})

const backendGetMock = vi.mocked(backendGet)
const createClientMock = vi.mocked(createClient)
const orgServiceMock = vi.mocked(orgService)

function resetOrgStore() {
  useOrgStore.setState({
    activeOrgId: null,
    actualRole: null,
    myRole: null,
    roleOverride: null,
    memberships: [],
    isLoaded: false,
    isOrgOnly: false,
  })
}

describe('ShareModal', () => {
  beforeEach(() => {
    resetOrgStore()
    useOrgStore.setState({
      activeOrgId: 'org-1',
      actualRole: 'admin',
      myRole: 'admin',
      roleOverride: null,
      isLoaded: true,
    })
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              user_metadata: {
                avatar_url: 'https://avatar.test/meta.png',
              },
            },
          },
        })),
      },
    } as never)
    backendGetMock.mockResolvedValue({ avatar_url: 'https://avatar.test/profile.png' })
    orgServiceMock.listMembers.mockResolvedValue({
      success: true,
      members: [
        {
          id: 'member-owner',
          user_id: 'user-owner',
          role: 'owner',
          status: 'active',
          accepted_at: '2026-06-24T00:00:00.000Z',
          created_at: '2026-06-24T00:00:00.000Z',
          profiles: {
            id: 'user-owner',
            full_name: 'Owner User',
            avatar_url: null,
            email: 'owner@example.com',
          },
        },
        {
          id: 'member-ada',
          user_id: 'user-ada',
          role: 'editor',
          status: 'active',
          accepted_at: '2026-06-24T00:00:00.000Z',
          created_at: '2026-06-24T00:00:00.000Z',
          profiles: {
            id: 'user-ada',
            full_name: 'Ada Lovelace',
            avatar_url: null,
            email: 'ada@example.com',
          },
        },
      ],
    })
    orgServiceMock.listCampaignPermissions.mockResolvedValue({
      success: true,
      permissions: [
        {
          id: 'permission-1',
          org_member_id: 'member-ada',
          campaign_id: 'campaign-1',
          permission: 'edit',
          created_at: '2026-06-24T00:00:00.000Z',
          org_members: {
            id: 'member-ada',
            user_id: 'user-ada',
            role: 'editor',
            status: 'active',
            profiles: {
              full_name: 'Ada Lovelace',
              avatar_url: null,
              email: 'ada@example.com',
            },
          },
        },
      ],
    })
    orgServiceMock.upsertCampaignPermission.mockResolvedValue({
      success: true,
      permission: {},
    })
    orgServiceMock.removeCampaignPermission.mockResolvedValue({ success: true })
    orgServiceMock.invite.mockResolvedValue({
      success: true,
      invitation: {
        id: 'invitation-1',
        org_id: 'org-1',
        email: 'new@example.com',
        role: 'editor',
        status: 'pending',
        expires_at: '2026-06-25T00:00:00.000Z',
        created_at: '2026-06-24T00:00:00.000Z',
      },
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
    resetOrgStore()
  })

  it('loads campaign sharing, updates permissions, invites by email, and settles without render churn', async () => {
    const onClose = vi.fn()
    let commits = 0

    render(
      <Profiler id="share-modal" onRender={() => (commits += 1)}>
        <ShareModal
          open
          onClose={onClose}
          resourceType="campaign"
          resourceId="campaign-1"
          resourceName="Launch"
        />
      </Profiler>,
    )

    expect(await screen.findByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByText('Sharing campaign')).toBeTruthy()
    expect(orgServiceMock.listMembers).toHaveBeenCalledWith('org-1')
    expect(orgServiceMock.listCampaignPermissions).toHaveBeenCalledWith('org-1', 'campaign-1')

    fireEvent.click(screen.getByRole('button', { name: 'Full edit' }))
    fireEvent.click(await screen.findByRole('button', { name: 'View only' }))

    await waitFor(() => {
      expect(orgServiceMock.upsertCampaignPermission).toHaveBeenCalledWith(
        'org-1',
        'campaign-1',
        'member-ada',
        'view',
      )
    })

    fireEvent.change(screen.getByPlaceholderText('Invite by email'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() => {
      expect(orgServiceMock.invite).toHaveBeenCalledWith('org-1', {
        email: 'new@example.com',
        role: 'editor',
      })
    })
    expect(commits).toBeLessThan(35)
  })
})
