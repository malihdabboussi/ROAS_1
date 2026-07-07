import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { describe, expect, it, vi } from 'vitest'
import { SupabaseProjectLinksRepository } from '../repositories/supabase-project-links.repository'
import { SupabaseProjectLinksService } from '../services/supabase-project-links.service'
import { SupabaseAuthController } from './supabase-auth.controller'
import { SupabaseProjectsController } from './supabase-projects.controller'

const createProjectLinksService = () =>
  new SupabaseProjectLinksService(new SupabaseProjectLinksRepository())

describe('SupabaseProjectLinksService dependency injection', () => {
  it('resolves its repository through Nest DI', async () => {
    const mod = await Test.createTestingModule({
      providers: [SupabaseProjectLinksRepository, SupabaseProjectLinksService],
    }).compile()

    expect(mod.get(SupabaseProjectLinksService)).toBeInstanceOf(SupabaseProjectLinksService)
  })
})

describe('SupabaseController ownership checks', () => {
  it('checks linked project ownership before listing auth users', async () => {
    const management = {
      listAuthUsers: vi.fn().mockResolvedValue({ users: [{ id: 'auth-user-1' }], total: 1 }),
    } as any
    const controller = new SupabaseAuthController(management, createProjectLinksService())
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'repo-1' }, error: null }),
      })),
    } as any

    const result = await controller.listAuthUsers(
      supabase,
      { id: 'user-1' },
      { orgId: 'org-1' } as any,
      'supabase-ref-1',
      '2',
      '200',
    )

    expect(management.listAuthUsers).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'org-1',
      'supabase-ref-1',
      2,
      100,
    )
    expect(result).toEqual({ success: true, users: [{ id: 'auth-user-1' }], total: 1 })
  })

  it('throws when the requested Supabase project is not linked', async () => {
    const management = { getAuthUser: vi.fn() } as any
    const controller = new SupabaseAuthController(management, createProjectLinksService())
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      })),
    } as any

    await expect(
      controller.getAuthUser(
        supabase,
        { id: 'user-1' },
        { orgId: null } as any,
        'auth-user-1',
        'supabase-ref-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(management.getAuthUser).not.toHaveBeenCalled()
  })
})

describe('SupabaseController project linking', () => {
  it('links an existing Supabase project and injects project env vars', async () => {
    const management = {
      getProject: vi.fn().mockResolvedValue({
        id: 'supabase-ref-1',
        name: 'Supabase Project',
        region: 'eu-west-1',
      }),
      getProjectApiKeys: vi.fn().mockResolvedValue([
        { name: 'anon', api_key: 'anon-key-1' },
        { name: 'service_role', api_key: 'service-role-key-1' },
      ]),
    } as any
    const controller = new SupabaseProjectsController(
      management,
      createProjectLinksService(),
    )
    const uploaded = vi.fn().mockResolvedValue({ error: null })
    const updatePayloads: Record<string, unknown>[] = []
    const supabase = {
      from: vi.fn(() => ({
        update: vi.fn((payload: Record<string, unknown>) => {
          updatePayloads.push(payload)
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { storage_path: 'projects/project-1' },
              error: null,
            }),
          }),
        }),
      })),
      storage: {
        from: vi.fn(() => ({
          upload: uploaded,
        })),
      },
    } as any

    const result = await controller.linkExistingProject(
      supabase,
      { id: 'user-1' },
      { orgId: 'org-1' } as any,
      {
        supabase_project_ref: 'supabase-ref-1',
        vibey_project_id: 'project-1',
      },
    )

    expect(updatePayloads[0]).toEqual(
      expect.objectContaining({
        supabase_project_ref: 'supabase-ref-1',
        supabase_project_name: 'Supabase Project',
        supabase_region: 'eu-west-1',
        supabase_api_url: 'https://supabase-ref-1.supabase.co',
        supabase_anon_key: 'anon-key-1',
      }),
    )
    expect(uploaded).toHaveBeenCalledWith(
      'projects/project-1/.env.local',
      'NEXT_PUBLIC_SUPABASE_URL=https://supabase-ref-1.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-1\n',
      { upsert: true, contentType: 'text/plain' },
    )
    expect(result).toEqual({
      success: true,
      supabase_project: {
        ref: 'supabase-ref-1',
        name: 'Supabase Project',
        region: 'eu-west-1',
        api_url: 'https://supabase-ref-1.supabase.co',
        anon_key: 'anon-key-1',
      },
    })
  })
})
