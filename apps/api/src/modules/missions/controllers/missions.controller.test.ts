import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { MissionsUserOperationsService } from '../services/missions-user-operations.service'
import { MissionsFeedbackController } from './missions-feedback.controller'
import { MissionsLifecycleController } from './missions-lifecycle.controller'
import { MissionsUserController } from './missions-user.controller'

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    not: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    insert: vi.fn(() => query),
    single: vi.fn().mockResolvedValue(result),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

function createUserController(
  overrides: { mediaIndexer?: { indexAsset: ReturnType<typeof vi.fn> } } = {},
) {
  const mediaIndexer = overrides.mediaIndexer ?? {
    indexAsset: vi.fn().mockResolvedValue(undefined),
  }
  return new MissionsUserController(new MissionsUserOperationsService(mediaIndexer as never))
}

function createLifecycleController(
  overrides: { mediaIndexer?: { indexAsset: ReturnType<typeof vi.fn> } } = {},
) {
  const mediaIndexer = overrides.mediaIndexer ?? {
    indexAsset: vi.fn().mockResolvedValue(undefined),
  }
  return new MissionsLifecycleController(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    new MissionsUserOperationsService(mediaIndexer as never) as never,
  )
}

function createFeedbackController(
  overrides: { mediaIndexer?: { indexAsset: ReturnType<typeof vi.fn> } } = {},
) {
  const mediaIndexer = overrides.mediaIndexer ?? {
    indexAsset: vi.fn().mockResolvedValue(undefined),
  }
  return new MissionsFeedbackController(new MissionsUserOperationsService(mediaIndexer as never))
}

describe('MissionsController profile settings', () => {
  it('rejects public agent slugs that collide with organization slugs', async () => {
    const orgSlugQuery = createQuery({ data: { id: 'org-1' }, error: null })
    const profileUpdateQuery = createQuery({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'organizations') return orgSlugQuery
        if (table === 'profiles') return profileUpdateQuery
        return createQuery({ error: null })
      }),
    }
    const controller = createUserController()

    await expect(
      controller.updateProfileSettings(
        { id: 'user-1' },
        supabase as never,
        { public_agent_slug: 'Acme!' },
        { userId: 'user-1', orgId: null, orgRole: null },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(orgSlugQuery.eq).toHaveBeenCalledWith('slug', 'acme')
    expect(profileUpdateQuery.update).not.toHaveBeenCalled()
  })

  it('returns default profile settings when no profile row exists', async () => {
    const profileQuery = createQuery({ data: null, error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profileQuery
        return createQuery()
      }),
    }
    const controller = createUserController()

    await expect(
      controller.getProfileSettings({ id: 'user-1' }, supabase as never, {
        userId: 'user-1',
        orgId: null,
        orgRole: null,
      }),
    ).resolves.toEqual({
      preferred_channel: 'studio',
      daily_digest_enabled: false,
      daily_digest_time: '08:00',
      awareness_loop_enabled: false,
      auto_approve_plans: false,
      public_agent_slug: null,
    })
    expect(profileQuery.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('lists unread notifications scoped to the active organization', async () => {
    const notificationsQuery = createQuery({ data: [{ id: 'notification-1' }], error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_notifications') return notificationsQuery
        return createQuery()
      }),
    }
    const controller = createUserController()

    await expect(
      controller.listNotifications(
        { id: 'user-1' },
        supabase as never,
        { limit: '10', unread_only: 'true' },
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
      ),
    ).resolves.toEqual([{ id: 'notification-1' }])
    expect(notificationsQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(notificationsQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(notificationsQuery.is).toHaveBeenCalledWith('read_at', null)
    expect(notificationsQuery.limit).toHaveBeenCalledWith(10)
  })

  it('marks all unread notifications as read within the active organization', async () => {
    const notificationsQuery = createQuery({ data: null, error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_notifications') return notificationsQuery
        return createQuery()
      }),
    }
    const controller = createUserController()

    await expect(
      controller.markNotificationsReadAll({ id: 'user-1' }, supabase as never, {
        userId: 'user-1',
        orgId: 'org-1',
        orgRole: 'admin',
      }),
    ).resolves.toEqual({ ok: true })
    expect(notificationsQuery.update).toHaveBeenCalledWith({ read_at: expect.any(String) })
    expect(notificationsQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(notificationsQuery.is).toHaveBeenCalledWith('read_at', null)
    expect(notificationsQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('uploads a mission attachment, registers the media asset, and starts indexing', async () => {
    const missionQuery = createQuery({ data: { campaign_id: 'campaign-1' }, error: null })
    const assetQuery = createQuery({ data: { id: 'asset-1' }, error: null })
    const storageBucket = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://cdn.example.com/file.png' } })),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'missions') return missionQuery
        if (table === 'media_assets') return assetQuery
        return createQuery()
      }),
      storage: {
        from: vi.fn(() => storageBucket),
      },
    }
    const mediaIndexer = { indexAsset: vi.fn().mockResolvedValue(undefined) }
    const controller = createLifecycleController({ mediaIndexer })
    const file = {
      originalname: 'screen.png',
      mimetype: 'image/png',
      size: 12,
      buffer: Buffer.from('image'),
    }

    await expect(
      controller.uploadAttachment(
        { id: 'user-1' },
        supabase as never,
        { id: 'mission-1' },
        file as never,
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
      ),
    ).resolves.toEqual({
      url: 'https://cdn.example.com/file.png',
      path: expect.stringMatching(/^user-1\/mission-1\/.+\.png$/),
      asset_id: 'asset-1',
      asset_ref: {
        kind: 'vibey_asset',
        asset_id: 'asset-1',
        bucket_name: 'mission-attachments',
        file_path: expect.stringMatching(/^user-1\/mission-1\/.+\.png$/),
        url: 'https://cdn.example.com/file.png',
        mime_type: 'image/png',
        asset_type: 'image',
        name: 'screen.png',
        original_filename: 'screen.png',
        file_size: 12,
        campaign_id: 'campaign-1',
        space_id: null,
        org_id: 'org-1',
        source: 'upload',
        source_surface: 'mission',
      },
    })
    expect(storageBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/mission-1\/.+\.png$/),
      file.buffer,
      { contentType: 'image/png', upsert: false },
    )
    expect(assetQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        campaign_id: 'campaign-1',
        asset_type: 'image',
        bucket_name: 'mission-attachments',
      }),
    )
    expect(mediaIndexer.indexAsset).toHaveBeenCalledWith('asset-1')
  })

  it('updates an existing mission rating drift row', async () => {
    const driftQuery = createQuery({ data: { id: 'drift-1' }, error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'evaluation_drift') return driftQuery
        return createQuery()
      }),
    }
    const controller = createFeedbackController()

    await expect(
      controller.rateMission(
        { id: 'user-1' },
        supabase as never,
        { id: 'mission-1' },
        { rating: 4, thumbs_up: true, feedback: 'Good' },
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
      ),
    ).resolves.toEqual({ updated: true })
    expect(driftQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        human_rating: 4,
        human_thumbs_up: true,
        human_feedback: 'Good',
        updated_at: expect.any(String),
      }),
    )
    expect(driftQuery.eq).toHaveBeenCalledWith('id', 'drift-1')
  })

  it('creates a mission rating drift row when none exists', async () => {
    const driftQuery = createQuery({ data: null, error: null })
    const missionQuery = createQuery({ data: { assigned_agent_key: 'copywriter' }, error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'evaluation_drift') return driftQuery
        if (table === 'missions') return missionQuery
        return createQuery()
      }),
    }
    const controller = createFeedbackController()

    await expect(
      controller.rateMission(
        { id: 'user-1' },
        supabase as never,
        { id: 'mission-1' },
        { rating: 5, thumbs_up: true },
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
      ),
    ).resolves.toEqual({ created: true })
    expect(driftQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        mission_id: 'mission-1',
        agent_key: 'copywriter',
        human_rating: 5,
        human_thumbs_up: true,
      }),
    )
  })
})
