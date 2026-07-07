import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrgStore, type OrgMembership } from '@/lib/org'
import { transferService } from '@/lib/transfer'
import { TransferDialog } from './TransferDialog'

vi.mock('@/lib/transfer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/transfer')>()
  return {
    ...actual,
    transferService: {
      execute: vi.fn(),
      preview: vi.fn(),
    },
  }
})

const previewMock = vi.mocked(transferService.preview)
const executeMock = vi.mocked(transferService.execute)

function membership(overrides: Partial<OrgMembership> = {}): OrgMembership {
  const orgId = overrides.org_id ?? 'org-source'
  return {
    id: `membership-${orgId}`,
    role: 'admin',
    status: 'active',
    org_id: orgId,
    organizations: {
      id: orgId,
      name: orgId === 'org-source' ? 'Source Org' : 'Target Org',
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
  })
}

describe('TransferDialog', () => {
  beforeEach(() => {
    previewMock.mockResolvedValue({
      success: true,
      preview: {
        entity: { id: 'campaign-1', name: 'Launch Campaign', type: 'campaign' },
        source_context: { org_id: 'org-source' },
        target_context: { org_id: 'org-target' },
        mode: 'copy',
        children: {
          conversations: 1,
          offers: 2,
        },
        warnings: [],
        linked_resources: {
          contacts: 0,
          domains: [],
          email_domains: [],
        },
      },
    })
    executeMock.mockResolvedValue({
      success: true,
      results: [
        {
          success: true,
          entity_id: 'campaign-1',
          mode: 'copy',
          transferred: {},
        },
      ],
    })
    resetOrgStore()
    useOrgStore
      .getState()
      .setMemberships([
        membership({ org_id: 'org-source', role: 'admin' }),
        membership({ org_id: 'org-target', role: 'creator' }),
      ])
    useOrgStore.getState().setActiveOrg('org-source')
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    previewMock.mockReset()
    executeMock.mockReset()
    resetOrgStore()
  })

  it('previews and executes a campaign copy without render churn', async () => {
    const onTransferComplete = vi.fn()
    let commits = 0

    render(
      <Profiler id="transfer-dialog" onRender={() => (commits += 1)}>
        <TransferDialog
          open
          onClose={vi.fn()}
          entityType="campaign"
          entityId="campaign-1"
          entityName="Launch Campaign"
          initialMode="copy"
          onTransferComplete={onTransferComplete}
        />
      </Profiler>,
    )

    expect(screen.getByText('Launch Campaign')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Target Org' }))

    await waitFor(() => {
      expect(previewMock).toHaveBeenCalledWith({
        entity_type: 'campaign',
        entity_id: 'campaign-1',
        artifact_table: undefined,
        target_context: { org_id: 'org-target' },
        mode: 'copy',
      })
    })

    expect(await screen.findByText('Offers')).toBeTruthy()
    expect(screen.getByText('Conversations')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Copy Campaign' }))

    await waitFor(() => {
      expect(executeMock).toHaveBeenCalledWith({
        entity_type: 'campaign',
        entity_ids: ['campaign-1'],
        artifact_table: undefined,
        target_context: { org_id: 'org-target' },
        mode: 'copy',
        options: undefined,
      })
    })
    expect(onTransferComplete).toHaveBeenCalledTimes(1)
    expect(commits).toBeLessThan(20)
  })
})
