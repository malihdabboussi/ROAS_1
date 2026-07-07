/**
 * Org-scoping integration tests — leads
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createOrgTestApp, createTestApp, TEST_USER } from '../test-helpers'

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CAMP_A = '11111111-1111-4111-8111-111111111111'
const CONTACT_A = '22222222-2222-4222-8222-222222222222'
const MEMBERSHIP_A = '33333333-3333-4333-8333-333333333333'
const FUNNEL_ID = '44444444-4444-4444-8444-444444444444'

describe('Org Scoping: Leads', () => {
  let appA: INestApplication

  beforeAll(async () => {
    const { app } = await createOrgTestApp({
      orgId: ORG_A,
      tableData: {
        contact_campaign_memberships: [
          {
            id: MEMBERSHIP_A,
            contact_id: CONTACT_A,
            campaign_id: CAMP_A,
            source_funnel_id: FUNNEL_ID,
            first_seen_at: '2026-04-01T00:00:00Z',
            last_seen_at: '2026-04-14T12:00:00Z',
            last_source_domain: null,
            last_page_slug: null,
          },
        ],
        contacts: [
          {
            id: CONTACT_A,
            user_id: TEST_USER.id,
            org_id: ORG_A,
            email: 'lead@example.com',
            first_name: 'L',
            last_name: 'Ead',
            phone: null,
          },
        ],
      },
    })
    appA = app
  }, 30_000)

  afterAll(async () => {
    await appA?.close()
  })

  it('GET /api/leads list is constrained to current org scope', async () => {
    const res = await request(appA.getHttpServer())
      .get('/api/leads')
      .query({ campaign_id: CAMP_A })
      .set('x-org-id', ORG_A)
      .expect(200)
    const rows = res.body as Array<{ email?: string | null }>
    expect(rows.some((r) => r.email === 'lead@example.com')).toBe(true)

    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        contact_campaign_memberships: [
          {
            id: MEMBERSHIP_A,
            contact_id: CONTACT_A,
            campaign_id: CAMP_A,
            source_funnel_id: FUNNEL_ID,
            first_seen_at: '2026-04-01T00:00:00Z',
            last_seen_at: '2026-04-14T12:00:00Z',
            last_source_domain: null,
            last_page_slug: null,
          },
        ],
        contacts: [
          {
            id: CONTACT_A,
            user_id: TEST_USER.id,
            org_id: ORG_A,
            email: 'lead@example.com',
            first_name: 'L',
            last_name: 'Ead',
            phone: null,
          },
        ],
      },
    })
    try {
      const empty = await request(app.getHttpServer())
        .get('/api/leads')
        .query({ campaign_id: CAMP_A })
        .set('x-org-id', orgId)
        .expect(200)
      expect(Array.isArray(empty.body)).toBe(true)
      expect((empty.body as unknown[]).length).toBe(0)
    } finally {
      await app.close()
    }
  })

  it('GET /api/leads/contacts/:id returns 404 for cross-org lead', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        contacts: [
          {
            id: CONTACT_A,
            user_id: TEST_USER.id,
            org_id: ORG_A,
            email: 'lead@example.com',
            first_name: 'L',
            last_name: 'Ead',
            phone: null,
          },
        ],
      },
    })
    try {
      await request(app.getHttpServer())
        .get(`/api/leads/contacts/${CONTACT_A}`)
        .set('x-org-id', orgId)
        .expect(404)
    } finally {
      await app.close()
    }
  })

  it('PATCH /api/leads/contacts/:id returns 404 for cross-org lead', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        contacts: [
          {
            id: CONTACT_A,
            user_id: TEST_USER.id,
            org_id: ORG_A,
            email: 'lead@example.com',
            first_name: 'L',
            last_name: 'Ead',
            phone: null,
          },
        ],
      },
    })
    try {
      await request(app.getHttpServer())
        .patch(`/api/leads/contacts/${CONTACT_A}`)
        .set('x-org-id', orgId)
        .send({ first_name: 'Nope' })
        .expect(404)
    } finally {
      await app.close()
    }
  })

  it('DELETE /api/leads/contacts/:id returns 404 for cross-org lead', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        contacts: [
          {
            id: CONTACT_A,
            user_id: TEST_USER.id,
            org_id: ORG_A,
            email: 'lead@example.com',
            first_name: 'L',
            last_name: 'Ead',
            phone: null,
          },
        ],
      },
    })
    try {
      await request(app.getHttpServer())
        .delete(`/api/leads/contacts/${CONTACT_A}`)
        .set('x-org-id', orgId)
        .expect(404)
    } finally {
      await app.close()
    }
  })

  it('public ingest route remains intentionally outside org context guard', async () => {
    const app = await createTestApp()
    try {
      await request(app.getHttpServer())
        .post('/api/leads/ingest')
        .set('x-org-id', ORG_A)
        .send({ email: 'not-an-email', funnelId: FUNNEL_ID })
        .expect(400)
    } finally {
      await app.close()
    }
  })
})
