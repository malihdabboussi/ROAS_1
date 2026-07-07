import { describe, expect, it, vi } from 'vitest'
import { UpsertSpaceShareSchema } from '../../dto'
import { SpacePermissionsService, type SpaceShareScope } from '../space-permissions.service'

describe('SpacePermissionsService internal view sharing', () => {
  const service = new SpacePermissionsService()

  it('keeps unrestricted shares unrestricted', () => {
    const scope: SpaceShareScope = { level: 'view', allowed_view_ids: null }
    const schema = { views: [{ id: 'docs' }, { id: 'board' }] }

    expect(service.resolveAllowedViewIdsForSchema(scope, schema)).toBeNull()
  })

  it('drops deleted view ids from restricted shares', () => {
    const scope: SpaceShareScope = { level: 'edit', allowed_view_ids: ['docs', 'deleted'] }
    const schema = { views: [{ id: 'docs' }, { id: 'board' }] }

    expect(service.resolveAllowedViewIdsForSchema(scope, schema)).toEqual(['docs'])
  })

  it('accepts allowed_view_ids on space share upsert payloads', () => {
    const parsed = UpsertSpaceShareSchema.parse({
      entity_type: 'user',
      entity_id: '11111111-1111-4111-8111-111111111111',
      level: 'view',
      allowed_view_ids: ['docs'],
    })

    expect(parsed.allowed_view_ids).toEqual(['docs'])
  })

  function serviceWithAccessSpace(space: Record<string, unknown> | null) {
    const repo = {
      loadSpaceForAccess: vi.fn(async () => space),
      listSpaceShares: vi.fn(async () => []),
      listSpaceViewShares: vi.fn(async () => []),
    }
    return { service: new SpacePermissionsService(repo as never), repo }
  }

  it('keeps owned personal spaces accessible while an org context is active', async () => {
    const { service: accessService, repo } = serviceWithAccessSpace({
      id: 'space-1',
      org_id: null,
      user_id: 'user-1',
      visibility: 'private',
      share_link_enabled: false,
      share_token: null,
    })

    await expect(
      accessService.resolveSpaceAccessScope({} as never, 'user-1', 'owner', 'space-1', 'org-1', {
        views: [{ id: 'docs' }],
      }),
    ).resolves.toEqual({ level: 'admin', allowed_view_ids: null })

    expect(repo.loadSpaceForAccess).toHaveBeenCalledWith({}, 'space-1')
  })

  it('does not use the active org role to open another personal space', async () => {
    const { service: accessService } = serviceWithAccessSpace({
      id: 'space-1',
      org_id: null,
      user_id: 'user-2',
      visibility: 'private',
      share_link_enabled: false,
      share_token: null,
    })

    await expect(
      accessService.resolveSpaceAccessScope({} as never, 'user-1', 'owner', 'space-1', 'org-1', {
        views: [{ id: 'docs' }],
      }),
    ).rejects.toThrow('Insufficient permissions for this space')
  })
})
