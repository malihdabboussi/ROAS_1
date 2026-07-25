import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { UsersRepository } from '../repositories/users.repository'
import { ProfileService } from '../services/profile.service'
import { ProfileController } from './profile.controller'

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    insert: vi.fn(() => query),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn(() => query),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

function createProfileSupabase(
  query: Record<string, any>,
  tableQueries: Record<string, Record<string, any>> = {},
) {
  return {
    from: vi.fn((table: string) => {
      if (table in tableQueries) return tableQueries[table]
      if (table === 'profiles') return query
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

function createController() {
  return new ProfileController(new ProfileService(new UsersRepository({} as never)))
}

describe('ProfileController profile routes', () => {
  it('returns the current profile with default values and machine id mapping', async () => {
    const profileQuery = createQuery({
      data: {
        full_name: null,
        avatar_url: null,
        company_name: null,
        industry: 'saas',
        website: null,
        onboarding_completed: null,
        onboarding_data: { step: 2 },
        fly_machine_id: 'machine-1',
        agent_runtime_type: 'shared_railway',
        agent_runtime_url: 'https://railway-agent.vibey.test',
        onboarding_animation_seen: null,
        account_mode: null,
        default_account_mode: null,
        default_org_id: null,
      },
      error: null,
    })
    const controller = createController()
    const supabase = createProfileSupabase(profileQuery)

    await expect(
      controller.getProfile({ id: 'user-1', email: 'user@example.com' }, supabase as never),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
      full_name: '',
      avatar_url: null,
      company_name: '',
      industry: 'saas',
      website: null,
      onboarding_completed: false,
      onboarding_data: { step: 2 },
      preferences: {},
      fly_machine_id: 'machine-1',
      agent_runtime_type: 'shared_railway',
      agent_runtime_url: 'https://railway-agent.vibey.test',
      runtime_ready: true,
      onboarding_animation_seen: false,
      account_mode: 'personal',
      default_account_mode: 'personal',
      default_org_id: null,
    })
    expect(profileQuery.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('rejects invalid public profile ids before querying Supabase', async () => {
    const profileQuery = createQuery()
    const controller = createController()
    const supabase = createProfileSupabase(profileQuery)

    await expect(controller.getProfileById('not-a-uuid', supabase as never)).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('updates only the authenticated user profile with trimmed fields', async () => {
    const updateQuery = createQuery({ error: null })
    const controller = createController()
    const supabase = createProfileSupabase(updateQuery)

    await expect(
      controller.updateProfile({ id: 'user-1' }, supabase as never, {
        full_name: '  Updated User  ',
        company_name: '  New Co  ',
        avatar_url: 'https://example.com/avatar.png',
      }),
    ).resolves.toEqual({ ok: true })
    expect(updateQuery.update).toHaveBeenCalledWith({
      full_name: 'Updated User',
      company_name: 'New Co',
      avatar_url: 'https://example.com/avatar.png',
    })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('updates status fields with existing null and trim behavior', async () => {
    const updateQuery = createQuery({ error: null })
    const controller = createController()
    const supabase = createProfileSupabase(updateQuery)

    await expect(
      controller.updateStatus({ id: 'user-1' }, supabase as never, {
        status_emoji: null,
        status_text: '  focused  ',
      }),
    ).resolves.toEqual({ ok: true })
    expect(updateQuery.update).toHaveBeenCalledWith({
      status_emoji: null,
      status_text: 'focused',
    })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('saves personal account as the default account', async () => {
    const updateQuery = createQuery({ error: null })
    const controller = createController()
    const supabase = createProfileSupabase(updateQuery)

    await expect(
      controller.updateDefaultAccount({ id: 'user-1' }, supabase as never, {
        mode: 'personal',
        orgId: null,
      }),
    ).resolves.toEqual({
      ok: true,
      default_account_mode: 'personal',
      default_org_id: null,
    })
    expect(updateQuery.update).toHaveBeenCalledWith({
      default_account_mode: 'personal',
      default_org_id: null,
    })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('shallow-merges profile preferences and replaces home_layout wholesale', async () => {
    const profilesQuery = createQuery({
      data: {
        preferences: {
          theme: 'dark',
          home_layout: { cardIds: ['my_tasks'] },
        },
      },
      error: null,
    })
    const controller = createController()
    const supabase = createProfileSupabase(profilesQuery)

    await expect(
      controller.updatePreferences({ id: 'user-1' }, supabase as never, {
        home_layout: {
          version: 2,
          cardIds: ['favorite_spaces', 'my_tasks'],
          cardSizes: { my_tasks: 'full' },
        },
      }),
    ).resolves.toEqual({
      ok: true,
      preferences: {
        theme: 'dark',
        home_layout: {
          version: 2,
          cardIds: ['favorite_spaces', 'my_tasks'],
          cardSizes: { my_tasks: 'full' },
        },
      },
    })
    expect(profilesQuery.update).toHaveBeenCalledWith({
      preferences: {
        theme: 'dark',
        home_layout: {
          version: 2,
          cardIds: ['favorite_spaces', 'my_tasks'],
          cardSizes: { my_tasks: 'full' },
        },
      },
    })
    expect(profilesQuery.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('validates active org membership before saving an org as the default account', async () => {
    const updateQuery = createQuery({ error: null })
    const membershipQuery = createQuery({
      data: {
        id: 'member-1',
        org_id: '11111111-1111-1111-1111-111111111111',
      },
      error: null,
    })
    const controller = createController()
    const supabase = createProfileSupabase(updateQuery, { org_members: membershipQuery })

    await expect(
      controller.updateDefaultAccount({ id: 'user-1' }, supabase as never, {
        mode: 'org',
        orgId: '11111111-1111-1111-1111-111111111111',
      }),
    ).resolves.toEqual({
      ok: true,
      default_account_mode: 'org',
      default_org_id: '11111111-1111-1111-1111-111111111111',
    })
    expect(membershipQuery.select).toHaveBeenCalledWith(
      'id, org_id, organizations!inner(id, status, deleted_at)',
    )
    expect(membershipQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(membershipQuery.eq).toHaveBeenCalledWith(
      'org_id',
      '11111111-1111-1111-1111-111111111111',
    )
    expect(membershipQuery.eq).toHaveBeenCalledWith('status', 'active')
    expect(membershipQuery.eq).toHaveBeenCalledWith('organizations.status', 'active')
    expect(membershipQuery.is).toHaveBeenCalledWith('organizations.deleted_at', null)
    expect(updateQuery.update).toHaveBeenCalledWith({
      default_account_mode: 'org',
      default_org_id: '11111111-1111-1111-1111-111111111111',
    })
  })

  it('rejects unavailable org defaults before updating the profile', async () => {
    const updateQuery = createQuery({ error: null })
    const membershipQuery = createQuery({ data: null, error: null })
    const controller = createController()
    const supabase = createProfileSupabase(updateQuery, { org_members: membershipQuery })

    await expect(
      controller.updateDefaultAccount({ id: 'user-1' }, supabase as never, {
        mode: 'org',
        orgId: '11111111-1111-1111-1111-111111111111',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(updateQuery.update).not.toHaveBeenCalled()
  })

  it('uploads the avatar and saves the returned public URL', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/user-1/avatar.png' },
    })
    const storageBucket = { upload, getPublicUrl }
    const updateQuery = createQuery({ error: null })
    const mediaAssetQuery = createQuery({
      data: {
        id: 'asset-1',
        user_id: 'user-1',
        name: 'avatar.PNG',
        original_filename: 'avatar.PNG',
        file_path: 'user-1/avatar.png',
        bucket_name: 'avatars',
        file_size: 5,
        mime_type: 'image/png',
        asset_type: 'image',
        category: 'profile-avatar',
        campaign_id: null,
        space_id: null,
        org_id: null,
        source: 'upload',
        source_surface: 'profile',
        public_url: 'https://storage.example.com/user-1/avatar.png',
      },
      error: null,
    })
    const controller = createController()
    const supabase = {
      ...createProfileSupabase(updateQuery, { media_assets: mediaAssetQuery }),
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === 'avatars') return storageBucket
          throw new Error(`unexpected bucket: ${bucket}`)
        }),
      },
    }
    const file = {
      originalname: 'avatar.PNG',
      buffer: Buffer.from('image'),
      mimetype: 'image/png',
    } as Express.Multer.File

    await expect(
      controller.uploadAvatar({ id: 'user-1' }, supabase as never, file),
    ).resolves.toEqual({
      asset_id: 'asset-1',
      asset_ref: {
        kind: 'vibey_asset',
        asset_id: 'asset-1',
        bucket_name: 'avatars',
        file_path: 'user-1/avatar.png',
        url: 'https://storage.example.com/user-1/avatar.png',
        mime_type: 'image/png',
        asset_type: 'image',
        name: 'avatar.PNG',
        original_filename: 'avatar.PNG',
        file_size: 5,
        campaign_id: null,
        space_id: null,
        org_id: null,
        source: 'upload',
        source_surface: 'profile',
      },
      url: 'https://storage.example.com/user-1/avatar.png',
    })
    expect(upload).toHaveBeenCalledWith('user-1/avatar.png', file.buffer, {
      contentType: 'image/png',
      upsert: true,
    })
    expect(getPublicUrl).toHaveBeenCalledWith('user-1/avatar.png')
    expect(updateQuery.update).toHaveBeenCalledWith({
      avatar_url: 'https://storage.example.com/user-1/avatar.png',
    })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(mediaAssetQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket_name: 'avatars',
        category: 'profile-avatar',
        file_path: 'user-1/avatar.png',
        mime_type: 'image/png',
        original_filename: 'avatar.PNG',
        public_url: 'https://storage.example.com/user-1/avatar.png',
        source_surface: 'profile',
      }),
    )
  })
})
