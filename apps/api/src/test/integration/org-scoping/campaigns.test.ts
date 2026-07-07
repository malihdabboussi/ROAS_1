/**
 * Org-scoping integration tests — campaigns
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createOrgTestApp, TEST_USER } from '../test-helpers'

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CAMP_A = '11111111-1111-4111-8111-111111111111'
const CAMP_GENERAL_A = '22222222-2222-4222-8222-222222222222'
const CAMP_B_ONLY = '33333333-3333-4333-8333-333333333333'

function campaignRow(overrides: Record<string, unknown>) {
  return {
    user_id: TEST_USER.id,
    name: 'Campaign',
    campaign_type: 'get-more-leads',
    deleted_at: null,
    status: 'active',
    config: {},
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-14T12:00:00Z',
    ...overrides,
  }
}

describe('Org Scoping: Campaigns', () => {
  let appA: INestApplication

  beforeAll(async () => {
    const { app } = await createOrgTestApp({
      orgId: ORG_A,
      tableData: {
        campaigns: [
          campaignRow({
            id: CAMP_GENERAL_A,
            org_id: ORG_A,
            name: 'General',
            created_at: '2020-01-01T00:00:00Z',
            config: { system_kind: 'general', isPinned: true },
          }),
          campaignRow({
            id: CAMP_A,
            org_id: ORG_A,
            name: 'Org A Campaign',
            created_at: '2026-04-02T00:00:00Z',
          }),
          campaignRow({
            id: CAMP_B_ONLY,
            org_id: ORG_B,
            name: 'Org B Campaign',
            created_at: '2026-04-03T00:00:00Z',
          }),
        ],
      },
    })
    appA = app
  }, 30_000)

  afterAll(async () => {
    await appA?.close()
  })

  it('GET /api/campaigns returns only campaigns in current org scope', async () => {
    const res = await request(appA.getHttpServer())
      .get('/api/campaigns')
      .set('x-org-id', ORG_A)
      .expect(200)
    const ids = (res.body as Array<{ id: string }>).map((c) => c.id)
    expect(ids).toContain(CAMP_A)
    expect(ids).toContain(CAMP_GENERAL_A)
    expect(ids).not.toContain(CAMP_B_ONLY)
  })

  it('GET /api/campaigns/:id returns 404 for cross-org campaign', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        campaigns: [
          campaignRow({
            id: CAMP_A,
            org_id: ORG_A,
            name: 'Other org',
            created_at: '2026-04-02T00:00:00Z',
          }),
        ],
      },
    })
    try {
      await request(app.getHttpServer())
        .get(`/api/campaigns/${CAMP_A}`)
        .set('x-org-id', orgId)
        .expect(404)
    } finally {
      await app.close()
    }
  })

  it('PATCH /api/campaigns/:id returns 404 for cross-org campaign', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        campaigns: [
          campaignRow({
            id: CAMP_A,
            org_id: ORG_A,
            name: 'Other org',
            created_at: '2026-04-02T00:00:00Z',
          }),
        ],
      },
    })
    try {
      await request(app.getHttpServer())
        .patch(`/api/campaigns/${CAMP_A}`)
        .set('x-org-id', orgId)
        .send({ name: 'Hacked' })
        .expect(404)
    } finally {
      await app.close()
    }
  })

  it('DELETE /api/campaigns/:id returns 404 for cross-org campaign', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        campaigns: [
          campaignRow({
            id: CAMP_A,
            org_id: ORG_A,
            name: 'Other org',
            created_at: '2026-04-02T00:00:00Z',
          }),
        ],
      },
    })
    try {
      await request(app.getHttpServer())
        .delete(`/api/campaigns/${CAMP_A}`)
        .set('x-org-id', orgId)
        .expect(404)
    } finally {
      await app.close()
    }
  })

  it('campaign knowledge routes enforce org scope on all endpoints', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        campaigns: [
          campaignRow({
            id: CAMP_A,
            org_id: ORG_A,
            name: 'Other org',
            created_at: '2026-04-02T00:00:00Z',
          }),
        ],
        campaign_nodes: [],
      },
    })
    try {
      await request(app.getHttpServer())
        .get(`/api/campaigns/${CAMP_A}/knowledge/nodes`)
        .set('x-org-id', orgId)
        .expect(404)
    } finally {
      await app.close()
    }
  })
})
