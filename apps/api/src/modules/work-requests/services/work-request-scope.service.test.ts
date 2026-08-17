import { describe, expect, it, vi } from 'vitest'
import type { WorkRequestDraftRow } from '../repositories/work-request.repository'
import { WorkRequestScopeService } from './work-request-scope.service'

describe('WorkRequestScopeService', () => {
  it('uses the canonical campaign org even when the signed connection is personal', async () => {
    const repository = {
      listCampaignOptions: vi.fn().mockResolvedValue([
        {
          id: 'campaign-1',
          user_id: 'user-1',
          org_id: 'org-1',
          name: 'Acme',
        },
      ]),
      listSpaceOptions: vi.fn().mockResolvedValue([
        {
          id: 'general-1',
          campaign_id: 'campaign-1',
          user_id: 'user-1',
          org_id: 'org-1',
          schema: {
            custom_data: {
              space_role: 'general',
              page_grader_client_id: 'client-1',
            },
          },
        },
        {
          id: 'campaign-space-1',
          campaign_id: 'campaign-1',
          user_id: 'user-1',
          org_id: 'org-1',
          schema: {
            custom_data: {
              space_role: 'client_campaign',
              page_grader_campaign_id: 'external-campaign-1',
            },
          },
        },
      ]),
    }
    const sync = {
      authorizeWebhookClient: vi.fn().mockResolvedValue([
        {
          userId: 'user-1',
          orgId: null,
          clientId: 'client-1',
          entry: { campaign_id: 'campaign-1', space_id: 'general-1' },
        },
      ]),
    }
    const service = new WorkRequestScopeService(
      repository as never,
      sync as never,
      {
        listAssignees: vi.fn(),
      } as never,
    )

    await expect(
      service.resolveIntakeScope('secret', 'client-1', 'Acme', 'external-campaign-1'),
    ).resolves.toMatchObject({
      ownerOrgId: 'org-1',
      generalSpace: { id: 'general-1' },
      campaignSpace: { id: 'campaign-space-1' },
    })
  })

  it('loads only mapped names and IDs from the signed connection scope', async () => {
    const repository = {
      listConnectionScopeRows: vi.fn().mockResolvedValue([
        {
          org_id: null,
          metadata: {
            client_scope_map: {
              'client-1': {
                campaign_id: 'campaign-1',
                campaign_name: 'Acme',
                space_id: 'general-1',
              },
            },
          },
        },
      ]),
      listCampaignOptions: vi
        .fn()
        .mockResolvedValue([
          { id: 'campaign-1', name: 'Acme', user_id: 'user-1', org_id: 'org-1' },
        ]),
      listSpaceOptions: vi.fn().mockResolvedValue([
        {
          id: 'campaign-space-1',
          title: 'Launch',
          campaign_id: 'campaign-1',
          user_id: 'user-1',
          org_id: 'org-1',
          schema: {
            custom_data: {
              space_role: 'client_campaign',
              page_grader_campaign_id: 'external-campaign-1',
            },
          },
        },
      ]),
      listOrgTeamMembers: vi.fn().mockResolvedValue([{ id: 'u-org', name: 'Org Only' }]),
    }
    const pageGraderApi = {
      listAssignees: vi.fn().mockResolvedValue({
        assignees: [
          { id: 'pg-1', name: 'Carol Garcia' },
          { id: 'pg-2', name: 'Dylan' },
          { id: 'pg-3', name: 'Jaime' },
        ],
      }),
    }
    const service = new WorkRequestScopeService(
      repository as never,
      {} as never,
      pageGraderApi as never,
    )
    const draft = {
      owner_user_id: 'user-1',
      owner_org_id: 'org-1',
      routing: { connection_org_id: null },
    } as WorkRequestDraftRow

    await expect(service.loadScopedOptions(draft)).resolves.toEqual({
      clients: [
        {
          id: 'campaign-1',
          name: 'Acme',
          externalClientId: 'client-1',
          generalSpaceId: 'general-1',
        },
      ],
      spaces: [
        {
          id: 'campaign-space-1',
          name: 'Launch',
          clientWorkspaceId: 'campaign-1',
          externalCampaignId: 'external-campaign-1',
        },
      ],
      teamMembers: [
        { id: 'pg-1', name: 'Carol Garcia' },
        { id: 'pg-2', name: 'Dylan' },
        { id: 'pg-3', name: 'Jaime' },
      ],
    })
    expect(repository.listOrgTeamMembers).not.toHaveBeenCalled()
  })

  it('falls back to org profiles when Portal assignees are unavailable', async () => {
    const repository = {
      listConnectionScopeRows: vi.fn().mockResolvedValue([]),
      listCampaignOptions: vi.fn().mockResolvedValue([]),
      listSpaceOptions: vi.fn().mockResolvedValue([]),
      listOrgTeamMembers: vi.fn().mockResolvedValue([{ id: 'u-1', name: 'Carol Garcia' }]),
    }
    const pageGraderApi = {
      listAssignees: vi.fn().mockRejectedValue(new Error('not connected')),
    }
    const service = new WorkRequestScopeService(
      repository as never,
      {} as never,
      pageGraderApi as never,
    )
    const draft = {
      owner_user_id: 'user-1',
      owner_org_id: 'org-1',
      routing: { connection_org_id: null },
    } as WorkRequestDraftRow

    await expect(service.loadScopedOptions(draft)).resolves.toMatchObject({
      teamMembers: [{ id: 'u-1', name: 'Carol Garcia' }],
    })
  })
})
