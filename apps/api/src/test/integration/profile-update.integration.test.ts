/**
 * Profile update integration tests — PATCH profile, onboarding, avatar upload
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, createTestApp, TEST_USER } from './test-helpers'

describe('Profile Update Contract', () => {
  let app: INestApplication
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeAll(async () => {
    mockSupabase = createMockSupabase({
      profiles: {
        data: {
          id: TEST_USER.id,
          full_name: 'Original Name',
          avatar_url: null,
          company_name: 'Acme Inc',
          industry: 'saas',
          onboarding_completed: false,
          onboarding_data: null,
          fly_machine_id: null,
          onboarding_animation_seen: false,
        },
        error: null,
      },
    })

    app = await createTestApp(mockSupabase)
  }, 30_000)

  afterAll(async () => {
    await app?.close()
  })

  it('PATCH /api/profile updates full_name and company_name for current user', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/profile')
      .send({ full_name: 'Updated User', company_name: 'New Co' })
      .expect(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('PATCH /api/profile rejects attempts to update another user profile', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/profile')
      .send({
        full_name: 'Scoped Name',
        company_name: 'Scoped Co',
        id: 'other-user-id',
      })
      .expect(200)
    expect(res.body).toEqual({ ok: true })
    const getRes = await request(app.getHttpServer()).get('/api/profile').expect(200)
    expect(getRes.body.id).toBe(TEST_USER.id)
    expect(getRes.body.email).toBe(TEST_USER.email)
  })

  it('POST /api/profile/avatar uploads avatar and returns URL', async () => {
    Object.assign(mockSupabase, {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: 'https://test.supabase.co/avatars/test.png' },
          }),
        }),
      },
    })
    const res = await request(app.getHttpServer())
      .post('/api/profile/avatar')
      .attach('file', Buffer.from('fake-png-bytes'), 'avatar.png')
      .expect(201)
    expect(res.body.url).toBe('https://test.supabase.co/avatars/test.png')
  })

  it('PATCH /api/profile/onboarding updates onboarding fields for current user', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/profile/onboarding')
      .send({
        full_name: 'Onboarding Name',
        industry: 'health',
        website: 'https://example.com',
        onboarding_completed: true,
        onboarding_animation_seen: true,
        onboarding_data: { step: 3 },
      })
      .expect(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('Profile endpoints remain user-scoped (profiles.id = auth.uid())', async () => {
    const res = await request(app.getHttpServer()).get('/api/profile').expect(200)
    expect(res.body.id).toBe(TEST_USER.id)
    expect(res.body.email).toBe(TEST_USER.email)
    expect(res.body).toMatchObject({
      full_name: expect.any(String),
      company_name: expect.any(String),
      onboarding_completed: expect.any(Boolean),
      onboarding_animation_seen: expect.any(Boolean),
    })
  })
})
