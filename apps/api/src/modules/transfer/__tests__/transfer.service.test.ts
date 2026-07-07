import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import {
  createMutationQuery,
  createOrgRoleQuery,
  createProjectQuery,
  createQueuedQuery,
  createQueuedSupabase,
  createSupabaseWithQueries,
  createTransferService,
} from './transfer-test-helpers'

describe('TransferService project and artifact transfers', () => {
  it('previews project copy transfers after validating target org role', async () => {
    const projectQuery = createProjectQuery({
      id: 'project-1',
      name: 'Demo project',
      org_id: null,
    })
    const roleQuery = createOrgRoleQuery('creator')
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') return projectQuery
        if (table === 'org_members') return roleQuery
        return createProjectQuery(null)
      }),
    }
    const service = createTransferService(supabase)

    const result = await service.previewProject('project-1', 'user-1', { org_id: 'org-1' }, 'copy')

    expect(result.entity).toEqual({ id: 'project-1', name: 'Demo project', type: 'project' })
    expect(result.warnings).toContain(
      'Copy duplicates the project metadata — storage files are not duplicated',
    )
    expect(roleQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(roleQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('moves project rows to the target context', async () => {
    const projectQuery = createProjectQuery({
      id: 'project-1',
      name: 'Demo project',
      org_id: null,
    })
    const roleQuery = createOrgRoleQuery('admin')
    const updateQuery = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') {
          return supabase.from.mock.calls.filter(([calledTable]) => calledTable === table)
            .length === 1
            ? projectQuery
            : updateQuery
        }
        if (table === 'org_members') return roleQuery
        return createProjectQuery(null)
      }),
    }
    const service = createTransferService(supabase)

    const result = await service.executeProjectTransfer(
      'project-1',
      'user-1',
      { org_id: 'org-1' },
      'move',
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'project-1',
      mode: 'move',
      transferred: { project_repos: 1 },
    })
    expect(updateQuery.update).toHaveBeenCalledWith({ org_id: 'org-1' })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'project-1')
  })

  it('rejects missing projects before transfer', async () => {
    const service = createTransferService({
      from: vi.fn(() => createProjectQuery(null)),
    })

    await expect(
      service.previewProject('missing-project', 'user-1', { org_id: null }, 'copy'),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('previews artifact transfers from a movable artifact table', async () => {
    const supabase = createQueuedSupabase({
      offers: [{ data: { id: 'offer-1', campaign_id: 'campaign-1', org_id: null, name: 'Offer' }, error: null }],
      org_members: [{ data: { role: 'creator' }, error: null }],
    })
    const service = createTransferService(supabase)

    await expect(
      service.previewArtifact('offers', 'offer-1', 'user-1', { org_id: 'org-1' }, 'copy'),
    ).resolves.toMatchObject({
      entity: { id: 'offer-1', name: 'Offer', type: 'artifact' },
      source_context: { org_id: null },
      target_context: { org_id: 'org-1' },
      mode: 'copy',
    })
  })

  it('moves artifact rows to the target campaign context', async () => {
    const artifactQuery = createQueuedQuery({
      data: { id: 'offer-1', campaign_id: 'source-campaign', org_id: null, name: 'Offer' },
      error: null,
    })
    const roleQuery = createOrgRoleQuery('admin')
    const targetCampaignQuery = createQueuedQuery({
      data: { id: 'target-campaign', org_id: 'org-1' },
      error: null,
    })
    const moveQuery = createMutationQuery()
    const supabase = createSupabaseWithQueries({
      offers: [artifactQuery, moveQuery],
      org_members: [roleQuery],
      campaigns: [targetCampaignQuery],
    })
    const service = createTransferService(supabase)

    const result = await service.executeArtifactTransfer(
      'offers',
      'offer-1',
      'user-1',
      { org_id: 'org-1' },
      'move',
      'target-campaign',
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'offer-1',
      mode: 'move',
      transferred: { offers: 1 },
    })
    expect(moveQuery.update).toHaveBeenCalledWith({
      org_id: 'org-1',
      updated_at: expect.any(String),
      campaign_id: 'target-campaign',
    })
    expect(moveQuery.eq).toHaveBeenCalledWith('id', 'offer-1')
  })

  it('copies media rows without reusing ids or public URLs', async () => {
    const mediaQuery = createQueuedQuery({
      data: {
        id: 'media-1',
        org_id: null,
        campaign_id: 'source-campaign',
        public_url: 'https://cdn.example.com/file.png',
        bucket_name: 'media',
        file_path: 'file.png',
        created_at: 'old-created',
        updated_at: 'old-updated',
      },
      error: null,
    })
    const roleQuery = createOrgRoleQuery('creator')
    const copyQuery = createMutationQuery()
    const supabase = createSupabaseWithQueries({
      media_assets: [mediaQuery, copyQuery],
      org_members: [roleQuery],
    })
    const service = createTransferService(supabase)

    const result = await service.executeMediaTransfer(
      'media-1',
      'user-1',
      { org_id: 'org-1' },
      'copy',
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'media-1',
      mode: 'copy',
      transferred: { media_assets: 1 },
    })
    expect(copyQuery.insert).toHaveBeenCalledWith({
      org_id: 'org-1',
      campaign_id: 'source-campaign',
      bucket_name: 'media',
      file_path: 'file.png',
    })
  })
})
