import { HttpException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { OrgSharingService } from '../services/org-sharing.service'
import { OrgBrainSharingLegacyController } from './org-brain-sharing-legacy.controller'

function makeController() {
  return new OrgBrainSharingLegacyController(new OrgSharingService({ client: {} } as never))
}

describe('OrgController legacy brain sharing routes', () => {
  it('shares a brain with default org target and permission fallback', async () => {
    const share = { id: 'share-1', brain_id: 'brain-1', org_id: 'org-1' }
    const query = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: share, error: null }),
    }
    const supabase = { from: vi.fn(() => query) } as any
    const controller = makeController()

    const result = await controller.shareBrain(
      { orgId: 'org-1' },
      { id: 'user-1' },
      { brain_id: 'brain-1', permission: 'view' },
      supabase,
    )

    expect(query.upsert).toHaveBeenCalledWith(
      {
        org_id: 'org-1',
        brain_id: 'brain-1',
        entity_type: 'org',
        entity_id: 'org-1',
        level: 'view',
        created_by: 'user-1',
      },
      { onConflict: 'brain_id,entity_type,entity_id' },
    )
    expect(result).toEqual({ success: true, sharing: share })
  })

  it('maps share failures to the existing controller error response', async () => {
    const query = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
    }
    const supabase = { from: vi.fn(() => query) } as any
    const controller = makeController()

    await expect(
      controller.shareBrain(
        { orgId: 'org-1' },
        { id: 'user-1' },
        { brain_id: 'brain-1' },
        supabase,
      ),
    ).rejects.toBeInstanceOf(HttpException)
  })

  it('unshares only shares created by the current user', async () => {
    const query = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    const supabase = { from: vi.fn(() => query) } as any
    const controller = makeController()

    const result = await controller.unshareBrain(
      { orgId: 'org-1', brainId: 'brain-1' },
      { id: 'user-1' },
      supabase,
    )

    expect(query.eq).toHaveBeenCalledWith('created_by', 'user-1')
    expect(result).toEqual({ success: true })
  })

  it('lists shared brains and returns an empty list when data is null', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const supabase = { from: vi.fn(() => query) } as any
    const controller = makeController()

    const result = await controller.listSharedBrains({ orgId: 'org-1' }, supabase)

    expect(query.select).toHaveBeenCalledWith(
      '*, ns_brains(id, name, description, color, icon, agent_id), profiles:created_by(id, full_name, avatar_url)',
    )
    expect(result).toEqual({ success: true, sharedBrains: [] })
  })
})
